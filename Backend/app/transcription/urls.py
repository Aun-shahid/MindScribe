from django.urls import path
from .views import StartRealtimeTranscriptionView, RealtimeWebhookView, CloseRealtimeTranscriptionView

urlpatterns = [
    path('sessions/<uuid:session_id>/realtime/start/', StartRealtimeTranscriptionView.as_view(), name='start_realtime_transcription'),
    path('sessions/<uuid:session_id>/realtime/webhook/', RealtimeWebhookView.as_view(), name='realtime_transcription_webhook'),
    path('sessions/<uuid:session_id>/realtime/close/', CloseRealtimeTranscriptionView.as_view(), name='close_realtime_transcription'),
]
