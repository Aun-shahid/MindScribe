// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Bell, AlertTriangle, AlertCircle, TrendingDown, User, Calendar, Clock } from 'lucide-react';
// import therapistService from '../services/therapist.service';

// interface MoodAlert {
//   id: string;
//   patient_id: string;
//   patient_name: string;
//   severity: 'critical' | 'high' | 'medium' | 'low';
//   mood: string;
//   mood_score: number;
//   energy_level?: number;
//   anxiety_level?: number;
//   stress_level?: number;
//   triggers?: string[];
//   notes?: string;
//   created_at: string;
//   message: string;
// }

// interface AlertSummary {
//   total_alerts: number;
//   critical_alerts: number;
//   high_alerts: number;
//   medium_alerts: number;
//   patients_needing_attention: number;
//   total_mood_entries: number;
//   average_mood_score: number;
// }

// const Notifications = () => {
//   const navigate = useNavigate();
//   const [alerts, setAlerts] = useState<MoodAlert[]>([]);
//   const [summary, setSummary] = useState<AlertSummary | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [severityFilter, setSeverityFilter] = useState<string>('all');
//   const [daysFilter, setDaysFilter] = useState<number>(7);

//   useEffect(() => {
//     fetchMoodAlerts();
//   }, [severityFilter, daysFilter]);

//   const fetchMoodAlerts = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       // const data = await therapistService.getMoodAlerts(
//       //   undefined,
//       //   severityFilter === 'all' ? undefined : severityFilter,
//       //   daysFilter
//       // );
//       // setAlerts(data.alerts || []);
//       // setSummary(data.summary || null);
//     } catch (err) {
//       console.error('Failed to fetch mood alerts:', err);
//       setError('Failed to load mood alerts');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getSeverityConfig = (severity: string) => {
//     const configs = {
//       critical: {
//         color: 'bg-red-50 border-red-300',
//         textColor: 'text-red-800',
//         badgeColor: 'bg-red-100 text-red-800',
//         icon: AlertTriangle,
//         iconColor: 'text-red-600',
//       },
//       high: {
//         color: 'bg-orange-50 border-orange-300',
//         textColor: 'text-orange-800',
//         badgeColor: 'bg-orange-100 text-orange-800',
//         icon: AlertCircle,
//         iconColor: 'text-orange-600',
//       },
//       medium: {
//         color: 'bg-yellow-50 border-yellow-300',
//         textColor: 'text-yellow-800',
//         badgeColor: 'bg-yellow-100 text-yellow-800',
//         icon: TrendingDown,
//         iconColor: 'text-yellow-600',
//       },
//       low: {
//         color: 'bg-green-50 border-green-300',
//         textColor: 'text-green-800',
//         badgeColor: 'bg-green-100 text-green-800',
//         icon: Bell,
//         iconColor: 'text-green-600',
//       },
//     };
//     return configs[severity as keyof typeof configs] || configs.medium;
//   };

//   const formatTimeAgo = (dateString: string) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMs = now.getTime() - date.getTime();
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMs / 3600000);
//     const diffDays = Math.floor(diffMs / 86400000);

//     if (diffMins < 1) return 'Just now';
//     if (diffMins < 60) return `${diffMins} min ago`;
//     if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
//     if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
//     return date.toLocaleDateString();
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
//           <p className="text-gray-600 mt-4">Loading notifications...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600 mb-4">{error}</p>
//           <button
//             onClick={fetchMoodAlerts}
//             className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
//                 <Bell className="text-indigo-600" size={32} />
//                 Mood Alerts
//               </h1>
//               <p className="text-gray-600 mt-1">Monitor your patients' wellbeing</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Summary Cards */}
//         {summary && (
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//             <div className="bg-white rounded-lg shadow-sm border p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-600">Total Alerts</p>
//                   <p className="text-3xl font-bold text-gray-900">{summary.total_alerts}</p>
//                 </div>
//                 <Bell className="text-indigo-600" size={32} />
//               </div>
//             </div>

//             <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-red-600">Critical</p>
//                   <p className="text-3xl font-bold text-red-900">{summary.critical_alerts}</p>
//                 </div>
//                 <AlertTriangle className="text-red-600" size={32} />
//               </div>
//             </div>

//             <div className="bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-orange-600">High Priority</p>
//                   <p className="text-3xl font-bold text-orange-900">{summary.high_alerts}</p>
//                 </div>
//                 <AlertCircle className="text-orange-600" size={32} />
//               </div>
//             </div>

//             <div className="bg-white rounded-lg shadow-sm border p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-600">Patients Need Attention</p>
//                   <p className="text-3xl font-bold text-gray-900">{summary.patients_needing_attention}</p>
//                 </div>
//                 <User className="text-indigo-600" size={32} />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Filters */}
//         <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
//           <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Severity Level
//               </label>
//               <select
//                 value={severityFilter}
//                 onChange={(e) => setSeverityFilter(e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//               >
//                 <option value="all">All Severities</option>
//                 <option value="critical">Critical Only</option>
//                 <option value="high">High Priority Only</option>
//                 <option value="medium">Medium</option>
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Time Period
//               </label>
//               <select
//                 value={daysFilter}
//                 onChange={(e) => setDaysFilter(Number(e.target.value))}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//               >
//                 <option value={1}>Last 24 Hours</option>
//                 <option value={3}>Last 3 Days</option>
//                 <option value={7}>Last 7 Days</option>
//                 <option value={14}>Last 14 Days</option>
//                 <option value={30}>Last 30 Days</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Alerts List */}
//         <div className="space-y-4">
//           {alerts.length === 0 ? (
//             <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
//               <Bell className="mx-auto text-gray-400 mb-4" size={48} />
//               <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts</h3>
//               <p className="text-gray-600">
//                 No mood alerts for the selected filters. Your patients are doing well!
//               </p>
//             </div>
//           ) : (
//             alerts.map((alert) => {
//               const config = getSeverityConfig(alert.severity);
//               const Icon = config.icon;

//               return (
//                 <div
//                   key={alert.id}
//                   onClick={() => navigate(`/patients/${alert.patient_id}`)}
//                   className={`${config.color} border rounded-lg p-6 cursor-pointer hover:shadow-md transition-all`}
//                 >
//                   <div className="flex items-start justify-between mb-4">
//                     <div className="flex items-start gap-4 flex-1">
//                       <div className={`p-3 rounded-full ${config.badgeColor}`}>
//                         <Icon className={config.iconColor} size={24} />
//                       </div>
                      
//                       <div className="flex-1">
//                         <div className="flex items-center gap-3 mb-2">
//                           <h3 className="text-xl font-semibold text-gray-900">
//                             {alert.patient_name}
//                           </h3>
//                           <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${config.badgeColor}`}>
//                             {alert.severity}
//                           </span>
//                         </div>
                        
//                         <p className={`${config.textColor} font-medium mb-3`}>
//                           {alert.message}
//                         </p>

//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
//                           <div className="bg-white rounded-lg p-3">
//                             <p className="text-xs text-gray-600">Mood Score</p>
//                             <p className="text-lg font-bold text-gray-900">{alert.mood_score}/10</p>
//                           </div>
//                           {alert.energy_level !== undefined && (
//                             <div className="bg-white rounded-lg p-3">
//                               <p className="text-xs text-gray-600">Energy</p>
//                               <p className="text-lg font-bold text-green-600">{alert.energy_level}/10</p>
//                             </div>
//                           )}
//                           {alert.anxiety_level !== undefined && (
//                             <div className="bg-white rounded-lg p-3">
//                               <p className="text-xs text-gray-600">Anxiety</p>
//                               <p className="text-lg font-bold text-amber-600">{alert.anxiety_level}/10</p>
//                             </div>
//                           )}
//                           {alert.stress_level !== undefined && (
//                             <div className="bg-white rounded-lg p-3">
//                               <p className="text-xs text-gray-600">Stress</p>
//                               <p className="text-lg font-bold text-red-600">{alert.stress_level}/10</p>
//                             </div>
//                           )}
//                         </div>

//                         {alert.triggers && alert.triggers.length > 0 && (
//                           <div className="mb-3">
//                             <p className="text-sm font-medium text-gray-700 mb-2">Triggers:</p>
//                             <div className="flex flex-wrap gap-2">
//                               {alert.triggers.map((trigger, idx) => (
//                                 <span
//                                   key={idx}
//                                   className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border"
//                                 >
//                                   {trigger}
//                                 </span>
//                               ))}
//                             </div>
//                           </div>
//                         )}

//                         {alert.notes && (
//                           <div className="bg-white rounded-lg p-3 mb-3">
//                             <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
//                             <p className="text-sm text-gray-600">{alert.notes}</p>
//                           </div>
//                         )}

//                         <div className="flex items-center gap-4 text-sm text-gray-600">
//                           <div className="flex items-center gap-1">
//                             <Clock size={16} />
//                             {formatTimeAgo(alert.created_at)}
//                           </div>
//                           <div className="flex items-center gap-1">
//                             <Calendar size={16} />
//                             {new Date(alert.created_at).toLocaleDateString()}
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
//                       View Patient
//                     </button>
//                   </div>
//                 </div>
//               );
//             })
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Notifications;
