// /app/admin/page.js
"use client";
import { useEffect, useState, useCallback } from "react";
import { StatCard } from "../components/StatCard"; // Adjust path if needed
import { BranchStatList } from "../components/BranchStatList"; // Adjust path if needed
import {
  UserGroupIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CalendarIcon, // Added Calendar icons
} from "@heroicons/react/24/outline";
import { BarChartComponent } from "../components/BarChartComponent";
import { PieChartComponent } from "../components/PieChartComponent";

// --- API Fetching Functions (Client-Side Wrappers) ---
async function fetchDailyActivityStats() {
  const response = await fetch("/api/admin/stats/daily-activity");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch daily stats");
  }
  return response.json();
}
async function fetchMonthlyActivityStats() {
  const response = await fetch("/api/admin/stats/monthly-activity");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch monthly stats");
  }
  return response.json();
}
async function fetchAllTimeUserStats() {
  const response = await fetch("/api/admin/stats/all-time-users");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch user stats");
  }
  return response.json();
}
async function fetchAllTimePickupStats() {
  const response = await fetch("/api/admin/stats/all-time-pickups");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch pickup stats");
  }
  return response.json();
}
async function fetchAllTimeInventoryStats() {
  const response = await fetch("/api/admin/stats/all-time-inventory");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch inventory stats");
  }
  return response.json();
}
async function fetchInventoryAlerts() {
  const response = await fetch("/api/admin/stats/inventory-alerts");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch inventory alerts");
  }
  return response.json();
}
async function fetchSeedsDispensedByTypeStats() {
  // NEW
  const response = await fetch("/api/admin/stats/seeds-dispensed-by-type");
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error || "Failed to fetch dispensed seed types");
  }
  return response.json();
}

// Helper component for sections that load on demand
const LoadableSection = ({
  title,
  icon,
  isLoading,
  error,
  data,
  onFetch,
  children,
  noDataMessage = "No data to display for this section.",
}) => {
  const IconComponent = icon;
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {IconComponent && (
            <IconComponent className="h-7 w-7 text-gray-500 mr-3" />
          )}
          <h2 className="text-2xl font-semibold text-gray-700 pb-1">{title}</h2>
        </div>
        <button
          onClick={onFetch}
          disabled={isLoading}
          className="py-1.5 px-4 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
        >
          <ArrowPathIcon
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Loading..." : data ? "Refresh" : "Load Data"}
        </button>
      </div>
      {isLoading && (
        <p className="text-sm text-gray-500 italic py-4 text-center">
          Loading {title.toLowerCase()}...
        </p>
      )}
      {error && (
        <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm text-center">
          Error: {error}{" "}
          {error.includes("429") ||
          error.toLowerCase().includes("too many requests")
            ? "Please wait a moment and try refreshing."
            : ""}
        </p>
      )}
      {data && !isLoading && !error && children}
      {!data && !isLoading && !error && (
        <p className="text-gray-500 text-sm py-4 text-center">
          {noDataMessage}
        </p>
      )}
    </section>
  );
};

export default function AdminOverviewPage() {
  const [dailyStats, setDailyStats] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true); // Daily loads initially
  const [dailyError, setDailyError] = useState("");

  const [monthlyStats, setMonthlyStats] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false); // Load on demand
  const [monthlyError, setMonthlyError] = useState("");

  const [allTimeUserStats, setAllTimeUserStats] = useState(null);
  const [allTimeUserLoading, setAllTimeUserLoading] = useState(false); // Load on demand
  const [allTimeUserError, setAllTimeUserError] = useState("");

  const [allTimePickupStats, setAllTimePickupStats] = useState(null);
  const [allTimePickupLoading, setAllTimePickupLoading] = useState(false);
  const [allTimePickupError, setAllTimePickupError] = useState("");

  const [allTimeInventoryData, setAllTimeInventoryData] = useState(null);
  const [allTimeInventoryLoading, setAllTimeInventoryLoading] = useState(false);
  const [allTimeInventoryError, setAllTimeInventoryError] = useState("");

  const [inventoryAlertData, setInventoryAlertData] = useState(null);
  const [inventoryAlertLoading, setInventoryAlertLoading] = useState(false);
  const [inventoryAlertError, setInventoryAlertError] = useState("");

  const [seedsDispensedTypeData, setSeedsDispensedTypeData] = useState(null);
  const [seedsDispensedTypeLoading, setSeedsDispensedTypeLoading] =
    useState(false);
  const [seedsDispensedTypeError, setSeedsDispensedTypeError] = useState("");

  const loadDailyStats = useCallback(async () => {
    // Renamed and wrapped in useCallback
    setDailyLoading(true);
    setDailyError("");
    try {
      const dailyData = await fetchDailyActivityStats();
      setDailyStats(dailyData);
      setDailyLoading(false);
    } catch (err) {
      setDailyError(err.message || "Failed to load daily stats");
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyStats();
  }, [loadDailyStats]);

  // --- Individual Fetch Handlers for On-Demand Loading ---
  const handleFetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setMonthlyError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay before actual fetch
      const data = await fetchMonthlyActivityStats();
      setMonthlyStats(data);
    } catch (err) {
      setMonthlyError(err.message);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const handleFetchAllTimeUsers = useCallback(async () => {
    setAllTimeUserLoading(true);
    setAllTimeUserError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await fetchAllTimeUserStats();

      setAllTimeUserStats(data);
    } catch (err) {
      setAllTimeUserError(err.message);
    } finally {
      setAllTimeUserLoading(false);
    }
  }, []);

  const handleFetchAllTimePickups = useCallback(async () => {
    setAllTimePickupLoading(true);
    setAllTimePickupError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await fetchAllTimePickupStats();
      setAllTimePickupStats(data);
    } catch (err) {
      setAllTimePickupError(err.message);
    } finally {
      setAllTimePickupLoading(false);
    }
  }, []);

  const handleFetchAllTimeInventory = useCallback(async () => {
    setAllTimeInventoryLoading(true);
    setAllTimeInventoryError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await fetchAllTimeInventoryStats();

      setAllTimeInventoryData(data);
    } catch (err) {
      setAllTimeInventoryError(err.message);
    } finally {
      setAllTimeInventoryLoading(false);
    }
  }, []);

  const handleFetchAlerts = useCallback(async () => {
    setInventoryAlertLoading(true);
    setInventoryAlertError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await fetchInventoryAlerts();

      setInventoryAlertData(data);
    } catch (err) {
      setInventoryAlertError(err.message);
    } finally {
      setInventoryAlertLoading(false);
    }
  }, []);

  const handleFetchSeedsDispensedChart = useCallback(async () => {
    setSeedsDispensedTypeLoading(true);
    setSeedsDispensedTypeError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Stagger
      const data = await fetchSeedsDispensedByTypeStats();
      setSeedsDispensedTypeData(data);
    } catch (err) {
      setSeedsDispensedTypeError(err.message);
    } finally {
      setSeedsDispensedTypeLoading(false);
    }
  }, []);

  const renderLoading = (text = "Loading data...") => (
    <p className="text-sm text-gray-500 italic py-4 text-center">{text}</p>
  );
  const renderError = (errorMsg) => (
    <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm text-center">
      {errorMsg}
    </p>
  );
  const renderNoData = (text = "No data to display for this section.") => (
    <p className="text-gray-500 text-sm py-4 text-center">{text}</p>
  );

  return (
    <div className="space-y-10 md:space-y-12">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
        Activity Overview
      </h1>

      {/* Today's Activity Section - Loads initially */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-7 w-7 text-green-600 mr-3" />
            <h2 className="text-2xl font-semibold text-gray-700 pb-1">
              Today's Activity (
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
              )
            </h2>
          </div>
          <button
            onClick={loadDailyStats}
            disabled={dailyLoading}
            className="py-1.5 px-4 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"
          >
            <ArrowPathIcon
              className={`w-4 h-4 mr-2 ${dailyLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        {dailyLoading && renderLoading("Loading daily stats...")}
        {dailyError && renderError(dailyError)}
        {dailyStats && !dailyLoading && !dailyError && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
            <BranchStatList
              title="New Users Registered"
              data={dailyStats.newUsersByBranch}
              icon={UserPlusIcon}
            />
            <BranchStatList
              title="Users Validated"
              data={dailyStats.validatedUsersByBranch}
              icon={CheckBadgeIcon}
            />
            <BranchStatList
              title="Holds Requested"
              data={dailyStats.requestedHoldsByBranch}
              icon={ListBulletIcon}
            />
            <BranchStatList
              title="Seeds Dispensed (Packets)"
              data={dailyStats.seedsDispensedByBranch}
              icon={ArchiveBoxIcon}
            />
          </div>
        )}
        {!dailyStats &&
          !dailyLoading &&
          !dailyError &&
          renderNoData("No daily activity data available.")}
      </section>

      {/* Inventory Alerts Section - Load on demand */}
      <LoadableSection
        title="Inventory Alerts (Low Stock per Branch)"
        icon={ExclamationTriangleIcon}
        isLoading={inventoryAlertLoading}
        error={inventoryAlertError}
        data={inventoryAlertData}
        onFetch={handleFetchAlerts}
        noDataMessage="Click 'Load Data' to view inventory alerts."
      >
        {inventoryAlertData &&
          (inventoryAlertData.lowStockItems &&
          inventoryAlertData.lowStockItems.length > 0 ? (
            <div className="bg-white shadow-lg rounded-xl p-5 md:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Items with less than {inventoryAlertData.threshold} packets at a
                branch:
              </h3>
              <div className="overflow-x-auto max-h-72 border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                        Seed Name
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                        Type
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                        Branch
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">
                        Qty Left
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {inventoryAlertData.lowStockItems.map((item) => (
                      <tr
                        key={item.seedInventoryId}
                        className="hover:bg-red-50"
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-red-700 font-medium">
                          {item.seedName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-600">
                          {item.seedType}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-600">
                          {item.branchName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-600 font-bold">
                          {item.quantityAtBranch}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 p-4 text-center">
              No seeds currently below the low stock threshold of{" "}
              {inventoryAlertData?.threshold || "N/A"} at any branch.
            </p>
          ))}
      </LoadableSection>

      {/* This Month's Activity Section - Load on demand */}
      <LoadableSection
        title={`This Month (${
          monthlyStats?.monthBoundary
            ? `${new Date(
                monthlyStats.monthBoundary.start + "T00:00:00"
              ).toLocaleString("default", { month: "long" })} ${new Date(
                monthlyStats.monthBoundary.start + "T00:00:00"
              ).getFullYear()}`
            : new Date().toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
        })`}
        icon={CalendarIcon}
        isLoading={monthlyLoading}
        error={monthlyError}
        data={monthlyStats}
        onFetch={handleFetchMonthly}
        noDataMessage="Click 'Load Data' to view monthly activity."
      >
        {monthlyStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
            <BranchStatList
              title="New Users This Month"
              data={monthlyStats.newUsersByBranch}
              icon={UserPlusIcon}
            />
            <BranchStatList
              title="Users Validated This Month"
              data={monthlyStats.validatedUsersByBranch}
              icon={CheckBadgeIcon}
            />
            <BranchStatList
              title="Holds Requested This Month"
              data={monthlyStats.requestedHoldsByBranch}
              icon={ListBulletIcon}
            />
            <BranchStatList
              title="Seeds Dispensed This Month"
              data={monthlyStats.seedsDispensedByBranch}
              icon={ArchiveBoxIcon}
            />
          </div>
        )}
      </LoadableSection>

      {/* All-Time User Totals Section - Load on demand */}
      <LoadableSection
        title="All-Time User Totals"
        icon={UserGroupIcon}
        isLoading={allTimeUserLoading}
        error={allTimeUserError}
        data={allTimeUserStats}
        onFetch={handleFetchAllTimeUsers}
        noDataMessage="Click 'Load Data' to view user totals."
      >
        {allTimeUserStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            <StatCard
              title="Registered Users"
              value={allTimeUserStats.totalRegisteredUsers}
              icon={UserGroupIcon}
            />
            <StatCard
              title="Validated Users"
              value={allTimeUserStats.totalValidatedUsers}
              icon={CheckBadgeIcon}
            />
            <StatCard
              title="Users 'New' Status"
              value={allTimeUserStats.totalNewStatusUsers}
              icon={ClockIcon}
            />
          </div>
        )}
      </LoadableSection>

      {/* All-Time Pickup & Inventory Totals Section - Load on demand */}
      {/* For this, we might need to combine two fetch results if they are separate calls */}
      <LoadableSection
        title="All-Time Pickup & Inventory Totals"
        icon={BuildingStorefrontIcon}
        isLoading={allTimePickupLoading || allTimeInventoryLoading} // Loading if either is loading
        error={allTimePickupError || allTimeInventoryError} // Show first error
        data={allTimePickupStats && allTimeInventoryData} // Considered loaded if both have data
        onFetch={async () => {
          // Fetch both
          handleFetchAllTimePickups();
          await new Promise((r) => setTimeout(r, 600)); // Stagger
          handleFetchAllTimeInventory();
        }}
        noDataMessage="Click 'Load Data' for pickup & inventory totals."
      >
        {allTimePickupStats && allTimeInventoryData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            <StatCard
              title="Holds Requested"
              value={allTimePickupStats.totalHoldsRequested}
              icon={ListBulletIcon}
            />
            <StatCard
              title="Pickups Dispensed"
              value={allTimePickupStats.totalPickupsDispensed}
              icon={CheckBadgeIcon}
            />
            <StatCard
              title="Seeds Dispensed"
              value={allTimePickupStats.totalSeedsDispensed}
              icon={ArchiveBoxIcon}
              unit="packets"
            />
            <StatCard
              title="Unique Seed Types"
              value={allTimeInventoryData.uniqueSeedTypesInInventory}
              icon={CircleStackIcon}
            />
            <StatCard
              title="Packets in Inventory"
              value={allTimeInventoryData.totalSeedPacketsInInventory}
              icon={BuildingStorefrontIcon}
              unit="packets"
            />
          </div>
        )}
      </LoadableSection>

      {/* Visualizations Placeholder */}
      <section className="mt-10 md:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Bar Chart: Seeds Dispensed by Type */}
          <LoadableSection
            title="Top Seeds Dispensed (All Time)"
            isLoading={seedsDispensedTypeLoading}
            error={seedsDispensedTypeError}
            data={seedsDispensedTypeData}
            onFetch={handleFetchSeedsDispensedChart}
            noDataMessage="Click 'Load Data' to view chart."
          >
            {seedsDispensedTypeData && seedsDispensedTypeData.length > 0 && (
              <BarChartComponent
                data={seedsDispensedTypeData}
                dataKeyX="name" // The property in your data for X-axis labels (e.g., seed name)
                dataKeyBar="value" // The property for bar values (e.g., count dispensed)
                title="" // Title is already in LoadableSection
              />
            )}
            {seedsDispensedTypeData &&
              seedsDispensedTypeData.length === 0 &&
              !seedsDispensedTypeLoading && (
                <p className="text-center text-gray-500 h-80 md:h-96 flex items-center justify-center">
                  No seed dispensing data to chart.
                </p>
              )}
          </LoadableSection>

          {/* Pie Chart: User Registrations by Branch (Example: Using Monthly Data) */}
          <LoadableSection
            title="New User Registrations by Branch (This Month)"
            isLoading={monthlyLoading && !monthlyStats} // Show loading if monthly is still loading
            error={monthlyError}
            data={monthlyStats?.newUsersByBranch} // Data comes from monthlyStats
            onFetch={handleFetchMonthly} // Refresh button re-fetches monthly stats
            noDataMessage={
              monthlyStats
                ? "No new user registrations this month."
                : "Load monthly data to see chart."
            }
          >
            {monthlyStats?.newUsersByBranch &&
              monthlyStats.newUsersByBranch.length > 0 && (
                <PieChartComponent
                  data={monthlyStats.newUsersByBranch}
                  dataKey="count" // The property for pie slice values
                  nameKey="branchName" // The property for pie slice names/labels
                  title=""
                />
              )}
            {monthlyStats?.newUsersByBranch &&
              monthlyStats.newUsersByBranch.length === 0 &&
              !monthlyLoading && (
                <p className="text-center text-gray-500 h-80 md:h-96 flex items-center justify-center">
                  No new user registrations this month to chart.
                </p>
              )}
          </LoadableSection>
        </div>
      </section>
    </div>
  );
}
