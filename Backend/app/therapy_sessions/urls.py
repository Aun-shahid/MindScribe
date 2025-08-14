from django.urls import path


from .views import (
    SessionDetailView, TherapistPatientsView,
    CreatePatientView, StartSessionView, EndSessionView, SessionStatsView,
    SessionsListView, SessionRequestView, PatientDashboardView, 
    TherapistDashboardView, SessionNotesView, AssignPatientToSessionView,
    SessionScheduleView, RecurringSessionScheduleView, BulkSessionUpdateView,
    PatientSchedulePreferencesView, AutoScheduleInitialSessionsView
)

urlpatterns = [
    # # Consolidated sessions endpoints
    path('sessions/', SessionsListView.as_view(), name='sessions_list'),
    path('sessions/request/', SessionRequestView.as_view(), name='request_session'),
    path('sessions/<uuid:pk>/', SessionDetailView.as_view(), name='session_detail'),
    
    # Session actions
    path('sessions/<uuid:session_id>/start/', StartSessionView.as_view(), name='start_session'),
    path('sessions/<uuid:session_id>/end/', EndSessionView.as_view(), name='end_session'),
    path('sessions/<uuid:session_id>/notes/', SessionNotesView.as_view(), name='session_notes'),
    path('sessions/<uuid:session_id>/assign-patient/', AssignPatientToSessionView.as_view(), name='assign_patient_to_session'),
    
    # Patient management
    path('patients/', TherapistPatientsView.as_view(), name='therapist_patients'),
    path('patients/create/', CreatePatientView.as_view(), name='create_patient'),
    
    # Dashboard views
    path('dashboard/therapist/', TherapistDashboardView.as_view(), name='therapist_dashboard'),
    path('dashboard/patient/', PatientDashboardView.as_view(), name='patient_dashboard'),
    
    # Statistics and insights
    path('stats/', SessionStatsView.as_view(), name='session_stats'),
    
    # Session scheduling
    path('schedule/', SessionScheduleView.as_view(), name='schedule_session'),
    path('schedule/recurring/', RecurringSessionScheduleView.as_view(), name='schedule_recurring_sessions'),
    path('schedule/bulk-update/', BulkSessionUpdateView.as_view(), name='bulk_update_sessions'),
    path('patients/<uuid:patient_id>/preferences/', PatientSchedulePreferencesView.as_view(), name='patient_schedule_preferences'),
    path('patients/<uuid:patient_id>/auto-schedule/', AutoScheduleInitialSessionsView.as_view(), name='auto_schedule_initial_sessions'),
]