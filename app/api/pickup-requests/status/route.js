// /app/api/pickup-requests/status/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;

export async function PATCH(request) {
  if (!PENDING_PICKUPS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  try {
    const { pickupId, newStatus } = await request.json();
    if (!pickupId || !newStatus) {
      return NextResponse.json(
        { error: "Missing pickupId or newStatus." },
        { status: 400 }
      );
    }

    const response = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      `/records`,
      {
        method: "PATCH",
        body: [{ Id: pickupId, Status: newStatus }],
      }
    );
    return NextResponse.json(
      { message: "Pickup status updated.", data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/pickup-requests/status/ PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: 500 }
    );
  }
}
