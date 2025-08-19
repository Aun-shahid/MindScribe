"""Models supporting session transcription, realtime AI analysis.

This module extends the initial basic transcription data structures with:
 - RealtimeTranscriptionSession: lifecycle + connection metadata for a live
     GPT Realtime / Whisper powered stream.
 - SOAP notes have been moved to the dedicated 'soap' app to avoid duplication
     and keep responsibilities separated.

All heavy AI logic is orchestrated in services.py; models here are deliberately
small and auditable.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class Transcription(models.Model):
    PROCESSING_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # NOTE: Correct app label is 'therapy_sessions.Session'
    session = models.OneToOneField('therapy_sessions.Session', on_delete=models.CASCADE, related_name='transcription')
    status = models.CharField(max_length=20, choices=PROCESSING_STATUS, default='pending')
    language_detected = models.CharField(max_length=10, blank=True, null=True)
    processing_started_at = models.DateTimeField(blank=True, null=True)
    processing_completed_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'transcriptions'

class TranscriptionSegment(models.Model):
    SPEAKER_TYPES = [
        ('patient', 'Patient'),
        ('therapist', 'Therapist'),
        ('unknown', 'Unknown'),
    ]
    
    transcription = models.ForeignKey(Transcription, on_delete=models.CASCADE, related_name='segments')
    speaker_type = models.CharField(max_length=20, choices=SPEAKER_TYPES)
    speaker_id = models.CharField(max_length=50, blank=True, null=True)  # For speaker diarization
    text = models.TextField()
    start_time = models.FloatField()  # in seconds
    end_time = models.FloatField()  # in seconds
    confidence_score = models.FloatField(blank=True, null=True)
    language = models.CharField(max_length=10, blank=True, null=True)
    
    class Meta:
        db_table = 'transcription_segments'
        ordering = ['start_time']

class EmotionAnalysis(models.Model):
    segment = models.OneToOneField(TranscriptionSegment, on_delete=models.CASCADE, related_name='emotion')
    primary_emotion = models.CharField(max_length=50)
    emotion_scores = models.JSONField(default=dict)  # {'happy': 0.8, 'sad': 0.2, etc.}
    valence = models.FloatField()  # -1 to 1 (negative to positive)
    arousal = models.FloatField()  # 0 to 1 (calm to excited)
    confidence = models.FloatField()
    
    class Meta:
        db_table = 'emotion_analysis'


class RealtimeTranscriptionSession(models.Model):
    """Metadata for an active realtime AI transcription / analysis stream.

    A record is created when a therapist starts a session (given required
    consents). It stores connection info and is closed when the session ends.
    """

    STATUS_CHOICES = [
        ("initializing", "Initializing"),
        ("active", "Active"),
        ("closing", "Closing"),
        ("closed", "Closed"),
        ("error", "Error"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField('therapy_sessions.Session', on_delete=models.CASCADE, related_name='realtime_transcription')
    transcription = models.ForeignKey(Transcription, on_delete=models.SET_NULL, null=True, blank=True, related_name='realtime_session')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initializing')
    openai_connection_id = models.CharField(max_length=100, blank=True, null=True)
    websocket_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL the client can connect to (ephemeral or proxied)")
    started_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    last_event_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'realtime_transcription_sessions'

    def mark_active(self):
        if self.status == 'initializing':
            self.status = 'active'
            self.activated_at = timezone.now()
            self.save(update_fields=['status', 'activated_at'])

    def mark_closed(self):
        if self.status in ['active', 'closing', 'initializing']:
            self.status = 'closed'
            self.closed_at = timezone.now()
            self.save(update_fields=['status', 'closed_at'])

    def mark_error(self, message: str):
        self.status = 'error'
        self.error_message = message
        self.closed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'closed_at'])



class MoodSnapshot(models.Model):
    """Realtime mood / affect snapshot pushed from webhook during a session.

    Allows near-realtime visualization of patient affect over session timeline.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey('therapy_sessions.Session', on_delete=models.CASCADE, related_name='mood_snapshots')
    captured_at = models.DateTimeField(auto_now_add=True)
    relative_seconds = models.FloatField(help_text="Seconds from session start when captured", blank=True, null=True)
    mood_label = models.CharField(max_length=50, help_text="Primary mood label e.g. anxious, calm")
    mood_score = models.FloatField(blank=True, null=True, help_text="0-1 normalized mood intensity or positivity")
    valence = models.FloatField(blank=True, null=True, help_text="-1 negative to +1 positive")
    arousal = models.FloatField(blank=True, null=True, help_text="0 calm to 1 excited")
    confidence = models.FloatField(blank=True, null=True)
    source = models.CharField(max_length=30, default='ai')
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'mood_snapshots'
        ordering = ['captured_at']
