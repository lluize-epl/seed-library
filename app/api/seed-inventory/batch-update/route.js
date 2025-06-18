// /app/api/seed-inventory/batch-update/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;

export async function PATCH(request) {
  if (!SEED_INVENTORY_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Seed Inventory Table ID missing." },
      { status: 500 }
    );
  }

  try {
    const inventoryUpdates = await request.json(); // Expects an array: [{ Id, QuantityAtBranch, staffName }, ...]
    if (!Array.isArray(inventoryUpdates) || inventoryUpdates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Invalid request body: Expected an array of inventory updates.",
        },
        { status: 400 }
      );
    }

    let staffName = "Reference Desk";

    if (inventoryUpdates[0] && inventoryUpdates[0].staffName) {
      staffName = inventoryUpdates[0].staffName;
    }
    // Optional: Add server-side validation for each update item
    for (const update of inventoryUpdates) {
      if (
        update.Id === undefined ||
        update.QuantityAtBranch === undefined ||
        update.QuantityAtBranch < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid item in inventory update array. Each item needs Id, non-negative QuantityAtBranch and the name of staff updating it.",
          },
          { status: 400 }
        );
      }
    }

    console.log(`***** ${staffName} is Updating Seed ****`, inventoryUpdates);
    // NocoDB's PATCH to /records (plural) expects an array of objects, each with its Id.
    const nocoResponse = await serverNocoFetch(
      SEED_INVENTORY_TABLE_ID,
      `/records`,
      {
        method: "PATCH",
        body: inventoryUpdates, // Pass the array directly
      }
    );

    // NocoDB PATCH to /records usually returns an array of updated records or a success indicator.
    // If it returns null on success for PATCH, that's fine.
    // If it returns the updated records, you can pass them back.
    console.log(`Seed updated by staff: ${staffName || "Unknown"}`);
    return NextResponse.json(
      { message: "Inventory updated successfully.", data: nocoResponse },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error in /api/seed-inventory/batch-update PATCH:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error updating seed inventory.";
    return NextResponse.json({ error: message }, { status });
  }
}
