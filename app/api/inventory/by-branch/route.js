// /app/api/inventory/by-branch/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;
const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;

export async function GET(request) {
  if (!SEED_INVENTORY_TABLE_ID || !SEEDS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Table IDs missing." },
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
    // Step 1: Fetch inventory records for the specific branch (all quantities, not just > 0 for a stock view)
    // Using field names as per your seedInventory.js: branches_id, QuantityAtBranch, Seeds_id, Id (PK of inventory)
    const inventoryQueryParams = `?where=(branches_id,eq,${parsedBranchId})&fields=Id,Seeds_id,QuantityAtBranch&limit=1000&sort=Seeds_id`; // Sort for consistent ordering
    const inventoryData = await serverNocoFetch(
      SEED_INVENTORY_TABLE_ID,
      "/records",
      { method: "GET" },
      inventoryQueryParams
    );
    const branchInventoryRecords = inventoryData?.list || [];

    if (branchInventoryRecords.length === 0) {
      return NextResponse.json([]); // No inventory items for this branch
    }

    // Step 2: Get unique Seed IDs from these inventory records
    const seedIdsInInventory = Array.from(
      new Set(branchInventoryRecords.map((inv) => inv.Seeds_id).filter(Boolean))
    );

    let seedDetailsList = [];
    if (seedIdsInInventory.length > 0) {
      // Step 3: Fetch full seed details for these Seed IDs
      const seedDetailsQueryParams = `?where=(Id,in,${seedIdsInInventory.join(
        ","
      )})&fields=Id,SeedName,SeedType`;
      const seedDetailsData = await serverNocoFetch(
        SEEDS_TABLE_ID,
        "/records",
        { method: "GET" },
        seedDetailsQueryParams
      );
      seedDetailsList = seedDetailsData?.list || [];
    }

    const seedDetailsMap = new Map(seedDetailsList.map((s) => [s.Id, s]));

    // Step 4: Combine inventory data with seed details
    const enrichedInventory = branchInventoryRecords
      .map((invRecord) => {
        const detail = seedDetailsMap.get(invRecord.Seeds_id);
        return {
          inventoryId: invRecord.Id, // PK of the SeedInventory record
          seedId: invRecord.Seeds_id, // FK to Seeds table
          seedName: detail?.SeedName || `Seed ID ${invRecord.Seeds_id}`,
          seedType: detail?.SeedType || "N/A",
          quantity: invRecord.QuantityAtBranch, // Current quantity at this branch
        };
      })
      .sort((a, b) => a.seedName.localeCompare(b.seedName)); // Sort alphabetically by seed name

    return NextResponse.json(enrichedInventory);
  } catch (error) {
    console.error(
      `Error in /api/inventory/by-branch for branch ${branchId}:`,
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error fetching branch inventory.";
    return NextResponse.json({ error: message }, { status });
  }
}
