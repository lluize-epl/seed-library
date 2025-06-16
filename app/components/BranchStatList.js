export function BranchStatList({ title, data, icon }) {
  const IconComponent = icon;
  return (
    <div className="bg-white shadow-lg rounded-xl p-5 md:p-6 border border-gray-200">
      <div className="flex items-center mb-3">
        {IconComponent && (
          <IconComponent className="h-6 w-6 text-blue-500 mr-2" />
        )}
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      </div>
      {data && data.length > 0 ? (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {data.map((item) => (
            <li
              key={item.branchName}
              className="flex justify-between items-center text-sm text-gray-600 py-1 border-b border-gray-100 last:border-b-0"
            >
              <span>{item.branchName}</span>
              <span className="font-semibold text-gray-800">
                {item.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No data for today.</p>
      )}
    </div>
  );
}
