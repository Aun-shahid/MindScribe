from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class NotificationPreference(models.Model):
    """Patient notification preferences - enable/disable notifications"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        limit_choices_to={'user_type': 'patient'}
    )
    
    # Session Notifications
    session_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Receive reminders for upcoming sessions"
    )
    session_reminder_time = models.IntegerField(
        default=24,
        help_text="Hours before session to send reminder (default: 24 hours)"
    )
    
    # Session Updates
    session_summary_enabled = models.BooleanField(
        default=True,
        help_text="Receive notification when therapist writes session summary"
    )
    session_approved_enabled = models.BooleanField(
        default=True,
        help_text="Receive notification when session request is approved"
    )
    session_cancelled_enabled = models.BooleanField(
        default=True,
        help_text="Receive notification when session is cancelled"
    )
    
    # Goal Updates
    goal_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Receive reminders for therapy goals"
    )
    
    # Daily Reminders
    mood_reminder_enabled = models.BooleanField(
        default=True,
        help_text="Daily reminder to log mood"
    )
    mood_reminder_time = models.TimeField(
        default="20:00:00",
        help_text="Time of day to send mood reminder"
    )
    
    journal_reminder_enabled = models.BooleanField(
        default=True,
        help_text="Daily reminder to write journal entry"
    )
    journal_reminder_time = models.TimeField(
        default="21:00:00",
        help_text="Time of day to send journal reminder"
    )
    
    # Communication
    therapist_messages_enabled = models.BooleanField(
        default=True,
        help_text="Receive notifications from therapist"
    )
    
    # Push Notification Tokens (for mobile)
    push_token = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="FCM/APNS push notification token"
    )
    device_type = models.CharField(
        max_length=20,
        choices=[('ios', 'iOS'), ('android', 'Android'), ('web', 'Web')],
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
    
    def __str__(self):
        return f"Notification Preferences - {self.patient.full_name}"


class Notification(models.Model):
    """Store notifications for patients"""
    
    NOTIFICATION_TYPES = [
        ('session_reminder', 'Session Reminder'),
        ('session_summary', 'Session Summary Available'),
        ('session_approved', 'Session Request Approved'),
        ('session_cancelled', 'Session Cancelled'),
        ('goal_reminder', 'Goal Reminder'),
        ('mood_reminder', 'Mood Check-in Reminder'),
        ('journal_reminder', 'Journal Reminder'),
        ('therapist_message', 'Message from Therapist'),
        ('general', 'General Notification'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        limit_choices_to={'user_type': 'patient'}
    )
    
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related objects
    session_id = models.UUIDField(null=True, blank=True, help_text="Related session ID")
    goal_id = models.UUIDField(null=True, blank=True, help_text="Related goal ID")
    
    # Action/Deep link
    action_url = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Deep link to open in mobile app"
    )
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    sent_at = models.DateTimeField(auto_now_add=True)
    
    # Push notification status
    push_sent = models.BooleanField(default=False)
    push_sent_at = models.DateTimeField(null=True, blank=True)
    push_error = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['patient', '-sent_at']),
            models.Index(fields=['patient', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} - {self.patient.full_name}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
