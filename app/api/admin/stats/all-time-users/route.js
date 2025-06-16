// /app/api/admin/stats/all-time-users/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID;

export async function GET(request) {
  if (!USERS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Users Table ID missing." },
      { status: 500 }
    );
  }

  try {
    // Total Registered Users
    const totalUsersData = await serverNocoFetch(USERS_TABLE_ID, "/records", {
      method: "GET",
    });
    const totalRegisteredUsers = totalUsersData?.pageInfo?.totalRows || 0;

    // Total Validated Users
    const validatedUsersData = await serverNocoFetch(
      USERS_TABLE_ID,
      "/records",
      { method: "GET" },
      `?where=(Status,eq,Validated)&limit=1&pageInfo=count`
    );
    const totalValidatedUsers = validatedUsersData?.pageInfo?.totalRows || 0;

    // You could also add total 'New' status users if needed
    const newStatusUsersData = await serverNocoFetch(
      USERS_TABLE_ID,
      "/records",
      { method: "GET" },
      `?where=(Status,eq,New)&limit=1&pageInfo=count`
    );
    const totalNewStatusUsers = newStatusUsersData?.pageInfo?.totalRows || 0;

    return NextResponse.json({
      totalRegisteredUsers,
      totalValidatedUsers,
      totalNewStatusUsers, // Added this for completeness
    });
  } catch (error) {
    console.error(
      "Error in /api/admin/stats/all-time-users GET:",
      error.message,
      error.details || ""
    );
    const status = error.status || 500;
    return NextResponse.json(
      {
        error: "Failed to load all-time user statistics.",
        details: error.message,
      },
      { status }
    );
  }
}
