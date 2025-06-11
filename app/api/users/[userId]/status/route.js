// /app/api/users/[userId]/status/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID;

export async function PATCH(request, { params }) {
  const { userId } = await params;
  if (!USERS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  if (!userId || isNaN(parseInt(userId))) {
    return NextResponse.json(
      { error: "Invalid or missing userId." },
      { status: 400 }
    );
  }

  try {
    const { newStatus } = await request.json();
    if (!newStatus) {
      return NextResponse.json(
        { error: "Missing newStatus in request body." },
        { status: 400 }
      );
    }

    const response = await serverNocoFetch(USERS_TABLE_ID, `/records`, {
      method: "PATCH",
      body: [{ Id: parseInt(userId), Status: newStatus }], // NocoDB batch PATCH format
    });
    return NextResponse.json(
      { message: "User status updated.", data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/users/[userId]/status/ PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: error.status || 500 }
    );
  }
}
