from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import PatientProfile, TherapistProfile


User = get_user_model()


class TherapistDisconnectPatientTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.therapist_user = User.objects.create_user(
			username='therapist-disconnect-test',
			email='therapist-disconnect@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Ayesha',
			last_name='Khan',
		)
		self.therapist_profile = TherapistProfile.objects.create(
			user=self.therapist_user,
			license_number='LIC-DISCONNECT-001',
			specialization='CBT',
		)

		self.patient_user = User.objects.create_user(
			username='patient-disconnect-test',
			email='patient-disconnect@example.com',
			password='testpass123',
			user_type='patient',
			first_name='Ali',
			last_name='Raza',
		)
		self.patient_profile = PatientProfile.objects.create(
			user=self.patient_user,
			therapist=self.therapist_profile,
			connected_at=timezone.now(),
		)

	def test_therapist_can_disconnect_patient_and_notify(self):
		self.client.force_authenticate(user=self.therapist_user)

		with patch('users.views.create_notification') as mock_create_notification:
			response = self.client.post(
				f'/api/users/disconnect-patient/{self.patient_user.id}/',
				{},
				format='json',
			)

		self.assertEqual(response.status_code, 200)
		self.patient_profile.refresh_from_db()
		self.assertIsNone(self.patient_profile.therapist)
		self.assertIsNone(self.patient_profile.connected_at)
		mock_create_notification.assert_called_once()

	def test_therapist_cannot_disconnect_unassigned_patient(self):
		other_therapist_user = User.objects.create_user(
			username='therapist-disconnect-other',
			email='therapist-disconnect-other@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Sara',
			last_name='Ahmed',
		)
		other_therapist_profile = TherapistProfile.objects.create(
			user=other_therapist_user,
			license_number='LIC-DISCONNECT-002',
			specialization='DBT',
		)

		self.client.force_authenticate(user=other_therapist_user)

		response = self.client.post(
			f'/api/users/disconnect-patient/{self.patient_user.id}/',
			{},
			format='json',
		)

		self.assertEqual(response.status_code, 404)
		self.patient_profile.refresh_from_db()
		self.assertEqual(self.patient_profile.therapist, self.therapist_profile)
		self.assertIsNotNone(self.patient_profile.connected_at)


class PatientDisconnectNotificationTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.therapist_user = User.objects.create_user(
			username='patient-disconnect-therapist',
			email='patient-disconnect-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Sara',
			last_name='Ahmed',
		)
		self.therapist_profile = TherapistProfile.objects.create(
			user=self.therapist_user,
			license_number='LIC-PDISCONNECT-001',
			specialization='CBT',
		)

		self.patient_user = User.objects.create_user(
			username='patient-disconnect-notify',
			email='patient-disconnect-notify@example.com',
			password='testpass123',
			user_type='patient',
			first_name='Ali',
			last_name='Raza',
		)
		self.patient_profile = PatientProfile.objects.create(
			user=self.patient_user,
			therapist=self.therapist_profile,
			connected_at=timezone.now(),
		)

	def test_patient_disconnect_notifies_therapist(self):
		self.client.force_authenticate(user=self.patient_user)

		with patch('users.views.create_notification') as mock_create_notification:
			response = self.client.post('/api/users/disconnect-therapist/', {}, format='json')

		self.assertEqual(response.status_code, 200)
		self.patient_profile.refresh_from_db()
		self.assertIsNone(self.patient_profile.therapist)
		self.assertIsNone(self.patient_profile.connected_at)
		mock_create_notification.assert_called_once()
		called_kwargs = mock_create_notification.call_args.kwargs
		self.assertEqual(called_kwargs['recipient'], self.therapist_user)
		self.assertEqual(called_kwargs['source_event'], 'patient.connection.disconnected')
