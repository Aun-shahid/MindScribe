import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight } from 'lucide-react';
import { useTherapistPatients } from '../hooks/usePatients';
import sessionsService from '../services/sessions.service';
import type { SessionType } from '../types/session';

const TOOLS_BANNER_DISMISSED_KEY = 'tools-banner-dismissed-v1';

const Tools: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<SessionType[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const patientSelectionRef = useRef<HTMLDivElement | null>(null);

  const { patients, loading: patientsLoading } = useTherapistPatients({ search: searchQuery });

  useEffect(() => {
    setShowBanner(localStorage.getItem(TOOLS_BANNER_DISMISSED_KEY) !== 'true');
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(TOOLS_BANNER_DISMISSED_KEY, 'true');
    setShowBanner(false);
  };

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const loadCompletedSessions = async (patientId: string) => {
    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const response = await sessionsService.getPatientSessions(patientId, {
        include_upcoming: false,
        include_past: true,
        status: 'COMPLETED',
      });

      const pastSessions = Array.isArray(response?.sessions?.past) ? response.sessions.past : [];
      const normalized = pastSessions.sort((a: SessionType, b: SessionType) => {
        const aTime = new Date((a as any).scheduled_date || a.session_date).getTime();
        const bTime = new Date((b as any).scheduled_date || b.session_date).getTime();
        return bTime - aTime;
      });
      setCompletedSessions(normalized);
    } catch (error: any) {
      setCompletedSessions([]);
      setSessionsError(error?.message || 'Failed to load completed sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    loadCompletedSessions(patientId);
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const formatSessionDate = (session: SessionType) => {
    const raw = (session as any).scheduled_date || session.session_date;
    if (!raw) return 'Date unavailable';

    return new Date(raw).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleToolCardClick = () => {
    patientSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-6 -mx-8 px-8 pt-6">
      <div className="max-w-6xl mx-auto">
        
          <div className=" text-white bg-purple-950 shadow-lg">
            <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-6">
          
              <h1 className="text-3xl font-serif font-bold text-white mt-2 pt-4">Tools</h1>
                <p className="text-white pt-2 pb-4 font-serif">Access AI-assisted outputs from completed sessions.</p>
           </div>
          </div>
        

        {showBanner && (
          <div className="mb-6 rounded-2xl border border-purple-200 m-7 bg-purple-50 p-5 relative">
            <button
              onClick={dismissBanner}
              className="absolute top-3 right-3 text-purple-500 hover:text-purple-700"
              aria-label="Dismiss tools banner"
            >
              <X size={18} />
            </button>
            <p className="text-purple-900 font-serif m-2 pr-8">
              Welcome to AI Tools!  After each completed session, MindScribe automatically generates three powerful tools to help you save time and track patient progress — SOAP Notes for structured documentation, Emotional Profiles for mood tracking, and AI Insights for clinical recommendations.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <button
            type="button"
            onClick={handleToolCardClick}
            className="text-left bg-white border-[0.5px] border-gray-200 rounded-[16px] overflow-hidden hover:shadow-sm transition-all"
          >
            <div className="h-[140px] bg-[#EEEDFE] flex items-center justify-center">
              <svg width="172" height="108" viewBox="0 0 172 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="26" y="10" width="98" height="88" rx="10" fill="#CECBF6" stroke="#AFA9EC" strokeWidth="1.4"/>
                <line x1="42" y1="30" x2="108" y2="30" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round"/>
                <line x1="42" y1="42" x2="112" y2="42" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round"/>
                <line x1="42" y1="54" x2="102" y2="54" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round"/>
                <line x1="42" y1="66" x2="109" y2="66" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round"/>
                <line x1="42" y1="78" x2="96" y2="78" stroke="#AFA9EC" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="126" cy="78" r="18" fill="#534AB7"/>
                <path d="M117 78L123.2 84L135 72.4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
           
            <div className="p-5 border-t-[0.5px] border-gray-200">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#534AB7] font-semibold">Clinical documentation</p>
              <h3 className="mt-2 text-[16px] font-medium text-gray-900">SOAP Notes</h3>
              <p className="mt-2 text-[13px] text-gray-600 leading-[1.6]">Structured Subjective, Objective, Assessment, and Plan documentation generated from completed sessions.</p>
              <span className="inline-flex mt-4 px-3 py-1.5 text-xs font-medium rounded-md border border-[#534AB7] text-[#534AB7]">View notes →</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleToolCardClick}
            className="text-left bg-white border-[0.5px] border-gray-200 rounded-[16px] overflow-hidden hover:shadow-sm transition-all"
          >
            <div className="h-[140px] bg-[#E1F5EE] flex items-center justify-center">
              <svg width="172" height="108" viewBox="0 0 172 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="34" y="66" width="12" height="24" rx="3" fill="#aca3bf"/>
                <rect x="52" y="54" width="12" height="36" rx="3" fill="#7661a6"/>
                <rect x="70" y="42" width="12" height="48" rx="3" fill="#482e85"/>
                <rect x="88" y="30" width="12" height="60" rx="3" fill="#250b62"/>
                <rect x="106" y="18" width="12" height="72" rx="3" fill="#350759"/>
                <circle cx="40" cy="62" r="3.5" fill="#350759"/>
                <circle cx="58" cy="50" r="3.5" fill="#350759"/>
                <circle cx="76" cy="38" r="3.5" fill="#350759"/>
                <circle cx="94" cy="26" r="3.5" fill="#350759"/>
                <circle cx="112" cy="14" r="3.5" fill="#350759"/>
                <path d="M40 62L58 50L76 38L94 26L112 14" stroke="#350759" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
                <rect x="111" y="71" width="44" height="18" rx="9" fill="#0B4D3C"/>
                <text x="133" y="83" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="sans-serif">improving</text>
              </svg>
            </div>
            <div className="p-5 border-t-[0.5px] border-gray-200">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#0F6E56] font-semibold">Mood tracking</p>
              <h3 className="mt-2 text-[16px] font-medium text-gray-900">Emotional Profile</h3>
              <p className="mt-2 text-[13px] text-gray-600 leading-[1.6]">Review emotional movement and trend signals throughout sessions to monitor progress over time.</p>
              <span className="inline-flex mt-4 px-3 py-1.5 text-xs font-medium rounded-md border border-[#2b0f6e] text-[#350759]">View profile →</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleToolCardClick}
            className="text-left bg-white border-[0.5px] border-gray-200 rounded-[16px] overflow-hidden hover:shadow-sm transition-all"
          >
            <div className="h-[140px] bg-[#d5bee9] flex items-center justify-center">
              <svg width="172" height="108" viewBox="0 0 172 108" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="86" cy="42" r="24" fill="#7661a6"/>
                <path d="M86 24C79.5 24 74 29.3 74 35.8C74 41 76.9 44.3 80.2 47.2C82.1 48.8 83 50.2 83 52V54H89V52C89 50.2 89.9 48.8 91.8 47.2C95.1 44.3 98 41 98 35.8C98 29.3 92.5 24 86 24Z" fill="#350759"/>
                <rect x="81" y="56" width="10" height="4" rx="2" fill="#7661a6"/>
                <line x1="86" y1="10" x2="86" y2="2" stroke="#7661a6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="66" y1="16" x2="60" y2="10" stroke="#7661a6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="106" y1="16" x2="112" y2="10" stroke="#7661a6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="58" y1="36" x2="50" y2="36" stroke="#7661a6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="114" y1="36" x2="122" y2="36" stroke="#7661a6" strokeWidth="2" strokeLinecap="round"/>
                <rect x="34" y="74" width="33" height="18" rx="8" fill="#350759"/>
                <text x="50" y="85" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="sans-serif">CBT</text>
                <rect x="74" y="74" width="46" height="18" rx="8" fill="#350759"/>
                <text x="97" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="sans-serif">mindful</text>
                <rect x="128" y="74" width="40" height="18" rx="8" fill="#350759"/>
                <text x="148" y="85" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="sans-serif">journal</text>
              </svg>
            </div>
            <div className="p-5 border-t-[0.5px] border-gray-200">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#854F0B] font-semibold">Clinical recommendations</p>
              <h3 className="mt-2 text-[16px] font-medium text-gray-900">AI Insights</h3>
              <p className="mt-2 text-[13px] text-gray-600 leading-[1.6]">Actionable recommendations and themes to support your intervention planning and follow-up strategy.</p>
              <span className="inline-flex mt-4 px-3 py-1.5 text-xs font-medium rounded-md border border-[#854F0B] text-[#854F0B]">View insights →</span>
            </div>
          </button>
        </div>

        <div ref={patientSelectionRef} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900">Select a Patient to View Their Sessions</h2>

          <div className="mt-4 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {patientsLoading ? (
              <div className="col-span-full text-sm text-gray-500">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="col-span-full text-sm text-gray-500">No patients found.</div>
            ) : (
              patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={`text-left border rounded-xl p-4 transition-colors ${selectedPatientId === patient.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-500'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitials(patient.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{patient.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(patient as any).total_sessions || 0} sessions
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedPatient && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Completed Sessions for {selectedPatient.full_name}</h3>

            {sessionsLoading ? (
              <p className="text-sm text-gray-500">Loading completed sessions...</p>
            ) : sessionsError ? (
              <p className="text-sm text-red-600">{sessionsError}</p>
            ) : completedSessions.length === 0 ? (
              <p className="text-sm text-gray-500">No completed sessions found for this patient.</p>
            ) : (
              <div className="space-y-3">
                {completedSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{formatSessionDate(session)}</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        Session #{(session as any).session_number || 'N/A'}
                        <span className="text-sm font-normal text-gray-500 ml-2 capitalize">{session.session_type}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/sessions/${session.id}?tab=soap`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;
