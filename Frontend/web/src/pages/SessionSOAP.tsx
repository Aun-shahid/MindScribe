import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, Save, Sparkles } from 'lucide-react';
import sessionsService from '../services/sessions.service';
import type { SOAPNote } from '../types/session';

type SOAPFormState = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const syncForm = useCallback((note: SOAPNote) => {
    setForm({
      subjective: note.subjective?.content || '',
      objective: note.objective?.content || '',
      assessment: note.assessment?.content || '',
      plan: note.plan?.content || '',
    });
  }, []);

  const loadSOAP = useCallback(async () => {
    if (!id) return;

    const aiToken = localStorage.getItem('ai_service_token');
    if (!aiToken) {
      setLoading(false);
      setError('AI session token is missing. Start and end the session flow to obtain a valid token for SOAP access.');
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
      if (err?.code === '404') {
        setError('No SOAP note found for this session yet. Click Generate SOAP to create one.');
      } else {
        setError(err?.message || 'Failed to load SOAP note');
      }
    } finally {
      setLoading(false);
    }
  }, [id, syncForm]);

  useEffect(() => {
    loadSOAP();
  }, [loadSOAP]);

  const generateSOAP = useCallback(async () => {
    if (!id) return;

    const aiToken = localStorage.getItem('ai_service_token');
    if (!aiToken) {
      setError('AI session token is missing. Generate SOAP after completing session flow with a valid token.');
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

  const saveSOAP = useCallback(async () => {
    if (!id) return;

    const aiToken = localStorage.getItem('ai_service_token');
    if (!aiToken) {
      setError('AI session token is missing. Re-open from an authenticated session flow before saving SOAP.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await sessionsService.updateSessionSOAP(id, {
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
      });

      setSoap(updated);
      syncForm(updated);
      setMessage('SOAP note updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update SOAP note');
    } finally {
      setSaving(false);
    }
  }, [id, form, syncForm]);

  const setField = (field: keyof SOAPFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading SOAP note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              disabled={generating}
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <FileText className="text-purple-600 mr-2" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Subjective</h2>
          </div>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            value={form.subjective}
            onChange={(e) => setField('subjective', e.target.value)}
            placeholder="Patient-reported symptoms, feelings, and concerns..."
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Objective</h2>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            value={form.objective}
            onChange={(e) => setField('objective', e.target.value)}
            placeholder="Observable findings, behaviors, measurable data..."
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment</h2>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            value={form.assessment}
            onChange={(e) => setField('assessment', e.target.value)}
            placeholder="Clinical interpretation and progress evaluation..."
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan</h2>
          <textarea
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            value={form.plan}
            onChange={(e) => setField('plan', e.target.value)}
            placeholder="Treatment plan, interventions, and follow-up..."
          />
        </div>

        {soap?.emotional_summary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Emotional Summary</h3>
            <p className="text-indigo-800">{soap.emotional_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSOAP;
