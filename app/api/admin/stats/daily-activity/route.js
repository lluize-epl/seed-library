// /app/api/admin/stats/daily-activity/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService"; // Your centralized server-side fetcher

// Ensure these are correct and available server-side
const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID;
const BRANCHES_TABLE_ID = process.env.NOCO_BRANCHES_TABLE_ID;
const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;
const BORROW_TRANSACTIONS_TABLE_ID =
  process.env.NOCO_BORROW_TRANSACTIONS_TABLE_ID;

// Helper to aggregate counts by branchId and map to branchName
const aggregateByBranch = (
  records = [],
  branchIdField,
  countField = null,
  branchMap
) => {
  const byBranchCounts = {};
  records.forEach((record) => {
    const id = record[branchIdField]; // e.g., record.branches_id
    if (id === undefined || id === null) {
      console.warn(
        "Record missing branchIdField:",
        record,
        "Expected field:",
        branchIdField
      );
      return; // Skip if no branch ID
    }
    const branchName = branchMap.get(id) || `Unknown Branch (ID ${id})`;
    byBranchCounts[branchName] =
      (byBranchCounts[branchName] || 0) +
      (countField ? record[countField] || 0 : 1);
  });
  return Object.entries(byBranchCounts)
    .map(([branchName, count]) => ({ branchName, count }))
    .sort((a, b) => b.count - a.count); // Sort descending by count
};

export async function GET(request) {
  if (
    !USERS_TABLE_ID ||
    !BRANCHES_TABLE_ID ||
    !PENDING_PICKUPS_TABLE_ID ||
    !BORROW_TRANSACTIONS_TABLE_ID
  ) {
    return NextResponse.json(
      {
        error: "Server configuration error: Missing table IDs for daily stats.",
      },
      { status: 500 }
    );
  }

  try {
    // Fetch all branches once to map IDs to names
    const branchesData = await serverNocoFetch(
      BRANCHES_TABLE_ID,
      "/records",
      { method: "GET" },
      "?fields=Id,BranchName&limit=200"
    );
    const branchMap = new Map(
      branchesData?.list?.map((b) => [b.Id, b.BranchName]) || []
    );

    // 1. New Users Today (by branch)
    // Assumes Users table has 'CreatedAt' (datetime) and 'branches_id' (FK to Branches)
    const newUsersQuery = `?where=(CreatedAt,eq,today)`;
    const newUsersTodayRecords =
      (
        await serverNocoFetch(
          USERS_TABLE_ID,
          "/records",
          { method: "GET" },
          newUsersQuery
        )
      )?.list || [];
    const newUsersByBranch = aggregateByBranch(
      newUsersTodayRecords,
      "branches_id",
      null,
      branchMap
    );

    // 2. Users whose status became "Validated" Today (by branch)
    // Assumes Users table has 'Status' and 'UpdatedAt' (datetime) and 'branches_id'
    const validatedUsersQuery = `?where=(Status,eq,Validated)~and(CreatedAt,eq,today)`;
    const usersValidatedTodayRecords =
      (
        await serverNocoFetch(
          USERS_TABLE_ID,
          "/records",
          { method: "GET" },
          validatedUsersQuery
        )
      )?.list || [];
    const validatedUsersByBranch = aggregateByBranch(
      usersValidatedTodayRecords,
      "branches_id",
      null,
      branchMap
    );

    // 3. Requested Holds Today (by branch) - from PendingPickups
    // Assumes PendingPickups has 'RequestTimestamp' (Date YYYY-MM-DD) and 'branches_id' (FK to Branches)
    const requestedHoldsQuery = `?where=(RequestTimestamp,eq,today)&fields=branches_id`;
    const requestedHoldsTodayRecords =
      (
        await serverNocoFetch(
          PENDING_PICKUPS_TABLE_ID,
          "/records",
          { method: "GET" },
          requestedHoldsQuery
        )
      )?.list || [];
    const requestedHoldsByBranch = aggregateByBranch(
      requestedHoldsTodayRecords,
      "branches_id",
      null,
      branchMap
    );

    // 4. Seeds Dispensed Today (packets by branch) - from BorrowTransactions
    // Assumes BorrowTransactions has 'TransactionDate' (Date YYYY-MM-DD), 'branches_id' (FK to Branches), and 'QuantityBorrowed'
    const dispensedSeedsQuery = `?where=(TransactionDate,eq,today)~and(Status,eq,Borrowed)&fields=branches_id,QuantityBorrowed`;
    const seedsDispensedTodayRecords =
      (
        await serverNocoFetch(
          BORROW_TRANSACTIONS_TABLE_ID,
          "/records",
          { method: "GET" },
          dispensedSeedsQuery
        )
      )?.list || [];
    const seedsDispensedByBranch = aggregateByBranch(
      seedsDispensedTodayRecords,
      "branches_id",
      "QuantityBorrowed",
      branchMap
    );

    return NextResponse.json({
      newUsersByBranch,
      validatedUsersByBranch,
      requestedHoldsByBranch,
      seedsDispensedByBranch,
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/daily-activity GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load daily activity statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
