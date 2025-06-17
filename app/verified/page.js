// /app/verified/page.js
"use client";
import { useState, useEffect, useCallback } from "react";

import {
  fetchPendingPickupsWithLookups,
  updatePendingPickupStatus,
} from "@/lib/noco-apis/pendingPickups";
import { createBorrowTransaction } from "@/lib/noco-apis/borrowTransactions"; // Assuming this handles linking correctly
import {
  fetchSingleSeedInventoryById, // NEW
  batchUpdateSeedInventory,
  fetchEnrichedInventoryForBranch, // For restocking on cancel
} from "@/lib/noco-apis/seedInventory";
import { fetchAllBranches } from "@/lib/noco-apis/branches";
import { updateUserStatus } from "@/lib/noco-apis/users"; // For updating user status
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

// Define your hold time limit in days
const HOLD_TIME_LIMIT_DAYS = 2;

export default function VerifiedPage() {
  const [pendingPickups, setPendingPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState(""); // For errors specific to dispense/cancel actions
  const [processingId, setProcessingId] = useState(null);
  const [allBranches, setAllBranches] = useState([]); // For the dropdown
  const [sidebarSelectedBranchId, setSidebarSelectedBranchId] = useState("");
  const [sidebarBranchInventory, setSidebarBranchInventory] = useState([]);
  const [sidebarInventoryLoading, setSidebarInventoryLoading] = useState(false);
  const [sidebarInventoryError, setSidebarInventoryError] = useState("");

  const loadPendingPickups = useCallback(async () => {
    if (!loading) setLoading(true); // Set loading true only if not already loading by another process
    setActionError(""); // Clear action-specific errors on refresh
    try {
      const data = await fetchPendingPickupsWithLookups();
      setPendingPickups(data || []);
    } catch (err) {
      console.error("Failed to fetch pending pickups:", err);
      setError(
        err.message || "Could not load pending requests. Please try refreshing."
      );
    } finally {
      if (processingId === null) setLoading(false); // Only stop general loading if not an action
    }
  }, [loading, processingId]); // Add processingId to dependencies if needed

  useEffect(() => {
    loadPendingPickups();
    const intervalId = setInterval(loadPendingPickups, 30000);
    return () => clearInterval(intervalId);
  }, []); // Load once on mount, interval handles refresh. useCallback will give stable func.

  // --- NEW: Fetch all branches for the sidebar dropdown ---
  useEffect(() => {
    async function loadAllBranchesForSidebar() {
      try {
        const branchesData = await fetchAllBranches(); // This should be proxied

        setAllBranches(branchesData || []);
      } catch (err) {
        console.error(
          "VerifiedPage: Failed to fetch branches for sidebar",
          err
        );
        // Optionally set an error state specific to the sidebar branch dropdown
      }
    }
    loadAllBranchesForSidebar();
  }, []);

  // --- NEW: Function to fetch inventory for the selected branch in the sidebar ---
  const loadSidebarInventory = async (branchId) => {
    if (!branchId) {
      setSidebarBranchInventory([]);
      setSidebarSelectedBranchId("");
      setSidebarInventoryError("");
      return;
    }
    setSidebarSelectedBranchId(branchId);
    setSidebarInventoryLoading(true);
    setSidebarInventoryError("");
    setSidebarBranchInventory([]);
    try {
      const enrichedInventory = await fetchEnrichedInventoryForBranch(branchId);

      if (enrichedInventory && enrichedInventory.length > 0) {
        const sortedInventory = enrichedInventory.sort((a, b) =>
          (a.seedName || "").localeCompare(b.seedName || "")
        );
        setSidebarBranchInventory(sortedInventory);
      } else {
        setSidebarBranchInventory([]);
        if (!enrichedInventory) {
          setSidebarInventoryError(
            "Failed to retrieve inventory data structure."
          );
        } else {
          setSidebarInventoryError(
            "No seeds currently in inventory for this branch, or all have zero quantity."
          );
        }
      }
    } catch (err) {
      console.error(
        "VerifiedPage: Failed to fetch sidebar inventory for branch " +
          branchId,
        err
      );
      setSidebarInventoryError(
        err.message || "Could not load inventory for this branch."
      );
    } finally {
      setSidebarInventoryLoading(false);
    }
  };

  const handleDispense = async (pickup) => {
    if (
      !pickup ||
      !pickup.Id ||
      !pickup.ProcessedItems ||
      pickup.ProcessedItems.length === 0
    ) {
      setActionError("Invalid pickup data for dispensing.");
      toast.error("Invalid Pickup data for dispensing");
      return;
    }
    if (processingId) return;

    toast(
      (t) => (
        <div className="flex flex-col items-center p-2">
          <p className="text-sm font-medium text-gray-900 mb-2 text-center">
            Dispense seeds for{" "}
            <strong className="font-semibold">{pickup.UserFullName}</strong>{" "}
            (Card: {pickup.LibraryCard})?
          </p>
          <p className="text-xs text-gray-600 mb-3 text-center">
            This will update inventory and create borrow records.
          </p>
          <div className="w-full flex justify-center gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                proceedWithDispense(pickup); // Call actual dispense logic
              }}
              className="w-full rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Confirm Dispense
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity, // Keep open until dismissed
        position: "top-center",
        style: {
          border: "1px solid #4B5563", // gray-600
          padding: "12px",
          color: "#1F2937", // gray-800
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        },
      }
    );
  };

  const proceedWithDispense = async (pickup) => {
    setProcessingId(pickup.Id);
    setActionError("");
    let allItemsSuccessfullyProcessed = true;
    const loadingToastId = toast.loading(
      `Processing dispense for ${pickup.UserFullName}...`
    );

    try {
      for (const item of pickup.ProcessedItems) {
        if (item.QuantityToDispense <= 0) continue;
        if (!item.SeedInventoryId) {
          throw new Error(
            `Missing SeedInventoryId for item ${item.SeedNameDisplay}. Cannot process.`
          );
        }

        // 1. Fetch current inventory state for this specific item to verify quantity
        const currentInventory = await fetchSingleSeedInventoryById(
          item.SeedInventoryId
        );
        if (!currentInventory) {
          throw new Error(
            `Inventory record (ID: ${item.SeedInventoryId}) for ${item.SeedNameDisplay} not found.`
          );
        }
        if (currentInventory.QuantityAtBranch < item.QuantityToDispense) {
          throw new Error(
            `Inventory Mismatch for ${item.SeedNameDisplay}: Requested ${item.QuantityToDispense}, ` +
              `but only ${currentInventory.QuantityAtBranch} available. Please adjust inventory or cancel the request.`
          );
        }

        // 2. Create BorrowTransaction
        await createBorrowTransaction({
          Title: `${pickup.BranchId.BranchName}-${item.SeedTypeDisplay}-${item.SeedNameDisplay}`,
          TransactionDate: new Date().toISOString().split("T")[0],
          Status: "Borrowed",
          QuantityBorrowed: item.QuantityToDispense,
          UserId: pickup.Users_id,
          SeedId: item.OriginalSeedId,
          BranchId: pickup.branches_id,
        });
      }

      // 3. Update User Status if they were "New"
      if (allItemsSuccessfullyProcessed) {
        const userObjectFromLookup = pickup.UserId;
        const userCurrentDBStatus =
          userObjectFromLookup?.Status || pickup.UserStatus || "Unknown";

        if (userCurrentDBStatus === "New") {
          await updateUserStatus(pickup.Users_id, "Validated");
        }
        await updatePendingPickupStatus(pickup.Id, "Dispensed");

        toast.success(
          `Successfully dispensed seeds for ${
            pickup.UserFullName
          }. User status ${
            userCurrentDBStatus === "New" ? "updated." : "checked."
          }`,
          { id: loadingToastId }
        );
      } else {
        if (!actionError)
          setActionError("Some items could not be processed during dispense.");
      }
    } catch (dispenseError) {
      console.error(`Error dispensing pickup ID ${pickup.Id}:`, dispenseError);
      const errorMessage = `Dispense Error for ${pickup.UserFullName}: ${dispenseError.message}. Check logs.`;
      setActionError(errorMessage);
      toast.error(errorMessage, { id: loadingToastId, duration: 5000 });
      allItemsSuccessfullyProcessed = false;
      try {
        await updatePendingPickupStatus(pickup.Id, "Dispense-Error");
      } catch (e) {
        console.error("Failed to set Dispense-Error", e);
      }
    } finally {
      setProcessingId(null);
      if (allItemsSuccessfullyProcessed)
        loadPendingPickups(); // Refresh list only on full success or to show error status
      else if (!allItemsSuccessfullyProcessed && error) loadPendingPickups(); // Also refresh if an error was set to show "Dispense-Error" status
    }
  };

  const handleCancelRequest = async (pickup) => {
    if (
      !pickup ||
      !pickup.Id ||
      !pickup.ProcessedItems ||
      pickup.ProcessedItems.length === 0
    ) {
      setActionError("Invalid pickup data for cancellation.");
      toast.error("Invalid pickup data for cancellation.");
      return;
    }
    if (processingId) return;

    toast(
      (t) => (
        <div className="flex flex-col items-center p-2">
          <p className="text-sm font-medium text-gray-900 mb-2 text-center">
            Cancel request for{" "}
            <strong className="font-semibold">{pickup.UserFullName}</strong> and
            restock seeds?
          </p>
          <div className="w-full flex justify-center gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                proceedWithCancel(pickup);
              }}
              className="w-full rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Confirm Cancel
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Keep Request
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        style: {
          border: "1px solid #4B5563", // gray-600
          padding: "12px",
          color: "#1F2937", // gray-800
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        },
      }
    );
  };

  const proceedWithCancel = async (pickup) => {
    setProcessingId(pickup.Id);
    setActionError("");
    const loadingToastId = toast.loading(
      `Cancelling request for ${pickup.UserFullName}...`
    );
    let allItemsSuccessfullyRestocked = true;
    const inventoryRestockPayloads = [];

    try {
      for (const item of pickup.ProcessedItems) {
        if (item.QuantityToDispense <= 0) continue;
        if (!item.SeedInventoryId) {
          throw new Error(
            `Missing SeedInventoryId for item ${item.SeedNameDisplay}. Cannot restock.`
          );
        }

        const currentInventory = await fetchSingleSeedInventoryById(
          item.SeedInventoryId
        );
        if (!currentInventory) {
          // This is odd, means inventory record was deleted after hold. Log and perhaps skip.
          console.error(
            `Cannot restock: SeedInventory record (ID: ${item.SeedInventoryId}) for ${item.SeedNameDisplay} not found.`
          );
          // Don't add to restock payload if we can't confirm current stock, or assume 0 and add.
          // For safety, let's skip restocking this item if its inventory record is gone.
          // Or, if policy is to assume it was 0 and add back, then currentInventory.QuantityAtBranch = 0;
          errorMessages.push(
            `Could not find inventory record for ${item.SeedNameDisplay} to restock.`
          );
          allItemsSuccessfullyRestocked = false;
          continue;
        }

        inventoryRestockPayloads.push({
          Id: item.SeedInventoryId,
          QuantityAtBranch:
            currentInventory.QuantityAtBranch + item.QuantityToDispense,
        });
      }

      if (inventoryRestockPayloads.length > 0) {
        await batchUpdateSeedInventory(inventoryRestockPayloads);
      } else if (
        pickup.ProcessedItems.filter((i) => i.QuantityToDispense > 0).length >
          0 &&
        !allItemsSuccessfullyRestocked
      ) {
        // Some items had quantity but couldn't be prepared for restocking (e.g. inventory record missing)
        throw new Error(
          "Could not prepare any items for restocking due to missing inventory data."
        );
      }

      await updatePendingPickupStatus(pickup.Id, "Cancelled");
      toast.success(
        `Request for ${pickup.UserFullName} cancelled and seeds restocked.`,
        { id: loadingToastId }
      );
    } catch (cancelError) {
      console.error(`Error cancelling request ID ${pickup.Id}:`, cancelError);
      const errorMessage = `Cancellation Error for ${pickup.UserFullName}: ${cancelError.message}. Inventory may not be fully restocked.`;
      setActionError(errorMessage);
      toast.error(errorMessage, { id: loadingToastId, duration: 5000 });
      allItemsSuccessfullyRestocked = false;
      try {
        await updatePendingPickupStatus(pickup.Id, "Cancel-Error");
      } catch (e) {
        console.error("Failed to set Cancel-Error", e);
      }
    } finally {
      setProcessingId(null);
      loadPendingPickups();
    }
  };

  // --- JSX ---
  return (
    <div className="flex mx-auto p-4 md:p-8 font-geist-sans">
      <div className="flex-grow p-4 md:p-6 lg:p-8 md:order-1 overflow-y-auto w-full md:w-2/3 lg:w-3/4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-green-dark">
            Staff: Seed Pickup Queue
          </h1>
          <button
            onClick={loadPendingPickups}
            disabled={loading && !processingId} // Disable if generally loading, but not if an action is processing
            className="w-full sm:w-auto py-2 px-5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition duration-150 ease-in-out text-sm md:text-base"
          >
            <svg
              className={`w-4 h-4 md:w-5 md:h-5 mr-2 ${
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
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {actionError && (
          <div className="mb-6 p-4 bg-orange-100 text-orange-700 rounded-lg">
            {actionError}
          </div>
        )}

        {loading && pendingPickups.length === 0 && !error && (
          <div className="text-center py-10">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-xl text-gray-700 mt-4">
              Loading pending seed requests...
            </p>
          </div>
        )}

        {!loading && pendingPickups.length === 0 && !error && (
          <div className="text-center py-16">
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
            <p className="text-xl md:text-2xl text-gray-600 mt-5">
              No pending seed pickups at the moment.
            </p>
            <p className="text-gray-500 mt-2">
              Check back later or click "Refresh List".
            </p>
          </div>
        )}
        {!loading && pendingPickups.length > 0 && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingPickups.map((pickup) => {
              const requestDate = new Date(
                pickup.RequestTimestamp || pickup.CreatedAt
              );
              const isOldRequest =
                (new Date() - requestDate) / (1000 * 60 * 60 * 24) >
                HOLD_TIME_LIMIT_DAYS;
              // User Status for display - replace 'UserLookupField_Status' with the actual field name
              // from your NocoDB User lookup on the PendingPickups table.
              const userStatusDisplay = pickup.UserStatus || "Unknown";

              return (
                <div
                  key={pickup.Id}
                  className={`bg-white p-5 rounded-xl shadow-xl border-l-4 ${
                    pickup.Status === "Dispense-Error"
                      ? "border-red-500"
                      : pickup.Status === "Cancel-Error"
                      ? "border-orange-500"
                      : pickup.Status === "Pending" && isOldRequest
                      ? "border-yellow-500"
                      : pickup.Status === "Pending"
                      ? "border-blue-500"
                      : pickup.Status === "Dispensed"
                      ? "border-green-500" // Added style for Dispensed
                      : pickup.Status === "Cancelled"
                      ? "border-gray-400" // Added style for Cancelled
                      : "border-gray-300" // Default
                  } flex flex-col justify-between transition-shadow hover:shadow-2xl`}
                >
                  <div>
                    <div className="mb-3">
                      <h2
                        className="text-lg md:text-xl font-semibold text-green-700 truncate"
                        title={pickup.UserFullName}
                      >
                        {pickup.UserFullName}
                      </h2>
                      <p className="text-xs text-gray-500">
                        Card: {pickup.LibraryCard} | Patron Status:{" "}
                        <span
                          className={`font-semibold ${
                            userStatusDisplay === "New"
                              ? "text-blue-600"
                              : userStatusDisplay === "Validated"
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {userStatusDisplay}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested:{" "}
                        {formatDate(
                          pickup.RequestTimestamp || pickup.CreatedAt
                        )}{" "}
                        at {pickup.BranchId?.BranchName || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Pickup Status:{" "}
                        <span
                          className={`font-medium ${
                            pickup.Status === "Pending" && isOldRequest
                              ? "text-yellow-600 font-bold"
                              : pickup.Status === "Pending"
                              ? "text-blue-600"
                              : pickup.Status.includes("Error")
                              ? "text-red-600"
                              : pickup.Status === "Dispensed"
                              ? "text-green-600"
                              : pickup.Status === "Cancelled"
                              ? "text-gray-500"
                              : "text-gray-600"
                          }`}
                        >
                          {pickup.Status}{" "}
                          {isOldRequest && pickup.Status === "Pending"
                            ? "(Old Request)"
                            : ""}
                        </span>
                      </p>
                      {pickup.Note && (
                        <p className="text-xs text-gray-500 mt-1">
                          Note: {pickup.Note}
                        </p>
                      )}
                    </div>

                    <h3 className="text-sm font-medium text-gray-800 mt-3 mb-1 border-t border-gray-200 pt-2">
                      Items:
                    </h3>
                    {pickup.ProcessedItems &&
                    pickup.ProcessedItems.length > 0 ? (
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
                            <span className="text-xs text-gray-400">
                              Inv.ID: {item.SeedInventoryId || "N/A"}
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

                  <div className="space-y-2 mt-auto">
                    {pickup.Status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleDispense(pickup)}
                          disabled={loading && processingId === pickup.Id}
                          className="w-full py-2.5 text-sm md:text-base bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out"
                        >
                          {loading && processingId === pickup.Id
                            ? "Processing..."
                            : userStatusDisplay === "New"
                            ? "Dispense & Validate User"
                            : "Dispense & Finalize"}
                        </button>
                        <button
                          onClick={() => handleCancelRequest(pickup)}
                          disabled={loading && processingId === pickup.Id}
                          className={`w-full py-2.5 text-sm md:text-base font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out ${
                            isOldRequest
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400"
                              : "bg-red-200 hover:bg-red-300 text-gray-700 focus:ring-gray-400"
                          }`}
                        >
                          {loading && processingId === pickup.Id
                            ? "Cancelling..."
                            : "Cancel This Request"}
                        </button>
                      </>
                    )}

                    {(pickup.Status === "Dispense-Error" ||
                      pickup.Status === "Cancel-Error") && (
                      <p className="text-xs text-red-600 text-center bg-red-50 p-2 rounded-md">
                        This request encountered an error. Please review logs or
                        manually verify details.
                      </p>
                    )}
                    {pickup.Status === "Dispensed" && (
                      <div className="text-sm text-green-600 text-center font-semibold py-2 bg-green-50 p-2 rounded-md border border-green-200">
                        <svg
                          className="inline-block w-5 h-5 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        Dispensed Successfully
                      </div>
                    )}
                    {pickup.Status === "Cancelled" && (
                      <div className="text-sm text-gray-500 text-center font-semibold py-2 bg-gray-100 p-2 rounded-md border border-gray-200">
                        Request Cancelled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Right Sidebar for Branch Inventory */}
      <aside className="w-full md:w-1/3 lg:w-1/4 bg-white p-4 md:p-6 shadow-lg border-l border-gray-200 flex flex-col md:order-2 h-screen md:h-screen md:max-h-screen md:sticky md:top-0 overflow-hidden">
        {" "}
        {/* Added flex-col */}
        <div className="sticky top-0 bg-white pt-1 pb-3 border-b z-10">
          {" "}
          {/* Sticky header for sidebar */}
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Branch Inventory Check
          </h2>
          <p className="text-sm font-semibold text-red-400 mb-2">
            ⚠️Inventory Status are not taking holds into account!
          </p>
          {/* Branch Selector */}
          <div className="mb-2">
            <label
              htmlFor="sidebarBranchSelect"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Branch:
            </label>
            <select
              id="sidebarBranchSelect"
              value={sidebarSelectedBranchId}
              // Call loadSidebarInventory directly on change
              onChange={(e) => loadSidebarInventory(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-300 rounded-md shadow-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
              disabled={allBranches.length === 0}
            >
              <option value="">-- View Branch Inventory --</option>
              {allBranches.map((branch) => (
                <option key={branch.Id} value={branch.Id}>
                  {branch.BranchName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Inventory Display - flex-grow and overflow-y-auto for scrolling content */}
        <div className="flex-grow overflow-y-auto pt-2 pr-1">
          {" "}
          {/* Added padding-right for scrollbar */}
          {sidebarInventoryLoading && (
            <div className="text-center py-4">
              <svg
                className="mx-auto h-8 w-8 text-gray-400 animate-spin" /* ... spinner SVG ... */
              ></svg>
              <p className="text-sm text-gray-500 mt-2">Loading inventory...</p>
            </div>
          )}
          {sidebarInventoryError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {sidebarInventoryError}
            </p>
          )}
          {!sidebarInventoryLoading &&
            !sidebarInventoryError &&
            sidebarSelectedBranchId &&
            sidebarBranchInventory.length > 0 && (
              <div className="space-y-1.5">
                {sidebarBranchInventory.map(
                  (item) =>
                    item.quantity > 0 && (
                      <div
                        key={item.inventoryId}
                        className="p-2 border-b border-gray-100 text-sm hover:bg-gray-50 rounded"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">
                            {item.seedName}
                          </span>
                          <span className="font-bold text-blue-600 px-1.5 py-0.5 bg-blue-100 rounded-full text-xs">
                            {item.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{item.seedType}</p>
                      </div>
                    )
                )}
              </div>
            )}
          {!sidebarInventoryLoading &&
            !sidebarInventoryError &&
            sidebarSelectedBranchId &&
            sidebarBranchInventory.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">
                No seeds currently in stock at this branch, or all have zero
                quantity.
              </p>
            )}
          {!sidebarInventoryLoading &&
            !sidebarSelectedBranchId && ( // Message when no branch is selected
              <p className="text-sm text-gray-400 italic py-4 text-center">
                Select a branch to view its current seed inventory.
              </p>
            )}
        </div>
      </aside>
    </div>
  );
}
