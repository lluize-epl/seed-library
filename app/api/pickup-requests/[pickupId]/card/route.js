// /app/api/pickup-requests/[pickupId]/card/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;
const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID;

export async function PATCH(request, { params }) {
  const { pickupId } = await params; // From the dynamic route segment

  if (!PENDING_PICKUPS_TABLE_ID && !USERS_TABLE_ID) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Pending Pickups Table ID or User Table ID missing.",
      },
      { status: 500 }
    );
  }
  if (!pickupId || isNaN(parseInt(pickupId))) {
    return NextResponse.json(
      { error: "Invalid or missing pickupId." },
      { status: 400 }
    );
  }

  try {
    const { newLibraryCard, staffName } = await request.json();

    if (
      newLibraryCard === undefined ||
      newLibraryCard === null ||
      String(newLibraryCard).trim() === ""
    ) {
      return NextResponse.json(
        { error: "newLibraryCard is missing or empty." },
        { status: 400 }
      );
    }
    // Add more validation for newLibraryCard format (e.g., 14 digits, starts with '293600') server-side
    const cardString = String(newLibraryCard).trim();
    if (cardString.length !== 14 || !cardString.startsWith("293600")) {
      return NextResponse.json(
        {
          error:
            "Invalid Library Card format. Must be 14 digits starting with 293600.",
        },
        { status: 400 }
      );
    }

    // Update the LibraryCard field on the specific PendingPickups record
    // NocoDB's PATCH to /records (plural) expects an array, even for one record.
    const updatePayload = [
      {
        Id: parseInt(pickupId),
        LibraryCard: cardString, // Ensure this field name matches your NocoDB table
      },
    ];
    console.log(`***** ${staffName} is Updating Card ****`, updatePayload);

    const updatedRecord = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      `/records`,
      {
        method: "PATCH",
        body: updatePayload,
      }
    );

    // Optional: If you also need to update the main Users.LibraryCard
    // This would require fetching the UserId from the PendingPickup first if not passed.
    const pendingPickupRecord = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      `/records/${pickupId}`,
      { method: "GET" }
    );
    if (pendingPickupRecord && pendingPickupRecord.Users_id) {
      await serverNocoFetch(USERS_TABLE_ID, `/records`, {
        method: "PATCH",
        body: [{ Id: pendingPickupRecord.Users_id, LibraryCard: cardString }],
      });
    }
    console.log(
      `Library Card for pickup ${pickupId} updated to ${cardString} by staff: ${
        staffName || "Unknown"
      }`
    );
    return NextResponse.json(
      {
        message: "Library card updated successfully on pending pickup.",
        data: updatedRecord,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Error updating library card for pickup ID ${pickupId}:`,
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error updating library card.";
    return NextResponse.json({ error: message }, { status });
  }
}
