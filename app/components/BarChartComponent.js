// /components/admin/BarChartComponent.js
"use client"; // Recharts components are client-side
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Define a set of appealing colors for the bars
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82Ca9D",
  "#FFC0CB",
  "#A020F0",
];

export const BarChartComponent = ({
  data,
  dataKeyX,
  dataKeyBar,
  title,
  barColor,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available for {title || "Bar Chart"}.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200 h-80 md:h-96">
      {" "}
      {/* Increased height */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20, // Adjusted margin for YAxis labels
            left: 10, // Adjusted margin for YAxis labels
            bottom: 40, // Increased bottom margin for XAxis labels if they are long
          }}
          barGap={10} // Space between bars of the same group (if multiple bars)
          barCategoryGap="20%" // Space between categories
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey={dataKeyX}
            angle={-35} // Angle labels to prevent overlap
            textAnchor="end"
            height={60} // Allocate more height for angled labels
            interval={0} // Show all labels
            tick={{ fontSize: 10, fill: "#666" }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#666" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            }}
            itemStyle={{ color: "#333" }}
            cursor={{ fill: "rgba(206, 206, 206, 0.2)" }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Bar
            dataKey={dataKeyBar}
            name={title || dataKeyBar}
            radius={[4, 4, 0, 0]} /* Rounded top corners */
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={barColor || COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
