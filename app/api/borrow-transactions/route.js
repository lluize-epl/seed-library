// /app/api/borrow-transactions/route.js
import { NextResponse } from "next/server";
import { serverNocoFetch } from "@/lib/server/nocoService";

const BORROW_TRANSACTIONS_TABLE_ID =
  process.env.NOCO_BORROW_TRANSACTIONS_TABLE_ID;

export async function POST(request) {
  if (!BORROW_TRANSACTIONS_TABLE_ID) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  try {
    const transactionData = await request.json(); // Expects the full payload
    // { Title, TransactionDate, Status, QuantityBorrowed, UserId, SeedId, BranchId }

    if (
      !transactionData.UserId ||
      !transactionData.SeedId ||
      !transactionData.BranchId
    ) {
      return NextResponse.json(
        { error: "Missing UserId, SeedId, or BranchId for transaction." },
        { status: 400 }
      );
    }

    const payloadForNoco = {
      Title: transactionData.Title,
      TransactionDate: transactionData.TransactionDate,
      Status: transactionData.Status,
      QuantityBorrowed: transactionData.QuantityBorrowed,
      Users_id: transactionData.UserId, // NocoDB column name for User link
      Seeds_id: transactionData.SeedId, // NocoDB column name for Seed link
      branches_id: transactionData.BranchId, // NocoDB column name for Branch link
    };

    const newTransaction = await serverNocoFetch(
      BORROW_TRANSACTIONS_TABLE_ID,
      "/records",
      {
        method: "POST",
        body: payloadForNoco,
      }
    );

    if (!newTransaction || !newTransaction.Id) {
      return NextResponse.json(
        { error: "Failed to create borrow transaction record in NocoDB." },
        { status: 500 }
      );
    }

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Error in /api/borrow-transactions/ POST:", error);
    return NextResponse.json(
      { error: "Internal server error processing request." },
      { status: error.status || 500 }
    );
  }
}
