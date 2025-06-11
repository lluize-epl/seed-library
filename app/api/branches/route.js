// /app/api/branches/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService"; // Using your centralized server-side fetcher

const BRANCHES_TABLE_ID = process.env.NOCO_BRANCHES_TABLE_ID;

export async function GET(request) {
  if (!BRANCHES_TABLE_ID) {
    console.error("Server: Branches Table ID not configured.");
    return NextResponse.json(
      { error: "Server configuration error: Branches Table ID missing." },
      { status: 500 }
    );
  }

  try {
    // Fetch only necessary fields for the dropdown
    const queryParams = `?fields=Id,BranchName&limit=200`; // Assuming 200 is enough branches
    const data = await serverNocoFetch(
      BRANCHES_TABLE_ID,
      "/records",
      { method: "GET" },
      queryParams
    );

    const branches = data && data.list ? data.list : [];
    return NextResponse.json(branches);
  } catch (error) {
    console.error(
      "Error in /api/branches GET:",
      error.message,
      error.details ? error.details : ""
    );
    const status = error.status || 500;
    const message = error.message || "Internal server error fetching branches.";
    return NextResponse.json({ error: message }, { status });
  }
}
