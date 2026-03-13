"""
ASGI config for app project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Set settings module before any other imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from therapy_sessions.routing import websocket_urlpatterns as therapy_websocket_urlpatterns
from patients.routing import websocket_urlpatterns as patient_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            therapy_websocket_urlpatterns + patient_websocket_urlpatterns
        )
    ),
})
