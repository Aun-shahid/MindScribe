"""
WebSocket routing for therapy sessions.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/therapy-session/(?P<room_id>[0-9a-f-]+)/$', consumers.TherapySessionConsumer.as_asgi()),
]