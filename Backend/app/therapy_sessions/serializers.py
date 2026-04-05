from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import (
    Session, SessionTemplate, PatientProgress, SessionReminder,
    TherapistAvailability, TherapistDateOverride, SessionQRCode, SessionAudio, SessionInsight
)
from users.models import PatientProfile, TherapistProfile

User = get_user_model()


class PatientBasicSerializer(serializers.ModelSerializer):
    """Basic patient information for session displays"""
    full_name = serializers.ReadOnlyField()
    patient_id = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone_number', 'patient_id']
    
    def get_patient_id(self, obj):
        try:
            return obj.patient_profile.patient_id
        except:
            return None


class TherapistBasicSerializer(serializers.ModelSerializer):
    """Basic therapist information for session displays"""
    full_name = serializers.ReadOnlyField()
    specialization = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'specialization']
    
    def get_specialization(self, obj):
        try:
            return obj.therapist_profile.specialization
        except:
            return None


class SessionSerializer(serializers.ModelSerializer):
    """Full session serializer for therapist view with WebSocket support"""
    patient = PatientBasicSerializer(read_only=True)
    therapist = TherapistBasicSerializer(read_only=True)
    actual_duration_minutes = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    mood_improvement = serializers.ReadOnlyField()
    websocket_url = serializers.SerializerMethodField()
    can_start_websocket = serializers.SerializerMethodField()
    recurrence_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'patient', 'therapist', 'session_number', 'session_type',
            'scheduled_date', 'actual_start_time', 'actual_end_time',
            'duration_minutes', 'actual_duration_minutes', 'status', 'location',
            'is_online', 'session_notes', 'session_summary', 'summary_written_at',
            'patient_goals', 'homework_assigned',
            'next_session_goals', 'patient_mood_before', 'patient_mood_after',
            'mood_improvement', 'therapist_observations', 'session_effectiveness',
            'consent_recording', 'consent_ai_analysis', 'fee_charged',
            'payment_status', 'is_overdue', 'is_recurring', 'recurring_weeks',
            'recurrence_parent', 'is_emergency', 'recurrence_info',
            'websocket_room_id', 'websocket_active', 'websocket_url', 
            'can_start_websocket', 'created_at', 'updated_at'
        ]
    
    def get_recurrence_info(self, obj):
        """Get information about recurring sessions"""
        if not obj.is_recurring and not obj.recurrence_parent:
            return None
        
        if obj.recurrence_parent:
            # This is a child session
            parent = obj.recurrence_parent
            siblings = Session.objects.filter(recurrence_parent=parent).count()
            return {
                'is_parent': False,
                'parent_id': str(parent.id),
                'parent_date': parent.scheduled_date,
                'total_in_series': siblings + 1,
                'recurring_weeks': parent.recurring_weeks
            }
        else:
            # This is a parent session
            children = Session.objects.filter(recurrence_parent=obj).count()
            return {
                'is_parent': True,
                'recurring_weeks': obj.recurring_weeks,
                'total_sessions_created': children + 1
            }
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            request = self.context.get('request')
            if request:
                host = request.get_host()
                protocol = 'wss' if request.is_secure() else 'ws'
                return f"{protocol}://{host}/ws/therapy-session/{obj.websocket_room_id}/"
        return None
    
    def get_can_start_websocket(self, obj):
        """Determine if WebSocket connection can be started"""
        return (
            obj.is_online and 
            obj.status in ['UPCOMING', 'IN_PROGRESS'] and
            (obj.consent_recording or obj.consent_ai_analysis)
        )


class SessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new sessions (one-off or recurring)"""
    patient_id = serializers.UUIDField(write_only=True, required=True)
    recurring_weeks = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        min_value=1, 
        max_value=52,
        help_text="Number of weeks for recurring sessions. Omit for one-off session."
    )
    
    class Meta:
        model = Session
        fields = [
            'patient_id', 'session_type', 'scheduled_date', 
            'duration_minutes', 'location', 'is_online', 'patient_goals', 
            'fee_charged', 'consent_recording', 'consent_ai_analysis',
            'recurring_weeks', 'is_emergency'
        ]
    
    def validate_patient_id(self, value):
        """Validate that patient exists and is connected to therapist"""
        try:
            patient = User.objects.get(id=value, user_type='patient')
            therapist = self.context['request'].user
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("Patient is not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")
    
    def validate_scheduled_date(self, value):
        """Validate that scheduled date is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value
    
    def validate(self, attrs):
        """Additional validation for slot availability"""
        # Import here to avoid circular import
        from .services import AvailabilityService
        
        scheduled_date = attrs.get('scheduled_date')
        duration_minutes = attrs.get('duration_minutes', 60)
        recurring_weeks = attrs.get('recurring_weeks')
        is_emergency = attrs.get('is_emergency', False)
        
        therapist = self.context['request'].user
        
        # Skip availability check for emergency sessions
        if not is_emergency:
            # Calculate end time
            end_time = scheduled_date + timedelta(minutes=duration_minutes)
            
            # Check if slot is available for primary session
            is_available, reason = AvailabilityService.check_slot_availability(
                therapist=therapist,
                start_datetime=scheduled_date,
                end_datetime=end_time
            )
            
            if not is_available:
                raise serializers.ValidationError(f"Time slot not available: {reason}")
            
            # If recurring, validate all slots
            if recurring_weeks:
                conflicts = AvailabilityService.validate_recurring_slots(
                    therapist=therapist,
                    start_datetime=scheduled_date,
                    duration_minutes=duration_minutes,
                    recurring_weeks=recurring_weeks
                )
                if conflicts:
                    conflict_dates = [c['date'].strftime('%Y-%m-%d %H:%M') for c in conflicts]
                    raise serializers.ValidationError(
                        f"Conflicts found for recurring sessions on: {', '.join(conflict_dates)}"
                    )
        
        return attrs
    
    def create(self, validated_data):
        from .services import AvailabilityService
        
        patient_id = validated_data.pop('patient_id')
        recurring_weeks = validated_data.pop('recurring_weeks', None)
        
        patient = User.objects.get(id=patient_id)
        therapist = self.context['request'].user
        
        validated_data['patient'] = patient
        validated_data['therapist'] = therapist
        validated_data['is_recurring'] = bool(recurring_weeks)
        validated_data['recurring_weeks'] = recurring_weeks
        
        if recurring_weeks:
            # Create recurring sessions
            sessions = AvailabilityService.create_recurring_sessions(
                therapist=therapist,
                patient=patient,
                start_datetime=validated_data['scheduled_date'],
                duration_minutes=validated_data.get('duration_minutes', 60),
                recurring_weeks=recurring_weeks,
                session_data={
                    'session_type': validated_data.get('session_type', 'individual'),
                    'location': validated_data.get('location', ''),
                    'is_online': validated_data.get('is_online', False),
                    'patient_goals': validated_data.get('patient_goals', ''),
                    'fee_charged': validated_data.get('fee_charged'),
                    'consent_recording': validated_data.get('consent_recording', False),
                    'consent_ai_analysis': validated_data.get('consent_ai_analysis', False),
                }
            )
            # Return the parent session
            return sessions[0] if sessions else None
        else:
            # Create single session
            return super().create(validated_data)


class SessionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating sessions"""
    
    class Meta:
        model = Session
        fields = [
            'session_type', 'scheduled_date', 'duration_minutes', 'status',
            'location', 'is_online', 'session_notes', 'session_summary',
            'patient_goals', 'homework_assigned', 'next_session_goals', 
            'patient_mood_before', 'patient_mood_after', 'therapist_observations', 
            'session_effectiveness', 'consent_recording', 'consent_ai_analysis', 
            'fee_charged', 'payment_status'
        ]


class SessionSummarySerializer(serializers.ModelSerializer):
    """Serializer for therapist to write session summary for patient"""
    therapist_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'session_number', 'scheduled_date', 'session_type', 'duration_minutes',
            'patient_name', 'therapist_name', 'status',
            'session_summary', 'patient_goals', 'homework_assigned', 'next_session_goals',
            'summary_written_at'
        ]
        read_only_fields = ['id', 'session_number', 'scheduled_date', 'session_type',
                           'patient_name', 'therapist_name', 'summary_written_at', 'status', 'duration_minutes']
    
    def get_therapist_name(self, obj):
        return obj.therapist.full_name if obj.therapist else None
    
    def get_patient_name(self, obj):
        return obj.patient.full_name if obj.patient else None
    
    def validate(self, attrs):
        """Validate that only completed or in-progress sessions can have summaries"""
        instance = self.instance
        if instance and instance.status not in ['COMPLETED', 'IN_PROGRESS']:
            raise serializers.ValidationError(
                "Session summary can only be written for completed or in-progress sessions."
            )
        return attrs
    
    def update(self, instance, validated_data):
        # Auto-set summary_written_at timestamp if any summary field is provided
        summary_fields = ['session_summary', 'patient_goals', 'homework_assigned', 'next_session_goals']
        if any(field in validated_data for field in summary_fields):
            instance.summary_written_at = timezone.now()
        
        return super().update(instance, validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    """Serializer for listing patients"""
    full_name = serializers.ReadOnlyField()
    patient_profile = serializers.SerializerMethodField()
    last_session = serializers.SerializerMethodField()
    next_session = serializers.SerializerMethodField()
    total_sessions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone_number', 'date_of_birth',
            'gender', 'patient_profile', 'last_session', 'next_session',
            'total_sessions', 'created_at'
        ]
    
    def get_patient_profile(self, obj):
        try:
            profile = obj.patient_profile
            return {
                'patient_id': profile.patient_id,
                'primary_concern': profile.primary_concern,
                'therapy_start_date': profile.therapy_start_date,
                'session_frequency': profile.session_frequency,
                'preferred_session_days': profile.get_preferred_days_list(),
                'emergency_contact_name': profile.emergency_contact_name,
                'emergency_contact_phone': profile.emergency_contact_phone,
                'address': profile.address,
                'medical_history': profile.medical_history,
                'current_medications': profile.current_medications,
                'preferred_language': profile.preferred_language,
                'connected_at': profile.connected_at,
            }
        except:
            return None
    
    def get_last_session(self, obj):
        last_session = Session.objects.filter(
            patient=obj, status='COMPLETED'
        ).order_by('-scheduled_date').first()
        
        if last_session:
            return {
                'id': last_session.id,
                'date': last_session.scheduled_date,
                'session_number': last_session.session_number,
                'mood_improvement': last_session.mood_improvement,
            }
        return None
    
    def get_next_session(self, obj):
        from django.utils import timezone
        next_session = Session.objects.filter(
            patient=obj, status='UPCOMING',
            scheduled_date__gte=timezone.now()
        ).order_by('scheduled_date').first()
        
        if next_session:
            return {
                'id': next_session.id,
                'date': next_session.scheduled_date,
                'session_number': next_session.session_number,
                'location': next_session.location,
                'is_online': next_session.is_online,
            }
        return None
    
    def get_total_sessions(self, obj):
        return Session.objects.filter(patient=obj).count()


class SessionTemplateSerializer(serializers.ModelSerializer):
    """Serializer for session templates"""
    patient = PatientBasicSerializer(read_only=True)
    patient_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = SessionTemplate
        fields = [
            'id', 'patient', 'patient_id', 'name', 'session_type',
            'duration_minutes', 'location', 'is_online', 'is_recurring',
            'recurrence_pattern', 'default_goals', 'default_notes_template',
            'is_active', 'created_at', 'updated_at'
        ]
    
    def validate_patient_id(self, value):
        """Validate that patient exists and is connected to therapist"""
        try:
            patient = User.objects.get(id=value, user_type='patient')
            therapist = self.context['request'].user
            if not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("Patient is not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")
    
    def create(self, validated_data):
        patient_id = validated_data.pop('patient_id')
        patient = User.objects.get(id=patient_id)
        validated_data['patient'] = patient
        validated_data['therapist'] = self.context['request'].user
        return super().create(validated_data)


class PatientProgressSerializer(serializers.ModelSerializer):
    """Serializer for patient progress tracking"""
    patient = PatientBasicSerializer(read_only=True)
    therapist = TherapistBasicSerializer(read_only=True)
    
    class Meta:
        model = PatientProgress
        fields = [
            'id', 'patient', 'therapist', 'overall_progress_rating',
            'mood_trend', 'goals_achieved', 'current_challenges',
            'next_milestones', 'assessment_date', 'sessions_completed',
            'therapist_notes', 'patient_feedback', 'created_at', 'updated_at'
        ]


class TherapistAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for therapist availability schedule"""
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TherapistAvailability
        fields = [
            'id', 'day_of_week', 'day_name', 'start_time', 'end_time', 
            'is_day_off', 'break_start', 'break_end',
            'default_session_duration', 'buffer_minutes',
            'is_online_available', 'location',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_day_name(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day_of_week] if 0 <= obj.day_of_week <= 6 else 'Unknown'
    
    def validate(self, attrs):
        """Validate time ranges"""
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        is_day_off = attrs.get('is_day_off', False)
        
        if not is_day_off:
            if start_time and end_time and start_time >= end_time:
                raise serializers.ValidationError("End time must be after start time.")
            
            break_start = attrs.get('break_start')
            break_end = attrs.get('break_end')
            
            if break_start and break_end:
                if break_start >= break_end:
                    raise serializers.ValidationError("Break end must be after break start.")
                if break_start < start_time or break_end > end_time:
                    raise serializers.ValidationError("Break must be within working hours.")
        
        return attrs


class TherapistDateOverrideSerializer(serializers.ModelSerializer):
    """Serializer for date-specific availability overrides"""
    
    class Meta:
        model = TherapistDateOverride
        fields = [
            'id', 'date', 'is_available', 'start_time', 'end_time',
            'reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validate override data"""
        is_available = attrs.get('is_available', True)
        
        if is_available:
            start_time = attrs.get('start_time')
            end_time = attrs.get('end_time')
            
            if not start_time or not end_time:
                raise serializers.ValidationError(
                    "start_time and end_time are required when marking as available."
                )
            
            if start_time >= end_time:
                raise serializers.ValidationError("End time must be after start time.")
        
        return attrs


class AvailableSlotsRequestSerializer(serializers.Serializer):
    """Request serializer for getting available slots"""
    date = serializers.DateField(required=True)
    duration_minutes = serializers.IntegerField(default=60, min_value=15, max_value=480)
    
    def validate_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Date must not be in the past.")
        return value


class AvailableSlotSerializer(serializers.Serializer):
    """Serializer for an available time slot"""
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    is_online_available = serializers.BooleanField()
    location = serializers.CharField(allow_blank=True)


class PatientBookingSerializer(serializers.Serializer):
    """Serializer for patient booking a session from available slots"""
    slot_start = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(default=60, min_value=15, max_value=480)
    is_online = serializers.BooleanField(default=False)
    patient_goals = serializers.CharField(required=False, allow_blank=True)
    
    def validate_slot_start(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Booking time must be in the future.")
        return value
    
    def validate(self, attrs):
        """Validate slot availability"""
        from .services import AvailabilityService
        
        slot_start = attrs.get('slot_start')
        duration_minutes = attrs.get('duration_minutes', 60)
        slot_end = slot_start + timedelta(minutes=duration_minutes)
        
        # Get the patient's therapist
        patient = self.context['request'].user
        try:
            therapist = patient.patient_profile.therapist.user
        except (PatientProfile.DoesNotExist, AttributeError):
            raise serializers.ValidationError("You are not connected to a therapist.")
        
        is_available, reason = AvailabilityService.check_slot_availability(
            therapist=therapist,
            start_datetime=slot_start,
            end_datetime=slot_end
        )
        
        if not is_available:
            raise serializers.ValidationError(f"Time slot not available: {reason}")
        
        attrs['therapist'] = therapist
        return attrs


class EmergencySessionRequestSerializer(serializers.Serializer):
    """Serializer for patient requesting an emergency session"""
    preferred_date = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField(required=True, min_length=10, max_length=500)
    is_online = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        """Validate patient has a therapist"""
        patient = self.context['request'].user
        try:
            therapist_profile = patient.patient_profile.therapist
            if not therapist_profile:
                raise serializers.ValidationError("You are not connected to a therapist.")
            attrs['therapist'] = therapist_profile.user
        except PatientProfile.DoesNotExist:
            raise serializers.ValidationError("Patient profile not found.")
        
        return attrs


class SessionInsightSerializer(serializers.ModelSerializer):
    """Serializer for session insights"""
    session = SessionSerializer(read_only=True)
    
    class Meta:
        model = SessionInsight
        fields = [
            'id', 'session', 'overall_mood', 'mood_score', 'key_themes',
            'emotional_patterns', 'recommendations', 'generated_at'
        ]


class SessionListSerializer(serializers.ModelSerializer):
    """Simplified session serializer for list views with basic details"""
    therapist_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    session_date = serializers.DateTimeField(source='scheduled_date')
    is_part_of_series = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'therapist_name', 'patient_name', 'session_date', 
            'location', 'status', 'session_type', 'duration_minutes', 
            'is_online', 'is_recurring', 'is_emergency', 'is_part_of_series'
        ]
    
    def get_therapist_name(self, obj):
        """Get therapist full name"""
        return obj.therapist.full_name if obj.therapist else None
    
    def get_patient_name(self, obj):
        """Get patient name"""
        return obj.patient.full_name if obj.patient else "Unknown Patient"
    
    def get_is_part_of_series(self, obj):
        """Check if this session is part of a recurring series"""
        return obj.is_recurring or obj.recurrence_parent is not None


class SessionStatsSerializer(serializers.Serializer):
    """Serializer for session statistics"""
    total_sessions = serializers.IntegerField()
    completed_sessions = serializers.IntegerField()
    cancelled_sessions = serializers.IntegerField()
    no_show_sessions = serializers.IntegerField()
    upcoming_sessions = serializers.IntegerField()
    total_patients = serializers.IntegerField()
    average_session_effectiveness = serializers.FloatField()
    sessions_by_status = serializers.ListField()
    sessions_by_type = serializers.ListField()


class SessionReminderSerializer(serializers.ModelSerializer):
    """Serializer for session reminders"""
    session = SessionSerializer(read_only=True)
    
    class Meta:
        model = SessionReminder
        fields = [
            'id', 'session', 'reminder_type', 'send_at', 'hours_before',
            'is_sent', 'sent_at', 'delivery_status', 'custom_message',
            'created_at'
        ]


class PatientSessionSerializer(serializers.ModelSerializer):
    """Patient-specific session serializer with appointment labeling and WebSocket support"""
    therapist = TherapistBasicSerializer(read_only=True)
    appointment_label = serializers.SerializerMethodField()
    session_status_display = serializers.SerializerMethodField()
    time_until_session = serializers.SerializerMethodField()
    can_join_session = serializers.SerializerMethodField()
    websocket_url = serializers.SerializerMethodField()
    is_part_of_series = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'session_number', 'session_type', 'scheduled_date',
            'actual_start_time', 'actual_end_time', 'duration_minutes',
            'status', 'session_status_display', 'location', 'is_online', 
            'therapist',
            # Session summary fields
            'session_summary', 'patient_goals', 'homework_assigned', 'next_session_goals', 
            'summary_written_at',
            'patient_mood_before', 'patient_mood_after', 'mood_improvement', 
            'appointment_label', 'time_until_session', 'can_join_session',
            'is_recurring', 'is_emergency', 'is_part_of_series',
            'websocket_room_id', 'websocket_url', 'created_at'
        ]
    
    def get_is_part_of_series(self, obj):
        return obj.is_recurring or obj.recurrence_parent is not None
    
    def get_appointment_label(self, obj):
        """Generate appointment label for patient view"""
        if obj.is_emergency:
            return "Emergency Session"
        elif obj.status == 'UPCOMING':
            return "Therapy Appointment"
        elif obj.status == 'IN_PROGRESS':
            return "Session in Progress"
        elif obj.status == 'COMPLETED':
            return "Completed Session"
        elif obj.status == 'CANCELLED':
            return "Cancelled Appointment"
        elif obj.status == 'NO_SHOW':
            return "Missed Appointment"
        elif obj.status == 'RESCHEDULED':
            return "Rescheduled Appointment"
        else:
            return "Therapy Session"
    
    def get_session_status_display(self, obj):
        """Get user-friendly status display for patients"""
        status_map = {
            'UPCOMING': 'Upcoming',
            'IN_PROGRESS': 'In Progress',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled',
            'NO_SHOW': 'Missed',
            'RESCHEDULED': 'Rescheduled',
            'REQUESTED': 'Pending Approval'
        }
        return status_map.get(obj.status, obj.status.title())
    
    def get_time_until_session(self, obj):
        """Calculate time until session for upcoming appointments"""
        if obj.status == 'UPCOMING':
            now = timezone.now()
            if obj.scheduled_date > now:
                time_diff = obj.scheduled_date - now
                days = time_diff.days
                hours, remainder = divmod(time_diff.seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                
                if days > 0:
                    return f"{days} day{'s' if days != 1 else ''}"
                elif hours > 0:
                    return f"{hours} hour{'s' if hours != 1 else ''}"
                elif minutes > 0:
                    return f"{minutes} minute{'s' if minutes != 1 else ''}"
                else:
                    return "Starting soon"
        return None
    
    def get_can_join_session(self, obj):
        """Determine if patient can join the session (for online sessions)"""
        if not obj.is_online:
            return False
        
        if obj.status == 'IN_PROGRESS':
            return True
        
        if obj.status == 'UPCOMING':
            now = timezone.now()
            # Allow joining 15 minutes before scheduled time
            join_time = obj.scheduled_date - timedelta(minutes=15)
            return now >= join_time
        
        return False
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            request = self.context.get('request')
            if request:
                host = request.get_host()
                protocol = 'wss' if request.is_secure() else 'ws'
                return f"{protocol}://{host}/ws/therapy-session/{obj.websocket_room_id}/"
        return None
    
    def get_goals_worked_on_details(self, obj):
        """Return detailed information about linked goals"""
        from patients.serializers import PatientGoalSerializer
        goals = obj.goals_worked_on.all()
        return PatientGoalSerializer(goals, many=True).data


class TherapistSessionSerializer(serializers.ModelSerializer):
    """Therapist-specific session serializer with full management details and WebSocket support"""
    patient = PatientBasicSerializer(read_only=True)
    actual_duration_minutes = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    mood_improvement = serializers.ReadOnlyField()
    session_actions = serializers.SerializerMethodField()
    patient_display_name = serializers.SerializerMethodField()
    revenue_status = serializers.SerializerMethodField()
    session_summary = serializers.SerializerMethodField()
    websocket_url = serializers.SerializerMethodField()
    can_start_websocket = serializers.SerializerMethodField()
    recurrence_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'patient', 'patient_display_name', 'session_number', 'session_type',
            'scheduled_date', 'actual_start_time', 'actual_end_time',
            'duration_minutes', 'actual_duration_minutes', 'status',
            'location', 'is_online', 'session_notes', 'patient_goals',
            'homework_assigned', 'next_session_goals', 'patient_mood_before',
            'patient_mood_after', 'mood_improvement', 'therapist_observations',
            'session_effectiveness', 'consent_recording', 'consent_ai_analysis',
            'fee_charged', 'payment_status', 'revenue_status', 'is_overdue', 
            'session_actions', 'session_summary', 'is_recurring', 'recurring_weeks',
            'is_emergency', 'recurrence_info',
            'websocket_room_id', 'websocket_active', 'websocket_url', 'can_start_websocket',
            'created_at', 'updated_at'
        ]
    
    def get_recurrence_info(self, obj):
        """Get recurrence information"""
        if not obj.is_recurring and not obj.recurrence_parent:
            return None
        
        if obj.recurrence_parent:
            parent = obj.recurrence_parent
            siblings = Session.objects.filter(recurrence_parent=parent).count()
            return {
                'is_parent': False,
                'parent_id': str(parent.id),
                'total_in_series': siblings + 1
            }
        else:
            children = Session.objects.filter(recurrence_parent=obj).count()
            return {
                'is_parent': True,
                'recurring_weeks': obj.recurring_weeks,
                'total_sessions_created': children + 1
            }
    
    def get_patient_display_name(self, obj):
        """Get display name for patient"""
        return obj.patient.full_name if obj.patient else "Unknown Patient"
    
    def get_session_actions(self, obj):
        """Get available actions for the session based on status"""
        actions = []
        
        if obj.status == 'UPCOMING':
            actions.extend(['start', 'cancel', 'reschedule', 'edit'])
        elif obj.status == 'IN_PROGRESS':
            actions.extend(['end', 'add_notes'])
        elif obj.status == 'COMPLETED':
            actions.extend(['view_notes', 'edit_notes'])
        elif obj.status == 'CANCELLED':
            actions.extend(['reschedule', 'delete'])
        elif obj.status == 'REQUESTED':
            actions.extend(['approve', 'reject'])
        
        return actions
    
    def get_revenue_status(self, obj):
        """Get revenue status information"""
        if obj.fee_charged:
            return {
                'amount': str(obj.fee_charged),
                'status': obj.payment_status,
                'is_paid': obj.payment_status == 'paid'
            }
        return {
            'amount': '0.00',
            'status': 'not_applicable',
            'is_paid': False
        }
    
    def get_session_summary(self, obj):
        """Get a brief summary of the session for therapist overview"""
        summary = {
            'has_notes': bool(obj.session_notes),
            'has_mood_data': bool(obj.patient_mood_before or obj.patient_mood_after),
            'has_homework': bool(obj.homework_assigned),
            'effectiveness_rating': obj.session_effectiveness,
            'consent_given': {
                'recording': obj.consent_recording,
                'ai_analysis': obj.consent_ai_analysis
            },
            'is_emergency': obj.is_emergency
        }
        
        if obj.status == 'COMPLETED':
            summary['completion_time'] = obj.actual_end_time
            summary['duration'] = obj.actual_duration_minutes
        
        return summary
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            request = self.context.get('request')
            if request:
                host = request.get_host()
                protocol = 'wss' if request.is_secure() else 'ws'
                return f"{protocol}://{host}/ws/therapy-session/{obj.websocket_room_id}/"
        return None
    
    def get_can_start_websocket(self, obj):
        """Determine if WebSocket connection can be started"""
        return (
            obj.is_online and 
            obj.status in ['UPCOMING', 'IN_PROGRESS'] and
            (obj.consent_recording or obj.consent_ai_analysis)
        )


class SessionRequestSerializer(serializers.ModelSerializer):
    """Serializer for patients to request sessions"""
    therapist_id = serializers.UUIDField(write_only=True, required=True)
    
    class Meta:
        model = Session
        fields = [
            'therapist_id', 'scheduled_date', 'location', 'is_online', 
            'patient_goals', 'duration_minutes'
        ]
    
    def validate_therapist_id(self, value):
        """Validate that therapist exists and patient is connected to them"""
        try:
            therapist = User.objects.get(id=value, user_type='therapist')
            patient = self.context['request'].user
            
            # Check if patient is connected to this therapist
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("You are not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Therapist not found.")
    
    def create(self, validated_data):
        therapist_id = validated_data.pop('therapist_id')
        therapist = User.objects.get(id=therapist_id)
        patient = self.context['request'].user
        
        validated_data['therapist'] = therapist
        validated_data['patient'] = patient
        validated_data['status'] = 'REQUESTED'
        validated_data['is_quick_session'] = False
        
        return super().create(validated_data)


class EnhancedPatientCreateSerializer(serializers.Serializer):
    """Enhanced serializer for creating patients with comprehensive fields"""
    
    # Required fields
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    phone_number = serializers.CharField(max_length=20, required=True)
    
    # Optional user fields
    email = serializers.EmailField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=User.GENDER_CHOICES, 
        required=False, 
        allow_blank=True
    )
    
    # Optional patient profile fields
    primary_concern = serializers.CharField(required=False, allow_blank=True)
    therapy_start_date = serializers.DateField(required=False, allow_null=True)
    session_frequency = serializers.ChoiceField(
        choices=PatientProfile.SESSION_FREQUENCY_CHOICES,
        default='weekly',
        required=False
    )
    preferred_session_days = serializers.ListField(
        child=serializers.ChoiceField(choices=PatientProfile.WEEKDAY_CHOICES),
        required=False,
        allow_empty=True
    )
    emergency_contact_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    medical_history = serializers.CharField(required=False, allow_blank=True)
    current_medications = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.ChoiceField(
        choices=[('en', 'English'), ('ur', 'Urdu')],
        default='en',
        required=False
    )
    
    def validate_phone_number(self, value):
        """Validate phone number format and uniqueness"""
        normalized_phone = ''.join(ch for ch in str(value or '').strip() if ch.isdigit())

        if not normalized_phone:
            raise serializers.ValidationError("Phone number is required.")
        
        # Check if phone number is already in use after normalization
        if User.objects.filter(phone_number=normalized_phone).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        
        return normalized_phone
    
    def validate_email(self, value):
        """Validate email uniqueness if provided"""
        normalized_email = (value or '').strip().lower()

        if normalized_email and User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized_email
    
    def validate_preferred_session_days(self, value):
        """Validate preferred session days"""
        if value:
            valid_days = [choice[0] for choice in PatientProfile.WEEKDAY_CHOICES]
            for day in value:
                if day not in valid_days:
                    raise serializers.ValidationError(f"'{day}' is not a valid weekday choice.")
        return value
    
    def create(self, validated_data):
        """Create user and patient profile with enhanced data"""
        # Extract user data
        user_data = {
            'first_name': validated_data.get('first_name'),
            'last_name': validated_data.get('last_name'),
            'phone_number': validated_data.get('phone_number'),
            'email': validated_data.get('email', ''),
            'date_of_birth': validated_data.get('date_of_birth'),
            'gender': validated_data.get('gender'),
            'user_type': 'patient',
        }
        
        # Generate username from email or phone
        if user_data['email']:
            user_data['username'] = user_data['email']
        else:
            user_data['username'] = user_data['phone_number']
        
             # Generate random password
        # user_data['password'] = User.objects.make_random_password()
        # Generate random password (this will be hashed by create_user)
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for i in range(12))
        user_data['password'] = password
        
        # Extract patient profile data
        patient_data = {
            'primary_concern': validated_data.get('primary_concern', ''),
            'therapy_start_date': validated_data.get('therapy_start_date'),
            'session_frequency': validated_data.get('session_frequency', 'weekly'),
            'emergency_contact_name': validated_data.get('emergency_contact_name', ''),
            'emergency_contact_phone': validated_data.get('emergency_contact_phone', ''),
            'address': validated_data.get('address', ''),
            'medical_history': validated_data.get('medical_history', ''),
            'current_medications': validated_data.get('current_medications', ''),
            'preferred_language': validated_data.get('preferred_language', 'en'),
        }
        
        # Handle preferred session days
        preferred_days = validated_data.get('preferred_session_days', [])
        if preferred_days:
            patient_data['preferred_session_days'] = ','.join(preferred_days)
        
        # Get therapist from context
        therapist = self.context['therapist']
        
        # Create patient using therapist's create_patient method
        patient_profile = therapist.create_patient(user_data, patient_data)
        
        # Return the created data for response
        return {
            'patient_profile': patient_profile,
            'temporary_password': user_data['password']
        }



class SessionScheduleSerializer(serializers.Serializer):
    """Serializer for scheduling sessions"""
    patient_id = serializers.UUIDField(required=True)
    scheduled_date = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(default=60, min_value=15, max_value=480)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    is_online = serializers.BooleanField(default=False)
    patient_goals = serializers.CharField(required=False, allow_blank=True)
    fee_charged = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    consent_recording = serializers.BooleanField(required=False, default=False)
    consent_ai_analysis = serializers.BooleanField(required=False, default=False)
    
    def validate_patient_id(self, value):
        """Validate that patient exists and is connected to therapist"""
        try:
            patient = User.objects.get(id=value, user_type='patient')
            therapist = self.context['request'].user
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("Patient is not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")
    
    def validate_scheduled_date(self, value):
        """Validate that scheduled date is in the future"""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value


class RecurringSessionScheduleSerializer(serializers.Serializer):
    """Serializer for scheduling recurring sessions based on patient preferences"""
    patient_id = serializers.UUIDField(required=True)
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    number_of_sessions = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=52)
    session_time = serializers.TimeField(required=True)
    duration_minutes = serializers.IntegerField(default=60, min_value=15, max_value=480)
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    is_online = serializers.BooleanField(default=False)
    fee_charged = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    # Override patient preferences
    override_frequency = serializers.ChoiceField(
        choices=PatientProfile.SESSION_FREQUENCY_CHOICES,
        required=False,
        allow_null=True,
        help_text="Override patient's default session frequency"
    )
    override_days = serializers.ListField(
        child=serializers.ChoiceField(choices=PatientProfile.WEEKDAY_CHOICES),
        required=False,
        allow_empty=True,
        help_text="Override patient's preferred session days"
    )
    
    def validate_patient_id(self, value):
        """Validate that patient exists and is connected to therapist"""
        try:
            patient = User.objects.get(id=value, user_type='patient')
            therapist = self.context['request'].user
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("Patient is not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")
    
    def validate(self, attrs):
        """Validate that either end_date or number_of_sessions is provided"""
        end_date = attrs.get('end_date')
        number_of_sessions = attrs.get('number_of_sessions')
        start_date = attrs.get('start_date')
        
        if not end_date and not number_of_sessions:
            raise serializers.ValidationError(
                "Either end_date or number_of_sessions must be provided."
            )
        
        if start_date:
            from django.utils import timezone
            if start_date <= timezone.now().date():
                raise serializers.ValidationError("Start date must be in the future.")
        
        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError("End date must be after start date.")
        
        return attrs


class SessionScheduleResponseSerializer(serializers.Serializer):
    """Response serializer for scheduled sessions"""
    sessions_created = serializers.IntegerField()
    sessions = SessionListSerializer(many=True)
    patient_info = serializers.DictField()
    schedule_summary = serializers.DictField()


class BulkSessionUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating sessions"""
    session_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50
    )
    action = serializers.ChoiceField(choices=[
        ('cancel', 'Cancel'),
        ('reschedule', 'Reschedule'),
        ('update_location', 'Update Location'),
        ('update_duration', 'Update Duration')
    ])
    
    # Optional fields based on action
    new_date = serializers.DateTimeField(required=False, allow_null=True)
    new_location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    new_duration = serializers.IntegerField(min_value=15, max_value=480, required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate required fields based on action"""
        action = attrs.get('action')
        
        if action == 'reschedule' and not attrs.get('new_date'):
            raise serializers.ValidationError("new_date is required for reschedule action.")
        
        if action == 'update_location' and not attrs.get('new_location'):
            raise serializers.ValidationError("new_location is required for update_location action.")
        
        if action == 'update_duration' and not attrs.get('new_duration'):
            raise serializers.ValidationError("new_duration is required for update_duration action.")
        
        return attrs