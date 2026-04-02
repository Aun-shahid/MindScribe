from django.apps import AppConfig


class TranscriptionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "transcription"

    def ready(self):
        # Ensure model signals are registered when Django boots.
        from . import signals  # noqa: F401
