// /components/admin/PieChartComponent.js
"use client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#FFC0CB",
  "#A020F0",
  "#FF7F50",
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
  name,
  value,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label for very small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="11px"
      fontWeight="500"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export const PieChartComponent = ({ data, dataKey, nameKey, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available for {title || "Pie Chart"}.
      </div>
    );
  }

  // Ensure data has a 'name' and 'value' property for the Pie component, or map it.
  // Here, we assume data comes with properties matching nameKey and dataKey.
  const chartData = data.map((item) => ({
    name: item[nameKey],
    value: item[dataKey],
  }));

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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100} // Adjusted radius
            fill="#8884d8"
            dataKey="value" // dataKey here should be "value" after mapping
            nameKey="name" // nameKey here should be "name" after mapping
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            }}
            formatter={(value, name) => [`${value.toLocaleString()}`, name]}
          />
          <Legend
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: "20px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
