from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from patients.models import Notification
from patients.services.notification_center import (
    MAX_WEBSOCKET_DELIVERY_ATTEMPTS,
    retry_notification_delivery,
)


class Command(BaseCommand):
    help = "Retry websocket delivery for failed/pending notifications that are due."

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=200,
            help='Maximum notifications to process in one run (default: 200).',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        limit = options['limit']

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

        self.stdout.write(
            self.style.SUCCESS(
                f"Retry complete: attempted={attempted}, succeeded={succeeded}, failed={failed}"
            )
        )
