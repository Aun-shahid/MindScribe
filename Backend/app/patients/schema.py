"""
Centralized OpenAPI/Swagger configuration for Patient module
"""

# API Tags for Swagger UI organization
class PatientAPITags:
    """Centralized tag constants for patient API endpoints"""
    DASHBOARD = 'Patient - Dashboard'
    MOOD = 'Patient - Mood Tracking'
    JOURNAL = 'Patient - Journal'
    EMOTIONS = 'Patient - Emotional Exploration'
    RELAXATION = 'Patient - Relaxation & Wellness'
    GOALS = 'Patient - Goals & Progress'
    WELLNESS = 'Patient - Wellness'


# Tag descriptions for Swagger UI
PATIENT_API_TAGS_METADATA = [
    {
        'name': PatientAPITags.DASHBOARD,
        'description': 'Patient dashboard with overview of all wellness activities'
    },
    {
        'name': PatientAPITags.MOOD,
        'description': 'Track daily mood with intensity, triggers, and analytics'
    },
    {
        'name': PatientAPITags.JOURNAL,
        'description': 'Personal journaling with text and voice entries'
    },
    {
        'name': PatientAPITags.EMOTIONS,
        'description': 'Explore and understand emotions through structured reflection'
    },
    {
        'name': PatientAPITags.RELAXATION,
        'description': 'Relaxation content including nature sounds, meditation, and breathing exercises'
    },
    {
        'name': PatientAPITags.GOALS,
        'description': 'Set and track therapy goals with progress monitoring'
    },
    {
        'name': PatientAPITags.WELLNESS,
        'description': 'Daily inspiration and wellness content'
    },
]
