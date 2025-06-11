// /app/api/pickup-requests/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const NOCO_API_KEY = process.env.NOCO_API_KEY;
const NOCO_BASE_URL = process.env.NOCO_BASE_URL;
const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;
const PENDING_PICKUPS_ITEMS_TABLE_ID =
  process.env.NOCO_PENDING_PICKUPS_ITEMS_TABLE_ID;

export async function POST(request) {
  if (
    !NOCO_API_KEY ||
    !NOCO_BASE_URL ||
    !PENDING_PICKUPS_TABLE_ID ||
    !PENDING_PICKUPS_ITEMS_TABLE_ID
  ) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  try {
    const { pickupData, itemsData } = await request.json(); // Get data from client request body

    if (!pickupData || !itemsData || !Array.isArray(itemsData)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    // 1. Create parent PendingPickups record (construct payload as NocoDB expects)
    const parentPickupPayload = {
      LibraryCard: pickupData.LibraryCard,
      UserFullName: pickupData.UserFullName,
      RequestTimestamp:
        pickupData.RequestTimestamp || new Date().toISOString().split("T")[0],
      Status: pickupData.Status || "Pending",
      Users_id: pickupData.UserId,
      branches_id: pickupData.BranchId,
    };

    const parentNocoResponse = await fetch(
      `${NOCO_BASE_URL}/${PENDING_PICKUPS_TABLE_ID}/records`,
      {
        method: "POST",
        headers: {
          "xc-token": NOCO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(parentPickupPayload),
      }
    );

    if (!parentNocoResponse.ok) {
      const errorData = await parentNocoResponse.json().catch(() => ({}));
      console.error("NocoDB: Failed to create parent pickup:", errorData);
      return NextResponse.json(
        {
          error: "Failed to create pickup request header.",
          details: errorData,
        },
        { status: parentNocoResponse.status }
      );
    }
    const parentPickup = await parentNocoResponse.json();
    if (!parentPickup || !parentPickup.Id) {
      throw new Error("NocoDB: Parent pickup created but no ID returned.");
    }
    const newParentPickupId = parentPickup.Id;

    // 2. Create child PendingPickupItems records (batch POST)
    if (itemsData.length > 0) {
      const itemPayloadsForBatch = itemsData.map((item) => ({
        QuantityToDispense: item.QuantityToDispense,
        PendingPickups_id: newParentPickupId,
        Seeds_id: item.SeedId,
        SeedInventoryId: item.SeedInventoryId,
      }));

      const itemsNocoResponse = await fetch(
        `${NOCO_BASE_URL}/${PENDING_PICKUPS_ITEMS_TABLE_ID}/records`,
        {
          method: "POST",
          headers: {
            "xc-token": NOCO_API_KEY,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(itemPayloadsForBatch), // Send array for batch
        }
      );

      if (!itemsNocoResponse.ok) {
        const errorData = await itemsNocoResponse.json().catch(() => ({}));
        console.error("NocoDB: Failed to create pickup items:", errorData);
        // Ideally, here you might try to delete the parentPickup or set its status to error.
        return NextResponse.json(
          {
            error: "Failed to create pickup items.",
            details: errorData,
            parentPickupId: newParentPickupId,
          },
          { status: itemsNocoResponse.status }
        );
      }
    }

    return NextResponse.json({
      ...parentPickup,
      Id: newParentPickupId,
      message: "Pickup request created successfully",
    });
  } catch (error) {
    console.error("Error in /api/pickup-requests POST:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: 500 }
    );
  }
}

// You would also add a GET handler here for fetchPendingPickupsWithLookups
export async function GET(request) {
  if (!PENDING_PICKUPS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  try {
    // Your refined query with lookups to get UserStatus, SeedInventoryIds etc. on the PendingPickup object
    const queryParams = `?where=(Status,eq,Pending)&sort=-CreatedAt&limit=50`;

    const data = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      "/records",
      { method: "GET" },
      queryParams
    );

    if (data && data.list) {
      const processedList = data.list.map((pickup) => {
        const items = [];
        const itemCount = pickup.SeedName ? pickup.SeedName.length : 0;
        for (let i = 0; i < itemCount; i++) {
          const seedIdData =
            pickup.SeedId && pickup.SeedId[i]
              ? pickup.SeedId[i]
              : { Id: null, SeedType: "Unknown" };
          const seedInventoryIdForItem =
            pickup.SeedInventoryIds && pickup.SeedInventoryIds[i] !== undefined
              ? pickup.SeedInventoryIds[i]
              : null;
          items.push({
            OriginalSeedId: seedIdData.Id,
            SeedNameDisplay: pickup.SeedName[i] || "Unknown",
            SeedTypeDisplay: seedIdData.SeedType,
            QuantityToDispense:
              pickup.QuantityDispensed &&
              pickup.QuantityDispensed[i] !== undefined
                ? pickup.QuantityDispensed[i]
                : 0,
            SeedInventoryId: seedInventoryIdForItem,
          });
        }
        return { ...pickup, ProcessedItems: items };
      });
      return NextResponse.json(processedList);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error in /api/pickup-requests GET:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: 500 }
    );
  }
}
