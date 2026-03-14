import time

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from patients.models import Notification
from patients.services.notification_center import (
    MAX_WEBSOCKET_DELIVERY_ATTEMPTS,
    retry_notification_delivery,
)
from patients.services.notification_service import (
    send_journal_reminder_notifications,
    send_mood_reminder_notifications,
    send_session_reminder_notifications,
)


class Command(BaseCommand):
    help = "Run notification reminder scheduler loop (session/mood/journal) with optional websocket retry."

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run exactly one scheduler tick and exit.',
        )
        parser.add_argument(
            '--interval-seconds',
            type=int,
            default=60,
            help='Seconds between scheduler ticks in loop mode (default: 60).',
        )
        parser.add_argument(
            '--retry-websocket',
            action='store_true',
            help='Also retry failed/pending websocket deliveries each tick.',
        )
        parser.add_argument(
            '--retry-limit',
            type=int,
            default=200,
            help='Maximum websocket retries per tick when --retry-websocket is enabled.',
        )

    def _retry_websocket_due_notifications(self, limit):
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

        notifications = queryset.order_by('sent_at')[:limit]

        attempted = 0
        succeeded = 0
        failed = 0

        for notification in notifications:
            attempted += 1
            if retry_notification_delivery(notification):
                succeeded += 1
            else:
                failed += 1

        return attempted, succeeded, failed

    def _run_tick(self, retry_websocket=False, retry_limit=200):
        session_count = send_session_reminder_notifications()
        mood_count = send_mood_reminder_notifications()
        journal_count = send_journal_reminder_notifications()

        retry_attempted = 0
        retry_succeeded = 0
        retry_failed = 0
        if retry_websocket:
            retry_attempted, retry_succeeded, retry_failed = self._retry_websocket_due_notifications(retry_limit)

        timestamp = timezone.localtime(timezone.now()).strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(
            self.style.SUCCESS(
                f"[{timestamp}] Tick complete | session={session_count} mood={mood_count} "
                f"journal={journal_count} ws_retry_attempted={retry_attempted} "
                f"ws_retry_succeeded={retry_succeeded} ws_retry_failed={retry_failed}"
            )
        )

    def handle(self, *args, **options):
        once = options['once']
        interval_seconds = max(10, int(options['interval_seconds']))
        retry_websocket = options['retry_websocket']
        retry_limit = int(options['retry_limit'])

        if once:
            self._run_tick(retry_websocket=retry_websocket, retry_limit=retry_limit)
            return

        self.stdout.write(
            self.style.WARNING(
                f"Starting notification scheduler loop (interval={interval_seconds}s, retry_websocket={retry_websocket})"
            )
        )
        self.stdout.write(self.style.WARNING("Press Ctrl+C to stop."))

        try:
            while True:
                self._run_tick(retry_websocket=retry_websocket, retry_limit=retry_limit)
                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Notification scheduler stopped."))
