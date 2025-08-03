# apps/therapy_sessions/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()

class Session(models.Model):
    SESSION_STATUS = [
        ('REQUESTED', 'Requested'),
        ('UPCOMING', 'Upcoming'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('RESCHEDULED', 'Rescheduled'),
        ('NO_SHOW', 'No Show'),
    ]
    
    SESSION_TYPES = [
        ('individual', 'Individual'),
        ('group', 'Group'),
        ('family', 'Family'),
        ('couples', 'Couples'),
        ('assessment', 'Assessment'),
        ('follow_up', 'Follow-up'),
    ]
    
    MOOD_RATINGS = [
        (1, 'Very Poor'),
        (2, 'Poor'),
        (3, 'Below Average'),
        (4, 'Fair'),
        (5, 'Average'),
        (6, 'Good'),
        (7, 'Very Good'),
        (8, 'Great'),
        (9, 'Excellent'),
        (10, 'Outstanding'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core session details
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_sessions', 
                               null=True, blank=True, help_text="Patient (optional for quick sessions)")
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='therapist_sessions')
    session_number = models.PositiveIntegerField(null=True, blank=True, 
                                               help_text="Sequential session number for this patient")
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='individual')
    
    # Quick session support
    is_quick_session = models.BooleanField(default=False, help_text="True if this is a quick session without assigned patient")
    quick_session_patient_name = models.CharField(max_length=200, blank=True, null=True, 
                                                 help_text="Patient name for quick sessions")
    
    # Integration fields
    transcription_id = models.UUIDField(null=True, blank=True, 
                                       help_text="ID linking to transcription record")
    
    # AI Analysis fields (to be populated by transcription app)
    ai_mood_analysis = models.JSONField(null=True, blank=True, 
                                       help_text="AI-generated mood analysis")
    ai_key_topics = models.JSONField(null=True, blank=True, 
                                    help_text="AI-identified key topics")
    ai_sentiment_score = models.FloatField(null=True, blank=True, 
                                          help_text="AI sentiment analysis score")
    ai_recommendations = models.TextField(null=True, blank=True, 
                                         help_text="AI-generated recommendations")
    
    # Scheduling
    scheduled_date = models.DateTimeField()
    actual_start_time = models.DateTimeField(blank=True, null=True)
    actual_end_time = models.DateTimeField(blank=True, null=True)
    duration_minutes = models.IntegerField(default=60)
    
    # Status and location
    status = models.CharField(max_length=20, choices=SESSION_STATUS, default='UPCOMING')
    location = models.CharField(max_length=200, blank=True, null=True, help_text="Session location or platform")
    is_online = models.BooleanField(default=False)
    
    # Session content
    session_notes = models.TextField(blank=True, null=True, help_text="Therapist's session notes")
    patient_goals = models.TextField(blank=True, null=True, help_text="Goals discussed in session")
    homework_assigned = models.TextField(blank=True, null=True, help_text="Homework or tasks assigned")
    next_session_goals = models.TextField(blank=True, null=True, help_text="Goals for next session")
    
    # Assessments and ratings
    patient_mood_before = models.IntegerField(
        choices=MOOD_RATINGS, blank=True, null=True,
        help_text="Patient's mood rating before session (1-10)"
    )
    patient_mood_after = models.IntegerField(
        choices=MOOD_RATINGS, blank=True, null=True,
        help_text="Patient's mood rating after session (1-10)"
    )
    therapist_observations = models.TextField(blank=True, null=True)
    session_effectiveness = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        blank=True, null=True,
        help_text="Therapist's rating of session effectiveness (1-10)"
    )
    
    # Consent and permissions
    consent_recording = models.BooleanField(default=False, help_text="Patient consented to recording")
    consent_ai_analysis = models.BooleanField(default=False, help_text="Patient consented to AI analysis")
    
    # WebSocket connection fields
    websocket_room_id = models.UUIDField(default=uuid.uuid4, unique=True, help_text="Unique room ID for WebSocket connection")
    websocket_active = models.BooleanField(default=False, help_text="Whether WebSocket connection is active")
    
    # Billing and administrative
    fee_charged = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('waived', 'Waived'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                 related_name='created_sessions')
    
    def save(self, *args, **kwargs):
        # Auto-generate session number if not provided and patient exists
        if not self.session_number and self.patient:
            last_session = Session.objects.filter(
                patient=self.patient,
                therapist=self.therapist
            ).order_by('-session_number').first()
            
            self.session_number = (last_session.session_number + 1) if last_session else 1
        
        super().save(*args, **kwargs)
    
    def assign_patient(self, patient):
        """Assign a patient to a quick session"""
        if self.is_quick_session:
            self.patient = patient
            self.is_quick_session = False
            self.quick_session_patient_name = None
            
            # Generate session number
            last_session = Session.objects.filter(
                patient=patient,
                therapist=self.therapist
            ).order_by('-session_number').first()
            
            self.session_number = (last_session.session_number + 1) if last_session else 1
            self.save()
    
    @property
    def actual_duration_minutes(self):
        """Calculate actual session duration if start and end times are recorded"""
        if self.actual_start_time and self.actual_end_time:
            duration = self.actual_end_time - self.actual_start_time
            return int(duration.total_seconds() / 60)
        return None
    
    @property
    def is_overdue(self):
        """Check if scheduled session is overdue"""
        if self.status == 'scheduled' and self.scheduled_date:
            return timezone.now() > self.scheduled_date
        return False
    
    @property
    def mood_improvement(self):
        """Calculate mood improvement during session"""
        if self.patient_mood_before and self.patient_mood_after:
            return self.patient_mood_after - self.patient_mood_before
        return None
    
    def start_session(self):
        """Mark session as started"""
        self.status = 'IN_PROGRESS'
        self.actual_start_time = timezone.now()
        self.save()
    
    def end_session(self):
        """Mark session as completed"""
        self.status = 'COMPLETED'
        self.actual_end_time = timezone.now()
        self.save()
    
    def cancel_session(self, reason=None):
        """Cancel the session"""
        self.status = 'CANCELLED'
        if reason:
            self.session_notes = f"Cancelled: {reason}\n\n{self.session_notes or ''}"
        self.save()
    
    def reschedule_session(self, new_date, reason=None):
        """Reschedule the session"""
        self.status = 'RESCHEDULED'
        self.scheduled_date = new_date
        if reason:
            self.session_notes = f"Rescheduled: {reason}\n\n{self.session_notes or ''}"
        self.save()
    
    def __str__(self):
        return f"Session {self.session_number} - {self.patient.full_name} with {self.therapist.full_name}"
    
    class Meta:
        db_table = 'sessions'
        ordering = ['-scheduled_date']
        unique_together = ['patient', 'therapist', 'session_number']
        indexes = [
            models.Index(fields=['therapist', 'scheduled_date'], name='therapist_date_idx'),
            models.Index(fields=['patient', 'scheduled_date'], name='patient_date_idx'),
            models.Index(fields=['status', 'scheduled_date'], name='status_date_idx'),
            models.Index(fields=['is_quick_session'], name='quick_session_idx'),
            models.Index(fields=['transcription_id'], name='transcription_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(duration_minutes__gte=15),
                name='min_duration'
            ),
            models.CheckConstraint(
                check=models.Q(duration_minutes__lte=480),  # 8 hours max
                name='max_duration'
            ),
            models.CheckConstraint(
                check=models.Q(patient_mood_before__gte=1, patient_mood_before__lte=10) | models.Q(patient_mood_before__isnull=True),
                name='valid_mood_before'
            ),
            models.CheckConstraint(
                check=models.Q(patient_mood_after__gte=1, patient_mood_after__lte=10) | models.Q(patient_mood_after__isnull=True),
                name='valid_mood_after'
            ),
            models.CheckConstraint(
                check=models.Q(session_effectiveness__gte=1, session_effectiveness__lte=10) | models.Q(session_effectiveness__isnull=True),
                name='valid_effectiveness'
            ),
            # Ensure quick sessions have patient name or regular sessions have patient
            models.CheckConstraint(
                check=(
                    models.Q(is_quick_session=True, quick_session_patient_name__isnull=False) |
                    models.Q(is_quick_session=False, patient__isnull=False)
                ),
                name='patient_or_quick_name'
            ),
        ]

class SessionQRCode(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='qr_code')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'session_qr_codes'

class SessionAudio(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='audio_files')
    file_path = models.FileField(upload_to='session_audio/')
    file_size = models.BigIntegerField()
    duration_seconds = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_processed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'session_audio'

class SessionInsight(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='insights')
    overall_mood = models.CharField(max_length=50, blank=True, null=True)
    mood_score = models.FloatField(blank=True, null=True)  # 0-10 scale
    key_themes = models.JSONField(default=list)
    emotional_patterns = models.JSONField(default=dict)
    recommendations = models.TextField(blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'session_insights'


class SessionTemplate(models.Model):
    """Template for recurring sessions"""
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='therapist_session_templates')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_session_templates')
    
    name = models.CharField(max_length=200, help_text="Template name")
    session_type = models.CharField(max_length=20, choices=Session.SESSION_TYPES, default='individual')
    duration_minutes = models.IntegerField(default=60)
    location = models.CharField(max_length=200, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    
    # Recurrence settings
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('monthly', 'Monthly'),
    ], blank=True, null=True)
    
    # Default session content
    default_goals = models.TextField(blank=True, null=True)
    default_notes_template = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'session_templates'
        unique_together = ['therapist', 'patient', 'name']


class PatientProgress(models.Model):
    """Track patient progress over time"""
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_records')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_progress_records')
    
    # Progress metrics
    overall_progress_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Overall progress rating (1-10)"
    )
    mood_trend = models.CharField(max_length=20, choices=[
        ('improving', 'Improving'),
        ('stable', 'Stable'),
        ('declining', 'Declining'),
        ('fluctuating', 'Fluctuating'),
    ])
    
    # Goals and achievements
    goals_achieved = models.TextField(blank=True, null=True)
    current_challenges = models.TextField(blank=True, null=True)
    next_milestones = models.TextField(blank=True, null=True)
    
    # Assessment period
    assessment_date = models.DateField()
    sessions_completed = models.IntegerField(default=0)
    
    # Notes
    therapist_notes = models.TextField(blank=True, null=True)
    patient_feedback = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_progress'
        ordering = ['-assessment_date']


class SessionReminder(models.Model):
    """Reminders for upcoming sessions"""
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='reminders')
    
    reminder_type = models.CharField(max_length=20, choices=[
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('call', 'Phone Call'),
    ])
    
    # Timing
    send_at = models.DateTimeField(help_text="When to send the reminder")
    hours_before = models.IntegerField(help_text="Hours before session to send reminder")
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(blank=True, null=True)
    delivery_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ], default='pending')
    
    # Content
    custom_message = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'session_reminders'


class TherapistAvailability(models.Model):
    """Therapist availability slots"""
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_slots')
    
    # Time slot
    day_of_week = models.IntegerField(choices=[
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Availability settings
    is_available = models.BooleanField(default=True)
    max_sessions = models.IntegerField(default=1, help_text="Maximum sessions in this slot")
    session_duration = models.IntegerField(default=60, help_text="Default session duration in minutes")
    
    # Date range (optional - for temporary availability changes)
    effective_from = models.DateField(blank=True, null=True)
    effective_until = models.DateField(blank=True, null=True)
    
    # Location
    location = models.CharField(max_length=200, blank=True, null=True)
    is_online_available = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'therapist_availability'
        unique_together = ['therapist', 'day_of_week', 'start_time', 'end_time']






