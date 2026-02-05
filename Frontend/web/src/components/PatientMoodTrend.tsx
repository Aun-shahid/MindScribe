// import { useState, useEffect } from 'react';
// import therapistService from '../services/therapist.service';

// interface MoodEntry {
//   id: string;
//   patient_id: string;
//   patient_name: string;
//   mood: string;
//   mood_score: number;
//   energy_level?: number;
//   anxiety_level?: number;
//   stress_level?: number;
//   triggers?: string[];
//   notes?: string;
//   created_at: string;
// }

// interface PatientMoodTrendProps {
//   patientId: string;
//   patientName: string;
// }

// const MOOD_EMOJIS: Record<string, string> = {
//   happy: '😊',
//   sad: '😢',
//   angry: '😠',
//   anxious: '😰',
//   calm: '😌',
//   peaceful: '😌',
//   excited: '🤗',
//   overwhelmed: '😫',
//   stressed: '😓',
//   tired: '😴',
//   grateful: '🙏',
//   hopeful: '🌟',
//   lonely: '😔',
//   frustrated: '😤',
//   content: '😊',
//   worried: '😟',
//   confused: '😕',
//   relaxed: '😌',
// };

// const MOOD_COLORS: Record<string, string> = {
//   happy: 'bg-yellow-100 border-yellow-400',
//   sad: 'bg-blue-100 border-blue-400',
//   angry: 'bg-red-100 border-red-400',
//   anxious: 'bg-purple-100 border-purple-400',
//   calm: 'bg-green-100 border-green-400',
//   peaceful: 'bg-green-100 border-green-400',
//   excited: 'bg-orange-100 border-orange-400',
//   overwhelmed: 'bg-red-100 border-red-400',
//   stressed: 'bg-amber-100 border-amber-400',
//   tired: 'bg-gray-100 border-gray-400',
//   grateful: 'bg-pink-100 border-pink-400',
//   hopeful: 'bg-teal-100 border-teal-400',
//   lonely: 'bg-blue-100 border-blue-400',
//   frustrated: 'bg-red-100 border-red-400',
//   content: 'bg-green-100 border-green-400',
//   worried: 'bg-amber-100 border-amber-400',
//   confused: 'bg-gray-100 border-gray-400',
//   relaxed: 'bg-green-100 border-green-400',
// };

// const PatientMoodTrend: React.FC<PatientMoodTrendProps> = ({ patientId }) => {
//   const [moodData, setMoodData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedDay, setSelectedDay] = useState<MoodEntry | null>(null);


//   useEffect(() => {
//     fetchMoodData();
//   }, [patientId]);

//   const fetchMoodData = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       console.log('[PatientMoodTrend] Fetching mood trend for patient:', patientId);
//       const data = await therapistService.getMoodTrend(patientId);
//       setMoodData(data);
//     } catch (err) {
//       console.error('Failed to fetch mood trend:', err);
//       setError('Failed to load mood data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getLast7Days = () => {
//     const days = [];
//     const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
//     for (let i = 6; i >= 0; i--) {
//       const date = new Date();
//       date.setDate(date.getDate() - i);
//       days.push({
//         date: date,
//         dayName: dayNames[date.getDay()],
//         dateStr: date.toISOString().split('T')[0],
//       });
//     }
//     return days;
//   };


//   // Support new API response: 'trend' (array), 'dominant_moods' (array), 'average_intensity' (number|null)
//   const getMoodForDay = (dateStr: string) => {
//     const trendArr = moodData?.trend || moodData?.mood_trend;
//     if (!trendArr) return null;
//     const entry = trendArr.find((e: any) => e.date === dateStr);
//     if (!entry) return null;
//     // Use first dominant mood if available, else undefined
//     const mood = Array.isArray(entry.dominant_moods) && entry.dominant_moods.length > 0 ? entry.dominant_moods[0] : undefined;
//     // If average_intensity is null, show 0 for bar height
//     return {
//       id: entry.date,
//       patient_id: patientId,
//       patient_name: '',
//       mood: mood,
//       mood_score: entry.average_intensity ?? 0,
//       created_at: entry.date,
//     };
//   };

//   const days = getLast7Days();

//   if (loading) {
//     return (
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//         <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 7-Day Mood Trend</h3>
//         <div className="flex items-center justify-center h-40">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//         <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 7-Day Mood Trend</h3>
//         <div className="text-center py-8">
//           <p className="text-red-600">{error}</p>
//           <button
//             onClick={fetchMoodData}
//             className="mt-4 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//       <div className="flex items-center justify-between mb-6">
//         <h3 className="text-lg font-semibold text-gray-900">📊 7-Day Mood Trend</h3>
//         {moodData?.statistics && (
//           <div className="text-sm text-gray-600">
//             Avg Intensity: <span className="font-semibold">{moodData.statistics.average_intensity?.toFixed(1) || 'N/A'}</span>
//           </div>
//         )}
//       </div>

//       {/* Mood Graph */}
//       <div className="mb-6">
//         <div className="flex items-end justify-between space-x-2 h-48">
//           {days.map((day) => {
//             const moodEntry = getMoodForDay(day.dateStr);
//             const hasData = moodEntry !== null;
//             const emoji = hasData && moodEntry.mood ? MOOD_EMOJIS[moodEntry.mood.toLowerCase()] || '😐' : '—';
//             const colorClass = hasData && moodEntry.mood ? MOOD_COLORS[moodEntry.mood.toLowerCase()] : 'bg-gray-50 border-gray-200';
//             const isSelected = selectedDay?.id === moodEntry?.id;

//             return (
//               <div key={day.dateStr} className="flex-1 flex flex-col items-center">
//                 <button
//                   onClick={() => setSelectedDay(moodEntry)}
//                   disabled={!hasData}
//                   className={`w-full rounded-lg border-2 transition-all ${colorClass} ${
//                     isSelected ? 'ring-2 ring-indigo-500 scale-105' : ''
//                   } ${hasData ? 'hover:scale-105 cursor-pointer' : 'cursor-default opacity-40'}`}
//                   style={{
//                     height: hasData && moodEntry && moodEntry.mood_score > 0 ? `${(moodEntry.mood_score / 10) * 100}%` : '20%',
//                     minHeight: '3rem',
//                   }}
//                 >
//                   <div className="flex flex-col items-center justify-center h-full p-2">
//                     <span className="text-2xl">{emoji}</span>
//                     {hasData && moodEntry && moodEntry.mood_score > 0 && (
//                       <span className="text-xs font-semibold mt-1">{moodEntry.mood_score}/10</span>
//                     )}
//                   </div>
//                 </button>
//                 <div className="mt-2 text-center">
//                   <div className="text-xs font-medium text-gray-700">{day.dayName}</div>
//                   <div className="text-xs text-gray-500">{day.date.getDate()}</div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Selected Day Details */}
//       {selectedDay && (
//         <div className="border-t pt-4">
//           <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
//             <div className="flex items-start justify-between mb-3">
//               <div>
//                 <h4 className="font-semibold text-gray-900 flex items-center gap-2">
//                   <span className="text-2xl">
//                     {MOOD_EMOJIS[selectedDay.mood?.toLowerCase()] || '😐'}
//                   </span>
//                   <span className="capitalize">{selectedDay.mood}</span>
//                 </h4>
//                 <p className="text-sm text-gray-600">
//                   {new Date(selectedDay.created_at).toLocaleDateString('en-US', {
//                     weekday: 'long',
//                     month: 'long',
//                     day: 'numeric',
//                   })}
//                 </p>
//               </div>
//               <button
//                 onClick={() => setSelectedDay(null)}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             </div>

//             {/* Mood Metrics */}
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
//               <div className="bg-white rounded-lg p-3">
//                 <p className="text-xs text-gray-600">Mood Score</p>
//                 <p className="text-lg font-bold text-indigo-600">{selectedDay.mood_score}/10</p>
//               </div>
//               {selectedDay.energy_level !== undefined && (
//                 <div className="bg-white rounded-lg p-3">
//                   <p className="text-xs text-gray-600">Energy</p>
//                   <p className="text-lg font-bold text-green-600">{selectedDay.energy_level}/10</p>
//                 </div>
//               )}
//               {selectedDay.anxiety_level !== undefined && (
//                 <div className="bg-white rounded-lg p-3">
//                   <p className="text-xs text-gray-600">Anxiety</p>
//                   <p className="text-lg font-bold text-amber-600">{selectedDay.anxiety_level}/10</p>
//                 </div>
//               )}
//               {selectedDay.stress_level !== undefined && (
//                 <div className="bg-white rounded-lg p-3">
//                   <p className="text-xs text-gray-600">Stress</p>
//                   <p className="text-lg font-bold text-red-600">{selectedDay.stress_level}/10</p>
//                 </div>
//               )}
//             </div>

//             {/* Triggers */}
//             {selectedDay.triggers && selectedDay.triggers.length > 0 && (
//               <div className="mb-3">
//                 <p className="text-sm font-medium text-gray-700 mb-2">Triggers:</p>
//                 <div className="flex flex-wrap gap-2">
//                   {selectedDay.triggers.map((trigger, idx) => (
//                     <span
//                       key={idx}
//                       className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border border-gray-200"
//                     >
//                       {trigger}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Notes */}
//             {selectedDay.notes && (
//               <div>
//                 <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
//                 <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
//                   {selectedDay.notes}
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Summary Stats */}
//       {moodData?.statistics && (
//         <div className="border-t pt-4 mt-4">
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//             <div className="text-center">
//               <p className="text-2xl font-bold text-gray-900">{moodData.statistics.total_entries || 0}</p>
//               <p className="text-xs text-gray-600">Total Entries</p>
//             </div>
//             {/* Add more stats if needed from moodData.statistics */}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PatientMoodTrend;






import { useState, useEffect } from 'react';
import therapistService from '../services/therapist.service';

interface MoodEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  mood: string;
  mood_score: number;
  energy_level?: number;
  anxiety_level?: number;
  stress_level?: number;
  triggers?: string[];
  notes?: string;
  created_at: string;
}

interface PatientMoodTrendProps {
  patientId: string;
  patientName: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  calm: '😌',
  peaceful: '😌',
  excited: '🤗',
  overwhelmed: '😫',
  stressed: '😓',
  tired: '😴',
  grateful: '🙏',
  hopeful: '🌟',
  lonely: '😔',
  frustrated: '😤',
  content: '😊',
  worried: '😟',
  confused: '😕',
  relaxed: '😌',
};



const PatientMoodTrend: React.FC<PatientMoodTrendProps> = ({ patientId }) => {
  const [moodData, setMoodData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<MoodEntry | null>(null);


  useEffect(() => {
    fetchMoodData();
  }, [patientId]);

  const fetchMoodData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[PatientMoodTrend] Fetching mood trend for patient:', patientId);
      const data = await therapistService.getMoodTrend(patientId);
      setMoodData(data);
    } catch (err) {
      console.error('Failed to fetch mood trend:', err);
      setError('Failed to load mood data');
    } finally {
      setLoading(false);
    }
  };

  const getLast7Days = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date,
        dayName: dayNames[date.getDay()],
        dateStr: date.toISOString().split('T')[0],
      });
    }
    return days;
  };


  // Support new API response: 'trend' (array), 'dominant_moods' (array), 'average_intensity' (number|null)
  const getMoodForDay = (dateStr: string) => {
    const trendArr = moodData?.trend || moodData?.mood_trend;
    if (!trendArr) return null;
    const entry = trendArr.find((e: any) => e.date === dateStr);
    if (!entry) return null;
    // Use first dominant mood if available, else undefined
    const mood = Array.isArray(entry.dominant_moods) && entry.dominant_moods.length > 0 ? entry.dominant_moods[0] : undefined;
    // If average_intensity is null, show 0 for bar height
    return {
      id: entry.date,
      patient_id: patientId,
      patient_name: '',
      mood: mood,
      mood_score: entry.average_intensity ?? 0,
      created_at: entry.date,
    };
  };

  const days = getLast7Days();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-xl shadow-lg border border-purple-100 p-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          📊 7-Day Mood Journey
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-purple-600 absolute top-0"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-xl shadow-lg border border-purple-100 p-8">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          📊 7-Day Mood Journey
        </h3>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😔</div>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-gray-500 text-sm mb-6">Unable to load mood trend data</p>
          <button
            onClick={fetchMoodData}
            className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-xl shadow-lg border border-purple-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            📊 7-Day Mood Journey
          </h3>
          <p className="text-sm text-gray-600 mt-1">Track emotional patterns over the week</p>
        </div>
        {moodData?.statistics && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-200">
            <p className="text-xs text-purple-600 font-medium">Average Intensity</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {moodData.statistics.average_intensity?.toFixed(1) || 'N/A'}
            </p>
          </div>
        )}
      </div>

      {/* Beautiful Mood Graph with Purple Gradients */}
      <div className="mb-8 relative">
        {/* Grid lines for better readability */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none mb-12">
          {[10, 7.5, 5, 2.5, 0].map((val) => (
            <div key={val} className="flex items-center">
              <span className="text-xs text-purple-400 w-8 -ml-10">{val}</span>
              <div className="flex-1 border-t border-purple-100"></div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="flex items-end justify-between gap-3 h-64 relative">
          {days.map((day) => {
            const moodEntry = getMoodForDay(day.dateStr);
            const hasData = moodEntry !== null;
            const emoji = hasData && moodEntry.mood ? MOOD_EMOJIS[moodEntry.mood.toLowerCase()] || '😐' : '—';
            const isSelected = selectedDay?.id === moodEntry?.id;
            const barHeight = hasData && moodEntry && moodEntry.mood_score > 0 
              ? `${(moodEntry.mood_score / 10) * 100}%` 
              : '8%';

            return (
              <div key={day.dateStr} className="flex-1 flex flex-col items-center group">
                {/* Emoji floating above bar */}
                {hasData && (
                  <div className="mb-2 transform transition-all group-hover:-translate-y-2 group-hover:scale-125">
                    <span className="text-3xl drop-shadow-lg filter animate-bounce-subtle">
                      {emoji}
                    </span>
                  </div>
                )}

                {/* Beautiful Gradient Bar */}
                <div className="relative w-full flex flex-col items-center">
                  <button
                    onClick={() => setSelectedDay(moodEntry)}
                    disabled={!hasData}
                    className={`w-full rounded-t-xl transition-all duration-300 relative overflow-hidden ${
                      isSelected ? 'ring-4 ring-purple-400 ring-opacity-50 scale-105 shadow-2xl' : 'shadow-lg'
                    } ${hasData ? 'hover:scale-105 hover:shadow-2xl cursor-pointer' : 'cursor-default opacity-30'}`}
                    style={{
                      height: barHeight,
                      minHeight: hasData ? '2rem' : '1rem',
                      background: hasData 
                        ? `linear-gradient(to top, 
                            rgb(147, 51, 234), 
                            rgb(168, 85, 247), 
                            rgb(192, 132, 252))`
                        : 'linear-gradient(to top, rgb(229, 231, 235), rgb(243, 244, 246))',
                    }}
                  >
                    {/* Shimmer effect */}
                    {hasData && (
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    )}
                    
                    {/* Score display */}
                    {hasData && moodEntry && moodEntry.mood_score > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                          <span className="text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {moodEntry.mood_score}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Glow effect on hover */}
                    {hasData && (
                      <div className="absolute inset-0 bg-purple-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
                    )}
                  </button>

                  {/* Base of the bar */}
                  {hasData && (
                    <div className="w-full h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 rounded-b-xl shadow-md"></div>
                  )}
                </div>

                {/* Day labels */}
                <div className="mt-3 text-center">
                  <div className={`text-sm font-bold ${isSelected ? 'text-purple-600' : 'text-gray-700'} transition-colors`}>
                    {day.dayName}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-purple-500' : 'text-gray-500'} transition-colors`}>
                    {day.date.getDate()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
      `}</style>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="border-t border-purple-100 pt-6">
          <div className="bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 rounded-xl p-6 border border-purple-200 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                  <span className="text-4xl">
                    {MOOD_EMOJIS[selectedDay.mood?.toLowerCase()] || '😐'}
                  </span>
                  <span className="capitalize bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {selectedDay.mood}
                  </span>
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedDay.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-white/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mood Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200 shadow-sm">
                <p className="text-xs text-purple-600 font-medium mb-1">Mood Score</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {selectedDay.mood_score}/10
                </p>
              </div>
              {selectedDay.energy_level !== undefined && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200 shadow-sm">
                  <p className="text-xs text-green-600 font-medium mb-1">Energy</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {selectedDay.energy_level}/10
                  </p>
                </div>
              )}
              {selectedDay.anxiety_level !== undefined && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200 shadow-sm">
                  <p className="text-xs text-amber-600 font-medium mb-1">Anxiety</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {selectedDay.anxiety_level}/10
                  </p>
                </div>
              )}
              {selectedDay.stress_level !== undefined && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200 shadow-sm">
                  <p className="text-xs text-red-600 font-medium mb-1">Stress</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                    {selectedDay.stress_level}/10
                  </p>
                </div>
              )}
            </div>

            {/* Triggers */}
            {selectedDay.triggers && selectedDay.triggers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-purple-900 mb-3">🎯 Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDay.triggers.map((trigger, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-white/80 backdrop-blur-sm text-purple-700 rounded-full text-sm border border-purple-200 shadow-sm hover:shadow-md transition-shadow font-medium"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedDay.notes && (
              <div>
                <p className="text-sm font-semibold text-purple-900 mb-3">📝 Notes:</p>
                <p className="text-sm text-gray-700 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200 shadow-sm leading-relaxed">
                  {selectedDay.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {moodData?.statistics && (
        <div className="border-t border-purple-100 pt-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {moodData.statistics.total_entries || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1 font-medium">Total Entries</p>
            </div>
            {/* Add more stats if needed from moodData.statistics */}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMoodTrend;
