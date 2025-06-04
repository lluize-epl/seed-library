// /app/verified/page.js
"use client";
import { useState, useEffect, useCallback } from "react";
import {
  fetchPendingPickupsWithLookups,
  updatePendingPickupStatus,
} from "@/lib/noco-apis/pendingPickups";
import { createBorrowTransaction } from "@/lib/noco-apis/borrowTransactions";
import {
  fetchSeedInventoryRecord,
  updateSeedInventoryQuantity,
} from "@/lib/noco-apis/seedInventory"; // Use new fetch
import { formatDate } from "@/lib/utils";

export default function VerifiedPage() {
  const [pendingPickups, setPendingPickups] = useState([]);
  const [loading, setLoading] = useState(true); // For initial load and refresh
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null); // ID of pickup being processed

  const loadPendingPickups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPendingPickupsWithLookups();
      setPendingPickups(data || []);
    } catch (err) {
      console.error("Failed to fetch pending pickups:", err);
      setError(
        err.message || "Could not load pending requests. Please try refreshing."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingPickups();
    // Optional: set up an interval to auto-refresh
    const intervalId = setInterval(loadPendingPickups, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, [loadPendingPickups]);

  const handleDispense = async (pickup) => {
    if (
      !pickup ||
      !pickup.Id ||
      !pickup.ProcessedItems ||
      pickup.ProcessedItems.length === 0
    ) {
      setError("Invalid pickup data or no items to dispense for this request.");
      return;
    }
    if (processingId === pickup.Id) return; // Already processing this one

    const confirmDispense = window.confirm(
      `Dispense seeds for ${pickup.UserFullName} (Card: ${pickup.LibraryCard})?\nThis will update inventory and create borrow records.`
    );
    if (!confirmDispense) return;

    setProcessingId(pickup.Id);
    setError(""); // Clear previous errors
    let anyItemFailed = false;
    let errorMessages = [];

    try {
      for (const item of pickup.ProcessedItems) {
        if (item.QuantityToDispense <= 0) {
          console.log(
            `Skipping item ${item.SeedNameDisplay} as quantity to dispense is 0.`
          );
          continue;
        }

        // Step 1: Fetch the specific SeedInventory record using the new function
        const specificInventoryItem = await fetchSeedInventoryRecord(
          pickup.branches_id,
          item.OriginalSeedId
        );

        if (!specificInventoryItem) {
          throw new Error(
            `Critical Error: SeedInventory record not found for ${item.SeedNameDisplay} (Seed ID: ${item.OriginalSeedId}) at Branch ID: ${pickup.branches_id}. ` +
              `This seed may have been removed from inventory entirely after the request was made. Please check inventory manually.`
          );
        }

        if (specificInventoryItem.QuantityAtBranch < item.QuantityToDispense) {
          //! This is a critical scenario: stock is less than requested *after* user submitted.
          // For now, we'll throw an error. A more advanced UI could allow staff to adjust quantity.
          throw new Error(
            `Inventory Mismatch for ${item.SeedNameDisplay}: Requested ${item.QuantityToDispense}, ` +
              `but only ${specificInventoryItem.QuantityAtBranch} available at ${pickup.BranchId.BranchName}. ` +
              `Please adjust inventory or inform the patron.`
          );
        }

        // Step 2: Create BorrowTransaction
        await createBorrowTransaction({
          Title: `${pickup.BranchId.BranchName}-${item.SeedTypeDisplay}-${item.SeedNameDisplay}`,
          TransactionDate: new Date().toISOString().split("T")[0],
          Status: "Borrowed",
          QuantityBorrowed: item.QuantityToDispense,
          UserId: pickup.Users_id, // Users_id is the FK on PendingPickups
          SeedId: item.OriginalSeedId, // Original Seed ID
          BranchId: pickup.branches_id, // Branch ID from the main pickup record
        });

        // Step 3: Update SeedInventory
        await updateSeedInventoryQuantity(
          specificInventoryItem.Id, // This is the PK of the SeedInventory record
          specificInventoryItem.QuantityAtBranch - item.QuantityToDispense
        );
      } // End of for...of loop for items

      // Step 4: Update PendingPickup status if all items processed successfully
      await updatePendingPickupStatus(pickup.Id, "Dispensed");
      alert(`Successfully dispensed seeds for ${pickup.UserFullName}.`);
      loadPendingPickups(); // Refresh list to remove this item
    } catch (dispenseError) {
      console.error(`Error dispensing pickup ID ${pickup.Id}:`, dispenseError);
      // If any item fails, the whole pickup is considered to have an issue for now.
      // The loop stops on the first error.
      setError(
        `Failed to dispense for ${pickup.UserFullName}: ${dispenseError.message}. Some items may not have been processed. Please check records and inventory manually.`
      );
      anyItemFailed = true;
      // Optionally, set status to "Dispense-Error" to flag it in the DB
      try {
        await updatePendingPickupStatus(pickup.Id, "Dispense-Error");
        loadPendingPickups(); // Refresh to show error status
      } catch (statusUpdateError) {
        console.error(
          "Failed to update pickup status to Dispense-Error:",
          statusUpdateError
        );
        // The main error is already set.
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && pendingPickups.length === 0) {
    return (
      <div className="p-10 text-center text-xl text-gray-700">
        Loading pending seed requests...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 font-geist-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-green-dark">
          Staff: Pending Seed Pickups
        </h1>
        <button
          onClick={loadPendingPickups}
          disabled={loading}
          className="py-2 px-4 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center transition duration-150 ease-in-out"
        >
          <svg
            className={`w-5 h-5 mr-2 ${
              loading && !processingId ? "animate-spin" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M9 15h4.581"
            />
          </svg>
          {loading && !processingId ? "Refreshing..." : "Refresh List"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg text-center shadow">
          {error}
        </div>
      )}

      {pendingPickups.length === 0 && !loading && !error && (
        <div className="text-center py-10">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xl text-gray-600 mt-4">
            No pending seed pickups at the moment.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pendingPickups.map((pickup) => (
          <div
            key={pickup.Id}
            className={`bg-white p-5 rounded-xl shadow-xl border-l-4 ${
              pickup.Status === "Dispense-Error"
                ? "border-red-500"
                : "border-blue-500"
            } flex flex-col justify-between transition-shadow hover:shadow-2xl`}
          >
            <div>
              <div className="mb-3">
                <h2
                  className="text-xl font-semibold text-green-700 truncate"
                  title={pickup.UserFullName}
                >
                  {pickup.UserFullName}
                </h2>
                <p className="text-xs text-gray-500">
                  Card: {pickup.LibraryCard}
                </p>
                <p className="text-xs text-gray-500">
                  Requested: {formatDate(pickup.RequestTimestamp)} at{" "}
                  {pickup.BranchId?.BranchName || "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      pickup.Status === "Pending"
                        ? "text-yellow-600"
                        : pickup.Status === "Dispense-Error"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {pickup.Status}
                  </span>
                </p>
                {pickup.Title && (
                  <p className="text-xs text-gray-500 mt-1">
                    Note/Title: {pickup.Title}
                  </p>
                )}
              </div>

              <h3 className="text-sm font-medium text-gray-800 mb-1 border-t border-gray-200 pt-2">
                Items to Dispense:
              </h3>
              {pickup.ProcessedItems && pickup.ProcessedItems.length > 0 ? (
                <ul className="space-y-1 text-sm mb-4 max-h-32 overflow-y-auto pr-2">
                  {pickup.ProcessedItems.map((item, index) => (
                    <li
                      key={`${item.OriginalSeedId}-${index}-${pickup.Id}`}
                      className="text-gray-700 flex justify-between"
                    >
                      <span>
                        {item.QuantityToDispense}x {item.SeedNameDisplay}{" "}
                        <span className="text-xs text-gray-500">
                          ({item.SeedTypeDisplay})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  No items listed for this request (data issue?).
                </p>
              )}
            </div>

            <button
              onClick={() => handleDispense(pickup)}
              disabled={
                (loading && processingId === pickup.Id) ||
                pickup.Status !== "Pending"
              }
              className="w-full mt-auto py-2.5 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out"
            >
              {loading && processingId === pickup.Id
                ? "Processing..."
                : "Dispense & Finalize"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
