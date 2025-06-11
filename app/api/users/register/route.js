// /app/api/users/register/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";
// Server-side environment variables

const USERS_TABLE_ID = process.env.NOCO_USERS_TABLE_ID; // Or move to server-only
const USER_INTERESTS_M2M_LINK_ID =
  process.env.NOCO_USER_INTERESTS_LINK_USERS_ID; // Link ID for User <> Interests M2M

export async function POST(request) {
  if (!USERS_TABLE_ID || !USER_INTERESTS_M2M_LINK_ID) {
    return NextResponse.json(
      { error: "Server configuration error: Table/Link IDs missing." },
      { status: 500 }
    );
  }

  try {
    const { userData, selectedInterestIds } = await request.json();

    if (!userData || !userData.LibraryCard || !userData.FullName) {
      // Basic validation
      return NextResponse.json(
        { error: "Missing required user data (LibraryCard, FullName)." },
        { status: 400 }
      );
    }

    // 1. Create the user
    // userData should contain all direct fields including Status: "New" and the branch link field (e.g., RegisteredAtBranchId_FieldNameInPayload)
    const newUser = await serverNocoFetch(USERS_TABLE_ID, "/records", {
      method: "POST",
      body: userData,
    });

    if (!newUser || !newUser.Id) {
      // This case might happen if NocoDB returns an error that nocoFetch didn't throw as expected,
      // or if the response structure is unexpected.
      console.error(
        "NocoDB: User creation call made, but response was not as expected or no ID returned.",
        newUser
      );
      return NextResponse.json(
        {
          error:
            "User record creation failed or returned invalid data from NocoDB.",
        },
        { status: 500 }
      );
    }

    // 2. Link interests if any are selected
    if (
      selectedInterestIds &&
      Array.isArray(selectedInterestIds) &&
      selectedInterestIds.length > 0
    ) {
      const interestLinkPath = `/links/${USER_INTERESTS_M2M_LINK_ID}/records/${newUser.Id}`;
      const interestLinkBody = selectedInterestIds.map((id) => ({ Id: id }));

      await serverNocoFetch(USERS_TABLE_ID, interestLinkPath, {
        method: "POST",
        body: interestLinkBody,
      });
    }

    // Return the newly created user object (or at least key info like Id, FullName, LibraryCard)
    // NocoDB's POST /records usually returns the created object.
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error in /api/users/register POST:", error);
    // If error has a status from nocoFetch, use it, otherwise 500
    const status = error.status || 500;
    const message =
      error.message || "Internal server error during registration.";
    return NextResponse.json(
      { error: message, details: error.details },
      { status }
    );
  }
}
