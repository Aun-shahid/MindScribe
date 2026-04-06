from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ConnectionRequest, PatientProfile, TherapistProfile, PatientTherapistConnection


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


class MultiTherapistConnectionRequestTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.current_therapist_user = User.objects.create_user(
			username='current-therapist',
			email='current-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Current',
			last_name='Therapist',
		)
		self.current_therapist_profile = TherapistProfile.objects.create(
			user=self.current_therapist_user,
			license_number='LIC-MULTI-001',
			specialization='CBT',
		)

		self.new_therapist_user = User.objects.create_user(
			username='new-therapist',
			email='new-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='New',
			last_name='Therapist',
		)
		self.new_therapist_profile = TherapistProfile.objects.create(
			user=self.new_therapist_user,
			license_number='LIC-MULTI-002',
			specialization='DBT',
		)

		self.patient_user = User.objects.create_user(
			username='multi-therapist-patient',
			email='multi-therapist-patient@example.com',
			password='testpass123',
			user_type='patient',
			first_name='Ali',
			last_name='Raza',
		)
		PatientProfile.objects.create(
			user=self.patient_user,
			therapist=self.current_therapist_profile,
			connected_at=timezone.now(),
		)

	def test_connected_patient_can_request_another_therapist(self):
		self.client.force_authenticate(user=self.patient_user)

		response = self.client.post(
			'/api/users/connect-therapist/',
			{'therapist_pin': self.new_therapist_profile.therapist_pin, 'message': 'Need a second opinion'},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		request = ConnectionRequest.objects.filter(
			patient_user=self.patient_user,
			therapist=self.new_therapist_profile,
			status='pending',
		).first()
		self.assertIsNotNone(request)


class MultiTherapistConnectionBehaviorTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.primary_therapist_user = User.objects.create_user(
			username='primary-therapist',
			email='primary-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Primary',
			last_name='Therapist',
		)
		self.primary_therapist_profile = TherapistProfile.objects.create(
			user=self.primary_therapist_user,
			license_number='LIC-MULTI-BEH-001',
			specialization='CBT',
		)

		self.secondary_therapist_user = User.objects.create_user(
			username='secondary-therapist',
			email='secondary-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Secondary',
			last_name='Therapist',
		)
		self.secondary_therapist_profile = TherapistProfile.objects.create(
			user=self.secondary_therapist_user,
			license_number='LIC-MULTI-BEH-002',
			specialization='ACT',
		)

		self.patient_user = User.objects.create_user(
			username='multi-behavior-patient',
			email='multi-behavior-patient@example.com',
			password='testpass123',
			user_type='patient',
			first_name='Patient',
			last_name='User',
		)
		self.patient_profile = PatientProfile.objects.create(
			user=self.patient_user,
			therapist=self.primary_therapist_profile,
			connected_at=timezone.now(),
		)
		self.patient_profile.connect_to_therapist(self.primary_therapist_profile)

	def test_accepting_second_therapist_keeps_primary_and_adds_new_connection(self):
		connection_request = ConnectionRequest.objects.create(
			patient_user=self.patient_user,
			therapist=self.secondary_therapist_profile,
			status='pending',
		)

		self.client.force_authenticate(user=self.secondary_therapist_user)
		response = self.client.post(f'/api/users/connection-requests/{connection_request.id}/', {}, format='json')

		self.assertEqual(response.status_code, 200)
		self.patient_profile.refresh_from_db()
		self.assertEqual(self.patient_profile.therapist, self.primary_therapist_profile)
		self.assertTrue(
			PatientTherapistConnection.objects.filter(
				patient=self.patient_profile,
				therapist=self.primary_therapist_profile,
			).exists()
		)
		self.assertTrue(
			PatientTherapistConnection.objects.filter(
				patient=self.patient_profile,
				therapist=self.secondary_therapist_profile,
			).exists()
		)

	def test_patient_disconnects_only_selected_therapist(self):
		self.patient_profile.connect_to_therapist(self.secondary_therapist_profile)

		self.client.force_authenticate(user=self.patient_user)
		response = self.client.post(
			'/api/users/disconnect-therapist/',
			{'therapist_id': str(self.secondary_therapist_user.id)},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.patient_profile.refresh_from_db()
		self.assertEqual(self.patient_profile.therapist, self.primary_therapist_profile)
		self.assertTrue(
			PatientTherapistConnection.objects.filter(
				patient=self.patient_profile,
				therapist=self.primary_therapist_profile,
			).exists()
		)
		self.assertFalse(
			PatientTherapistConnection.objects.filter(
				patient=self.patient_profile,
				therapist=self.secondary_therapist_profile,
			).exists()
		)


class PatientProfileResilienceTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.patient_user = User.objects.create_user(
			username='patient-profile-resilience',
			email='patient-profile-resilience@example.com',
			password='testpass123',
			user_type='patient',
			first_name='Resilient',
			last_name='Patient',
		)
		self.therapist_user = User.objects.create_user(
			username='resilience-therapist',
			email='resilience-therapist@example.com',
			password='testpass123',
			user_type='therapist',
			first_name='Calm',
			last_name='Therapist',
		)
		self.therapist_profile = TherapistProfile.objects.create(
			user=self.therapist_user,
			license_number='LIC-RESILIENCE-001',
			specialization='CBT',
		)
		PatientProfile.objects.create(
			user=self.patient_user,
			therapist=self.therapist_profile,
			connected_at=timezone.now(),
		)

	def test_patient_profile_get_returns_200_when_connected_links_query_fails(self):
		self.client.force_authenticate(user=self.patient_user)

		with patch(
			'users.models.PatientProfile.get_connected_therapist_links',
			side_effect=DatabaseError('relation "patient_therapist_connections" does not exist'),
		):
			response = self.client.get('/api/users/patient-profile/')

		self.assertEqual(response.status_code, 200)
		self.assertIn('therapist_info', response.data)
		self.assertEqual(response.data.get('connected_therapists'), [])
