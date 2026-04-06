import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, RefreshCw, TrendingDown } from 'lucide-react';
import patientService from '../services/patient.service';
import notificationService from '../services/notification.service';
import type { TherapistNotification } from '../types/notification';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';

type MoodTrendDay = {
  date: string;
  dominant_moods: string[];
  average_intensity: number | null;
  mood_intensities: Record<string, number>;
};

const formatMoodLabel = (mood: string) => mood.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const PatientMoodAlert = () => {
  const navigate = useNavigate();
  const { patientId = '' } = useParams();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Patient');
  const [trend, setTrend] = useState<MoodTrendDay[]>([]);
  const [alerts, setAlerts] = useState<TherapistNotification[]>([]);

  const alertType = searchParams.get('alert');

  const load = async () => {
    if (!patientId) {
      setError('Missing patient id');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [patientDetail, trendData, therapistNotifications] = await Promise.all([
        patientService.getPatientDetail(patientId),
        patientService.getMoodTrend(patientId),
        notificationService.getTherapistNotifications(),
      ]);

      if (patientDetail?.full_name) {
        setPatientName(patientDetail.full_name);
      }

      setTrend(Array.isArray(trendData?.trend) ? trendData.trend : []);

      const moodAlerts = therapistNotifications.filter((notification) => {
        const url = notification.action_url ?? '';
        return (
          url.includes(`/therapist/patients/${patientId}/mood`) ||
          url.includes(`/patients/${patientId}/mood`)
        );
      });
      setAlerts(moodAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mood details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [patientId]);

  const trendAverage = useMemo(() => {
    const values = trend
      .map((day) => day.average_intensity)
      .filter((value): value is number => typeof value === 'number');

    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [trend]);

  const daysWithEntries = useMemo(
    () => trend.filter((day) => typeof day.average_intensity === 'number').length,
    [trend]
  );

  return (
    <div className={THERAPIST_PAGE_CANVAS}>
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/notifications')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to notifications
        </button>

        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Mood Alerts</h1>
            <p className="text-sm text-gray-500 mt-1">
              Viewing mood signals for <span className="font-semibold text-gray-700">{patientName}</span>
            </p>
          </div>

          <Link
            to={`/patients/${patientId}`}
            className="text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg"
          >
            Open patient profile
          </Link>
        </div>

        {alertType === 'three_bad_moods' && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Three consecutive low-mood days detected</p>
              <p className="text-xs text-red-700 mt-1">
                This alert is triggered by backend rule <span className="font-semibold">three_bad_moods</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Days with mood data</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{daysWithEntries}/7</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">7-day avg intensity</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {trendAverage !== null ? trendAverage.toFixed(2) : 'N/A'}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Related mood alerts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{alerts.length}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={18} className="text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">7-day mood trend</h2>
            </div>

            {trend.length === 0 ? (
              <p className="text-sm text-gray-500">No mood trend data found for this patient.</p>
            ) : (
              <div className="space-y-3">
                {trend.map((day) => {
                  const dayIntensity = day.average_intensity ?? 0;
                  const width = Math.max(6, Math.min(100, (dayIntensity / 5) * 100));
                  const dominant = day.dominant_moods?.length
                    ? day.dominant_moods.map(formatMoodLabel).join(', ')
                    : 'No entry';

                  return (
                    <div key={day.date} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarDays size={14} />
                          <span>{new Date(day.date).toLocaleDateString()}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {day.average_intensity !== null ? day.average_intensity.toFixed(2) : 'N/A'}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-400 to-red-500" style={{ width: `${width}%` }} />
                      </div>

                      <p className="text-xs text-gray-500 mt-2">Dominant mood: {dominant}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert records from backend notifications</h2>

            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No mood alert notifications found for this patient yet.</p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 10).map((notification) => (
                  <div key={notification.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                      <span className="text-xs text-gray-400">{notification.time_ago}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs mt-2 font-medium text-gray-500">
                      Status: {notification.is_read ? 'Read' : 'Unread'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default PatientMoodAlert;
