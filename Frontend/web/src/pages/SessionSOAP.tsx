import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, Save, Sparkles, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiServiceUrl } from '../config';
import sessionsService from '../services/sessions.service';
import type { SOAPNote } from '../types/session';

type SOAPFormState = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type SOAPTab = keyof SOAPFormState;

const SOAP_TAB_CONFIG: Array<{
  key: SOAPTab;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  {
    key: 'subjective',
    label: 'Subjective',
    placeholder: 'Patient-reported symptoms, feelings, and concerns...',
    helper: 'Patient perspective, concerns, and self-reported experience.',
  },
  {
    key: 'objective',
    label: 'Objective',
    placeholder: 'Observable findings, behaviors, measurable data...',
    helper: 'Observable data, behavior, and measurable findings.',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    placeholder: 'Clinical interpretation and progress evaluation...',
    helper: 'Clinical interpretation, progress, and diagnostic reasoning.',
  },
  {
    key: 'plan',
    label: 'Plan',
    placeholder: 'Treatment plan, interventions, and follow-up...',
    helper: 'Interventions, homework, and follow-up strategy.',
  },
];

// ─── Transcript polling ────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;   // check every 5 seconds
const POLL_MAX_ATTEMPTS = 24;    // give up after 2 minutes

async function pollForTranscript(sessionId: string): Promise<boolean> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(
    `${aiServiceUrl}/api/v1/session/${sessionId}/transcript`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data.segments) && data.segments.length > 0;
}

// ─── Main component ────────────────────────────────────────────────────────

const SessionSOAP: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [soap, setSoap] = useState<SOAPNote | null>(null);
  const [form, setForm] = useState<SOAPFormState>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling]       = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [message, setMessage]       = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<SOAPTab>('subjective');

  const syncForm = useCallback((note: SOAPNote) => {
    setForm({
      subjective: note.subjective?.content || '',
      objective:  note.objective?.content  || '',
      assessment: note.assessment?.content || '',
      plan:       note.plan?.content       || '',
    });
  }, []);

  // ── Generate SOAP (called automatically once transcript is ready) ──────
  const generateSOAP = useCallback(async () => {
    if (!id) return;

    const aiToken = localStorage.getItem('ai_service_token');
    if (!aiToken) {
      setError('AI session token is missing. Start and end the session flow to obtain a valid token.');
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const response = await sessionsService.generateSessionSOAP(id, {
        include_emotions: true,
        additional_context: '',
      });
      setSoap(response.soap_note);
      syncForm(response.soap_note);
      setMessage(`SOAP generated successfully in ${response.processing_time_ms} ms.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate SOAP note');
    } finally {
      setGenerating(false);
    }
  }, [id, syncForm]);

  // ── Poll until transcript exists, then auto-generate ──────────────────
  const waitForTranscriptThenGenerate = useCallback(async () => {
    if (!id) return;

    setPolling(true);
    setError(null);
    setMessage('Waiting for AI pipeline to finish processing the recording...');

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      setPollAttempt(attempts);

      try {
        const ready = await pollForTranscript(id);
        if (ready) {
          clearInterval(interval);
          setPolling(false);
          setMessage('Transcript ready — generating SOAP notes...');
          await generateSOAP();
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          clearInterval(interval);
          setPolling(false);
          setError(
            'Pipeline is taking longer than expected. ' +
            'You can click "Generate SOAP" manually once the AI service finishes.'
          );
          setMessage(null);
        }
      } catch {
        // network blip — keep trying
      }
    }, POLL_INTERVAL_MS);
  }, [id, generateSOAP]);

  // ── Load existing SOAP or start polling ───────────────────────────────
  const loadSOAP = useCallback(async () => {
    if (!id) return;

    const aiToken = localStorage.getItem('ai_service_token');
    if (!aiToken) {
      setLoading(false);
      setError('AI session token is missing. Start and end the session flow to obtain a valid token.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const note = await sessionsService.getSessionSOAP(id);
      setSoap(note);
      syncForm(note);
    } catch (err: any) {
      // 404 = not generated yet — poll for transcript then auto-generate
      if (err?.code === '404' || err?.status === 404 || String(err?.message).includes('404')) {
        setLoading(false);
        await waitForTranscriptThenGenerate();
        return;
      }
      setError(err?.message || 'Failed to load SOAP note');
    } finally {
      setLoading(false);
    }
  }, [id, syncForm, waitForTranscriptThenGenerate]);

  useEffect(() => {
    loadSOAP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────
  const saveSOAP = useCallback(async () => {
    if (!id) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await sessionsService.updateSessionSOAP(id, {
        subjective: form.subjective,
        objective:  form.objective,
        assessment: form.assessment,
        plan:       form.plan,
      });
      setSoap(updated);
      syncForm(updated);
      setMessage('SOAP note updated successfully. Returning to sessions...');
      setTimeout(() => navigate('/sessions'), 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update SOAP note');
    } finally {
      setSaving(false);
    }
  }, [id, form, syncForm, navigate]);

  const setField = (field: keyof SOAPFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Loading / polling screen ───────────────────────────────────────────
  if (loading || polling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          {polling ? (
            <>
              <p className="text-gray-700 font-medium mb-2">Processing recording...</p>
              <p className="text-gray-500 text-sm mb-1">
                The AI pipeline is transcribing, diarizing, and translating your session.
              </p>
              <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
                <Clock size={12} />
                Check {pollAttempt} of {POLL_MAX_ATTEMPTS} — this usually takes 30–90 seconds.
              </p>
            </>
          ) : (
            <p className="text-gray-600">Loading SOAP note...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Session SOAP Notes</h1>
              <p className="text-purple-200">Session ID: {id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateSOAP}
              disabled={generating || polling}
              className="flex items-center px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60"
            >
              <Sparkles size={18} className="mr-2" />
              {generating ? 'Generating...' : 'Generate SOAP'}
            </button>
            <button
              onClick={saveSOAP}
              disabled={saving}
              className="flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-2">
            {(generating || polling) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0" />
            )}
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <FileText className="text-purple-600 mr-2" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">SOAP Sections</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {SOAP_TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {SOAP_TAB_CONFIG.filter((tab) => tab.key === activeTab).map((tab) => (
            <div key={tab.key}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{tab.label}</h3>
              <p className="text-sm text-gray-500 mb-3">{tab.helper}</p>
              <textarea
                className="w-full h-56 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                value={form[tab.key]}
                onChange={(e) => setField(tab.key, e.target.value)}
                placeholder={tab.placeholder}
              />
            </div>
          ))}
        </div>

        {soap?.emotional_summary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Emotional Summary</h3>
            <div className="text-indigo-800 text-sm leading-relaxed">
              <ReactMarkdown>
                {soap.emotional_summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSOAP;
