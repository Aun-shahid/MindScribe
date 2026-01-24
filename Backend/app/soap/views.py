"""SOAP note generation & management endpoints."""
from rest_framework import views, permissions, status, serializers, generics
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from typing import List
import os
import logging
import json

from .models import SOAPNote, SOAPNoteVersion, SOAPTemplate
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse, OpenApiParameter
from therapy_sessions.models import Session

logger = logging.getLogger(__name__)

try:
	import requests
except ImportError:  # pragma: no cover
	requests = None  # type: ignore

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
SOAP_MODEL = os.getenv("OPENAI_SOAP_MODEL", "gpt-4o-mini")


class BatchSOAPRequestSerializer(serializers.Serializer):
	session_ids = serializers.ListField(
		child=serializers.UUIDField(),
		help_text='List of session UUIDs to generate/update SOAP notes for'
	)


class BatchSOAPResponseSerializer(serializers.Serializer):
	detail = serializers.CharField()
	results = serializers.DictField(child=serializers.CharField())


class SOAPNoteSerializer(serializers.Serializer):
	id = serializers.UUIDField()
	patient = serializers.UUIDField()
	therapist = serializers.UUIDField()
	sessions = serializers.ListField(child=serializers.UUIDField())
	subjective = serializers.CharField(allow_null=True)
	objective = serializers.CharField(allow_null=True)
	assessment = serializers.CharField(allow_null=True)
	plan = serializers.CharField(allow_null=True)
	status = serializers.CharField()
	created_at = serializers.DateTimeField()
	updated_at = serializers.DateTimeField()


class BatchSOAPGenerationView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['SOAP'],
		summary='Batch generate or update SOAP notes',
		description='Generates or updates SOAP notes for the provided session IDs using existing transcripts.',
		request=BatchSOAPRequestSerializer,
		responses={200: BatchSOAPResponseSerializer},
		examples=[
			OpenApiExample(
				'Batch Request',
				value={'session_ids': ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000']}
			),
			OpenApiExample(
				'Batch Response',
				value={'detail': 'batch processed', 'results': {'123e...4000': 'ok', '223e...4000': 'skipped:no patient'}}
			)
		]
	)
	def post(self, request):
		serializer = BatchSOAPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		session_ids: List[str] = serializer.validated_data['session_ids']
		results = {}
		for sid in session_ids:
			try:
				session = Session.objects.get(id=sid)
				if session.patient is None:
					results[str(sid)] = 'skipped:no patient'
					continue
				note = self._generate_or_update_soap(session)
				results[str(sid)] = 'ok' if note else 'skipped'
			except Exception as e:  # pragma: no cover
				logger.exception("SOAP batch error for %s", sid)
				results[str(sid)] = f'error:{e}'
		return Response({'detail': 'batch processed', 'results': results})

	def _generate_or_update_soap(self, session: Session) -> SOAPNote | None:
		# Gather transcript text (if exists)
		try:
			transcription = session.transcription
			segments = transcription.segments.order_by('start_time')
			joined_text = "\n".join(s.text for s in segments)
		except Exception:
			joined_text = ''
		if not joined_text.strip():
			return None
		if not OPENAI_API_KEY or not requests:
			logger.warning('SOAP generation skipped: missing API key or requests')
			return None
		prompt = (
			"Create a structured SOAP note (JSON) summarizing these therapy session transcripts. "
			"Keys: subjective, objective, assessment, plan. Keep each concise.\n" + joined_text[:6000]
		)
		resp = requests.post(
			'https://api.openai.com/v1/chat/completions',
			headers={'Authorization': f'Bearer {OPENAI_API_KEY}', 'Content-Type': 'application/json'},
			json={
				'model': SOAP_MODEL,
				'messages': [
					{'role': 'system', 'content': 'Return ONLY valid JSON.'},
					{'role': 'user', 'content': prompt},
				],
				'temperature': 0.4,
			},
			timeout=40,
		)
		if resp.status_code >= 300:
			logger.error('SOAP generation failed %s %s', resp.status_code, resp.text)
			return None
		content = resp.json()['choices'][0]['message']['content']
		try:
			parsed = json.loads(content)
		except Exception:
			parsed = {}
		note, created = SOAPNote.objects.get_or_create(
			therapist=session.therapist,
			patient=session.patient,
			status='draft'
		)
		# Link session
		note.sessions.add(session)
		# Versioning
		with transaction.atomic():
			version_number = note.versions.count() + 1
			SOAPNoteVersion.objects.create(
				soap_note=note,
				version_number=version_number,
				subjective=parsed.get('subjective'),
				objective=parsed.get('objective'),
				assessment=parsed.get('assessment'),
				plan=parsed.get('plan'),
				created_by=session.therapist,
				change_summary='Autogenerated from transcript',
			)
			# Update current fields
			note.subjective = parsed.get('subjective')
			note.objective = parsed.get('objective')
			note.assessment = parsed.get('assessment')
			note.plan = parsed.get('plan')
			note.updated_at = timezone.now()
			note.save()
		return note


class SOAPNoteDetailView(views.APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['SOAP'],
		summary='Retrieve a SOAP note',
		responses={200: SOAPNoteSerializer},
		examples=[
			OpenApiExample(
				'SOAP Note',
				value={
					'id': '323e4567-e89b-12d3-a456-426614174000',
					'patient': '123e4567-e89b-12d3-a456-426614174000',
					'therapist': '223e4567-e89b-12d3-a456-426614174000',
					'sessions': ['423e4567-e89b-12d3-a456-426614174000'],
					'subjective': 'Patient reports reduced anxiety.',
					'objective': 'Calmer affect, normal speech.',
					'assessment': 'Generalized anxiety improving.',
					'plan': 'Continue CBT and breathing exercises.',
					'status': 'draft',
					'created_at': '2025-08-19T10:00:00Z',
					'updated_at': '2025-08-19T10:05:00Z'
				}
			)
		]
	)
	def get(self, request, note_id: str):
		note = get_object_or_404(SOAPNote, id=note_id)
		if request.user not in [note.therapist, note.patient]:
			return Response({'detail': 'Forbidden'}, status=403)
		return Response({
			'id': str(note.id),
			'patient': note.patient_id,
			'therapist': note.therapist_id,
			'sessions': [str(s.id) for s in note.sessions.all()],
			'subjective': note.subjective,
			'objective': note.objective,
			'assessment': note.assessment,
			'plan': note.plan,
			'status': note.status,
			'created_at': note.created_at,
			'updated_at': note.updated_at,
		})


# =========================================================
# Enhanced SOAP Note Endpoints
# =========================================================

class SOAPNoteListSerializer(serializers.Serializer):
	id = serializers.UUIDField()
	patient_id = serializers.UUIDField()
	patient_name = serializers.CharField()
	therapist_id = serializers.UUIDField()
	sessions = serializers.ListField(child=serializers.DictField())
	subjective = serializers.CharField(allow_null=True)
	objective = serializers.CharField(allow_null=True)
	assessment = serializers.CharField(allow_null=True)
	plan = serializers.CharField(allow_null=True)
	status = serializers.CharField()
	created_at = serializers.DateTimeField()
	updated_at = serializers.DateTimeField()


class SOAPNoteCreateSerializer(serializers.Serializer):
	session_id = serializers.UUIDField(required=False, help_text="Session to link the SOAP note to")
	patient_id = serializers.UUIDField(required=True, help_text="Patient UUID")
	subjective = serializers.CharField(required=False, allow_blank=True)
	objective = serializers.CharField(required=False, allow_blank=True)
	assessment = serializers.CharField(required=False, allow_blank=True)
	plan = serializers.CharField(required=False, allow_blank=True)
	status = serializers.ChoiceField(choices=['draft', 'completed', 'reviewed'], default='draft')


class SOAPNoteUpdateSerializer(serializers.Serializer):
	subjective = serializers.CharField(required=False, allow_blank=True)
	objective = serializers.CharField(required=False, allow_blank=True)
	assessment = serializers.CharField(required=False, allow_blank=True)
	plan = serializers.CharField(required=False, allow_blank=True)
	status = serializers.ChoiceField(choices=['draft', 'completed', 'reviewed', 'archived'], required=False)
	change_summary = serializers.CharField(required=False, allow_blank=True, help_text="Summary of changes for version history")


@extend_schema(
	tags=['SOAP'],
	summary="List all SOAP notes for therapist",
	description="Get a list of all SOAP notes created by the therapist, with optional filtering by patient or status.",
	parameters=[
		OpenApiParameter(name='patient_id', description='Filter by patient ID', required=False, type=str),
		OpenApiParameter(name='status', description='Filter by status: draft, completed, reviewed, archived', required=False, type=str),
		OpenApiParameter(name='limit', description='Limit number of results', required=False, type=int),
		OpenApiParameter(name='offset', description='Offset for pagination', required=False, type=int),
	],
	responses={200: SOAPNoteListSerializer(many=True)}
)
class SOAPNoteListView(views.APIView):
	"""List all SOAP notes for the therapist"""
	permission_classes = [permissions.IsAuthenticated]
	
	def get(self, request):
		user = request.user
		
		# Therapists see notes they created, patients see notes about them
		if user.user_type == 'therapist':
			queryset = SOAPNote.objects.filter(therapist=user)
		elif user.user_type == 'patient':
			queryset = SOAPNote.objects.filter(patient=user)
		else:
			return Response({'detail': 'Access denied.'}, status=403)
		
		# Apply filters
		patient_id = request.query_params.get('patient_id')
		if patient_id and user.user_type == 'therapist':
			queryset = queryset.filter(patient_id=patient_id)
		
		status_filter = request.query_params.get('status')
		if status_filter:
			queryset = queryset.filter(status=status_filter)
		
		# Pagination
		limit = int(request.query_params.get('limit', 50))
		offset = int(request.query_params.get('offset', 0))
		queryset = queryset.order_by('-created_at')[offset:offset + limit]
		
		notes_data = []
		for note in queryset:
			sessions_data = []
			for session in note.sessions.all():
				sessions_data.append({
					'id': str(session.id),
					'session_number': session.session_number,
					'scheduled_date': session.scheduled_date,
					'status': session.status,
				})
			
			notes_data.append({
				'id': str(note.id),
				'patient_id': str(note.patient_id),
				'patient_name': note.patient.full_name if note.patient else 'Unknown',
				'therapist_id': str(note.therapist_id),
				'sessions': sessions_data,
				'subjective': note.subjective,
				'objective': note.objective,
				'assessment': note.assessment,
				'plan': note.plan,
				'status': note.status,
				'created_at': note.created_at,
				'updated_at': note.updated_at,
			})
		
		return Response(notes_data)


@extend_schema(
	tags=['SOAP'],
	summary="Create a new SOAP note",
	description="Create a new SOAP note for a patient. Optionally link to a session.",
	request=SOAPNoteCreateSerializer,
	responses={
		201: SOAPNoteSerializer,
		400: OpenApiResponse(description='Validation error'),
		403: OpenApiResponse(description='Only therapists can create SOAP notes'),
	}
)
class SOAPNoteCreateView(views.APIView):
	"""Create a new SOAP note"""
	permission_classes = [permissions.IsAuthenticated]
	
	def post(self, request):
		user = request.user
		
		if user.user_type != 'therapist':
			return Response({'detail': 'Only therapists can create SOAP notes.'}, status=403)
		
		serializer = SOAPNoteCreateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		
		# Validate patient exists
		from django.contrib.auth import get_user_model
		User = get_user_model()
		try:
			patient = User.objects.get(id=data['patient_id'], user_type='patient')
		except User.DoesNotExist:
			return Response({'detail': 'Patient not found.'}, status=404)
		
		# Create the SOAP note
		with transaction.atomic():
			note = SOAPNote.objects.create(
				therapist=user,
				patient=patient,
				subjective=data.get('subjective', ''),
				objective=data.get('objective', ''),
				assessment=data.get('assessment', ''),
				plan=data.get('plan', ''),
				status=data.get('status', 'draft'),
			)
			
			# Link to session if provided
			if 'session_id' in data:
				try:
					session = Session.objects.get(id=data['session_id'], therapist=user)
					note.sessions.add(session)
				except Session.DoesNotExist:
					pass
			
			# Create initial version
			SOAPNoteVersion.objects.create(
				soap_note=note,
				version_number=1,
				subjective=note.subjective,
				objective=note.objective,
				assessment=note.assessment,
				plan=note.plan,
				created_by=user,
				change_summary='Initial creation',
			)
		
		return Response({
			'id': str(note.id),
			'patient': str(note.patient_id),
			'therapist': str(note.therapist_id),
			'sessions': [str(s.id) for s in note.sessions.all()],
			'subjective': note.subjective,
			'objective': note.objective,
			'assessment': note.assessment,
			'plan': note.plan,
			'status': note.status,
			'created_at': note.created_at,
			'updated_at': note.updated_at,
		}, status=201)


@extend_schema(
	tags=['SOAP'],
	summary="Update a SOAP note",
	description="Update an existing SOAP note. Creates a version for tracking changes.",
	request=SOAPNoteUpdateSerializer,
	responses={
		200: SOAPNoteSerializer,
		403: OpenApiResponse(description='Only the creating therapist can update SOAP notes'),
		404: OpenApiResponse(description='SOAP note not found'),
	}
)
class SOAPNoteUpdateView(views.APIView):
	"""Update an existing SOAP note"""
	permission_classes = [permissions.IsAuthenticated]
	
	def patch(self, request, note_id):
		user = request.user
		
		try:
			note = SOAPNote.objects.get(id=note_id)
		except SOAPNote.DoesNotExist:
			return Response({'detail': 'SOAP note not found.'}, status=404)
		
		if note.therapist != user:
			return Response({'detail': 'Only the creating therapist can update this SOAP note.'}, status=403)
		
		serializer = SOAPNoteUpdateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		
		with transaction.atomic():
			# Create version before updating
			version_number = note.versions.count() + 1
			SOAPNoteVersion.objects.create(
				soap_note=note,
				version_number=version_number,
				subjective=data.get('subjective', note.subjective),
				objective=data.get('objective', note.objective),
				assessment=data.get('assessment', note.assessment),
				plan=data.get('plan', note.plan),
				created_by=user,
				change_summary=data.get('change_summary', 'Manual update'),
			)
			
			# Update the note
			if 'subjective' in data:
				note.subjective = data['subjective']
			if 'objective' in data:
				note.objective = data['objective']
			if 'assessment' in data:
				note.assessment = data['assessment']
			if 'plan' in data:
				note.plan = data['plan']
			if 'status' in data:
				note.status = data['status']
				if data['status'] == 'completed':
					note.completed_at = timezone.now()
			
			note.save()
		
		return Response({
			'id': str(note.id),
			'patient': str(note.patient_id),
			'therapist': str(note.therapist_id),
			'sessions': [str(s.id) for s in note.sessions.all()],
			'subjective': note.subjective,
			'objective': note.objective,
			'assessment': note.assessment,
			'plan': note.plan,
			'status': note.status,
			'created_at': note.created_at,
			'updated_at': note.updated_at,
		})


@extend_schema(
	tags=['SOAP'],
	summary="Delete a SOAP note",
	description="Delete a SOAP note. Only the creating therapist can delete.",
	responses={
		204: OpenApiResponse(description='SOAP note deleted successfully'),
		403: OpenApiResponse(description='Only the creating therapist can delete'),
		404: OpenApiResponse(description='SOAP note not found'),
	}
)
class SOAPNoteDeleteView(views.APIView):
	"""Delete a SOAP note"""
	permission_classes = [permissions.IsAuthenticated]
	
	def delete(self, request, note_id):
		user = request.user
		
		try:
			note = SOAPNote.objects.get(id=note_id)
		except SOAPNote.DoesNotExist:
			return Response({'detail': 'SOAP note not found.'}, status=404)
		
		if note.therapist != user:
			return Response({'detail': 'Only the creating therapist can delete this SOAP note.'}, status=403)
		
		note.delete()
		return Response(status=204)


@extend_schema(
	tags=['SOAP'],
	summary="Get SOAP note for a specific session",
	description="Get the SOAP note linked to a specific session. Returns mock data if no note exists for frontend integration.",
	responses={
		200: SOAPNoteSerializer,
		403: OpenApiResponse(description='Access denied'),
		404: OpenApiResponse(description='Session not found'),
	}
)
class SessionSOAPNoteView(views.APIView):
	"""Get SOAP note for a specific session"""
	permission_classes = [permissions.IsAuthenticated]
	
	def get(self, request, session_id):
		user = request.user
		
		# Get the session
		try:
			if user.user_type == 'therapist':
				session = Session.objects.get(id=session_id, therapist=user)
			elif user.user_type == 'patient':
				session = Session.objects.get(id=session_id, patient=user)
			else:
				return Response({'detail': 'Access denied.'}, status=403)
		except Session.DoesNotExist:
			return Response({'detail': 'Session not found.'}, status=404)
		
		# Try to get linked SOAP note
		note = session.soap_notes.first()
		
		if note:
			return Response({
				'id': str(note.id),
				'patient': str(note.patient_id),
				'patient_name': note.patient.full_name if note.patient else 'Unknown',
				'therapist': str(note.therapist_id),
				'sessions': [str(s.id) for s in note.sessions.all()],
				'subjective': note.subjective,
				'objective': note.objective,
				'assessment': note.assessment,
				'plan': note.plan,
				'status': note.status,
				'created_at': note.created_at,
				'updated_at': note.updated_at,
				'is_mock_data': False,
			})
		else:
			# Return mock data for frontend integration
			return Response({
				'id': None,
				'session_id': str(session.id),
				'patient': str(session.patient.id) if session.patient else None,
				'patient_name': session.patient.full_name if session.patient else session.patient_name,
				'therapist': str(session.therapist.id),
				'sessions': [str(session.id)],
				'subjective': 'Patient reports feeling moderately anxious this week, particularly related to work deadlines. Sleep has been disrupted, averaging 5-6 hours per night. Reports some improvement in social interactions since last session.',
				'objective': 'Patient appeared alert and engaged during session. Made good eye contact. Speech was normal in rate and tone. Affect was congruent with mood. No signs of acute distress observed.',
				'assessment': 'Patient continues to show progress in managing anxiety symptoms. Work-related stress remains a primary concern. Sleep hygiene continues to be an area for improvement. Overall trajectory is positive with good engagement in therapeutic process.',
				'plan': '1. Continue weekly CBT sessions focusing on anxiety management\n2. Introduce sleep hygiene protocol\n3. Practice breathing exercises daily\n4. Review progress on coping strategies at next session\n5. Consider mindfulness meditation app recommendation',
				'status': 'pending',
				'created_at': None,
				'updated_at': None,
				'is_mock_data': True,
				'message': 'No SOAP note exists for this session yet. This is sample data for frontend integration.',
			})


@extend_schema(
	tags=['SOAP'],
	summary="Get SOAP note version history",
	description="Get version history for a SOAP note.",
	responses={200: OpenApiResponse(description='Version history')}
)
class SOAPNoteVersionsView(views.APIView):
	"""Get version history for a SOAP note"""
	permission_classes = [permissions.IsAuthenticated]
	
	def get(self, request, note_id):
		user = request.user
		
		try:
			note = SOAPNote.objects.get(id=note_id)
		except SOAPNote.DoesNotExist:
			return Response({'detail': 'SOAP note not found.'}, status=404)
		
		if user not in [note.therapist, note.patient]:
			return Response({'detail': 'Access denied.'}, status=403)
		
		versions = note.versions.order_by('-version_number')
		versions_data = []
		for v in versions:
			versions_data.append({
				'version_number': v.version_number,
				'subjective': v.subjective,
				'objective': v.objective,
				'assessment': v.assessment,
				'plan': v.plan,
				'created_by': v.created_by.full_name if v.created_by else 'Unknown',
				'created_at': v.created_at,
				'change_summary': v.change_summary,
			})
		
		return Response({
			'note_id': str(note.id),
			'current_version': note.versions.count(),
			'versions': versions_data,
		})
