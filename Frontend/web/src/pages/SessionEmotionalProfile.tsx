import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Activity } from 'lucide-react';
import { useSessionAnalysis, useSessionDetail } from '../hooks/useSessions';
import { THERAPIST_PAGE_CANVAS } from '../constants/pageShell';

type EmotionPoint = {
  timestamp: number;
  emotion: string;
  score: number;
};

const EMOTION_COLORS: Record<string, string> = {
  joy: '#10b981',
  sadness: '#3b82f6',
  anger: '#ef4444',
  neutral: '#6b7280',
  disgust: '#84cc16',
  fear: '#f59e0b',
  surprise: '#d946ef',
  anxious: '#f97316',
  calm: '#22c55e',
  hopeful: '#14b8a6',
  engaged: '#8b5cf6',
  relaxed: '#06b6d4',
  unknown: '#9ca3af',
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.min(1, value / 100);
  if (value < 0) return 0;
  return value;
};

const SessionEmotionalProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { session } = useSessionDetail(id || '');
  const { analysis, loading, error } = useSessionAnalysis(id || '');

  const points = useMemo<EmotionPoint[]>(() => {
    if (!analysis) return [];

    const rawTimeline = (analysis as any).emotional_timeline || (analysis as any).mood_timeline || [];
    if (!Array.isArray(rawTimeline)) return [];

    // NEW — filter to PATIENT speaker only
return rawTimeline
  .filter((item: any) => {
    const speaker = String(item.speaker || item.role || '').toUpperCase();
    // If speaker info exists, keep only PATIENT. If absent (old data), keep all.
    return !speaker || speaker === 'PATIENT';
  })
  .map((item: any, index: number) => {
    const timestamp = Number(item.timestamp ?? index * 60);
    const emotion = String(item.emotion || item.mood || 'unknown').toLowerCase();
    const score = clamp01(Number(item.confidence ?? item.score ?? 0));
    return { timestamp, emotion, score };
  });
  }, [analysis]);

  const seriesByEmotion = useMemo(() => {
    const emotions = Array.from(new Set(points.map((p) => p.emotion)));
    const sorted = emotions.sort((a, b) => a.localeCompare(b));

    return sorted.map((emotion) => ({
      emotion,
      color: EMOTION_COLORS[emotion] || '#9ca3af',
      values: points.map((p) => ({
        timestamp: p.timestamp,
        value: p.emotion === emotion ? p.score : 0,
      })),
    }));
  }, [points]);

  const chartModel = useMemo(() => {
    const width = 980;
    const height = 360;
    const padLeft = 56;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 36;

    const timestamps = points.map((p) => p.timestamp);
    const minX = timestamps.length ? Math.min(...timestamps) : 0;
    const maxX = timestamps.length ? Math.max(...timestamps) : 1;
    const xSpan = Math.max(1, maxX - minX);

    const x = (value: number) => padLeft + ((value - minX) / xSpan) * (width - padLeft - padRight);
    const y = (value: number) => padTop + (1 - clamp01(value)) * (height - padTop - padBottom);

    return {
      width,
      height,
      yTicks: [0, 0.25, 0.5, 0.75, 1],
      x,
      y,
      innerBottom: height - padBottom,
      padLeft,
      padRight,
      padTop,
      padBottom,
    };
  }, [points]);

  return (
    <div className={THERAPIST_PAGE_CANVAS}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Emotional Profile</h1>
              <p className="text-gray-600 mt-1">
                {session?.patient?.full_name ? `${session.patient.full_name} | ` : ''}Session {id}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load emotional profile: {error.message}
          </div>
        ) : points.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
            No emotional timeline data available for this session yet.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-blue-700" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Emotion Trend Over Time</h2>
              </div>

              <div className="overflow-x-auto">
                <svg
                  width={chartModel.width}
                  height={chartModel.height}
                  viewBox={`0 0 ${chartModel.width} ${chartModel.height}`}
                  className="min-w-full"
                >
                  {chartModel.yTicks.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={chartModel.padLeft}
                        y1={chartModel.y(tick)}
                        x2={chartModel.width - chartModel.padRight}
                        y2={chartModel.y(tick)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      <text
                        x={chartModel.padLeft - 8}
                        y={chartModel.y(tick) + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#6b7280"
                      >
                        {Math.round(tick * 100)}%
                      </text>
                    </g>
                  ))}

                  <line
                    x1={chartModel.padLeft}
                    y1={chartModel.padTop}
                    x2={chartModel.padLeft}
                    y2={chartModel.innerBottom}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                  <line
                    x1={chartModel.padLeft}
                    y1={chartModel.innerBottom}
                    x2={chartModel.width - chartModel.padRight}
                    y2={chartModel.innerBottom}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />

                  {seriesByEmotion.map((series) => {
                    const path = series.values
                      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${chartModel.x(p.timestamp)} ${chartModel.y(p.value)}`)
                      .join(' ');

                    return (
                      <g key={series.emotion}>
                        <path d={path} fill="none" stroke={series.color} strokeWidth="2" />
                        {series.values.map((p, idx) => (
                          <circle
                            key={`${series.emotion}-${idx}`}
                            cx={chartModel.x(p.timestamp)}
                            cy={chartModel.y(p.value)}
                            r="2"
                            fill={series.color}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
              <div className="flex flex-wrap gap-3">
                {seriesByEmotion.map((series) => (
                  <div
                    key={series.emotion}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: series.color }}
                    />
                    <span className="text-sm text-gray-800 capitalize">{series.emotion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionEmotionalProfile;
