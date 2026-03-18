from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import PatientProfile, TherapistProfile

from .models import Session

User = get_user_model()


class PatientSessionCreationRemovedTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.therapist_user = User.objects.create_user(
            username='therapist-disable-test',
            email='therapist-disable@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Ayesha',
            last_name='Khan',
        )
        self.therapist_profile = TherapistProfile.objects.create(
            user=self.therapist_user,
            license_number='LIC-DISABLE-001',
            specialization='CBT',
        )

        self.patient_user = User.objects.create_user(
            username='patient-disable-test',
            email='patient-disable@example.com',
            password='testpass123',
            user_type='patient',
            first_name='Ali',
            last_name='Raza',
        )
        PatientProfile.objects.create(
            user=self.patient_user,
            therapist=self.therapist_profile,
            connected_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.patient_user)

    def test_patient_booking_endpoint_is_removed(self):
        response = self.client.post(
            '/api/therapy_sessions/booking/book/',
            {
                'therapist_id': str(self.therapist_user.id),
                'slot_start': (timezone.now() + timedelta(days=2)).isoformat(),
                'duration_minutes': 60,
                'is_online': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Session.objects.count(), 0)

    def test_patient_emergency_endpoint_is_removed(self):
        response = self.client.post(
            '/api/therapy_sessions/booking/emergency/',
            {
                'therapist_id': str(self.therapist_user.id),
                'reason': 'Need urgent support',
                'is_online': True,
                'preferred_date': (timezone.now() + timedelta(days=1)).isoformat(),
            },
            format='json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Session.objects.count(), 0)
