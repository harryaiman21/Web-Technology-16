"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (sbError) throw sbError;
      setIncidents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // --- SEARCH & FILTER LOGIC ---
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const tid = String(incident.tracking_id || '').toLowerCase();
      const summary = String(incident.issue_summary || '').toLowerCase();
      const idPart = incident.id ? incident.id.substring(0, 5).toLowerCase() : '';
      
      const matchesSearch = 
        tid.includes(normalizedQuery) || 
        summary.includes(normalizedQuery) ||
        idPart.includes(normalizedQuery);

      const matchesPriority = priorityFilter === 'All' || incident.priority === priorityFilter;
      const incidentDate = incident.created_at ? incident.created_at.split('T')[0] : '';
      const matchesDate = !dateFilter || incidentDate === dateFilter;

      return matchesSearch && matchesPriority && matchesDate;
    });
  }, [incidents, normalizedQuery, priorityFilter, dateFilter]);

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Incident Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Refreshing data...' : `Viewing ${filteredIncidents.length} incidents`}
          </p>
        </div>

        {/* --- FILTER BAR --- */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Search Keywords</label>
              <input 
                type="text"
                value={searchQuery}
                placeholder="ID, Summary, or Keywords..."
                className="px-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-[#D40511] outline-none text-sm"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Priority</label>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 w-full border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-[#D40511]"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Date Created</label>
                <input 
                  type="date"
                  value={dateFilter}
                  className="px-3 py-2 w-full border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#D40511]"
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {setSearchQuery(''); setPriorityFilter('All'); setDateFilter('');}}
                className="p-2 text-gray-400 hover:text-[#D40511] border rounded-lg transition-colors h-[38px] w-[38px] flex items-center justify-center"
                title="Reset Filters"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* --- TABLE: ID, SUMMARY, DATE, PRIORITY --- */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <table className="w-full text-left table-fixed">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-1/6 px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tracking ID</th>
                <th className="w-2/6 px-6 py-4 text-xs font-bold text-gray-500 uppercase">Issue Summary</th>
                <th className="w-1/6 px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date Created</th>
                <th className="w-1/6 px-6 py-4 text-xs font-bold text-gray-500 uppercase">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic animate-pulse">Fetching records...</td></tr>
              ) : filteredIncidents.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No matches found for your criteria.</td></tr>
              ) : (
                filteredIncidents.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-red-50/40 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/dashboard/${item.id}`)}
                  >
                    <td className="px-6 py-4 text-[#D40511] font-bold font-mono text-sm uppercase truncate">
                      {item.tracking_id || `ID-${item.id.substring(0, 5)}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      <p className="truncate font-medium">{item.issue_summary || 'No summary available'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase ${
                        item.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.priority || 'Low'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}