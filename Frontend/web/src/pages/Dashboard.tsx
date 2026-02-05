// // src/pages/Dashboard.tsx
// import { useTherapistDashboard } from '../hooks/useTherapist';
// import { Link, useLocation } from 'react-router-dom';
// import { useState, useEffect } from 'react';
// import therapistService from '../services/therapist.service';

// interface SessionStats {
//   total_sessions: number;
//   completed_sessions: number;
//   cancelled_sessions: number;
//   upcoming_sessions: number;
//   average_duration: number;
//   total_patients: number;
//   by_status: Record<string, number>;
//   by_type: Record<string, number>;
// }

// const Dashboard = () => {
//   const { dashboard, loading, error, refreshDashboard } = useTherapistDashboard();
//   const location = useLocation();
//   const [successMessage, setSuccessMessage] = useState<string | null>(null);
//   const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
//   const [statsLoading, setStatsLoading] = useState(false);
//   const [statsDays, setStatsDays] = useState(30);

//   // Load session statistics
//   useEffect(() => {
//     const loadStats = async () => {
//       setStatsLoading(true);
//       try {
//         const stats = await therapistService.getSessionStats(statsDays);
//         setSessionStats(stats);
//       } catch (err) {
//         console.error('Failed to load session stats:', err);
//       } finally {
//         setStatsLoading(false);
//       }
//     };
//     loadStats();
//   }, [statsDays]);

//   // Check for success message from navigation
//   useEffect(() => {
//     if (location.state?.message) {
//       setSuccessMessage(location.state.message);
//       // Clear the message after 5 seconds
//       setTimeout(() => setSuccessMessage(null), 5000);
//       // Clear the location state
//       window.history.replaceState({}, document.title);
//     }
//   }, [location]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//         <p>Error loading dashboard: {error.message}</p>
//         <button 
//           onClick={refreshDashboard}
//           className="mt-2 text-sm underline hover:no-underline"
//         >
//           Try again
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Success Message */}
//       {successMessage && (
//         <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg flex items-center justify-between animate-fade-in">
//           <div className="flex items-center">
//             <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//             </svg>
//             <span className="font-medium">{successMessage}</span>
//           </div>
//           <button
//             onClick={() => setSuccessMessage(null)}
//             className="text-green-600 hover:text-green-800"
//           >
//             ×
//           </button>
//         </div>
//       )}

//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
//         <button
//           onClick={refreshDashboard}
//           className="btn-secondary text-sm"
//         >
//           Refresh
//         </button>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <div className="card">
//           <div className="flex items-center">
//             <div className="p-2 bg-blue-100 rounded-lg">
//               <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//               </svg>
//             </div>
//             <div className="ml-4">
//               <p className="text-sm font-medium text-gray-600">Total Patients</p>
//               <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.total_patients || 0}</p>
//             </div>
//           </div>
//         </div>

//         <div className="card">
//           <div className="flex items-center">
//             <div className="p-2 bg-green-100 rounded-lg">
//               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//               </svg>
//             </div>
//             <div className="ml-4">
//               <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
//               <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.upcoming_sessions || 0}</p>
//             </div>
//           </div>
//         </div>

//         <div className="card">
//           <div className="flex items-center">
//             <div className="p-2 bg-yellow-100 rounded-lg">
//               <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <div className="ml-4">
//               <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
//               <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.completed_sessions || 0}</p>
//             </div>
//           </div>
//         </div>

//         <div className="card">
//           <div className="flex items-center">
//             <div className="p-2 bg-purple-100 rounded-lg">
//               <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
//               </svg>
//             </div>
//             <div className="ml-4">
//               <p className="text-sm font-medium text-gray-600">Cancelled Sessions</p>
//               <p className="text-2xl font-bold text-gray-900">{dashboard?.stats?.cancelled_sessions || 0}</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Recent Sessions */}
//       <div className="card">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-medium text-gray-900">Upcoming Sessions</h2>
//           <Link to="/sessions" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
//             View all sessions
//           </Link>
//         </div>
        
//         {dashboard?.upcoming_sessions && dashboard.upcoming_sessions.length > 0 ? (
//           <div className="space-y-3">
//             {dashboard.upcoming_sessions
//               .filter((session: any) => {
//                 const sessionDate = new Date(session.session_date || session.scheduled_date);
//                 const now = new Date();
//                 // Show if status is UPCOMING, IN_PROGRESS, or RESCHEDULED and date is in the future
//                 return (
//                   ["UPCOMING", "IN_PROGRESS", "RESCHEDULED"].includes(session.status) &&
//                   sessionDate > now
//                 );
//               })
//               .sort((a: any, b: any) => {
//                 // Sort by soonest date
//                 const dateA = new Date(a.session_date || a.scheduled_date).getTime();
//                 const dateB = new Date(b.session_date || b.scheduled_date).getTime();
//                 return dateA - dateB;
//               })
//               .slice(0, 5)
//               .map((session: any) => {
//                 const sessionDate = session.session_date || session.scheduled_date;
//                 const formattedDate = sessionDate 
//                   ? new Date(sessionDate).toLocaleDateString('en-US', { 
//                       month: 'short', 
//                       day: 'numeric', 
//                       year: 'numeric',
//                       hour: '2-digit',
//                       minute: '2-digit'
//                     })
//                   : 'Date not set';
//                 const patientName = session.patient_name || session.patient?.full_name || 'Unknown Patient';
//                 return (
//                   <Link
//                     key={session.id}
//                     to={`/sessions/${session.id}`}
//                     className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
//                   >
//                     <div className="flex items-center space-x-3">
//                       <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
//                       <div>
//                         <p className="text-sm font-medium text-gray-900">{patientName}</p>
//                         <p className="text-xs text-gray-500">
//                           {formattedDate} - {session.session_type}
//                         </p>
//                       </div>
//                     </div>
//                     <span className={`px-2 py-1 text-xs rounded-full uppercase ${
//                       session.status === 'COMPLETED' 
//                         ? 'bg-green-100 text-green-800' 
//                         : session.status === 'IN_PROGRESS'
//                         ? 'bg-yellow-100 text-yellow-800'
//                         : session.status === 'UPCOMING'
//                         ? 'bg-blue-100 text-blue-800'
//                         : session.status === 'RESCHEDULED'
//                         ? 'bg-purple-100 text-purple-800'
//                         : 'bg-gray-100 text-gray-800'
//                     }`}>
//                       {session.status}
//                     </span>
//                   </Link>
//                 );
//               })}
//           </div>
//         ) : (
//           <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
//         )}
//       </div>

//       {/* Quick Actions */}
//       <div className="card">
//         <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <Link
//             to="/sessions/new"
//             className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
//           >
//             <div className="p-2 bg-blue-100 rounded-lg mr-3">
//               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//             </div>
//             <div>
//               <p className="font-medium text-blue-900">New Session</p>
//               <p className="text-sm text-blue-600">Start a therapy session</p>
//             </div>
//           </Link>

//           <Link
//             to="/patients"
//             className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
//           >
//             <div className="p-2 bg-green-100 rounded-lg mr-3">
//               <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//               </svg>
//             </div>
//             <div>
//               <p className="font-medium text-green-900">Manage Patients</p>
//               <p className="text-sm text-green-600">View and edit patients</p>
//             </div>
//           </Link>

//           <Link
//             to="/qr-code"
//             className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
//           >
//             <div className="p-2 bg-purple-100 rounded-lg mr-3">
//               <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
//               </svg>
//             </div>
//             <div>
//               <p className="font-medium text-purple-900">QR Code</p>
//               <p className="text-sm text-purple-600">Patient connection</p>
//             </div>
//           </Link>
//         </div>
//       </div>

//       {/* Session Statistics */}
//       <div className="card">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="text-lg font-medium text-gray-900">📊 Session Statistics</h2>
//           <select
//             value={statsDays}
//             onChange={(e) => setStatsDays(Number(e.target.value))}
//             className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           >
//             <option value={7}>Last 7 days</option>
//             <option value={30}>Last 30 days</option>
//             <option value={90}>Last 90 days</option>
//             <option value={365}>Last year</option>
//           </select>
//         </div>

//         {statsLoading ? (
//           <div className="flex items-center justify-center py-8">
//             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
//             <span className="ml-2 text-gray-500">Loading statistics...</span>
//           </div>
//         ) : sessionStats ? (
//           <div className="space-y-6">
//             {/* Main Stats */}
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               <div className="bg-blue-50 rounded-lg p-4 text-center">
//                 <p className="text-2xl font-bold text-blue-700">{sessionStats.total_sessions || 0}</p>
//                 <p className="text-sm text-blue-600">Total Sessions</p>
//               </div>
//               <div className="bg-green-50 rounded-lg p-4 text-center">
//                 <p className="text-2xl font-bold text-green-700">{sessionStats.completed_sessions || 0}</p>
//                 <p className="text-sm text-green-600">Completed</p>
//               </div>
//               <div className="bg-yellow-50 rounded-lg p-4 text-center">
//                 <p className="text-2xl font-bold text-yellow-700">{sessionStats.upcoming_sessions || 0}</p>
//                 <p className="text-sm text-yellow-600">Upcoming</p>
//               </div>
//               <div className="bg-purple-50 rounded-lg p-4 text-center">
//                 <p className="text-2xl font-bold text-purple-700">{sessionStats.average_duration || 0}</p>
//                 <p className="text-sm text-purple-600">Avg. Duration (min)</p>
//               </div>
//             </div>

//             {/* Breakdown by Type */}
//             {sessionStats.by_type && Object.keys(sessionStats.by_type).length > 0 && (
//               <div>
//                 <h3 className="text-sm font-medium text-gray-700 mb-3">Sessions by Type</h3>
//                 <div className="flex flex-wrap gap-2">
//                   {Object.entries(sessionStats.by_type).map(([type, count]) => (
//                     <span
//                       key={type}
//                       className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
//                     >
//                       {type}: <strong>{count}</strong>
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Breakdown by Status */}
//             {sessionStats.by_status && Object.keys(sessionStats.by_status).length > 0 && (
//               <div>
//                 <h3 className="text-sm font-medium text-gray-700 mb-3">Sessions by Status</h3>
//                 <div className="flex flex-wrap gap-2">
//                   {Object.entries(sessionStats.by_status).map(([status, count]) => {
//                     const colors: Record<string, string> = {
//                       'COMPLETED': 'bg-green-100 text-green-700',
//                       'SCHEDULED': 'bg-blue-100 text-blue-700',
//                       'IN_PROGRESS': 'bg-yellow-100 text-yellow-700',
//                       'CANCELLED': 'bg-red-100 text-red-700',
//                     };
//                     return (
//                       <span
//                         key={status}
//                         className={`px-3 py-1.5 rounded-full text-sm ${colors[status] || 'bg-gray-100 text-gray-700'}`}
//                       >
//                         {status}: <strong>{count}</strong>
//                       </span>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : (
//           <p className="text-center text-gray-500 py-4">No statistics available</p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Dashboard;


import { useTherapistDashboard } from '../hooks/useTherapist';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import therapistService from '../services/therapist.service';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  upcoming_sessions: number;
  average_duration: number;
  total_patients: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

const Dashboard = () => {
  const { dashboard, loading, error, refreshDashboard } = useTherapistDashboard();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(30);
  const { user} = useAuth();

  // Load session statistics
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const stats = await therapistService.getSessionStats(statsDays);
        setSessionStats(stats);
      } catch (err) {
        console.error('Failed to load session stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [statsDays]);

  // Check for success message from navigation
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(null), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Prepare pie chart data
  const pieChartData = sessionStats ? [
    { name: 'Completed', value: sessionStats.completed_sessions || 0, color: '#10b981' },
    { name: 'Upcoming', value: sessionStats.upcoming_sessions || 0, color: '#3b82f6' },
    { name: 'Cancelled', value: sessionStats.cancelled_sessions || 0, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <p className="font-medium">Error loading dashboard: {error.message}</p>
        <button 
          onClick={refreshDashboard}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Good Evening, {user?.username}</h1>
          <p className="text-gray-600">Here's what's happening with your practice today</p>
        </div>

        {/* Stats Cards - Colorful Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Patients Card */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-pink-500 to-pink-600 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-pink-100 text-sm font-medium mb-1">Active Patients</p>
                <h2 className="text-4xl font-bold">{dashboard?.stats?.total_patients || 0}</h2>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
            
            <div className="absolute bottom-0 right-0 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>

          {/* Total Sessions Card */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Sessions</p>
                <h2 className="text-4xl font-bold">{sessionStats?.total_sessions || 0}</h2>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="absolute bottom-0 right-0 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Upcoming Sessions Card */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-cyan-400 to-cyan-500 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-cyan-100 text-sm font-medium mb-1">Upcoming Sessions</p>
                <h2 className="text-4xl font-bold">{sessionStats?.upcoming_sessions || 0}</h2>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-sm">
              {/* <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg> */}
              {/* <span>+15.4% from last week</span> */}
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Completed Sessions Card */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-orange-400 to-orange-500 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Completed Sessions</p>
                <h2 className="text-4xl font-bold">{dashboard?.stats?.completed_sessions || 0}</h2>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-sm">
              {/* <svg className="w-4 h-4 mr-1 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>-2.3% from last week</span> */}
            </div>
            <div className="absolute bottom-0 right-0 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Start Session Button */}
        <div className="flex justify-center">
          <Link
            to="/sessions/new"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start Session
          </Link>
        </div>

         {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/patients"
              className="flex items-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:shadow-lg transition-all duration-200 group border border-green-100"
            >
              <div className="p-3 bg-green-100 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-green-700">Manage Patients</p>
                <p className="text-sm text-gray-600">View and edit patients</p>
              </div>
            </Link>

            <Link
              to="/qr-code"
              className="flex items-center p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl hover:shadow-lg transition-all duration-200 group border border-purple-100"
            >
              <div className="p-3 bg-purple-100 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-purple-700">QR Code</p>
                <p className="text-sm text-gray-600">Patient connection</p>
              </div>
            </Link>

            <button
              onClick={refreshDashboard}
              className="flex items-center p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl hover:shadow-lg transition-all duration-200 group border border-blue-100"
            >
              <div className="p-3 bg-blue-100 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-700">Refresh Dashboard</p>
                <p className="text-sm text-gray-600">Update all data</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session Analytics with Pie Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Session Analytics</h2>
              <select
                value={statsDays}
                onChange={(e) => setStatsDays(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            
            {statsLoading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-500">Loading statistics...</span>
              </div>
            ) : sessionStats && pieChartData.length > 0 ? (
              <div className="space-y-6">
                {/* Pie Chart with 3D Effect */}
<div className="h-80 relative">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      {/* Shadow layer for 3D effect */}
      <Pie
        data={pieChartData}
        cx="50%"
        cy="52%"
        outerRadius={125}
        fill="#000"
        dataKey="value"
        opacity={0.1}
      >
        {pieChartData.map((_entry, index) => (
          <Cell key={`shadow-${index}`} fill="#000" />
        ))}
      </Pie>
      {/* Main pie chart */}
      <Pie
        data={pieChartData}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={renderCustomizedLabel}
        outerRadius={120}
        innerRadius={40}
        fill="#8884d8"
        dataKey="value"
        paddingAngle={3}
        stroke="#fff"
        strokeWidth={3}
      >
        {pieChartData.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={entry.color}
            style={{
              filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </Pie>
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#fff', 
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        formatter={(value: any) => [`${value} sessions`, '']}
      />
    </PieChart>
  </ResponsiveContainer>
  {/* Center label for 3D effect */}
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
    <p className="text-3xl font-bold text-gray-800">{sessionStats.total_sessions}</p>
    <p className="text-xs text-gray-500 mt-1">Total</p>
  </div>
</div>

                {/* Custom Legend Below Pie Chart */}
                <div className="flex justify-center items-center gap-8 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Completed: <strong className="text-green-700">{sessionStats.completed_sessions || 0}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Upcoming: <strong className="text-blue-700">{sessionStats.upcoming_sessions || 0}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">
                      Cancelled: <strong className="text-red-700">{sessionStats.cancelled_sessions || 0}</strong>
                    </span>
                  </div>
                </div>

                {/* Session Types */}
                {sessionStats.by_type && Object.keys(sessionStats.by_type).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Sessions by Type</h3>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(sessionStats.by_type).map(([type, count]) => (
                        <span
                          key={type}
                          className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium shadow-sm border border-gray-200"
                        >
                          {type}: <strong className="text-purple-700">{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p className="text-gray-500">No session data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Patient Status - Takes 1 column */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Patient Status</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-purple-600">{dashboard?.stats?.total_patients || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Active Patients</p>
                  </div>
                </div>
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" fill="none" stroke="#e5e7eb" strokeWidth="16" />
                  <circle cx="96" cy="96" r="80" fill="none" stroke="#ec4899" strokeWidth="16" 
                    strokeDasharray="502" strokeDashoffset="125" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-pink-400 rounded-full mr-2"></div>
                  <span className="text-gray-600">Active</span>
                </div>
                <span className="font-semibold text-gray-900">{dashboard?.stats?.total_patients || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                  <span className="text-gray-600">In Progress</span>
                </div>
                <span className="font-semibold text-gray-900">{dashboard?.stats?.upcoming_sessions || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
<div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 flex items-center">
        <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Upcoming Sessions
      </h2>
      <p className="text-sm text-gray-500 mt-1">Your scheduled appointments</p>
    </div>
    <Link 
      to="/sessions" 
      className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors flex items-center group"
    >
      View all
      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  </div>
  
  {dashboard?.upcoming_sessions && dashboard.upcoming_sessions.length > 0 ? (
    <div className="space-y-4">
      {dashboard.upcoming_sessions
        .filter((session: any) => {
          const sessionDate = new Date(session.session_date || session.scheduled_date);
          const now = new Date();
          return (
            ["UPCOMING", "IN_PROGRESS", "RESCHEDULED"].includes(session.status) &&
            sessionDate > now
          );
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.session_date || a.scheduled_date).getTime();
          const dateB = new Date(b.session_date || b.scheduled_date).getTime();
          return dateA - dateB;
        })
        .slice(0, 5)
        .map((session: any) => {
          const sessionDate = session.session_date || session.scheduled_date;
          const date = new Date(sessionDate);
          const formattedDate = sessionDate 
            ? date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              })
            : 'Date not set';
          const formattedTime = sessionDate
            ? date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })
            : '';
          const patientName = session.patient_name || session.patient?.full_name || 'Unknown Patient';
          const initials = patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          
          return (
            <Link
              key={session.id}
              to={`/sessions/${session.id}`}
              className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-lg border border-gray-200 hover:border-purple-300 transition-all duration-300 group"
            >
              {/* Left: Avatar and Patient Info */}
              <div className="flex items-center flex-1 min-w-0">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                    {patientName}
                  </h3>
                  <div className="flex items-center mt-1 text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="truncate">{session.session_type}</span>
                  </div>
                </div>
              </div>

              {/* Center: Date and Time */}
              <div className="hidden md:flex flex-col items-center px-6 border-l border-r border-gray-200">
                <div className="flex items-center text-gray-700 font-medium">
                  <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formattedDate}
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <svg className="w-4 h-4 mr-1.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formattedTime}
                </div>
              </div>

              {/* Right: Status Badge */}
              <div className="ml-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                  session.status === 'COMPLETED' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                    : session.status === 'IN_PROGRESS'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                    : session.status === 'UPCOMING'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : session.status === 'RESCHEDULED'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  <span className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse"></span>
                  {session.status}
                </span>
              </div>

              {/* Arrow icon */}
              <svg className="w-5 h-5 ml-3 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
    </div>
  ) : (
    <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-dashed border-purple-200">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-gray-600 font-medium mb-2">No upcoming sessions scheduled</p>
      <p className="text-gray-500 text-sm mb-4">Start by creating a new session with your patients</p>
      <Link
        to="/sessions/new"
        className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Schedule Session
      </Link>
    </div>
  )}
</div>
      </div>
    </div>
  );
};

export default Dashboard;