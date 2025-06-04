import { nocoFetch } from "./noco-records";

// --- M2M Link Management Functions ---
/**
 * Updates a Many-to-Many link for a record.
 * This typically replaces all existing links for that M2M relationship.
 * @param {string} sourceTableId - The ID of the table containing the record to link from.
 * @param {string} sourceRecordId - The ID of the record to link from.
 * @param {string} linkColumnId - The ID of the M2M Link Column on the source table.
 * @param {Array<number|string>} targetRecordIds - An array of IDs of records from the target table to link.
 */
export async function updateRecordLink(
  sourceTableId,
  sourceRecordId,
  linkColumnId,
  targetRecordIds
) {
  if (!sourceTableId || !sourceRecordId || !linkColumnId) {
    throw new Error(
      "Missing IDs for M2M link update (sourceTableId, sourceRecordId, or linkColumnId)."
    );
  }

  const path = `/links/${linkColumnId}/records/${sourceRecordId}`;
  let body;
  if (Array.isArray(targetRecordIds)) {
    body = targetRecordIds.map((id) => ({ Id: id })); // NocoDB expects array of objects with "Id" key
  } else {
    body = [{ Id: targetRecordIds }];
  }

  return nocoFetch(sourceTableId, path, {
    method: "POST", // NocoDB uses POST to set/replace M2M links via this endpoint
    body: body,
  });
}

// Example usage for updating User's Currently Borrowed Seeds:
// await updateM2MLink(
//   process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID,
//   userId,
//   process.env.NEXT_PUBLIC_NOCO_CURRENTLY_BORROWED_LINK_USERS_ID,
//   arrayOfSelectedSeedIds
// );

// Example usage for updating User's Interests:
// await updateM2MLink(
//   process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID,
//   newlyCreatedUserId,
//   process.env.NEXT_PUBLIC_NOCO_USER_INTERESTS_LINK_USERS_ID,
//   arrayOfSelectedInterestIds
// );
