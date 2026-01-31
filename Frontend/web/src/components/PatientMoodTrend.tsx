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

const MOOD_COLORS: Record<string, string> = {
  happy: 'bg-yellow-100 border-yellow-400',
  sad: 'bg-blue-100 border-blue-400',
  angry: 'bg-red-100 border-red-400',
  anxious: 'bg-purple-100 border-purple-400',
  calm: 'bg-green-100 border-green-400',
  peaceful: 'bg-green-100 border-green-400',
  excited: 'bg-orange-100 border-orange-400',
  overwhelmed: 'bg-red-100 border-red-400',
  stressed: 'bg-amber-100 border-amber-400',
  tired: 'bg-gray-100 border-gray-400',
  grateful: 'bg-pink-100 border-pink-400',
  hopeful: 'bg-teal-100 border-teal-400',
  lonely: 'bg-blue-100 border-blue-400',
  frustrated: 'bg-red-100 border-red-400',
  content: 'bg-green-100 border-green-400',
  worried: 'bg-amber-100 border-amber-400',
  confused: 'bg-gray-100 border-gray-400',
  relaxed: 'bg-green-100 border-green-400',
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
      console.log('[PatientMoodTrend] Fetching mood data for patient:', patientId);
      
      // First, try without patient filter to see if endpoint works at all
      const dataAll = await therapistService.getMoodAlerts(undefined, undefined, 7);
      console.log('[PatientMoodTrend] All mood data (no filter):', dataAll);
      console.log('[PatientMoodTrend] All recent entries count:', dataAll?.recent_mood_entries?.length);
      
      // Then try with patient filter
      const data = await therapistService.getMoodAlerts(patientId, undefined, 7);
      console.log('[PatientMoodTrend] Filtered mood data (with patient_id):', data);
      console.log('[PatientMoodTrend] Filtered recent mood entries count:', data?.recent_mood_entries?.length);
      console.log('[PatientMoodTrend] Filtered alerts count:', data?.alerts?.length);
      
      // Check if we have data without filter but not with filter
      if (dataAll?.recent_mood_entries?.length > 0 && data?.recent_mood_entries?.length === 0) {
        console.warn('[PatientMoodTrend] ⚠️ ISSUE DETECTED: Data exists without filter but not with patient_id filter!');
        console.warn('[PatientMoodTrend] This suggests the patient_id being sent might not match what the backend expects.');
        console.warn('[PatientMoodTrend] Patient ID being sent:', patientId);
        console.warn('[PatientMoodTrend] All entries patient IDs:', dataAll.recent_mood_entries.map((e: any) => e.patient_id));
      }
      
      setMoodData(data);
    } catch (err) {
      console.error('Failed to fetch mood data:', err);
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

  const getMoodForDay = (dateStr: string): MoodEntry | null => {
    if (!moodData?.recent_mood_entries) return null;
    
    return moodData.recent_mood_entries.find((entry: MoodEntry) => {
      const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
      return entryDate === dateStr;
    }) || null;
  };

  const days = getLast7Days();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 7-Day Mood Trend</h3>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 7-Day Mood Trend</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMoodData}
            className="mt-4 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">📊 7-Day Mood Trend</h3>
        {moodData?.summary && (
          <div className="text-sm text-gray-600">
            Avg Score: <span className="font-semibold">{moodData.summary.average_mood_score?.toFixed(1) || 'N/A'}</span>
          </div>
        )}
      </div>

      {/* Mood Graph */}
      <div className="mb-6">
        <div className="flex items-end justify-between space-x-2 h-48">
          {days.map((day) => {
            const moodEntry = getMoodForDay(day.dateStr);
            const hasData = moodEntry !== null;
            const emoji = hasData && moodEntry.mood ? MOOD_EMOJIS[moodEntry.mood.toLowerCase()] || '😐' : '—';
            const colorClass = hasData && moodEntry.mood ? MOOD_COLORS[moodEntry.mood.toLowerCase()] : 'bg-gray-50 border-gray-200';
            const isSelected = selectedDay?.id === moodEntry?.id;

            return (
              <div key={day.dateStr} className="flex-1 flex flex-col items-center">
                <button
                  onClick={() => setSelectedDay(moodEntry)}
                  disabled={!hasData}
                  className={`w-full rounded-lg border-2 transition-all ${colorClass} ${
                    isSelected ? 'ring-2 ring-indigo-500 scale-105' : ''
                  } ${hasData ? 'hover:scale-105 cursor-pointer' : 'cursor-default opacity-40'}`}
                  style={{
                    height: hasData && moodEntry ? `${(moodEntry.mood_score / 10) * 100}%` : '20%',
                    minHeight: '3rem',
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    <span className="text-2xl">{emoji}</span>
                    {hasData && moodEntry && (
                      <span className="text-xs font-semibold mt-1">{moodEntry.mood_score}/10</span>
                    )}
                  </div>
                </button>
                <div className="mt-2 text-center">
                  <div className="text-xs font-medium text-gray-700">{day.dayName}</div>
                  <div className="text-xs text-gray-500">{day.date.getDate()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="border-t pt-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">
                    {MOOD_EMOJIS[selectedDay.mood?.toLowerCase()] || '😐'}
                  </span>
                  <span className="capitalize">{selectedDay.mood}</span>
                </h4>
                <p className="text-sm text-gray-600">
                  {new Date(selectedDay.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mood Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600">Mood Score</p>
                <p className="text-lg font-bold text-indigo-600">{selectedDay.mood_score}/10</p>
              </div>
              {selectedDay.energy_level !== undefined && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600">Energy</p>
                  <p className="text-lg font-bold text-green-600">{selectedDay.energy_level}/10</p>
                </div>
              )}
              {selectedDay.anxiety_level !== undefined && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600">Anxiety</p>
                  <p className="text-lg font-bold text-amber-600">{selectedDay.anxiety_level}/10</p>
                </div>
              )}
              {selectedDay.stress_level !== undefined && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600">Stress</p>
                  <p className="text-lg font-bold text-red-600">{selectedDay.stress_level}/10</p>
                </div>
              )}
            </div>

            {/* Triggers */}
            {selectedDay.triggers && selectedDay.triggers.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDay.triggers.map((trigger, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border border-gray-200"
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
                <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                  {selectedDay.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {moodData?.summary && (
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{moodData.summary.total_mood_entries || 0}</p>
              <p className="text-xs text-gray-600">Total Entries</p>
            </div>
            {moodData.summary.critical_alerts > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{moodData.summary.critical_alerts}</p>
                <p className="text-xs text-gray-600">Critical Alerts</p>
              </div>
            )}
            {moodData.summary.high_alerts > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{moodData.summary.high_alerts}</p>
                <p className="text-xs text-gray-600">High Alerts</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMoodTrend;
