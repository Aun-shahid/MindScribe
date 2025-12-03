from django.urls import path
from .views import (
    TherapistPinView, ConnectToTherapistView, DisconnectFromTherapistView,
    TherapistsView, PatientsView, PatientProfileView, TherapistProfileView,
    ConnectionRequestsListView, ConnectionRequestActionView
)

urlpatterns = [
    # Therapist PIN for QR code generation
    path('therapist-pin/', TherapistPinView.as_view(), name='therapist_pin'),
    
    # Patient-Therapist Connection URLs (patient initiates connection request)
    path('connect-therapist/', ConnectToTherapistView.as_view(), name='connect_therapist'),
    path('disconnect-therapist/', DisconnectFromTherapistView.as_view(), name='disconnect_therapist'),
    path('therapists/', TherapistsView.as_view(), name='therapists'),
    path('patients/', PatientsView.as_view(), name='patients'),
    
    # Connection Request Management (therapist manages requests)
    path('connection-requests/', ConnectionRequestsListView.as_view(), name='connection_requests_list'),
    path('connection-requests/<uuid:request_id>/', ConnectionRequestActionView.as_view(), name='connection_request_action'),
    
    # Profile Management URLs
    path('patient-profile/', PatientProfileView.as_view(), name='patient_profile'),
    path('therapist-profile/', TherapistProfileView.as_view(), name='therapist_profile'),
]