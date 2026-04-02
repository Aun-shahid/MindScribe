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

    DELIVERY_STATUS_PENDING = 'pending'
    DELIVERY_STATUS_SENT = 'sent'
    DELIVERY_STATUS_DELIVERED = 'delivered'
    DELIVERY_STATUS_FAILED = 'failed'

    DELIVERY_STATUS_CHOICES = [
        (DELIVERY_STATUS_PENDING, 'Pending'),
        (DELIVERY_STATUS_SENT, 'Sent'),
        (DELIVERY_STATUS_DELIVERED, 'Delivered'),
        (DELIVERY_STATUS_FAILED, 'Failed'),
    ]
    
    NOTIFICATION_TYPES = [
        ('session_reminder', 'Session Reminder'),
        ('session_summary', 'Session Summary Available'),
        ('session_ai_ready', 'Session AI Outputs Ready'),
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

    # Realtime delivery lifecycle
    delivery_status = models.CharField(
        max_length=20,
        choices=DELIVERY_STATUS_CHOICES,
        default=DELIVERY_STATUS_PENDING,
        help_text="Websocket delivery status"
    )
    delivery_attempts = models.PositiveIntegerField(default=0)
    last_delivery_attempt_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_error = models.TextField(blank=True, null=True)
    
    sent_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['patient', '-sent_at']),
            models.Index(fields=['patient', 'is_read']),
            models.Index(fields=['delivery_status', 'next_retry_at']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} - {self.patient.full_name}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def mark_delivery_attempt(self, status, error_message=None, next_retry_at=None):
        """Record a websocket delivery attempt."""
        self.delivery_attempts = (self.delivery_attempts or 0) + 1
        self.last_delivery_attempt_at = timezone.now()
        self.delivery_status = status
        self.delivery_error = error_message
        self.next_retry_at = next_retry_at
        self.save(update_fields=[
            'delivery_attempts',
            'last_delivery_attempt_at',
            'delivery_status',
            'delivery_error',
            'next_retry_at',
        ])

    def mark_as_delivered(self):
        """Mark notification as delivered to a connected websocket client."""
        self.delivery_status = self.DELIVERY_STATUS_DELIVERED
        self.delivered_at = timezone.now()
        self.delivery_error = None
        self.next_retry_at = None
        self.save(update_fields=['delivery_status', 'delivered_at', 'delivery_error', 'next_retry_at'])


class NotificationDevice(models.Model):
    """Registered devices/tokens used for remote push notifications."""

    PLATFORM_IOS = 'ios'
    PLATFORM_ANDROID = 'android'
    PLATFORM_UNKNOWN = 'unknown'

    PLATFORM_CHOICES = [
        (PLATFORM_IOS, 'iOS'),
        (PLATFORM_ANDROID, 'Android'),
        (PLATFORM_UNKNOWN, 'Unknown'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_devices',
    )
    expo_push_token = models.CharField(max_length=255, unique=True)
    device_id = models.CharField(max_length=255, null=True, blank=True)
    platform = models.CharField(
        max_length=20,
        choices=PLATFORM_CHOICES,
        default=PLATFORM_UNKNOWN,
    )
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_devices'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['platform', 'is_active']),
        ]

    def __str__(self):
        suffix = self.expo_push_token[-10:] if self.expo_push_token else 'none'
        return f"{self.user.full_name} ({self.platform}) ...{suffix}"
