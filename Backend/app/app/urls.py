from django.contrib import admin
from django.urls import path, include, re_path # Import re_path for regex and redirect
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.views.generic import RedirectView # Import RedirectView

urlpatterns = [
    # Redirect root URL to Swagger UI in DEBUG mode
    # This acts as your "homepage" for the API backend
    re_path(r'^$', RedirectView.as_view(url='/api/schema/swagger-ui/', permanent=False)),

    path("admin/", admin.site.urls),
    
    # API endpoints for your apps
    path("api/authenticator/", include("authenticator.urls")), # Updated to authenticator
    path("api/users/", include("users.urls")),
    path("api/therapy_sessions/", include("therapy_sessions.urls")), # Updated to therapy_sessions
    path("api/history/", include("history.urls")), # Patient history and tracking
    # path("api/transcription/", include("transcription.urls")),
    # path("api/soap/", include("soap.urls")),

    # OpenAPI/Swagger UI URLs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Only display Swagger UI in debug mode (controlled by SPECTACULAR_SETTINGS['SERVE_INCLUDE_SCHEMA'])
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]