import { nocoFetch } from "./noco-records";

// --- BorrowTransaction Table Functions ---

export async function fetchUserBorrowHistory(userId, limit = 30) {
  // we dont need this function since fetching the user brings up all borrowTransaction Table relations.
  return;
}

export async function createBorrowTransaction(transactionData) {
  try {
    const response = await fetch("/api/borrow-transactions", {
      // Calls new POST route
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transactionData),
    });
    // ... (error handling and JSON parsing) ...
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Failed to create borrow transaction");
    return data;
  } catch (error) {
    console.error("Client-side create borrow transaction error:", error);
    throw error;
  }
}
