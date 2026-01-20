from django.contrib import admin
from .models import Session, SessionTemplate, PatientProgress, TherapistAvailability, TherapistDateOverride


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = [
        'session_number', 'patient', 'therapist', 'scheduled_date', 
        'session_type', 'status', 'duration_minutes', 'summary_written_at'
    ]
    list_filter = ['status', 'session_type', 'is_online', 'scheduled_date']
    search_fields = ['patient__full_name', 'therapist__full_name', 'session_notes', 'session_summary']
    readonly_fields = ['session_number', 'created_at', 'updated_at', 'summary_written_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('session_number', 'patient', 'therapist', 'session_type', 'status')
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'duration_minutes', 'location', 'is_online')
        }),
        ('Session Content', {
            'fields': ('session_notes', 'session_summary', 'summary_written_at', 
                      'patient_goals', 'homework_assigned', 'next_session_goals')
        }),
        ('Assessment', {
            'fields': ('patient_mood_before', 'patient_mood_after', 
                      'therapist_observations', 'session_effectiveness')
        }),
        ('Payment', {
            'fields': ('fee_charged', 'payment_status')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(SessionTemplate)
class SessionTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'therapist', 'session_type', 'duration_minutes', 'location']
    list_filter = ['session_type', 'is_recurring']
    search_fields = ['name', 'therapist__full_name']


@admin.register(PatientProgress)
class PatientProgressAdmin(admin.ModelAdmin):
    list_display = ['patient', 'therapist', 'sessions_completed', 'assessment_date', 'overall_progress_rating']
    list_filter = ['mood_trend', 'assessment_date']
    search_fields = ['patient__full_name', 'therapist__full_name']


@admin.register(TherapistAvailability)
class TherapistAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['therapist', 'day_of_week', 'start_time', 'end_time', 'is_day_off']
    list_filter = ['day_of_week', 'is_day_off']
    search_fields = ['therapist__full_name']


@admin.register(TherapistDateOverride)
class TherapistDateOverrideAdmin(admin.ModelAdmin):
    list_display = ['therapist', 'date', 'is_available', 'start_time', 'end_time', 'reason']
    list_filter = ['is_available', 'date']
    search_fields = ['therapist__full_name', 'reason']
