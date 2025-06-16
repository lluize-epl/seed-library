// /app/api/admin/stats/all-time-inventory/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;
const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;

export async function GET(request) {
  if (!SEEDS_TABLE_ID || !SEED_INVENTORY_TABLE_ID) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing table IDs for inventory stats.",
      },
      { status: 500 }
    );
  }

  try {
    // 1. Total Unique Seed Types (count of records in the Seeds table)
    const uniqueSeedTypesData = await serverNocoFetch(
      SEEDS_TABLE_ID,
      "/records",
      { method: "GET" }
    );
    const uniqueSeedTypesInInventory =
      uniqueSeedTypesData?.pageInfo?.totalRows || 0;

    // 2. Total Seed Packets Currently in Inventory (sum of QuantityAtBranch from all SeedInventory records)
    // Fetching all records and summing can be inefficient for very large inventory tables.
    // If NocoDB supports API-level SUM aggregation, that would be better.
    const allInventoryRecords =
      (
        await serverNocoFetch(
          SEED_INVENTORY_TABLE_ID,
          "/records",
          { method: "GET" },
          `?fields=QuantityAtBranch&limit=25000`
        )
      )?.list || []; // High limit, adjust
    const totalSeedPacketsInInventory = allInventoryRecords.reduce(
      (sum, inv) => sum + (inv.QuantityAtBranch || 0),
      0
    );

    return NextResponse.json({
      uniqueSeedTypesInInventory,
      totalSeedPacketsInInventory,
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/all-time-inventory GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load all-time inventory statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
