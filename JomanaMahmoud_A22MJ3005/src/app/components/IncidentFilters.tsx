"use client";

interface FilterProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  totalResults: number;
}

export default function IncidentFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  totalResults,
}: FilterProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-1 flex-col md:flex-row gap-4 w-full">
          {/* Text Search */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              placeholder="Search ID, Customer or Issue..."
              className="px-4 py-2 w-full border rounded-lg shadow-sm focus:ring-2 focus:ring-[#D40511] outline-none text-black pr-10"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg shadow-sm bg-white text-black outline-none focus:ring-2 focus:ring-[#D40511]"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        Showing {totalResults} matching incidents.
      </div>
    </div>
  );
}