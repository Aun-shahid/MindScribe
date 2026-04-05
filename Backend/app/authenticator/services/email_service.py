import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


logger = logging.getLogger(__name__)


class ResendEmailService:
	API_URL = "https://api.resend.com/emails"

	@classmethod
	def _headers(cls):
		return {
			"Authorization": f"Bearer {settings.RESEND_API_KEY}",
			"Content-Type": "application/json",
			"User-Agent": "MindScribe-Django-Client/1.0",
		}

	@classmethod
	def is_configured(cls):
		return bool(getattr(settings, "RESEND_API_KEY", ""))

	@classmethod
	def send_email(cls, to_email, subject, text, html=None):
		if not cls.is_configured():
			logger.warning("Resend email skipped: RESEND_API_KEY is not configured")
			return False, "RESEND_API_KEY is not configured"

		from_email = (
			getattr(settings, "EMAIL_FROM", "")
			or getattr(settings, "DEFAULT_FROM_EMAIL", "")
			or "info@mindscribe.live"
		)

		payload = {
			"from": from_email,
			"to": [to_email],
			"subject": subject,
			"text": text,
		}

		if html:
			payload["html"] = html

		data = json.dumps(payload).encode("utf-8")
		request = Request(cls.API_URL, data=data, headers=cls._headers(), method="POST")

		try:
			with urlopen(request, timeout=15) as response:
				status_code = response.getcode()
				if 200 <= status_code < 300:
					return True, "Email sent successfully"
				return False, f"Unexpected status code: {status_code}"
		except HTTPError as exc:
			response_text = exc.read().decode("utf-8", errors="ignore")
			logger.error("Resend HTTP error %s: %s", exc.code, response_text)
			return False, f"Resend HTTP error {exc.code}"
		except URLError as exc:
			logger.error("Resend URL error: %s", str(exc))
			return False, "Resend network error"
		except Exception as exc:
			logger.exception("Unexpected error while sending email via Resend")
			return False, str(exc)

	@classmethod
	def send_password_reset_email(cls, user, token):
		# Enforce a single canonical patient deep link for reset emails.
		reset_link = f"https://www.mindscribe.live/patient/reset-password?token={token}"
		subject = "🔐 Reset Your MindScribe Password"
		text = (
			f"Hi {user.first_name or user.username},\n\n"
			"You requested a password reset. Click the link below to set a new password:\n\n"
			f"{reset_link}\n\n"
			"If you did not request this, you can ignore this email."
		)
		return cls.send_email(user.email, subject, text)

	@classmethod
	def send_verification_email(cls, user, code):
		subject = "✅ Verify your MindScribe email"
		text = (
			f"Hi {user.first_name or user.username},\n\n"
			"Welcome to MindScribe! Use the 6-digit code below to verify your email address:\n\n"
			f"{code}\n\n"
			"This code expires in 24 hours."
		)
		return cls.send_email(user.email, subject, text)
