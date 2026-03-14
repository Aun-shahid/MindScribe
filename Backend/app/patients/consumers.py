import json
import uuid
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .services.notification_center import get_user_notification_group
from .models import Notification


class NotificationConsumer(AsyncWebsocketConsumer):
    @staticmethod
    def _normalize_token(raw_token):
        if not raw_token:
            return None
        token = str(raw_token).strip()
        if token.lower().startswith('bearer '):
            token = token[7:].strip()
        return token or None

    @database_sync_to_async
    def _get_user_from_token(self, raw_token):
        token = self._normalize_token(raw_token)
        if not token:
            return None

        try:
            validated = AccessToken(token)
        except (InvalidToken, TokenError):
            return None

        user_id = validated.get('user_id')
        if not user_id:
            return None

        User = get_user_model()
        return User.objects.filter(id=user_id).first()

    def _extract_token_from_query(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_values = (
            query_params.get('token')
            or query_params.get('access_token')
            or query_params.get('jwt')
            or query_params.get('authorization')
        )
        if not token_values:
            return None
        return self._normalize_token(token_values[0])

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            raw_token = self._extract_token_from_query()
            user = await self._get_user_from_token(raw_token)

        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.user = user
        self.group_name = get_user_notification_group(user.id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send(
            text_data=json.dumps(
                {
                    "event": "notification.socket.connected",
                    "user_id": str(user.id),
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if payload.get("event") == "ping":
            await self.send(text_data=json.dumps({"event": "pong"}))
            return

        if payload.get("event") == "notification.delivered":
            await self._handle_delivery_ack(payload)

    @database_sync_to_async
    def _mark_notification_delivered(self, notification_id):
        notification = Notification.objects.filter(id=notification_id, patient=self.user).first()
        if not notification:
            return False
        notification.mark_as_delivered()
        return True

    async def _handle_delivery_ack(self, payload):
        notification_id = payload.get("notification_id")
        if not notification_id:
            await self.send(text_data=json.dumps({
                "event": "notification.delivery.ack",
                "ok": False,
                "reason": "missing_notification_id",
            }))
            return

        try:
            notification_uuid = uuid.UUID(str(notification_id))
        except ValueError:
            await self.send(text_data=json.dumps({
                "event": "notification.delivery.ack",
                "ok": False,
                "reason": "invalid_notification_id",
            }))
            return

        marked = await self._mark_notification_delivered(notification_uuid)
        await self.send(text_data=json.dumps({
            "event": "notification.delivery.ack",
            "ok": bool(marked),
            "notification_id": str(notification_uuid),
        }))

    async def notification_event(self, event):
        await self.send(text_data=json.dumps(event.get("payload", {})))
