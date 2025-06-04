import { nocoFetch } from "./noco-records";

// --- BorrowTransaction Table Functions ---

export async function fetchUserBorrowHistory(userId, limit = 30) {
  // we dont need this function since fetching the user brings up all borrowTransaction Table relations.
  return;
}

export async function createBorrowTransaction(transactionData) {
  /* transaction data:
  {
    "Title": "Main-Basil",
    "TransactionDate": "2025-05-30",
    "Status": "Borrowed",
    "QuantityBorrowed": 1,
    "UserId":1,
    "SeedId": 1,
    "BranchId": 1
  }
    We need to make sure that "Title" value is "[BranchName]-[SeedType]" */
  const borrowTableId =
    process.env.NEXT_PUBLIC_NOCO_BORROW_TRANSACTIONS_TABLE_ID;
  if (!borrowTableId) throw new Error("Borrow Transactions Table ID not set.");

  const newTransaction = await nocoFetch(borrowTableId, "/records", {
    method: "POST",
    body: transactionData,
  });

  return newTransaction; // returns { "Id": xx } id of new BorrowTransaction.
}
