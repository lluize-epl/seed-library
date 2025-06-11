// /app/api/interests/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService"; // Your centralized server-side fetcher

const INTERESTS_TABLE_ID = process.env.NEXT_PUBLIC_NOCO_INTERESTS_TABLE_ID; // Or move to server-only

export async function GET(request) {
  if (!INTERESTS_TABLE_ID) {
    console.error("Server: Interests Table ID not configured.");
    return NextResponse.json(
      { error: "Server configuration error: Interests Table ID missing." },
      { status: 500 }
    );
  }

  try {
    // Fetch only necessary fields: Id and Title for the interests list
    const queryParams = `?fields=Id,Title&limit=200`; // Assuming 200 is enough interests
    const data = await serverNocoFetch(
      INTERESTS_TABLE_ID,
      "/records",
      { method: "GET" },
      queryParams
    );

    const interests = data && data.list ? data.list : [];
    return NextResponse.json(interests);
  } catch (error) {
    console.error(
      "Error in /api/interests GET:",
      error.message,
      error.details ? error.details : ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error fetching interests.";
    return NextResponse.json({ error: message }, { status });
  }
}
