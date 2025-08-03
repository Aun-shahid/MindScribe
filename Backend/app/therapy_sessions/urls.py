from django.urls import path
from .views import (
    TherapistSessionsView, SessionDetailView, TherapistPatientsView,
    CreatePatientView, StartSessionView, EndSessionView, SessionStatsView,
    SessionsListView, SessionRequestView, PatientDashboardView, 
    TherapistDashboardView, SessionNotesView, AssignPatientToSessionView
)

urlpatterns = [
    # Consolidated sessions endpoints
    path('sessions/', SessionsListView.as_view(), name='sessions_list'),  # GET: List sessions with basic details
    path('sessions/create/', TherapistSessionsView.as_view(), name='create_session'),  # POST: Create session (therapists only)
    path('sessions/request/', SessionRequestView.as_view(), name='request_session'),  # POST: Request session (patients only)
    path('sessions/<uuid:pk>/', SessionDetailView.as_view(), name='session_detail'),  # GET/PATCH/DELETE: Session details
    
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
]