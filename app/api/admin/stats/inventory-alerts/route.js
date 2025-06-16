import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;
const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;
const BRANCHES_TABLE_ID = process.env.NOCO_BRANCHES_TABLE_ID;

const LOW_STOCK_THRESHOLD_PER_BRANCH = 3;

export async function GET(request) {
  if (!SEEDS_TABLE_ID || !SEED_INVENTORY_TABLE_ID || !BRANCHES_TABLE_ID) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing table IDs for inventory alerts.",
      },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch all SeedInventory records that are below the threshold
    const queryParams = `?where=(QuantityAtBranch,lt,${LOW_STOCK_THRESHOLD_PER_BRANCH})~and(QuantityAtBranch,ge,0)`;
    // Fetches items with quantity 0, 1, or 2.

    const lowInventoryItems =
      (
        await serverNocoFetch(
          SEED_INVENTORY_TABLE_ID,
          "/records",
          { method: "GET" },
          queryParams
        )
      )?.list || [];

    if (lowInventoryItems.length === 0) {
      return NextResponse.json({
        lowStockItems: [],
        threshold: LOW_STOCK_THRESHOLD_PER_BRANCH,
      });
    }

    // 2. Get necessary Seed and Branch details for enrichment
    const seedIds = Array.from(
      new Set(lowInventoryItems.map((item) => item.Seeds_id).filter(Boolean))
    );
    const branchIds = Array.from(
      new Set(lowInventoryItems.map((item) => item.branches_id).filter(Boolean))
    );

    let seedDetailsMap = new Map();
    if (seedIds.length > 0) {
      const seedsData =
        (
          await serverNocoFetch(
            SEEDS_TABLE_ID,
            "/records",
            { method: "GET" },
            `?where=(Id,in,${seedIds.join(",")})&fields=Id,SeedName,SeedType`
          )
        )?.list || [];
      seedsData.forEach((s) => seedDetailsMap.set(s.Id, s));
    }

    let branchDetailsMap = new Map();
    if (branchIds.length > 0) {
      const branchesData =
        (
          await serverNocoFetch(
            BRANCHES_TABLE_ID,
            "/records",
            { method: "GET" },
            `?where=(Id,in,${branchIds.join(",")})&fields=Id,BranchName`
          )
        )?.list || [];
      branchesData.forEach((b) => branchDetailsMap.set(b.Id, b));
    }

    // 3. Enrich the low inventory items
    const enrichedLowStockItems = lowInventoryItems.map((item) => {
      const seedDetail = seedDetailsMap.get(item.Seeds_id) || {
        SeedName: "Unknown Seed",
        SeedType: "N/A",
      };
      const branchDetail = branchDetailsMap.get(item.branches_id) || {
        BranchName: "Unknown Branch",
      };
      return {
        seedInventoryId: item.Id,
        seedId: item.Seeds_id,
        seedName: seedDetail.SeedName,
        seedType: seedDetail.SeedType,
        branchId: item.branches_id,
        branchName: branchDetail.BranchName,
        quantityAtBranch: item.QuantityAtBranch,
      };
    });

    return NextResponse.json({
      lowStockItems: enrichedLowStockItems,
      threshold: LOW_STOCK_THRESHOLD_PER_BRANCH,
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/inventory-alerts GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      { error: "Failed to load inventory alerts.", details: error.message },
      { status }
    );
  }
}
