from django.shortcuts import render, get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count, Avg
from rest_framework import generics, status, permissions, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter
from datetime import datetime, timedelta
import json
import uuid
from .exceptions import (
    validate_user_role_for_action, validate_patient_therapist_connection,
    validate_session_status_transition, PatientNotConnectedException,
    SessionNotAvailableException, MaxPatientsReachedException
)

from .models import (
    Session, SessionTemplate, PatientProgress, SessionReminder, 
    TherapistAvailability, TherapistDateOverride, SessionQRCode, SessionAudio, SessionInsight
)
from .serializers import (
    SessionSerializer, SessionCreateSerializer, SessionUpdateSerializer,
    SessionTemplateSerializer, PatientProgressSerializer, 
    TherapistAvailabilitySerializer, SessionInsightSerializer,
    PatientListSerializer, SessionStatsSerializer, EnhancedPatientCreateSerializer,
    PatientSessionSerializer, TherapistSessionSerializer, SessionListSerializer,
    SessionRequestSerializer, SessionScheduleSerializer, RecurringSessionScheduleSerializer,
    SessionScheduleResponseSerializer, BulkSessionUpdateSerializer,
    TherapistDateOverrideSerializer, PatientBookingSerializer, 
    EmergencySessionRequestSerializer, AvailableSlotSerializer, SessionSummarySerializer
)
from users.models import PatientProfile, TherapistProfile
# Removed: transcription_service import - migrated to FastAPI AI service
from .token_utils import generate_session_token
from django.conf import settings

User = get_user_model()


# TherapistPatientMoodTrendView: Fetch 7-day mood trend for a patient
from patients.models import MoodEntry

@extend_schema(
    tags=["Therapist - Mood"],
    summary="Get 7-day mood trend for a patient",
    description="Fetches the daily dominant mood and average intensity for the past 7 days for a given patient.",
    parameters=[
        OpenApiParameter(name="patient_id", description="UUID of the patient", required=True, type=str),
    ],
    responses={
        200: OpenApiResponse(description="7-day mood trend data for the patient."),
        403: OpenApiResponse(description="Only therapists can access this endpoint."),
        404: OpenApiResponse(description="Patient not found or not connected to therapist."),
    }
)
class TherapistPatientMoodTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, "therapist_profile"):
            return Response({"detail": "Only therapists can access this endpoint."}, status=403)

        patient_id = request.query_params.get("patient_id")
        if not patient_id:
            return Response({"detail": "Missing patient_id parameter."}, status=400)

        # Ensure the patient is connected to this therapist
        try:
            patient_profile = PatientProfile.objects.get(user__id=patient_id)
            if patient_profile not in user.therapist_profile.patients.all():
                return Response({"detail": "Patient not connected to therapist."}, status=404)
        except PatientProfile.DoesNotExist:
            return Response({"detail": "Patient not found."}, status=404)

        today = timezone.now().date()
        days = 7
        trend = []
        for i in range(days):
            date = today - timedelta(days=days - i - 1)
            entries = MoodEntry.objects.filter(patient=patient_profile.user, mood_date=date)
            if entries.exists():
                # Use the entry with the highest average intensity if multiple
                entry = max(entries, key=lambda e: e.average_intensity)
                intensities = entry.mood_intensities or {}
                if intensities:
                    max_intensity = max(intensities.values())
                    dominant_moods = [m for m, v in intensities.items() if v == max_intensity]
                else:
                    dominant_moods = []
                trend.append({
                    "date": date.isoformat(),
                    "dominant_moods": dominant_moods,
                    "average_intensity": entry.average_intensity,
                    "mood_intensities": intensities,
                })
            else:
                trend.append({
                    "date": date.isoformat(),
                    "dominant_moods": [],
                    "average_intensity": None,
                    "mood_intensities": {},
                })

        return Response({"trend": trend}, status=200)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Create therapy sessions",
    description="Create a new therapy session. Only therapists can create sessions. Supports both regular sessions with assigned patients and quick sessions with just patient names. Returns session IDs and WebSocket URLs for real-time session communication.",
    examples=[
        OpenApiExample(
            'Regular Session Creation',
            summary='Create session with assigned patient',
            description='Create a session with a patient that is already connected to the therapist',
            value={
                "patient_id": "123e4567-e89b-12d3-a456-426614174000",
                "session_type": "individual",
                "scheduled_date": "2024-01-15T10:00:00Z",
                "duration_minutes": 60,
                "location": "Clinic Room 1",
                "is_online": True,
                "patient_goals": "Work on anxiety management techniques",
                "fee_charged": 150.00,
                "consent_recording": True,
                "consent_ai_analysis": True
            },
            request_only=True,
        ),
        OpenApiExample(
            'Session Response with WebSocket',
            summary='Session response including WebSocket URL',
            description='Example response showing session with WebSocket connection details',
            value={
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "session_number": 5,
                "session_type": "individual",
                "scheduled_date": "2024-01-15T10:00:00Z",
                "status": "scheduled",
                "is_online": True,
                "websocket_room_id": "456e7890-e89b-12d3-a456-426614174001",
                "websocket_url": "wss://your-domain.com/ws/therapy-session/456e7890-e89b-12d3-a456-426614174001/",
                "can_start_websocket": True,
                "consent_recording": True,
                "consent_ai_analysis": True,
                "patient": {
                    "id": "789e0123-e89b-12d3-a456-426614174002",
                    "full_name": "John Smith",
                    "patient_id": "PT24001"
                }
            },
            response_only=True,
        ),
        OpenApiExample(
            'Quick Session Creation',
            summary='Create quick session without assigned patient',
            description='Create a quick session with just patient name for immediate therapy sessions',
            value={
                "quick_session_patient_name": "John Doe",
                "session_type": "individual",
                "scheduled_date": "2024-01-15T10:00:00Z",
                "duration_minutes": 60,
                "location": "Clinic Room 1",
                "is_online": True,
                "patient_goals": "Emergency session for anxiety",
                "consent_recording": True,
                "consent_ai_analysis": True
            },
            request_only=True,
        ),
    ]
)
class TherapistSessionsView(generics.CreateAPIView):
    """Create a new therapy session (therapists only)"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionCreateSerializer
    
    def perform_create(self, serializer):
        if self.request.user.user_type != 'therapist':
            raise PermissionError("Only therapists can create sessions")
        serializer.save(therapist=self.request.user, created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create a new session and return full session data including ID and WebSocket info"""
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can create sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the session
        session = serializer.save(therapist=request.user, created_by=request.user)
        
        # Return full session data using SessionSerializer
        response_serializer = SessionSerializer(session, context={'request': request})
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Therapy Sessions'],
    responses={
        200: OpenApiResponse(description='Session retrieved successfully.'),
        404: OpenApiResponse(description='Session not found.'),
        403: OpenApiResponse(description='Access denied.')
    },
    methods=['GET']
)
@extend_schema(
    tags=['Therapy Sessions'],
    request=SessionUpdateSerializer,
    responses={
        200: OpenApiResponse(description='Session updated successfully.'),
        400: OpenApiResponse(description='Invalid data provided.'),
        404: OpenApiResponse(description='Session not found.'),
        403: OpenApiResponse(description='Access denied.')
    },
    examples=[
        OpenApiExample(
            'Session Update',
            summary='Update session details',
            description='Update session information including notes and patient mood',
            value={
                "session_notes": "Patient showed significant improvement in anxiety levels. Discussed coping strategies.",
                "patient_mood_before": 4,
                "patient_mood_after": 7,
                "homework_assigned": "Practice breathing exercises daily for 10 minutes",
                "next_session_goals": "Continue working on anxiety management, introduce mindfulness techniques",
                "session_effectiveness": 8,
                "therapist_observations": "Patient was more engaged and responsive today"
            },
            request_only=True,
        ),
    ],
    methods=['PATCH']
)
@extend_schema(
    tags=['Therapy Sessions'],
    responses={
        204: OpenApiResponse(description='Session deleted successfully.'),
        404: OpenApiResponse(description='Session not found.'),
        403: OpenApiResponse(description='Access denied.')
    },
    methods=['DELETE']
)
class SessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a specific session"""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']  # Remove PUT
    
    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return SessionUpdateSerializer
        return SessionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'therapist':
            return Session.objects.filter(therapist=user)
        elif user.user_type == 'patient':
            return Session.objects.filter(patient=user)
        return Session.objects.none()


@extend_schema(
    tags=['Patient Management'],
    summary="List therapist's patients",
    description="Get all patients connected to the authenticated therapist with their session history and profile information",
)
class TherapistPatientsView(generics.ListAPIView):
    """List all patients for a therapist"""
    serializer_class = PatientListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type != 'therapist':
            return User.objects.none()
        
        try:
            therapist_profile = user.therapist_profile
            # Get all patients connected to this therapist
            patient_profiles = therapist_profile.patients.all()
            patient_users = [profile.user for profile in patient_profiles]
            return patient_users
        except TherapistProfile.DoesNotExist:
            return User.objects.none()


@extend_schema(
    tags=['Patient Management'],
    summary="Create new patient",
    description="Create a new patient and assign to the authenticated therapist. This endpoint allows therapists to create comprehensive patient profiles with all necessary information for therapy management.",
    request={
        'application/json': {
            'type': 'object',
            'required': ['first_name', 'last_name', 'phone_number'],
            'properties': {
                'first_name': {'type': 'string', 'maxLength': 150, 'description': 'Patient first name (required)'},
                'last_name': {'type': 'string', 'maxLength': 150, 'description': 'Patient last name (required)'},
                'phone_number': {'type': 'string', 'maxLength': 20, 'description': 'Patient phone number (required)'},
                'email': {'type': 'string', 'format': 'email', 'description': 'Patient email address (optional)'},
                'date_of_birth': {'type': 'string', 'format': 'date', 'description': 'Patient date of birth (YYYY-MM-DD)'},
                'gender': {'type': 'string', 'enum': ['male', 'female', 'other', 'prefer_not_to_say'], 'description': 'Patient gender'},
                'primary_concern': {'type': 'string', 'description': 'Primary concern or issue for therapy'},
                'therapy_start_date': {'type': 'string', 'format': 'date', 'description': 'Date when therapy started (YYYY-MM-DD)'},
                'session_frequency': {'type': 'string', 'enum': ['weekly', 'biweekly', 'monthly', 'as_needed'], 'default': 'weekly', 'description': 'Preferred session frequency'},
                'preferred_session_days': {'type': 'array', 'items': {'type': 'string', 'enum': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']}, 'description': 'Preferred days for sessions'},
                'emergency_contact_name': {'type': 'string', 'maxLength': 100, 'description': 'Emergency contact name'},
                'emergency_contact_phone': {'type': 'string', 'maxLength': 20, 'description': 'Emergency contact phone number'},
                'address': {'type': 'string', 'description': 'Patient address'},
                'medical_history': {'type': 'string', 'description': 'Patient medical history'},
                'current_medications': {'type': 'string', 'description': 'Current medications'},
                'preferred_language': {'type': 'string', 'enum': ['en', 'ur'], 'default': 'en', 'description': 'Preferred language for communication'}
            }
        }
    },
    responses={
        201: OpenApiResponse(description='Patient created successfully.'),
        400: OpenApiResponse(description='Validation failed or maximum patient limit reached.'),
        403: OpenApiResponse(description='Only therapists can create patients.')
    },
    examples=[
        OpenApiExample(
            'Create Patient Request',
            summary='Create a new patient profile',
            description='Create a comprehensive patient profile with all required information',
            value={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "phone_number": "+1234567890",
                "date_of_birth": "1990-01-15",
                "gender": "male",
                "primary_concern": "Anxiety and stress management",
                "therapy_start_date": "2024-01-01",
                "session_frequency": "weekly",
                "preferred_session_days": ["monday", "wednesday", "friday"],
                "emergency_contact_name": "Jane Doe",
                "emergency_contact_phone": "+1234567891",
                "address": "123 Main Street, City, State 12345",
                "medical_history": "No significant medical history",
                "current_medications": "None",
                "preferred_language": "en"
            },
            request_only=True,
        ),
        OpenApiExample(
            'Minimal Patient Request',
            summary='Create patient with minimal required fields',
            description='Create a patient with only the required fields',
            value={
                "first_name": "Jane",
                "last_name": "Smith",
                "phone_number": "+1987654321"
            },
            request_only=True,
        ),
        OpenApiExample(
            'Create Patient Response',
            summary='Successful patient creation response',
            description='Response when patient is successfully created',
            value={
                "patient": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "full_name": "John Doe",
                    "email": "john.doe@example.com",
                    "phone_number": "+1234567890",
                    "date_of_birth": "1990-01-15",
                    "gender": "male",
                    "patient_profile": {
                        "patient_id": "PT24001",
                        "primary_concern": "Anxiety and stress management",
                        "therapy_start_date": "2024-01-01",
                        "session_frequency": "weekly",
                        "preferred_session_days": ["monday", "wednesday", "friday"],
                        "emergency_contact_name": "Jane Doe",
                        "emergency_contact_phone": "+1234567891",
                        "preferred_language": "en",
                        "connected_at": "2024-01-15T10:00:00Z"
                    },
                    "total_sessions": 0,
                    "created_at": "2024-01-15T10:00:00Z"
                },
                "message": "Patient created successfully.",
                "patient_id": "PT24001",
                "temporary_password": "TempPass123!"
            },
            response_only=True,
        ),
    ]
)
class CreatePatientView(generics.CreateAPIView):
    """Create a new patient and assign to therapist"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EnhancedPatientCreateSerializer
    http_method_names = ['post', 'options', 'head']  # Explicitly allow POST method
    
    def create(self, request, *args, **kwargs):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can create patients.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = user.therapist_profile
            
            # Check if therapist can accept new patients
            if not therapist_profile.can_accept_new_patients():
                return Response(
                    {'detail': 'Maximum patient limit reached.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the enhanced serializer for validation and creation
            serializer = self.get_serializer(
                data=request.data,
                context={'therapist': therapist_profile}
            )
            
            if serializer.is_valid():
                result = serializer.save()
                patient_profile = result['patient_profile']
                temporary_password = result['temporary_password']
                
                # Serialize response using PatientListSerializer
                patient_serializer = PatientListSerializer(patient_profile.user)
                
                return Response({
                    'patient': patient_serializer.data,
                    'message': 'Patient created successfully.',
                    'patient_id': patient_profile.patient_id,
                    'temporary_password': temporary_password  # Send this securely in production
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'detail': 'Validation failed.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'detail': f'Error creating patient: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Start therapy session",
    description="Start a scheduled therapy session. Changes status from 'scheduled' to 'in_progress' and records actual start time.",
    examples=[
        OpenApiExample(
            'Start Session Response',
            summary='Successful session start',
            description='Response when session is successfully started',
            value={
                "detail": "Session started successfully.",
                "session": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "status": "in_progress",
                    "actual_start_time": "2024-01-15T10:05:00Z"
                }
            },
            response_only=True,
        ),
    ]
)
class StartSessionView(generics.GenericAPIView):
    """
    Start a therapy session and generate JWT token for AI service authentication
    
    Generates a secure JWT token containing session_id and therapist_id
    for authenticating with the FastAPI AI service (transcription, SOAP notes, etc.)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    class StartSessionResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
        session = SessionSerializer()
        ai_service_token = serializers.CharField(help_text="JWT token for AI service authentication")
        ai_service_url = serializers.CharField(help_text="URL for AI service (configure in settings)", required=False)
    
    serializer_class = StartSessionResponseSerializer
    
    def post(self, request, session_id):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can start sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        session = get_object_or_404(Session, id=session_id, therapist=user)
        
        # Allow starting sessions that are UPCOMING, RESCHEDULED, or REQUESTED (therapist can approve and start)
        if session.status not in ['UPCOMING', 'RESCHEDULED', 'REQUESTED']:
            return Response(
                {'detail': f'Session cannot be started. Current status: {session.status}. Only UPCOMING, RESCHEDULED, or REQUESTED sessions can be started.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.start_session()

        # Generate JWT token for AI service authentication
        ai_token = None
        if session.consent_recording and session.consent_ai_analysis:
            try:
                # Generate secure JWT token with session_id and therapist_id
                ai_token = generate_session_token(
                    session_id=session.id,
                    therapist_id=user.id,
                    expiration_hours=2  # Token expires in 2 hours
                )
            except Exception as e:
                return Response(
                    {'detail': f'Failed to generate AI service token: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Get AI service URL from settings (you'll configure this later)
        ai_service_url = getattr(settings, 'AI_SERVICE_URL', 'http://localhost:8000')  # Default to localhost
        
        response_data = {
            'detail': 'Session started successfully.',
            'session': SessionSerializer(session).data,
        }
        
        # Include AI service token if generated
        if ai_token:
            response_data['ai_service_token'] = ai_token
            response_data['ai_service_url'] = ai_service_url
            response_data['token_info'] = {
                'expires_in_hours': 2,
                'usage': 'Include this token in Authorization header as "Bearer <token>" when calling AI service'
            }
        else:
            response_data['ai_service_info'] = 'AI service token not generated - patient consent required for recording and AI analysis'
        
        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="End therapy session",
    description="End an in-progress therapy session. Changes status from 'in_progress' to 'completed' and records actual end time. Allows updating session notes and patient mood.",
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'session_notes': {'type': 'string', 'description': 'Final session notes'},
                'patient_mood_after': {'type': 'integer', 'minimum': 1, 'maximum': 10, 'description': 'Patient mood after session (1-10)'},
                'homework_assigned': {'type': 'string', 'description': 'Homework or tasks assigned'},
                'next_session_goals': {'type': 'string', 'description': 'Goals for next session'},
                'session_effectiveness': {'type': 'integer', 'minimum': 1, 'maximum': 10, 'description': 'Therapist rating of session effectiveness (1-10)'}
            }
        }
    },
    responses={
        200: OpenApiResponse(description='Session ended successfully.'),
        400: OpenApiResponse(description='Session is not in progress.'),
        403: OpenApiResponse(description='Only therapists can end sessions.'),
        404: OpenApiResponse(description='Session not found.')
    },
    examples=[
        OpenApiExample(
            'End Session Request',
            summary='End session with notes and ratings',
            description='Complete a session with final notes and patient mood rating',
            value={
                "session_notes": "Patient showed significant improvement. Discussed coping strategies and assigned breathing exercises.",
                "patient_mood_after": 8,
                "homework_assigned": "Practice breathing exercises daily for 10 minutes",
                "next_session_goals": "Continue working on anxiety management techniques",
                "session_effectiveness": 9
            },
            request_only=True,
        ),
    ]
)
class EndSessionView(generics.GenericAPIView):
    """End a session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class EndSessionRequestSerializer(serializers.Serializer):
        session_notes = serializers.CharField(required=False, allow_blank=True)
        patient_mood_after = serializers.IntegerField(min_value=1, max_value=10, required=False)
        homework_assigned = serializers.CharField(required=False, allow_blank=True)
        next_session_goals = serializers.CharField(required=False, allow_blank=True)
        session_effectiveness = serializers.IntegerField(min_value=1, max_value=10, required=False)
    
    class EndSessionResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
        session = SessionSerializer()
    
    serializer_class = EndSessionRequestSerializer
    
    def post(self, request, session_id):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can end sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        session = get_object_or_404(Session, id=session_id, therapist=user)
        
        if session.status != 'IN_PROGRESS':
            return Response(
                {'detail': 'Session is not in progress.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update session with end data
        data = request.data
        if 'session_notes' in data:
            session.session_notes = data['session_notes']
        if 'patient_mood_after' in data:
            session.patient_mood_after = data['patient_mood_after']
        if 'homework_assigned' in data:
            session.homework_assigned = data['homework_assigned']
        if 'next_session_goals' in data:
            session.next_session_goals = data['next_session_goals']
        if 'session_effectiveness' in data:
            session.session_effectiveness = data['session_effectiveness']
        
        session.end_session()

        # Note: Transcription and SOAP note generation are handled by the FastAPI AI service
        # The client should call:
        # 1. POST /api/v1/session/{session_id}/stop to stop transcription
        # 2. POST /api/v1/soap/{session_id}/generate to generate SOAP notes
        
        return Response({
            'detail': 'Session ended successfully.',
            'session': SessionSerializer(session).data
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get session statistics",
    description="Get comprehensive session statistics for the authenticated therapist including counts, averages, and breakdowns by status and type.",
    parameters=[
        OpenApiParameter(
            name='days',
            description='Number of days to include in statistics (default: 30)',
            required=False,
            type=int
        ),
    ],
    responses={
        200: OpenApiResponse(description='Session statistics retrieved successfully.'),
        403: OpenApiResponse(description='Only therapists can access session stats.')
    },
    examples=[
        OpenApiExample(
            'Session Statistics Response',
            summary='Comprehensive session statistics',
            description='Example response with session statistics for the last 30 days',
            value={
                "total_sessions": 45,
                "completed_sessions": 38,
                "cancelled_sessions": 4,
                "no_show_sessions": 2,
                "upcoming_sessions": 12,
                "total_patients": 15,
                "average_session_effectiveness": 8.2,
                "sessions_by_status": [
                    {"status": "completed", "count": 38},
                    {"status": "scheduled", "count": 12},
                    {"status": "cancelled", "count": 4},
                    {"status": "no_show", "count": 2}
                ],
                "sessions_by_type": [
                    {"session_type": "individual", "count": 40},
                    {"session_type": "group", "count": 3},
                    {"session_type": "assessment", "count": 2}
                ]
            },
            response_only=True,
        ),
    ]
)
class SessionStatsView(generics.GenericAPIView):
    """Get session statistics for therapist"""
    permission_classes = [permissions.IsAuthenticated]
    
    class SessionStatsResponseSerializer(serializers.Serializer):
        total_sessions = serializers.IntegerField()
        completed_sessions = serializers.IntegerField()
        cancelled_sessions = serializers.IntegerField()
        no_show_sessions = serializers.IntegerField()
        upcoming_sessions = serializers.IntegerField()
        total_patients = serializers.IntegerField()
        average_session_effectiveness = serializers.FloatField(allow_null=True)
        sessions_by_status = serializers.ListField()
        sessions_by_type = serializers.ListField()
    
    serializer_class = SessionStatsResponseSerializer
    
    def get(self, request):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access session stats.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        sessions = Session.objects.filter(
            therapist=user,
            scheduled_date__gte=start_date
        )
        
        stats = {
            'total_sessions': sessions.count(),
            'completed_sessions': sessions.filter(status='COMPLETED').count(),
            'cancelled_sessions': sessions.filter(status='CANCELLED').count(),
            'no_show_sessions': sessions.filter(status='NO_SHOW').count(),
            'upcoming_sessions': sessions.filter(
                status='UPCOMING',
                scheduled_date__gte=timezone.now()
            ).count(),
            'total_patients': sessions.values('patient').distinct().count(),
            'average_session_effectiveness': sessions.filter(
                session_effectiveness__isnull=False
            ).aggregate(avg=Avg('session_effectiveness'))['avg'],
            'sessions_by_status': list(
                sessions.values('status').annotate(count=Count('id'))
            ),
            'sessions_by_type': list(
                sessions.values('session_type').annotate(count=Count('id'))
            ),
        }
        
        return Response(stats, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get sessions list",
    description="Get a list of sessions with basic details for the authenticated user. Returns sessions sorted by date and time, suitable for calendar display. Supports role-based filtering for both patients and therapists.",
    parameters=[
        OpenApiParameter(
            name='date',
            description='Filter sessions by specific date (YYYY-MM-DD)',
            required=False,
            type=str
        ),
        OpenApiParameter(
            name='status',
            description='Filter sessions by status',
            required=False,
            type=str,
            enum=['REQUESTED', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW']
        ),
        OpenApiParameter(
            name='limit',
            description='Limit number of results (default: 50)',
            required=False,
            type=int
        ),
    ],
    responses={
        200: OpenApiResponse(description='Sessions retrieved successfully.'),
        403: OpenApiResponse(description='Authentication required.')
    },
    examples=[
        OpenApiExample(
            'Sessions List Response',
            summary='Basic sessions list with calendar-friendly data',
            description='Response showing sessions with basic details for calendar display',
            value={
                "sessions": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "therapist_name": "Dr. Sarah Johnson",
                        "patient_name": "John Smith",
                        "session_date": "2024-01-20T10:00:00Z",
                        "location": "Clinic Room 1",
                        "status": "UPCOMING",
                        "session_type": "individual",
                        "duration_minutes": 60,
                        "is_online": False
                    }
                ],
                "total_count": 25,
                "user_type": "therapist"
            },
            response_only=True,
        ),
    ]
)
class SessionsListView(generics.ListAPIView):
    """Get sessions list with basic details for calendar display"""
    serializer_class = SessionListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Base queryset based on user type
        if user.user_type == 'therapist':
            queryset = Session.objects.filter(therapist=user)
        elif user.user_type == 'patient':
            queryset = Session.objects.filter(patient=user)
        else:
            return Session.objects.none()
        
        # Apply filters
        date_filter = self.request.query_params.get('date')
        if date_filter:
            queryset = queryset.filter(scheduled_date__date=date_filter)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Apply limit
        limit = int(self.request.query_params.get('limit', 50))
        
        return queryset.select_related('patient', 'therapist').order_by('scheduled_date')[:limit]
    
    def list(self, request, *args, **kwargs):
        """Override list to add user type and total count"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'sessions': serializer.data,
            'total_count': len(serializer.data),
            'user_type': request.user.user_type
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Request therapy session",
    description="Allow patients to request a therapy session from their connected therapist. The session will be created with REQUESTED status and basic information.",
    request=SessionRequestSerializer,
    responses={
        201: OpenApiResponse(description='Session request created successfully.'),
        400: OpenApiResponse(description='Invalid data or patient not connected to therapist.'),
        403: OpenApiResponse(description='Only patients can request sessions.')
    },
    examples=[
        OpenApiExample(
            'Session Request',
            summary='Patient requesting a therapy session',
            description='Patient creates a session request with basic information',
            value={
                "therapist_id": "456e7890-e89b-12d3-a456-426614174001",
                "scheduled_date": "2024-01-25T14:00:00Z",
                "location": "Clinic Room 1",
                "is_online": False,
                "patient_goals": "Need help with anxiety management",
                "duration_minutes": 60
            },
            request_only=True,
        ),
    ]
)
class SessionRequestView(generics.CreateAPIView):
    """Allow patients to request therapy sessions"""
    serializer_class = SessionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Create a session request"""
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can request sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Create the session request
        session = serializer.save()
        
        # Return session data using SessionSerializer
        response_serializer = SessionSerializer(session, context={'request': request})
        
        return Response({
            'detail': 'Session request created successfully.',
            'session': response_serializer.data
        }, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get upcoming sessions",
    description="Get upcoming sessions for the authenticated user (therapist or patient). Returns up to 10 upcoming sessions ordered by scheduled date.",
    responses={
        200: OpenApiResponse(description='Upcoming sessions retrieved successfully.'),
        403: OpenApiResponse(description='Authentication required.')
    }
)
class UpcomingSessionsView(generics.ListAPIView):
    """Get upcoming sessions for therapist or patient"""
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        if user.user_type == 'therapist':
            return Session.objects.filter(
                therapist=user,
                status='UPCOMING',
                scheduled_date__gte=now
            ).order_by('scheduled_date')[:10]
        elif user.user_type == 'patient':
            return Session.objects.filter(
                patient=user,
                status='UPCOMING',
                scheduled_date__gte=now
            ).order_by('scheduled_date')[:10]
        
        return Session.objects.none()


@extend_schema(
    tags=['Therapy Sessions'],
    summary="My Sessions - Unified endpoint for patients and therapists",
    description="Get sessions for the authenticated user with role-based functionality. Supports filtering by time period and specific session details.",
    parameters=[
        OpenApiParameter(
            name='session_id',
            description='Get details for a specific session',
            required=False,
            type=str
        ),
        OpenApiParameter(
            name='filter',
            description='Filter sessions by time period',
            required=False,
            type=str,
            enum=['upcoming', 'past'],
            default='upcoming'
        ),
        OpenApiParameter(
            name='limit',
            description='Limit number of results (default: 20)',
            required=False,
            type=int
        ),
        OpenApiParameter(
            name='offset',
            description='Offset for pagination (default: 0)',
            required=False,
            type=int
        ),
    ],
    examples=[
        OpenApiExample(
            'Patient Upcoming Sessions',
            summary='Patient viewing upcoming sessions',
            description='Response for patient viewing their upcoming appointments',
            value={
                "user_type": "patient",
                "filter_applied": "upcoming",
                "total_count": 3,
                "sessions": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "session_number": 5,
                        "session_type": "individual",
                        "scheduled_date": "2024-01-20T10:00:00Z",
                        "duration_minutes": 60,
                        "status": "scheduled",
                        "location": "Clinic Room 1",
                        "is_online": False,
                        "therapist": {
                            "id": "456e7890-e89b-12d3-a456-426614174001",
                            "full_name": "Dr. Sarah Johnson",
                            "specialization": "Anxiety and Depression"
                        },
                        "appointment_label": "Therapy Appointment",
                        "patient_goals": "Continue working on anxiety management"
                    }
                ]
            },
            response_only=True,
        ),
        OpenApiExample(
            'Therapist Session Management',
            summary='Therapist viewing sessions',
            description='Response for therapist viewing their sessions with full details',
            value={
                "user_type": "therapist",
                "filter_applied": "upcoming",
                "total_count": 8,
                "sessions": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "session_number": 5,
                        "session_type": "individual",
                        "scheduled_date": "2024-01-20T10:00:00Z",
                        "duration_minutes": 60,
                        "status": "scheduled",
                        "location": "Clinic Room 1",
                        "is_online": False,
                        "patient": {
                            "id": "789e0123-e89b-12d3-a456-426614174002",
                            "full_name": "John Smith",
                            "patient_id": "PT24001"
                        },
                        "patient_goals": "Continue working on anxiety management",
                        "session_notes": "",
                        "fee_charged": "150.00",
                        "payment_status": "pending"
                    }
                ]
            },
            response_only=True,
        ),
    ]
)
class MySessionsView(generics.GenericAPIView):
    """Unified sessions endpoint with role-based functionality"""
    permission_classes = [permissions.IsAuthenticated]
    
    class MySessionsResponseSerializer(serializers.Serializer):
        sessions = serializers.ListField()
        total_count = serializers.IntegerField()
        user_type = serializers.CharField()
    
    serializer_class = MySessionsResponseSerializer
    
    def get(self, request):
        user = request.user
        session_id = request.query_params.get('session_id')
        filter_param = request.query_params.get('filter', 'upcoming')
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        
        # If specific session ID is requested, return session details
        if session_id:
            return self._get_session_detail(user, session_id)
        
        # Get sessions based on user role and filter
        if user.user_type == 'patient':
            return self._get_patient_sessions(user, filter_param, limit, offset)
        elif user.user_type == 'therapist':
            return self._get_therapist_sessions(user, filter_param, limit, offset)
        else:
            return Response(
                {'detail': 'Only patients and therapists can access sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    def _get_session_detail(self, user, session_id):
        """Get details for a specific session with enhanced error handling"""
        try:
            # Validate session_id format
            try:
                uuid.UUID(session_id)
            except ValueError:
                return Response({
                    'error': True,
                    'message': 'Invalid session ID format',
                    'details': {'session_id': ['Session ID must be a valid UUID']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate user role
            validate_user_role_for_action(user, user.user_type, 'access session details')
            
            if user.user_type == 'patient':
                session = Session.objects.select_related('therapist', 'patient').get(
                    id=session_id, patient=user
                )
                serializer = PatientSessionSerializer(session)
            elif user.user_type == 'therapist':
                session = Session.objects.select_related('therapist', 'patient').get(
                    id=session_id, therapist=user
                )
                serializer = TherapistSessionSerializer(session)
            else:
                return Response({
                    'error': True,
                    'message': 'Access denied',
                    'details': {'permission': ['Only patients and therapists can access session details']},
                    'status_code': 403
                }, status=status.HTTP_403_FORBIDDEN)
            
            return Response({
                'session': serializer.data,
                'user_type': user.user_type
            }, status=status.HTTP_200_OK)
            
        except Session.DoesNotExist:
            return Response({
                'error': True,
                'message': 'Session not found',
                'details': {'session': ['Session not found or you do not have permission to access it']},
                'status_code': 404
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': True,
                'message': 'An error occurred while retrieving session details',
                'details': {'server': [str(e)]},
                'status_code': 500
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_patient_sessions(self, user, filter_param, limit, offset):
        """Get sessions for patient with patient-specific presentation and enhanced validation"""
        try:
            # Validate filter parameter
            valid_filters = ['upcoming', 'past']
            if filter_param not in valid_filters:
                return Response({
                    'error': True,
                    'message': 'Invalid filter parameter',
                    'details': {'filter': [f'Filter must be one of: {", ".join(valid_filters)}']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate pagination parameters
            if limit < 1 or limit > 100:
                return Response({
                    'error': True,
                    'message': 'Invalid limit parameter',
                    'details': {'limit': ['Limit must be between 1 and 100']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if offset < 0:
                return Response({
                    'error': True,
                    'message': 'Invalid offset parameter',
                    'details': {'offset': ['Offset must be 0 or greater']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if patient has a profile
            if not hasattr(user, 'patient_profile'):
                return Response({
                    'error': True,
                    'message': 'Patient profile not found',
                    'details': {'profile': ['Patient profile is required to access sessions']},
                    'status_code': 404
                }, status=status.HTTP_404_NOT_FOUND)
            
            now = timezone.now()
            
            # Base queryset for patient sessions
            queryset = Session.objects.filter(patient=user).select_related('therapist')
            
            # Apply time filter
            if filter_param == 'upcoming':
                queryset = queryset.filter(
                    status__in=['UPCOMING'],
                    scheduled_date__gte=now
                ).order_by('scheduled_date')
            else:  # past sessions
                queryset = queryset.filter(
                    Q(status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW']) |
                    Q(scheduled_date__lt=now)
                ).order_by('-scheduled_date')
            
            # Apply pagination
            total_count = queryset.count()
            sessions = queryset[offset:offset + limit]
            
            # Serialize with patient-specific serializer
            serializer = PatientSessionSerializer(sessions, many=True)
            
            return Response({
                'user_type': 'patient',
                'filter_applied': filter_param,
                'total_count': total_count,
                'sessions': serializer.data,
                'pagination': {
                    'limit': limit,
                    'offset': offset,
                    'has_next': offset + limit < total_count,
                    'has_previous': offset > 0
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': True,
                'message': 'An error occurred while retrieving patient sessions',
                'details': {'server': [str(e)]},
                'status_code': 500
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_therapist_sessions(self, user, filter_param, limit, offset):
        """Get sessions for therapist with therapist-specific presentation and enhanced validation"""
        try:
            # Validate filter parameter
            valid_filters = ['upcoming', 'past']
            if filter_param not in valid_filters:
                return Response({
                    'error': True,
                    'message': 'Invalid filter parameter',
                    'details': {'filter': [f'Filter must be one of: {", ".join(valid_filters)}']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate pagination parameters
            if limit < 1 or limit > 100:
                return Response({
                    'error': True,
                    'message': 'Invalid limit parameter',
                    'details': {'limit': ['Limit must be between 1 and 100']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if offset < 0:
                return Response({
                    'error': True,
                    'message': 'Invalid offset parameter',
                    'details': {'offset': ['Offset must be 0 or greater']},
                    'status_code': 400
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if therapist has a profile
            if not hasattr(user, 'therapist_profile'):
                return Response({
                    'error': True,
                    'message': 'Therapist profile not found',
                    'details': {'profile': ['Therapist profile is required to access sessions']},
                    'status_code': 404
                }, status=status.HTTP_404_NOT_FOUND)
            
            now = timezone.now()
            
            # Base queryset for therapist sessions
            queryset = Session.objects.filter(therapist=user).select_related('patient')
            
            # Apply time filter
            if filter_param == 'upcoming':
                queryset = queryset.filter(
                    status__in=['UPCOMING', 'IN_PROGRESS'],
                    scheduled_date__gte=now
                ).order_by('scheduled_date')
            else:  # past sessions
                queryset = queryset.filter(
                    Q(status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW']) |
                    Q(scheduled_date__lt=now)
                ).order_by('-scheduled_date')
            
            # Apply pagination
            total_count = queryset.count()
            sessions = queryset[offset:offset + limit]
            
            # Serialize with therapist-specific serializer
            serializer = TherapistSessionSerializer(sessions, many=True)
            
            return Response({
                'user_type': 'therapist',
                'filter_applied': filter_param,
                'total_count': total_count,
                'sessions': serializer.data,
                'pagination': {
                    'limit': limit,
                    'offset': offset,
                    'has_next': offset + limit < total_count,
                    'has_previous': offset > 0
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': True,
                'message': 'An error occurred while retrieving therapist sessions',
                'details': {'server': [str(e)]},
                'status_code': 500
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get past sessions",
    description="Get all past sessions for the authenticated therapist with filtering options",
    parameters=[
        OpenApiParameter(name='patient_id', description='Filter by specific patient', required=False, type=str),
        OpenApiParameter(name='limit', description='Limit number of results', required=False, type=int),
        OpenApiParameter(name='offset', description='Offset for pagination', required=False, type=int),
    ],
)
class PastSessionsView(generics.ListAPIView):
    """Get past sessions for therapist"""
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type != 'therapist':
            return Session.objects.none()
        
        queryset = Session.objects.filter(
            therapist=user,
            status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW']
        ).order_by('-scheduled_date')
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient__id=patient_id)
        
        return queryset


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Assign patient to quick session",
    description="Assign a patient to a quick session that was created without a specific patient. The patient_id must be provided in the request body.",
    request={
        'application/json': {
            'type': 'object',
            'required': ['patient_id'],
            'properties': {
                'patient_id': {'type': 'string', 'format': 'uuid', 'description': 'ID of the patient to assign to the session'}
            }
        }
    },
    responses={
        200: OpenApiResponse(description='Patient assigned successfully.'),
        400: OpenApiResponse(description='Invalid request or patient not connected to therapist.'),
        403: OpenApiResponse(description='Only therapists can assign patients.'),
        404: OpenApiResponse(description='Session or patient not found.')
    },
    examples=[
        OpenApiExample(
            'Assign Patient Request',
            summary='Assign existing patient to quick session',
            description='Convert a quick session to a regular session by assigning a patient',
            value={
                "patient_id": "123e4567-e89b-12d3-a456-426614174000"
            },
            request_only=True,
        ),
    ]
)
class AssignPatientToSessionView(generics.GenericAPIView):
    """Assign a patient to a quick session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class AssignPatientRequestSerializer(serializers.Serializer):
        patient_id = serializers.UUIDField(required=True)
    
    class AssignPatientResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
        session = SessionSerializer()
    
    serializer_class = AssignPatientRequestSerializer
    
    def post(self, request, session_id):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can assign patients to sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        session = get_object_or_404(Session, id=session_id, therapist=user)
        
        if not session.is_quick_session:
            return Response(
                {'detail': 'This session already has an assigned patient.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response(
                {'detail': 'Patient ID is required in request body.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            patient = User.objects.get(id=patient_id, user_type='patient')
            
            # Check if patient is connected to this therapist
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != user:
                return Response(
                    {'detail': 'Patient is not connected to this therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign patient to session
            session.assign_patient(patient)
            
            return Response({
                'detail': 'Patient assigned to session successfully.',
                'session': SessionSerializer(session).data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'Patient not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['Patient Dashboard'],
    summary="Patient dashboard",
    description="Get comprehensive dashboard data for the authenticated patient including sessions, therapist info, and progress",
)
class PatientDashboardView(generics.GenericAPIView):
    """Get patient dashboard data"""
    permission_classes = [permissions.IsAuthenticated]
    
    class PatientDashboardResponseSerializer(serializers.Serializer):
        patient_info = serializers.DictField()
        therapist_info = serializers.DictField()
        upcoming_sessions = serializers.ListField()
        recent_sessions = serializers.ListField()
        session_stats = serializers.DictField()
    
    serializer_class = PatientDashboardResponseSerializer
    
    def get(self, request):
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient_profile = user.patient_profile
            
            # Get upcoming sessions
            upcoming_sessions = Session.objects.filter(
                patient=user,
                status='UPCOMING',
                scheduled_date__gte=timezone.now()
            ).order_by('scheduled_date')[:3]
            
            # Get recent sessions
            recent_sessions = Session.objects.filter(
                patient=user,
                status='COMPLETED'
            ).order_by('-scheduled_date')[:5]
            
            # Calculate stats
            total_sessions = Session.objects.filter(patient=user).count()
            completed_sessions = Session.objects.filter(patient=user, status='COMPLETED').count()
            
            # Get mood trend (last 5 completed sessions)
            mood_data = Session.objects.filter(
                patient=user,
                status='COMPLETED',
                patient_mood_after__isnull=False
            ).order_by('-scheduled_date')[:5].values_list('patient_mood_after', flat=True)
            
            dashboard_data = {
                'patient_info': {
                    'patient_id': patient_profile.patient_id,
                    'full_name': user.full_name,
                    'email': user.email,
                    'phone_number': user.phone_number,
                    'therapy_start_date': patient_profile.therapy_start_date,
                    'primary_concern': patient_profile.primary_concern,
                    'session_frequency': patient_profile.session_frequency,
                },
                'therapist_info': {
                    'name': patient_profile.therapist.user.full_name if patient_profile.therapist else None,
                    'specialization': patient_profile.therapist.specialization if patient_profile.therapist else None,
                    'clinic_name': patient_profile.therapist.clinic_name if patient_profile.therapist else None,
                    'email': patient_profile.therapist.user.email if patient_profile.therapist else None,
                    'phone': patient_profile.therapist.user.phone_number if patient_profile.therapist else None,
                } if patient_profile.therapist else None,
                'session_stats': {
                    'total_sessions': total_sessions,
                    'completed_sessions': completed_sessions,
                    'upcoming_sessions': upcoming_sessions.count(),
                },
                'upcoming_sessions': SessionSerializer(upcoming_sessions, many=True).data,
                'recent_sessions': SessionSerializer(recent_sessions, many=True).data,
                'mood_trend': list(mood_data),
            }
            
            return Response(dashboard_data, status=status.HTTP_200_OK)
            
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Patient profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['Therapist Dashboard'],
    summary="Therapist dashboard",
    description="Get comprehensive dashboard data for the authenticated therapist including today's sessions, patient stats, and analytics",
)
class TherapistDashboardView(generics.GenericAPIView):
    """Get therapist dashboard data"""
    permission_classes = [permissions.IsAuthenticated]
    
    class TherapistDashboardResponseSerializer(serializers.Serializer):
        therapist_info = serializers.DictField()
        today_sessions = serializers.ListField()
        upcoming_sessions = serializers.ListField()
        patient_stats = serializers.DictField()
        session_stats = serializers.DictField()
        recent_patients = serializers.ListField()
    
    serializer_class = TherapistDashboardResponseSerializer
    
    def get(self, request):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = user.therapist_profile
            
            # Get today's sessions
            today = timezone.now().date()
            today_sessions = Session.objects.filter(
                therapist=user,
                scheduled_date__date=today
            ).order_by('scheduled_date')
            
            # Get upcoming sessions (next 7 days)
            next_week = timezone.now() + timedelta(days=7)
            upcoming_sessions = Session.objects.filter(
                therapist=user,
                status='UPCOMING',
                scheduled_date__gte=timezone.now(),
                scheduled_date__lte=next_week
            ).order_by('scheduled_date')
            
            # Get recent patients
            recent_patients = User.objects.filter(
                patient_sessions__therapist=user
            ).distinct().order_by('-patient_sessions__created_at')[:5]
            
            # Calculate stats for last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            sessions_last_30_days = Session.objects.filter(
                therapist=user,
                scheduled_date__gte=thirty_days_ago
            )
            
            dashboard_data = {
                'therapist_info': {
                    'full_name': user.full_name,
                    'email': user.email,
                    'specialization': therapist_profile.specialization,
                    'license_number': therapist_profile.license_number,
                    'clinic_name': therapist_profile.clinic_name,
                    'therapist_pin': therapist_profile.therapist_pin,
                    'years_of_experience': therapist_profile.years_of_experience,
                },
                'patient_stats': {
                    'total_patients': therapist_profile.get_patient_count(),
                    'max_patients': therapist_profile.max_patients,
                    'can_accept_new': therapist_profile.can_accept_new_patients(),
                },
                'session_stats': {
                    'today_sessions': today_sessions.count(),
                    'upcoming_sessions': upcoming_sessions.count(),
                    'total_sessions_30_days': sessions_last_30_days.count(),
                    'completed_sessions_30_days': sessions_last_30_days.filter(status='COMPLETED').count(),
                    'cancelled_sessions_30_days': sessions_last_30_days.filter(status='CANCELLED').count(),
                },
                'today_sessions': SessionSerializer(today_sessions, many=True).data,
                'upcoming_sessions': SessionSerializer(upcoming_sessions[:5], many=True).data,
                'recent_patients': PatientListSerializer(recent_patients, many=True).data,
            }
            
            return Response(dashboard_data, status=status.HTTP_200_OK)
            
        except TherapistProfile.DoesNotExist:
            return Response(
                {'detail': 'Therapist profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Update session notes",
    description="Update session notes and other session details during or after the session",
    examples=[
        OpenApiExample(
            'Update Session Notes',
            summary='Update session notes and observations',
            description='Update various session fields including notes and patient mood',
            value={
                "session_notes": "Patient was more engaged today. Discussed family relationships.",
                "patient_mood_before": 5,
                "patient_mood_after": 7,
                "therapist_observations": "Noticeable improvement in communication skills",
                "session_effectiveness": 8
            },
            request_only=True,
        ),
    ]
)
class SessionNotesView(generics.GenericAPIView):
    """Update session notes during or after session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class SessionNotesRequestSerializer(serializers.Serializer):
        session_notes = serializers.CharField(required=True)
        therapist_observations = serializers.CharField(required=False, allow_blank=True)
    
    class SessionNotesResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
        session = SessionSerializer()
    
    serializer_class = SessionNotesRequestSerializer
    
    def patch(self, request, session_id):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can update session notes.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        session = get_object_or_404(Session, id=session_id, therapist=user)
        
        # Update allowed fields
        allowed_fields = [
            'session_notes', 'patient_goals', 'homework_assigned', 
            'next_session_goals', 'therapist_observations',
            'patient_mood_before', 'patient_mood_after', 'session_effectiveness'
        ]
        
        for field in allowed_fields:
            if field in request.data:
                setattr(session, field, request.data[field])
        
        session.save()
        
        return Response({
            'detail': 'Session notes updated successfully.',
            'session': SessionSerializer(session).data
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Write session summary for patient",
    description="Therapist writes a session summary that will be visible to the patient. Can only be written for completed or in-progress sessions.",
    examples=[
        OpenApiExample(
            'Session Summary Creation',
            summary='Write session summary',
            value={
                "session_summary": "We worked on anxiety management techniques. Patient showed great progress with breathing exercises. Continue practicing daily mindfulness for 10 minutes.",
                "patient_goals": "Practice breathing exercises daily",
                "homework_assigned": "Complete 10-minute daily mindfulness practice",
                "next_session_goals": "Review progress and introduce cognitive restructuring techniques"
            },
            request_only=True,
        ),
    ],
)
class SessionSummaryView(generics.UpdateAPIView):
    """Therapist writes session summary for patient to view"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSummarySerializer
    lookup_field = 'id'
    lookup_url_kwarg = 'session_id'
    
    def get_queryset(self):
        """Only therapist can write summaries for their own sessions"""
        user = self.request.user
        if user.user_type != 'therapist':
            return Session.objects.none()
        return Session.objects.filter(therapist=user)
    
    def update(self, request, *args, **kwargs):
        session = self.get_object()
        
        # Validate session status
        if session.status not in ['COMPLETED', 'IN_PROGRESS']:
            return Response(
                {'detail': 'Session summary can only be written for completed or in-progress sessions.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(session, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'detail': 'Session summary written successfully.',
            'session': serializer.data
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get available session topics",
    description="Returns all available topic tags that therapists can select when writing session summaries. Supports search query parameter to filter topics.",
    parameters=[
        OpenApiParameter(
            name='search',
            description='Search query to filter topics by label (case-insensitive)',
            required=False,
            type=str
        ),
        OpenApiParameter(
            name='category',
            description='Filter by category: mental_health, mindfulness, relationships, personal_dev, behavioral, cognitive, work_life, techniques, crisis, assessment',
            required=False,
            type=str
        )
    ]
)
class AvailableSessionTopicsView(APIView):
    """Get all available session topic tags for session summary form with search/filter"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Return all session topic choices organized by category, with optional search/filter"""
        search_query = request.query_params.get('search', '').lower()
        category_filter = request.query_params.get('category', '').lower()
        
        # All topics with metadata
        all_topics = []
        for code, label in Session.SESSION_TOPIC_CHOICES:
            all_topics.append({
                'value': code,
                'label': label
            })
        
        # Organize by categories
        categorized_topics = {
            'Mental Health & Emotions': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[:9]
            ],
            'Mindfulness & Self-Care': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[9:15]
            ],
            'Relationships & Social': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[15:23]
            ],
            'Personal Development': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[23:31]
            ],
            'Behavioral & Coping': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[31:36]
            ],
            'Cognitive & Thought Patterns': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[36:41]
            ],
            'Work & Life Balance': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[41:46]
            ],
            'Specific Techniques': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[46:52]
            ],
            'Crisis & Support': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[52:56]
            ],
            'Assessment & Planning': [
                {'value': code, 'label': label}
                for code, label in Session.SESSION_TOPIC_CHOICES[56:59]
            ],
        }
        
        # Apply search filter
        filtered_topics = all_topics
        if search_query:
            filtered_topics = [
                topic for topic in all_topics 
                if search_query in topic['label'].lower() or search_query in topic['value'].lower()
            ]
        
        # Apply category filter
        if category_filter:
            category_map = {
                'mental_health': 'Mental Health & Emotions',
                'mindfulness': 'Mindfulness & Self-Care',
                'relationships': 'Relationships & Social',
                'personal_dev': 'Personal Development',
                'behavioral': 'Behavioral & Coping',
                'cognitive': 'Cognitive & Thought Patterns',
                'work_life': 'Work & Life Balance',
                'techniques': 'Specific Techniques',
                'crisis': 'Crisis & Support',
                'assessment': 'Assessment & Planning'
            }
            
            category_name = category_map.get(category_filter)
            if category_name and category_name in categorized_topics:
                filtered_topics = categorized_topics[category_name]
        
        return Response({
            'topics': filtered_topics,  # Filtered list
            'total': len(filtered_topics),
            'categorized_topics': categorized_topics,  # Full categorized list
            'search_applied': bool(search_query),
            'category_applied': bool(category_filter)
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Therapy Sessions'],
    summary="Get patient's progress journey",
    description="Analyzes the last 8 completed sessions to show patient's strengths developed, areas of growth, and ongoing focus.",
)
class PatientProgressJourneyView(generics.GenericAPIView):
    """Analyze patient's session history to show progress journey"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get last 8 completed sessions
        sessions = Session.objects.filter(
            patient=user,
            status='COMPLETED'
        ).order_by('-scheduled_date')[:8]
        
        if not sessions.exists():
            return Response({
                'detail': 'No completed sessions found',
                'total_sessions': 0
            }, status=status.HTTP_200_OK)
        
        # Analyze sessions for patterns
        analysis = self._analyze_progress(sessions)
        
        return Response(analysis, status=status.HTTP_200_OK)
    
    def _analyze_progress(self, sessions):
        """Analyze sessions to extract strengths, growth areas, and focus"""
        from collections import Counter
        
        all_topics = []
        recent_recommendations = []
        recent_focus_areas = []
        
        # Extract data from sessions
        for session in sessions:
            if session.session_topics:
                all_topics.extend(session.session_topics)
            if session.recommendations and session == sessions[0]:  # Most recent
                recent_recommendations = session.recommendations[:3]
            if session.next_session_focus and len(recent_focus_areas) < 3:
                recent_focus_areas.append(session.next_session_focus)
        
        # Count topic frequency
        topic_counter = Counter(all_topics)
        most_common_topics = topic_counter.most_common(10)
        
        # Categorize topics into strengths, growth areas, and ongoing focus
        strengths = self._identify_strengths(most_common_topics, all_highlights)
        growth_areas = self._identify_growth_areas(most_common_topics, recent_recommendations)
        ongoing_focus = self._identify_ongoing_focus(recent_focus_areas, most_common_topics)
        
        return {
            'total_sessions_analyzed': len(sessions),
            'title': 'Your Progress Journey',
            'subtitle': f'Over {len(sessions)} sessions, you\'ve shown remarkable growth and resilience.',
            'strengths_developed': strengths,
            'areas_of_growth': growth_areas,
            'ongoing_focus': ongoing_focus,
            'encouragement_message': 'Remember: healing is a journey, not a destination. Celebrate every step forward! 🌟'
        }
    
    def _identify_strengths(self, topic_counter, highlights):
        """Identify areas where patient has shown consistent work (strengths)"""
        # Topics mentioned 3+ times indicate established strengths
        strengths = []
        
        strength_keywords = {
            'mindfulness': 'Mindfulness practice',
            'stress': 'Coping strategies',
            'emotional': 'Emotional awareness',
            'anxiety': 'Anxiety management',
            'breathing': 'Breathing techniques',
            'meditation': 'Meditation practice',
            'self-care': 'Self-care routines',
            'gratitude': 'Gratitude practice',
            'awareness': 'Self-awareness'
        }
        
        for topic, count in topic_counter:
            if count >= 3:  # Worked on multiple times = strength
                topic_lower = topic.lower()
                for keyword, label in strength_keywords.items():
                    if keyword in topic_lower:
                        if label not in strengths:
                            strengths.append(label)
                        break
                else:
                    # Use original topic if no keyword match
                    if topic not in strengths and len(strengths) < 5:
                        strengths.append(topic)
        
        # Default strengths if analysis doesn't find enough
        if len(strengths) < 2:
            strengths = ['Emotional awareness', 'Mindfulness practice', 'Coping strategies']
        
        return strengths[:5]  # Max 5 strengths
    
    def _identify_growth_areas(self, topic_counter, recent_recommendations):
        """Identify areas still being worked on"""
        growth_areas = []
        
        growth_keywords = {
            'stress': 'Stress management',
            'boundary': 'Boundary setting',
            'self-compassion': 'Self-compassion',
            'relationship': 'Relationship dynamics',
            'assertive': 'Assertiveness',
            'communication': 'Communication skills',
            'emotion regulation': 'Emotional regulation',
            'conflict': 'Conflict resolution'
        }
        
        # Check recent recommendations for growth areas
        for rec in recent_recommendations:
            rec_lower = rec.lower()
            for keyword, label in growth_keywords.items():
                if keyword in rec_lower and label not in growth_areas:
                    growth_areas.append(label)
        
        # Check topics mentioned 1-2 times (still developing)
        for topic, count in topic_counter:
            if 1 <= count <= 2 and len(growth_areas) < 3:
                topic_lower = topic.lower()
                for keyword, label in growth_keywords.items():
                    if keyword in topic_lower and label not in growth_areas:
                        growth_areas.append(label)
                        break
        
        # Default growth areas
        if len(growth_areas) < 2:
            growth_areas = ['Stress management', 'Self-compassion', 'Boundary setting']
        
        return growth_areas[:3]  # Max 3 growth areas
    
    def _identify_ongoing_focus(self, recent_focus_areas, topic_counter):
        """Identify current ongoing focus areas"""
        ongoing = []
        
        focus_keywords = {
            'relationship': 'Relationship dynamics',
            'assertive': 'Assertiveness',
            'emotion': 'Emotional regulation',
            'boundary': 'Boundary setting',
            'communication': 'Communication',
            'self-esteem': 'Self-esteem',
            'confidence': 'Building confidence',
            'mindfulness': 'Mindfulness deepening'
        }
        
        # Extract from recent next session focus
        for focus_text in recent_focus_areas:
            focus_lower = focus_text.lower()
            for keyword, label in focus_keywords.items():
                if keyword in focus_lower and label not in ongoing:
                    ongoing.append(label)
                    if len(ongoing) >= 3:
                        break
        
        # Default ongoing focus
        if len(ongoing) < 2:
            ongoing = ['Relationship dynamics', 'Assertiveness', 'Emotional regulation']
        
        return ongoing[:3]  # Max 3 ongoing focus


@extend_schema(tags=['Session Scheduling'])
class SessionScheduleView(APIView):
    """Schedule individual sessions"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=SessionScheduleSerializer,
        responses={
            201: SessionSerializer,
            400: OpenApiResponse(description='Invalid data'),
            403: OpenApiResponse(description='Permission denied')
        },
        summary="Schedule Individual Session",
        description="Schedule a single session for a patient."
    )
    def post(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can schedule sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = SessionScheduleSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the session
        patient = User.objects.get(id=serializer.validated_data['patient_id'])
        session_data = {
            'patient': patient,
            'therapist': request.user,
            'scheduled_date': serializer.validated_data['scheduled_date'],
            'duration_minutes': serializer.validated_data['duration_minutes'],
            'session_type': serializer.validated_data['session_type'],
            'location': serializer.validated_data.get('location', ''),
            'is_online': serializer.validated_data['is_online'],
            'patient_goals': serializer.validated_data.get('patient_goals', ''),
            'fee_charged': serializer.validated_data.get('fee_charged'),
            'status': 'UPCOMING',
            'created_by': request.user
        }
        
        session = Session.objects.create(**session_data)
        
        response_serializer = SessionSerializer(session, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Session Scheduling'])
class RecurringSessionScheduleView(APIView):
    """Schedule recurring sessions based on patient preferences"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=RecurringSessionScheduleSerializer,
        responses={
            201: SessionScheduleResponseSerializer,
            400: OpenApiResponse(description='Invalid data'),
            403: OpenApiResponse(description='Permission denied')
        },
        summary="Schedule Recurring Sessions",
        description="Schedule multiple sessions based on patient's frequency and day preferences."
    )
    def post(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can schedule sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RecurringSessionScheduleSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        patient = User.objects.get(id=serializer.validated_data['patient_id'])
        patient_profile = patient.patient_profile
        
        # Determine frequency and days
        frequency = serializer.validated_data.get('override_frequency') or patient_profile.session_frequency
        preferred_days = serializer.validated_data.get('override_days') or patient_profile.get_preferred_days_list()
        
        if not preferred_days:
            return Response(
                {'detail': 'Patient has no preferred session days set. Please set preferred days or provide override_days.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate session dates
        sessions_created = self._create_recurring_sessions(
            patient=patient,
            therapist=request.user,
            start_date=serializer.validated_data['start_date'],
            end_date=serializer.validated_data.get('end_date'),
            number_of_sessions=serializer.validated_data.get('number_of_sessions'),
            session_time=serializer.validated_data['session_time'],
            frequency=frequency,
            preferred_days=preferred_days,
            session_data={
                'duration_minutes': serializer.validated_data['duration_minutes'],
                'session_type': serializer.validated_data['session_type'],
                'location': serializer.validated_data.get('location', ''),
                'is_online': serializer.validated_data['is_online'],
                'fee_charged': serializer.validated_data.get('fee_charged'),
            }
        )
        
        # Prepare response
        sessions = Session.objects.filter(
            patient=patient,
            therapist=request.user,
            created_at__gte=timezone.now() - timezone.timedelta(minutes=1)
        ).order_by('scheduled_date')
        
        response_data = {
            'sessions_created': len(sessions_created),
            'sessions': SessionListSerializer(sessions, many=True).data,
            'patient_info': {
                'id': str(patient.id),
                'name': patient.full_name,
                'patient_id': patient_profile.patient_id,
                'frequency': frequency,
                'preferred_days': preferred_days
            },
            'schedule_summary': {
                'start_date': serializer.validated_data['start_date'],
                'end_date': serializer.validated_data.get('end_date'),
                'frequency': frequency,
                'days': preferred_days,
                'total_sessions': len(sessions_created)
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def _create_recurring_sessions(self, patient, therapist, start_date, end_date, number_of_sessions, 
                                 session_time, frequency, preferred_days, session_data):
        """Create recurring sessions based on frequency and preferred days"""
        from datetime import datetime, timedelta
        
        sessions_created = []
        current_date = start_date
        sessions_count = 0
        
        # Convert weekday names to numbers (Monday=0, Sunday=6)
        weekday_map = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        preferred_weekdays = [weekday_map[day] for day in preferred_days]
        
        # Determine frequency interval
        frequency_intervals = {
            'weekly': 7,
            'biweekly': 14,
            'monthly': 30,  # Approximate
            'as_needed': None  # Skip recurring for as_needed
        }
        
        if frequency == 'as_needed':
            return sessions_created
        
        interval_days = frequency_intervals[frequency]
        
        # Find the first occurrence of a preferred day
        while current_date.weekday() not in preferred_weekdays:
            current_date += timedelta(days=1)
        
        # Create sessions
        while True:
            # Check stopping conditions
            if end_date and current_date > end_date:
                break
            if number_of_sessions and sessions_count >= number_of_sessions:
                break
            
            # Create session for this date
            scheduled_datetime = datetime.combine(current_date, session_time)
            if timezone.is_aware(scheduled_datetime):
                scheduled_datetime = scheduled_datetime
            else:
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
            
            session = Session.objects.create(
                patient=patient,
                therapist=therapist,
                scheduled_date=scheduled_datetime,
                status='UPCOMING',
                created_by=therapist,
                **session_data
            )
            sessions_created.append(session)
            sessions_count += 1
            
            # Move to next occurrence
            if frequency == 'weekly':
                # Find next week's occurrence of the same day
                current_date += timedelta(days=7)
            elif frequency == 'biweekly':
                # Find occurrence in 2 weeks
                current_date += timedelta(days=14)
            elif frequency == 'monthly':
                # Try to find the same day next month
                try:
                    if current_date.month == 12:
                        next_month = current_date.replace(year=current_date.year + 1, month=1)
                    else:
                        next_month = current_date.replace(month=current_date.month + 1)
                    current_date = next_month
                except ValueError:
                    # Handle cases like Jan 31 -> Feb 31 (doesn't exist)
                    current_date += timedelta(days=30)
                    while current_date.weekday() not in preferred_weekdays:
                        current_date += timedelta(days=1)
        
        return sessions_created


@extend_schema(tags=['Session Scheduling'])
class BulkSessionUpdateView(APIView):
    """Bulk update multiple sessions"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=BulkSessionUpdateSerializer,
        responses={
            200: OpenApiResponse(description='Sessions updated successfully'),
            400: OpenApiResponse(description='Invalid data'),
            403: OpenApiResponse(description='Permission denied')
        },
        summary="Bulk Update Sessions",
        description="Update multiple sessions at once (cancel, reschedule, etc.)."
    )
    def post(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can update sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BulkSessionUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_ids = serializer.validated_data['session_ids']
        action = serializer.validated_data['action']
        
        # Get sessions belonging to this therapist
        sessions = Session.objects.filter(
            id__in=session_ids,
            therapist=request.user
        )
        
        if len(sessions) != len(session_ids):
            return Response(
                {'detail': 'Some sessions not found or not owned by you.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_sessions = []
        
        for session in sessions:
            if action == 'cancel':
                session.cancel_session(serializer.validated_data.get('reason'))
                updated_sessions.append(session)
            
            elif action == 'reschedule':
                session.reschedule_session(
                    serializer.validated_data['new_date'],
                    serializer.validated_data.get('reason')
                )
                updated_sessions.append(session)
            
            elif action == 'update_location':
                session.location = serializer.validated_data['new_location']
                session.save()
                updated_sessions.append(session)
            
            elif action == 'update_type':
                session.session_type = serializer.validated_data['new_session_type']
                session.save()
                updated_sessions.append(session)
            
            elif action == 'update_duration':
                session.duration_minutes = serializer.validated_data['new_duration']
                session.save()
                updated_sessions.append(session)
        
        return Response({
            'detail': f'Successfully updated {len(updated_sessions)} sessions.',
            'updated_sessions': len(updated_sessions),
            'action_performed': action
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Session Scheduling'])
class PatientSchedulePreferencesView(APIView):
    """View and update patient scheduling preferences"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        responses={200: OpenApiResponse(description='Patient preferences retrieved')},
        summary="Get Patient Schedule Preferences",
        description="Get patient's session frequency and preferred days."
    )
    def get(self, request, patient_id):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access patient preferences.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient = User.objects.get(id=patient_id, user_type='patient')
            patient_profile = patient.patient_profile
            
            # Verify patient is connected to this therapist
            if patient_profile.therapist.user != request.user:
                return Response(
                    {'detail': 'Patient is not connected to you.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return Response({
                'patient_info': {
                    'id': str(patient.id),
                    'name': patient.full_name,
                    'patient_id': patient_profile.patient_id
                },
                'preferences': {
                    'session_frequency': patient_profile.session_frequency,
                    'preferred_session_days': patient_profile.get_preferred_days_list(),
                    'therapy_start_date': patient_profile.therapy_start_date,
                    'primary_concern': patient_profile.primary_concern
                },
                'upcoming_sessions_count': Session.objects.filter(
                    patient=patient,
                    therapist=request.user,
                    status='UPCOMING'
                ).count()
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)

@extend_schema(tags=['Session Scheduling'])
class AutoScheduleInitialSessionsView(APIView):
    """Automatically schedule initial sessions for a patient based on their preferences"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=serializers.Serializer,  # Empty serializer for now
        responses={
            201: SessionScheduleResponseSerializer,
            400: OpenApiResponse(description='Invalid data'),
            403: OpenApiResponse(description='Permission denied')
        },
        summary="Auto-Schedule Initial Sessions",
        description="Automatically schedule initial sessions for a patient based on their frequency and day preferences."
    )
    def post(self, request, patient_id):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can schedule sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient = User.objects.get(id=patient_id, user_type='patient')
            patient_profile = patient.patient_profile
            
            # Verify patient is connected to this therapist
            if patient_profile.therapist.user != request.user:
                return Response(
                    {'detail': 'Patient is not connected to you.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if patient already has upcoming sessions
            existing_sessions = Session.objects.filter(
                patient=patient,
                therapist=request.user,
                status='UPCOMING'
            ).count()
            
            if existing_sessions > 0:
                return Response(
                    {'detail': f'Patient already has {existing_sessions} upcoming sessions.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get patient preferences
            frequency = patient_profile.session_frequency
            preferred_days = patient_profile.get_preferred_days_list()
            
            if not preferred_days:
                return Response(
                    {'detail': 'Patient has no preferred session days set.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if frequency == 'as_needed':
                return Response(
                    {'detail': 'Cannot auto-schedule for patients with "as needed" frequency.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get therapist's default session settings
            therapist_profile = request.user.therapist_profile
            default_duration = therapist_profile.session_duration_minutes or 60
            
            # Schedule initial sessions (next 4-8 sessions based on frequency)
            sessions_to_create = {
                'weekly': 6,
                'biweekly': 4,
                'monthly': 3
            }.get(frequency, 4)
            
            # Use current date + 1 day as start date
            from datetime import date, time, timedelta
            start_date = date.today() + timedelta(days=1)
            
            # Default session time (can be customized later)
            session_time = time(10, 0)  # 10:00 AM default
            
            # Create recurring sessions
            sessions_created = self._create_recurring_sessions(
                patient=patient,
                therapist=request.user,
                start_date=start_date,
                end_date=None,
                number_of_sessions=sessions_to_create,
                session_time=session_time,
                frequency=frequency,
                preferred_days=preferred_days,
                session_data={
                    'duration_minutes': default_duration,
                    'session_type': 'individual',
                    'location': therapist_profile.clinic_name or '',
                    'is_online': False,
                    'fee_charged': therapist_profile.consultation_fee,
                }
            )
            
            # Prepare response
            sessions = Session.objects.filter(
                patient=patient,
                therapist=request.user,
                status='UPCOMING'
            ).order_by('scheduled_date')
            
            response_data = {
                'sessions_created': len(sessions_created),
                'sessions': SessionListSerializer(sessions, many=True).data,
                'patient_info': {
                    'id': str(patient.id),
                    'name': patient.full_name,
                    'patient_id': patient_profile.patient_id,
                    'frequency': frequency,
                    'preferred_days': preferred_days
                },
                'schedule_summary': {
                    'start_date': start_date,
                    'frequency': frequency,
                    'days': preferred_days,
                    'total_sessions': len(sessions_created),
                    'auto_scheduled': True
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    def _create_recurring_sessions(self, patient, therapist, start_date, end_date, number_of_sessions, 
                                 session_time, frequency, preferred_days, session_data):
        """Create recurring sessions based on frequency and preferred days"""
        from datetime import datetime, timedelta
        
        sessions_created = []
        current_date = start_date
        sessions_count = 0
        
        # Convert weekday names to numbers (Monday=0, Sunday=6)
        weekday_map = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        preferred_weekdays = [weekday_map[day] for day in preferred_days]
        
        # Find the first occurrence of a preferred day
        while current_date.weekday() not in preferred_weekdays:
            current_date += timedelta(days=1)
        
        # Create sessions
        while sessions_count < number_of_sessions:
            # Create session for this date
            scheduled_datetime = datetime.combine(current_date, session_time)
            if timezone.is_aware(scheduled_datetime):
                scheduled_datetime = scheduled_datetime
            else:
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
            
            session = Session.objects.create(
                patient=patient,
                therapist=therapist,
                scheduled_date=scheduled_datetime,
                status='UPCOMING',
                created_by=therapist,
                **session_data
            )
            sessions_created.append(session)
            sessions_count += 1
            
            # Move to next occurrence
            if frequency == 'weekly':
                current_date += timedelta(days=7)
            elif frequency == 'biweekly':
                current_date += timedelta(days=14)
            elif frequency == 'monthly':
                current_date += timedelta(days=30)
                # Adjust to preferred day if needed
                while current_date.weekday() not in preferred_weekdays:
                    current_date += timedelta(days=1)
        
        return sessions_created


@extend_schema(
    tags=['Patient Management'],
    summary="Get all sessions for a specific patient",
    description="Get all sessions (past, upcoming, and in-progress) for a specific patient. Only accessible by the patient's therapist.",
    parameters=[
        OpenApiParameter(name='status', description='Filter by session status', required=False, type=str, 
                        enum=['REQUESTED', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW']),
        OpenApiParameter(name='include_past', description='Include past sessions (default: true)', required=False, type=bool),
        OpenApiParameter(name='include_upcoming', description='Include upcoming sessions (default: true)', required=False, type=bool),
        OpenApiParameter(name='limit', description='Limit number of results (default: 50)', required=False, type=int),
        OpenApiParameter(name='offset', description='Offset for pagination (default: 0)', required=False, type=int),
    ],
    responses={
        200: OpenApiResponse(description='Patient sessions retrieved successfully.'),
        403: OpenApiResponse(description='Only therapists can access patient sessions.'),
        404: OpenApiResponse(description='Patient not found or not connected to therapist.')
    },
    examples=[
        OpenApiExample(
            'Patient Sessions Response',
            summary='All sessions for a patient',
            description='Response showing all sessions for a specific patient',
            value={
                "patient_info": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "full_name": "John Smith",
                    "patient_id": "PT24001"
                },
                "sessions": {
                    "upcoming": [
                        {"id": "...", "session_number": 6, "scheduled_date": "2024-01-25T10:00:00Z", "status": "UPCOMING"}
                    ],
                    "past": [
                        {"id": "...", "session_number": 5, "scheduled_date": "2024-01-15T10:00:00Z", "status": "COMPLETED"}
                    ]
                },
                "total_count": 6,
                "stats": {
                    "total_sessions": 6,
                    "completed_sessions": 5,
                    "upcoming_sessions": 1,
                    "cancelled_sessions": 0
                }
            },
            response_only=True,
        ),
    ]
)
class PatientSessionsListView(generics.GenericAPIView):
    """Get all sessions for a specific patient"""
    permission_classes = [permissions.IsAuthenticated]
    
    class PatientSessionsResponseSerializer(serializers.Serializer):
        patient_info = serializers.DictField()
        sessions = serializers.DictField()
        total_count = serializers.IntegerField()
        stats = serializers.DictField()
    
    serializer_class = PatientSessionsResponseSerializer
    
    def get(self, request, patient_id):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access patient sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            patient = User.objects.get(id=patient_id, user_type='patient')
            patient_profile = patient.patient_profile
            
            # Verify patient is connected to this therapist
            if not patient_profile.therapist or patient_profile.therapist.user != user:
                return Response(
                    {'detail': 'Patient is not connected to you.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except User.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PatientProfile.DoesNotExist:
            return Response({'detail': 'Patient profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get query parameters
        status_filter = request.query_params.get('status')
        include_past = request.query_params.get('include_past', 'true').lower() == 'true'
        include_upcoming = request.query_params.get('include_upcoming', 'true').lower() == 'true'
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        # Base queryset
        queryset = Session.objects.filter(
            patient=patient,
            therapist=user
        ).select_related('patient', 'therapist')
        
        # Apply status filter
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        now = timezone.now()
        
        # Separate upcoming and past sessions
        upcoming_sessions = []
        past_sessions = []
        
        if include_upcoming:
            upcoming_qs = queryset.filter(
                Q(status__in=['UPCOMING', 'IN_PROGRESS', 'REQUESTED', 'RESCHEDULED']) |
                Q(scheduled_date__gte=now)
            ).exclude(status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW']).order_by('scheduled_date')
            upcoming_sessions = TherapistSessionSerializer(upcoming_qs, many=True).data
        
        if include_past:
            past_qs = queryset.filter(
                Q(status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW']) |
                Q(scheduled_date__lt=now, status__in=['UPCOMING', 'IN_PROGRESS'])
            ).order_by('-scheduled_date')
            past_sessions = TherapistSessionSerializer(past_qs, many=True).data
        
        # Calculate stats
        all_sessions = queryset
        stats = {
            'total_sessions': all_sessions.count(),
            'completed_sessions': all_sessions.filter(status='COMPLETED').count(),
            'upcoming_sessions': all_sessions.filter(status='UPCOMING').count(),
            'in_progress_sessions': all_sessions.filter(status='IN_PROGRESS').count(),
            'cancelled_sessions': all_sessions.filter(status='CANCELLED').count(),
            'no_show_sessions': all_sessions.filter(status='NO_SHOW').count(),
            'requested_sessions': all_sessions.filter(status='REQUESTED').count(),
        }
        
        response_data = {
            'patient_info': {
                'id': str(patient.id),
                'full_name': patient.full_name,
                'patient_id': patient_profile.patient_id,
                'email': patient.email,
                'phone_number': patient.phone_number,
                'therapy_start_date': patient_profile.therapy_start_date,
                'session_frequency': patient_profile.session_frequency,
            },
            'sessions': {
                'upcoming': upcoming_sessions,
                'past': past_sessions,
            },
            'total_count': len(upcoming_sessions) + len(past_sessions),
            'stats': stats,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Session Analysis'],
    summary="Get session emotional analysis",
    description="Get comprehensive emotional analysis data for a specific session including mood timeline, sentiment scores, and key emotional patterns. Returns static/mock data for frontend integration.",
    responses={
        200: OpenApiResponse(description='Emotional analysis retrieved successfully.'),
        403: OpenApiResponse(description='Access denied.'),
        404: OpenApiResponse(description='Session not found.')
    },
    examples=[
        OpenApiExample(
            'Emotional Analysis Response',
            summary='Session emotional analysis data',
            description='Comprehensive emotional analysis for a therapy session',
            value={
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "analysis_status": "completed",
                "overall_sentiment": {
                    "score": 0.65,
                    "label": "positive",
                    "confidence": 0.89
                },
                "mood_timeline": [
                    {"timestamp": 0, "mood": "anxious", "score": 0.3, "valence": -0.4, "arousal": 0.7},
                    {"timestamp": 300, "mood": "neutral", "score": 0.5, "valence": 0.0, "arousal": 0.4},
                    {"timestamp": 900, "mood": "calm", "score": 0.7, "valence": 0.3, "arousal": 0.2}
                ],
                "emotional_patterns": {
                    "dominant_emotions": ["anxious", "hopeful", "calm"],
                    "emotional_shift": "positive",
                    "peak_anxiety_moment": 120,
                    "breakthrough_moment": 780
                },
                "key_topics": ["work stress", "family relationships", "coping strategies"],
                "recommendations": ["Continue breathing exercises", "Schedule follow-up in one week"]
            },
            response_only=True,
        ),
    ]
)
class SessionEmotionalAnalysisView(generics.GenericAPIView):
    """Get emotional analysis for a session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class EmotionalAnalysisResponseSerializer(serializers.Serializer):
        session_id = serializers.UUIDField()
        analysis_status = serializers.CharField()
        overall_sentiment = serializers.DictField()
        mood_timeline = serializers.ListField()
        emotional_patterns = serializers.DictField()
        key_topics = serializers.ListField()
        recommendations = serializers.ListField()
    
    serializer_class = EmotionalAnalysisResponseSerializer
    
    def get(self, request, session_id):
        user = request.user
        
        try:
            if user.user_type == 'therapist':
                session = Session.objects.get(id=session_id, therapist=user)
            elif user.user_type == 'patient':
                session = Session.objects.get(id=session_id, patient=user)
            else:
                return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        except Session.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Try to get real data from transcription models
        try:
            transcription = session.transcription
            segments = transcription.segments.all().order_by('start_time')
            mood_snapshots = session.mood_snapshots.all().order_by('captured_at')
            
            # Build mood timeline from real data if available
            mood_timeline = []
            for snapshot in mood_snapshots:
                mood_timeline.append({
                    'timestamp': snapshot.relative_seconds or 0,
                    'mood': snapshot.mood_label,
                    'score': snapshot.mood_score or 0.5,
                    'valence': snapshot.valence or 0.0,
                    'arousal': snapshot.arousal or 0.0,
                    'confidence': snapshot.confidence or 0.8
                })
            
            # Get emotion analysis from segments
            emotions_data = []
            for segment in segments:
                if hasattr(segment, 'emotion'):
                    emotions_data.append({
                        'timestamp': segment.start_time,
                        'emotion': segment.emotion.primary_emotion,
                        'valence': segment.emotion.valence,
                        'arousal': segment.emotion.arousal,
                        'confidence': segment.emotion.confidence
                    })
            
            # Get session insights if available
            insights = None
            try:
                insights = session.insights
            except SessionInsight.DoesNotExist:
                pass
            
            analysis_status = 'completed' if transcription.status == 'completed' else transcription.status
            
            # Use real data if available, otherwise provide static mock data
            if mood_timeline or emotions_data:
                response_data = {
                    'session_id': str(session.id),
                    'analysis_status': analysis_status,
                    'overall_sentiment': {
                        'score': session.ai_sentiment_score or 0.65,
                        'label': 'positive' if (session.ai_sentiment_score or 0.65) > 0.5 else 'negative',
                        'confidence': 0.89
                    },
                    'mood_timeline': mood_timeline if mood_timeline else emotions_data,
                    'emotional_patterns': {
                        'dominant_emotions': insights.key_themes[:3] if insights and insights.key_themes else ['anxious', 'hopeful', 'calm'],
                        'emotional_shift': 'positive' if session.mood_improvement and session.mood_improvement > 0 else 'stable',
                        'mood_improvement': session.mood_improvement,
                    },
                    'key_topics': session.ai_key_topics or insights.key_themes if insights else ['therapy progress', 'coping strategies', 'emotional regulation'],
                    'recommendations': [insights.recommendations] if insights and insights.recommendations else ['Continue current therapy approach', 'Practice mindfulness exercises'],
                    'ai_mood_analysis': session.ai_mood_analysis,
                    'ai_recommendations': session.ai_recommendations,
                }
            else:
                # Return static mock data for frontend integration
                response_data = self._get_static_analysis_data(session)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Transcription.DoesNotExist:
            # Return static mock data when no transcription exists
            response_data = self._get_static_analysis_data(session)
            return Response(response_data, status=status.HTTP_200_OK)
    
    def _get_static_analysis_data(self, session):
        """Return static mock data for frontend integration"""
        return {
            'session_id': str(session.id),
            'analysis_status': 'pending' if session.status in ['UPCOMING', 'REQUESTED'] else 'completed',
            'overall_sentiment': {
                'score': 0.65,
                'label': 'positive',
                'confidence': 0.89
            },
            'mood_timeline': [
                {'timestamp': 0, 'mood': 'anxious', 'score': 0.3, 'valence': -0.4, 'arousal': 0.7, 'confidence': 0.85},
                {'timestamp': 300, 'mood': 'neutral', 'score': 0.5, 'valence': 0.0, 'arousal': 0.4, 'confidence': 0.82},
                {'timestamp': 600, 'mood': 'engaged', 'score': 0.6, 'valence': 0.2, 'arousal': 0.5, 'confidence': 0.88},
                {'timestamp': 900, 'mood': 'hopeful', 'score': 0.7, 'valence': 0.4, 'arousal': 0.4, 'confidence': 0.91},
                {'timestamp': 1200, 'mood': 'calm', 'score': 0.75, 'valence': 0.3, 'arousal': 0.2, 'confidence': 0.87},
                {'timestamp': 1500, 'mood': 'relaxed', 'score': 0.8, 'valence': 0.5, 'arousal': 0.2, 'confidence': 0.90},
            ],
            'emotional_patterns': {
                'dominant_emotions': ['anxious', 'hopeful', 'calm'],
                'emotional_shift': 'positive',
                'peak_anxiety_moment': 120,
                'breakthrough_moment': 780,
                'mood_improvement': 4,
            },
            'key_topics': [
                'work-related stress',
                'family relationships',
                'anxiety management',
                'coping strategies',
                'self-care practices'
            ],
            'speaker_analysis': {
                'patient': {
                    'speaking_time_percentage': 65,
                    'average_sentiment': 0.55,
                    'emotional_range': 'moderate'
                },
                'therapist': {
                    'speaking_time_percentage': 35,
                    'intervention_count': 12,
                    'supportive_statements': 8
                }
            },
            'recommendations': [
                'Continue practicing breathing exercises daily',
                'Consider journaling before stressful situations',
                'Schedule follow-up session in one week',
                'Try the grounding technique discussed today'
            ],
            'ai_mood_analysis': {
                'start_mood': 'anxious',
                'end_mood': 'calm',
                'trajectory': 'improving',
                'notable_moments': [
                    {'time': 120, 'event': 'Peak anxiety when discussing work'},
                    {'time': 780, 'event': 'Breakthrough moment with coping strategy'},
                    {'time': 1400, 'event': 'Noticeable relaxation after exercise discussion'}
                ]
            },
            'ai_recommendations': 'Patient showed significant improvement during session. Continue CBT approach with focus on anxiety management techniques. Consider introducing mindfulness exercises in next session.'
        }


@extend_schema(
    tags=['Session Analysis'],
    summary="Get session transcription",
    description="Get transcription data for a specific session. Returns static/mock data for frontend integration when real transcription is not available.",
    responses={
        200: OpenApiResponse(description='Transcription retrieved successfully.'),
        403: OpenApiResponse(description='Access denied.'),
        404: OpenApiResponse(description='Session not found.')
    },
    examples=[
        OpenApiExample(
            'Transcription Response',
            summary='Session transcription data',
            description='Transcription with speaker diarization and timestamps',
            value={
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "transcription_status": "completed",
                "language_detected": "en",
                "duration_seconds": 3600,
                "segments": [
                    {
                        "id": "seg-001",
                        "speaker_type": "therapist",
                        "text": "How have you been feeling this week?",
                        "start_time": 0.0,
                        "end_time": 3.5,
                        "confidence": 0.95
                    }
                ],
                "summary": "Session focused on anxiety management..."
            },
            response_only=True,
        ),
    ]
)
class SessionTranscriptionView(generics.GenericAPIView):
    """Get transcription for a session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class TranscriptionResponseSerializer(serializers.Serializer):
        session_id = serializers.UUIDField()
        transcription_status = serializers.CharField()
        segments = serializers.ListField()
    
    serializer_class = TranscriptionResponseSerializer
    
    def get(self, request, session_id):
        user = request.user
        
        try:
            if user.user_type == 'therapist':
                session = Session.objects.get(id=session_id, therapist=user)
            elif user.user_type == 'patient':
                session = Session.objects.get(id=session_id, patient=user)
            else:
                return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        except Session.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Try to get real transcription data
        try:
            transcription = session.transcription
            segments = transcription.segments.all().order_by('start_time')
            
            segments_data = []
            for segment in segments:
                segment_data = {
                    'id': str(segment.id) if hasattr(segment, 'id') else f"seg-{len(segments_data)}",
                    'speaker_type': segment.speaker_type,
                    'speaker_id': segment.speaker_id,
                    'text': segment.text,
                    'start_time': segment.start_time,
                    'end_time': segment.end_time,
                    'confidence': segment.confidence_score,
                    'language': segment.language,
                }
                
                # Add emotion data if available
                if hasattr(segment, 'emotion'):
                    segment_data['emotion'] = {
                        'primary_emotion': segment.emotion.primary_emotion,
                        'valence': segment.emotion.valence,
                        'arousal': segment.emotion.arousal,
                        'confidence': segment.emotion.confidence,
                        'emotion_scores': segment.emotion.emotion_scores
                    }
                
                segments_data.append(segment_data)
            
            response_data = {
                'session_id': str(session.id),
                'transcription_id': str(transcription.id),
                'transcription_status': transcription.status,
                'language_detected': transcription.language_detected or 'en',
                'processing_started_at': transcription.processing_started_at,
                'processing_completed_at': transcription.processing_completed_at,
                'duration_seconds': session.duration_minutes * 60 if session.duration_minutes else 3600,
                'segments': segments_data if segments_data else self._get_static_segments(),
                'segment_count': len(segments_data) if segments_data else 24,
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Transcription.DoesNotExist:
            # Return static mock data for frontend integration
            response_data = {
                'session_id': str(session.id),
                'transcription_id': None,
                'transcription_status': 'pending' if session.status in ['UPCOMING', 'REQUESTED'] else 'mock_data',
                'language_detected': 'en',
                'processing_started_at': None,
                'processing_completed_at': None,
                'duration_seconds': session.duration_minutes * 60 if session.duration_minutes else 3600,
                'segments': self._get_static_segments(),
                'segment_count': 24,
                'is_mock_data': True,
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
    
    def _get_static_segments(self):
        """Return static mock transcription segments for frontend integration"""
        return [
            {
                'id': 'seg-001',
                'speaker_type': 'therapist',
                'speaker_id': 'therapist-1',
                'text': 'Good morning! How have you been feeling since our last session?',
                'start_time': 0.0,
                'end_time': 4.5,
                'confidence': 0.95,
                'language': 'en',
                'emotion': {'primary_emotion': 'neutral', 'valence': 0.2, 'arousal': 0.3, 'confidence': 0.88}
            },
            {
                'id': 'seg-002',
                'speaker_type': 'patient',
                'speaker_id': 'patient-1',
                'text': "It's been a challenging week. I've been feeling quite anxious about work.",
                'start_time': 5.0,
                'end_time': 10.5,
                'confidence': 0.92,
                'language': 'en',
                'emotion': {'primary_emotion': 'anxious', 'valence': -0.4, 'arousal': 0.7, 'confidence': 0.85}
            },
            {
                'id': 'seg-003',
                'speaker_type': 'therapist',
                'speaker_id': 'therapist-1',
                'text': 'I understand. Can you tell me more about what specifically has been causing the anxiety?',
                'start_time': 11.0,
                'end_time': 16.0,
                'confidence': 0.94,
                'language': 'en',
                'emotion': {'primary_emotion': 'empathetic', 'valence': 0.3, 'arousal': 0.3, 'confidence': 0.90}
            },
            {
                'id': 'seg-004',
                'speaker_type': 'patient',
                'speaker_id': 'patient-1',
                'text': "There's a big presentation coming up next week, and I keep worrying about everything that could go wrong.",
                'start_time': 17.0,
                'end_time': 24.0,
                'confidence': 0.91,
                'language': 'en',
                'emotion': {'primary_emotion': 'worried', 'valence': -0.5, 'arousal': 0.6, 'confidence': 0.87}
            },
            {
                'id': 'seg-005',
                'speaker_type': 'therapist',
                'speaker_id': 'therapist-1',
                'text': "That sounds stressful. Let's explore some of those worries together. What's the worst-case scenario you're imagining?",
                'start_time': 25.0,
                'end_time': 32.0,
                'confidence': 0.93,
                'language': 'en',
                'emotion': {'primary_emotion': 'supportive', 'valence': 0.4, 'arousal': 0.4, 'confidence': 0.89}
            },
            {
                'id': 'seg-006',
                'speaker_type': 'patient',
                'speaker_id': 'patient-1',
                'text': 'I guess I worry that I\'ll forget what to say, or that people will think I\'m incompetent.',
                'start_time': 33.0,
                'end_time': 40.0,
                'confidence': 0.90,
                'language': 'en',
                'emotion': {'primary_emotion': 'insecure', 'valence': -0.6, 'arousal': 0.5, 'confidence': 0.84}
            },
            {
                'id': 'seg-007',
                'speaker_type': 'therapist',
                'speaker_id': 'therapist-1',
                'text': 'Those are common fears. Have you ever experienced something like that before during a presentation?',
                'start_time': 41.0,
                'end_time': 47.0,
                'confidence': 0.94,
                'language': 'en',
                'emotion': {'primary_emotion': 'curious', 'valence': 0.2, 'arousal': 0.4, 'confidence': 0.91}
            },
            {
                'id': 'seg-008',
                'speaker_type': 'patient',
                'speaker_id': 'patient-1',
                'text': "Actually, no. My presentations usually go well. I just always feel this way beforehand.",
                'start_time': 48.0,
                'end_time': 55.0,
                'confidence': 0.92,
                'language': 'en',
                'emotion': {'primary_emotion': 'reflective', 'valence': 0.1, 'arousal': 0.3, 'confidence': 0.86}
            },
            {
                'id': 'seg-009',
                'speaker_type': 'therapist',
                'speaker_id': 'therapist-1',
                'text': "That's an important observation. So the evidence from your past shows you're actually quite capable. Let's work on some strategies to manage this anticipatory anxiety.",
                'start_time': 56.0,
                'end_time': 68.0,
                'confidence': 0.95,
                'language': 'en',
                'emotion': {'primary_emotion': 'encouraging', 'valence': 0.6, 'arousal': 0.5, 'confidence': 0.92}
            },
            {
                'id': 'seg-010',
                'speaker_type': 'patient',
                'speaker_id': 'patient-1',
                'text': "I'd like that. The breathing exercises we practiced last time helped a bit.",
                'start_time': 69.0,
                'end_time': 75.0,
                'confidence': 0.93,
                'language': 'en',
                'emotion': {'primary_emotion': 'hopeful', 'valence': 0.4, 'arousal': 0.4, 'confidence': 0.88}
            },
        ]


@extend_schema(
    tags=['Mood Alerts'],
    summary="Get mood alerts for therapist",
    description="Get mood alerts and recent mood entries for all patients or a specific patient. Allows therapists to monitor patient wellbeing.",
    parameters=[
        OpenApiParameter(name='patient_id', description='Filter by specific patient', required=False, type=str),
        OpenApiParameter(name='severity', description='Filter by severity: low, medium, high, critical', required=False, type=str),
        OpenApiParameter(name='days', description='Number of days to look back (default: 7)', required=False, type=int),
    ],
    responses={
        200: OpenApiResponse(description='Mood alerts retrieved successfully.'),
        403: OpenApiResponse(description='Only therapists can access mood alerts.')
    },
    examples=[
        OpenApiExample(
            'Mood Alerts Response',
            summary='Therapist mood alerts dashboard',
            description='Mood alerts from all connected patients',
            value={
                "alerts": [
                    {
                        "id": "alert-001",
                        "patient_id": "123e4567-e89b-12d3-a456-426614174000",
                        "patient_name": "John Smith",
                        "severity": "high",
                        "dominant_mood": "sad",
                        "average_intensity": 2.0,
                        "mood_intensities": {"sad": 4, "anxious": 3},
                        "triggers": ["work", "sleep"],
                        "message": "Patient reported very low mood intensity",
                        "created_at": "2024-01-15T10:00:00Z"
                    }
                ],
                "summary": {
                    "total_alerts": 3,
                    "critical_alerts": 1,
                    "high_alerts": 1,
                    "patients_needing_attention": 2,
                    "total_mood_entries": 45,
                    "average_mood_intensity": 3.2
                }
            },
            response_only=True,
        ),
    ]
)
class TherapistMoodAlertsView(generics.GenericAPIView):
    """Get mood alerts for therapist's patients"""
    permission_classes = [permissions.IsAuthenticated]
    
    class MoodAlertsResponseSerializer(serializers.Serializer):
        alerts = serializers.ListField()
        summary = serializers.DictField()
        recent_mood_entries = serializers.ListField()
    
    serializer_class = MoodAlertsResponseSerializer
    
    def get(self, request):
        user = request.user
        if user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access mood alerts.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            therapist_profile = user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'detail': 'Therapist profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get query parameters
        patient_id = request.query_params.get('patient_id')
        severity_filter = request.query_params.get('severity')
        days = int(request.query_params.get('days', 7))
        
        # Get all connected patients
        patient_profiles = therapist_profile.patients.all()
        if patient_id:
            patient_profiles = patient_profiles.filter(user__id=patient_id)
        
        patient_ids = [p.user_id for p in patient_profiles]
        
        # Import MoodEntry from patients app
        from patients.models import MoodEntry
        
        # Get mood entries for the past N days
        start_date = timezone.now() - timedelta(days=days)
        mood_entries = MoodEntry.objects.filter(
            patient_id__in=patient_ids,
            created_at__gte=start_date
        ).order_by('-created_at')
        
        # Generate alerts based on mood scores
        alerts = []
        for entry in mood_entries:
            severity = self._calculate_severity(entry.average_intensity)
            if severity_filter and severity != severity_filter:
                continue
            
            if severity in ['high', 'critical']:  # Only alert on concerning moods
                patient = entry.patient
                alerts.append({
                    'id': str(entry.id),
                    'patient_id': str(patient.id),
                    'patient_name': patient.full_name,
                    'severity': severity,
                    'dominant_mood': entry.dominant_mood,
                    'average_intensity': entry.average_intensity,
                    'mood_intensities': entry.mood_intensities,
                    'triggers': entry.triggers_list,
                    'notes': entry.notes,
                    'created_at': entry.created_at,
                    'message': self._generate_alert_message(entry),
                })
        
        # Recent mood entries (all, not just alerts)
        recent_entries = []
        for entry in mood_entries[:20]:
            patient = entry.patient
            recent_entries.append({
                'id': str(entry.id),
                'patient_id': str(patient.id),
                'patient_name': patient.full_name,
                'dominant_mood': entry.dominant_mood,
                'average_intensity': entry.average_intensity,
                'created_at': entry.created_at,
            })
        
        # Summary
        summary = {
            'total_alerts': len(alerts),
            'critical_alerts': len([a for a in alerts if a['severity'] == 'critical']),
            'high_alerts': len([a for a in alerts if a['severity'] == 'high']),
            'medium_alerts': len([a for a in alerts if a['severity'] == 'medium']),
            'patients_needing_attention': len(set(a['patient_id'] for a in alerts if a['severity'] in ['critical', 'high'])),
            'total_mood_entries': mood_entries.count(),
            'average_mood_intensity': mood_entries.aggregate(avg=Avg('average_intensity'))['avg'] or 0,
        }
        
        return Response({
            'alerts': alerts,
            'summary': summary,
            'recent_mood_entries': recent_entries,
        }, status=status.HTTP_200_OK)
    
    def _calculate_severity(self, mood_score):
        """Calculate alert severity based on mood score"""
        if mood_score <= 2:
            return 'critical'
        elif mood_score <= 4:
            return 'high'
        elif mood_score <= 6:
            return 'medium'
        else:
            return 'low'
    
    def _generate_alert_message(self, entry):
        """Generate alert message based on entry data"""
        messages = []
        
        if entry.average_intensity <= 2:
            messages.append('Patient reported very low mood intensity')
        elif entry.average_intensity <= 3:
            messages.append('Patient reported low mood intensity')
        
        # Check for anxiety or stress in mood intensities
        if 'anxious' in entry.mood_intensities and entry.mood_intensities['anxious'] >= 4:
            messages.append('High anxiety levels reported')
        
        if 'stressed' in entry.mood_intensities and entry.mood_intensities['stressed'] >= 4:
            messages.append('High stress levels reported')
        
        return '. '.join(messages) if messages else 'Mood check-in recorded'


@extend_schema(
    tags=['Mood Alerts'],
    summary="Get mood summary for patient",
    description="Get patient-specific view of their mood history and trends.",
    parameters=[
        OpenApiParameter(name='days', description='Number of days to include (default: 30)', required=False, type=int),
    ],
    responses={
        200: OpenApiResponse(description='Patient mood data retrieved successfully.'),
        403: OpenApiResponse(description='Only patients can access this endpoint.')
    }
)
class PatientMoodSummaryView(generics.GenericAPIView):
    """Get mood summary for patient"""
    permission_classes = [permissions.IsAuthenticated]
    
    class PatientMoodSummarySerializer(serializers.Serializer):
        mood_trend = serializers.ListField()
        statistics = serializers.DictField()
        recent_entries = serializers.ListField()
    
    serializer_class = PatientMoodSummarySerializer
    
    def get(self, request):
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access this endpoint.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        from patients.models import MoodEntry
        
        mood_entries = MoodEntry.objects.filter(
            patient=user,
            created_at__gte=start_date
        ).order_by('created_at')
        
        # Build mood trend data
        mood_trend = []
        for entry in mood_entries:
            mood_trend.append({
                'date': entry.created_at.date().isoformat(),
                'dominant_mood': entry.dominant_mood,
                'average_intensity': entry.average_intensity,
                'mood_intensities': entry.mood_intensities,
                'triggers': entry.triggers_list,
            })
        
        # Statistics
        stats = {
            'total_entries': mood_entries.count(),
            'average_intensity': mood_entries.aggregate(avg=Avg('average_intensity'))['avg'] or 0,
            'highest_intensity': mood_entries.order_by('-average_intensity').first().average_intensity if mood_entries.exists() else 0,
            'lowest_intensity': mood_entries.order_by('average_intensity').first().average_intensity if mood_entries.exists() else 0,
            'most_common_mood': self._get_most_common_mood(mood_entries),
        }
        
        # Recent entries
        recent = mood_entries.order_by('-created_at')[:10]
        recent_entries = []
        for entry in recent:
            recent_entries.append({
                'id': str(entry.id),
                'dominant_mood': entry.dominant_mood,
                'average_intensity': entry.average_intensity,
                'mood_intensities': entry.mood_intensities,
                'notes': entry.notes,
                'created_at': entry.created_at,
            })
        
        return Response({
            'mood_trend': mood_trend,
            'statistics': stats,
            'recent_entries': recent_entries,
        }, status=status.HTTP_200_OK)
    
    def _get_most_common_mood(self, mood_entries):
        """Get the most common dominant mood from entries"""
        if not mood_entries:
            return None
        
        mood_counts = {}
        for entry in mood_entries:
            mood = entry.dominant_mood
            if mood:
                mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        return max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else None


# =============================================================================
# NEW AVAILABILITY AND BOOKING VIEWS
# =============================================================================

@extend_schema(tags=['Therapist Availability'])
class TherapistAvailabilityView(APIView):
    """Manage therapist weekly availability schedule"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        responses={200: TherapistAvailabilitySerializer(many=True)},
        summary="Get Availability Schedule",
        description="Get the therapist's weekly availability schedule."
    )
    def get(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access availability.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import TherapistAvailability
        
        availabilities = TherapistAvailability.objects.filter(
            therapist=request.user
        ).order_by('day_of_week')
        
        serializer = TherapistAvailabilitySerializer(availabilities, many=True)
        
        # Also include summary
        days_available = availabilities.filter(is_day_off=False).count()
        
        return Response({
            'availability': serializer.data,
            'summary': {
                'days_available': days_available,
                'days_off': availabilities.filter(is_day_off=True).count(),
                'total_configured': availabilities.count()
            }
        }, status=status.HTTP_200_OK)
    
    @extend_schema(
        request=TherapistAvailabilitySerializer(many=True),
        responses={200: TherapistAvailabilitySerializer(many=True)},
        summary="Set Availability Schedule",
        description="Set or update the therapist's weekly availability schedule."
    )
    def post(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can set availability.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import TherapistAvailability
        
        availabilities_data = request.data if isinstance(request.data, list) else [request.data]
        created_or_updated = []
        
        for avail_data in availabilities_data:
            day_of_week = avail_data.get('day_of_week')
            
            if day_of_week is None:
                return Response(
                    {'detail': 'day_of_week is required for each availability entry.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update or create
            availability, created = TherapistAvailability.objects.update_or_create(
                therapist=request.user,
                day_of_week=day_of_week,
                defaults={
                    'start_time': avail_data.get('start_time', '09:00'),
                    'end_time': avail_data.get('end_time', '17:00'),
                    'is_day_off': avail_data.get('is_day_off', False),
                    'break_start': avail_data.get('break_start'),
                    'break_end': avail_data.get('break_end'),
                    'slot_duration_minutes': avail_data.get('slot_duration_minutes', 60),
                    'buffer_between_sessions': avail_data.get('buffer_between_sessions', 15),
                    'is_online_available': avail_data.get('is_online_available', True),
                    'location': avail_data.get('location', ''),
                    'notes': avail_data.get('notes', ''),
                }
            )
            created_or_updated.append(availability)
        
        serializer = TherapistAvailabilitySerializer(created_or_updated, many=True)
        return Response({
            'detail': f'Updated {len(created_or_updated)} availability entries.',
            'availability': serializer.data
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Therapist Availability'])
class TherapistDateOverrideView(APIView):
    """Manage date-specific availability overrides (holidays, special hours)"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='start_date', description='Start date for range (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date for range (YYYY-MM-DD)', required=False, type=str),
        ],
        responses={200: OpenApiResponse(description='Date overrides retrieved.')},
        summary="Get Date Overrides",
        description="Get date-specific availability overrides."
    )
    def get(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can access date overrides.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import TherapistDateOverride
        from .serializers import TherapistDateOverrideSerializer
        
        overrides = TherapistDateOverride.objects.filter(
            therapist=request.user
        ).order_by('date')
        
        # Apply date filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            overrides = overrides.filter(date__gte=start_date)
        if end_date:
            overrides = overrides.filter(date__lte=end_date)
        
        serializer = TherapistDateOverrideSerializer(overrides, many=True)
        return Response({
            'overrides': serializer.data,
            'total': overrides.count()
        }, status=status.HTTP_200_OK)
    
    @extend_schema(
        request=OpenApiParameter,
        responses={201: OpenApiResponse(description='Date override created.')},
        summary="Create Date Override",
        description="Create a date-specific availability override (e.g., holiday, special hours)."
    )
    def post(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can create date overrides.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import TherapistDateOverride
        from .serializers import TherapistDateOverrideSerializer
        
        serializer = TherapistDateOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        override, created = TherapistDateOverride.objects.update_or_create(
            therapist=request.user,
            date=serializer.validated_data['date'],
            defaults={
                'is_available': serializer.validated_data.get('is_available', False),
                'start_time': serializer.validated_data.get('start_time'),
                'end_time': serializer.validated_data.get('end_time'),
                'reason': serializer.validated_data.get('reason', ''),
            }
        )
        
        return Response({
            'detail': 'Date override saved.',
            'override': TherapistDateOverrideSerializer(override).data
        }, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        responses={204: OpenApiResponse(description='Date override deleted.')},
        summary="Delete Date Override",
        description="Delete a date-specific availability override."
    )
    def delete(self, request):
        if request.user.user_type != 'therapist':
            return Response(
                {'detail': 'Only therapists can delete date overrides.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import TherapistDateOverride
        
        date = request.data.get('date')
        if not date:
            return Response(
                {'detail': 'date is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted, _ = TherapistDateOverride.objects.filter(
            therapist=request.user,
            date=date
        ).delete()
        
        if deleted:
            return Response({'detail': 'Date override deleted.'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'detail': 'Date override not found.'}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=['Patient Booking'])
class AvailableSlotsView(APIView):
    """Get available booking slots for a therapist"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='date', description='Date to get slots for (YYYY-MM-DD)', required=True, type=str),
            OpenApiParameter(name='duration', description='Session duration in minutes (default: 60)', required=False, type=int),
        ],
        responses={200: OpenApiResponse(description='Available slots retrieved.')},
        summary="Get Available Slots",
        description="Get available booking slots for the patient's connected therapist on a specific date."
    )
    def get(self, request):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can view available slots.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get patient's therapist
        try:
            patient_profile = request.user.patient_profile
            if not patient_profile.therapist:
                return Response(
                    {'detail': 'You are not connected to a therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            therapist = patient_profile.therapist.user
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Patient profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get parameters
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'detail': 'date parameter is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        duration = int(request.query_params.get('duration', 60))
        
        # Get available slots using AvailabilityService
        from .services import AvailabilityService
        
        slots = AvailabilityService.get_available_slots(
            therapist=therapist,
            date=date,
            duration_minutes=duration
        )
        
        # Format slots for response
        slots_data = []
        for slot in slots:
            slots_data.append({
                'start_time': slot['start'].isoformat(),
                'end_time': slot['end'].isoformat(),
                'is_online_available': slot.get('is_online_available', True),
                'location': slot.get('location', ''),
            })
        
        return Response({
            'date': date_str,
            'therapist': {
                'id': str(therapist.id),
                'name': therapist.full_name,
            },
            'duration_minutes': duration,
            'available_slots': slots_data,
            'total_slots': len(slots_data)
        }, status=status.HTTP_200_OK)


@extend_schema(tags=['Patient Booking'])
class PatientBookSessionView(APIView):
    """Patient books a session from available slots"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=PatientBookingSerializer,
        responses={
            201: SessionSerializer,
            400: OpenApiResponse(description='Invalid booking or slot not available.')
        },
        summary="Book Session",
        description="Book a session from an available slot."
    )
    def post(self, request):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can book sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .serializers import PatientBookingSerializer
        
        serializer = PatientBookingSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the session
        therapist = serializer.validated_data['therapist']
        session = Session.objects.create(
            patient=request.user,
            therapist=therapist,
            scheduled_date=serializer.validated_data['slot_start'],
            duration_minutes=serializer.validated_data['duration_minutes'],
            is_online=serializer.validated_data['is_online'],
            patient_goals=serializer.validated_data.get('patient_goals', ''),
            status='UPCOMING',
            session_type='individual',
            created_by=request.user,
        )
        
        response_serializer = SessionSerializer(session, context={'request': request})
        return Response({
            'detail': 'Session booked successfully.',
            'session': response_serializer.data
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Patient Booking'])
class EmergencySessionRequestView(APIView):
    """Patient requests an emergency session"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=EmergencySessionRequestSerializer,
        responses={
            201: SessionSerializer,
            400: OpenApiResponse(description='Invalid request.')
        },
        summary="Request Emergency Session",
        description="Request an emergency session. The therapist will be notified and can schedule freely."
    )
    def post(self, request):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can request emergency sessions.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .serializers import EmergencySessionRequestSerializer
        
        serializer = EmergencySessionRequestSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        therapist = serializer.validated_data['therapist']
        
        # Create emergency session request
        session = Session.objects.create(
            patient=request.user,
            therapist=therapist,
            scheduled_date=serializer.validated_data.get('preferred_date') or timezone.now(),
            is_online=serializer.validated_data['is_online'],
            patient_goals=serializer.validated_data['reason'],
            status='REQUESTED',
            session_type='individual',
            is_emergency=True,
            created_by=request.user,
        )
        
        response_serializer = SessionSerializer(session, context={'request': request})
        return Response({
            'detail': 'Emergency session request submitted. Your therapist will be notified.',
            'session': response_serializer.data
        }, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Therapist Availability'])
class TherapistAvailableDatesView(APIView):
    """Get dates with available slots for a therapist (for calendar display)"""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='month', description='Month (1-12)', required=True, type=int),
            OpenApiParameter(name='year', description='Year (e.g., 2024)', required=True, type=int),
        ],
        responses={200: OpenApiResponse(description='Available dates retrieved.')},
        summary="Get Available Dates",
        description="Get all dates in a month that have available slots."
    )
    def get(self, request):
        if request.user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can view available dates.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get patient's therapist
        try:
            patient_profile = request.user.patient_profile
            if not patient_profile.therapist:
                return Response(
                    {'detail': 'You are not connected to a therapist.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            therapist = patient_profile.therapist.user
        except PatientProfile.DoesNotExist:
            return Response(
                {'detail': 'Patient profile not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get parameters
        try:
            month = int(request.query_params.get('month'))
            year = int(request.query_params.get('year'))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'month and year parameters are required as integers.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .services import AvailabilityService
        from calendar import monthrange
        from datetime import date
        
        # Get first and last day of month
        _, last_day = monthrange(year, month)
        
        available_dates = []
        today = timezone.now().date()
        
        for day in range(1, last_day + 1):
            check_date = date(year, month, day)
            
            # Skip past dates
            if check_date < today:
                continue
            
            # Check if there are available slots on this date
            slots = AvailabilityService.get_available_slots(
                therapist=therapist,
                date=check_date,
                duration_minutes=60  # Default duration for checking
            )
            
            if slots:
                available_dates.append({
                    'date': check_date.isoformat(),
                    'slots_count': len(slots),
                    'first_slot': slots[0]['start'].strftime('%H:%M') if slots else None,
                    'last_slot': slots[-1]['start'].strftime('%H:%M') if slots else None,
                })
        
        return Response({
            'year': year,
            'month': month,
            'available_dates': available_dates,
            'total_dates': len(available_dates)
        }, status=status.HTTP_200_OK)