import { nocoFetch } from "./noco-records";

const PENDING_PICKUPS_TABLE_ID =
  process.env.NEXT_PUBLIC_NOCO_PENDING_PICKUPS_TABLE_ID;
const PENDING_PICKUP_ITEMS_TABLE_ID =
  process.env.NEXT_PUBLIC_NOCO_PENDING_PICKUPS_ITEMS_TABLE_ID;

/**
 * Creates a new pending pickup request (parent record and its items).
 * @param {object} pickupData - Data for the PendingPickups table.
 * @param {Array<object>} itemsData - Array of items for PendingPickupItems table.
 * pickupData: { UserId, LibraryCard, UserFullName, BranchId, BranchName }
  itemsData: [{ SeedId, SeedName, SeedType, QuantityToDispense, SeedInventoryId }]
 */

export async function createPendingPickupRequest(pickupData, itemsData) {
  try {
    const response = await fetch("/api/pickup-requests", {
      // Calls your internal POST route
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pickupData, itemsData }), // Send payload expected by your API route
    });

    const responseData = await response.json(); // Always try to parse JSON for error or success

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          `Failed to create pending pickup request (status: ${response.status})`
      );
    }

    return responseData; // Your API route should return the created parentPickup object or relevant data
  } catch (error) {
    console.error("Client-side createPendingPickupRequest error:", error);
    throw error;
  }
}

// fetchPendingPickupsWithLookups would call GET /api/pickup-requests
export async function fetchPendingPickupsWithLookups() {
  try {
    const response = await fetch("/api/pickup-requests");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Failed to fetch pending pickups");
    return data;
  } catch (error) {
    console.error(
      "Client-side fetch Pending Pickups with Lookups error:",
      error
    );
    throw error;
  }
}

// If fetching full PendingPickupItems is needed for cancellation (if lookups aren't enough)
export async function fetchItemsForPendingPickup(pendingPickupId) {
  const itemsTableId =
    process.env.NEXT_PUBLIC_NOCO_PENDING_PICKUP_ITEMS_TABLE_ID;
  if (!itemsTableId)
    throw new Error("Pending Pickup Items Table ID not configured.");
  // Assumes PendingPickupItems has a column 'PendingPickups_id' linking to parent
  const queryParams = `?where=(PendingPickups_id,eq,${pendingPickupId})`;
  const data = await nocoFetch(
    itemsTableId,
    "/records",
    { method: "GET" },
    queryParams
  );
  return data && data.list ? data.list : [];
}

/**
 * Updates the status of a PendingPickup record.
 * @param {number} pickupId - The ID of the PendingPickup to update.
 * @param {string} newStatus - The new status (e.g., "Dispensed", "Cancelled").
 */
export async function updatePendingPickupStatus(pickupId, newStatus) {
  try {
    const response = await fetch("/api/pickup-requests/status", {
      // Calls new PATCH route
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupId, newStatus }),
    });
    // ... (error handling and JSON parsing) ...
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Failed to update pending pickups status");
    return data;
  } catch (error) {
    console.error("Client-side update Pending Pickups Status error:", error);
    throw error;
  }
}

/**
 * Updates the Library Card number for a specific PendingPickup record.
 * @param {number} pickupId - The ID of the PendingPickup record.
 * @param {string} newLibraryCard - The new library card number.
 * @param {string} staffName - The name of the Staff commiting changes to db.
 * @returns {Promise<object>} The API response.
 */
export async function updatePickupLibraryCard(
  pickupId,
  newLibraryCard,
  staffName
) {
  if (
    !pickupId ||
    newLibraryCard === undefined ||
    newLibraryCard === null ||
    !staffName
  ) {
    throw new Error(
      "Pickup ID / Library Card number / staff Name fields are required."
    );
  }
  try {
    const response = await fetch(`/api/pickup-requests/${pickupId}/card`, {
      // Calls your new PATCH route
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newLibraryCard: String(newLibraryCard).trim(),
        staffName: String(staffName).trim(),
      }), // Send as string, server will parse
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update library card (status: ${response.status})`
      );
    }

    return responseData;
  } catch (error) {
    console.error(
      `Client-side updatePickupLibraryCard error for pickup ${pickupId}:`,
      error
    );
    throw error;
  }
}
