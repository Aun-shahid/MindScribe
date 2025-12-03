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
        ('EMERGENCY_REQUESTED', 'Emergency Requested'),
        ('UPCOMING', 'Upcoming'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('RESCHEDULED', 'Rescheduled'),
        ('NO_SHOW', 'No Show'),
        ('NEEDS_RESCHEDULING', 'Needs Rescheduling'),
    ]
    
    SESSION_TYPES = [
        ('individual', 'Individual'),
        ('group', 'Group'),
        ('family', 'Family'),
        ('couples', 'Couples'),
        ('assessment', 'Assessment'),
        ('follow_up', 'Follow-up'),
        ('emergency', 'Emergency'),
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
    
    # Core session details - patient is now required
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_sessions',
                               help_text="Patient for this session")
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='therapist_sessions')
    session_number = models.PositiveIntegerField(null=True, blank=True, 
                                               help_text="Sequential session number for this patient")
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='individual')
    
    # Recurring session support
    is_recurring = models.BooleanField(default=False, help_text="Is this part of a recurring series")
    recurring_weeks = models.PositiveIntegerField(null=True, blank=True, 
                                                 help_text="Number of weeks for recurring sessions")
    recurrence_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='recurring_instances',
                                         help_text="Parent session if this is a recurring instance")
    recurrence_index = models.PositiveIntegerField(null=True, blank=True,
                                                  help_text="Index in the recurring series (1, 2, 3...)")
    
    # Emergency session support
    is_emergency = models.BooleanField(default=False, help_text="Is this an emergency session request")
    emergency_reason = models.TextField(blank=True, null=True, help_text="Reason for emergency request")
    
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
    
    # Cancellation tracking
    cancellation_reason = models.TextField(blank=True, null=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='cancelled_sessions')
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
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
        if self.status == 'UPCOMING' and self.scheduled_date:
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
    
    def cancel_session(self, reason=None, cancelled_by_user=None):
        """Cancel the session"""
        self.status = 'CANCELLED'
        self.cancellation_reason = reason
        self.cancelled_by = cancelled_by_user
        self.cancelled_at = timezone.now()
        self.save()
    
    def reschedule_session(self, new_date, reason=None):
        """Reschedule the session"""
        self.status = 'RESCHEDULED'
        self.scheduled_date = new_date
        if reason:
            self.session_notes = f"Rescheduled: {reason}\n\n{self.session_notes or ''}"
        self.save()
    
    def mark_needs_rescheduling(self, reason=None):
        """Mark session as needing rescheduling (e.g., due to availability change)"""
        self.status = 'NEEDS_RESCHEDULING'
        if reason:
            self.session_notes = f"Needs rescheduling: {reason}\n\n{self.session_notes or ''}"
        self.save()
    
    def __str__(self):
        patient_name = self.patient.full_name if self.patient else 'Unknown'
        return f"Session {self.session_number} - {patient_name} with {self.therapist.full_name}"
    
    class Meta:
        db_table = 'sessions'
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['therapist', 'scheduled_date'], name='therapist_date_idx'),
            models.Index(fields=['patient', 'scheduled_date'], name='patient_date_idx'),
            models.Index(fields=['status', 'scheduled_date'], name='status_date_idx'),
            models.Index(fields=['is_recurring', 'recurrence_parent'], name='recurring_idx'),
            models.Index(fields=['is_emergency'], name='emergency_idx'),
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
    """Comprehensive therapist availability configuration per day of week"""
    
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_slots')
    
    # Day configuration
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    is_day_off = models.BooleanField(default=False, help_text="Mark this day as completely unavailable")
    
    # Working hours
    start_time = models.TimeField(help_text="Start of working hours for this day")
    end_time = models.TimeField(help_text="End of working hours for this day")
    
    # Break time (optional)
    break_start = models.TimeField(null=True, blank=True, help_text="Start of break period")
    break_end = models.TimeField(null=True, blank=True, help_text="End of break period")
    
    # Session settings for this day
    default_session_duration = models.IntegerField(default=60, help_text="Default session duration in minutes for this day")
    buffer_minutes = models.IntegerField(default=15, help_text="Buffer time between sessions in minutes")
    max_sessions_per_day = models.IntegerField(default=8, help_text="Maximum sessions allowed on this day")
    
    # Location options
    location = models.CharField(max_length=200, blank=True, null=True, help_text="Default location for this day")
    is_online_available = models.BooleanField(default=True, help_text="Can do online sessions on this day")
    is_in_person_available = models.BooleanField(default=True, help_text="Can do in-person sessions on this day")
    
    # Date range for temporary availability changes
    effective_from = models.DateField(blank=True, null=True, help_text="Start date for this availability (null = always)")
    effective_until = models.DateField(blank=True, null=True, help_text="End date for this availability (null = indefinite)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validate working hours
        if not self.is_day_off:
            if self.start_time and self.end_time and self.start_time >= self.end_time:
                raise ValidationError("Start time must be before end time")
            
            # Validate break times
            if self.break_start and self.break_end:
                if self.break_start >= self.break_end:
                    raise ValidationError("Break start must be before break end")
                if self.start_time and self.break_start < self.start_time:
                    raise ValidationError("Break cannot start before working hours")
                if self.end_time and self.break_end > self.end_time:
                    raise ValidationError("Break cannot end after working hours")
            elif self.break_start or self.break_end:
                raise ValidationError("Both break start and end must be set, or neither")
    
    def get_available_minutes(self):
        """Calculate total available minutes for the day"""
        if self.is_day_off:
            return 0
        
        from datetime import datetime, timedelta
        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        total_minutes = (end - start).total_seconds() / 60
        
        # Subtract break time if exists
        if self.break_start and self.break_end:
            break_start = datetime.combine(datetime.today(), self.break_start)
            break_end = datetime.combine(datetime.today(), self.break_end)
            total_minutes -= (break_end - break_start).total_seconds() / 60
        
        return int(total_minutes)
    
    def get_max_possible_sessions(self):
        """Calculate maximum possible sessions based on duration and buffer"""
        available_minutes = self.get_available_minutes()
        if available_minutes <= 0:
            return 0
        
        session_with_buffer = self.default_session_duration + self.buffer_minutes
        return min(available_minutes // session_with_buffer, self.max_sessions_per_day)
    
    class Meta:
        db_table = 'therapist_availability'
        unique_together = ['therapist', 'day_of_week', 'effective_from']
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['therapist', 'day_of_week'], name='avail_therapist_day_idx'),
            models.Index(fields=['effective_from', 'effective_until'], name='avail_effective_idx'),
        ]


class TherapistDateOverride(models.Model):
    """Specific date overrides for therapist availability (holidays, vacations, special hours)"""
    
    OVERRIDE_TYPES = [
        ('day_off', 'Day Off'),
        ('vacation', 'Vacation'),
        ('holiday', 'Holiday'),
        ('special_hours', 'Special Hours'),
        ('extra_availability', 'Extra Availability'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='date_overrides')
    
    # Date range
    date = models.DateField(help_text="Specific date for override")
    end_date = models.DateField(null=True, blank=True, help_text="End date for multi-day override (vacation)")
    
    # Override type
    override_type = models.CharField(max_length=20, choices=OVERRIDE_TYPES, default='day_off')
    
    # If special_hours or extra_availability, specify the times
    is_available = models.BooleanField(default=False, help_text="Is therapist available on this date?")
    start_time = models.TimeField(null=True, blank=True, help_text="Start time if available")
    end_time = models.TimeField(null=True, blank=True, help_text="End time if available")
    
    # Break time for special hours
    break_start = models.TimeField(null=True, blank=True)
    break_end = models.TimeField(null=True, blank=True)
    
    # Notes
    reason = models.CharField(max_length=200, blank=True, null=True, help_text="Reason for the override")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validate date range
        if self.end_date and self.end_date < self.date:
            raise ValidationError("End date must be after start date")
        
        # Validate times for available overrides
        if self.is_available:
            if not self.start_time or not self.end_time:
                raise ValidationError("Start and end times are required when available")
            if self.start_time >= self.end_time:
                raise ValidationError("Start time must be before end time")
    
    def conflicts_with_sessions(self):
        """Check if this override conflicts with scheduled sessions"""
        from django.db.models import Q
        
        date_range = Q(scheduled_date__date=self.date)
        if self.end_date:
            date_range = Q(scheduled_date__date__gte=self.date, scheduled_date__date__lte=self.end_date)
        
        conflicting_sessions = Session.objects.filter(
            date_range,
            therapist=self.therapist,
            status__in=['UPCOMING', 'REQUESTED']
        )
        
        return conflicting_sessions
    
    class Meta:
        db_table = 'therapist_date_overrides'
        ordering = ['date']
        indexes = [
            models.Index(fields=['therapist', 'date'], name='override_therapist_date_idx'),
            models.Index(fields=['date', 'end_date'], name='override_date_range_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['therapist', 'date'],
                name='unique_therapist_date_override'
            ),
        ]






