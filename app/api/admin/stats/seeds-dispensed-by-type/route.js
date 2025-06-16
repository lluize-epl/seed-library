// /app/api/admin/stats/seeds-dispensed-type/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const BORROW_TRANSACTIONS_TABLE_ID =
  process.env.NOCO_BORROW_TRANSACTIONS_TABLE_ID;
const SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;

export async function GET(request) {
  if (!BORROW_TRANSACTIONS_TABLE_ID || !SEEDS_TABLE_ID) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing table IDs for seeds-dispensed routes.",
      },
      { status: 500 }
    );
  }

  try {
    // 1. Fetch all "Borrowed" transactions with SeedId and QuantityBorrowed
    const queryParams = `?where=(Status,eq,Borrowed)&fields=Seeds_id,QuantityBorrowed&limit=10000`; // Adjust limit
    const transactions =
      (
        await serverNocoFetch(
          BORROW_TRANSACTIONS_TABLE_ID,
          "/records",
          { method: "GET" },
          queryParams
        )
      )?.list || [];

    if (transactions.length === 0) return NextResponse.json([]);

    // 2. Aggregate quantities by Seeds_id
    const dispensedBySeedId = {};
    transactions.forEach((tx) => {
      if (tx.Seeds_id) {
        dispensedBySeedId[tx.Seeds_id] =
          (dispensedBySeedId[tx.Seeds_id] || 0) + (tx.QuantityBorrowed || 0);
      }
    });

    const seedIds = Object.keys(dispensedBySeedId);
    if (seedIds.length === 0) return NextResponse.json([]);

    // 3. Fetch seed details (Name, Type) for these IDs
    const seedDetailsData =
      (
        await serverNocoFetch(
          SEEDS_TABLE_ID,
          "/records",
          { method: "GET" },
          `?where=(Id,in,${seedIds.join(",")})&fields=Id,SeedName,SeedType`
        )
      )?.list || [];
    const seedDetailsMap = new Map(seedDetailsData.map((s) => [s.Id, s]));

    // 4. Format for chart
    const chartData = seedIds
      .map((id) => {
        const detail = seedDetailsMap.get(parseInt(id));
        return {
          name: detail
            ? `${detail.SeedName} (${detail.SeedType})`
            : `Seed ID ${id}`,
          value: dispensedBySeedId[id],
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by most dispensed

    return NextResponse.json(chartData.slice(0, 10)); // Return top 10 for example
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/seed-dispensed-by-type GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load seed dispensed by type statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
