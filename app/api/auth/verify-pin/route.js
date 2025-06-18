// /app/api/auth/verify-pin/route.js
import { NextResponse } from "next/server";

// Access the server-side only environment variable
const STAFF_PINS_JSON_STRING = process.env.STAFF_PINS_JSON;
let STAFF_PINS = {};

try {
  if (STAFF_PINS_JSON_STRING) {
    STAFF_PINS = JSON.parse(STAFF_PINS_JSON_STRING);
  } else {
    console.warn(
      "SERVER WARNING: STAFF_PINS_JSON environment variable is not set. PIN verification will fail."
    );
  }
} catch (e) {
  console.error(
    "SERVER ERROR: Failed to parse STAFF_PINS_JSON. Ensure it's valid JSON.",
    e
  );
  STAFF_PINS = {}; // Default to empty if parsing fails
}

export async function POST(request) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN is required and must be a string." },
        { status: 400 }
      );
    }

    if (STAFF_PINS[pin.trim()]) {
      // PIN is valid
      const staffName = STAFF_PINS[pin.trim()];
      console.log(
        `PIN Verification: PIN ${pin} used by ${staffName} - Succeeded.`
      ); // Server-side log
      return NextResponse.json({
        success: true,
        staffName: staffName,
        message: "PIN Verified.",
      });
    } else {
      // PIN is invalid
      console.warn(`PIN Verification: Invalid PIN attempted: ${pin}`); // Server-side log
      return NextResponse.json(
        { success: false, error: "Invalid PIN." },
        { status: 401 }
      ); // Unauthorized
    }
  } catch (error) {
    console.error("Error in /api/auth/verify-pin:", error);
    return NextResponse.json(
      { error: "Internal server error during PIN verification." },
      { status: 500 }
    );
  }
}
