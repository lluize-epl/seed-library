// /app/api/users/lookup-by-card/route.js
import { NextResponse } from "next/server";

// These are now server-side only environment variables
const NOCO_API_KEY = process.env.NOCO_API_KEY;
const NOCO_BASE_URL = process.env.NOCO_BASE_URL;
const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID; // Or move this to server-only too

export async function GET(request) {
  if (!NOCO_API_KEY || !NOCO_BASE_URL || !USERS_TABLE_ID) {
    console.error("Server Environment variables for NocoDB are not set!");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  // Get libraryCard from query parameters of this internal API request
  const { searchParams } = new URL(request.url);
  const libraryCard = searchParams.get("libraryCard");

  if (!libraryCard) {
    return NextResponse.json(
      { error: "Library card parameter is missing." },
      { status: 400 }
    );
  }

  const nocoDBUrl = `${NOCO_BASE_URL}/${USERS_TABLE_ID}/records?where=(LibraryCard,eq,${libraryCard.trim()})`;

  try {
    const nocoResponse = await fetch(nocoDBUrl, {
      method: "GET",
      headers: {
        "xc-token": NOCO_API_KEY,
        accept: "application/json",
      },
    });

    if (!nocoResponse.ok) {
      const errorData = await nocoResponse.json().catch(() => ({}));
      console.error(
        `NocoDB API Error (${nocoResponse.status}) for card ${libraryCard}:`,
        errorData
      );
      return NextResponse.json(
        {
          error: errorData.msg || "Failed to fetch user from NocoDB.",
          details: errorData,
        },
        { status: nocoResponse.status }
      );
    }

    const data = await nocoResponse.json();
    const user =
      data && data.list && data.list.length > 0 ? data.list[0] : null;

    return NextResponse.json(user); // Send only the user object or null
  } catch (error) {
    console.error("Error in /api/users/lookup-by-card:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
