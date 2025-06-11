// /app/api/seed-inventory/[inventoryId]/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;

export async function GET(request, { params }) {
  // params.inventoryId will contain the dynamic segment
  const { inventoryId } = await params;
  if (!SEED_INVENTORY_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  if (!inventoryId || isNaN(parseInt(inventoryId))) {
    return NextResponse.json(
      { error: "Invalid or missing inventoryId." },
      { status: 400 }
    );
  }

  try {
    const data = await serverNocoFetch(
      SEED_INVENTORY_TABLE_ID,
      `/records/${inventoryId}`, // Fetch single record by ID
      { method: "GET" }
    );
    if (!data) {
      // NocoDB might return null or empty if not found with /records/{id}
      return NextResponse.json(
        { error: "Inventory record not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/seed-inventory/[inventoryid]/ GET:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: error.status || 500 }
    );
  }
}
