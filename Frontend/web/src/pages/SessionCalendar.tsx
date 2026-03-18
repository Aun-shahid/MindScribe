// src/pages/SessionCalendar.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  MapPin,
  Timer,
  RefreshCw,
  CalendarDays,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  User,
  AlertCircle
} from 'lucide-react';
import { useSessionCalendar } from '../hooks/useSessions';
import type { CalendarSession } from '../types/session';

// Enhanced Calendar Component
const EnhancedCalendar: React.FC<{
  selectedDate: string;
  onDayPress: (date: string) => void;
}> = ({ selectedDate, onDayPress }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isSelectedDate = (day: number) => {
    return getDayString(day) === selectedDate;
  };

  const isToday = (day: number) => {
    const today = new Date();
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return dayDate.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>

          <h3 className="text-lg font-semibold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-white rotate-180" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {days.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="h-10"></div>
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayString = getDayString(day);
            const selected = isSelectedDate(day);
            const today = isToday(day);

            return (
              <button
                key={day}
                onClick={() => onDayPress(dayString)}
                className={`h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${selected
                    ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                    : today
                      ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 ring-1 ring-purple-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SessionCalendar: React.FC = () => {
  const navigate = useNavigate();
  const toLocalDateKey = (dateValue: Date | string) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateKey(new Date())
  );

  const {
    sessions: allSessions,
    loading,
    error,
    fetchCalendarSessions
  } = useSessionCalendar();

  // Filter sessions for the selected date
  const sessionsForDate = useMemo(() => {
    if (!allSessions) return [];

    return allSessions.filter(session => {
      const sessionDate = toLocalDateKey(session.session_date);
      return sessionDate === selectedDate;
    });
  }, [allSessions, selectedDate]);

  // Refresh sessions when date changes
  useEffect(() => {
    fetchCalendarSessions(selectedDate);
  }, [selectedDate, fetchCalendarSessions]);

  // Handle error state with user feedback
  useEffect(() => {
    if (error) {
      console.error('Sessions calendar error:', error);
    }
  }, [error]);

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
      case 'REQUESTED':
      case 'SCHEDULED':
      case 'UPCOMING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
        return <Play size={14} className="mr-1" />;
      case 'REQUESTED':
      case 'SCHEDULED':
      case 'UPCOMING':
        return <CalendarIcon size={14} className="mr-1" />;
      case 'COMPLETED':
        return <CheckCircle size={14} className="mr-1" />;
      case 'CANCELLED':
        return <XCircle size={14} className="mr-1" />;
      default:
        return <HelpCircle size={14} className="mr-1" />;
    }
  };

  const formatTime = (sessionDate: string) => {
    try {
      const date = new Date(sessionDate);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Time not set';
    }
  };

  const formatSelectedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleViewDetails = (session: CalendarSession) => {
    navigate(`/sessions/${session.id}`);
  };

  const handleRefresh = () => {
    fetchCalendarSessions(selectedDate);
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Session Calendar</h1>
                <p className="text-purple-200">Professional Scheduling</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                disabled={loading}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <CalendarDays size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-1">
            <EnhancedCalendar
              selectedDate={selectedDate}
              onDayPress={setSelectedDate}
            />
          </div>

          {/* Sessions Section */}
          <div className="lg:col-span-2">
            {/* Sessions Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Clock size={20} className="text-gray-600 mr-2" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Sessions for {formatSelectedDate(selectedDate)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {sessionsForDate.length} session{sessionsForDate.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
              </div>
              <div className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                {sessionsForDate.length}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading sessions...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="text-red-600 mr-2 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-700 font-medium">Error loading sessions</p>
                    <p className="text-red-600 text-sm mt-1">
                      {error.message || 'Could not load sessions. Please try again.'}
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="text-red-700 underline text-sm mt-2 hover:no-underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions List */}
            {!loading && !error && (
              <div className="space-y-4">
                {sessionsForDate.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Scheduled</h3>
                    <p className="text-gray-500">Your calendar is clear for this date.</p>
                  </div>
                ) : (
                  sessionsForDate.map((session: CalendarSession) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200"
                    >
                      {/* Session Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Clock size={16} className="text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatTime(session.session_date)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {session.patient_name}
                          </h3>
                        </div>

                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(session.status)}`}>
                          {getStatusIcon(session.status)}
                          {session.status.toLowerCase().replace('_', ' ')}
                        </div>
                      </div>

                      {/* Session Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center">
                          <User size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{session.session_type}</span>
                        </div>

                        <div className="flex items-center">
                          <MapPin size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{session.location}</span>
                        </div>

                        <div className="flex items-center">
                          <Timer size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{session.duration_minutes} minutes</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleViewDetails(session)}
                        className="w-full bg-purple-50 text-purple-700 border border-purple-200 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center"
                      >
                        <span className="font-medium">View Details</span>
                        <ChevronLeft size={16} className="ml-2 rotate-180" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCalendar;