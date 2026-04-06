import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useSessions } from '../hooks/useSessions';

const ToolsEmotionalProfileList: React.FC = () => {
  const { sessions, loading, error } = useSessions({ status: 'COMPLETED', limit: 100 });

  const completedSessions = [...sessions].sort((a, b) => {
    const aTime = new Date((a as any).scheduled_date || a.session_date).getTime();
    const bTime = new Date((b as any).scheduled_date || b.session_date).getTime();
    return bTime - aTime; // latest first
  });

  return (
    <div className="min-h-screen bg-gray-50 -mt-6 -mx-8 px-8 pt-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Emotional Profile</h1>
          <p className="text-gray-600 mt-2">Completed sessions (latest first).</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load completed sessions: {error.message}
          </div>
        ) : completedSessions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
            No completed sessions found.
          </div>
        ) : (
          <div className="space-y-4">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-gradient-to-r from-slate-950 to-blue-950 text-white rounded-xl p-5 shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-white/10 p-3 rounded-lg">
                      <Activity size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{session.patient_name || 'Unknown Patient'}</h3>
                      <p className="text-sm text-gray-300 mt-1">
                        {new Date((session as any).scheduled_date || session.session_date).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                        {session.session_type} | {session.duration_minutes} min
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/tools/emotional-profile/${session.id}`}
                    className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsEmotionalProfileList;
