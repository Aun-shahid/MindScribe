"""Transcription related API endpoints with OpenAPI documentation."""

import os
import threading
import time
from rest_framework import permissions, status, views, serializers
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from typing import Any
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from therapy_sessions.models import Session
from .services import transcription_service

# Shared secret for webhook authentication
TRANSCRIPTION_WEBHOOK_SECRET = os.getenv('TRANSCRIPTION_WEBHOOK_SECRET', 'mindscribe-webhook-secret-2024')


class StartRealtimeTranscriptionResponseSerializer(serializers.Serializer):
	detail = serializers.CharField()
	session_id = serializers.UUIDField()
	realtime_id = serializers.UUIDField()
	websocket_url = serializers.CharField(allow_null=True, required=False)
	connection_id = serializers.CharField(allow_null=True, required=False)
	status = serializers.CharField()


class RealtimeWebhookRequestSerializer(serializers.Serializer):
	event = serializers.ChoiceField(choices=[
		'partial_transcript', 'final_transcript', 'mood_snapshot', 'close'
	])
	text = serializers.CharField(required=False, allow_blank=True)
	speaker_type = serializers.ChoiceField(choices=['patient', 'therapist', 'unknown'], required=False)
	start_time = serializers.FloatField(required=False)
	end_time = serializers.FloatField(required=False)
	confidence = serializers.FloatField(required=False)
	language = serializers.CharField(required=False)
	emotion = serializers.JSONField(required=False)
	mood_label = serializers.CharField(required=False)
	mood_score = serializers.FloatField(required=False)
	valence = serializers.FloatField(required=False)
	arousal = serializers.FloatField(required=False)
	extra = serializers.JSONField(required=False)


class CloseRealtimeTranscriptionResponseSerializer(serializers.Serializer):
	detail = serializers.CharField()


class StartRealtimeTranscriptionView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['Transcription'],
		summary='Start realtime transcription',
		description='Starts realtime transcription & analysis for the session (therapist only).',
		responses={200: StartRealtimeTranscriptionResponseSerializer},
		examples=[
			OpenApiExample(
				'Realtime Init',
				value={
					'detail': 'Realtime transcription initialized',
					'session_id': '123e4567-e89b-12d3-a456-426614174000',
					'realtime_id': '223e4567-e89b-12d3-a456-426614174000',
					'websocket_url': 'wss://api.example.com/rt/abc',
					'connection_id': 'rt_conn_01',
					'status': 'active'
				}
			)
		]
	)
	def post(self, request, session_id: str):
		session = get_object_or_404(Session, id=session_id)
		if request.user != session.therapist:
			return Response({'detail': 'Only therapist can start transcription.'}, status=403)
		result = transcription_service.start_realtime_for_session(session)
		return Response({
			'detail': 'Realtime transcription initialized',
			'session_id': str(session.id),
			'realtime_id': str(result.realtime.id),
			'websocket_url': result.client_websocket_url,
			'connection_id': result.connection_id,
			'status': result.realtime.status,
		})


def verify_webhook_auth(request) -> bool:
	"""Verify the webhook request has valid authentication."""
	auth_header = request.META.get('HTTP_X_TRANSCRIPTION_KEY', '')
	return auth_header == TRANSCRIPTION_WEBHOOK_SECRET


@method_decorator(csrf_exempt, name='dispatch')
class RealtimeWebhookView(views.APIView):
	authentication_classes: list[Any] = []
	permission_classes: list[Any] = []

	@extend_schema(
		tags=['Transcription'],
		summary='Realtime transcription webhook',
		description='Receives streaming events (partial/final transcripts, mood snapshots, close). Requires X-Transcription-Key header for authentication.',
		request=RealtimeWebhookRequestSerializer,
		responses={
			200: OpenApiResponse(description='Event processed'),
			401: OpenApiResponse(description='Unauthorized - invalid or missing X-Transcription-Key header')
		},
		examples=[
			OpenApiExample(
				'Partial Transcript',
				value={
					'event': 'partial_transcript',
					'text': 'I have been feeling anxious lately',
					'speaker_type': 'patient',
					'start_time': 12.4,
					'end_time': 15.8,
					'confidence': 0.92,
					'emotion': {'primary_emotion': 'anxious', 'valence': -0.4, 'arousal': 0.7, 'confidence': 0.81}
				}
			),
			OpenApiExample(
				'Mood Snapshot',
				value={
					'event': 'mood_snapshot',
					'mood_label': 'calmer',
					'mood_score': 0.65,
					'valence': 0.1,
					'arousal': 0.3
				}
			),
			OpenApiExample('Close', value={'event': 'close'})
		]
	)
	def post(self, request, session_id: str):
		# Verify webhook authentication
		if not verify_webhook_auth(request):
			return Response({'detail': 'Unauthorized. Invalid or missing X-Transcription-Key header.'}, status=401)
		
		session = get_object_or_404(Session, id=session_id)
		payload = request.data
		event_type = payload.get('event')
		if event_type == 'partial_transcript':
			transcription_service.ingest_partial_transcript(session, payload)
		elif event_type == 'final_transcript':
			transcription_service.ingest_partial_transcript(session, payload)
		elif event_type == 'mood_snapshot':
			transcription_service.ingest_mood_snapshot(session, payload)
		elif event_type == 'close':
			transcription_service.close_realtime(session)
		return Response({'detail': 'ok'})


class CloseRealtimeTranscriptionView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['Transcription'],
		summary='Close realtime transcription',
		description='Closes active realtime session and triggers insight generation (SOAP handled separately).',
		responses={200: CloseRealtimeTranscriptionResponseSerializer},
		examples=[
			OpenApiExample('Close Response', value={'detail': 'Realtime transcription closed & insights generated (SOAP handled separately)'})
		]
	)
	def post(self, request, session_id: str):
		session = get_object_or_404(Session, id=session_id)
		if request.user != session.therapist:
			return Response({'detail': 'Only therapist can close transcription.'}, status=403)
		transcription_service.close_realtime(session)
		transcription_service.generate_session_insights(session)
		return Response({'detail': 'Realtime transcription closed & insights generated (SOAP handled separately)'})


# =============================================================================
# DUMMY TRANSCRIPTION SIMULATION
# =============================================================================

# Dummy transcription data for 5 minutes (30 segments at 10-second intervals)
DUMMY_TRANSCRIPTION_DATA = [
    # 0:00 - 0:50 (Introduction)
    {"time": 0, "speaker": "therapist", "text": "Good morning! How are you feeling today?", "emotion": "warm", "valence": 0.4, "arousal": 0.3},
    {"time": 10, "speaker": "patient", "text": "I'm okay, I guess. It's been a rough week.", "emotion": "tired", "valence": -0.2, "arousal": 0.2},
    {"time": 20, "speaker": "therapist", "text": "I'm sorry to hear that. Would you like to tell me what happened?", "emotion": "empathetic", "valence": 0.3, "arousal": 0.3},
    {"time": 30, "speaker": "patient", "text": "Work has been really stressful. There's this project deadline coming up and I can't seem to focus.", "emotion": "anxious", "valence": -0.4, "arousal": 0.6},
    {"time": 40, "speaker": "therapist", "text": "That sounds overwhelming. When you say you can't focus, what does that look like for you?", "emotion": "curious", "valence": 0.2, "arousal": 0.4},
    {"time": 50, "speaker": "patient", "text": "I sit at my desk and my mind just wanders. I keep thinking about all the things that could go wrong.", "emotion": "worried", "valence": -0.5, "arousal": 0.7},
    
    # 1:00 - 1:50 (Exploring the issue)
    {"time": 60, "speaker": "therapist", "text": "I see. So you're experiencing racing thoughts about potential negative outcomes. Is that right?", "emotion": "understanding", "valence": 0.2, "arousal": 0.3},
    {"time": 70, "speaker": "patient", "text": "Yes, exactly. I keep imagining presenting the project and everyone just... criticizing it.", "emotion": "fearful", "valence": -0.6, "arousal": 0.7},
    {"time": 80, "speaker": "therapist", "text": "That fear of judgment can be really powerful. Have you experienced this kind of anxiety before presentations in the past?", "emotion": "supportive", "valence": 0.3, "arousal": 0.3},
    {"time": 90, "speaker": "patient", "text": "Yes, but usually it goes away once I actually start presenting. The anticipation is the worst part.", "emotion": "reflective", "valence": -0.1, "arousal": 0.4},
    {"time": 100, "speaker": "therapist", "text": "That's an important insight. So the anxiety is most intense before the event, not during?", "emotion": "encouraging", "valence": 0.4, "arousal": 0.4},
    {"time": 110, "speaker": "patient", "text": "Yeah, I suppose so. I never really thought about it that way.", "emotion": "thoughtful", "valence": 0.1, "arousal": 0.3},
    
    # 2:00 - 2:50 (Working on strategies)
    {"time": 120, "speaker": "therapist", "text": "Let's try something. What evidence do you have from past presentations that things went well?", "emotion": "guiding", "valence": 0.3, "arousal": 0.4},
    {"time": 130, "speaker": "patient", "text": "Well... my last project review actually got good feedback. My manager said it was thorough.", "emotion": "surprised", "valence": 0.3, "arousal": 0.4},
    {"time": 140, "speaker": "therapist", "text": "That's great! So there's evidence that you're capable of delivering quality work. What else?", "emotion": "positive", "valence": 0.5, "arousal": 0.5},
    {"time": 150, "speaker": "patient", "text": "I guess... people usually seem engaged when I present. They ask questions.", "emotion": "hopeful", "valence": 0.3, "arousal": 0.4},
    {"time": 160, "speaker": "therapist", "text": "Questions can actually be a sign that people are interested in what you're saying. How does it feel to remember these positive experiences?", "emotion": "warm", "valence": 0.4, "arousal": 0.3},
    {"time": 170, "speaker": "patient", "text": "It feels... a little better actually. I forgot about those moments when I was spiraling.", "emotion": "relieved", "valence": 0.4, "arousal": 0.3},
    
    # 3:00 - 3:50 (Coping techniques)
    {"time": 180, "speaker": "therapist", "text": "That's very common. Anxiety often makes us forget our past successes. Would you like to try a grounding exercise?", "emotion": "caring", "valence": 0.4, "arousal": 0.3},
    {"time": 190, "speaker": "patient", "text": "Sure, I'll try anything at this point.", "emotion": "open", "valence": 0.2, "arousal": 0.3},
    {"time": 200, "speaker": "therapist", "text": "Let's do a simple breathing exercise. Breathe in for four counts... hold for four... and out for four.", "emotion": "calm", "valence": 0.3, "arousal": 0.2},
    {"time": 210, "speaker": "patient", "text": "Okay... I'm doing it. It's hard to slow down my breathing.", "emotion": "focused", "valence": 0.0, "arousal": 0.4},
    {"time": 220, "speaker": "therapist", "text": "That's okay, it takes practice. Just keep going at your own pace. Notice how your body feels.", "emotion": "patient", "valence": 0.3, "arousal": 0.2},
    {"time": 230, "speaker": "patient", "text": "I feel... my shoulders dropping a bit. I didn't realize I was holding so much tension.", "emotion": "aware", "valence": 0.2, "arousal": 0.3},
    
    # 4:00 - 4:50 (Wrapping up)
    {"time": 240, "speaker": "therapist", "text": "That's wonderful awareness. This is something you can do before your presentation too. Even a minute of breathing can help.", "emotion": "encouraging", "valence": 0.5, "arousal": 0.4},
    {"time": 250, "speaker": "patient", "text": "I'll try that. And maybe I'll remind myself of those positive reviews too.", "emotion": "determined", "valence": 0.4, "arousal": 0.4},
    {"time": 260, "speaker": "therapist", "text": "That's a great plan. You're taking active steps to manage your anxiety. I'm proud of your progress.", "emotion": "proud", "valence": 0.6, "arousal": 0.4},
    {"time": 270, "speaker": "patient", "text": "Thank you. I feel a lot better than when I came in. Still nervous, but more manageable.", "emotion": "grateful", "valence": 0.5, "arousal": 0.3},
    {"time": 280, "speaker": "therapist", "text": "That's all we can ask for - manageable anxiety. It's part of being human. Shall we schedule a follow-up for after your presentation?", "emotion": "supportive", "valence": 0.4, "arousal": 0.3},
    {"time": 290, "speaker": "patient", "text": "Yes, I'd like that. It would be good to debrief either way.", "emotion": "calm", "valence": 0.4, "arousal": 0.2},
]


class DummyTranscriptionSimulator:
    """Simulates real-time transcription by sending dummy data at intervals."""
    
    def __init__(self, session_id: str, callback_url: str = None):
        self.session_id = session_id
        self.callback_url = callback_url
        self._stop_event = threading.Event()
        self._thread = None
    
    def start(self):
        """Start the simulation in a background thread."""
        self._thread = threading.Thread(target=self._run_simulation, daemon=True)
        self._thread.start()
    
    def stop(self):
        """Stop the simulation."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=2)
    
    def _run_simulation(self):
        """Run the 5-minute simulation."""
        import requests as req
        
        try:
            session = Session.objects.get(id=self.session_id)
        except Session.DoesNotExist:
            return
        
        for i, segment in enumerate(DUMMY_TRANSCRIPTION_DATA):
            if self._stop_event.is_set():
                break
            
            # Calculate timing
            current_time = segment["time"]
            
            # Build payload
            payload = {
                "event": "partial_transcript",
                "text": segment["text"],
                "speaker_type": segment["speaker"],
                "start_time": float(current_time),
                "end_time": float(current_time + 9),
                "confidence": 0.95,
                "language": "en",
                "emotion": {
                    "primary_emotion": segment["emotion"],
                    "valence": segment["valence"],
                    "arousal": segment["arousal"],
                    "confidence": 0.85
                }
            }
            
            # Ingest directly instead of making HTTP call
            transcription_service.ingest_partial_transcript(session, payload)
            
            # Also send mood snapshot every 30 seconds
            if current_time % 30 == 0:
                mood_payload = {
                    "event": "mood_snapshot",
                    "mood_label": segment["emotion"],
                    "mood_score": (segment["valence"] + 1) / 2,  # Convert -1,1 to 0,1
                    "valence": segment["valence"],
                    "arousal": segment["arousal"],
                    "confidence": 0.8
                }
                transcription_service.ingest_mood_snapshot(session, mood_payload)
            
            # Wait 10 seconds before next segment
            time.sleep(10)
        
        # Send close event at the end
        transcription_service.close_realtime(session)


# Active simulations tracking
_active_simulations: dict[str, DummyTranscriptionSimulator] = {}


class StartDummyTranscriptionView(views.APIView):
    """Start a dummy transcription simulation for testing."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Transcription'],
        summary='Start dummy transcription simulation',
        description='Starts a 5-minute dummy transcription simulation that sends realistic therapy session transcripts at 10-second intervals. Useful for testing and development.',
        responses={
            200: OpenApiResponse(description='Dummy transcription started'),
            400: OpenApiResponse(description='Simulation already running or invalid session'),
            403: OpenApiResponse(description='Only therapist can start transcription')
        },
        examples=[
            OpenApiExample(
                'Start Dummy Response',
                value={
                    'detail': 'Dummy transcription simulation started',
                    'session_id': '123e4567-e89b-12d3-a456-426614174000',
                    'duration_minutes': 5,
                    'interval_seconds': 10,
                    'total_segments': 30
                }
            )
        ]
    )
    def post(self, request, session_id: str):
        session = get_object_or_404(Session, id=session_id)
        
        if request.user != session.therapist:
            return Response({'detail': 'Only therapist can start transcription.'}, status=403)
        
        # Check if already running
        if session_id in _active_simulations:
            return Response({
                'detail': 'Dummy transcription simulation is already running for this session.'
            }, status=400)
        
        # Initialize realtime transcription session
        try:
            result = transcription_service.start_realtime_for_session(session)
        except Exception as e:
            return Response({'detail': f'Failed to initialize transcription: {str(e)}'}, status=400)
        
        # Start the simulation
        simulator = DummyTranscriptionSimulator(session_id)
        _active_simulations[session_id] = simulator
        simulator.start()
        
        return Response({
            'detail': 'Dummy transcription simulation started',
            'session_id': str(session.id),
            'realtime_id': str(result.realtime.id),
            'duration_minutes': 5,
            'interval_seconds': 10,
            'total_segments': len(DUMMY_TRANSCRIPTION_DATA),
            'status': 'running'
        })


class StopDummyTranscriptionView(views.APIView):
    """Stop a running dummy transcription simulation."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Transcription'],
        summary='Stop dummy transcription simulation',
        description='Stops an active dummy transcription simulation.',
        responses={
            200: OpenApiResponse(description='Dummy transcription stopped'),
            404: OpenApiResponse(description='No active simulation found'),
            403: OpenApiResponse(description='Only therapist can stop transcription')
        }
    )
    def post(self, request, session_id: str):
        session = get_object_or_404(Session, id=session_id)
        
        if request.user != session.therapist:
            return Response({'detail': 'Only therapist can stop transcription.'}, status=403)
        
        if session_id not in _active_simulations:
            return Response({
                'detail': 'No active dummy transcription simulation found for this session.'
            }, status=404)
        
        simulator = _active_simulations.pop(session_id)
        simulator.stop()
        
        # Also close the realtime transcription
        transcription_service.close_realtime(session)
        
        return Response({
            'detail': 'Dummy transcription simulation stopped',
            'session_id': str(session.id)
        })

