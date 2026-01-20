from django.utils import timezone
from datetime import timedelta
from ..models import NotificationPreference, Notification
from therapy_sessions.models import Session


def send_session_reminder_notifications():
    """
    Check for upcoming sessions and send reminder notifications
    based on each patient's notification preferences.
    
    This function should be called periodically (e.g., every hour via Celery task)
    """
    now = timezone.now()
    sent_count = 0
    
    # Get all patients with session reminders enabled
    preferences = NotificationPreference.objects.filter(
        session_reminders_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
        # Calculate the notification time window
        reminder_time = timedelta(hours=pref.session_reminder_time)
        target_time_start = now + reminder_time - timedelta(minutes=30)
        target_time_end = now + reminder_time + timedelta(minutes=30)
        
        # Find upcoming sessions for this patient
        upcoming_sessions = Session.objects.filter(
            patient=pref.patient,
            status='scheduled',
            scheduled_time__gte=target_time_start,
            scheduled_time__lte=target_time_end
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
                notification = Notification.objects.create(
                    patient=pref.patient,
                    notification_type='session_reminder',
                    title=f'Upcoming Session Reminder',
                    message=f'Your therapy session with Dr. {session.therapist.get_full_name()} is in {hours_until} hour{"s" if hours_until != 1 else ""}.',
                    session_id=str(session.id),
                    action_url=f'/sessions/{session.id}'
                )
                
                # TODO: Send push notification if push_token is set
                if pref.push_token:
                    try:
                        send_push_notification(pref, notification)
                    except Exception as e:
                        notification.push_error = str(e)
                        notification.save()
                
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
    notification = Notification.objects.create(
        patient=session.patient,
        notification_type='session_summary',
        title='Session Summary Available',
        message=f'Your session summary from {session.scheduled_time.strftime("%B %d")} is now available.',
        session_id=str(session.id),
        action_url=f'/sessions/{session.id}/summary'
    )
    
    # TODO: Send push notification if push_token is set
    if pref.push_token:
        try:
            send_push_notification(pref, notification)
        except Exception as e:
            notification.push_error = str(e)
            notification.save()
    
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
    notification = Notification.objects.create(
        patient=session.patient,
        notification_type='session_approved',
        title='Session Request Approved',
        message=f'Your session request for {session.scheduled_time.strftime("%B %d at %I:%M %p")} has been approved.',
        session_id=str(session.id),
        action_url=f'/sessions/{session.id}'
    )
    
    # TODO: Send push notification if push_token is set
    if pref.push_token:
        try:
            send_push_notification(pref, notification)
        except Exception as e:
            notification.push_error = str(e)
            notification.save()
    
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
    notification = Notification.objects.create(
        patient=session.patient,
        notification_type='session_cancelled',
        title='Session Cancelled',
        message=f'Your session on {session.scheduled_time.strftime("%B %d at %I:%M %p")} has been cancelled.',
        session_id=str(session.id),
        action_url=f'/sessions'
    )
    
    # TODO: Send push notification if push_token is set
    if pref.push_token:
        try:
            send_push_notification(pref, notification)
        except Exception as e:
            notification.push_error = str(e)
            notification.save()
    
    return notification


def send_mood_reminder_notifications():
    """
    Send daily mood tracking reminders to patients who have it enabled.
    Should be called at the configured reminder time (default 20:00).
    """
    from django.contrib.auth import get_user_model
    from ..models import MoodEntry
    
    User = get_user_model()
    now = timezone.now()
    today = now.date()
    sent_count = 0
    
    # Get all patients with mood reminders enabled
    preferences = NotificationPreference.objects.filter(
        mood_reminder_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
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
                notification = Notification.objects.create(
                    patient=pref.patient,
                    notification_type='mood_reminder',
                    title='How are you feeling today?',
                    message='Take a moment to check in with yourself and log your mood.',
                    action_url='/mood'
                )
                
                # TODO: Send push notification if push_token is set
                if pref.push_token:
                    try:
                        send_push_notification(pref, notification)
                    except Exception as e:
                        notification.push_error = str(e)
                        notification.save()
                
                sent_count += 1
    
    return sent_count


def send_journal_reminder_notifications():
    """
    Send daily journal reminders to patients who have it enabled.
    Should be called at the configured reminder time (default 21:00).
    """
    from django.contrib.auth import get_user_model
    from ..models import JournalEntry
    
    User = get_user_model()
    now = timezone.now()
    today = now.date()
    sent_count = 0
    
    # Get all patients with journal reminders enabled
    preferences = NotificationPreference.objects.filter(
        journal_reminder_enabled=True
    ).select_related('patient')
    
    for pref in preferences:
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
                notification = Notification.objects.create(
                    patient=pref.patient,
                    notification_type='journal_reminder',
                    title='Time to reflect',
                    message='Take a few minutes to write in your journal about your day.',
                    action_url='/journal'
                )
                
                # TODO: Send push notification if push_token is set
                if pref.push_token:
                    try:
                        send_push_notification(pref, notification)
                    except Exception as e:
                        notification.push_error = str(e)
                        notification.save()
                
                sent_count += 1
    
    return sent_count


def send_push_notification(preference, notification):
    """
    Send push notification via FCM (Firebase Cloud Messaging) or APNS (Apple Push Notification Service).
    
    Args:
        preference: NotificationPreference object with push_token and device_type
        notification: Notification object to send
    
    This is a placeholder for actual push notification implementation.
    You'll need to integrate with Firebase Cloud Messaging or similar service.
    """
    # TODO: Implement actual push notification sending
    # Example using Firebase Admin SDK:
    # 
    # import firebase_admin
    # from firebase_admin import messaging
    # 
    # message = messaging.Message(
    #     notification=messaging.Notification(
    #         title=notification.title,
    #         body=notification.message,
    #     ),
    #     data={
    #         'notification_id': str(notification.id),
    #         'type': notification.notification_type,
    #         'action_url': notification.action_url,
    #     },
    #     token=preference.push_token,
    # )
    # 
    # response = messaging.send(message)
    # 
    # notification.push_sent = True
    # notification.push_sent_at = timezone.now()
    # notification.save()
    
    # For now, just mark as sent
    notification.push_sent = True
    notification.push_sent_at = timezone.now()
    notification.save()
    
    return True
