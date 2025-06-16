// /components/admin/StatCard.js
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

// Added optional className prop for more flexibility
export const StatCard = ({
  title,
  value,
  icon,
  change,
  changeType,
  unit = "",
  className = "",
}) => {
  const IconComponent = icon;
  return (
    <div
      className={`bg-white shadow-lg rounded-xl p-5 md:p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        {IconComponent && (
          <IconComponent className="h-7 w-7 md:h-8 md:w-8 text-green-500 p-1 bg-green-100 rounded-full" />
        )}
      </div>
      <div className="mt-1">
        <h3 className="text-2xl md:text-3xl font-semibold text-gray-900">
          {value !== null && value !== undefined ? value.toLocaleString() : "-"}
          {unit && (
            <span className="text-lg md:text-xl font-normal text-gray-500 ml-1">
              {unit}
            </span>
          )}
        </h3>
        {change && (
          <p
            className={`mt-1 flex items-baseline text-xs md:text-sm font-medium ${
              changeType === "increase" ? "text-green-600" : "text-red-600"
            }`}
          >
            {changeType === "increase" ? (
              <ArrowUpIcon
                className="h-3.5 w-3.5 md:h-4 md:w-4 mr-0.5 md:mr-1 flex-shrink-0 self-center text-green-500"
                aria-hidden="true"
              />
            ) : (
              <ArrowDownIcon
                className="h-3.5 w-3.5 md:h-4 md:w-4 mr-0.5 md:mr-1 flex-shrink-0 self-center text-red-500"
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
