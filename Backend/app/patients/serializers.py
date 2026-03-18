from rest_framework import serializers
from .services.notification_categories import get_notification_category
from .models import (
    MoodEntry, JournalEntry, EmotionalInsight, 
    RelaxationContent, RelaxationSession, DailyInspiration, PatientGoal, RelaxationTip, JournalPrompt,
    NotificationPreference, Notification, ActivityLog
)
from django.utils import timezone
from datetime import timedelta, datetime


class MoodEntrySerializer(serializers.ModelSerializer):
    """Serializer for mood entries with individual intensity per mood"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    
    # Write-only field to accept mood-intensity pairs
    mood_intensities = serializers.DictField(
        child=serializers.IntegerField(min_value=1, max_value=5),
        write_only=True,
        required=True,
        help_text="Dictionary mapping moods to intensity levels. Example: {'happy': 4, 'anxious': 2, 'peaceful': 5}"
    )
    
    triggers_list = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    # Read-only computed fields
    moods_list = serializers.ListField(read_only=True)
    dominant_mood = serializers.CharField(read_only=True)
    dominant_moods = serializers.ListField(read_only=True)
    average_intensity = serializers.FloatField(read_only=True)
    
    class Meta:
        model = MoodEntry
        fields = [
            'id', 'patient', 'patient_name', 
            'mood_intensities', 'moods_list', 'dominant_mood', 'dominant_moods', 'average_intensity',
            'notes', 'triggers', 'triggers_list', 'activities',
            'mood_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']
    
    def validate_mood_intensities(self, value):
        """Validate that moods are from allowed choices"""
        valid_moods = [choice[0] for choice in MoodEntry.MOOD_CHOICES]
        for mood in value.keys():
            if mood not in valid_moods:
                raise serializers.ValidationError(
                    f"Invalid mood '{mood}'. Must be one of: {', '.join(valid_moods)}"
                )
        return value
    
    def create(self, validated_data):
        # Handle triggers_list
        triggers_list = validated_data.pop('triggers_list', None)
        if triggers_list:
            validated_data['triggers'] = ','.join(triggers_list)
        
        # mood_intensities is already in correct format (dict)
        # Set patient from request context
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Handle triggers_list
        triggers_list = validated_data.pop('triggers_list', None)
        if triggers_list:
            validated_data['triggers'] = ','.join(triggers_list)
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add detailed mood breakdown and triggers as list in response
        data['mood_intensities'] = instance.mood_intensities
        data['triggers_list'] = instance.triggers_list
        return data


class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer for journal entries"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    mood_tags_list = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    word_count = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'patient', 'patient_name', 'prompt', 'title', 'content',
            'mood_tags', 'mood_tags_list', 'is_private', 'is_favorite', 
            'entry_date', 'created_at', 'updated_at', 'word_count'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Handle mood_tags_list
        mood_tags_list = validated_data.pop('mood_tags_list', None)
        if mood_tags_list:
            validated_data['mood_tags'] = ','.join(mood_tags_list)
        
        # Set patient from request context
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Handle mood_tags_list
        mood_tags_list = validated_data.pop('mood_tags_list', None)
        if mood_tags_list:
            validated_data['mood_tags'] = ','.join(mood_tags_list)
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add mood_tags as list in response
        data['mood_tags_list'] = instance.mood_tags_list
                # Provide a compatibility alias used by other parts of the app
        data['tags_list'] = instance.mood_tags_list
        # Ensure frontend can read word_count even if model doesn't store it
        data['word_count'] = self.get_word_count(instance)

        return data
    def get_word_count(self, obj):
        if not obj or not getattr(obj, 'content', None):
            return 0
        # Basic whitespace split; mirrors other places that compute word counts
        return len(str(obj.content).split())

class JournalPromptSerializer(serializers.ModelSerializer):
    """Serializer for journal prompts"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = JournalPrompt
        fields = [
            'id', 'prompt', 'category', 'category_display', 
            'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmotionalInsightSerializer(serializers.ModelSerializer):
    """Serializer for emotional insights"""
    emotion_display = serializers.CharField(source='get_primary_emotion_display', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    
    class Meta:
        model = EmotionalInsight
        fields = [
            'id', 'patient', 'patient_name', 'primary_emotion', 'emotion_display',
            'intensity', 'what_happened', 'body_sensations', 'thoughts', 'behaviors',
            'insights_learned', 'coping_strategies', 'is_resolved', 'helpfulness_rating',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class RelaxationContentSerializer(serializers.ModelSerializer):
    """Serializer for relaxation content"""
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = RelaxationContent
        fields = [
            'id', 'title', 'description', 'content_type', 'content_type_display',
            'category', 'category_display', 'audio_url', 'thumbnail_url',
            'duration_seconds', 'duration_formatted', 'instructions', 'is_premium', 
            'is_active', 'play_count', 'average_rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'play_count', 'average_rating', 'created_at', 'updated_at']
    
    def get_duration_formatted(self, obj):
        """Format duration as MM:SS"""
        minutes = obj.duration_seconds // 60
        seconds = obj.duration_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"


class RelaxationSessionSerializer(serializers.ModelSerializer):
    """Serializer for relaxation sessions"""
    content_details = RelaxationContentSerializer(source='content', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    
    class Meta:
        model = RelaxationSession
        fields = [
            'id', 'patient', 'patient_name', 'content', 'content_details',
            'duration_listened_seconds', 'completed', 'rating', 'mood_before',
            'mood_after', 'notes', 'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'patient', 'started_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class DailyInspirationSerializer(serializers.ModelSerializer):
    """Serializer for daily inspiration"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = DailyInspiration
        fields = [
            'id', 'quote', 'author', 'category', 'category_display',
            'reflection_prompt', 'is_active', 'featured', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class RelaxationTipSerializer(serializers.ModelSerializer):
    """Serializer for relaxation tips"""
    tip_type_display = serializers.CharField(source='get_tip_type_display', read_only=True)
    
    class Meta:
        model = RelaxationTip
        fields = [
            'id', 'title', 'tip_type', 'tip_type_display', 'description',
            'icon', 'order', 'is_active'
        ]
        read_only_fields = ['id']

class PatientGoalSerializer(serializers.ModelSerializer):
    """Serializer for patient goals"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientGoal
        fields = [
            'id', 'patient', 'patient_name', 'title', 'description',
            'status', 'status_display', 'priority', 'priority_display',
            'target_date', 'completed_date', 'progress_percentage',
            'milestones', 'created_by_therapist', 'therapist_notes',
            'days_remaining', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']
    
    def get_days_remaining(self, obj):
        """Calculate days remaining until target date"""
        if obj.target_date and obj.status != 'completed':
            delta = obj.target_date - timezone.now().date()
            return delta.days
        return None
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


# Dashboard Serializers

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for patient dashboard statistics"""
    mood_today = serializers.DictField(required=False, allow_null=True)
    journal_count_this_month = serializers.IntegerField()
    next_session = serializers.DictField(required=False, allow_null=True)
    active_goals_count = serializers.IntegerField()
    completed_goals_count = serializers.IntegerField()
    mood_trend = serializers.ListField(child=serializers.DictField())
    recent_journal_entries = serializers.ListField(child=serializers.DictField())
    upcoming_sessions = serializers.ListField(child=serializers.DictField())
    daily_inspiration = DailyInspirationSerializer(required=False, allow_null=True)
    relaxation_minutes_this_week = serializers.IntegerField()
    emotional_insights_count = serializers.IntegerField()


class MoodAnalyticsSerializer(serializers.Serializer):
    """Serializer for mood analytics"""
    average_intensity = serializers.FloatField()
    most_common_mood = serializers.CharField()
    mood_distribution = serializers.DictField()
    weekly_trend = serializers.ListField(child=serializers.DictField())
    monthly_comparison = serializers.DictField()
    common_triggers = serializers.ListField(child=serializers.CharField())


class JournalAnalyticsSerializer(serializers.Serializer):
    """Serializer for journal analytics"""
    total_entries = serializers.IntegerField()
    entries_this_month = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    favorite_count = serializers.IntegerField()
    common_tags = serializers.ListField(child=serializers.DictField())


class EmotionalAnalyticsSerializer(serializers.Serializer):
    """Serializer for emotional exploration analytics"""
    total_insights = serializers.IntegerField()
    resolved_count = serializers.IntegerField()
    most_explored_emotion = serializers.CharField()
    emotion_distribution = serializers.DictField()
    average_helpfulness = serializers.FloatField()
    top_coping_strategies = serializers.ListField(child=serializers.CharField())


class RelaxationAnalyticsSerializer(serializers.Serializer):
    """Serializer for relaxation session analytics"""
    total_sessions = serializers.IntegerField()
    total_minutes = serializers.FloatField()
    favorite_content_type = serializers.CharField()
    average_rating = serializers.FloatField()
    completion_rate = serializers.FloatField()
    mood_improvement_rate = serializers.FloatField()


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'patient',
            # Session notifications
            'session_reminders_enabled', 'session_reminder_time',
            'session_summary_enabled', 'session_approved_enabled', 'session_cancelled_enabled',
            # Goal notifications
            'goal_reminders_enabled',
            # Daily reminders
            'mood_reminder_enabled', 'mood_reminder_time',
            'journal_reminder_enabled', 'journal_reminder_time',
            # Communication
            'therapist_messages_enabled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']
    
    def validate_session_reminder_time(self, value):
        """Validate reminder time is reasonable"""
        if value < 1 or value > 168:  # 1 hour to 1 week
            raise serializers.ValidationError("Reminder time must be between 1 and 168 hours")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'patient', 'patient_name',
            'notification_type', 'title', 'message',
            'category',
            'session_id', 'goal_id', 'action_url',
            'is_read', 'read_at', 'sent_at', 'time_ago',
            'delivery_status', 'delivery_attempts',
            'last_delivery_attempt_at', 'next_retry_at',
            'delivered_at', 'delivery_error'
        ]
        read_only_fields = [
            'id', 'patient', 'sent_at',
            'delivery_status', 'delivery_attempts', 'last_delivery_attempt_at',
            'next_retry_at', 'delivered_at', 'delivery_error'
        ]
    
    def get_time_ago(self, obj):
        """Get human-readable time since notification was sent"""
        delta = timezone.now() - obj.sent_at
        
        if delta.days > 0:
            return f"{delta.days} day{'s' if delta.days != 1 else ''} ago"
        elif delta.seconds >= 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif delta.seconds >= 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"

    def get_category(self, obj):
        return get_notification_category(obj)
        
class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""
    mood_impact = serializers.CharField(read_only=True)
    energy_impact = serializers.CharField(read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'patient', 'patient_name',
            'activity_type', 'activity_name', 'description',
            'duration_minutes', 'intensity', 
            'mood_before', 'mood_after', 'mood_impact',
            'energy_before', 'energy_after', 'energy_impact',
            'location', 'with_others', 'notes', 
            'activity_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at', 'mood_impact', 'energy_impact']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class ActivityAnalyticsSerializer(serializers.Serializer):
    """Serializer for activity analytics"""
    total_activities = serializers.IntegerField()
    this_week = serializers.IntegerField()
    this_month = serializers.IntegerField()
    average_duration = serializers.FloatField()
    average_mood_improvement = serializers.FloatField()
    average_energy_improvement = serializers.FloatField()
    most_common_type = serializers.CharField()
    most_common_type_count = serializers.IntegerField()
    top_activities = serializers.ListField()
    activity_type_distribution = serializers.DictField()


    