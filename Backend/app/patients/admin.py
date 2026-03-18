from django.contrib import admin
from .models import (
    MoodEntry, JournalEntry, EmotionalInsight,
    RelaxationContent, RelaxationSession, DailyInspiration, PatientGoal, RelaxationTip, JournalPrompt,
    NotificationPreference, Notification, NotificationDevice
)


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ['patient', 'dominant_mood', 'average_intensity', 'mood_date', 'created_at']
    list_filter = ['mood_date']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'notes']
    date_hierarchy = 'mood_date'
    ordering = ['-mood_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'moods_list', 'dominant_mood', 'average_intensity']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient', 'mood_date')
        }),
        ('Mood Details', {
            'fields': ('mood_intensities', 'moods_list', 'dominant_mood', 'average_intensity', 'notes')
        }),
        ('Context', {
            'fields': ('triggers', 'activities'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['patient', 'title', 'entry_date', 'is_favorite', 'is_private']
    list_filter = ['is_favorite', 'is_private', 'entry_date']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'title', 'content']
    date_hierarchy = 'entry_date'
    ordering = ['-entry_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient', 'entry_date')
        }),
        ('Entry Content', {
            'fields': ('prompt', 'title', 'content')
        }),
        ('Metadata', {
            'fields': ('mood_tags', 'is_private', 'is_favorite')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EmotionalInsight)
class EmotionalInsightAdmin(admin.ModelAdmin):
    list_display = ['patient', 'primary_emotion', 'intensity', 'is_resolved', 'helpfulness_rating', 'created_at']
    list_filter = ['primary_emotion', 'is_resolved', 'helpfulness_rating']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'what_happened']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient',)
        }),
        ('Emotion Details', {
            'fields': ('primary_emotion', 'intensity', 'what_happened')
        }),
        ('Exploration', {
            'fields': ('body_sensations', 'thoughts', 'behaviors')
        }),
        ('Reflection', {
            'fields': ('insights_learned', 'coping_strategies')
        }),
        ('Progress', {
            'fields': ('is_resolved', 'helpfulness_rating')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(RelaxationContent)
class RelaxationContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'content_type', 'category', 'duration_seconds', 'play_count', 'average_rating', 'is_active']
    list_filter = ['content_type', 'category', 'is_premium', 'is_active']
    search_fields = ['title', 'description']
    ordering = ['-play_count', 'title']
    readonly_fields = ['play_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Content Information', {
            'fields': ('title', 'description', 'content_type', 'category')
        }),
        ('Media Files', {
            'fields': ('audio_url', 'thumbnail_url', 'duration_seconds')
        }),
        ('Metadata', {
            'fields': ('is_premium', 'is_active', 'play_count', 'average_rating')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(RelaxationSession)
class RelaxationSessionAdmin(admin.ModelAdmin):
    list_display = ['patient', 'content', 'duration_listened_seconds', 'completed', 'rating', 'started_at']
    list_filter = ['completed', 'rating', 'started_at']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'content__title']
    ordering = ['-started_at']
    readonly_fields = ['started_at']
    
    fieldsets = (
        ('Session Information', {
            'fields': ('patient', 'content')
        }),
        ('Session Details', {
            'fields': ('duration_listened_seconds', 'completed', 'started_at', 'completed_at')
        }),
        ('Feedback', {
            'fields': ('rating', 'mood_before', 'mood_after', 'notes')
        }),
    )


@admin.register(DailyInspiration)
class DailyInspirationAdmin(admin.ModelAdmin):
    list_display = ['quote_preview', 'author', 'category', 'featured', 'is_active', 'created_at']
    list_filter = ['category', 'featured', 'is_active']
    search_fields = ['quote', 'author']
    ordering = ['-featured', '-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Quote Information', {
            'fields': ('quote', 'author', 'category')
        }),
        ('Additional Content', {
            'fields': ('reflection_prompt',)
        }),
        ('Status', {
            'fields': ('is_active', 'featured')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def quote_preview(self, obj):
        return obj.quote[:75] + '...' if len(obj.quote) > 75 else obj.quote
    quote_preview.short_description = 'Quote'


@admin.register(PatientGoal)
class PatientGoalAdmin(admin.ModelAdmin):
    list_display = ['patient', 'title', 'status', 'priority', 'progress_percentage', 'target_date', 'created_at']
    list_filter = ['status', 'priority', 'created_by_therapist', 'target_date']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'title', 'description']
    ordering = ['-priority', '-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Patient Information', {
            'fields': ('patient',)
        }),
        ('Goal Details', {
            'fields': ('title', 'description', 'status', 'priority')
        }),
        ('Timeline', {
            'fields': ('target_date', 'completed_date')
        }),
        ('Progress', {
            'fields': ('progress_percentage', 'milestones')
        }),
        ('Collaboration', {
            'fields': ('created_by_therapist', 'therapist_notes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(RelaxationTip)
class RelaxationTipAdmin(admin.ModelAdmin):
    list_display = ['title', 'tip_type', 'order', 'is_active']
    list_filter = ['tip_type', 'is_active']
    search_fields = ['title', 'description']
    ordering = ['order', 'title']
    
    fieldsets = (
        ('Tip Information', {
            'fields': ('title', 'tip_type', 'icon')
        }),
        ('Content', {
            'fields': ('description',)
        }),
        ('Display', {
            'fields': ('order', 'is_active')
        }),
    )


@admin.register(JournalPrompt)
class JournalPromptAdmin(admin.ModelAdmin):
    list_display = ['prompt_preview', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['prompt', 'description']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Prompt Content', {
            'fields': ('prompt', 'category', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def prompt_preview(self, obj):
        return obj.prompt[:60] + '...' if len(obj.prompt) > 60 else obj.prompt
    prompt_preview.short_description = 'Prompt'


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['patient', 'session_reminders_enabled', 'mood_reminder_enabled', 'journal_reminder_enabled', 'created_at']
    list_filter = ['session_reminders_enabled', 'session_summary_enabled', 'mood_reminder_enabled', 'journal_reminder_enabled']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Patient', {
            'fields': ('patient',)
        }),
        ('Session Notifications', {
            'fields': (
                'session_reminders_enabled', 'session_reminder_time',
                'session_summary_enabled', 'session_approved_enabled', 'session_cancelled_enabled'
            )
        }),
        ('Daily Reminders', {
            'fields': (
                'mood_reminder_enabled', 'mood_reminder_time',
                'journal_reminder_enabled', 'journal_reminder_time'
            )
        }),
        ('Other Notifications', {
            'fields': ('goal_reminders_enabled', 'therapist_messages_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['patient', 'notification_type', 'title', 'is_read', 'sent_at']
    list_filter = ['notification_type', 'is_read', 'sent_at']
    search_fields = ['patient__email', 'patient__first_name', 'patient__last_name', 'title', 'message']
    date_hierarchy = 'sent_at'
    readonly_fields = ['sent_at', 'read_at']
    ordering = ['-sent_at']
    
    fieldsets = (
        ('Recipient', {
            'fields': ('patient',)
        }),
        ('Notification Details', {
            'fields': ('notification_type', 'title', 'message', 'action_url')
        }),
        ('Related Objects', {
            'fields': ('session_id', 'goal_id'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Timestamps', {
            'fields': ('sent_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(NotificationDevice)
class NotificationDeviceAdmin(admin.ModelAdmin):
    list_display = ['user', 'platform', 'is_active', 'device_id', 'updated_at']
    list_filter = ['platform', 'is_active', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'expo_push_token', 'device_id']
    readonly_fields = ['created_at', 'updated_at', 'last_seen_at']
    ordering = ['-updated_at']

    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Device', {
            'fields': ('expo_push_token', 'device_id', 'platform', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_seen_at'),
            'classes': ('collapse',)
        }),
    )

