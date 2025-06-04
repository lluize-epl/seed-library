/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - The date string to format (e.g., "2023-10-27 10:00:00").
 * @returns {string} Formatted date string or "N/A".
 */
export function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    // Assuming dateString might include time, take only the date part for consistent parsing
    const datePart = dateString.split(" ")[0];
    return new Date(datePart).toLocaleDateString(undefined, {
      // undefined uses user's locale
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    console.warn("Failed to format date:", dateString, e);
    return dateString.split(" ")[0]; // Fallback to original date part if parsing fails
  }
}

/**
 * Checks if a date string represents a date that is in the past.
 * Compares against the beginning of today.
 * @param {string} dateString - The date string to check.
 * @returns {boolean} True if the date is in the past, false otherwise or if invalid.
 */
export function isDateExpired(dateString) {
  if (!dateString) return true; // Consider an empty/invalid date as expired for safety
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today for accurate comparison
    const checkDate = new Date(dateString.split(" ")[0]);
    checkDate.setHours(0, 0, 0, 0); // Ensure we compare date part only
    return checkDate < today;
  } catch (e) {
    console.warn("Failed to parse date for expiration check:", dateString, e);
    return true; // Treat parse errors as expired
  }
}

/**
 * Formats a phone number string into XXX-XXX-XXXX format.
 * Accepts 10 digits with or without hyphens.
 * Returns null if the input cannot be reasonably formatted.
 * @param {string} phoneNumberString - The phone number to format.
 * @returns {string|null} Formatted phone number or null.
 */
export function formatPhoneNumber(phoneNumberString) {
  if (!phoneNumberString) return null;
  const cleaned = phoneNumberString.replace(/\D/g, ""); // Remove all non-digits

  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(
      3,
      6
    )}-${cleaned.substring(6, 10)}`;
  }
  // Optional: if you want to be more strict and only allow XXX-XXX-XXXX or XXXXXXXXXX initially
  // you might add more checks before cleaning. For now, this is robust for formatting.
  return null; // Or return original if you prefer, but null indicates formatting failed
}

/**
 * Validates if a phone number string consists of exactly 10 digits.
 * @param {string} phoneNumberString - The phone number to validate.
 * @returns {boolean} True if it's 10 digits, false otherwise.
 */
export function isValidPhoneNumberLength(phoneNumberString) {
  if (!phoneNumberString) return false;
  const cleaned = phoneNumberString.replace(/\D/g, "");
  return cleaned.length === 10;
}

/**
 * Processes the lookup fields from the User object to create a structured list of borrow transactions.
 * Assumes all provided arrays (seedLookups, quantities, branchLookups, dates) are of the same length
 * and correspond to each other element-wise.
 * @param {Array<{Id: number, SeedType: string}>} seedLookups - Array from User.SeedId lookup.
 * @param {Array<number>} quantities - Array from User.QuantityBorrowed lookup.
 * @param {Array<{Id: number, BranchName: string}>} branchLookups - Array from User.branchId lookup.
 * @param {Array<string>} dates - Array from User.TransactionDates lookup.
 * @param {Array<string>} [statuses] - Optional: Array from User.TransactionStatuses lookup.
 * @returns {Array<Object>} An array of transaction-like objects.
 * Example: [{ seedId, seedType, quantity, branchId, branchName, date, status (if provided) }]
 */
export function processUserBorrowedData(
  seedsBorrowedLookups = [], // from User.SeedsBorrowed: [{Id, SeedType}, ...]
  quantitiesLookups = [], // from User.QuantityBorrowed: [1, 1, ...]
  branchesBorrowedLookups = [], // from User.BranchesBorrowed: [{Id, BranchName}, ...]
  datesLookups = [] // from User.TransactionDates: ["YYYY-MM-DD", ...]
  // Optional: add statusesLookups = [] if you get a status array
) {
  const processedTransactions = [];
  const numTransactions = seedsBorrowedLookups.length; // Use one array's length as the reference

  // Basic validation for array lengths
  if (
    quantitiesLookups.length !== numTransactions ||
    branchesBorrowedLookups.length !== numTransactions ||
    datesLookups.length !== numTransactions /* || 
    (statusesLookups.length > 0 && statusesLookups.length !== numTransactions) */
  ) {
    console.warn(
      "User borrowed data arrays (SeedsBorrowed, QuantityBorrowed, BranchesBorrowed, TransactionDates) have mismatched lengths. Processing might be incomplete."
    );
  }
  // Decide how to handle: return empty, throw error, or process up to shortest length.
  // For now, let's process up to the shortest of the primary data arrays.
  const minLength = Math.min(
    seedsBorrowedLookups.length,
    quantitiesLookups.length,
    branchesBorrowedLookups.length,
    datesLookups.length
  );
  // If any critical array is empty, and others are not, it's a problem.
  // However, if all are empty, that's fine (no transactions).
  if (minLength === 0 && numTransactions > 0) {
    console.error("Critical data missing for processing user borrowed data.");
    return [];
  }

  for (let i = 0; i < minLength; i++) {
    // Iterate up to the shortest reliable length
    if (
      !seedsBorrowedLookups[i] ||
      quantitiesLookups[i] === undefined ||
      !branchesBorrowedLookups[i] ||
      !datesLookups[i]
    ) {
      console.warn(
        `Skipping transaction at index ${i} due to missing data elements.`
      );
      continue;
    }
    processedTransactions.push({
      // Use the fields exactly as they appear in your User object's lookup arrays
      seedId: seedsBorrowedLookups[i].Id,
      seedType: seedsBorrowedLookups[i].SeedType, // Or SeedName if the lookup provides it
      // If SeedsBorrowed provides more details like SeedName, include them
      seedName:
        seedsBorrowedLookups[i].SeedName ||
        `Type: ${seedsBorrowedLookups[i].SeedType}`,
      quantity: quantitiesLookups[i],
      branchId: branchesBorrowedLookups[i].Id,
      branchName: branchesBorrowedLookups[i].BranchName,
      date: datesLookups[i],
      // status: statusesLookups.length > 0 ? statusesLookups[i] : "Unknown",
    });
  }
  return processedTransactions;
}

/**
 * Counts how many seeds were borrowed by a user in the last 30 days from processed transaction data.
 * @param {Array<Object>} processedTransactions - Output from processUserBorrowedData.
 * @returns {number} Count of seeds borrowed in the last 30 days.
 */
export function countRecentBorrows(processedTransactions = []) {
  let count = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  processedTransactions.forEach((tx) => {
    const transactionDate = new Date(tx.date);
    if (transactionDate >= thirtyDaysAgo) {
      count += tx.quantity; // Assuming quantity reflects # of seed packets
    }
  });
  return count;
}

/**
 * Gets IDs of seeds considered "actively held" (e.g., status is "Borrowed").
 * If status is not available, it might return all unique seed IDs from the processed transactions.
 * @param {Array<Object>} processedTransactions - Output from processUserBorrowedData.
 * @returns {Array<number>} Array of unique, actively held seed IDs.
 */
export function getActivelyHeldSeedIds(processedTransactions = []) {
  return Array.from(new Set(processedTransactions.map((tx) => tx.seedId)));
}
