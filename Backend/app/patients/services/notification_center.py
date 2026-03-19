import logging
import uuid
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from ..models import Notification
from .push_notifications import send_push_for_notification

logger = logging.getLogger(__name__)


def get_user_notification_group(user_id):
    return f"notifications_user_{user_id}"


def _serialize_notification(notification):
    return {
        "id": str(notification.id),
        "notification_type": notification.notification_type,
        "type": "info",
        "title": notification.title,
        "message": notification.message,
        "session_id": str(notification.session_id) if notification.session_id else None,
        "relatedEntityId": str(notification.session_id) if notification.session_id else (str(notification.goal_id) if notification.goal_id else None),
        "goal_id": str(notification.goal_id) if notification.goal_id else None,
        "action_url": notification.action_url,
        "is_read": notification.is_read,
        "read": notification.is_read,
        "delivery_status": notification.delivery_status,
        "delivery_attempts": notification.delivery_attempts,
        "last_delivery_attempt_at": notification.last_delivery_attempt_at.isoformat() if notification.last_delivery_attempt_at else None,
        "next_retry_at": notification.next_retry_at.isoformat() if notification.next_retry_at else None,
        "delivered_at": notification.delivered_at.isoformat() if notification.delivered_at else None,
        "delivery_error": notification.delivery_error,
        "sent_at": notification.sent_at.isoformat() if notification.sent_at else timezone.now().isoformat(),
        "createdAt": notification.sent_at.isoformat() if notification.sent_at else timezone.now().isoformat(),
    }


def build_notification_payload(
    *,
    recipient,
    notification_type,
    title,
    message,
    action_url=None,
    session_id=None,
    goal_id=None,
    priority="normal",
    source_event="system",
    metadata=None,
    persisted_notification=None,
    notification_level="info",
    related_entity_id=None,
):
    payload = {
        "event": "notification.created",
        "event_id": str(uuid.uuid4()),
        "created_at": timezone.now().isoformat(),
        "createdAt": timezone.now().isoformat(),
        "recipientId": str(recipient.id),
        "recipient": {
            "id": str(recipient.id),
            "name": recipient.full_name,
            "user_type": recipient.user_type,
        },
        "notification": {
            "id": str(persisted_notification.id) if persisted_notification else None,
            "notification_type": notification_type,
            "type": notification_level,
            "title": title,
            "message": message,
            "session_id": str(session_id) if session_id else None,
            "goal_id": str(goal_id) if goal_id else None,
            "relatedEntityId": related_entity_id,
            "action_url": action_url,
            "read": False,
            "priority": priority,
            "source_event": source_event,
            "metadata": metadata or {},
        },
    }

    if persisted_notification:
        payload["notification"]["db_record"] = _serialize_notification(persisted_notification)

    return payload


def push_notification_to_websocket(recipient, payload):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return False, "channel_layer_unavailable"

    group_name = get_user_notification_group(recipient.id)
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.event",
                "payload": payload,
            },
        )
    except Exception as exc:
        return False, str(exc)

    return True, None


def _record_delivery_result(notification, success, error_message=None):
    if not notification:
        return

    if success:
        notification.mark_delivery_attempt(
            status=Notification.DELIVERY_STATUS_SENT,
            error_message=None,
            next_retry_at=None,
        )
        return

    notification.mark_delivery_attempt(
        status=Notification.DELIVERY_STATUS_FAILED,
        error_message=error_message or "websocket_delivery_failed",
        next_retry_at=None,
    )


def create_notification(
    *,
    recipient,
    notification_type,
    title,
    message,
    action_url=None,
    session_id=None,
    goal_id=None,
    priority="normal",
    source_event="system",
    metadata=None,
    persist=True,
    send_realtime=True,
    notification_level="info",
    related_entity_id=None,
):
    persisted_notification = None

    if persist:
        persisted_notification = Notification.objects.create(
            patient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            session_id=session_id,
            goal_id=goal_id,
            action_url=action_url,
        )

    payload = build_notification_payload(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        action_url=action_url,
        session_id=session_id,
        goal_id=goal_id,
        priority=priority,
        source_event=source_event,
        metadata=metadata,
        persisted_notification=persisted_notification,
        notification_level=notification_level,
        related_entity_id=related_entity_id,
    )

    websocket_delivered = False
    websocket_error = None
    push_result = {
        "attempted": False,
        "reason": "send_realtime_disabled",
        "success_count": 0,
        "failure_count": 0,
    }
    if send_realtime:
        try:
            websocket_delivered, websocket_error = push_notification_to_websocket(recipient, payload)
        except Exception as exc:
            websocket_error = str(exc)
            logger.exception("Failed to push realtime notification: %s", exc)

        _record_delivery_result(persisted_notification, websocket_delivered, websocket_error)

        try:
            push_result = send_push_for_notification(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                message=message,
                metadata=metadata,
            )
        except Exception as exc:
            logger.exception("Failed to send push notification: %s", exc)
            push_result = {
                "attempted": True,
                "reason": "push_send_exception",
                "success_count": 0,
                "failure_count": 1,
                "errors": [{"error": str(exc)}],
            }

    return {
        "notification": persisted_notification,
        "payload": payload,
        "websocket_delivered": websocket_delivered,
        "websocket_error": websocket_error,
        "push": push_result,
    }
