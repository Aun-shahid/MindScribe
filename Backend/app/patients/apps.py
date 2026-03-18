from django.apps import AppConfig


class PatientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'patients'

    def ready(self):
        from .services.reminder_scheduler import start_reminder_scheduler

        start_reminder_scheduler()
