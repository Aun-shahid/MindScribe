"""Transcription related API endpoints with OpenAPI documentation."""

from rest_framework import permissions, status, views, serializers
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from typing import Any
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from therapy_sessions.models import Session
from .services import transcription_service


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


@method_decorator(csrf_exempt, name='dispatch')
class RealtimeWebhookView(views.APIView):
	authentication_classes: list[Any] = []
	permission_classes: list[Any] = []

	@extend_schema(
		tags=['Transcription'],
		summary='Realtime transcription webhook',
		description='Receives streaming events (partial/final transcripts, mood snapshots, close).',
		request=RealtimeWebhookRequestSerializer,
		responses={200: OpenApiResponse(description='Event processed')},
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

