"""Transcription related API endpoints.

These endpoints are intentionally minimal; therapy session start/end will call
into the service layer. Frontend clients can use the init endpoint to fetch a
websocket URL if direct connection is permitted, otherwise they proxy via
server infrastructure.
"""

from rest_framework import permissions, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from typing import Any

from therapy_sessions.models import Session
from .services import transcription_service


class StartRealtimeTranscriptionView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

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
	authentication_classes: list[Any] = []  # You may want a custom auth token separate from user auth
	permission_classes: list[Any] = []

	def post(self, request, session_id: str):
		# Expect events from OpenAI (or proxy); verify signature if configured
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

	def post(self, request, session_id: str):
		session = get_object_or_404(Session, id=session_id)
		if request.user != session.therapist:
			return Response({'detail': 'Only therapist can close transcription.'}, status=403)
		transcription_service.close_realtime(session)
		# Generate lightweight insights only (SOAP handled in soap app)
		transcription_service.generate_session_insights(session)
		return Response({'detail': 'Realtime transcription closed & insights generated (SOAP handled separately)'})


class BatchSoapNoteGenerationView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

	class InputSerializer:
		pass  # Using raw request.data for brevity; can formalize with DRF Serializer if desired

