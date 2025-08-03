from django.shortcuts import render, get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count, Avg
from rest_framework import generics, status, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter
from datetime import datetime, timedelta
import json
from .exceptions import (
    validate_user_role_for_action, validate_patient_therapist_connection,
    validate_session_status_transition, PatientNotConnectedException,
    SessionNotAvailableException, MaxPatientsReachedException
)

from .models import (
    Session, SessionTemplate, PatientProgress, SessionReminder, 
    TherapistAvailability, SessionQRCode, SessionAudio, SessionInsight
)
from .serializers import (
    SessionSerializer, SessionCreateSerializer, SessionUpdateSerializer,
    SessionTemplateSerializer, PatientProgressSerializer, 
    TherapistAvailabilitySerializer, SessionInsightSerializer,
    PatientListSerializer, SessionStatsSerializer, EnhancedPatientCreateSerializer,
    PatientSessionSerializer, TherapistSessionSerializer, SessionListSerializer,
    SessionRequestSerializer
)
from users.models import PatientProfile, TherapistProfile

User = get_user_model()


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
class CreatePatientView(generics.GenericAPIView):
    """Create a new patient and assign to therapist"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EnhancedPatientCreateSerializer
    
    def post(self, request):
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
            serializer = EnhancedPatientCreateSerializer(
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
    """Start a session"""
    permission_classes = [permissions.IsAuthenticated]
    
    class StartSessionResponseSerializer(serializers.Serializer):
        detail = serializers.CharField()
        session = SessionSerializer()
    
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
        
        return Response({
            'detail': 'Session started successfully.',
            'session': SessionSerializer(session).data
        }, status=status.HTTP_200_OK)


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
            import uuid
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
                    'pairing_code': therapist_profile.pairing_code,
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