import { nocoFetch } from "./noco-records";

export async function fetchUserByLibraryCard(libraryCard) {
  try {
    // Calls your internal API route
    const response = await fetch(
      `/api/users/lookup-by-card?libraryCard=${encodeURIComponent(
        libraryCard.trim()
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json", // Good practice, though GET has no body
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Request failed with status ${response.status}`,
      }));
      // Use a more specific error message if your API route provides one
      throw new Error(
        errorData.error ||
          errorData.message ||
          `Failed to fetch user (status: ${response.status})`
      );
    }

    // Check if response body is empty, which might be the case for 'null' user
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      return data; // This will be the user object or null
    } else {
      // Handle cases where response is not JSON or empty (e.g. direct null from API endpoint)
      return null;
    }
  } catch (error) {
    console.error("Client-side fetchUserByLibraryCard error:", error);
    throw error; // Re-throw for the page component to handle
  }
}

export async function createUser(userData, selectedInterestIds = []) {
  // userData: object containing all user fields (FullName, LibraryCard, Phone, Email, Status: "New", RegisteredAtBranchId_FieldNameInPayload etc.)
  // selectedInterestIds: array of interest IDs [1, 2, 3]
  try {
    const response = await fetch("/api/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userData, selectedInterestIds }), // Send both parts
    });

    const responseData = await response.json(); // Always try to parse JSON

    if (!response.ok) {
      // Use error message from our API route if available
      throw new Error(
        responseData.error ||
          `User registration failed (status: ${response.status})`
      );
    }

    // The API route should return the newly created user object
    return responseData;
  } catch (error) {
    console.error("Client-side createUser error:", error);
    throw error;
  }
}

export async function updateUserStatus(userId, newStatus) {
  try {
    const response = await fetch(`/api/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus }),
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Failed to update user status");
    return data;
  } catch (error) {
    console.error("Client-side update User Status error:", error);
    throw error;
  }
}
