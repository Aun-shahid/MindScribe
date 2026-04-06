from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import EmailVerificationToken


User = get_user_model()


class EmailVerificationLoginTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.password = 'testpass123'
		self.user = User.objects.create_user(
			username='email-verification-user',
			email='verify-me@example.com',
			password=self.password,
			user_type='patient',
			first_name='Test',
			last_name='User',
		)

	def test_login_is_blocked_until_email_is_verified(self):
		response = self.client.post(
			'/api/authenticator/login/',
			{'email': self.user.email, 'password': self.password},
			format='json',
		)

		self.assertEqual(response.status_code, 403)
		self.assertEqual(response.data['detail'], 'Please verify your email before logging in.')

	def test_verification_code_allows_login(self):
		EmailVerificationToken.objects.create(
			user=self.user,
			verification_code='123456',
			token='11111111-1111-1111-1111-111111111111',
		)

		verify_response = self.client.post(
			'/api/authenticator/verify-email/',
			{'code': '123456'},
			format='json',
		)

		self.assertEqual(verify_response.status_code, 200)

		login_response = self.client.post(
			'/api/authenticator/login/',
			{'email': self.user.email, 'password': self.password},
			format='json',
		)

		self.assertEqual(login_response.status_code, 200)
		self.assertTrue(login_response.data['user']['email_verified'])
