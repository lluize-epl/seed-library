// /app/api/admin/stats/all-time-pickups/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;
const BORROW_TRANSACTIONS_TABLE_ID =
  process.env.NOCO_BORROW_TRANSACTIONS_TABLE_ID;

export async function GET(request) {
  if (!PENDING_PICKUPS_TABLE_ID || !BORROW_TRANSACTIONS_TABLE_ID) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing table IDs for pickup stats.",
      },
      { status: 500 }
    );
  }

  try {
    // Total Holds Requested (all PendingPickup records ever created)
    const totalHoldsData = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      "/records",
      { method: "GET" },
      ``
    );
    const totalHoldsRequested = totalHoldsData?.pageInfo?.totalRows || 0;

    // Total Seeds Dispensed (sum of QuantityBorrowed from all BorrowTransactions with Status="Borrowed")
    // Fetching all records and summing can be inefficient for very large tables.
    // NocoDB might have aggregation capabilities in its API for SUM, otherwise, this is the approach.
    const allBorrowTransactions =
      (
        await serverNocoFetch(
          BORROW_TRANSACTIONS_TABLE_ID,
          "/records",
          { method: "GET" },
          `?where=(Status,eq,Borrowed)&fields=QuantityBorrowed&limit=25000`
        )
      )?.list || []; // High limit, adjust based on expected data
    const totalSeedsDispensed = allBorrowTransactions.reduce(
      (sum, tx) => sum + (tx.QuantityBorrowed || 0),
      0
    );

    // You could also count "Total Pickups Dispensed" (PendingPickups with Status="Dispensed")
    const totalPickupsDispensedData = await serverNocoFetch(
      PENDING_PICKUPS_TABLE_ID,
      "/records",
      { method: "GET" },
      `?where=(Status,eq,Dispensed)`
    );
    const totalPickupsDispensed =
      totalPickupsDispensedData?.pageInfo?.totalRows || 0;

    return NextResponse.json({
      totalHoldsRequested,
      totalSeedsDispensed, // Total packets
      totalPickupsDispensed, // Total completed pickup events
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/all-time-pickups GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load all-time pickup statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
