// /app/borrow/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
// import edisonLogo from "@/public/edison-logo.png";
import seedLogo from "@/public/eplLogoOnly.png";
// API Functions from your lib/noco-apis/ structure
import { fetchUserByLibraryCard } from "@/lib/noco-apis/users";
import { batchUpdateSeedInventory } from "@/lib/noco-apis/seedInventory";
import { fetchAllBranches } from "@/lib/noco-apis/branches";
import { fetchDetailedAvailableSeedsForBranch } from "@/lib/noco-apis/seeds";
import { createPendingPickupRequest } from "@/lib/noco-apis/pendingPickups";

// Utils from lib/utils.js
import {
  formatDate,
  processUserBorrowedData,
  countRecentBorrows,
  getActivelyHeldSeedIds,
  calculateDaysUntilNextBorrow,
} from "@/lib/utils";

export default function BorrowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [step, setStep] = useState(1); // 1: Lookup, 2: Select Branch, 3: Select Seeds
  const [libraryCardInput, setLibraryCardInput] = useState("");
  const [user, setUser] = useState(null);
  const [hasActiveHold, setHasActiveHold] = useState(false);
  const [allUserProcessedTransactions, setAllUserProcessedTransactions] =
    useState([]);
  const [activelyHeldSeedIds, setActivelyHeldSeedIds] = useState([]);
  const [recentBorrowsTotalPackets, setRecentBorrowsTotalPackets] = useState(0);
  const [daysLeftToBorrow, setDaysLeftToBorrow] = useState(null);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [seedsAvailableForSelection, setSeedsAvailableForSelection] = useState(
    []
  );
  const [selectedSeedsAndQuantities, setSelectedSeedsAndQuantities] = useState(
    []
  );

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const performCardLookup = async (cardToLookup) => {
    if (
      !cardToLookup.trim() ||
      cardToLookup.trim().length !== 14 ||
      !cardToLookup.trim().startsWith("293600")
    ) {
      setPageError("Invalid Library Card number. Are you registered?"); // Or handle silently
      setLoading(false); // Ensure loading is stopped
      return;
    }

    setLoading(true);
    setPageError("");
    setFormError("");
    setSuccessMessage("");
    setUser(null);
    setAllUserProcessedTransactions([]);
    setActivelyHeldSeedIds([]);
    setRecentBorrowsTotalPackets(0);
    setSelectedBranchId("");
    setSeedsAvailableForSelection([]);
    setSelectedSeedsAndQuantities([]);
    setHasActiveHold(false);
    setDaysLeftToBorrow(null);

    try {
      const foundUser = await fetchUserByLibraryCard(cardToLookup.trim());
      if (!foundUser) {
        setPageError(
          "User not found for the provided Library Card. Please try again or register."
        );
        setStep(1); // Revert to step 1 to allow manual input if param lookup fails
        setLibraryCardInput(""); // Clear input if lookup failed
        setLoading(false);
        return;
      }

      const pickupStatuses = foundUser.HasHold || [];
      const userHasPendingHold = pickupStatuses.includes("Pending");
      if (userHasPendingHold) {
        setUser(foundUser);
        setHasActiveHold(true);
        setPageError(
          // Use pageError to display this message prominently
          `You have an existing seed request that is still "Pending". Please pick up or cancel your current hold before placing a new one.`
        );
        // No need to set activeHoldDetails unless HasHold provides more than just statuses
        setStep(2); // Go to a step where this message is shown
        setLoading(false);
        return;
      }
      setUser(foundUser);

      const processedTxs = processUserBorrowedData(
        foundUser.SeedsBorrowed || [],
        foundUser.QuantityBorrowed || [],
        foundUser.BranchesBorrowed || [],
        foundUser.TransactionDates || [],
        foundUser.TransactionStatuses || [] // Assuming you might add this
      );

      setAllUserProcessedTransactions(processedTxs);
      setActivelyHeldSeedIds(getActivelyHeldSeedIds(processedTxs));
      const recentCount = countRecentBorrows(processedTxs);
      setRecentBorrowsTotalPackets(recentCount);
      if (recentCount >= 3) {
        const daysLeft = calculateDaysUntilNextBorrow(processedTxs, 3, 30);
        setDaysLeftToBorrow(daysLeft);
        // We can still proceed to step 2 to show user info and the "limit reached" message
      } else {
        setDaysLeftToBorrow(null); // Can borrow
      }
      setStep(2); // Move to branch selection
    } catch (err) {
      console.error("Lookup failed (performCardLookup):", err);
      setPageError(err.message || "Error during account lookup.");
      setStep(1); // Revert to step 1
      setLibraryCardInput(""); // Clear input
    } finally {
      setLoading(false);
    }
  };

  // Fetch all branches for the dropdown on component mount
  useEffect(() => {
    async function loadBranches() {
      setLoading(true);
      try {
        const branchesData = await fetchAllBranches();
        setBranches(branchesData || []);
      } catch (err) {
        console.error("Failed to fetch branches:", err);
        setPageError(
          "Could not load branch information. Please try refreshing."
        );
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);
  // Library Card search param
  useEffect(() => {
    const cardFromQuery = searchParams.get("card");
    if (cardFromQuery && !user && !loading && step === 1) {
      setLibraryCardInput(cardFromQuery);
      performCardLookup(cardFromQuery);
    }
  }, [searchParams]);

  // Fetch available seeds when a branch is selected
  useEffect(() => {
    if (selectedBranchId && user) {
      async function loadSeedsForBranch() {
        setLoading(true);
        setFormError("");
        setSeedsAvailableForSelection([]); // Clear previous
        try {
          // Single API call to your new proxied endpoint
          const detailedSeedsAvailable =
            await fetchDetailedAvailableSeedsForBranch(selectedBranchId);

          // The API route already combined inventory with seed details.
          // Now, just filter out what the user actively holds.
          const seedsTheyCanBorrowNow = detailedSeedsAvailable.filter(
            (seed) => seed.QuantityAtBranch > 0 // Should be true from API, but good check
          );

          setSeedsAvailableForSelection(seedsTheyCanBorrowNow);

          if (seedsTheyCanBorrowNow.length === 0) {
            if (detailedSeedsAvailable.length > 0) {
              setFormError(
                "All available seeds at this branch are already held by you or have run out."
              );
            } else {
              setFormError("No seeds currently available at this branch.");
            }
          }
        } catch (err) {
          console.error(
            "Failed to fetch or process detailed seeds for branch:",
            err
          );
          setFormError(
            err.message || "Could not load seeds for the selected branch."
          );
        } finally {
          setLoading(false);
        }
      }
      loadSeedsForBranch();
    } else {
      setSeedsAvailableForSelection([]);
    }
  }, [selectedBranchId, user, activelyHeldSeedIds]);

  const handleLibraryCardLookup = async (e) => {
    e.preventDefault();
    if (libraryCardInput) {
      performCardLookup(libraryCardInput);
    } else {
      setPageError("Please enter a Library Card number");
    }
  };

  const handleBranchSelect = (branchId) => {
    setSelectedBranchId(branchId);
    setSelectedSeedsAndQuantities([]);
    setFormError("");
    setSeedsAvailableForSelection([]);
    if (branchId) {
      setStep(3);
    } else {
      setSeedsAvailableForSelection([]); // Clear seeds if "--Select--" is chosen
      setStep(2); // Go back to branch selection UI part if "select branch" is chosen
    }
  };

  const handleQuantityChange = (seedId, change) => {
    setSelectedSeedsAndQuantities((prevSelected) => {
      const existingSeed = prevSelected.find((s) => s.seedId === seedId);
      const seedInfo = seedsAvailableForSelection.find(
        (s) => s.SeedId === seedId
      ); // Get max quantity (QuantityAtBranch)

      if (existingSeed) {
        let newQuantity = existingSeed.quantityToBorrow + change;
        if (newQuantity <= 0) {
          // Remove if quantity is 0 or less
          return prevSelected.filter((s) => s.seedId !== seedId);
        }
        if (newQuantity > seedInfo.QuantityAtBranch) {
          newQuantity = seedInfo.QuantityAtBranch; // Cap at available
        }
        return prevSelected.map((s) =>
          s.seedId === seedId ? { ...s, quantityToBorrow: newQuantity } : s
        );
      } else if (change > 0 && seedInfo) {
        // Add new seed if change is positive and seedInfo exists
        return [
          ...prevSelected,
          {
            seedId: seedInfo.SeedId,
            seedName: seedInfo.SeedName,
            seedType: seedInfo.SeedType,
            quantityToBorrow: 1, // Start with 1
            maxQuantity: seedInfo.QuantityAtBranch,
            seedInventoryId: seedInfo.SeedInventoryId,
          },
        ];
      }
      return prevSelected; // No change
    });
  };

  const getTotalSelectedPackets = () => {
    return selectedSeedsAndQuantities.reduce(
      (sum, seed) => sum + seed.quantityToBorrow,
      0
    );
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const totalSelectedPackets = getTotalSelectedPackets();

    if (totalSelectedPackets === 0) {
      setFormError("Please select at least one seed packet to borrow.");
      return;
    }
    if (recentBorrowsTotalPackets + totalSelectedPackets > 3) {
      setFormError(
        `You've already borrowed ${recentBorrowsTotalPackets} packet(s) recently. With this selection of ${totalSelectedPackets}, you would exceed the limit of 3 packets per 30 days. You can borrow ${Math.max(
          0,
          3 - recentBorrowsTotalPackets
        )} more packet(s).`
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Prepare data for SeedInventory PATCH (decrement)
      const inventoryUpdates = selectedSeedsAndQuantities.map((item) => {
        if (item.quantityToBorrow > item.maxQuantity) {
          // Should be caught by UI, but double check
          throw new Error(
            `Cannot borrow ${item.quantityToBorrow} of ${item.seedName}, only ${item.maxQuantity} available.`
          );
        }
        return {
          Id: item.seedInventoryId, // PK of the SeedInventory record
          QuantityAtBranch: item.maxQuantity - item.quantityToBorrow, // New decremented quantity
        };
      });

      // 2. Perform batch PATCH to SeedInventory
      await batchUpdateSeedInventory(inventoryUpdates);
      console.log("Client: Seed Inventory batch update call succeeded.");
      // 3. If inventory update is successful, proceed to create Pending Pickup
      const pickupData = {
        UserId: user.Id,
        LibraryCard: user.LibraryCard,
        UserFullName: user.FullName,
        BranchId: parseInt(selectedBranchId),
        BranchName:
          branches.find((b) => b.Id === parseInt(selectedBranchId))
            ?.BranchName || "N/A",
      };

      const itemsDataForPickup = selectedSeedsAndQuantities.map((item) => ({
        SeedId: item.seedId,
        SeedName: item.seedName,
        SeedType: item.seedType,
        QuantityToDispense: item.quantityToBorrow,
        SeedInventoryId: item.seedInventoryId,
      }));

      const pendingPickupResponse = await createPendingPickupRequest(
        pickupData,
        itemsDataForPickup
      );
      console.log(
        "Client: Create pending pickup request succeeded.",
        pendingPickupResponse
      );
      setSuccessMessage(
        `Your hold request for ${totalSelectedPackets} seed packet(s) has been placed! Please visit the library reference desk within 2 days to pick them up.`
      );

      setSelectedSeedsAndQuantities([]);
      setStep(4);
      setTimeout(() => {
        if (pathname.startsWith("/borrow")) {
          router.push("/");
        }
      }, 15000);
    } catch (err) {
      //! IMPORTANT: If batchUpdateSeedInventory succeeded but createPendingPickupRequest failed,
      //! inventory is decremented but no hold record exists. This is a discrepancy.
      // Robust error handling might involve trying to "roll back" inventory updates or flagging.
      // For prototype, the error message is key.
      console.error("Failed to submit borrow request:", err);
      setFormError(
        err.message || "Could not submit your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setLibraryCardInput("");
    setUser(null);
    setPageError("");
    setFormError("");
    setSuccessMessage("");
    setAllUserProcessedTransactions([]);
    setActivelyHeldSeedIds([]);
    setRecentBorrowsTotalPackets(0);
    setSelectedBranchId("");
    setSeedsAvailableForSelection([]);
    setSelectedSeedsAndQuantities([]);
    setHasActiveHold(false);
  };

  return (
    <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white p-6 md:p-8 lg:p-10 rounded-xl shadow-2xl">
        <div className="text-center mb-12">
          <Image
            src={seedLogo}
            alt="Edison Public Library Logo"
            width={250}
            height={250}
            md-width={120}
            md-height={120}
            className="rounded-full mx-auto"
            priority
          />
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-green-dark">
            Borrow Seeds
          </h1>
        </div>

        {/* General Page Error (e.g., failed to load branches or critical lookup error) */}
        {pageError && (step === 1 || (step > 1 && !user)) && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center text-sm md:text-base">
            {pageError}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-center text-sm md:text-base">
            {successMessage}
          </div>
        )}

        {/* Step 1: Library Card Lookup */}
        {step === 1 && !successMessage && (!user || pageError) && (
          <form
            onSubmit={handleLibraryCardLookup}
            className="space-y-4 md:space-y-6"
          >
            <div>
              <label
                htmlFor="libraryCardInput"
                className="block text-md md:text-lg font-medium text-gray-700 mb-1"
              >
                Library Card Number
              </label>
              <input
                type="number"
                id="libraryCardInput"
                value={libraryCardInput}
                onChange={(e) => {
                  setLibraryCardInput(e.target.value);
                  setPageError(""); /* Clear error on type */
                }}
                className="w-full p-3 text-md md:text-lg border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                placeholder="Enter 14-digit card number"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-md md:text-xl font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Find My Account"}
            </button>
            <button
              type="button"
              onClick={() => {
                router.push("/");
                resetFlow();
              }}
              disabled={loading}
              className="w-full py-3 text-md md:text-xl font-semibold text-green-dark border-2 border-green-medium rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-dark transition"
            >
              Back to Home
            </button>
          </form>
        )}

        {loading && !user && step === 1 && (
          <p className="text-center text-lg text-gray-600">
            Looking up account...
          </p>
        )}

        {user &&
          step >= 2 &&
          !successMessage &&
          pageError && ( // <<< MODIFIED: Show this if there's a user AND pageError
            <div className="my-4 p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 rounded-md shadow">
              <h3 className="text-lg font-semibold mb-1">Important Notice:</h3>
              <p>{pageError}</p>{" "}
              {/* pageError will contain the "active hold" message or "expired" message */}
              {hasActiveHold && ( // Only show "Go Home" if it was an active hold message
                <button
                  onClick={() => router.push("/")}
                  className="mt-3 py-2 px-4 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                >
                  Okay, Start Over
                </button>
              )}
              {!hasActiveHold &&
                pageError.toLowerCase().includes("expired") && ( // If error was card expired
                  <button
                    onClick={resetFlow}
                    className="mt-3 btn-secondary-outline text-sm"
                  >
                    Try Different Card
                  </button>
                )}
            </div>
          )}

        {/* Steps 2 & 3: User Info, Branch, and Seed Selection */}
        {user &&
          step >= 2 &&
          !successMessage &&
          !pageError &&
          !hasActiveHold && (
            <div className="space-y-4 md:space-y-6">
              {/* User Info Display */}
              <div className="p-3 md:p-4 border border-gray-200 rounded-md bg-gray-50 text-sm md:text-base">
                <h2 className="text-xl md:text-2xl font-semibold text-green-dark mb-1 md:mb-2">
                  Welcome, {user.FullName}!
                </h2>
                <p className="text-gray-600">Card: {user.LibraryCard}</p>
                <p className="text-gray-600">
                  Your Registered Branch:{" "}
                  {user.RegisteredAtBranch?.BranchName || "N/A"}
                </p>
                <p className="text-gray-600">
                  Actively Held Seed Types: {activelyHeldSeedIds.length}
                </p>
                <p className="font-semibold text-gray-700">
                  Seeds/Packets Borrowed in last 30 days:{" "}
                  {recentBorrowsTotalPackets} (Max 3 allowed)
                </p>
              </div>
              {allUserProcessedTransactions.length > 0 && (
                <div className="mt-4 md:mt-6">
                  <h3 className="text-lg md:text-xl font-semibold text-green-dark mb-2">
                    Your Borrow History (Last 30 transactions)
                  </h3>
                  <div className="overflow-x-auto max-h-60 border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left font-medium text-gray-500 tracking-wider"
                          >
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left font-medium text-gray-500 tracking-wider"
                          >
                            Seed Type
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left font-medium text-gray-500 tracking-wider"
                          >
                            Qty.
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left font-medium text-gray-500 tracking-wider"
                          >
                            Branch
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allUserProcessedTransactions.slice(0, 30).map(
                          (
                            tx,
                            index // Show up to 30
                          ) => (
                            <tr key={`${tx.seedId}-${tx.date}-${index}`}>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {formatDate(tx.date)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {tx.seedType}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {tx.quantity}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {tx.branchName}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {
                pageError ? (
                  <div className="my-4 p-4 bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 rounded-md shadow">
                    <h3 className="text-lg font-semibold mb-1">
                      Important Notice:
                    </h3>
                    <p>{pageError}</p>{" "}
                    {/* pageError will contain the "active hold" message */}
                    {hasActiveHold && (
                      <button
                        onClick={() => router.push("/")} // Or a specific "View My Holds" page if you build one
                        className="mt-3 py-2 px-4 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                      >
                        Okay, Go Home
                      </button>
                    )}
                  </div>
                ) : daysLeftToBorrow !== null &&
                  daysLeftToBorrow > 0 /* Borrow Limit Reached Message */ ? (
                  <div className="my-4 p-4 bg-blue-100 text-blue-800 border-l-4 border-blue-500 rounded-md shadow">
                    <h3 className="text-lg font-semibold mb-1">
                      Borrow Limit Reached
                    </h3>
                    <p>
                      You have reached your borrowing limit of 3 seed packets
                      for the current 30-day period.
                    </p>
                    <p className="mt-1">
                      You can borrow more seeds in approximately{" "}
                      <span className="font-bold">
                        {daysLeftToBorrow} day(s)
                      </span>
                      .
                    </p>
                  </div>
                ) : daysLeftToBorrow === 0 /* Can borrow today */ ? (
                  <div className="my-4 p-4 bg-green-100 text-green-800 border-l-4 border-green-500 rounded-md shadow">
                    <h3 className="text-lg font-semibold mb-1">
                      Borrowing Unlocked!
                    </h3>
                    <p>You can borrow seeds again starting today!</p>
                  </div>
                ) : null /* No error, no limit reached - proceed to show borrow options */
              }

              {/* Branch Selection Dropdown  */}
              {!hasActiveHold && !pageError && daysLeftToBorrow <= 0 && (
                <div>
                  <label
                    htmlFor="branchSelect"
                    className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                  >
                    Select Branch to Borrow From:
                  </label>
                  <select
                    id="branchSelect"
                    value={selectedBranchId}
                    onChange={(e) => handleBranchSelect(e.target.value)}
                    className="w-full p-3 text-md md:text-lg border border-gray-300 rounded-md shadow-sm bg-white focus:ring-green-500 focus:border-green-500"
                    disabled={branches.length === 0 || loading}
                  >
                    <option value="">-- Select a Library Branch --</option>
                    {branches.map((branch) => (
                      <option key={branch.Id} value={branch.Id}>
                        {branch.BranchName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Seed Selection Form - no page error */}
              {step === 3 && selectedBranchId && !pageError && (
                <form
                  onSubmit={handleBorrowSubmit}
                  className="space-y-4 md:space-y-6 pt-2 md:pt-4"
                >
                  {loading && !seedsAvailableForSelection.length && (
                    <p className="text-center text-gray-600 text-sm md:text-base">
                      Loading available seeds...
                    </p>
                  )}

                  {!loading && seedsAvailableForSelection.length > 0 && (
                    <div>
                      <label className="block text-lg md:text-xl font-semibold text-green-dark mb-1 md:mb-2">
                        Available Seeds at{" "}
                        {branches.find(
                          (b) => b.Id === parseInt(selectedBranchId)
                        )?.BranchName || "Selected Branch"}
                        :
                      </label>
                      <div className="space-y-3 max-h-60 md:max-h-72 overflow-y-auto p-2 md:p-3 border border-gray-300 rounded-md bg-white">
                        {seedsAvailableForSelection.map((seed) => {
                          const currentSelection =
                            selectedSeedsAndQuantities.find(
                              (s) => s.seedId === seed.SeedId
                            );
                          const currentQuantity = currentSelection
                            ? currentSelection.quantityToBorrow
                            : 0;
                          return (
                            <div
                              key={seed.SeedId}
                              className="flex items-center justify-between p-2 hover:bg-green-50 rounded-md"
                            >
                              <div className="flex-grow">
                                <span className="text-sm md:text-lg text-gray-800">
                                  {seed.SeedName} ({seed.SeedType})
                                </span>
                                <br />
                                <span className="text-xs text-gray-500">
                                  Available: {seed.QuantityAtBranch} packet(s)
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 ml-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(seed.SeedId, -1)
                                  }
                                  className="p-1 h-8 w-8 md:h-10 md:w-10 rounded-full border text-lg md:text-xl font-bold bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                                  disabled={currentQuantity === 0 || loading}
                                >
                                  -
                                </button>
                                <span className="text-md md:text-lg w-8 text-center font-medium">
                                  {currentQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(seed.SeedId, 1)
                                  }
                                  className="p-1 h-8 w-8 md:h-10 md:w-10 rounded-full border text-lg md:text-xl font-bold bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                                  disabled={
                                    currentQuantity >= seed.QuantityAtBranch ||
                                    loading
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Form-specific errors (e.g., no seeds at branch, selection error) */}
                  {formError && (
                    <div className="p-3 bg-red-100 text-red-600 rounded-md text-center text-sm md:text-base">
                      {formError}
                    </div>
                  )}

                  {!loading &&
                    seedsAvailableForSelection.length === 0 &&
                    !formError &&
                    selectedBranchId && (
                      <p className="text-gray-600 p-3 border border-gray-200 rounded-md bg-gray-50 text-sm md:text-base">
                        No new seeds currently available at this branch for you
                        to borrow.
                      </p>
                    )}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      getTotalSelectedPackets() === 0 ||
                      recentBorrowsTotalPackets + getTotalSelectedPackets() > 3
                    }
                    className="w-full py-3 text-md md:text-xl font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-60"
                  >
                    {loading
                      ? "Submitting Request..."
                      : `Request to Borrow (${getTotalSelectedPackets()}) Packet(s)`}
                  </button>
                </form>
              )}

              {step === 4 && (
                <div className="text-center space-y-6 py-10">
                  <svg
                    className="mx-auto h-16 w-16 text-green-500"
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
                  <h2 className="text-2xl md:text-3xl font-semibold text-green-dark">
                    Request Submitted!
                  </h2>
                  <p className="text-md md:text-lg text-gray-700">
                    Your seed request has been successfully submitted. Please
                    proceed to the library service desk to pick up your seeds.
                  </p>
                  <p className="text-sm text-gray-500">
                    This page will redirect to the homepage in 10 seconds.
                  </p>
                  <button
                    onClick={() => {
                      resetFlow(); // Reset the flow fully
                      router.push("/");
                    }}
                    className="w-full md:w-auto mt-4 py-3 px-8 text-md md:text-lg font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Finish
                  </button>
                </div>
              )}

              {/* General "Start Over" button for user context */}
              <button
                type="button"
                onClick={resetFlow}
                disabled={loading}
                className="w-full py-3 text-md md:text-xl font-semibold text-green-dark border-2 border-green-medium rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-dark transition mt-3 md:mt-4"
              >
                {step === 1 ? "Back to Home" : "Start Over / Change Card"}
              </button>
            </div>
          )}
      </div>
    </main>
  );
}
