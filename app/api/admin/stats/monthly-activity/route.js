// /app/api/admin/stats/monthly-activity/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID;
const BRANCHES_TABLE_ID = process.env.NOCO_BRANCHES_TABLE_ID;
const PENDING_PICKUPS_TABLE_ID = process.env.NOCO_PENDING_PICKUPS_TABLE_ID;
const BORROW_TRANSACTIONS_TABLE_ID =
  process.env.NOCO_BORROW_TRANSACTIONS_TABLE_ID;

const getCurrentMonthToDateBoundaries = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // For NocoDB 'Date' type fields (YYYY-MM-DD)
  const monthStartDateOnly = new Date(year, month, 1)
    .toISOString()
    .split("T")[0];
  // End of today (for datetime fields, to include all of today)
  const monthEndDateOnly = new Date(year, month + 1, 0)
    .toISOString()
    .split("T")[0];
  const todayDateOnly = new Date().toISOString().split("T")[0];

  return {
    monthStartDateOnly,
    monthEndDateOnly,
  };
};

// Helper to aggregate counts by branchId and map to branchName (same as daily)
const aggregateByBranch = (
  records = [],
  branchIdField,
  countField = null,
  branchMap
) => {
  const byBranchCounts = {};
  records.forEach((record) => {
    const id = record[branchIdField];
    if (id === undefined || id === null) return;
    const branchName = branchMap.get(id) || `Unknown Branch (ID ${id})`;
    byBranchCounts[branchName] =
      (byBranchCounts[branchName] || 0) +
      (countField ? record[countField] || 0 : 1);
  });
  return Object.entries(byBranchCounts)
    .map(([branchName, count]) => ({ branchName, count }))
    .sort((a, b) => b.count - a.count);
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
        error:
          "Server configuration error: Missing table IDs for monthly stats.",
      },
      { status: 500 }
    );
  }

  try {
    const branchesData = await serverNocoFetch(
      BRANCHES_TABLE_ID,
      "/records",
      { method: "GET" },
      "?fields=Id,BranchName&limit=200"
    );
    const branchMap = new Map(
      branchesData?.list?.map((b) => [b.Id, b.BranchName]) || []
    );

    // 1. New Users This Month (by branch)
    const newUsersQuery = `?where=(CreatedAt,isWithin,pastNumberOfDays,30)`;
    const newUsersThisMonthRecords =
      (
        await serverNocoFetch(
          USERS_TABLE_ID,
          "/records",
          { method: "GET" },
          newUsersQuery
        )
      )?.list || [];
    const newUsersByBranch = aggregateByBranch(
      newUsersThisMonthRecords,
      "branches_id",
      null,
      branchMap
    );

    // 2. Users whose status became "Validated" This Month (by branch)
    const validatedUsersQuery = `?where=(Status,eq,Validated)~and(UpdatedAt,isWithin,pastNumberOfDays,30)`;
    const usersValidatedThisMonthRecords =
      (
        await serverNocoFetch(
          USERS_TABLE_ID,
          "/records",
          { method: "GET" },
          validatedUsersQuery
        )
      )?.list || [];
    const validatedUsersByBranch = aggregateByBranch(
      usersValidatedThisMonthRecords,
      "branches_id",
      null,
      branchMap
    );

    // 3. Requested Holds This Month (by branch) - from PendingPickups
    // Assuming RequestTimestamp is stored as YYYY-MM-DD
    const requestedHoldsQuery = `?where=(RequestTimestamp,isWithin,pastNumberOfDays,30)`;
    const requestedHoldsThisMonthRecords =
      (
        await serverNocoFetch(
          PENDING_PICKUPS_TABLE_ID,
          "/records",
          { method: "GET" },
          requestedHoldsQuery
        )
      )?.list || [];
    const requestedHoldsByBranch = aggregateByBranch(
      requestedHoldsThisMonthRecords,
      "branches_id",
      null,
      branchMap
    );

    // 4. Seeds Dispensed This Month (packets by branch) - from BorrowTransactions
    // Assuming TransactionDate is stored as YYYY-MM-DD
    const dispensedSeedsQuery = `?where=(TransactionDate,isWithin,pastNumberOfDays,30)~and(Status,eq,Borrowed)&fields=branches_id,QuantityBorrowed`;
    const seedsDispensedThisMonthRecords =
      (
        await serverNocoFetch(
          BORROW_TRANSACTIONS_TABLE_ID,
          "/records",
          { method: "GET" },
          dispensedSeedsQuery
        )
      )?.list || [];
    const seedsDispensedByBranch = aggregateByBranch(
      seedsDispensedThisMonthRecords,
      "branches_id",
      "QuantityBorrowed",
      branchMap
    );

    const { monthStartDateOnly, monthEndDateOnly } =
      getCurrentMonthToDateBoundaries();

    return NextResponse.json({
      newUsersByBranch,
      validatedUsersByBranch,
      requestedHoldsByBranch,
      seedsDispensedByBranch,
      monthBoundary: { start: monthStartDateOnly, end: monthEndDateOnly }, // For context on UI
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/monthly-activity GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load monthly activity statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
