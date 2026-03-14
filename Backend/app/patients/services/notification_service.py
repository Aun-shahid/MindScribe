import os
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from ..models import NotificationPreference, Notification
from therapy_sessions.models import Session
from .notification_center import create_notification


DEFAULT_DAILY_REMINDER_WINDOW_MINUTES = 5
DEFAULT_SESSION_REMINDER_WINDOW_MINUTES = 10
ACTIVE_SESSION_STATUSES = ('UPCOMING', 'RESCHEDULED', 'scheduled')


def _session_datetime(session):
    """Compatibility accessor for session datetime across model versions."""
    return getattr(session, 'scheduled_date', None) or getattr(session, 'scheduled_time', None)


def _format_session_datetime(value, fmt="%B %d at %I:%M %p"):
    if not value:
        return "your session"
    return timezone.localtime(value).strftime(fmt)


def _is_time_in_window(now_local, preferred_time, window_minutes):
    """Return True if local time is within a circular day-window of preferred_time."""
    now_minutes = (now_local.hour * 60) + now_local.minute
    preferred_minutes = (preferred_time.hour * 60) + preferred_time.minute
    delta = abs(now_minutes - preferred_minutes)
    circular_delta = min(delta, 1440 - delta)
    return circular_delta <= max(0, int(window_minutes))


def _daily_window_minutes():
    return int(getattr(settings, 'DAILY_REMINDER_WINDOW_MINUTES', DEFAULT_DAILY_REMINDER_WINDOW_MINUTES))


def _session_window_minutes():
    return int(getattr(settings, 'SESSION_REMINDER_WINDOW_MINUTES', DEFAULT_SESSION_REMINDER_WINDOW_MINUTES))


def _attempt_push_notification(preference, notification):
    """Attempt push delivery and persist push delivery error when it fails."""
    if not preference.push_token:
        return False

    sent, error = send_push_notification(preference, notification)
    if not sent and error:
        notification.push_error = error
        notification.save(update_fields=['push_error'])
    return sent


def send_session_reminder_notifications():
    """
    Check for upcoming sessions and send reminder notifications
    based on each patient's notification preferences.
    
    This function should be called periodically (recommended every minute via Celery Beat)
    """
    now = timezone.now()
    sent_count = 0
    window_minutes = _session_window_minutes()
    
    # Get all patients with session reminders enabled
    preferences = NotificationPreference.objects.filter(
        session_reminders_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
        # Calculate the notification time window
        reminder_time = timedelta(hours=pref.session_reminder_time)
        target_time_start = now + reminder_time - timedelta(minutes=window_minutes)
        target_time_end = now + reminder_time + timedelta(minutes=window_minutes)
        
        # Find upcoming sessions for this patient
        upcoming_sessions = Session.objects.filter(
            patient=pref.patient,
            status__in=ACTIVE_SESSION_STATUSES,
            scheduled_date__gte=target_time_start,
            scheduled_date__lte=target_time_end
        ).select_related('therapist')
        
        for session in upcoming_sessions:
            # Check if we already sent a reminder for this session
            existing_notification = Notification.objects.filter(
                patient=pref.patient,
                notification_type='session_reminder',
                session_id=str(session.id)
            ).exists()
            
            if not existing_notification:
                # Create reminder notification
                hours_until = pref.session_reminder_time
                notification_result = create_notification(
                    recipient=pref.patient,
                    notification_type='session_reminder',
                    title='Upcoming Session Reminder',
                    message=f'Your therapy session with Dr. {session.therapist.get_full_name()} at {_format_session_datetime(_session_datetime(session))} is in {hours_until} hour{"s" if hours_until != 1 else ""}.',
                    session_id=str(session.id),
                    action_url=f'/sessions/{session.id}',
                    source_event='session.reminder',
                    metadata={
                        'session_id': str(session.id),
                        'hours_until': hours_until,
                    },
                )
                notification = notification_result['notification']
                
                _attempt_push_notification(pref, notification)
                
                sent_count += 1
    
    return sent_count


def send_session_summary_notification(session):
    """
    Send notification when a session summary is available.
    
    Args:
        session: The Session object that was just completed with a summary
    """
    try:
        pref = NotificationPreference.objects.get(
            patient=session.patient,
            session_summary_enabled=True
        )
    except NotificationPreference.DoesNotExist:
        return None
    
    # Create notification
    notification_result = create_notification(
        recipient=session.patient,
        notification_type='session_summary',
        title='Session Summary Available',
        message=f'Your session summary from {_format_session_datetime(_session_datetime(session), "%B %d")} is now available.',
        session_id=str(session.id),
        action_url=f'/sessions/{session.id}/summary',
        source_event='session.summary.available',
        metadata={'session_id': str(session.id)},
    )
    notification = notification_result['notification']
    
    _attempt_push_notification(pref, notification)
    
    return notification


def send_session_approved_notification(session):
    """
    Send notification when a session request is approved.
    
    Args:
        session: The Session object that was approved
    """
    try:
        pref = NotificationPreference.objects.get(
            patient=session.patient,
            session_approved_enabled=True
        )
    except NotificationPreference.DoesNotExist:
        return None
    
    # Create notification
    notification_result = create_notification(
        recipient=session.patient,
        notification_type='session_approved',
        title='Session Request Approved',
        message=f'Your session request for {_format_session_datetime(_session_datetime(session))} has been approved.',
        session_id=str(session.id),
        action_url=f'/sessions/{session.id}',
        source_event='session.approved',
        metadata={'session_id': str(session.id)},
    )
    notification = notification_result['notification']
    
    _attempt_push_notification(pref, notification)
    
    return notification


def send_session_cancelled_notification(session, cancelled_by='therapist'):
    """
    Send notification when a session is cancelled.
    
    Args:
        session: The Session object that was cancelled
        cancelled_by: Who cancelled the session ('therapist' or 'patient')
    """
    try:
        pref = NotificationPreference.objects.get(
            patient=session.patient,
            session_cancelled_enabled=True
        )
    except NotificationPreference.DoesNotExist:
        return None
    
    # Create notification
    notification_result = create_notification(
        recipient=session.patient,
        notification_type='session_cancelled',
        title='Session Cancelled',
        message=f'Your session on {_format_session_datetime(_session_datetime(session))} has been cancelled.',
        session_id=str(session.id),
        action_url='/sessions',
        source_event='session.cancelled',
        metadata={
            'session_id': str(session.id),
            'cancelled_by': cancelled_by,
        },
    )
    notification = notification_result['notification']
    
    _attempt_push_notification(pref, notification)
    
    return notification


def send_mood_reminder_notifications():
    """
    Send daily mood tracking reminders to patients who have it enabled.
    Should be called at the configured reminder time (default 20:00).
    """
    from ..models import MoodEntry

    now = timezone.now()
    now_local = timezone.localtime(now)
    today = now_local.date()
    sent_count = 0
    window_minutes = _daily_window_minutes()
    
    # Get all patients with mood reminders enabled
    preferences = NotificationPreference.objects.filter(
        mood_reminder_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
        if not _is_time_in_window(now_local, pref.mood_reminder_time, window_minutes):
            continue

        # Check if patient already logged mood today
        mood_today = MoodEntry.objects.filter(
            patient=pref.patient,
            created_at__date=today
        ).exists()
        
        if not mood_today:
            # Check if we already sent a reminder today
            reminder_today = Notification.objects.filter(
                patient=pref.patient,
                notification_type='mood_reminder',
                sent_at__date=today
            ).exists()
            
            if not reminder_today:
                # Create mood reminder notification
                notification_result = create_notification(
                    recipient=pref.patient,
                    notification_type='mood_reminder',
                    title='How are you feeling today?',
                    message='Take a moment to check in with yourself and log your mood.',
                    action_url='/mood',
                    source_event='mood.reminder',
                )
                notification = notification_result['notification']
                
                _attempt_push_notification(pref, notification)
                
                sent_count += 1
    
    return sent_count


def send_journal_reminder_notifications():
    """
    Send daily journal reminders to patients who have it enabled.
    Should be called at the configured reminder time (default 21:00).
    """
    from ..models import JournalEntry

    now = timezone.now()
    now_local = timezone.localtime(now)
    today = now_local.date()
    sent_count = 0
    window_minutes = _daily_window_minutes()
    
    # Get all patients with journal reminders enabled
    preferences = NotificationPreference.objects.filter(
        journal_reminder_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
        if not _is_time_in_window(now_local, pref.journal_reminder_time, window_minutes):
            continue

        # Check if patient already created journal entry today
        journal_today = JournalEntry.objects.filter(
            patient=pref.patient,
            created_at__date=today
        ).exists()
        
        if not journal_today:
            # Check if we already sent a reminder today
            reminder_today = Notification.objects.filter(
                patient=pref.patient,
                notification_type='journal_reminder',
                sent_at__date=today
            ).exists()
            
            if not reminder_today:
                # Create journal reminder notification
                notification_result = create_notification(
                    recipient=pref.patient,
                    notification_type='journal_reminder',
                    title='Time to reflect',
                    message='Take a few minutes to write in your journal about your day.',
                    action_url='/journal',
                    source_event='journal.reminder',
                )
                notification = notification_result['notification']
                
                _attempt_push_notification(pref, notification)
                
                sent_count += 1
    
    return sent_count


def send_push_notification(preference, notification):
    """
    Send push notification via Firebase Cloud Messaging when configured.
    
    Args:
        preference: NotificationPreference object with push_token and device_type
        notification: Notification object to send
    
    Returns:
        tuple[bool, str|None]: (sent, error_message)
    """
    if not preference.push_token:
        return False, 'missing_push_token'

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except Exception:
        return False, 'firebase_admin_not_installed'

    try:
        if not firebase_admin._apps:
            credentials_path = os.environ.get('FIREBASE_CREDENTIALS_PATH') or getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()

        message = messaging.Message(
            notification=messaging.Notification(
                title=notification.title,
                body=notification.message,
            ),
            data={
                'notification_id': str(notification.id),
                'type': notification.notification_type,
                'action_url': notification.action_url or '',
            },
            token=preference.push_token,
        )

        messaging.send(message)

        notification.push_sent = True
        notification.push_sent_at = timezone.now()
        notification.push_error = None
        notification.save(update_fields=['push_sent', 'push_sent_at', 'push_error'])

        return True, None
    except Exception as exc:
        return False, str(exc)


def retry_failed_push_notifications(max_to_process=200, dead_letter_after_hours=24):
    """
    Retry failed/unsent push notifications and dead-letter stale ones.

    Strategy:
    - Retry unsent notifications that are newer than dead-letter threshold.
    - Mark older unsent notifications as dead-lettered (stored in push_error).

    Returns:
        dict with counters for processed/retried/sent/failed/dead_lettered
    """
    now = timezone.now()
    stale_cutoff = now - timedelta(hours=max(1, int(dead_letter_after_hours)))
    limit = max(1, int(max_to_process))

    pending = Notification.objects.filter(
        push_sent=False
    ).exclude(
        push_error__startswith='dead_letter:'
    ).select_related('patient').order_by('sent_at')[:limit]

    processed = 0
    retried = 0
    sent = 0
    failed = 0
    dead_lettered = 0

    for notification in pending:
        processed += 1

        if notification.sent_at and notification.sent_at < stale_cutoff:
            existing = notification.push_error or 'stale_notification'
            notification.push_error = f'dead_letter:{existing}'
            notification.save(update_fields=['push_error'])
            dead_lettered += 1
            continue

        pref = getattr(notification.patient, 'notification_preferences', None)
        if not pref or not pref.push_token:
            notification.push_error = 'missing_push_token'
            notification.save(update_fields=['push_error'])
            failed += 1
            continue

        retried += 1
        push_sent, push_error = send_push_notification(pref, notification)
        if push_sent:
            sent += 1
            continue

        notification.push_error = push_error or 'push_retry_failed'
        notification.save(update_fields=['push_error'])
        failed += 1

    return {
        'processed': processed,
        'retried': retried,
        'sent': sent,
        'failed': failed,
        'dead_lettered': dead_lettered,
    }
