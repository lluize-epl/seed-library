/**
 * Fetches all branches from the internal API route.
 * @returns {Promise<Array<object>>} Array of branch objects [{ Id, BranchName }, ...] or empty array.
 */
export async function fetchAllBranches() {
  try {
    const response = await fetch("/api/branches", {
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
          `Failed to fetch branches (status: ${response.status})`
      );
    }

    return responseData; // This should be the array of branches [{Id, BranchName}, ...]
  } catch (error) {
    console.error("Client-side fetchAllBranches error:", error);
    throw error; // Re-throw for the page component to handle
  }
}
