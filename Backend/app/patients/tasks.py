from celery import shared_task
from django.db.models import Q
from django.utils import timezone

from patients.models import Notification
from patients.services.notification_center import (
    MAX_WEBSOCKET_DELIVERY_ATTEMPTS,
    retry_notification_delivery,
)
from patients.services.notification_service import (
    retry_failed_push_notifications,
    send_journal_reminder_notifications,
    send_mood_reminder_notifications,
    send_session_reminder_notifications,
)


@shared_task(name='patients.tasks.send_session_reminder_notifications_task')
def send_session_reminder_notifications_task():
    return send_session_reminder_notifications()


@shared_task(name='patients.tasks.send_mood_reminder_notifications_task')
def send_mood_reminder_notifications_task():
    return send_mood_reminder_notifications()


@shared_task(name='patients.tasks.send_journal_reminder_notifications_task')
def send_journal_reminder_notifications_task():
    return send_journal_reminder_notifications()


@shared_task(name='patients.tasks.retry_failed_push_notifications_task')
def retry_failed_push_notifications_task(max_to_process=200, dead_letter_after_hours=24):
    return retry_failed_push_notifications(
        max_to_process=max_to_process,
        dead_letter_after_hours=dead_letter_after_hours,
    )


@shared_task(name='patients.tasks.retry_failed_websocket_notifications_task')
def retry_failed_websocket_notifications_task(limit=200):
    now = timezone.now()

    queryset = Notification.objects.filter(
        delivery_attempts__lt=MAX_WEBSOCKET_DELIVERY_ATTEMPTS
    ).filter(
        Q(
            delivery_status__in=[
                Notification.DELIVERY_STATUS_PENDING,
                Notification.DELIVERY_STATUS_FAILED,
            ],
            next_retry_at__isnull=True,
        )
        | Q(
            delivery_status=Notification.DELIVERY_STATUS_FAILED,
            next_retry_at__lte=now,
        )
    )

    notifications = queryset.order_by('sent_at')[: max(1, int(limit))]

    attempted = 0
    succeeded = 0
    failed = 0

    for notification in notifications:
        attempted += 1
        if retry_notification_delivery(notification):
            succeeded += 1
        else:
            failed += 1

    return {
        'attempted': attempted,
        'succeeded': succeeded,
        'failed': failed,
    }
