from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from therapy_sessions.models import Session
from users.models import PatientProfile, TherapistProfile

from .models import Notification, NotificationPreference, PatientGoal
from .services.notification_service import (
    send_goal_reminder_notifications,
)
from .services.time_based_notifications import (
    send_time_based_therapist_reminders,
    send_time_based_session_reminders,
)

User = get_user_model()


class TherapistUpcomingSessionNotificationTests(TestCase):
    def setUp(self):
        self.therapist_user = User.objects.create_user(
            username='therapist-notify',
            email='therapist-notify@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Sara',
            last_name='Ahmed',
        )
        self.therapist_profile = TherapistProfile.objects.create(
            user=self.therapist_user,
            license_number='LIC-NOTIFY-001',
            specialization='Clinical Psychology',
        )

        self.patient_user = User.objects.create_user(
            username='patient-notify',
            email='patient-notify@example.com',
            password='testpass123',
            user_type='patient',
            first_name='Omar',
            last_name='Ali',
        )
        PatientProfile.objects.create(
            user=self.patient_user,
            therapist=self.therapist_profile,
            connected_at=timezone.now(),
        )

    def test_therapist_gets_one_upcoming_session_reminder(self):
        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(hours=24),
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        first_run_count = send_time_based_therapist_reminders()
        second_run_count = send_time_based_therapist_reminders()

        # First run should send reminders (24h and same-day if applicable)
        self.assertGreater(first_run_count, 0)
        # Second run should send 0 notifications since they were already sent
        self.assertEqual(second_run_count, 0)

        # Check that 24-hour reminder was sent
        notifications = Notification.objects.filter(
            patient=self.therapist_user,
            session_id=str(session.id),
            notification_type='session_reminder_24h',
        )
        self.assertEqual(notifications.count(), 1)

        reminder = notifications.first()
        self.assertEqual(reminder.title, 'Upcoming Session in 24 Hours')
        self.assertIn('you have a session', reminder.message.lower())
        self.assertIn(self.patient_user.full_name, reminder.message)


class GoalReminderNotificationTests(TestCase):
    def setUp(self):
        self.patient_user = User.objects.create_user(
            username='goal-reminder-patient',
            email='goal-reminder-patient@example.com',
            password='testpass123',
            user_type='patient',
            first_name='Noor',
            last_name='Khan',
        )

    def test_goal_reminder_sent_once_per_goal_per_day(self):
        NotificationPreference.objects.create(
            patient=self.patient_user,
            goal_reminders_enabled=True,
        )
        goal = PatientGoal.objects.create(
            patient=self.patient_user,
            title='Practice grounding exercise',
            description='Complete grounding exercise before evening.',
            status='in_progress',
            target_date=timezone.localdate() + timedelta(days=2),
            progress_percentage=25,
        )

        first_run_count = send_goal_reminder_notifications()
        second_run_count = send_goal_reminder_notifications()

        self.assertEqual(first_run_count, 1)
        self.assertEqual(second_run_count, 0)

        notifications = Notification.objects.filter(
            patient=self.patient_user,
            notification_type='goal_reminder',
            goal_id=goal.id,
        )
        self.assertEqual(notifications.count(), 1)

        reminder = notifications.first()
        self.assertEqual(reminder.title, 'Goal Check-in')
        self.assertIn('Practice grounding exercise', reminder.message)

    def test_goal_reminder_not_sent_when_preference_disabled(self):
        NotificationPreference.objects.create(
            patient=self.patient_user,
            goal_reminders_enabled=False,
        )
        PatientGoal.objects.create(
            patient=self.patient_user,
            title='Daily reflection',
            description='Write one short reflection.',
            status='in_progress',
            target_date=timezone.localdate() + timedelta(days=1),
            progress_percentage=50,
        )

        sent_count = send_goal_reminder_notifications()

        self.assertEqual(sent_count, 0)
        self.assertFalse(
            Notification.objects.filter(
                patient=self.patient_user,
                notification_type='goal_reminder',
            ).exists()
        )


class TimeBasedSessionRemindersTests(TestCase):
    def setUp(self):
        self.therapist_user = User.objects.create_user(
            username='therapist-time-based',
            email='therapist-time@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Dr.',
            last_name='Smith',
        )
        self.therapist_profile = TherapistProfile.objects.create(
            user=self.therapist_user,
            license_number='LIC-TIME-001',
            specialization='Clinical Psychology',
        )

        self.patient_user = User.objects.create_user(
            username='patient-time-based',
            email='patient-time@example.com',
            password='testpass123',
            user_type='patient',
            first_name='John',
            last_name='Doe',
        )
        PatientProfile.objects.create(
            user=self.patient_user,
            therapist=self.therapist_profile,
            connected_at=timezone.now(),
        )
        
        # Enable session reminders for patient
        NotificationPreference.objects.create(
            patient=self.patient_user,
            session_reminders_enabled=True,
        )

    def test_24h_reminder_sent_only_within_24_hours(self):
        """Test that 24h reminder is sent only when session is within 24 hours."""
        # Session scheduled for tomorrow at 9 AM (between 24-48 hours, so gets 24h but not same-day)
        now = timezone.now()
        now_local = timezone.localtime(now)
        tomorrow_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        session_time_local = tomorrow_start.replace(hour=9, minute=0, second=0)
        session_time = timezone.make_aware(session_time_local, timezone=timezone.get_current_timezone())
        
        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=session_time,
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        sent_count = send_time_based_session_reminders()
        # Only 24h reminder should be sent (session is tomorrow, not today)
        self.assertEqual(sent_count, 1)

        # Check 24h reminder was sent
        notifications = Notification.objects.filter(
            patient=self.patient_user,
            session_id=str(session.id),
            notification_type='session_reminder_24h',
        )
        self.assertEqual(notifications.count(), 1)

    def test_same_day_reminder_sent_only_for_today_sessions(self):
        """Test that same-day reminder is sent only for today's sessions."""
        now = timezone.now()
        today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_midnight = today_midnight + timedelta(days=1)
        
        # Session scheduled for later today (3 hours from now)
        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=now + timedelta(hours=3),
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        sent_count = send_time_based_session_reminders()
        
        # Should send 2 notifications: 24h (if within 24h) and same-day
        # For this test case (3 hours from now), we expect at least the same-day reminder
        self.assertGreater(sent_count, 0)

        # Check same-day reminder was sent
        notifications = Notification.objects.filter(
            patient=self.patient_user,
            session_id=str(session.id),
            notification_type='session_reminder_same_day',
        )
        self.assertEqual(notifications.count(), 1)

    def test_no_duplicate_notifications_on_rerun(self):
        """Test that re-running the reminder service doesn't send duplicates."""
        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(hours=12),
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        first_run = send_time_based_session_reminders()
        second_run = send_time_based_session_reminders()

        # Second run should send 0 notifications
        self.assertEqual(second_run, 0)

        # Only 2 notifications should exist total (24h and same-day if applicable)
        notifications = Notification.objects.filter(
            patient=self.patient_user,
            session_id=str(session.id),
        )
        # For a session 12 hours from now, we should get 24h reminder only
        self.assertLessEqual(notifications.count(), 2)

    def test_no_reminder_when_preference_disabled(self):
        """Test that no reminders are sent when patient has disabled them."""
        # Disable session reminders
        pref = NotificationPreference.objects.get(patient=self.patient_user)
        pref.session_reminders_enabled = False
        pref.save()

        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(hours=12),
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        sent_count = send_time_based_session_reminders()
        self.assertEqual(sent_count, 0)

        # No notifications should exist
        notifications = Notification.objects.filter(
            patient=self.patient_user,
            session_id=str(session.id),
        )
        self.assertEqual(notifications.count(), 0)

    def test_no_reminder_for_sessions_more_than_24_hours_away(self):
        """Test that no 24h reminder is sent for sessions more than 24 hours away."""
        session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(hours=48),
            status='UPCOMING',
            created_by=self.therapist_user,
        )

        sent_count = send_time_based_session_reminders()
        self.assertEqual(sent_count, 0)

        # No notifications should be sent
        notifications = Notification.objects.filter(
            patient=self.patient_user,
            session_id=str(session.id),
        )
        self.assertEqual(notifications.count(), 0)
