from django.urls import path


from .views import (
    SessionDetailView, TherapistPatientsView, TherapistSessionsView,
    CreatePatientView, StartSessionView, EndSessionView, SessionStatsView,
    SessionsListView, 
    TherapistDashboardView, SessionNotesView, SessionSummaryView,
    PatientProgressJourneyView,
    SessionScheduleView, RecurringSessionScheduleView, BulkSessionUpdateView,
    PatientSchedulePreferencesView, AutoScheduleInitialSessionsView,
    PatientSessionsListView, SessionEmotionalAnalysisView, SessionTranscriptionView,
    TherapistMoodAlertsView, PatientMoodSummaryView, MySessionsView,
    UpcomingSessionsView, PastSessionsView,
    # New availability and booking views
    TherapistAvailabilityView, TherapistDateOverrideView,
    AvailableSlotsView, PatientBookSessionView, EmergencySessionRequestView,
    TherapistAvailableDatesView
)

urlpatterns = [
    # Session creation and listing
    path('sessions/', SessionsListView.as_view(), name='sessions_list'),
    path('sessions/create/', TherapistSessionsView.as_view(), name='create_session'),
    path('sessions/<uuid:pk>/', SessionDetailView.as_view(), name='session_detail'),
    path('sessions/my/', MySessionsView.as_view(), name='my_sessions'),
    path('sessions/upcoming/', UpcomingSessionsView.as_view(), name='upcoming_sessions'),
    path('sessions/past/', PastSessionsView.as_view(), name='past_sessions'),
    
    # Session actions
    path('sessions/<uuid:session_id>/start/', StartSessionView.as_view(), name='start_session'),
    path('sessions/<uuid:session_id>/end/', EndSessionView.as_view(), name='end_session'),
    path('sessions/<uuid:session_id>/notes/', SessionNotesView.as_view(), name='session_notes'),
    path('sessions/<uuid:session_id>/summary/', SessionSummaryView.as_view(), name='session_summary'),
    
    # Patient management
    path('patients/', TherapistPatientsView.as_view(), name='therapist_patients'),
    path('patients/create/', CreatePatientView.as_view(), name='create_patient'),
    path('patients/new/', CreatePatientView.as_view(), name='create_patient_new'),  # Alternative endpoint
    path('patients/<uuid:patient_id>/', TherapistPatientsView.as_view(), name='patient_detail'),  # Individual patient details
    path('patients/<uuid:patient_id>/sessions/', PatientSessionsListView.as_view(), name='patient_sessions_list'),
    path('patients/<uuid:patient_id>/preferences/', PatientSchedulePreferencesView.as_view(), name='patient_schedule_preferences'),
    path('patients/<uuid:patient_id>/auto-schedule/', AutoScheduleInitialSessionsView.as_view(), name='auto_schedule_initial_sessions'),
    
    # Dashboard views
    path('dashboard/therapist/', TherapistDashboardView.as_view(), name='therapist_dashboard'),
    # Note: Patient dashboard is now at /api/patients/dashboard/ (more comprehensive)
    path('progress-journey/', PatientProgressJourneyView.as_view(), name='patient_progress_journey'),
    
    # Statistics
    path('stats/', SessionStatsView.as_view(), name='session_stats'),
    
    # Therapist availability management
    path('availability/', TherapistAvailabilityView.as_view(), name='therapist_availability'),
    path('availability/overrides/', TherapistDateOverrideView.as_view(), name='date_overrides'),
    
    # Session scheduling (therapist)
    path('schedule/', SessionScheduleView.as_view(), name='schedule_session'),
    path('schedule/recurring/', RecurringSessionScheduleView.as_view(), name='schedule_recurring_sessions'),
    path('schedule/bulk-update/', BulkSessionUpdateView.as_view(), name='bulk_update_sessions'),
    
    # Patient booking
    path('booking/slots/', AvailableSlotsView.as_view(), name='available_slots'),
    path('booking/dates/', TherapistAvailableDatesView.as_view(), name='available_dates'),
    path('booking/book/', PatientBookSessionView.as_view(), name='book_session'),
    path('booking/emergency/', EmergencySessionRequestView.as_view(), name='emergency_session'),
    
    # Session analysis and transcription
    path('sessions/<uuid:session_id>/analysis/', SessionEmotionalAnalysisView.as_view(), name='session_emotional_analysis'),
    path('sessions/<uuid:session_id>/transcription/', SessionTranscriptionView.as_view(), name='session_transcription'),
    
    # Mood alerts and summaries
    path('mood-alerts/', TherapistMoodAlertsView.as_view(), name='therapist_mood_alerts'),
    path('mood-summary/', PatientMoodSummaryView.as_view(), name='patient_mood_summary'),
]