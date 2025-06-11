// /app/admin/page.js
"use client"; // If fetching data client-side or using hooks
import { useEffect, useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UserGroupIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline"; // Example icons

// Placeholder for API call to fetch user stats
async function fetchUserStatsData() {
  // In a real app, this would call your internal API: /api/admin/stats/user
  // For now, mock data:
  console.log("Fetching user stats data (mock)...");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalUsers: 1250,
        newThisMonth: 78,
        validatedUsers: 950,
        newStatusUsers: 300,
        // You could add change percentages if you track historical data
        // totalUsersChange: "+5%",
        // newThisMonthChange: "-10%",
      });
    }, 1000);
  });
}

const StatCard = ({ title, value, icon, change, changeType }) => {
  const IconComponent = icon;
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        {IconComponent && (
          <IconComponent className="h-8 w-8 text-green-500 p-1 bg-green-100 rounded-full" />
        )}
      </div>
      <div className="mt-1">
        <h3 className="text-3xl font-semibold text-gray-900">{value}</h3>
        {change && (
          <p
            className={`mt-1 flex items-baseline text-sm font-medium ${
              changeType === "increase" ? "text-green-600" : "text-red-600"
            }`}
          >
            {changeType === "increase" ? (
              <ArrowUpIcon
                className="h-4 w-4 mr-1 flex-shrink-0 self-center text-green-500"
                aria-hidden="true"
              />
            ) : (
              <ArrowDownIcon
                className="h-4 w-4 mr-1 flex-shrink-0 self-center text-red-500"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {changeType === "increase" ? "Increased" : "Decreased"} by
            </span>
            {change}
          </p>
        )}
      </div>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchUserStatsData(); // Replace with actual API call
        setUserStats(data);
      } catch (err) {
        console.error("Failed to load user stats:", err);
        setError("Could not load user statistics.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-600 text-lg">
        Loading dashboard data...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 bg-red-100 text-red-700 rounded-md">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        User Statistics Overview
      </h1>

      {userStats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Registered Users"
            value={userStats.totalUsers.toLocaleString()}
            icon={UserGroupIcon}
            // change={userStats.totalUsersChange}
            // changeType={userStats.totalUsersChange?.startsWith('+') ? 'increase' : 'decrease'}
          />
          <StatCard
            title="New Users This Month"
            value={userStats.newThisMonth.toLocaleString()}
            icon={UserPlusIcon}
            // change={userStats.newThisMonthChange}
            // changeType={userStats.newThisMonthChange?.startsWith('+') ? 'increase' : 'decrease'}
          />
          <StatCard
            title="Validated Patrons"
            value={userStats.validatedUsers.toLocaleString()}
            icon={CheckBadgeIcon}
          />
          <StatCard
            title="Patrons with 'New' Status"
            value={userStats.newStatusUsers.toLocaleString()}
            icon={ClockIcon} // Represents 'pending' or 'new'
          />
          {/* Add more StatCard components for other metrics */}
        </div>
      )}

      {/* Placeholder for future charts or more detailed tables */}
      <div className="mt-10 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          More Details (Coming Soon)
        </h2>
        <p className="text-gray-600">
          Detailed tables and charts for user activity will be displayed here.
        </p>
      </div>
    </div>
  );
}
