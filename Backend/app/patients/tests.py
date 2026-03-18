from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from therapy_sessions.models import Session
from users.models import PatientProfile, TherapistProfile

from .models import Notification
from .services.notification_service import send_therapist_upcoming_session_notifications

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

        first_run_count = send_therapist_upcoming_session_notifications()
        second_run_count = send_therapist_upcoming_session_notifications()

        self.assertEqual(first_run_count, 1)
        self.assertEqual(second_run_count, 0)

        notifications = Notification.objects.filter(
            patient=self.therapist_user,
            session_id=session.id,
            notification_type='session_reminder',
        )
        self.assertEqual(notifications.count(), 1)

        reminder = notifications.first()
        self.assertEqual(reminder.title, 'Upcoming Session Approaching')
        self.assertIn('Review prior notes and prepare', reminder.message)
        self.assertIn(self.patient_user.full_name, reminder.message)
