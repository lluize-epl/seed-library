// lib/noco-apis/interests.js
// This file no longer needs direct nocoFetch or NocoDB env vars

/**
 * Fetches all interests from the internal API route.
 * @returns {Promise<Array<object>>} Array of interest objects [{ Id, Title }, ...] or empty array.
 */
export async function fetchAllInterests() {
  try {
    const response = await fetch("/api/interests", {
      // Calls your internal GET route
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseData = await response.json(); // Always try to parse JSON

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          `Failed to fetch interests (status: ${response.status})`
      );
    }

    return responseData; // This should be the array of interests [{Id, Title}, ...]
  } catch (error) {
    console.error("Client-side fetchAllInterests error:", error);
    throw error; // Re-throw for the page component to handle
  }
}
