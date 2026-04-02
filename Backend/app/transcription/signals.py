from django.db.models.signals import post_save
from django.dispatch import receiver

from patients.models import Notification
from patients.services.notification_center import create_notification

from .models import Transcription


@receiver(post_save, sender=Transcription)
def notify_therapist_when_ai_outputs_ready(sender, instance: Transcription, **kwargs):
    """Notify therapist when AI outputs are ready for a completed transcription."""
    if instance.status != 'completed':
        return

    session = getattr(instance, 'session', None)
    if not session:
        return

    therapist = getattr(session, 'therapist', None)
    if not therapist:
        return

    already_notified = Notification.objects.filter(
        patient=therapist,
        notification_type='session_ai_ready',
        session_id=session.id,
    ).exists()
    if already_notified:
        return

    patient_name = getattr(getattr(session, 'patient', None), 'full_name', 'Patient')

    create_notification(
        recipient=therapist,
        notification_type='session_ai_ready',
        title='AI Session Outputs Ready',
        message=(
            f"AI outputs for {patient_name}'s session are ready. "
            "SOAP Notes, Emotional Profile, and AI Insights can now be reviewed."
        ),
        action_url=f"/sessions/{session.id}?tab=soap",
        session_id=session.id,
        source_event='session.ai_results_ready',
        metadata={
            'session_id': str(session.id),
            'patient_id': str(session.patient_id),
            'patient_name': patient_name,
            'ready_items': ['soap', 'emotional_profile', 'ai_insights'],
        },
    )
