// src/pages/SessionDetail.tsx
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft,
  User,
  FileText,
  Edit3,
  Edit,
  Save,
  X,
  Trash2,
  Activity,
  Sparkles
} from 'lucide-react';
import { useSessionDetail, useSessionAnalysis, useSessionInsights, useSessionTranscription } from '../hooks/useSessions';
import sessionsService from '../services/sessions.service';
import type { SOAPNote } from '../types/session';

type SessionDetailTab = 'overview' | 'soap' | 'emotional-profile' | 'ai-insights';

const EMOTION_VISUAL_ORDER = ['joy', 'surprise', 'neutral', 'fear', 'sadness', 'anger', 'disgust', 'unknown'] as const;

const EMOTION_COLORS: Record<string, string> = {
  joy: '#10b981',
  surprise: '#0ea5e9',
  neutral: '#6b7280',
  fear: '#f59e0b',
  sadness: '#3b82f6',
  anger: '#ef4444',
  disgust: '#84cc16',
  unknown: '#a855f7',
};

const markdownComponents = {
  h1: (props: any) => <h3 className="text-base font-semibold text-gray-900 mb-2" {...props} />,
  h2: (props: any) => <h4 className="text-sm font-semibold text-gray-900 mb-2" {...props} />,
  h3: (props: any) => <h5 className="text-sm font-semibold text-gray-900 mb-2" {...props} />,
  p: (props: any) => <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1 mb-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1 mb-2" {...props} />,
  li: (props: any) => <li className="leading-relaxed" {...props} />,
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-700 mb-2" {...props} />
  ),
  strong: (props: any) => <strong className="font-semibold text-gray-900" {...props} />,
};

const normalizeEmotionalPatterns = (
  emotionalPatterns: string[] | string | Record<string, unknown> | null | undefined
): string[] => {
  if (!emotionalPatterns) {
    return [];
  }

  if (Array.isArray(emotionalPatterns)) {
    return emotionalPatterns.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof emotionalPatterns === 'string') {
    return emotionalPatterns
      .replace(/;/g, ',')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const obj = emotionalPatterns as Record<string, unknown>;
  const listFromKey = obj.high_level_patterns;
  if (Array.isArray(listFromKey)) {
    return listFromKey.map((item) => String(item).trim()).filter(Boolean);
  }

  const summary = obj.patterns_summary;
  if (typeof summary === 'string' && summary.trim()) {
    return summary
      .replace(/;/g, ',')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const fallback: string[] = [];
  if (typeof obj.dominant_emotion === 'string' && obj.dominant_emotion.trim()) {
    fallback.push(`${obj.dominant_emotion.trim()}-dominant response pattern`);
  }

  return fallback;
};

const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    scheduled_date: string;
    duration_minutes: number;
    location: string;
    is_online: boolean;
  }>({
    scheduled_date: '',
    duration_minutes: 60,
    location: '',
    is_online: false,
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({
    session_summary: '',
    patient_goals: '',
    homework_assigned: '',
    next_session_goals: '',
  });
  const [savingSummary, setSavingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<SessionDetailTab>('overview');
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapGenerating, setSoapGenerating] = useState(false);
  const [soapError, setSoapError] = useState<string | null>(null);
  const [soapFetchAttempted, setSoapFetchAttempted] = useState(false);
  const [insightsFetchAttempted, setInsightsFetchAttempted] = useState(false);

  const { session, loading, error, updateSessionNotes, fetchSession } = useSessionDetail(id!);

  const { analysis, loading: analysisLoading } = useSessionAnalysis(
    session?.status === 'COMPLETED' ? id! : ''
  );

  const { transcription, loading: transcriptionLoading, error: transcriptionError } =
    useSessionTranscription(session?.status === 'COMPLETED' ? id! : '');

  const {
    insight: sessionInsight,
    loading: insightsLoading,
    generating: insightsGenerating,
    error: insightsError,
    fetchInsights,
    generateInsights,
    clearError: clearInsightsError,
  } = useSessionInsights(session?.status === 'COMPLETED' ? id! : '', { autoFetch: false });

  React.useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get('tab');
    if (
      queryTab === 'overview' ||
      queryTab === 'soap' ||
      queryTab === 'emotional-profile' ||
      queryTab === 'ai-insights'
    ) {
      setActiveTab(queryTab);
    } else {
      setActiveTab('overview');
    }
  }, [location.search]);

  React.useEffect(() => {
    if (session?.session_notes) setNoteText(session.session_notes);
    if (session) {
      setSummaryData({
        session_summary: session.session_summary || '',
        patient_goals: session.patient_goals || '',
        homework_assigned: session.homework_assigned || '',
        next_session_goals: session.next_session_goals || '',
      });
      const scheduledDate = session.scheduled_date ? new Date(session.scheduled_date) : new Date();
      setDetailsData({
        scheduled_date: scheduledDate.toISOString().slice(0, 16),
        duration_minutes: session.duration_minutes || session.actual_duration_minutes || 60,
        location: session.location || '',
        is_online: session.is_online || false,
      });
    }
  }, [session]);

  const isCompletedSession = session?.status === 'COMPLETED';

  const handleTabChange = (tab: SessionDetailTab) => {
    setActiveTab(tab);
    navigate(`${location.pathname}?tab=${tab}`, { replace: true, state: location.state });
  };

  const loadSoapNote = async () => {
    if (!id) return;
    setSoapLoading(true);
    setSoapError(null);
    try {
      const note = await sessionsService.getSessionSOAP(id);
      setSoapNote(note);
    } catch (error: any) {
      setSoapNote(null);
      setSoapError(error?.message || 'Unable to load SOAP note for this session.');
    } finally {
      setSoapFetchAttempted(true);
      setSoapLoading(false);
    }
  };

  const handleGenerateSoap = async () => {
    if (!id) return;
    setSoapGenerating(true);
    setSoapError(null);
    try {
      const generated = await sessionsService.generateSessionSOAP(id, { include_emotions: true });
      setSoapNote(generated.soap_note);
      setSoapFetchAttempted(true);
    } catch (error: any) {
      setSoapError(error?.message || 'Failed to generate SOAP note.');
    } finally {
      setSoapGenerating(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!id) return;
    setInsightsFetchAttempted(true);
    await generateInsights(true);
  };

  React.useEffect(() => {
    if (activeTab === 'soap' && isCompletedSession && !soapNote && !soapLoading && !soapFetchAttempted) {
      loadSoapNote();
    }
  }, [activeTab, isCompletedSession, soapNote, soapLoading, soapFetchAttempted]);

  React.useEffect(() => {
    if (
      activeTab === 'ai-insights' &&
      isCompletedSession &&
      !sessionInsight &&
      !insightsLoading &&
      !insightsFetchAttempted &&
      !insightsError
    ) {
      setInsightsFetchAttempted(true);
      fetchInsights();
    }
  }, [
    activeTab,
    isCompletedSession,
    sessionInsight,
    insightsLoading,
    insightsFetchAttempted,
    insightsError,
    fetchInsights,
  ]);

  React.useEffect(() => {
    setSoapFetchAttempted(false);
    setSoapError(null);
    setSoapNote(null);
    setInsightsFetchAttempted(false);
    clearInsightsError();
  }, [id]);

  const handleSaveDetails = async () => {
    if (!id) return;
    setSavingDetails(true);
    try {
      const scheduledDate = new Date(detailsData.scheduled_date);
      await sessionsService.updateSession(id, {
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: detailsData.duration_minutes,
        location: detailsData.location,
        is_online: detailsData.is_online,
      });
      await fetchSession();
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to save session details:', error);
      alert('Failed to save session details. Please try again.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateSessionNotes({ session_notes: noteText });
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleSaveSummary = async () => {
    if (!id) return;
    setSavingSummary(true);
    try {
      await sessionsService.updateSessionSummary(id, summaryData);
      await fetchSession();
      setIsEditingSummary(false);
    } catch (error) {
      console.error('Failed to save summary:', error);
      alert('Failed to save summary. Please try again.');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await sessionsService.deleteSession(id);
        navigate('/sessions');
      } catch (error) {
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':   return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SCHEDULED':   return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED':   return 'bg-red-100 text-red-800 border-red-200';
      default:            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
    } catch {
      return { date: 'Invalid date', time: 'Invalid time' };
    }
  };

  // ── Emotion events derived from AI Service transcript ──────────────────────
  const emotionEvents = React.useMemo(() => {
    const segments = transcription?.segments || [];

    type EmotionPoint = {
      time: number;
      emotion: string;
      confidence: number;
      speaker: string;
      text: string;
      source: 'text_only' | 'audio_text' | 'unknown';
      textEmotion: string | null;
      audioEmotion: string | null;
    };

    const points: EmotionPoint[] = [];

    segments.forEach((segment: any) => {
      const rawEmotion = segment?.emotion;
      if (!rawEmotion) return;

      let primaryEmotion = 'unknown';
      let confidence = 0;
      let source: 'text_only' | 'audio_text' | 'unknown' = 'unknown';
      let textEmotion: string | null = null;
      let audioEmotion: string | null = null;

      if (typeof rawEmotion === 'string') {
        primaryEmotion = rawEmotion.toLowerCase();
        source = 'text_only';
      } else if (typeof rawEmotion === 'object') {
        const analysisType = rawEmotion.analysis_type as string | undefined;

        // AI Service flat SegmentEmotionResult — audio_emotion/text_emotion are plain strings
        if (typeof rawEmotion.audio_emotion === 'string' && rawEmotion.audio_emotion) {
          audioEmotion = rawEmotion.audio_emotion.toLowerCase();
        } else if (typeof rawEmotion.audio_emotion?.primary_emotion === 'string') {
          audioEmotion = rawEmotion.audio_emotion.primary_emotion.toLowerCase();
        }

        if (typeof rawEmotion.text_emotion === 'string' && rawEmotion.text_emotion) {
          textEmotion = rawEmotion.text_emotion.toLowerCase();
        } else if (typeof rawEmotion.text_emotion?.primary_emotion === 'string') {
          textEmotion = rawEmotion.text_emotion.primary_emotion.toLowerCase();
        }

        // Source detection — analysis_type is authoritative
        if (analysisType === 'combined') {
          source = 'audio_text';
        } else if (analysisType === 'audio_only') {
          source = 'audio_text';
        } else if (analysisType === 'text_only') {
          source = 'text_only';
        } else if (audioEmotion && textEmotion) {
          source = 'audio_text';
        } else if (textEmotion || audioEmotion) {
          source = 'text_only';
        }

        // GPT fused final_emotion takes priority
        primaryEmotion = String(
          rawEmotion.final_emotion ||
          rawEmotion.primary_emotion ||
          audioEmotion ||
          textEmotion ||
          'unknown'
        ).toLowerCase();

        confidence =
          typeof rawEmotion.final_confidence === 'number' ? rawEmotion.final_confidence :
          typeof rawEmotion.confidence === 'number'       ? rawEmotion.confidence :
          typeof rawEmotion.audio_confidence === 'number' ? rawEmotion.audio_confidence :
          0;
      }

      points.push({
        time: Number(segment.start_time || 0),
        emotion: primaryEmotion || 'unknown',
        confidence,
        speaker: String(segment.speaker || segment.speaker_type || 'Unknown'),
        text: String(segment.text || segment.text_english || segment.text_urdu || ''),
        source,
        textEmotion,
        audioEmotion,
      });
    });

    return points.sort((a, b) => a.time - b.time);
  }, [transcription]);

  const emotionSummary = React.useMemo(() => {
    if (!emotionEvents.length) {
      return { dominantEmotion: null as string | null };
    }
    const patientEmotionEvents = emotionEvents.filter((p) => {
      const speaker = String(p.speaker || '').toUpperCase();
      return (
        speaker === 'PATIENT' ||
        speaker === 'PATIENT_1' ||
        speaker === 'PATIENT_2' ||
        speaker.includes('PATIENT')
      );
    });

    const counts: Record<string, number> = {};
    patientEmotionEvents.forEach((p) => { counts[p.emotion] = (counts[p.emotion] || 0) + 1; });
    const dominantEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { dominantEmotion };
  }, [emotionEvents]);

  const emotionalPatternsList = React.useMemo(
    () => normalizeEmotionalPatterns(sessionInsight?.emotional_patterns),
    [sessionInsight?.emotional_patterns]
  );

  // ── Three-line emotion chart (audio / text / GPT fused) ───────────────────
  const emotionLineChart = React.useMemo(() => {
    const emotionPoints = emotionEvents.filter((p) => {
      const speaker = String(p.speaker || '').toUpperCase();
      const isPatient =
        speaker === 'PATIENT' ||
        speaker === 'PATIENT_1' ||
        speaker === 'PATIENT_2' ||
        speaker.includes('PATIENT');

      return isPatient && EMOTION_VISUAL_ORDER.includes(p.emotion as any);
    });
    if (emotionPoints.length < 2) return null;

    const width = 920;
    const height = 280;
    const padding = 36;
    const leftAxisWidth = 102;
    const maxTime = Math.max(...emotionPoints.map((p) => p.time), 1);

    const xFor = (t: number) =>
      leftAxisWidth + padding + (t / maxTime) * (width - leftAxisWidth - padding * 2);

    const yForEmotion = (emotion: string) => {
      const idx = Math.max(0, EMOTION_VISUAL_ORDER.indexOf(emotion as any));
      const slots = EMOTION_VISUAL_ORDER.length - 1 || 1;
      return padding + (idx / slots) * (height - padding * 2);
    };

    // GPT fused final
    const gptPath = emotionPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.time)} ${yForEmotion(p.emotion)}`)
      .join(' ');

    // Audio emotion
    const audioPoints = emotionPoints.filter(
      (p) => p.audioEmotion && EMOTION_VISUAL_ORDER.includes(p.audioEmotion as any)
    );
    const audioPath =
      audioPoints.length >= 2
        ? audioPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.time)} ${yForEmotion(p.audioEmotion!)}`)
            .join(' ')
        : null;

    // Text emotion
    const textPoints = emotionPoints.filter(
      (p) => p.textEmotion && EMOTION_VISUAL_ORDER.includes(p.textEmotion as any)
    );
    const textPath =
      textPoints.length >= 2
        ? textPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.time)} ${yForEmotion(p.textEmotion!)}`)
            .join(' ')
        : null;

    return {
      width, height, leftAxisWidth,
      gptPath, audioPath, textPath,
      points: emotionPoints, audioPoints, textPoints,
      xFor, yForEmotion,
      yTicks: EMOTION_VISUAL_ORDER,
    };
  }, [emotionEvents]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load session details</p>
          <button onClick={() => navigate('/sessions')} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const sessionDateTime = formatDateTime(session.scheduled_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      {/* Header */}
      <div className="text-purple-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(-1)} className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all">
                <ChevronLeft size={24} />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-serif font-bold">Session Details</h1>
                  <div className={`inline-flex text-purple-900 items-center px-2 py-1.5 rounded-full text-sm font-semibold border-2 shadow-lg ${getStatusColor(session.status)}`}>
                    {session.status?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center mt-2 text-purple-900">
                  <User size={16} className="mr-2" />
                  <p className="font-medium">Session id #{session.id}</p>
                </div>
                <div className="flex items-center mt-2 text-purple-900">
                  <User size={16} className="mr-2" />
                  <p className="font-medium">{session.patient.full_name}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3 items-end">
              <button onClick={handleDeleteSession} className="flex items-center space-x-2 px-4 py-2.5 bg-red-600/90 backdrop-blur-sm rounded-xl hover:bg-red-700 transition-all shadow-lg" title="Delete session">
                <Trash2 size={18} color="white" />
                <span className="hidden sm:inline text-white font-medium">Delete</span>
              </button>
              <button onClick={() => navigate(`/patients/${session.patient.id}`)} className="flex items-center space-x-2 px-4 py-2.5 bg-white text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold">
                <User size={18} />
                <span className="hidden sm:inline">View Patient Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-2 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {(['overview', 'soap', 'emotional-profile', 'ai-insights'] as SessionDetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === tab ? 'bg-[#431657] text-white' : 'bg-gray-100 text-[#431657] hover:bg-[#d4bdde]'}`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'soap' ? 'SOAP Notes' : tab === 'emotional-profile' ? 'Emotional Profile' : 'AI Insights'}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              {/* Session Overview card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-serif font-semibold tracking-tight text-gray-900 flex items-center">
                      <FileText className="mr-2 text-gray-500" size={20} /> Session Overview
                    </h2>
                    <div className="flex items-center gap-3">
                      {!isEditingDetails ? (
                        <button onClick={() => setIsEditingDetails(true)} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          <Edit3 size={16} className="mr-1" /> Edit Details
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <button onClick={handleSaveDetails} disabled={savingDetails} className="flex items-center bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
                            <Save size={14} className="mr-1" /> {savingDetails ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setIsEditingDetails(false)} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                            <X size={14} className="mr-1" /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {isEditingDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Date & Time</label>
                        <input type="datetime-local" value={detailsData.scheduled_date} onChange={(e) => setDetailsData({ ...detailsData, scheduled_date: e.target.value })} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Duration (minutes)</label>
                        <select value={detailsData.duration_minutes} onChange={(e) => setDetailsData({ ...detailsData, duration_minutes: parseInt(e.target.value) })} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                        <input type="text" value={detailsData.location} onChange={(e) => setDetailsData({ ...detailsData, location: e.target.value })} placeholder="e.g., Clinic Room 1" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" checked={detailsData.is_online} onChange={(e) => setDetailsData({ ...detailsData, is_online: e.target.checked })} className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                          <span className="text-sm font-medium text-gray-900">Online Session</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {[
                        { label: 'Date', value: sessionDateTime.date },
                        { label: 'Time', value: sessionDateTime.time },
                        { label: 'Location', value: `${session.location || 'Not specified'}${session.is_online ? ' • Online' : ''}` },
                        { label: 'Duration', value: `${session.duration_minutes || session.actual_duration_minutes || 60} minutes` },
                      ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                          <p className="md:col-span-2 text-sm font-medium text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Session Notes */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="text-blue-600 mr-2" size={20} />
                      <h3 className="text-lg font-sans font-semibold text-gray-900">Session Notes</h3>
                    </div>
                    {!isEditingNotes ? (
                      <button onClick={() => setIsEditingNotes(true)} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                        <Edit3 size={16} className="mr-1" /> Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button onClick={handleSaveNotes} className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                          <Save size={16} className="mr-1" /> Save
                        </button>
                        <button onClick={() => { setIsEditingNotes(false); setNoteText(session.session_notes || ''); }} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                          <X size={16} className="mr-1" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isEditingNotes ? (
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base" placeholder="Enter your session notes here..." />
                  ) : (
                    <div className="min-h-[12rem]">
                      {session.session_notes ? (
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base bg-gray-50 rounded-xl p-4">{session.session_notes}</div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText size={48} className="mx-auto mb-4 opacity-30" />
                          <p>No notes have been added for this session yet.</p>
                          <button onClick={() => setIsEditingNotes(true)} className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">Add notes</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Session Summary */}
              {(session.status === 'COMPLETED' || session.status === 'IN_PROGRESS') && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-6 py-4 border-b border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="text-amber-600 mr-2" size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Session Summary</h3>
                      </div>
                      {!isEditingSummary ? (
                        <button onClick={() => setIsEditingSummary(true)} className="flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium">
                          <Edit size={16} className="mr-1" /> Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={handleSaveSummary} disabled={savingSummary} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                            <Save size={16} className="mr-1" /> {savingSummary ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => { setIsEditingSummary(false); setSummaryData({ session_summary: session.session_summary || '', patient_goals: session.patient_goals || '', homework_assigned: session.homework_assigned || '', next_session_goals: session.next_session_goals || '' }); }} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                            <X size={16} className="mr-1" /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {isEditingSummary ? (
                      <>
                        {[
                          { field: 'patient_goals' as const, label: 'Patient Goals', placeholder: 'What goals were discussed for the patient...' },
                          { field: 'homework_assigned' as const, label: 'Homework Assigned', placeholder: 'Any homework or exercises assigned to the patient...' },
                          { field: 'next_session_goals' as const, label: 'Goals for Next Session', placeholder: 'What to focus on in the next session...' },
                        ].map(({ field, label, placeholder }) => (
                          <div key={field}>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
                            <textarea value={summaryData[field]} onChange={(e) => setSummaryData({ ...summaryData, [field]: e.target.value })} className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-base" placeholder={placeholder} />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { emoji: '🎯', label: 'Patient Goals', value: session.patient_goals, color: 'blue' },
                          { emoji: '📝', label: 'Homework Assigned', value: session.homework_assigned, color: 'purple' },
                          { emoji: '🔮', label: 'Goals for Next Session', value: session.next_session_goals, color: 'green' },
                        ].map(({ emoji, label, value, color }) => (
                          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
                            <p className="font-semibold text-gray-900 mb-2 flex items-center"><span className="mr-2">{emoji}</span>{label}</p>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Session Metrics */}
              {session.status === 'COMPLETED' && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-50 to-pink-100/50 px-6 py-4 border-b border-pink-200">
                    <div className="flex items-center">
                      <Activity className="text-pink-600 mr-2" size={20} />
                      <h3 className="text-lg font-bold text-gray-900">Session Metrics</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {session.patient_mood_before !== null && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Mood (Before)</span>
                          <span className="text-2xl font-bold text-gray-900">{session.patient_mood_before}<span className="text-base text-gray-500">/10</span></span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div className="h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400" style={{ width: `${(session.patient_mood_before / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {session.patient_mood_after !== null && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Patient Mood (After)</span>
                          <span className="text-2xl font-bold text-gray-900">{session.patient_mood_after}<span className="text-base text-gray-500">/10</span></span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: `${(session.patient_mood_after / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {session.mood_improvement !== null && session.mood_improvement !== 0 && (
                      <div className={`rounded-xl p-4 ${session.mood_improvement > 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                        <p className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">Mood Change</p>
                        <p className={`text-xl font-bold ${session.mood_improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>{session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement} points</p>
                        <p className={`text-sm font-semibold mt-2 ${session.mood_improvement > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {session.mood_improvement >= 3 ? '🎉 Significant Improvement' : session.mood_improvement >= 1 ? '✅ Positive Progress' : '⚠️ Needs Attention'}
                        </p>
                      </div>
                    )}
                    {session.session_effectiveness !== null && (
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Session Effectiveness</span>
                          <span className="text-xl font-bold text-purple-600">{session.session_effectiveness}<span className="text-lg text-gray-500">/10</span></span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                          <div className={`h-4 rounded-full ${session.session_effectiveness >= 8 ? 'bg-gradient-to-r from-green-400 to-green-600' : session.session_effectiveness >= 6 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`} style={{ width: `${(session.session_effectiveness / 10) * 100}%` }} />
                        </div>
                        <p className={`text-center text-sm font-bold uppercase tracking-wider px-3 py-2 rounded-lg mt-3 inline-block ${session.session_effectiveness >= 8 ? 'bg-green-100 text-green-700' : session.session_effectiveness >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {session.session_effectiveness >= 8 ? '⭐ Highly Effective' : session.session_effectiveness >= 6 ? '👍 Moderately Effective' : '⚠️ Needs Improvement'}
                        </p>
                      </div>
                    )}
                    {session.patient_mood_before === null && session.patient_mood_after === null && session.session_effectiveness === null && (
                      <div className="text-center py-4"><p className="text-gray-400 italic">No session metrics recorded</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Transcription */}
              {session.status === 'COMPLETED' && transcription && !transcriptionError && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-green-100/50 px-6 py-4 border-b border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="text-green-600 mr-2" size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Session Transcription</h3>
                        {transcription.is_mock_data && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Mock Data</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {transcription.total_duration ? `Duration: ${Math.floor(transcription.total_duration / 60)}:${String(Math.floor(transcription.total_duration % 60)).padStart(2, '0')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {transcription.segments.map((segment) => (
                        <div key={segment.id} className="flex gap-4">
                          <div className="flex-shrink-0 w-20 text-xs text-gray-500 pt-1">
                            {Math.floor(segment.start_time / 60)}:{String(Math.floor(segment.start_time % 60)).padStart(2, '0')}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold mb-1 ${(segment.speaker_id === 'THERAPIST' || segment.speaker_type === 'therapist') ? 'text-purple-700' : 'text-green-700'}`}>
                              {segment.speaker_id === 'THERAPIST' || segment.speaker_type === 'therapist' ? '🩺 Therapist' : '👤 Patient'}
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">{segment.text}</p>
                            {segment.emotion && (
                              <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {(() => {
                                  if (typeof segment.emotion === 'string') return segment.emotion;
                                  const e = segment.emotion as any;
                                  return e.final_emotion || e.primary_emotion || 'emotion';
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {session.status === 'COMPLETED' && (analysisLoading || transcriptionLoading) && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Loading AI analysis and transcription...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SOAP TAB ── */}
        {activeTab === 'soap' && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50 to-violet-100/50 px-6 py-4 border-b border-violet-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-gray-900">SOAP Notes</h3>
                  <p className="text-sm text-gray-500 mt-1">{isCompletedSession ? 'AI-generated structured clinical notes from your session recording.' : 'This will be available after the session is completed.'}</p>
                </div>
                {isCompletedSession && (
                  <button onClick={handleGenerateSoap} disabled={soapGenerating} className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                    <Sparkles size={16} className="mr-2" /> {soapGenerating ? 'Generating...' : 'Generate SOAP Notes'}
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {!isCompletedSession ? (
                <p className="text-gray-500 italic">This will be available after the session is completed.</p>
              ) : soapLoading ? (
                <div className="flex items-center text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600 mr-3" /> Loading SOAP notes...
                </div>
              ) : soapNote ? (
                <div className="space-y-4">
                  {(['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => (
                    <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      <div className="w-full bg-[#dbb4eb] px-4 py-2">
                        <p className="text-sm uppercase tracking-wide text-[#431657] font-semibold">{key}</p>
                      </div>
                      <div className="p-4">
                        <ReactMarkdown components={markdownComponents}>
                          {soapNote[key]?.content || 'Not available.'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">No SOAP note generated yet for this session.</p>
                  <button onClick={handleGenerateSoap} disabled={soapGenerating} className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                    <Sparkles size={16} className="mr-2" /> {soapGenerating ? 'Generating...' : 'Generate SOAP Notes'}
                  </button>
                </div>
              )}
              {soapError && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{soapError}</div>}
            </div>
          </div>
        )}

        {/* ── EMOTIONAL PROFILE TAB ── */}
        {activeTab === 'emotional-profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-50 to-blue-100/60 px-6 py-4 border-b border-cyan-200">
                <h3 className="text-xl font-bold text-gray-900">Emotional Profile</h3>
                <p className="text-sm text-gray-600 mt-1">Three-stage pipeline: Wav2Vec2 audio · distilroberta text · GPT-4o-mini fusion</p>
              </div>

              <div className="p-6">
                {!isCompletedSession ? (
                  <p className="text-sm text-gray-500">This will be available after the session is completed.</p>
                ) : analysisLoading || transcriptionLoading ? (
                  <div className="flex items-center text-gray-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600 mr-3" />
                    Loading emotional profile data...
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Dominant Emotion</p>
                        <p className="text-xl font-bold text-gray-900 mt-2 capitalize">
                          {emotionSummary.dominantEmotion || analysis?.overall_mood || 'Unavailable'}
                        </p>
                      </div>
                    </div>

                    {/* Three-line emotion timeline chart */}
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Emotion Journey (Timeline)</p>

                      {emotionLineChart ? (
                        <div className="w-full overflow-x-auto">
                          {/* Legend */}
                          <div className="flex flex-wrap gap-5 mb-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <svg width="28" height="10">
                                <line x1="0" y1="5" x2="28" y2="5" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 3"/>
                                <circle cx="14" cy="5" r="3" fill="#6366f1"/>
                              </svg>
                              🎤 Audio (Wav2Vec2)
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg width="28" height="10">
                                <line x1="0" y1="5" x2="28" y2="5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3"/>
                                <circle cx="14" cy="5" r="3" fill="#f59e0b"/>
                              </svg>
                              📝 Text (distilroberta)
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg width="28" height="10">
                                <line x1="0" y1="5" x2="28" y2="5" stroke="#111827" strokeWidth="2.5"/>
                                <circle cx="14" cy="5" r="3" fill="#10b981"/>
                              </svg>
                              🤖 GPT Fused Final
                            </span>
                          </div>

                          <svg viewBox={`0 0 ${emotionLineChart.width} ${emotionLineChart.height}`} className="w-full min-w-[760px] h-72">
                            {/* Axes */}
                            <line x1={emotionLineChart.leftAxisWidth} y1="36" x2={emotionLineChart.leftAxisWidth} y2={emotionLineChart.height - 36} stroke="#e5e7eb" strokeWidth="1"/>
                            <line x1={emotionLineChart.leftAxisWidth} y1={emotionLineChart.height - 36} x2={emotionLineChart.width - 36} y2={emotionLineChart.height - 36} stroke="#e5e7eb" strokeWidth="1"/>

                            {/* Y-axis labels + gridlines */}
                            {emotionLineChart.yTicks.map((emotionKey) => {
                              const y = emotionLineChart.yForEmotion(emotionKey);
                              return (
                                <g key={emotionKey}>
                                  <line x1={emotionLineChart.leftAxisWidth} y1={y} x2={emotionLineChart.width - 36} y2={y} stroke="#f3f4f6" strokeDasharray="4 4" strokeWidth="1"/>
                                  <text x={emotionLineChart.leftAxisWidth - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{emotionKey}</text>
                                </g>
                              );
                            })}

                            {/* Audio line — indigo dashed */}
                            {emotionLineChart.audioPath && (
                              <>
                                <path d={emotionLineChart.audioPath} fill="none" stroke="#6366f1" strokeWidth="1.8" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
                                {emotionLineChart.audioPoints.map((point, index) => (
                                  <circle key={`audio-${point.time}-${index}`} cx={emotionLineChart.xFor(point.time)} cy={emotionLineChart.yForEmotion(point.audioEmotion!)} r="4" fill="#6366f1">
                                    <title>Audio: {point.audioEmotion} @ {Math.floor(point.time / 60)}:{String(Math.floor(point.time % 60)).padStart(2, '0')}</title>
                                  </circle>
                                ))}
                              </>
                            )}

                            {/* Text line — amber dashed */}
                            {emotionLineChart.textPath && (
                              <>
                                <path d={emotionLineChart.textPath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
                                {emotionLineChart.textPoints.map((point, index) => (
                                  <circle key={`text-${point.time}-${index}`} cx={emotionLineChart.xFor(point.time)} cy={emotionLineChart.yForEmotion(point.textEmotion!)} r="4" fill="#f59e0b">
                                    <title>Text: {point.textEmotion} @ {Math.floor(point.time / 60)}:{String(Math.floor(point.time % 60)).padStart(2, '0')}</title>
                                  </circle>
                                ))}
                              </>
                            )}

                            {/* GPT fused — dark solid, rendered on top */}
                            <path d={emotionLineChart.gptPath} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                            {emotionLineChart.points.map((point, index) => (
                              <circle key={`gpt-${point.time}-${index}`} cx={emotionLineChart.xFor(point.time)} cy={emotionLineChart.yForEmotion(point.emotion)} r="5" fill={EMOTION_COLORS[point.emotion] || EMOTION_COLORS.unknown} stroke="white" strokeWidth="1.5">
                                <title>GPT Final: {point.emotion} @ {Math.floor(point.time / 60)}:{String(Math.floor(point.time % 60)).padStart(2, '0')}</title>
                              </circle>
                            ))}
                          </svg>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Insufficient emotion event data for timeline chart.</p>
                      )}
                    </div>

                    {/* Emotion Events */}
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Emotion Events</p>
                      {emotionEvents.length > 0 ? (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {emotionEvents.map((point, index) => (
                            <div key={`${point.time}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>{point.speaker}</span>
                                <span>{Math.floor(point.time / 60)}:{String(Math.floor(point.time % 60)).padStart(2, '0')}</span>
                              </div>
                              <p className="text-sm text-gray-900 font-medium capitalize">{point.emotion}</p>
                              <div className="text-xs text-gray-600 mt-1">
                                <span>Confidence: {(point.confidence * 100).toFixed(0)}%</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-2">
                                {point.source !== 'unknown' && (
                                  <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                                    Source: {point.source === 'audio_text' ? 'Audio + Text' : 'Text Only'}
                                  </span>
                                )}
                                {point.textEmotion  && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Text: {point.textEmotion}</span>}
                                {point.audioEmotion && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Audio: {point.audioEmotion}</span>}
                              </div>
                              {point.text && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{point.text}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No per-segment emotion events found yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── AI INSIGHTS TAB ── */}
        {activeTab === 'ai-insights' && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-fuchsia-50 to-indigo-100/60 px-6 py-4 border-b border-fuchsia-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AI Insights</h3>
                  <p className="text-sm text-gray-600 mt-1">Therapist coaching insights generated from notes, SOAP, transcription, and emotion signals.</p>
                </div>
                {isCompletedSession && (
                  <button
                    onClick={handleGenerateInsights}
                    disabled={insightsGenerating}
                    className="inline-flex items-center px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50"
                  >
                    <Sparkles size={16} className="mr-2" /> {insightsGenerating ? 'Generating...' : 'Generate AI Insights'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {!isCompletedSession ? (
                <p className="text-gray-500 italic">This will be available after the session is completed.</p>
              ) : insightsLoading ? (
                <div className="flex items-center text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-fuchsia-600 mr-3" /> Loading AI insights...
                </div>
              ) : sessionInsight ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Overall Mood</p>
                      <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{sessionInsight.overall_mood || 'Unavailable'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Mood Score</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {sessionInsight.mood_score !== null && sessionInsight.mood_score !== undefined
                          ? `${sessionInsight.mood_score.toFixed(1)} / 10`
                          : 'Unavailable'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Generated At</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {sessionInsight.generated_at
                          ? new Date(sessionInsight.generated_at).toLocaleString()
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Key Themes</p>
                    {sessionInsight.key_themes?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {sessionInsight.key_themes.map((theme, idx) => (
                          <span key={`${theme}-${idx}`} className="text-sm px-3 py-1.5 rounded-full bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                            {theme}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No key themes available.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Recommendations</p>
                    <ReactMarkdown components={markdownComponents}>
                      {sessionInsight.recommendations || 'No recommendations available.'}
                    </ReactMarkdown>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Emotional Patterns</p>
                    {emotionalPatternsList.length ? (
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {emotionalPatternsList.join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">No emotional patterns available.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">No AI insights generated yet for this session.</p>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={insightsGenerating}
                    className="inline-flex items-center px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50"
                  >
                    <Sparkles size={16} className="mr-2" /> {insightsGenerating ? 'Generating...' : 'Generate AI Insights'}
                  </button>
                </div>
              )}

              {insightsError && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{(insightsError as any)?.message || 'Failed to load/generate AI insights.'}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetailPage;
