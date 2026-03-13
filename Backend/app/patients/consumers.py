import json

from channels.generic.websocket import AsyncWebsocketConsumer

from .services.notification_center import get_user_notification_group


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
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

    async def notification_event(self, event):
        await self.send(text_data=json.dumps(event.get("payload", {})))
