import { nocoFetch } from "./noco-records";
const NOCO_SEED_INVENTORY_TABLE_ID = process.env.NOCO_SEED_INVENTORY_TABLE_ID;
const NOCO_SEEDS_TABLE_ID = process.env.NOCO_SEEDS_TABLE_ID;

/**
 * Fetches enriched seed inventory (including seed name/type) for a specific branch
 * via the internal API route.
 * @param {number|string} branchId - The ID of the branch.
 * @returns {Promise<Array<object>>} Array of objects:
 *   [{ inventoryId, seedId, seedName, seedType, quantity }, ...]
 */
export async function fetchEnrichedInventoryForBranch(branchId) {
  if (!branchId) {
    console.warn("fetchEnrichedInventoryForBranch called without branchId");
    return [];
  }
  try {
    const response = await fetch(
      `/api/inventory/by-branch?branchId=${branchId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          `Failed to fetch enriched inventory for branch (status: ${response.status})`
      );
    }

    return responseData; // This should be the array of enriched inventory items
  } catch (error) {
    console.error("Client-side fetchEnrichedInventoryForBranch error:", error);
    throw error;
  }
}

/**
 * Updates multiple SeedInventory records via the internal API route.
 * @param {Array<{Id: number, QuantityAtBranch: number}>} inventoryUpdates
 */
export async function batchUpdateSeedInventory(inventoryUpdates) {
  if (!inventoryUpdates || inventoryUpdates.length === 0) {
    console.warn("Client: batchUpdateSeedInventory called with no updates.");
    return null; // Or resolve promise with null/success
  }

  try {
    const response = await fetch("/api/seed-inventory/batch-update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inventoryUpdates),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          `Failed to batch update inventory (status: ${response.status})`
      );
    }

    return responseData; // Contains { message, data (NocoDB response) }
  } catch (error) {
    console.error("Client-side batchUpdateSeedInventory error:", error);
    throw error;
  }
}

export async function updateSeedInventoryQuantity(
  seedInventoryId,
  newQuantity
) {
  if (newQuantity < 0) {
    throw new Error("Quantity cannot be negative.");
  }
  return batchUpdateSeedInventory([
    { Id: seedInventoryId, QuantityAtBranch: newQuantity },
  ]);
}

export async function createSeedInventoryRecord(inventoryData) {
  /*
  {
  "Title": "test",
  "QuantityAtBranch": 1,
  "branches_id": 1,
  "Seeds_id": 8
  }
  */

  const tableId = process.env.NEXT_PUBLIC_NOCO_SEED_INVENTORY_TABLE_ID;
  if (!tableId) throw new Error("Seed Inventory Table ID not set.");
  return nocoFetch(tableId, "/records", {
    method: "POST",
    body: inventoryData,
  });
}

export async function fetchSingleSeedInventoryById(seedInventoryRecordId) {
  try {
    const response = await fetch(
      `/api/seed-inventory/${seedInventoryRecordId}`
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || "Failed to fetch single seed inventory item"
      );
    return data;
  } catch (error) {
    console.error(
      "Client-side fetching single seed Inventory ID error:",
      error
    );
    throw error;
  }
}

/**
 * Fetches a specific SeedInventory record by Branch ID and Seed ID.
 * Assumes there's only one inventory record per seed per branch.
 * @param {number} branchId - The ID of the branch.
 * @param {number} seedId - The ID of the seed.
 * @returns {Promise<object|null>} The SeedInventory record or null if not found.
 * Record includes: { Id (SeedInventory PK), Seeds_id, branches_id, QuantityAtBranch, ... }
 */
export async function fetchSeedInventoryRecord(branchId, seedId) {
  const inventoryTableId = process.env.NEXT_PUBLIC_NOCO_SEED_INVENTORY_TABLE_ID;
  if (!inventoryTableId) throw new Error("Seed Inventory Table ID not set.");
  if (!branchId || !seedId) {
    console.warn("fetchSeedInventoryRecord: branchId or seedId is missing.");
    return null;
  }

  const branchLinkFieldName = "branches_id";
  const seedLinkFieldName = "Seeds_id";

  const queryParams = `?where=(${branchLinkFieldName},eq,${branchId})~and(${seedLinkFieldName},eq,${seedId})&limit=1`;

  console.log(`Fetching SeedInventory with query: ${queryParams}`);
  const data = await nocoFetch(
    inventoryTableId,
    "/records",
    { method: "GET" },
    queryParams
  );

  if (data && data.list && data.list.length > 0) {
    return data.list[0];
  }
  return null; // Not found
}
