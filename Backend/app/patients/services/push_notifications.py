import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..models import NotificationDevice, NotificationPreference

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = os.environ.get('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send')
EXPO_ACCESS_TOKEN = os.environ.get('EXPO_ACCESS_TOKEN', '').strip()
EXPO_ANDROID_CHANNEL_ID = os.environ.get('EXPO_ANDROID_CHANNEL_ID', 'default').strip() or 'default'


PREFERENCE_FIELD_BY_TYPE = {
    'session_reminder': 'session_reminders_enabled',
    'session_summary': 'session_summary_enabled',
    'session_approved': 'session_approved_enabled',
    'session_cancelled': 'session_cancelled_enabled',
    'goal_reminder': 'goal_reminders_enabled',
    'mood_reminder': 'mood_reminder_enabled',
    'journal_reminder': 'journal_reminder_enabled',
    'therapist_message': 'therapist_messages_enabled',
}


def _is_push_allowed_for_recipient(recipient, notification_type):
    if recipient.user_type != 'patient':
        return True

    preference_field = PREFERENCE_FIELD_BY_TYPE.get(notification_type)
    if not preference_field:
        return True

    try:
        prefs = NotificationPreference.objects.get(patient=recipient)
    except NotificationPreference.DoesNotExist:
        return True

    return bool(getattr(prefs, preference_field, True))


def _deactivate_token_if_invalid(token_obj, ticket):
    status = ticket.get('status')
    if status != 'error':
        return

    details = ticket.get('details') or {}
    if details.get('error') == 'DeviceNotRegistered':
        token_obj.is_active = False
        token_obj.save(update_fields=['is_active', 'updated_at'])


def _send_expo_request(payload, use_auth=True):
    request = Request(
        EXPO_PUSH_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            **({'Authorization': f'Bearer {EXPO_ACCESS_TOKEN}'} if (use_auth and EXPO_ACCESS_TOKEN) else {}),
        },
        method='POST',
    )

    with urlopen(request, timeout=8) as response:
        raw = response.read().decode('utf-8')
        parsed = json.loads(raw) if raw else {}
        return parsed


def _send_single_expo_push(token, title, message, data=None):
    payload = {
        'to': token,
        'title': title,
        'body': message,
        'sound': 'default',
        'priority': 'high',
        'channelId': EXPO_ANDROID_CHANNEL_ID,
        'badge': 1,
        'color': '#FF6B9D',
        'mutableContent': True,
        'categoryId': 'notification',
        'data': data or {},
    }

    try:
        return _send_expo_request(payload, use_auth=True)
    except HTTPError as exc:
        # Some projects do not enforce access-token auth; retry once without auth
        # when a stale/wrong EXPO_ACCESS_TOKEN causes 401/403.
        if EXPO_ACCESS_TOKEN and exc.code in (401, 403):
            logger.warning(
                'Expo push auth failed (%s). Retrying once without Authorization header.',
                exc.code,
            )
            return _send_expo_request(payload, use_auth=False)
        raise


def send_push_for_notification(*, recipient, notification_type, title, message, metadata=None):
    if not _is_push_allowed_for_recipient(recipient, notification_type):
        return {
            'attempted': False,
            'reason': 'push_disabled_by_preference',
            'success_count': 0,
            'failure_count': 0,
        }

    tokens = list(NotificationDevice.objects.filter(user=recipient, is_active=True))
    if not tokens:
        return {
            'attempted': False,
            'reason': 'no_active_device_tokens',
            'success_count': 0,
            'failure_count': 0,
        }

    success_count = 0
    failure_count = 0
    errors = []

    for token_obj in tokens:
        try:
            response_payload = _send_single_expo_push(
                token=token_obj.expo_push_token,
                title=title,
                message=message,
                data={
                    'notification_type': notification_type,
                    **(metadata or {}),
                },
            )

            ticket = (response_payload.get('data') or {}) if isinstance(response_payload, dict) else {}
            if ticket.get('status') == 'ok':
                success_count += 1
            else:
                failure_count += 1
                _deactivate_token_if_invalid(token_obj, ticket)
                errors.append({
                    'token_id': str(token_obj.id),
                    'error': ticket.get('message') or 'expo_push_error',
                })
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            failure_count += 1
            errors.append({'token_id': str(token_obj.id), 'error': str(exc)})
            logger.warning('Expo push failed for user %s token %s: %s', recipient.id, token_obj.id, exc)
        except Exception as exc:
            failure_count += 1
            errors.append({'token_id': str(token_obj.id), 'error': str(exc)})
            logger.exception('Unexpected push failure for user %s token %s', recipient.id, token_obj.id)

    return {
        'attempted': True,
        'reason': None,
        'success_count': success_count,
        'failure_count': failure_count,
        'errors': errors,
    }
