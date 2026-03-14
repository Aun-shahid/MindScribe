import re
from django.db.models import Q

MOOD_NOTIFICATION_CATEGORY = 'mood'
SESSION_NOTIFICATION_CATEGORY = 'session'
OTHER_NOTIFICATION_CATEGORY = 'other'
VALID_NOTIFICATION_CATEGORIES = {
    MOOD_NOTIFICATION_CATEGORY,
    SESSION_NOTIFICATION_CATEGORY,
    OTHER_NOTIFICATION_CATEGORY,
}

_SESSION_NOTIFICATION_TYPES = {
    'session_reminder',
    'session_summary',
    'session_approved',
    'session_cancelled',
}

_PATIENT_ID_PATTERN = re.compile(r'/patients/(?P<patient_id>[0-9a-fA-F-]{32,36})/')


def get_notification_category(notification):
    notification_type = (getattr(notification, 'notification_type', '') or '').lower()
    action_url = (getattr(notification, 'action_url', '') or '').lower()
    title = (getattr(notification, 'title', '') or '').lower()
    message = (getattr(notification, 'message', '') or '').lower()

    if (
        notification_type == 'mood_reminder'
        or '/mood' in action_url
        or 'mood alert' in title
        or 'mood trend' in title
        or 'mood' in title
        or 'mood' in message
    ):
        return MOOD_NOTIFICATION_CATEGORY

    if (
        notification_type in _SESSION_NOTIFICATION_TYPES
        or getattr(notification, 'session_id', None) is not None
        or '/therapy/sessions/' in action_url
        or action_url.startswith('/sessions')
        or 'session' in title
        or 'session' in message
    ):
        return SESSION_NOTIFICATION_CATEGORY

    return OTHER_NOTIFICATION_CATEGORY


def build_notification_category_q(category):
    category = (category or '').strip().lower()
    if category == MOOD_NOTIFICATION_CATEGORY:
        return (
            Q(notification_type='mood_reminder')
            | Q(action_url__icontains='/mood')
            | Q(title__icontains='mood')
            | Q(message__icontains='mood')
        )

    if category == SESSION_NOTIFICATION_CATEGORY:
        return (
            Q(notification_type__in=list(_SESSION_NOTIFICATION_TYPES))
            | Q(session_id__isnull=False)
            | Q(action_url__icontains='/therapy/sessions/')
            | Q(action_url__startswith='/sessions')
            | Q(title__icontains='session')
            | Q(message__icontains='session')
        )

    if category == OTHER_NOTIFICATION_CATEGORY:
        return ~(build_notification_category_q(MOOD_NOTIFICATION_CATEGORY) | build_notification_category_q(SESSION_NOTIFICATION_CATEGORY))

    return Q()


def apply_notification_category_filter(queryset, category):
    category = (category or '').strip().lower()
    if category not in VALID_NOTIFICATION_CATEGORIES:
        return queryset
    return queryset.filter(build_notification_category_q(category))


def extract_patient_id_from_notification(notification):
    action_url = getattr(notification, 'action_url', '') or ''
    match = _PATIENT_ID_PATTERN.search(action_url)
    if match:
        return match.group('patient_id')
    return None


def build_therapist_notification_summary(queryset):
    mood_queryset = apply_notification_category_filter(queryset, MOOD_NOTIFICATION_CATEGORY)
    session_queryset = apply_notification_category_filter(queryset, SESSION_NOTIFICATION_CATEGORY)
    other_queryset = apply_notification_category_filter(queryset, OTHER_NOTIFICATION_CATEGORY)

    mood_notifications = list(mood_queryset.only('id', 'action_url', 'is_read'))
    mood_patient_ids = {patient_id for patient_id in (extract_patient_id_from_notification(n) for n in mood_notifications) if patient_id}

    return {
        'total_notifications': queryset.count(),
        'unread_notifications': queryset.filter(is_read=False).count(),
        'session_notifications': session_queryset.count(),
        'session_unread_notifications': session_queryset.filter(is_read=False).count(),
        'mood_notifications': len(mood_notifications),
        'mood_unread_notifications': mood_queryset.filter(is_read=False).count(),
        'mood_alert_patients': len(mood_patient_ids),
        'other_notifications': other_queryset.count(),
        'tabs': {
            'session': {'category': SESSION_NOTIFICATION_CATEGORY},
            'mood': {'category': MOOD_NOTIFICATION_CATEGORY},
        },
    }
