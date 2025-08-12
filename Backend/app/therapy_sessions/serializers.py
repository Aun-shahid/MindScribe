from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Session, SessionTemplate, PatientProgress, SessionReminder,
    TherapistAvailability, SessionQRCode, SessionAudio, SessionInsight
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
    """Full session serializer for display with WebSocket support"""
    patient = PatientBasicSerializer(read_only=True)
    therapist = TherapistBasicSerializer(read_only=True)
    actual_duration_minutes = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    mood_improvement = serializers.ReadOnlyField()
    websocket_url = serializers.SerializerMethodField()
    can_start_websocket = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = [
            'id', 'patient', 'therapist', 'session_number', 'session_type',
            'is_quick_session', 'quick_session_patient_name', 'transcription_id',
            'scheduled_date', 'actual_start_time', 'actual_end_time',
            'duration_minutes', 'actual_duration_minutes', 'status', 'location',
            'is_online', 'session_notes', 'patient_goals', 'homework_assigned',
            'next_session_goals', 'patient_mood_before', 'patient_mood_after',
            'mood_improvement', 'therapist_observations', 'session_effectiveness',
            'consent_recording', 'consent_ai_analysis', 'fee_charged',
            'payment_status', 'ai_mood_analysis', 'ai_key_topics', 
            'ai_sentiment_score', 'ai_recommendations', 'is_overdue',
            'websocket_room_id', 'websocket_active', 'websocket_url', 
            'can_start_websocket', 'created_at', 'updated_at'
        ]
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            # Use WSS (secure WebSocket) protocol
            request = self.context.get('request')
            if request:
                host = request.get_host()
                # Replace http/https with wss for secure WebSocket
                if request.is_secure():
                    protocol = 'wss'
                else:
                    protocol = 'ws'  # Use ws for development, wss for production
                
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
    """Serializer for creating new sessions"""
    patient_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    quick_session_patient_name = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Session
        fields = [
            'patient_id', 'quick_session_patient_name', 'session_type', 'scheduled_date', 
            'duration_minutes', 'location', 'is_online', 'patient_goals', 'fee_charged',
            'consent_recording', 'consent_ai_analysis'
        ]
    
    def validate(self, attrs):
        """Validate that either patient_id or quick_session_patient_name is provided"""
        patient_id = attrs.get('patient_id')
        quick_session_patient_name = attrs.get('quick_session_patient_name')
        
        if not patient_id and not quick_session_patient_name:
            raise serializers.ValidationError(
                "Either patient_id or quick_session_patient_name must be provided."
            )
        
        return attrs
    
    def validate_patient_id(self, value):
        """Validate that patient exists and is connected to therapist"""
        if value is None:
            return value
            
        try:
            patient = User.objects.get(id=value, user_type='patient')
            # Check if patient is connected to the therapist
            therapist = self.context['request'].user
            if not hasattr(patient, 'patient_profile') or not patient.patient_profile.therapist or patient.patient_profile.therapist.user != therapist:
                raise serializers.ValidationError("Patient is not connected to this therapist.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found.")
    
    def create(self, validated_data):
        patient_id = validated_data.pop('patient_id', None)
        quick_session_patient_name = validated_data.get('quick_session_patient_name')
        
        if patient_id:
            # Regular session with assigned patient
            patient = User.objects.get(id=patient_id)
            validated_data['patient'] = patient
            validated_data['is_quick_session'] = False
        else:
            # Quick session without assigned patient
            validated_data['patient'] = None
            validated_data['is_quick_session'] = True
            
        return super().create(validated_data)


class SessionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating sessions"""
    
    class Meta:
        model = Session
        fields = [
            'session_type', 'scheduled_date', 'duration_minutes', 'status',
            'location', 'is_online', 'session_notes', 'patient_goals',
            'homework_assigned', 'next_session_goals', 'patient_mood_before',
            'patient_mood_after', 'therapist_observations', 'session_effectiveness',
            'consent_recording', 'consent_ai_analysis', 'fee_charged', 'payment_status'
        ]


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
    """Serializer for therapist availability"""
    
    class Meta:
        model = TherapistAvailability
        fields = [
            'id', 'day_of_week', 'start_time', 'end_time', 'is_available',
            'max_sessions', 'session_duration', 'effective_from',
            'effective_until', 'location', 'is_online_available',
            'created_at', 'updated_at'
        ]


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
    
    class Meta:
        model = Session
        fields = [
            'id', 'therapist_name', 'patient_name', 'session_date', 
            'location', 'status', 'session_type', 'duration_minutes', 'is_online'
        ]
    
    def get_therapist_name(self, obj):
        """Get therapist full name"""
        return obj.therapist.full_name if obj.therapist else None
    
    def get_patient_name(self, obj):
        """Get patient name (handles quick sessions)"""
        if obj.is_quick_session and obj.quick_session_patient_name:
            return obj.quick_session_patient_name
        elif obj.patient:
            return obj.patient.full_name
        else:
            return "Unknown Patient"


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
    
    class Meta:
        model = Session
        fields = [
            'id', 'session_number', 'session_type', 'scheduled_date',
            'actual_start_time', 'actual_end_time', 'duration_minutes',
            'status', 'session_status_display', 'location', 'is_online', 
            'therapist', 'patient_goals', 'homework_assigned', 'next_session_goals', 
            'patient_mood_before', 'patient_mood_after', 'mood_improvement', 
            'appointment_label', 'time_until_session', 'can_join_session',
            'websocket_room_id', 'websocket_url', 'created_at'
        ]
    
    def get_appointment_label(self, obj):
        """Generate appointment label for patient view"""
        if obj.status == 'UPCOMING':
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
            'RESCHEDULED': 'Rescheduled'
        }
        return status_map.get(obj.status, obj.status.title())
    
    def get_time_until_session(self, obj):
        """Calculate time until session for upcoming appointments"""
        if obj.status == 'UPCOMING':
            from django.utils import timezone
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
            from django.utils import timezone
            from datetime import timedelta
            now = timezone.now()
            # Allow joining 15 minutes before scheduled time
            join_time = obj.scheduled_date - timedelta(minutes=15)
            return now >= join_time
        
        return False
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            # Use WSS (secure WebSocket) protocol
            request = self.context.get('request')
            if request:
                host = request.get_host()
                # Replace http/https with wss for secure WebSocket
                if request.is_secure():
                    protocol = 'wss'
                else:
                    protocol = 'ws'  # Use ws for development, wss for production
                
                return f"{protocol}://{host}/ws/therapy-session/{obj.websocket_room_id}/"
        return None


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
    
    class Meta:
        model = Session
        fields = [
            'id', 'patient', 'patient_display_name', 'session_number', 'session_type',
            'is_quick_session', 'quick_session_patient_name',
            'scheduled_date', 'actual_start_time', 'actual_end_time',
            'duration_minutes', 'actual_duration_minutes', 'status',
            'location', 'is_online', 'session_notes', 'patient_goals',
            'homework_assigned', 'next_session_goals', 'patient_mood_before',
            'patient_mood_after', 'mood_improvement', 'therapist_observations',
            'session_effectiveness', 'consent_recording', 'consent_ai_analysis',
            'fee_charged', 'payment_status', 'revenue_status', 'is_overdue', 
            'session_actions', 'session_summary', 'websocket_room_id', 
            'websocket_active', 'websocket_url', 'can_start_websocket',
            'created_at', 'updated_at'
        ]
    
    def get_patient_display_name(self, obj):
        """Get display name for patient (handles quick sessions)"""
        if obj.is_quick_session and obj.quick_session_patient_name:
            return obj.quick_session_patient_name
        elif obj.patient:
            return obj.patient.full_name
        else:
            return "Unknown Patient"
    
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
        
        # Quick session specific actions
        if obj.is_quick_session and obj.status == 'UPCOMING':
            actions.append('assign_patient')
        
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
            }
        }
        
        if obj.status == 'COMPLETED':
            summary['completion_time'] = obj.actual_end_time
            summary['duration'] = obj.actual_duration_minutes
        
        return summary
    
    def get_websocket_url(self, obj):
        """Generate secure WebSocket URL for the session"""
        if obj.is_online and obj.status in ['UPCOMING', 'IN_PROGRESS']:
            # Use WSS (secure WebSocket) protocol
            request = self.context.get('request')
            if request:
                host = request.get_host()
                # Replace http/https with wss for secure WebSocket
                if request.is_secure():
                    protocol = 'wss'
                else:
                    protocol = 'ws'  # Use ws for development, wss for production
                
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
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        
        # Check if phone number is already in use
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        
        return value
    
    def validate_email(self, value):
        """Validate email uniqueness if provided"""
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
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
        user_data['password'] = User.objects.make_random_password()
        
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

