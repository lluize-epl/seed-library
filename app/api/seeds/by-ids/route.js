// /app/api/seeds/by-ids/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService"; // Your centralized server-side fetcher

const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;

export async function GET(request) {
  if (!SEEDS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Seeds Table ID missing." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids"); // Expecting a comma-separated string of IDs, e.g., "1,3,5"

  if (!idsParam) {
    return NextResponse.json(
      { error: "Seed IDs parameter 'ids' is missing." },
      { status: 400 }
    );
  }

  const seedIds = idsParam
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0);

  if (seedIds.length === 0) {
    return NextResponse.json(
      { error: "No valid seed IDs provided." },
      { status: 400 }
    );
    // Alternatively, return NextResponse.json([]); if an empty array is acceptable for no valid IDs.
  }

  try {
    // Fetch necessary fields: Id, SeedName, SeedType
    const queryParams = `?where=(Id,in,${seedIds.join(
      ","
    )})&fields=Id,SeedName,SeedType`;
    const data = await serverNocoFetch(
      SEEDS_TABLE_ID,
      "/records",
      { method: "GET" },
      queryParams
    );

    const seedDetailsList = data?.list || [];
    return NextResponse.json(seedDetailsList);
  } catch (error) {
    console.error(
      `Error in /api/seeds/by-ids for IDs [${idsParam}]:`,
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    const message =
      error.message || "Internal server error fetching seed details.";
    return NextResponse.json({ error: message }, { status });
  }
}
