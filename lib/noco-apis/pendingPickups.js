import { nocoFetch } from "./noco-records";

const PENDING_PICKUPS_TABLE_ID =
  process.env.NEXT_PUBLIC_NOCO_PENDING_PICKUPS_TABLE_ID;
const PENDING_PICKUP_ITEMS_TABLE_ID =
  process.env.NEXT_PUBLIC_NOCO_PENDING_PICKUPS_ITEMS_TABLE_ID;

/**
 * Creates a new pending pickup request (parent record and its items).
 * @param {object} pickupData - Data for the PendingPickups table.
 * @param {Array<object>} itemsData - Array of items for PendingPickupItems table.
 */
export async function createPendingPickupRequest(pickupData, itemsData) {
  // 1. Create the parent PendingPickups record

  const parentPickupPayload = {
    // Fields directly on PendingPickups table:
    LibraryCard: pickupData.LibraryCard,
    UserFullName: pickupData.UserFullName,
    RequestTimestamp:
      pickupData.RequestTimestamp || new Date().toISOString().split("T")[0],
    Status: pickupData.Status || "Pending",
    // Linking columns (assuming these are the names in NocoDB that accept raw IDs):
    Users_id: pickupData.UserId, // The ID of the User
    branches_id: pickupData.BranchId, // The ID of the Branch
  };

  const parentPickup = await nocoFetch(PENDING_PICKUPS_TABLE_ID, "/records", {
    method: "POST",
    body: parentPickupPayload,
  });

  if (!parentPickup || !parentPickup.Id) {
    throw new Error(
      "Failed to create parent pending pickup record. API RESPONSE: ",
      +JSON.stringify(parentPickup)
    );
  }
  const newParentPickupId = parentPickup.Id;

  // 2. Create child PendingPickupItems records
  const itemCreationPromises = itemsData.map((item) => {
    const itemPayload = {
      QuantityToDispense: item.QuantityToDispense,
      PendingPickups_id: newParentPickupId, // The ID of the parent PendingPickup record
      Seeds_id: item.SeedId, // The ID of the Seed
    };
    return nocoFetch(PENDING_PICKUP_ITEMS_TABLE_ID, "/records", {
      method: "POST",
      body: itemPayload,
    });
  });
  try {
    await Promise.all(itemCreationPromises);
  } catch (itemError) {
    console.error(
      "Error creating one or more pending pickup items:",
      itemError
    );
    throw new Error(
      `Parent pickup created (ID: ${newParentPickupId}), but failed to create all items. Please check system logs. Error: ${itemError.message}`
    );
  }
  return parentPickup;
}

export async function fetchPendingPickupsWithLookups() {
  if (!PENDING_PICKUPS_TABLE_ID) {
    throw new Error("Pending Pickups Table ID not configured.");
  }

  const queryParams = `?where=(Status,eq,Pending)&sort=-CreatedAt&limit=50`;

  const data = await nocoFetch(
    PENDING_PICKUPS_TABLE_ID,
    "/records",
    { method: "GET" },
    queryParams
  );

  if (data && data.list) {
    return data.list.map((pickup) => {
      const items = [];
      // Assuming all lookup arrays (SeedName, SeedId, QuantityDispensed) have the same length
      // and correspond to each other by index.
      const itemCount = pickup.SeedName ? pickup.SeedName.length : 0;
      for (let i = 0; i < itemCount; i++) {
        // Safety checks for potentially missing data at an index
        const seedIdData =
          pickup.SeedId && pickup.SeedId[i]
            ? pickup.SeedId[i]
            : { Id: null, SeedType: "Unknown" };
        items.push({
          // These are properties of each *item* in the pickup
          OriginalSeedId: seedIdData.Id, // The actual Seeds.Id
          SeedNameDisplay: pickup.SeedName[i] || "Unknown Seed",
          SeedTypeDisplay: seedIdData.SeedType,
          QuantityToDispense:
            pickup.QuantityDispensed &&
            pickup.QuantityDispensed[i] !== undefined
              ? pickup.QuantityDispensed[i]
              : 0,
          // We might need more info for dispense, e.g., which SeedInventory record to update.
          // If PendingPickupItems had a lookup to SeedInventory.Id, that would be ideal here.
          // Or if PendingPickupItems itself stored the SeedInventory_id it was 'reserved' from.
        });
      }
      return {
        ...pickup, // Spread all original pickup fields (Id, UserFullName, LibraryCard, etc.)
        ProcessedItems: items, // Add our newly structured items array
      };
    });
  }
  return [];
}

/**
 * Updates the status of a PendingPickup record.
 * @param {number} pickupId - The ID of the PendingPickup to update.
 * @param {string} newStatus - The new status (e.g., "Dispensed", "Cancelled").
 */
export async function updatePendingPickupStatus(pickupId, newStatus) {
  if (!PENDING_PICKUPS_TABLE_ID) {
    throw new Error("Pending Pickups Table ID not configured.");
  }
  return nocoFetch(PENDING_PICKUPS_TABLE_ID, `/records`, {
    // NocoDB uses PATCH on /records with body containing Id for bulk-like update of one
    method: "PATCH",
    body: { Id: pickupId, Status: newStatus },
  });
}
