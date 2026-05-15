import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Formats the timestamp to a readable local string.
 * Uses your schema's 'created_at' field.
 */
const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default async function IncidentDetailsPage({ params }: Props) {
  // 1. Await params for Next.js 15 compatibility
  const { id } = await params;

  // 2. Fetch data based on your specific schema
  const { data: incident, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single();

  // 3. Robust Error Handling
  if (error) {
    console.error('Supabase Error:', error.message);
    return notFound();
  }

  if (!incident) {
    console.error('No incident found with ID:', id);
    return notFound();
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-black">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#D40511] transition-colors"
          >
            <span className="text-lg">←</span> Back to Dashboard
          </Link>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-white border rounded-full text-[10px] font-black uppercase text-gray-400">
              Source: {incident.source || 'Manual'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Incident Details</h1>
                  <p className="text-sm text-gray-500 font-mono mt-1">{incident.id}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase ${
                  incident.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {incident.priority || 'Low'}
                </span>
              </div>

              {/* Your requested change: incident_text titled as Issue Description */}
              <div className="mt-8">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Issue Description</h2>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {incident.incident_text || "No detailed description provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Metadata from your Schema */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Extra Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Drive Reference</p>
                  <p className="text-gray-700 mt-1 font-mono text-sm">{incident.drive_id || 'No Drive ID'}</p>
                </div>
                     {incident.file_path && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-700  uppercase">File Name</p>
                    <p className="text-xs text-gray-400 truncate mt-1">{incident.file_path}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase mb-4">Tracking Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tracking ID</label>
                  <p className="text-lg font-bold text-[#D40511] font-mono">{incident.tracking_id || 'UNSET'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    <p className="font-bold text-gray-700">{incident.status || 'Received'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1e1e1e] rounded-3xl p-6 text-white shadow-lg">
              <h3 className="text-sm font-black text-gray-500 uppercase mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Created At</label>
                  <p className="text-sm font-medium">{formatDate(incident.created_at)}</p>
                </div>
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}