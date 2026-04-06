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


class StartSessionConsentRequirementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.therapist_user = User.objects.create_user(
            username='therapist-consent-test',
            email='therapist-consent@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Ayesha',
            last_name='Khan',
        )
        self.therapist_profile = TherapistProfile.objects.create(
            user=self.therapist_user,
            license_number='LIC-CONSENT-001',
            specialization='CBT',
        )

        self.patient_user = User.objects.create_user(
            username='patient-consent-test',
            email='patient-consent@example.com',
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

        self.session = Session.objects.create(
            patient=self.patient_user,
            therapist=self.therapist_user,
            session_type='individual',
            scheduled_date=timezone.now() + timedelta(days=1),
            duration_minutes=60,
            location='Clinic Room 1',
            status='UPCOMING',
            consent_recording=True,
            consent_ai_analysis=False,
            created_by=self.therapist_user,
        )

    def test_start_session_requires_both_consents(self):
        self.client.force_authenticate(user=self.therapist_user)

        response = self.client.post(
            f'/api/therapy_sessions/sessions/{self.session.id}/start/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'UPCOMING')


class TherapistPatientsListConnectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.primary_therapist_user = User.objects.create_user(
            username='therapist-primary-list',
            email='therapist-primary-list@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Primary',
            last_name='Therapist',
        )
        self.primary_therapist_profile = TherapistProfile.objects.create(
            user=self.primary_therapist_user,
            license_number='LIC-LIST-001',
            specialization='CBT',
        )

        self.secondary_therapist_user = User.objects.create_user(
            username='therapist-secondary-list',
            email='therapist-secondary-list@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Secondary',
            last_name='Therapist',
        )
        self.secondary_therapist_profile = TherapistProfile.objects.create(
            user=self.secondary_therapist_user,
            license_number='LIC-LIST-002',
            specialization='DBT',
        )

        self.patient_user = User.objects.create_user(
            username='list-connection-patient',
            email='list-connection-patient@example.com',
            password='testpass123',
            user_type='patient',
            first_name='Connected',
            last_name='Patient',
        )
        self.patient_profile = PatientProfile.objects.create(
            user=self.patient_user,
            therapist=self.primary_therapist_profile,
            connected_at=timezone.now(),
        )
        self.patient_profile.connect_to_therapist(self.secondary_therapist_profile, connected_at=timezone.now())

    def test_therapist_patients_list_includes_connection_table_patients(self):
        self.client.force_authenticate(user=self.secondary_therapist_user)

        response = self.client.get('/api/therapy_sessions/patients/')

        self.assertEqual(response.status_code, 200)
        patient_ids = [str(item['id']) for item in response.data]
        self.assertIn(str(self.patient_user.id), patient_ids)

        patient_entry = next(item for item in response.data if str(item['id']) == str(self.patient_user.id))
        self.assertEqual(
            str(patient_entry['patient_profile']['connected_at']),
            str(self.patient_profile.therapist_connections.get(therapist=self.secondary_therapist_profile).connected_at),
        )
