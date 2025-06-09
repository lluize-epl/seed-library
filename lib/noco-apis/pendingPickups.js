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
  if (!PENDING_PICKUPS_TABLE_ID || !PENDING_PICKUP_ITEMS_TABLE_ID) {
    throw new Error("Pending Pickup or Items Table ID not configured.");
  }
  // 1. Create the parent PendingPickups record
  const parentPickupPayload = {
    // Fields directly on PendingPickups table:
    LibraryCard: pickupData.LibraryCard,
    UserFullName: pickupData.UserFullName,
    RequestTimestamp:
      pickupData.RequestTimestamp || new Date().toISOString().split("T")[0],
    Status: pickupData.Status || "Pending",
    Users_id: pickupData.UserId, // The ID of the User
    branches_id: pickupData.BranchId, // The ID of the Branch
    Title: `${pickupData.UserFullName} - ${new Date().toLocaleDateString()}`,
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

  // Prepare array of item payloads for batch creation
  const itemPayloadsForBatch = itemsData.map((item) => {
    if (item.SeedInventoryId === undefined || item.SeedInventoryId === null) {
      // This should not happen if the borrow page sends it correctly
      throw new Error(
        `Critical: SeedInventoryId missing for item ${item.SeedName} in pickup request.`
      );
    }
    return {
      QuantityToDispense: item.QuantityToDispense,
      PendingPickups_id: newParentPickupId,
      Seeds_id: item.SeedId,
      SeedInventoryId: item.SeedInventoryId, // NEW: Store the SeedInventoryId
    };
  });

  // Batch create PendingPickupItems
  if (itemPayloadsForBatch.length > 0) {
    try {
      // NocoDB's POST to /records (plural) accepts an array for batch creation
      await nocoFetch(PENDING_PICKUP_ITEMS_TABLE_ID, "/records", {
        method: "POST",
        body: itemPayloadsForBatch, // Send the array of item objects
      });
    } catch (itemError) {
      console.error("Error batch creating pending pickup items:", itemError);

      throw new Error(
        `Parent pickup (ID: ${newParentPickupId}) created, but failed to create items. Error: ${itemError.message}`
      );
    }
  }

  return { ...parentPickup, Id: newParentPickupId };
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
        const seedInventoryIdForItem =
          pickup.SeedInventoryIds && pickup.SeedInventoryIds[i] !== undefined
            ? pickup.SeedInventoryIds[i]
            : null;
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
          SeedInventoryId: seedInventoryIdForItem,
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
  if (!PENDING_PICKUPS_TABLE_ID) {
    throw new Error("Pending Pickups Table ID not configured.");
  }
  return nocoFetch(PENDING_PICKUPS_TABLE_ID, `/records`, {
    // NocoDB uses PATCH on /records with body containing Id for bulk-like update of one
    method: "PATCH",
    body: { Id: pickupId, Status: newStatus },
  });
}
