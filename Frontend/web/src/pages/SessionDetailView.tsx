// src/pages/SessionDetailView.tsx
// Only the TranscriptSection component is shown here — drop this in at the
// same location as before (right above SessionDetailView).

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, User, Calendar, Clock, FileText,
  RefreshCw, Target, Eye, Heart, TrendingUp, BookOpen, Star
} from 'lucide-react';
import { aiServiceUrl } from '../config';
import { useSessionDetail } from '../hooks/useSessions';
import { THERAPIST_DETAIL_FLOW_BG, THERAPIST_PAGE_CANVAS } from '../constants/pageShell';

// ─── Emotion colours for the badge ──────────────────────────────────────────
const EMOTION_COLOR: Record<string, string> = {
  joy: 'bg-yellow-100 text-yellow-800',
  sadness: 'bg-blue-100   text-blue-800',
  anger: 'bg-red-100    text-red-800',
  neutral: 'bg-gray-100   text-gray-600',
  disgust: 'bg-green-100  text-green-800',
  fear: 'bg-purple-100 text-purple-800',
  surprise: 'bg-orange-100 text-orange-800',
  unknown: 'bg-gray-100   text-gray-400',
};

const EMOTION_ICON: Record<string, string> = {
  joy: '😊', sadness: '😢', anger: '😠', neutral: '😐',
  disgust: '🤢', fear: '😨', surprise: '😲', unknown: '❓',
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface SegmentEmotion {
  audio_emotion: string | null;
  audio_confidence: number;
  text_emotion: string | null;
  text_confidence: number;
  final_emotion: string;
  final_confidence: number;
  agreement: boolean | null;
  analysis_type: 'combined' | 'text_only' | 'audio_only';
}

interface Segment {
  id: string;
  speaker: string;
  start_time: number;
  end_time: number;
  text_english: string;
  text_urdu: string;
  emotion?: SegmentEmotion | string | null;
}

// ─── Helper: parse emotion from whatever shape the backend returns ─────────
function parseEmotion(raw: Segment['emotion']): SegmentEmotion | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    // legacy flat string
    return {
      audio_emotion: null, audio_confidence: 0,
      text_emotion: raw, text_confidence: 0,
      final_emotion: raw, final_confidence: 0,
      agreement: null, analysis_type: 'text_only',
    };
  }
  return raw as SegmentEmotion;
}

// ─── Emotion badge ───────────────────────────────────────────────────────────
const EmotionBadge: React.FC<{ label: string; confidence: number; prefix?: string }> = ({
  label, confidence, prefix
}) => {
  const colorClass = EMOTION_COLOR[label] ?? EMOTION_COLOR.unknown;
  const icon = EMOTION_ICON[label] ?? '❓';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {icon} {prefix && <span className="opacity-60 mr-0.5">{prefix}</span>}
      {label} <span className="opacity-50">({(confidence * 100).toFixed(0)}%)</span>
    </span>
  );
};

// ─── Emotion detail row shown under each bubble ───────────────────────────
const EmotionRow: React.FC<{ emotion: SegmentEmotion }> = ({ emotion }) => {
  const isCombined = emotion.analysis_type === 'combined';

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
      {isCombined && emotion.audio_emotion && (
        <EmotionBadge
          label={emotion.audio_emotion}
          confidence={emotion.audio_confidence}
          prefix="🎤"
        />
      )}
      {isCombined && emotion.text_emotion && (
        <EmotionBadge
          label={emotion.text_emotion}
          confidence={emotion.text_confidence}
          prefix="📝"
        />
      )}
      {/* GPT fused final */}
      <EmotionBadge
        label={emotion.final_emotion}
        confidence={emotion.final_confidence}
        prefix={isCombined ? '🤖 GPT' : undefined}
      />
      {isCombined && emotion.agreement !== null && (
        <span className={`text-xs ${emotion.agreement ? 'text-green-600' : 'text-amber-600'}`}>
          {emotion.agreement ? '✓ agree' : '⚡ disagree'}
        </span>
      )}
      {!isCombined && (
        <span className="text-xs text-gray-400">
          ({emotion.analysis_type === 'audio_only' ? 'audio only' : 'text only'})
        </span>
      )}
    </div>
  );
};

// ─── Mini emotion timeline chart (canvas-based, no extra deps) ───────────
const EmotionTimeline: React.FC<{ segments: Segment[] }> = ({ segments }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const EMOTION_ORDER = ['joy', 'neutral', 'surprise', 'sadness', 'fear', 'anger', 'disgust', 'unknown'];
  const AUDIO_COLOR = '#6366f1';   // indigo
  const TEXT_COLOR = '#f59e0b';   // amber
  const GPT_COLOR = '#10b981';   // emerald

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { top: 20, bottom: 30, left: 60, right: 10 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const N = EMOTION_ORDER.length;

    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // gridlines + y-labels
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#94a3b8';
    EMOTION_ORDER.forEach((em, i) => {
      const y = PAD.top + (i / (N - 1)) * plotH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + plotW, y);
      ctx.stroke();
      ctx.fillText(em, PAD.left - 4, y);
    });

    const combined = segments.filter(s => {
      const em = parseEmotion(s.emotion);
      return em !== null;
    });
    if (combined.length === 0) return;

    const minT = combined[0].start_time;
    const maxT = combined[combined.length - 1].end_time;
    const range = maxT - minT || 1;

    const xOf = (t: number) => PAD.left + ((t - minT) / range) * plotW;
    const yOf = (label: string | null) => {
      const idx = EMOTION_ORDER.indexOf(label ?? 'unknown');
      const i = idx === -1 ? N - 1 : idx;
      return PAD.top + (i / (N - 1)) * plotH;
    };

    const drawLine = (
      points: Array<{ x: number; y: number }>,
      color: string,
      dash: number[] = []
    ) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash);
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      // dots
      ctx.fillStyle = color;
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const audioPoints: Array<{ x: number; y: number }> = [];
    const textPoints: Array<{ x: number; y: number }> = [];
    const gptPoints: Array<{ x: number; y: number }> = [];

    combined.forEach(seg => {
      const em = parseEmotion(seg.emotion)!;
      const midT = (seg.start_time + seg.end_time) / 2;
      const x = xOf(midT);
      if (em.audio_emotion) audioPoints.push({ x, y: yOf(em.audio_emotion) });
      if (em.text_emotion) textPoints.push({ x, y: yOf(em.text_emotion) });
      gptPoints.push({ x, y: yOf(em.final_emotion) });
    });

    drawLine(audioPoints, AUDIO_COLOR, [4, 3]);
    drawLine(textPoints, TEXT_COLOR, [2, 2]);
    drawLine(gptPoints, GPT_COLOR, []);

    // legend
    const legend = [
      { label: '🎤 Audio (Wav2Vec2)', color: AUDIO_COLOR, dash: [4, 3] },
      { label: '📝 Text (distilroberta)', color: TEXT_COLOR, dash: [2, 2] },
      { label: '🤖 GPT fused final', color: GPT_COLOR, dash: [] },
    ];
    let lx = PAD.left;
    legend.forEach(({ label, color, dash }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(lx, H - 10);
      ctx.lineTo(lx + 20, H - 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '9px system-ui';
      ctx.fillText(label, lx + 24, H - 10);
      lx += ctx.measureText(label).width + 36;
    });

  }, [segments]);

  return (
    <canvas
      ref={canvasRef}
      width={680}
      height={200}
      className="w-full rounded-xl border border-gray-100"
    />
  );
};

// ─── TranscriptSection ────────────────────────────────────────────────────
export const TranscriptSection: React.FC<{ sessionId: string; sessionStatus?: string }> = ({
  sessionId,
  sessionStatus,
}) => {
  const [segments, setSegments] = React.useState<Segment[]>([]);
  const [status, setStatus] = React.useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompletedSession = String(sessionStatus || '').toUpperCase() === 'COMPLETED';

  React.useEffect(() => {
    if (!isCompletedSession) {
      setSegments([]);
      setStatus('ready');
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    let attempts = 0;
    const MAX = 24; // ~2 minutes at 5s intervals

    const check = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(
          `${aiServiceUrl}/api/v1/session/${sessionId}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) { setStatus('processing'); return; }

        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          setSegments(data.segments);
          setStatus('ready');
          if (pollRef.current) clearInterval(pollRef.current);

          // ── BROWSER CONSOLE LOGGING ──────────────────────────────────────
          console.group(`%c[MindScribe] Transcript ready — session ${sessionId}`, 'color: #6366f1; font-weight: bold');
          data.segments.forEach((seg: Segment, i: number) => {
            const em = parseEmotion(seg.emotion);
            if (!em) return;
            const isCombined = em.analysis_type === 'combined';
            console.groupCollapsed(
              `%cSeg ${i + 1} [${seg.speaker}] ${seg.start_time.toFixed(1)}s–${seg.end_time.toFixed(1)}s`,
              'color: #475569'
            );
            console.log('%cText (EN):', 'color: #94a3b8', seg.text_english || '—');
            if (seg.text_urdu) console.log('%cText (UR):', 'color: #94a3b8', seg.text_urdu);

            if (isCombined && em.audio_emotion) {
              console.log(
                `%c🎤 Wav2Vec2 audio  → ${em.audio_emotion.toUpperCase()} (${(em.audio_confidence * 100).toFixed(1)}%)`,
                'color: #6366f1; font-weight: bold'
              );
            }
            if (em.text_emotion) {
              console.log(
                `%c📝 distilroberta text → ${em.text_emotion.toUpperCase()} (${(em.text_confidence * 100).toFixed(1)}%)`,
                'color: #f59e0b; font-weight: bold'
              );
            }
            if (isCombined) {
              console.log(
                `%c🤖 GPT-4o-mini fused → ${em.final_emotion.toUpperCase()} (${(em.final_confidence * 100).toFixed(1)}%) — models ${em.agreement ? '✓ agreed' : '⚡ disagreed'}`,
                'color: #10b981; font-weight: bold'
              );
            } else {
              console.log(
                `%c🔖 Final (${em.analysis_type}) → ${em.final_emotion.toUpperCase()} (${(em.final_confidence * 100).toFixed(1)}%)`,
                'color: #10b981'
              );
            }
            console.groupEnd();
          });
          console.groupEnd();
          // ── END CONSOLE LOGGING ──────────────────────────────────────────

        } else {
          attempts++;
          setStatus('processing');
          if (attempts >= MAX) {
            setStatus('error');
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        setStatus('processing');
      }
    };

    check();
    pollRef.current = setInterval(check, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, isCompletedSession]);

  if (!isCompletedSession) {
    return (
      <p className="text-sm text-gray-500 py-3">
        Nothing to show here as this session has not been conducted yet.
      </p>
    );
  }

  // ── Status states ──────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
        Loading transcript…
      </div>
    );
  }
  if (status === 'processing') {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">Pipeline is processing your recording</p>
        <p className="text-xs mt-1">Diarization → Transcription → GPT speaker correction → Translation → Emotion analysis</p>
        <p className="text-xs mt-2 text-gray-400">Takes 30–120 s after the session ends.</p>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <p className="text-sm text-red-500 py-4">
        Transcript not available yet — pipeline may still be running. Try refreshing in a minute.
      </p>
    );
  }

  const hasEmotion = segments.some(s => parseEmotion(s.emotion) !== null);

  return (
    <div className="space-y-4">
      {/* Emotion timeline chart */}
      {hasEmotion && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Emotion timeline
          </p>
          <EmotionTimeline segments={segments} />
        </div>
      )}

      {/* Legend */}
      {hasEmotion && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 pb-1">
          <span><span className="inline-block w-4 h-0.5 bg-indigo-500 mr-1 align-middle" style={{ borderTop: '2px dashed #6366f1' }} />🎤 Wav2Vec2 audio</span>
          <span><span className="inline-block w-4 h-0.5 mr-1 align-middle" style={{ borderTop: '2px dashed #f59e0b' }} />📝 distilroberta text</span>
          <span><span className="inline-block w-4 h-0.5 bg-emerald-500 mr-1 align-middle" />🤖 GPT fused final</span>
        </div>
      )}

      {/* Transcript bubbles */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {segments.map((seg, i) => {
          const isTherapist = seg.speaker === 'THERAPIST';
          const displayText = seg.text_english || seg.text_urdu || '—';
          const timeStr = `${seg.start_time.toFixed(1)}s – ${seg.end_time.toFixed(1)}s`;
          const em = parseEmotion(seg.emotion);

          return (
            <div
              key={seg.id || i}
              className={`flex flex-col ${isTherapist ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-xl text-sm shadow-sm ${isTherapist
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
              >
                {/* Speaker + time */}
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wide ${isTherapist ? 'text-purple-200' : 'text-purple-600'}`}>
                    {isTherapist ? '🩺 Therapist' : '👤 Patient'}
                  </span>
                  <span className={`text-xs ${isTherapist ? 'text-purple-300' : 'text-gray-400'}`}>
                    {timeStr}
                  </span>
                </div>

                {/* Text */}
                <p className="leading-relaxed">{displayText}</p>

                {/* Urdu original */}
                {seg.text_urdu && seg.text_urdu !== displayText && (
                  <p className={`text-xs mt-1 italic ${isTherapist ? 'text-purple-200' : 'text-gray-500'}`} dir="rtl">
                    {seg.text_urdu}
                  </p>
                )}

                {/* Emotion detail */}
                {em && (
                  <div className={isTherapist ? 'opacity-80' : ''}>
                    <EmotionRow emotion={em} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PASTE THIS BLOCK 1: just above `const SessionDetailView` ────────────────

const EMOTION_ORDER_EP = ['joy', 'neutral', 'surprise', 'fear', 'sadness', 'anger', 'disgust', 'unknown'];
const EMOTION_META_EP: Record<string, { color: string; bg: string; label: string }> = {
  joy: { color: '#d97706', bg: '#fef3c7', label: 'Joy' },
  neutral: { color: '#6b7280', bg: '#f3f4f6', label: 'Neutral' },
  surprise: { color: '#ea580c', bg: '#fff7ed', label: 'Surprise' },
  fear: { color: '#7c3aed', bg: '#ede9fe', label: 'Fear' },
  sadness: { color: '#2563eb', bg: '#eff6ff', label: 'Sadness' },
  anger: { color: '#dc2626', bg: '#fef2f2', label: 'Anger' },
  disgust: { color: '#059669', bg: '#ecfdf5', label: 'Disgust' },
  unknown: { color: '#9ca3af', bg: '#f9fafb', label: 'Unknown' },
};
const EP_AUDIO = '#6366f1';
const EP_TEXT = '#f59e0b';
const EP_GPT = '#10b981';

function epParseEmotion(raw: Segment['emotion']): SegmentEmotion | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {
      audio_emotion: null, audio_confidence: 0, text_emotion: raw, text_confidence: 0,
      final_emotion: raw, final_confidence: 0, agreement: null, analysis_type: 'text_only'
    };
  }
  return raw as SegmentEmotion;
}

function epEmotionIdx(label: string | null): number {
  const idx = EMOTION_ORDER_EP.indexOf((label ?? 'unknown').toLowerCase());
  return idx === -1 ? EMOTION_ORDER_EP.length - 1 : idx;
}

const EpPill: React.FC<{ label: string; conf: number; prefix?: string }> = ({ label, conf, prefix }) => {
  const meta = EMOTION_META_EP[label.toLowerCase()] ?? EMOTION_META_EP.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
      background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`, fontFamily: 'ui-monospace,monospace'
    }}>
      {prefix && <span style={{ opacity: .6, fontSize: 10 }}>{prefix}</span>}
      {meta.label.toUpperCase()} <span style={{ opacity: .55 }}>({Math.round(conf * 100)}%)</span>
    </span>
  );
};

const EpChart: React.FC<{ segments: Segment[] }> = ({ segments }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<any>(null);
  const segs = segments.filter(s => epParseEmotion(s.emotion) !== null);

  React.useEffect(() => {
    if (!canvasRef.current || segs.length === 0) return;
    const build = () => {
      const Chart = (window as any).Chart;
      if (!Chart || !canvasRef.current) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      const labels: string[] = [];
      const aData: (number | null)[] = [], tData: (number | null)[] = [], gData: number[] = [];
      segs.forEach(seg => {
        const em = epParseEmotion(seg.emotion)!;
        labels.push(((seg.start_time + seg.end_time) / 2).toFixed(1) + 's');
        aData.push(em.audio_emotion ? epEmotionIdx(em.audio_emotion) : null);
        tData.push(em.text_emotion ? epEmotionIdx(em.text_emotion) : null);
        gData.push(epEmotionIdx(em.final_emotion));
      });

      const dark = window.matchMedia('(prefers-color-scheme:dark)').matches;
      const gc = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)';
      const tc = dark ? '#9ca3af' : '#6b7280';
      const lc = dark ? '#e5e7eb' : '#374151';

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Audio (Wav2Vec2)', data: aData, borderColor: EP_AUDIO, backgroundColor: EP_AUDIO + '22',
              borderWidth: 2, borderDash: [6, 3], pointRadius: 4, tension: .3, spanGaps: true
            },
            {
              label: 'Text (distilroberta)', data: tData, borderColor: EP_TEXT, backgroundColor: EP_TEXT + '22',
              borderWidth: 2, borderDash: [3, 3], pointRadius: 4, tension: .3, spanGaps: true
            },
            {
              label: 'GPT fused final', data: gData, borderColor: EP_GPT, backgroundColor: EP_GPT + '33',
              borderWidth: 2.5, pointRadius: 5, tension: .3, fill: false
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed.y;
                  if (v == null) return ctx.dataset.label + ': —';
                  return `${ctx.dataset.label}: ${EMOTION_META_EP[EMOTION_ORDER_EP[Math.round(v)]]?.label ?? '?'}`;
                }
              }
            },
          },
          scales: {
            x: { ticks: { color: tc, font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: gc } },
            y: {
              min: -.5, max: EMOTION_ORDER_EP.length - .5,
              ticks: {
                color: lc, font: { size: 11 }, stepSize: 1,
                callback: (v: any) => EMOTION_META_EP[EMOTION_ORDER_EP[Math.round(v)]]?.label ?? ''
              },
              grid: { color: gc }
            },
          },
        },
      });
    };

    const scriptId = 'chartjs-ep';
    if (!(window as any).Chart) {
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script');
        s.id = scriptId;
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = build;
        document.head.appendChild(s);
      } else {
        document.getElementById(scriptId)!.addEventListener('load', build);
      }
    } else {
      build();
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [segs.length]);

  if (segs.length === 0) return <p className="text-sm text-gray-400">No emotion data yet.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-5 mb-3">
        {[
          { color: EP_AUDIO, dash: true, label: 'Audio — Wav2Vec2' },
          { color: EP_TEXT, dash: true, label: 'Text — distilroberta' },
          { color: EP_GPT, dash: false, label: 'GPT fused final' },
        ].map(({ color, dash, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg width="28" height="10">
              {dash
                ? <line x1="0" y1="5" x2="28" y2="5" stroke={color} strokeWidth="2" strokeDasharray="6 3" />
                : <line x1="0" y1="5" x2="28" y2="5" stroke={color} strokeWidth="2.5" />}
              <circle cx="14" cy="5" r="3" fill={color} />
            </svg>
            {label}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', width: '100%', height: 240 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

const EpDistribution: React.FC<{ segments: Segment[] }> = ({ segments }) => {
  const segs = segments.filter(s => epParseEmotion(s.emotion) !== null);
  const aC: Record<string, number> = {}, tC: Record<string, number> = {}, gC: Record<string, number> = {};
  segs.forEach(s => {
    const em = epParseEmotion(s.emotion)!;
    if (em.audio_emotion) aC[em.audio_emotion] = (aC[em.audio_emotion] ?? 0) + 1;
    if (em.text_emotion) tC[em.text_emotion] = (tC[em.text_emotion] ?? 0) + 1;
    gC[em.final_emotion] = (gC[em.final_emotion] ?? 0) + 1;
  });
  const allLabels = Array.from(new Set([...Object.keys(aC), ...Object.keys(tC), ...Object.keys(gC)]))
    .sort((a, b) => epEmotionIdx(a) - epEmotionIdx(b));
  const maxVal = Math.max(...allLabels.flatMap(l => [aC[l] ?? 0, tC[l] ?? 0, gC[l] ?? 0]), 1);

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          <th className="text-left py-1 px-2 text-gray-500 font-medium">Emotion</th>
          {[{ label: 'Audio', color: EP_AUDIO }, { label: 'Text', color: EP_TEXT }, { label: 'Fused', color: EP_GPT }]
            .map(c => <th key={c.label} style={{ color: c.color }} className="py-1 px-2 font-medium text-right">{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {allLabels.map(label => {
          const meta = EMOTION_META_EP[label] ?? EMOTION_META_EP.unknown;
          return (
            <tr key={label} className="border-t border-gray-100">
              <td className="py-1.5 px-2 flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color, display: 'inline-block' }} />
                <span className="text-gray-700">{meta.label}</span>
              </td>
              {([{ v: aC[label] ?? 0, c: EP_AUDIO }, { v: tC[label] ?? 0, c: EP_TEXT }, { v: gC[label] ?? 0, c: EP_GPT }]).map((col, i) => (
                <td key={i} className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div style={{ width: `${(col.v / maxVal) * 100}%`, height: '100%', background: col.c, borderRadius: 999 }} />
                    </div>
                    <span className="text-gray-500 w-4 text-right">{col.v}</span>
                  </div>
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const EpCoOccurrence: React.FC<{ segments: Segment[] }> = ({ segments }) => {
  const combined = segments.filter(s => {
    const em = epParseEmotion(s.emotion);
    return em?.analysis_type === 'combined' && em.audio_emotion && em.text_emotion;
  });
  if (combined.length === 0) return <p className="text-xs text-gray-400">No combined segments (need both models to run).</p>;

  const matrix: Record<string, Record<string, number>> = {};
  const aL = new Set<string>(), tL = new Set<string>();
  combined.forEach(s => {
    const em = epParseEmotion(s.emotion)!;
    const a = em.audio_emotion!, t = em.text_emotion!;
    aL.add(a); tL.add(t);
    if (!matrix[a]) matrix[a] = {};
    matrix[a][t] = (matrix[a][t] ?? 0) + 1;
  });
  const aLabels = Array.from(aL).sort((a, b) => epEmotionIdx(a) - epEmotionIdx(b));
  const tLabels = Array.from(tL).sort((a, b) => epEmotionIdx(a) - epEmotionIdx(b));
  const maxVal = Math.max(...aLabels.flatMap(a => tLabels.map(t => matrix[a]?.[t] ?? 0)), 1);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="py-1 px-2 text-gray-400 font-normal text-left">Audio ↓ / Text →</th>
            {tLabels.map(t => (
              <th key={t} style={{ color: EP_TEXT }} className="py-1 px-2 font-medium text-center whitespace-nowrap">
                {EMOTION_META_EP[t]?.label ?? t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {aLabels.map(a => (
            <tr key={a} className="border-t border-gray-100">
              <td style={{ color: EP_AUDIO }} className="py-1 px-2 font-medium whitespace-nowrap">
                {EMOTION_META_EP[a]?.label ?? a}
              </td>
              {tLabels.map(t => {
                const v = matrix[a]?.[t] ?? 0;
                const intensity = v / maxVal;
                return (
                  <td key={t} className="py-1 px-2 text-center">
                    {v > 0
                      ? <span style={{
                        display: 'inline-block', minWidth: 20, padding: '1px 5px', borderRadius: 4,
                        fontWeight: 500,
                        background: a === t
                          ? `rgba(16,185,129,${0.15 + intensity * 0.6})`
                          : `rgba(239,68,68,${0.1 + intensity * 0.4})`,
                        color: a === t ? '#065f46' : '#991b1b',
                      }}>{v}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-1">Green = models agreed · Red = disagreement</p>
    </div>
  );
};

const EpSegmentCards: React.FC<{ segments: Segment[]; patientOnly: boolean }> = ({ segments, patientOnly }) => {
  const filtered = patientOnly ? segments.filter(s => s.speaker === 'PATIENT') : segments;
  return (
    <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
      {filtered.map((seg, i) => {
        const em = epParseEmotion(seg.emotion);
        if (!em) return null;
        const isTherapist = seg.speaker === 'THERAPIST';
        const isCombined = em.analysis_type === 'combined';
        return (
          <div key={seg.id || i} className="p-3 rounded-xl border border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-semibold ${isTherapist ? 'text-purple-600' : 'text-emerald-600'}`}>
                {isTherapist ? 'THERAPIST' : 'PATIENT'}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {seg.start_time.toFixed(1)}s – {seg.end_time.toFixed(1)}s
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed mb-2">
              {seg.text_english || seg.text_urdu || '—'}
            </p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {isCombined && em.audio_emotion && <EpPill label={em.audio_emotion} conf={em.audio_confidence} prefix="Audio" />}
              {isCombined && em.text_emotion && <EpPill label={em.text_emotion} conf={em.text_confidence} prefix="Text" />}
              <EpPill label={em.final_emotion} conf={em.final_confidence} prefix={isCombined ? 'GPT' : undefined} />
              {isCombined && em.agreement !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${em.agreement ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {em.agreement ? 'agreed' : 'disagreed'}
                </span>
              )}
              {!isCombined && (
                <span className="text-xs text-gray-400">({em.analysis_type === 'audio_only' ? 'audio only' : 'text only'})</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const EmotionalProfileSection: React.FC<{ sessionId: string; sessionStatus?: string }> = ({
  sessionId,
  sessionStatus,
}) => {
  const [segments, setSegments] = React.useState<Segment[]>([]);
  const [status, setStatus] = React.useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const [tab, setTab] = React.useState<'chart' | 'distribution' | 'cooccurrence' | 'segments'>('chart');
  const [patientOnly, setPatientOnly] = React.useState(true);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompletedSession = String(sessionStatus || '').toUpperCase() === 'COMPLETED';

  React.useEffect(() => {
    if (!isCompletedSession) {
      setSegments([]);
      setStatus('ready');
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    let attempts = 0;
    const MAX = 24;
    const check = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${aiServiceUrl}/api/v1/session/${sessionId}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { setStatus('processing'); return; }
        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.some((s: Segment) => epParseEmotion(s.emotion) !== null)) {
          setSegments(data.segments);
          setStatus('ready');
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          attempts++;
          setStatus('processing');
          if (attempts >= MAX) { setStatus('error'); if (pollRef.current) clearInterval(pollRef.current); }
        }
      } catch { setStatus('processing'); }
    };
    check();
    pollRef.current = setInterval(check, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, isCompletedSession]);

  if (!isCompletedSession) return (
    <p className="text-sm text-gray-500 py-3">
      Nothing to show here as this session has not been conducted yet.
    </p>
  );

  if (status === 'loading') return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500" />
      Loading emotional profile…
    </div>
  );
  if (status === 'processing') return (
    <div className="text-center py-8 text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-600">Running three-stage emotion pipeline</p>
      <p className="text-xs mt-1">Wav2Vec2 audio → distilroberta text → GPT-4o-mini fusion</p>
      <p className="text-xs mt-1 text-gray-400">Takes 30–120s after session ends</p>
    </div>
  );
  if (status === 'error' || segments.length === 0) return (
    <p className="text-sm text-red-400 py-3">Emotional profile unavailable — pipeline may still be running.</p>
  );

  // Summary numbers
  const withEm = segments.filter(s => epParseEmotion(s.emotion) !== null);
  const combined = withEm.filter(s => epParseEmotion(s.emotion)?.analysis_type === 'combined');
  const agreed = combined.filter(s => epParseEmotion(s.emotion)?.agreement === true);
  const gptC: Record<string, number> = {};
  withEm.forEach(s => { const l = epParseEmotion(s.emotion)!.final_emotion; gptC[l] = (gptC[l] ?? 0) + 1; });
  const dominant = Object.entries(gptC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  const agreePct = combined.length > 0 ? Math.round((agreed.length / combined.length) * 100) : 0;

  const tabs = [
    { key: 'chart' as const, label: 'Timeline' },
    { key: 'distribution' as const, label: 'Distribution' },
    { key: 'cooccurrence' as const, label: 'Co-occurrence' },
    { key: 'segments' as const, label: 'Segments' },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {[
          { label: 'Segments analysed', value: withEm.length },
          { label: 'Both models ran', value: combined.length },
          { label: 'Models agreed', value: `${agreePct}%` },
          { label: 'Dominant emotion', value: EMOTION_META_EP[dominant]?.label ?? dominant },
        ].map(c => (
          <div key={c.label} className="bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className="text-xl font-semibold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chart' && <EpChart segments={segments} />}
      {tab === 'distribution' && <EpDistribution segments={segments} />}
      {tab === 'cooccurrence' && <EpCoOccurrence segments={segments} />}
      {tab === 'segments' && (
        <div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-3 cursor-pointer">
            <input type="checkbox" checked={patientOnly} onChange={e => setPatientOnly(e.target.checked)} />
            Patient segments only
          </label>
          <EpSegmentCards segments={segments} patientOnly={patientOnly} />
        </div>
      )}
    </div>
  );
};

// ─── END BLOCK 1 ─────────────────────────────────────────────────────────────




// ─── PASTE THIS BLOCK 2: inside SessionDetailView JSX, right after the
//     existing "Session Transcript" card closing </div></div> ────────────────

{/*
  <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-6 py-4 border-b border-indigo-200">
      <h3 className="text-lg font-bold text-gray-900 flex items-center">
        <Heart className="mr-2 text-indigo-600" size={20} />
        Emotional Profile
        <span className="ml-2 text-xs font-normal text-gray-400">
          Wav2Vec2 audio · distilroberta text · GPT-4o-mini fused
        </span>
      </h3>
    </div>
    <div className="p-6">
      <EmotionalProfileSection sessionId={id!} />
    </div>
  </div>
*/}

// ─── END BLOCK 2 ─────────────────────────────────────────────────────────────
// Remove the {/* */} comment wrapper — that's just to prevent JSX parse errors
// in this instruction file. Paste the inner JSX directly.

// ─── SessionDetailView (unchanged structure, TranscriptSection wired in) ──
const SessionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading, error, fetchSession } = useSessionDetail(id!);

  const getStatusColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'completed': return 'bg-green-100  text-green-800  border-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-blue-100   text-blue-800   border-blue-200';
      case 'cancelled': return 'bg-red-100    text-red-800    border-red-200';
      default: return 'bg-gray-100   text-gray-800   border-gray-200';
    }
  };

  const formatDate = (ds: string) => {
    try {
      return new Date(ds).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return ds; }
  };

  if (loading) {
    return (
      <div className={THERAPIST_PAGE_CANVAS}>
        <div className="bg-purple-700 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center py-6">
              <button onClick={() => navigate(-1)} className="mr-4 p-2 bg-white/20 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold">Session Details</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
            <p className="text-gray-600 mt-4">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={`${THERAPIST_PAGE_CANVAS} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h3>
          <button onClick={() => navigate('/sessions')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={THERAPIST_DETAIL_FLOW_BG}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(-1)}
                className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all">
                <ChevronLeft size={24} />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold">Session #{session.session_number || session.id}</h1>
                  <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-lg ${getStatusColor(session.status)}`}>
                    {session.status?.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center mt-2 text-purple-100">
                  <User size={16} className="mr-2" />
                  <p className="text-lg font-medium">{session.patient?.full_name}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={fetchSession}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all">
                <RefreshCw size={18} />
                <span className="hidden sm:inline font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>















      <div className="max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Session Overview */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FileText className="mr-2 text-purple-600" size={22} />Session Overview
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-purple-100 rounded-lg"><User className="text-purple-600" size={20} /></div>
                  <div><p className="text-sm font-medium text-gray-500 mb-1">Patient</p>
                    <p className="text-base font-semibold text-gray-900">{session.patient?.full_name}</p></div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-blue-100 rounded-lg"><FileText className="text-blue-600" size={20} /></div>
                  <div><p className="text-sm font-medium text-gray-500 mb-1">Session Type</p>
                    <p className="text-base font-semibold text-gray-900">{session.session_type}</p>
                    <p className="text-sm text-gray-600">{session.is_online ? '🌐 Online' : `📍 ${session.location}`}</p></div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-green-100 rounded-lg"><Calendar className="text-green-600" size={20} /></div>
                  <div><p className="text-sm font-medium text-gray-500 mb-1">Scheduled Date</p>
                    <p className="text-base font-semibold text-gray-900">{formatDate(session.scheduled_date)}</p></div>
                </div>
                {session.actual_duration_minutes && (
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-orange-100 rounded-lg"><Clock className="text-orange-600" size={20} /></div>
                    <div><p className="text-sm font-medium text-gray-500 mb-1">Duration</p>
                      <p className="text-base font-semibold text-gray-900">{session.actual_duration_minutes} minutes</p></div>
                  </div>
                )}
              </div>
            </div>

            {/* Goals */}
            {session.patient_goals && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Target className="mr-2 text-blue-600" size={20} />Session Goals
                  </h3>
                </div>
                <div className="p-6"><p className="text-gray-700 leading-relaxed">{session.patient_goals}</p></div>
              </div>
            )}

            {/* Session Notes */}
            {session.session_notes && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <FileText className="mr-2 text-purple-600" size={20} />Session Notes
                  </h3>
                </div>
                <div className="p-6">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">
                    {session.session_notes}
                  </div>
                </div>
              </div>
            )}

            {/* ── AI Transcript with emotion comparison ── */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <FileText className="mr-2 text-purple-600" size={20} />
                  Session Transcript
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    GPT-corrected · THERAPIST / PATIENT · audio+text emotions compared
                  </span>
                </h3>
              </div>
              <div className="p-6">
                <TranscriptSection sessionId={id!} sessionStatus={session.status} />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-6 py-4 border-b border-indigo-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Heart className="mr-2 text-indigo-600" size={20} />
                  Emotional Profile
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    Wav2Vec2 audio · distilroberta text · GPT-4o-mini fused
                  </span>
                </h3>
              </div>
              <div className="p-6">
                <EmotionalProfileSection sessionId={id!} sessionStatus={session.status} />
              </div>
            </div>

            {/* Therapist Observations */}
            {session.therapist_observations && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 px-6 py-4 border-b border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Eye className="mr-2 text-indigo-600" size={20} />Therapist Observations
                  </h3>
                </div>
                <div className="p-6"><p className="text-gray-700 leading-relaxed">{session.therapist_observations}</p></div>
              </div>
            )}

            {/* Homework */}
            {(session.homework_assigned || session.next_session_goals) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-6 py-4 border-b border-amber-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <BookOpen className="mr-2 text-amber-600" size={20} />Homework &amp; Next Steps
                  </h3>
                </div>
                <div className="p-6 space-y-5">
                  {session.homework_assigned && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">📝 Homework Assigned</h4>
                      <p className="text-gray-700 leading-relaxed">{session.homework_assigned}</p>
                    </div>
                  )}
                  {session.next_session_goals && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🎯 Next Session Goals</h4>
                      <p className="text-gray-700 leading-relaxed">{session.next_session_goals}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-1 space-y-6">
            {(session.patient_mood_before || session.patient_mood_after || session.mood_improvement != null) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden sticky top-6">
                <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 px-6 py-4 border-b border-pink-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Heart className="mr-2 text-pink-600" size={20} />Mood Analysis
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {session.patient_mood_before && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Before</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_before}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div className="h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400"
                          style={{ width: `${(session.patient_mood_before / 10) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {session.patient_mood_after && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">After</span>
                        <span className="text-2xl font-bold text-gray-900">{session.patient_mood_after}<span className="text-base text-gray-500">/10</span></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                          style={{ width: `${(session.patient_mood_after / 10) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {session.mood_improvement != null && (
                    <div className={`rounded-xl p-4 ${session.mood_improvement >= 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Improvement</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-3xl font-bold ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement}
                          </span>
                          <TrendingUp className={`w-6 h-6 ${session.mood_improvement >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                        </div>
                      </div>
                      <p className={`text-center text-sm font-semibold mt-3 ${session.mood_improvement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {session.mood_improvement >= 3 ? '🎉 Significant Improvement' :
                          session.mood_improvement >= 1 ? '✅ Positive Progress' :
                            session.mood_improvement === 0 ? '➡️ Stable' : '⚠️ Needs Attention'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {session.session_effectiveness && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/50 px-6 py-4 border-b border-yellow-200">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Star className="mr-2 text-yellow-600" size={20} />Session Effectiveness
                  </h3>
                </div>
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {session.session_effectiveness}<span className="text-2xl text-gray-500">/10</span>
                    </div>
                    <p className={`text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full inline-block ${session.session_effectiveness >= 8 ? 'bg-green-100 text-green-700' :
                      session.session_effectiveness >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {session.session_effectiveness >= 8 ? '⭐ Highly Effective' :
                        session.session_effectiveness >= 6 ? '👍 Moderately Effective' : '⚠️ Needs Improvement'}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div className={`h-4 rounded-full ${session.session_effectiveness >= 8 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      session.session_effectiveness >= 6 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        'bg-gradient-to-r from-red-400 to-red-600'
                      }`} style={{ width: `${(session.session_effectiveness / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailView;
