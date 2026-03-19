from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from ..models import NotificationPreference, Notification, PatientGoal
from therapy_sessions.models import Session
from .notification_center import create_notification


DEFAULT_DAILY_REMINDER_WINDOW_MINUTES = 5
DEFAULT_SESSION_REMINDER_WINDOW_MINUTES = 10
DEFAULT_THERAPIST_SESSION_LOOKAHEAD_HOURS = 48
DEFAULT_GOAL_REMINDER_LOOKAHEAD_DAYS = 3
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


def _therapist_session_lookahead_hours():
    raw_value = getattr(
        settings,
        'THERAPIST_SESSION_REMINDER_LOOKAHEAD_HOURS',
        DEFAULT_THERAPIST_SESSION_LOOKAHEAD_HOURS,
    )
    try:
        hours = int(raw_value)
    except (TypeError, ValueError):
        hours = DEFAULT_THERAPIST_SESSION_LOOKAHEAD_HOURS
    return max(1, hours)


def _goal_reminder_lookahead_days():
    raw_value = getattr(
        settings,
        'GOAL_REMINDER_LOOKAHEAD_DAYS',
        DEFAULT_GOAL_REMINDER_LOOKAHEAD_DAYS,
    )
    try:
        days = int(raw_value)
    except (TypeError, ValueError):
        days = DEFAULT_GOAL_REMINDER_LOOKAHEAD_DAYS
    return min(30, max(1, days))


def send_session_reminder_notifications():
    """
    Check for upcoming sessions and send reminder notifications
    based on each patient's notification preferences.
    
    This function should be called periodically by the in-app APScheduler tick.
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

                sent_count += 1
    
    return sent_count


def send_therapist_upcoming_session_notifications():
    """
    Send one reminder to therapists when a session is approaching soon.

    A reminder is created once per session when it enters the configured
    lookahead window so it shows up in the therapist's session notifications.
    """
    now = timezone.now()
    sent_count = 0
    lookahead = timedelta(hours=_therapist_session_lookahead_hours())

    upcoming_sessions = Session.objects.filter(
        status__in=ACTIVE_SESSION_STATUSES,
        scheduled_date__gte=now,
        scheduled_date__lte=now + lookahead,
    ).select_related('patient', 'therapist')

    for session in upcoming_sessions:
        existing_notification = Notification.objects.filter(
            patient=session.therapist,
            notification_type='session_reminder',
            session_id=str(session.id),
        ).exists()

        if existing_notification:
            continue

        create_notification(
            recipient=session.therapist,
            notification_type='session_reminder',
            title='Upcoming Session Approaching',
            message=(
                f'You have an upcoming session with {session.patient.full_name} on '
                f'{_format_session_datetime(_session_datetime(session))}. '
                'Review prior notes and prepare for the session.'
            ),
            session_id=str(session.id),
            action_url=f'/sessions/{session.id}/view',
            source_event='session.reminder.therapist',
            metadata={
                'session_id': str(session.id),
                'recipient_role': 'therapist',
                'lookahead_hours': _therapist_session_lookahead_hours(),
            },
        )
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
    return notification_result['notification']


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
    return notification_result['notification']


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
    return notification_result['notification']


def send_goal_reminder_notifications():
    """
    Send in-app reminders for goals that are due soon.

    A reminder is created at most once per goal per day.
    """
    now = timezone.now()
    today = timezone.localtime(now).date()
    lookahead_days = _goal_reminder_lookahead_days()
    due_by = today + timedelta(days=lookahead_days)
    sent_count = 0

    preferences = NotificationPreference.objects.filter(
        goal_reminders_enabled=True
    ).select_related('patient')

    for pref in preferences:
        due_goals = PatientGoal.objects.filter(
            patient=pref.patient,
            target_date__isnull=False,
            target_date__gte=today,
            target_date__lte=due_by,
        ).exclude(status='completed').order_by('target_date')

        for goal in due_goals:
            reminder_today = Notification.objects.filter(
                patient=pref.patient,
                notification_type='goal_reminder',
                goal_id=str(goal.id),
                sent_at__date=today,
            ).exists()

            if reminder_today:
                continue

            days_until_due = (goal.target_date - today).days
            if days_until_due == 0:
                title = 'Goal Due Today'
                message = f'Your goal "{goal.title}" is due today. Take a moment to make progress.'
            elif days_until_due == 1:
                title = 'Goal Due Tomorrow'
                message = f'Your goal "{goal.title}" is due tomorrow. A short check-in now can help.'
            else:
                title = 'Goal Check-in'
                message = (
                    f'Your goal "{goal.title}" is due in {days_until_due} days. '
                    'Keep your momentum going.'
                )

            create_notification(
                recipient=pref.patient,
                notification_type='goal_reminder',
                title=title,
                message=message,
                goal_id=str(goal.id),
                action_url=f'/goals/{goal.id}',
                source_event='goal.reminder',
                metadata={
                    'goal_id': str(goal.id),
                    'days_until_due': days_until_due,
                    'target_date': goal.target_date.isoformat(),
                },
            )
            sent_count += 1

    return sent_count


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

                sent_count += 1
    
    return sent_count
