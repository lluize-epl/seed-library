// /app/api/seeds/available-by-branch/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService"; // Your centralized server-side fetcher

const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;
const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;

export async function GET(request) {
  if (!SEED_INVENTORY_TABLE_ID || !SEEDS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Seed table IDs missing." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    return NextResponse.json(
      { error: "branchId parameter is missing." },
      { status: 400 }
    );
  }
  const parsedBranchId = parseInt(branchId, 10);
  if (isNaN(parsedBranchId)) {
    return NextResponse.json(
      { error: "Invalid branchId parameter." },
      { status: 400 }
    );
  }

  try {
    // Step 1: Fetch active inventory records for the specific branch
    // Using field names as per your seedInventory.js: branches_id, QuantityAtBranch, Seeds_id
    const inventoryQueryParams = `?where=(branches_id,eq,${parsedBranchId})~and(QuantityAtBranch,gt,0)&fields=Id,Seeds_id,QuantityAtBranch&limit=1000`;
    const inventoryData = await serverNocoFetch(
      SEED_INVENTORY_TABLE_ID,
      "/records",
      { method: "GET" },
      inventoryQueryParams
    );
    const activeInventoryForBranch =
      inventoryData && inventoryData.list ? inventoryData.list : [];

    if (activeInventoryForBranch.length === 0) {
      return NextResponse.json([]); // No seeds in inventory for this branch
    }

    // Step 2: Get unique Seed IDs from these inventory records
    const seedIdsInInventory = Array.from(
      new Set(activeInventoryForBranch.map((inv) => inv.Seeds_id))
    );
    if (seedIdsInInventory.length === 0) {
      // This implies inventory records were found but had no valid Seeds_id
      console.warn(
        `No valid Seeds_id found in inventory for branch ${parsedBranchId}, though inventory records exist.`
      );
      return NextResponse.json([]);
    }

    // Step 3: Fetch full seed details for these Seed IDs
    // Request only necessary fields: Id, SeedName, SeedType
    const seedDetailsQueryParams = `?where=(Id,in,${seedIdsInInventory.join(
      ","
    )})&fields=Id,SeedName,SeedType`;
    const seedDetailsData = await serverNocoFetch(
      SEEDS_TABLE_ID,
      "/records",
      { method: "GET" },
      seedDetailsQueryParams
    );
    const seedDetailsList =
      seedDetailsData && seedDetailsData.list ? seedDetailsData.list : [];

    // Step 4: Combine inventory data with seed details
    const combinedSeedData = activeInventoryForBranch
      .map((invRecord) => {
        const detail = seedDetailsList.find((s) => s.Id === invRecord.Seeds_id);
        if (!detail) return null; // Should not happen if data is consistent
        return {
          SeedId: detail.Id, // PK of the Seeds table
          SeedName: detail.SeedName,
          SeedType: detail.SeedType,
          QuantityAtBranch: invRecord.QuantityAtBranch, // From SeedInventory
          SeedInventoryId: invRecord.Id, // PK of the SeedInventory record
        };
      })
      .filter(Boolean); // Remove any nulls from failed detail lookups

    return NextResponse.json(combinedSeedData);
  } catch (error) {
    console.error(
      `Error in /api/seeds/available-by-branch for branch ${branchId}:`,
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error fetching available seeds.";
    return NextResponse.json({ error: message }, { status });
  }
}
