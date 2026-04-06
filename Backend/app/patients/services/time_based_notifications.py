"""
Time-based session notification service.

Implements improved notification logic:
- Send notification when session is 24 hours away
- Send notification when session is on the same day
- Avoid redundant notifications by tracking sent statuses
"""

import logging
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from ..models import Notification, NotificationPreference
from therapy_sessions.models import Session
from therapy_sessions.session_status import (
    classify_session_status,
    SessionStatusCategory,
    is_session_within_24_hours,
    is_session_today,
    get_hours_until_session,
)
from .notification_center import create_notification

logger = logging.getLogger(__name__)


# Notification types for different timing events
NOTIFICATION_24H_BEFORE = 'session_reminder_24h'
NOTIFICATION_SAME_DAY = 'session_reminder_same_day'


def _format_session_datetime(value, fmt="%B %d at %I:%M %p"):
    """Format session datetime for display."""
    if not value:
        return "your session"
    return timezone.localtime(value).strftime(fmt)


def _has_notification_been_sent(session, notification_type):
    """
    Check if a particular notification has already been sent for this session.
    
    Args:
        session: Session object
        notification_type: Type of notification to check
        
    Returns:
        bool: True if notification has been sent, False otherwise
    """
    return Notification.objects.filter(
        session_id=str(session.id),
        notification_type=notification_type,
        delivery_status=Notification.DELIVERY_STATUS_SENT,
    ).exists()


def send_time_based_session_reminders():
    """
    Send time-based reminders for upcoming sessions.
    
    Logic:
    1. For each patient with reminders enabled:
       - Find sessions within 24 hours that haven't had 24h notification yet
       - Find sessions for today that haven't had same-day notification yet
    2. Send appropriate notifications once per session per type
    
    Returns:
        int: Total count of notifications sent
    """
    now = timezone.now()
    sent_count_24h = 0
    sent_count_same_day = 0
    
    # Get all patients with session reminders enabled
    preferences = NotificationPreference.objects.filter(
        session_reminders_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
        patient = pref.patient
        
        # Find sessions for this patient that are in active/upcoming states
        active_sessions = Session.objects.filter(
            patient=patient,
            status__in=('UPCOMING', 'RESCHEDULED', 'REQUESTED'),
            scheduled_date__isnull=False,
            scheduled_date__gte=now - timedelta(hours=1),  # Include recent past for safety
        ).select_related('therapist')
        
        for session in active_sessions:
            status = classify_session_status(session)
            hours_until = get_hours_until_session(session)
            
            if hours_until is None or hours_until < 0:
                continue
            
            # Handle "24 hours before" notification
            if is_session_within_24_hours(session):
                if not _has_notification_been_sent(session, NOTIFICATION_24H_BEFORE):
                    try:
                        create_notification(
                            recipient=patient,
                            notification_type=NOTIFICATION_24H_BEFORE,
                            title='Session in 24 Hours',
                            message=(
                                f'Your therapy session with Dr. {session.therapist.get_full_name()} '
                                f'is scheduled for {_format_session_datetime(session.scheduled_date)}. '
                                'Please be prepared and join on time.'
                            ),
                            session_id=str(session.id),
                            action_url=f'/sessions/{session.id}',
                            source_event='session.reminder.24h',
                            metadata={
                                'session_id': str(session.id),
                                'status_category': status,
                                'hours_until': round(hours_until, 1),
                            },
                        )
                        sent_count_24h += 1
                    except Exception as e:
                        logger.exception(f"Failed to send 24h notification for session {session.id}: {e}")
            
            # Handle "same day" notification
            if status == SessionStatusCategory.TODAY:
                if not _has_notification_been_sent(session, NOTIFICATION_SAME_DAY):
                    try:
                        create_notification(
                            recipient=patient,
                            notification_type=NOTIFICATION_SAME_DAY,
                            title='Your Session is Today',
                            message=(
                                f'Your therapy session with Dr. {session.therapist.get_full_name()} '
                                f'is today at {_format_session_datetime(session.scheduled_date, "%I:%M %p")}. '
                                'Please join a few minutes early.'
                            ),
                            session_id=str(session.id),
                            action_url=f'/sessions/{session.id}',
                            source_event='session.reminder.same_day',
                            metadata={
                                'session_id': str(session.id),
                                'hours_until': round(hours_until, 1),
                            },
                        )
                        sent_count_same_day += 1
                    except Exception as e:
                        logger.exception(f"Failed to send same-day notification for session {session.id}: {e}")
    
    total_sent = sent_count_24h + sent_count_same_day
    logger.info(
        f"Patient session reminders sent: 24h={sent_count_24h}, same_day={sent_count_same_day}, total={total_sent}"
    )
    return total_sent


def send_time_based_therapist_reminders():
    """
    Send time-based reminders to therapists about upcoming sessions.
    
    Logic:
    - Send one "24 hours before" reminder per session
    - Send one "same day" reminder per session
    
    Returns:
        int: Total count of notifications sent
    """
    now = timezone.now()
    sent_count_24h = 0
    sent_count_same_day = 0
    
    # Find all upcoming sessions that need reminders
    active_sessions = Session.objects.filter(
        status__in=('UPCOMING', 'RESCHEDULED', 'REQUESTED'),
        scheduled_date__isnull=False,
        scheduled_date__gte=now - timedelta(hours=1),
    ).select_related('patient', 'therapist')
    
    for session in active_sessions:
        status = classify_session_status(session)
        hours_until = get_hours_until_session(session)
        
        if hours_until is None or hours_until < 0:
            continue
        
        # Send 24-hour reminder once per therapist session
        if is_session_within_24_hours(session):
            therapist = session.therapist
            if not Notification.objects.filter(
                patient=therapist,  # Using patient field for therapist ID
                session_id=str(session.id),
                notification_type=NOTIFICATION_24H_BEFORE,
                delivery_status=Notification.DELIVERY_STATUS_SENT,
            ).exists():
                try:
                    create_notification(
                        recipient=therapist,
                        notification_type=NOTIFICATION_24H_BEFORE,
                        title='Upcoming Session in 24 Hours',
                        message=(
                            f'You have a session with {session.patient.full_name} '
                            f'scheduled for {_format_session_datetime(session.scheduled_date)}. '
                            'Please review prior notes.'
                        ),
                        session_id=str(session.id),
                        action_url=f'/sessions/{session.id}/view',
                        source_event='session.reminder.therapist.24h',
                        metadata={
                            'session_id': str(session.id),
                            'recipient_role': 'therapist',
                            'hours_until': round(hours_until, 1),
                        },
                    )
                    sent_count_24h += 1
                except Exception as e:
                    logger.exception(f"Failed to send therapist 24h notification for session {session.id}: {e}")
        
        # Send same-day reminder once per therapist session
        if status == SessionStatusCategory.TODAY:
            therapist = session.therapist
            if not Notification.objects.filter(
                patient=therapist,
                session_id=str(session.id),
                notification_type=NOTIFICATION_SAME_DAY,
                delivery_status=Notification.DELIVERY_STATUS_SENT,
            ).exists():
                try:
                    create_notification(
                        recipient=therapist,
                        notification_type=NOTIFICATION_SAME_DAY,
                        title='Session Today',
                        message=(
                            f'You have a session with {session.patient.full_name} '
                            f'today at {_format_session_datetime(session.scheduled_date, "%I:%M %p")}. '
                            'Get ready to begin shortly.'
                        ),
                        session_id=str(session.id),
                        action_url=f'/sessions/{session.id}/view',
                        source_event='session.reminder.therapist.same_day',
                        metadata={
                            'session_id': str(session.id),
                            'recipient_role': 'therapist',
                            'hours_until': round(hours_until, 1),
                        },
                    )
                    sent_count_same_day += 1
                except Exception as e:
                    logger.exception(f"Failed to send therapist same-day notification for session {session.id}: {e}")
    
    total_sent = sent_count_24h + sent_count_same_day
    logger.info(
        f"Therapist session reminders sent: 24h={sent_count_24h}, same_day={sent_count_same_day}, total={total_sent}"
    )
    return total_sent
