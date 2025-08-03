from rest_framework import serializers
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from .models import (
    MoodEntry, JournalEntry, ActivityLog, MedicationLog, SleepLog,
    SymptomTracker, CopingStrategy, PatientMilestone, ReflectionPrompt,
    ReflectionEntry, PatientGoal, ProgressTracking
)

User = get_user_model()


class MoodEntrySerializer(serializers.ModelSerializer):
    """Serializer for mood entries"""
    triggers_list = serializers.SerializerMethodField()
    
    class Meta:
        model = MoodEntry
        fields = [
            'id', 'mood', 'mood_score', 'energy_level', 'sleep_quality',
            'anxiety_level', 'stress_level', 'triggers', 'triggers_list',
            'location', 'weather', 'notes', 'coping_strategies_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_triggers_list(self, obj) -> list:
        return obj.get_triggers_list()
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class MoodEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating mood entries with triggers list"""
    triggers_list = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = MoodEntry
        fields = [
            'mood', 'mood_score', 'energy_level', 'sleep_quality',
            'anxiety_level', 'stress_level', 'triggers_list',
            'location', 'weather', 'notes', 'coping_strategies_used'
        ]
    
    def create(self, validated_data):
        triggers_list = validated_data.pop('triggers_list', [])
        validated_data['patient'] = self.context['request'].user
        
        mood_entry = MoodEntry.objects.create(**validated_data)
        if triggers_list:
            mood_entry.set_triggers(triggers_list)
            mood_entry.save()
        
        return mood_entry


class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer for journal entries"""
    tags_list = serializers.SerializerMethodField()
    mood_improvement = serializers.ReadOnlyField()
    
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'title', 'content', 'entry_type', 'privacy_level',
            'mood_before', 'mood_after', 'mood_improvement', 'tags',
            'tags_list', 'word_count', 'is_favorite', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'word_count', 'created_at', 'updated_at']
    
    def get_tags_list(self, obj) -> list:
        return obj.get_tags_list()
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class JournalEntryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating journal entries with tags list"""
    tags_list = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = JournalEntry
        fields = [
            'title', 'content', 'entry_type', 'privacy_level',
            'mood_before', 'mood_after', 'tags_list', 'is_favorite'
        ]
    
    def create(self, validated_data):
        tags_list = validated_data.pop('tags_list', [])
        validated_data['patient'] = self.context['request'].user
        
        journal_entry = JournalEntry.objects.create(**validated_data)
        if tags_list:
            journal_entry.set_tags(tags_list)
            journal_entry.save()
        
        return journal_entry


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""
    mood_impact = serializers.ReadOnlyField()
    energy_impact = serializers.ReadOnlyField()
    
    @extend_schema_field(serializers.CharField)
    def mood_impact(self, obj):
        return obj.mood_impact
    
    @extend_schema_field(serializers.CharField)
    def energy_impact(self, obj):
        return obj.energy_impact
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'activity_type', 'activity_name', 'description',
            'duration_minutes', 'intensity', 'mood_before', 'mood_after',
            'mood_impact', 'energy_before', 'energy_after', 'energy_impact',
            'location', 'with_others', 'notes', 'activity_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class MedicationLogSerializer(serializers.ModelSerializer):
    """Serializer for medication logs"""
    
    class Meta:
        model = MedicationLog
        fields = [
            'id', 'medication_name', 'dosage', 'prescribed_time',
            'taken_at', 'was_taken', 'missed_reason', 'side_effects',
            'mood_before', 'mood_after', 'effectiveness_rating',
            'notes', 'log_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class SleepLogSerializer(serializers.ModelSerializer):
    """Serializer for sleep logs"""
    
    class Meta:
        model = SleepLog
        fields = [
            'id', 'sleep_date', 'bedtime', 'sleep_time', 'wake_time',
            'hours_slept', 'times_woken', 'sleep_quality', 'sleep_quality_score',
            'pre_sleep_activities', 'sleep_environment', 'dreams_remembered',
            'dream_content', 'morning_mood', 'morning_energy', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class SymptomTrackerSerializer(serializers.ModelSerializer):
    """Serializer for symptom tracking"""
    
    class Meta:
        model = SymptomTracker
        fields = [
            'id', 'symptom_type', 'symptom_name', 'severity', 'triggers',
            'duration_minutes', 'location', 'coping_strategies', 'relief_methods',
            'effectiveness_rating', 'notes', 'symptom_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class CopingStrategySerializer(serializers.ModelSerializer):
    """Serializer for coping strategies"""
    
    class Meta:
        model = CopingStrategy
        fields = [
            'id', 'strategy_type', 'strategy_name', 'description',
            'times_used', 'average_effectiveness', 'last_used',
            'best_situations', 'notes', 'is_favorite', 'learned_from_therapist',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'times_used', 'average_effectiveness', 'last_used', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class PatientMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for patient milestones"""
    related_goal_title = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientMilestone
        fields = [
            'id', 'title', 'description', 'milestone_type', 'importance_rating',
            'mood_impact', 'related_goal', 'related_goal_title', 'celebration_notes',
            'achieved_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_related_goal_title(self, obj):
        return obj.related_goal.title if obj.related_goal else None
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class ReflectionPromptSerializer(serializers.ModelSerializer):
    """Serializer for reflection prompts"""
    
    class Meta:
        model = ReflectionPrompt
        fields = [
            'id', 'prompt_text', 'prompt_type', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReflectionEntrySerializer(serializers.ModelSerializer):
    """Serializer for reflection entries"""
    prompt_text = serializers.SerializerMethodField()
    
    class Meta:
        model = ReflectionEntry
        fields = [
            'id', 'prompt', 'prompt_text', 'response', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_prompt_text(self, obj):
        return obj.prompt.prompt_text
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class PatientGoalSerializer(serializers.ModelSerializer):
    """Serializer for patient goals"""
    therapist_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientGoal
        fields = [
            'id', 'title', 'description', 'target_date', 'status',
            'progress_percentage', 'therapist', 'therapist_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'therapist', 'created_at', 'updated_at']
    
    def get_therapist_name(self, obj):
        return obj.therapist.full_name if obj.therapist else None


class ProgressTrackingSerializer(serializers.ModelSerializer):
    """Serializer for progress tracking"""
    
    class Meta:
        model = ProgressTracking
        fields = [
            'id', 'date', 'overall_wellbeing', 'symptom_severity',
            'functional_improvement', 'medication_adherence', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        return super().create(validated_data)


class PatientHistoryDashboardSerializer(serializers.Serializer):
    """Serializer for patient history dashboard data"""
    recent_mood_entries = MoodEntrySerializer(many=True, read_only=True)
    recent_journal_entries = JournalEntrySerializer(many=True, read_only=True)
    recent_activities = ActivityLogSerializer(many=True, read_only=True)
    active_goals = PatientGoalSerializer(many=True, read_only=True)
    recent_milestones = PatientMilestoneSerializer(many=True, read_only=True)
    mood_trend = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    total_journal_entries = serializers.IntegerField(read_only=True)
    total_mood_entries = serializers.IntegerField(read_only=True)
    average_mood_score = serializers.FloatField(read_only=True)
    streak_days = serializers.IntegerField(read_only=True)


class MoodAnalyticsSerializer(serializers.Serializer):
    """Serializer for mood analytics data"""
    average_mood = serializers.FloatField()
    mood_trend = serializers.ListField(child=serializers.DictField())
    mood_by_day = serializers.ListField(child=serializers.DictField())
    trigger_analysis = serializers.ListField(child=serializers.DictField())
    correlation_data = serializers.DictField()