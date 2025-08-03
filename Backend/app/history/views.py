from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Avg, Count, Q
from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter
from datetime import datetime, timedelta
from collections import defaultdict

from .models import (
    MoodEntry, JournalEntry, ActivityLog, MedicationLog, SleepLog,
    SymptomTracker, CopingStrategy, PatientMilestone, ReflectionPrompt,
    ReflectionEntry, PatientGoal, ProgressTracking
)
from .serializers import (
    MoodEntrySerializer, MoodEntryCreateSerializer, JournalEntrySerializer,
    JournalEntryCreateSerializer, ActivityLogSerializer, MedicationLogSerializer,
    SleepLogSerializer, SymptomTrackerSerializer, CopingStrategySerializer,
    PatientMilestoneSerializer, ReflectionPromptSerializer, ReflectionEntrySerializer,
    PatientGoalSerializer, ProgressTrackingSerializer
)

User = get_user_model()


@extend_schema(
    tags=['History'],
    summary="Patient history dashboard",
    description="Get comprehensive dashboard with recent entries, statistics, and trends",
    examples=[
        OpenApiExample(
            'Dashboard Response',
            summary='Complete patient history dashboard',
            description='Comprehensive dashboard with all patient history data',
            value={
                "recent_entries": {
                    "mood": [{"id": "123", "mood": "happy", "mood_score": 7}],
                    "journal": [{"id": "456", "title": "Good day", "word_count": 150}]
                },
                "statistics": {
                    "total_entries": {"mood": 45, "journal": 23},
                    "mood_trend": [7, 6, 8, 5, 7],
                    "average_mood": 6.8,
                    "streak_days": 15
                }
            },
            response_only=True,
        ),
    ]
)
class PatientHistoryDashboardView(generics.GenericAPIView):
    """Get patient history dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    class DashboardResponseSerializer(serializers.Serializer):
        recent_entries = serializers.DictField()
        statistics = serializers.DictField()
    
    serializer_class = DashboardResponseSerializer    
   
    def get(self, request):
        """Get comprehensive dashboard data"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access history dashboard.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get recent entries (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        
        recent_mood = MoodEntry.objects.filter(patient=user, created_at__gte=week_ago)[:5]
        recent_journal = JournalEntry.objects.filter(patient=user, created_at__gte=week_ago)[:5]
        recent_activities = ActivityLog.objects.filter(patient=user, activity_date__gte=week_ago)[:5]
        active_goals = PatientGoal.objects.filter(patient=user, status='active')[:5]
        recent_milestones = PatientMilestone.objects.filter(patient=user, achieved_date__gte=week_ago.date())[:3]
        
        # Statistics
        total_entries = {
            'mood': MoodEntry.objects.filter(patient=user).count(),
            'journal': JournalEntry.objects.filter(patient=user).count(),
            'activities': ActivityLog.objects.filter(patient=user).count(),
            'goals': PatientGoal.objects.filter(patient=user).count(),
            'milestones': PatientMilestone.objects.filter(patient=user).count(),
        }
        
        # Mood trend (last 7 days)
        mood_trend = []
        for i in range(7):
            day = timezone.now().date() - timedelta(days=i)
            avg_mood = MoodEntry.objects.filter(
                patient=user, created_at__date=day
            ).aggregate(avg=Avg('mood_score'))['avg']
            mood_trend.append(int(avg_mood) if avg_mood else 0)
        mood_trend.reverse()
        
        # Calculate streak days and average mood
        streak_days = self.calculate_streak_days(user)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        avg_mood = MoodEntry.objects.filter(
            patient=user, created_at__gte=thirty_days_ago
        ).aggregate(avg=Avg('mood_score'))['avg'] or 0
        
        dashboard_data = {
            'recent_entries': {
                'mood': MoodEntrySerializer(recent_mood, many=True).data,
                'journal': JournalEntrySerializer(recent_journal, many=True).data,
                'activities': ActivityLogSerializer(recent_activities, many=True).data,
                'goals': PatientGoalSerializer(active_goals, many=True).data,
                'milestones': PatientMilestoneSerializer(recent_milestones, many=True).data,
            },
            'statistics': {
                'total_entries': total_entries,
                'mood_trend': mood_trend,
                'average_mood': round(avg_mood, 1),
                'streak_days': streak_days,
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
    
    def calculate_streak_days(self, user):
        """Calculate consecutive days with any entries"""
        streak = 0
        current_date = timezone.now().date()
        
        while True:
            has_entry = (
                MoodEntry.objects.filter(patient=user, created_at__date=current_date).exists() or
                JournalEntry.objects.filter(patient=user, created_at__date=current_date).exists() or
                ActivityLog.objects.filter(patient=user, activity_date__date=current_date).exists()
            )
            
            if has_entry:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break
        
        return streak


@extend_schema(
    tags=['History'],
    summary="General history entries",
    description="List or create history entries of any type with flexible filtering",
    parameters=[
        OpenApiParameter(name='type', description='Entry type: mood, journal, activity, sleep, symptom, coping, milestone, goal, progress, reflection, medication', required=False, type=str),
        OpenApiParameter(name='start_date', description='Filter from date (YYYY-MM-DD)', required=False, type=str),
        OpenApiParameter(name='end_date', description='Filter until date (YYYY-MM-DD)', required=False, type=str),
        OpenApiParameter(name='limit', description='Limit results (default: 20)', required=False, type=int),
    ],
    examples=[
        OpenApiExample(
            'List All Recent Entries',
            summary='Get recent entries of all types',
            description='Get the most recent entries across all types',
            value='GET /api/history/entries/?limit=10',
            request_only=True,
        ),
        OpenApiExample(
            'Create Mood Entry',
            summary='Create a mood entry',
            description='Create a new mood tracking entry',
            value={
                "type": "mood",
                "mood": "happy",
                "mood_score": 7,
                "energy_level": 8,
                "triggers_list": ["work", "social"],
                "notes": "Had a productive day at work"
            },
            request_only=True,
        ),
    ]
)
class HistoryEntriesView(generics.GenericAPIView):
    """General history entries management"""
    permission_classes = [permissions.IsAuthenticated]
    
    class HistoryEntryRequestSerializer(serializers.Serializer):
        type = serializers.CharField(required=True)
        
    class HistoryEntryResponseSerializer(serializers.Serializer):
        type = serializers.CharField()
        count = serializers.IntegerField()
        entries = serializers.ListField()
    
    serializer_class = HistoryEntryResponseSerializer   
 
    def get(self, request):
        """List entries with filtering"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access history entries.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry_type = request.query_params.get('type')
        limit = int(request.query_params.get('limit', 20))
        
        if entry_type:
            # Get specific type
            queryset = self.get_queryset_by_type(user, entry_type)
            if queryset is None:
                return Response(
                    {'detail': 'Invalid entry type.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            queryset = self.apply_filters(queryset, request.query_params, entry_type)[:limit]
            serializer_class = self.get_serializer_by_type(entry_type)
            
            return Response({
                'type': entry_type,
                'count': len(queryset),
                'entries': serializer_class(queryset, many=True).data
            }, status=status.HTTP_200_OK)
        else:
            # Get mixed recent entries
            recent_entries = []
            
            # Get recent from each type
            mood_entries = MoodEntry.objects.filter(patient=user)[:3]
            journal_entries = JournalEntry.objects.filter(patient=user)[:3]
            activity_entries = ActivityLog.objects.filter(patient=user)[:3]
            
            for entry in mood_entries:
                recent_entries.append({
                    'type': 'mood',
                    'id': str(entry.id),
                    'data': MoodEntrySerializer(entry).data,
                    'created_at': entry.created_at
                })
            
            for entry in journal_entries:
                recent_entries.append({
                    'type': 'journal',
                    'id': str(entry.id),
                    'data': JournalEntrySerializer(entry).data,
                    'created_at': entry.created_at
                })
            
            for entry in activity_entries:
                recent_entries.append({
                    'type': 'activity',
                    'id': str(entry.id),
                    'data': ActivityLogSerializer(entry).data,
                    'created_at': entry.activity_date
                })
            
            # Sort by date and limit
            recent_entries.sort(key=lambda x: x['created_at'], reverse=True)
            recent_entries = recent_entries[:limit]
            
            return Response({
                'mixed_entries': True,
                'count': len(recent_entries),
                'entries': recent_entries
            }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create new entry"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can create history entries.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry_type = request.data.get('type')
        if not entry_type:
            return Response(
                {'detail': 'Entry type is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return self.create_entry(user, entry_type, request.data)
    
    def create_entry(self, user, entry_type, data):
        """Create entry based on type"""
        serializer_class = self.get_create_serializer_by_type(entry_type)
        if not serializer_class:
            return Response(
                {'detail': 'Invalid entry type for creation.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        entry_data = data.copy()
        entry_data.pop('type', None)
        
        serializer = serializer_class(data=entry_data, context={'request': {'user': user}})
        if serializer.is_valid():
            entry = serializer.save()
            response_serializer = self.get_serializer_by_type(entry_type)
            return Response({
                'detail': f'{entry_type.title()} entry created successfully.',
                'entry': response_serializer(entry).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_queryset_by_type(self, user, entry_type):
        """Get queryset based on entry type"""
        querysets = {
            'mood': MoodEntry.objects.filter(patient=user).order_by('-created_at'),
            'journal': JournalEntry.objects.filter(patient=user).order_by('-created_at'),
            'activity': ActivityLog.objects.filter(patient=user).order_by('-activity_date'),
            'sleep': SleepLog.objects.filter(patient=user).order_by('-sleep_date'),
            'symptom': SymptomTracker.objects.filter(patient=user).order_by('-symptom_date'),
            'coping': CopingStrategy.objects.filter(patient=user).order_by('-average_effectiveness'),
            'milestone': PatientMilestone.objects.filter(patient=user).order_by('-achieved_date'),
            'goal': PatientGoal.objects.filter(patient=user).order_by('-created_at'),
            'progress': ProgressTracking.objects.filter(patient=user).order_by('-date'),
            'reflection': ReflectionEntry.objects.filter(patient=user).order_by('-created_at'),
            'medication': MedicationLog.objects.filter(patient=user).order_by('-log_date'),
        }
        return querysets.get(entry_type)
    
    def get_serializer_by_type(self, entry_type):
        """Get serializer class based on entry type"""
        serializers = {
            'mood': MoodEntrySerializer,
            'journal': JournalEntrySerializer,
            'activity': ActivityLogSerializer,
            'sleep': SleepLogSerializer,
            'symptom': SymptomTrackerSerializer,
            'coping': CopingStrategySerializer,
            'milestone': PatientMilestoneSerializer,
            'goal': PatientGoalSerializer,
            'progress': ProgressTrackingSerializer,
            'reflection': ReflectionEntrySerializer,
            'medication': MedicationLogSerializer,
        }
        return serializers.get(entry_type)
    
    def get_create_serializer_by_type(self, entry_type):
        """Get create serializer class based on entry type"""
        serializers = {
            'mood': MoodEntryCreateSerializer,
            'journal': JournalEntryCreateSerializer,
            'activity': ActivityLogSerializer,
            'sleep': SleepLogSerializer,
            'symptom': SymptomTrackerSerializer,
            'coping': CopingStrategySerializer,
            'milestone': PatientMilestoneSerializer,
            'progress': ProgressTrackingSerializer,
            'reflection': ReflectionEntrySerializer,
            'medication': MedicationLogSerializer,
        }
        return serializers.get(entry_type)
    
    def apply_filters(self, queryset, params, entry_type):
        """Apply filters based on parameters"""
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        
        if start_date:
            if entry_type in ['mood', 'journal', 'reflection']:
                queryset = queryset.filter(created_at__date__gte=start_date)
            elif entry_type == 'activity':
                queryset = queryset.filter(activity_date__date__gte=start_date)
            elif entry_type == 'sleep':
                queryset = queryset.filter(sleep_date__gte=start_date)
            elif entry_type == 'symptom':
                queryset = queryset.filter(symptom_date__date__gte=start_date)
            elif entry_type == 'milestone':
                queryset = queryset.filter(achieved_date__gte=start_date)
            elif entry_type == 'progress':
                queryset = queryset.filter(date__gte=start_date)
            elif entry_type == 'medication':
                queryset = queryset.filter(log_date__gte=start_date)
        
        if end_date:
            if entry_type in ['mood', 'journal', 'reflection']:
                queryset = queryset.filter(created_at__date__lte=end_date)
            elif entry_type == 'activity':
                queryset = queryset.filter(activity_date__date__lte=end_date)
            elif entry_type == 'sleep':
                queryset = queryset.filter(sleep_date__lte=end_date)
            elif entry_type == 'symptom':
                queryset = queryset.filter(symptom_date__date__lte=end_date)
            elif entry_type == 'milestone':
                queryset = queryset.filter(achieved_date__lte=end_date)
            elif entry_type == 'progress':
                queryset = queryset.filter(date__lte=end_date)
            elif entry_type == 'medication':
                queryset = queryset.filter(log_date__lte=end_date)
        
        return queryset


@extend_schema(
    tags=['History'],
    summary="Individual history entry",
    description="Retrieve, update, or delete individual history entries of any type",
    examples=[
        OpenApiExample(
            'Update Entry',
            summary='Update any history entry',
            description='Update entry details (works with any entry type)',
            value={
                "mood_score": 8,
                "notes": "Updated notes - feeling much better now"
            },
            request_only=True,
        ),
    ]
)
class HistoryEntryDetailView(generics.GenericAPIView):
    """Individual history entry management"""
    permission_classes = [permissions.IsAuthenticated]
    
    class EntryDetailResponseSerializer(serializers.Serializer):
        type = serializers.CharField()
        entry = serializers.DictField()
    
    serializer_class = EntryDetailResponseSerializer    
   
    def get(self, request, pk):
        """Get individual entry details"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access history entries.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry, entry_type = self.get_entry_by_id(user, pk)
        if not entry:
            return Response(
                {'detail': 'Entry not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer_class = self.get_serializer_by_type(entry_type)
        return Response({
            'type': entry_type,
            'entry': serializer_class(entry).data
        }, status=status.HTTP_200_OK)
    
    def patch(self, request, pk):
        """Update individual entry"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can update history entries.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry, entry_type = self.get_entry_by_id(user, pk)
        if not entry:
            return Response(
                {'detail': 'Entry not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer_class = self.get_serializer_by_type(entry_type)
        serializer = serializer_class(entry, data=request.data, partial=True)
        
        if serializer.is_valid():
            updated_entry = serializer.save()
            return Response({
                'detail': f'{entry_type.title()} entry updated successfully.',
                'entry': serializer_class(updated_entry).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete individual entry"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can delete history entries.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        entry, entry_type = self.get_entry_by_id(user, pk)
        if not entry:
            return Response(
                {'detail': 'Entry not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        entry.delete()
        return Response({
            'detail': f'{entry_type.title()} entry deleted successfully.'
        }, status=status.HTTP_200_OK)
    
    def get_entry_by_id(self, user, entry_id):
        """Find entry by ID across all models"""
        models_and_types = [
            (MoodEntry, 'mood'),
            (JournalEntry, 'journal'),
            (ActivityLog, 'activity'),
            (SleepLog, 'sleep'),
            (SymptomTracker, 'symptom'),
            (CopingStrategy, 'coping'),
            (PatientMilestone, 'milestone'),
            (PatientGoal, 'goal'),
            (ProgressTracking, 'progress'),
            (ReflectionEntry, 'reflection'),
            (MedicationLog, 'medication'),
        ]
        
        for model, entry_type in models_and_types:
            try:
                entry = model.objects.get(id=entry_id, patient=user)
                return entry, entry_type
            except model.DoesNotExist:
                continue
        
        return None, None
    
    def get_serializer_by_type(self, entry_type):
        """Get serializer class based on entry type"""
        serializers = {
            'mood': MoodEntrySerializer,
            'journal': JournalEntrySerializer,
            'activity': ActivityLogSerializer,
            'sleep': SleepLogSerializer,
            'symptom': SymptomTrackerSerializer,
            'coping': CopingStrategySerializer,
            'milestone': PatientMilestoneSerializer,
            'goal': PatientGoalSerializer,
            'progress': ProgressTrackingSerializer,
            'reflection': ReflectionEntrySerializer,
            'medication': MedicationLogSerializer,
        }
        return serializers.get(entry_type)


# Specific entry type views for commonly used types
@extend_schema(
    tags=['History'],
    summary="Mood entries",
    description="Dedicated endpoint for mood tracking entries with mood-specific features",
    parameters=[
        OpenApiParameter(name='start_date', description='Filter from date', required=False, type=str),
        OpenApiParameter(name='limit', description='Limit results', required=False, type=int),
    ],
    examples=[
        OpenApiExample(
            'Create Mood Entry',
            summary='Create mood tracking entry',
            description='Record current mood with detailed information',
            value={
                "mood": "happy",
                "mood_score": 7,
                "energy_level": 8,
                "anxiety_level": 3,
                "triggers_list": ["work", "social"],
                "notes": "Had a productive day"
            },
            request_only=True,
        ),
    ]
)
class MoodEntriesView(generics.ListCreateAPIView):
    """Mood entries management"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MoodEntryCreateSerializer
        return MoodEntrySerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type != 'patient':
            return MoodEntry.objects.none()
        
        queryset = MoodEntry.objects.filter(patient=user).order_by('-created_at')
        
        # Apply filters
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        
        limit = self.request.query_params.get('limit')
        if limit:
            queryset = queryset[:int(limit)]
        
        return queryset


@extend_schema(
    tags=['History'],
    summary="Journal entries",
    description="Dedicated endpoint for personal journal entries with journaling-specific features",
    parameters=[
        OpenApiParameter(name='entry_type', description='Journal type: daily, gratitude, reflection, etc.', required=False, type=str),
        OpenApiParameter(name='favorites_only', description='Show only favorites (true/false)', required=False, type=str),
        OpenApiParameter(name='limit', description='Limit results', required=False, type=int),
    ],
    examples=[
        OpenApiExample(
            'Create Journal Entry',
            summary='Create personal journal entry',
            description='Write a personal journal entry with mood tracking',
            value={
                "title": "Daily Reflection",
                "content": "Today was challenging but I learned a lot about myself...",
                "entry_type": "daily",
                "mood_before": 4,
                "mood_after": 7,
                "tags_list": ["growth", "challenges", "learning"]
            },
            request_only=True,
        ),
    ]
)
class JournalEntriesView(generics.ListCreateAPIView):
    """Journal entries management"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return JournalEntryCreateSerializer
        return JournalEntrySerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type != 'patient':
            return JournalEntry.objects.none()
        
        queryset = JournalEntry.objects.filter(patient=user).order_by('-created_at')
        
        # Apply filters
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        
        favorites_only = self.request.query_params.get('favorites_only')
        if favorites_only == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        limit = self.request.query_params.get('limit')
        if limit:
            queryset = queryset[:int(limit)]
        
        return queryset


@extend_schema(
    tags=['History'],
    summary="Activity entries",
    description="Dedicated endpoint for activity tracking with mood impact analysis",
    parameters=[
        OpenApiParameter(name='activity_type', description='Activity type: exercise, meditation, social, etc.', required=False, type=str),
        OpenApiParameter(name='limit', description='Limit results', required=False, type=int),
    ],
    examples=[
        OpenApiExample(
            'Create Activity Entry',
            summary='Log an activity',
            description='Record an activity and its impact on mood and energy',
            value={
                "activity_type": "exercise",
                "activity_name": "Morning Run",
                "duration_minutes": 30,
                "intensity": 7,
                "mood_before": 5,
                "mood_after": 8,
                "energy_before": 4,
                "energy_after": 9,
                "notes": "Felt energized after the run"
            },
            request_only=True,
        ),
    ]
)
class ActivityEntriesView(generics.ListCreateAPIView):
    """Activity entries management"""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type != 'patient':
            return ActivityLog.objects.none()
        
        queryset = ActivityLog.objects.filter(patient=user).order_by('-activity_date')
        
        # Apply filters
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        
        limit = self.request.query_params.get('limit')
        if limit:
            queryset = queryset[:int(limit)]
        
        return queryset

@extend_schema(
    tags=['History'],
    summary="Goals and progress",
    description="Manage therapy goals and track progress with goal-specific actions",
    parameters=[
        OpenApiParameter(name='status', description='Goal status: active, completed, paused', required=False, type=str),
        OpenApiParameter(name='action', description='Action: list, update_progress', required=False, type=str),
    ],
    examples=[
        OpenApiExample(
            'Update Goal Progress',
            summary='Update progress on a goal',
            description='Record progress made on a therapy goal',
            value={
                "goal_id": "123e4567-e89b-12d3-a456-426614174000",
                "progress_percentage": 75,
                "notes": "Made significant progress this week"
            },
            request_only=True,
        ),
    ]
)
class GoalsProgressView(generics.GenericAPIView):
    """Goals and progress management"""
    permission_classes = [permissions.IsAuthenticated]
    
    class GoalsProgressResponseSerializer(serializers.Serializer):
        goals = serializers.ListField()
        progress_summary = serializers.DictField()
    
    serializer_class = GoalsProgressResponseSerializer
    
    def get(self, request):
        """List goals with optional filtering"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access goals.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = PatientGoal.objects.filter(patient=user).order_by('-created_at')
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        goals_data = PatientGoalSerializer(queryset, many=True).data
        
        # Add progress summary
        progress_summary = {
            'total_goals': queryset.count(),
            'active_goals': queryset.filter(status='active').count(),
            'completed_goals': queryset.filter(status='completed').count(),
            'average_progress': queryset.aggregate(avg=Avg('progress_percentage'))['avg'] or 0,
        }
        
        return Response({
            'goals': goals_data,
            'progress_summary': progress_summary
        }, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """Update goal progress"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can update goal progress.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        goal_id = request.data.get('goal_id')
        if not goal_id:
            return Response(
                {'detail': 'Goal ID is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            goal = PatientGoal.objects.get(id=goal_id, patient=user)
        except PatientGoal.DoesNotExist:
            return Response(
                {'detail': 'Goal not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        progress_percentage = request.data.get('progress_percentage')
        if progress_percentage is not None:
            if not (0 <= progress_percentage <= 100):
                return Response(
                    {'detail': 'Progress percentage must be between 0 and 100.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            goal.progress_percentage = progress_percentage
        
        # Auto-complete goal if 100%
        if goal.progress_percentage == 100:
            goal.status = 'completed'
        
        goal.save()
        
        return Response({
            'detail': 'Goal progress updated successfully.',
            'goal': PatientGoalSerializer(goal).data
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['History'],
    summary="History analytics",
    description="Comprehensive analytics and insights from patient history data",
    parameters=[
        OpenApiParameter(name='type', description='Analytics type: mood, activity, sleep, symptoms, overview', required=False, type=str),
        OpenApiParameter(name='days', description='Number of days to include (default: 30)', required=False, type=int),
    ],
    examples=[
        OpenApiExample(
            'Mood Analytics',
            summary='Get mood analytics',
            description='Get comprehensive mood analytics with trends and correlations',
            value='GET /api/history/analytics/?type=mood&days=30',
            request_only=True,
        ),
    ]
)
class HistoryAnalyticsView(generics.GenericAPIView):
    """History analytics and insights"""
    permission_classes = [permissions.IsAuthenticated]
    
    class AnalyticsResponseSerializer(serializers.Serializer):
        analytics = serializers.DictField()
    
    serializer_class = AnalyticsResponseSerializer
    
    def get(self, request):
        """Get analytics based on type"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access analytics.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        analytics_type = request.query_params.get('type', 'overview')
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        if analytics_type == 'mood':
            return self.get_mood_analytics(user, start_date)
        elif analytics_type == 'activity':
            return self.get_activity_analytics(user, start_date)
        elif analytics_type == 'overview':
            return self.get_overview_analytics(user, start_date)
        else:
            return Response(
                {'detail': 'Invalid analytics type. Use: mood, activity, overview'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_mood_analytics(self, user, start_date):
        """Get mood-specific analytics"""
        mood_entries = MoodEntry.objects.filter(
            patient=user, created_at__gte=start_date
        ).order_by('created_at')
        
        if not mood_entries.exists():
            return Response({'message': 'No mood data available'}, status=status.HTTP_200_OK)
        
        # Calculate analytics
        analytics = {
            'average_mood': mood_entries.aggregate(avg=Avg('mood_score'))['avg'],
            'mood_distribution': self.get_mood_distribution(mood_entries),
            'trend_data': self.get_mood_trend_data(mood_entries),
            'trigger_analysis': self.get_trigger_analysis(mood_entries),
        }
        
        return Response(analytics, status=status.HTTP_200_OK)
    
    def get_activity_analytics(self, user, start_date):
        """Get activity-specific analytics"""
        activities = ActivityLog.objects.filter(
            patient=user, activity_date__gte=start_date
        ).order_by('activity_date')
        
        analytics = {
            'total_activities': activities.count(),
            'activity_types': list(activities.values('activity_type').annotate(count=Count('id'))),
            'average_mood_impact': activities.aggregate(
                avg=Avg('mood_after') - Avg('mood_before')
            )['avg'] or 0,
            'most_effective': list(activities.order_by('-mood_after')[:5].values(
                'activity_name', 'mood_after', 'activity_type'
            )),
        }
        
        return Response(analytics, status=status.HTTP_200_OK)
    
    def get_overview_analytics(self, user, start_date):
        """Get comprehensive overview analytics"""
        analytics = {
            'entry_counts': {
                'mood': MoodEntry.objects.filter(patient=user, created_at__gte=start_date).count(),
                'journal': JournalEntry.objects.filter(patient=user, created_at__gte=start_date).count(),
                'activities': ActivityLog.objects.filter(patient=user, activity_date__gte=start_date).count(),
                'goals': PatientGoal.objects.filter(patient=user).count(),
                'milestones': PatientMilestone.objects.filter(patient=user, achieved_date__gte=start_date.date()).count(),
            },
            'engagement_score': self.calculate_engagement_score(user, start_date),
            'progress_indicators': {
                'active_goals': PatientGoal.objects.filter(patient=user, status='active').count(),
                'completed_goals': PatientGoal.objects.filter(patient=user, status='completed').count(),
                'recent_milestones': PatientMilestone.objects.filter(
                    patient=user, achieved_date__gte=start_date.date()
                ).count(),
            }
        }
        
        return Response(analytics, status=status.HTTP_200_OK)
    
    def get_mood_distribution(self, mood_entries):
        """Get mood distribution"""
        distribution = defaultdict(int)
        for entry in mood_entries:
            distribution[entry.mood] += 1
        return dict(distribution)
    
    def get_mood_trend_data(self, mood_entries):
        """Get mood trend data"""
        trend_data = []
        for entry in mood_entries:
            trend_data.append({
                'date': entry.created_at.date().isoformat(),
                'mood_score': entry.mood_score
            })
        return trend_data
    
    def get_trigger_analysis(self, mood_entries):
        """Analyze mood triggers"""
        trigger_data = defaultdict(list)
        for entry in mood_entries:
            if entry.triggers:
                triggers = entry.get_triggers_list()
                for trigger in triggers:
                    trigger_data[trigger].append(entry.mood_score)
        
        return [
            {
                'trigger': trigger,
                'average_mood': sum(scores) / len(scores),
                'frequency': len(scores)
            }
            for trigger, scores in trigger_data.items()
        ]
    
    def calculate_engagement_score(self, user, start_date):
        """Calculate user engagement score"""
        days_in_period = (timezone.now() - start_date).days
        total_entries = (
            MoodEntry.objects.filter(patient=user, created_at__gte=start_date).count() +
            JournalEntry.objects.filter(patient=user, created_at__gte=start_date).count() +
            ActivityLog.objects.filter(patient=user, activity_date__gte=start_date).count()
        )
        
        return min(100, int((total_entries / days_in_period) * 10)) if days_in_period > 0 else 0


@extend_schema(
    tags=['History'],
    summary="History statistics",
    description="Quick statistics and summary data for patient history",
    examples=[
        OpenApiExample(
            'Statistics Response',
            summary='History statistics',
            description='Quick overview of patient history statistics',
            value={
                "totals": {
                    "mood_entries": 45,
                    "journal_entries": 23,
                    "activities": 67,
                    "goals": 8,
                    "completed_goals": 3
                },
                "recent_activity": {
                    "last_mood_entry": "2024-01-15",
                    "last_journal_entry": "2024-01-14",
                    "streak_days": 12
                },
                "averages": {
                    "mood_score": 6.8,
                    "journal_word_count": 245
                }
            },
            response_only=True,
        ),
    ]
)
class HistoryStatsView(generics.GenericAPIView):
    """Quick history statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    class StatsResponseSerializer(serializers.Serializer):
        stats = serializers.DictField()
    
    serializer_class = StatsResponseSerializer
    
    def get(self, request):
        """Get quick statistics"""
        user = request.user
        if user.user_type != 'patient':
            return Response(
                {'detail': 'Only patients can access history statistics.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get totals
        totals = {
            'mood_entries': MoodEntry.objects.filter(patient=user).count(),
            'journal_entries': JournalEntry.objects.filter(patient=user).count(),
            'activities': ActivityLog.objects.filter(patient=user).count(),
            'goals': PatientGoal.objects.filter(patient=user).count(),
            'completed_goals': PatientGoal.objects.filter(patient=user, status='completed').count(),
            'milestones': PatientMilestone.objects.filter(patient=user).count(),
        }
        
        # Get recent activity
        last_mood = MoodEntry.objects.filter(patient=user).order_by('-created_at').first()
        last_journal = JournalEntry.objects.filter(patient=user).order_by('-created_at').first()
        
        recent_activity = {
            'last_mood_entry': last_mood.created_at.date().isoformat() if last_mood else None,
            'last_journal_entry': last_journal.created_at.date().isoformat() if last_journal else None,
            'streak_days': self.calculate_streak_days(user),
        }
        
        # Get averages
        mood_avg = MoodEntry.objects.filter(patient=user).aggregate(avg=Avg('mood_score'))['avg']
        journal_avg = JournalEntry.objects.filter(patient=user).aggregate(avg=Avg('word_count'))['avg']
        
        averages = {
            'mood_score': round(mood_avg, 1) if mood_avg else 0,
            'journal_word_count': int(journal_avg) if journal_avg else 0,
        }
        
        stats = {
            'totals': totals,
            'recent_activity': recent_activity,
            'averages': averages,
        }
        
        return Response(stats, status=status.HTTP_200_OK)
    
    def calculate_streak_days(self, user):
        """Calculate consecutive days with entries"""
        streak = 0
        current_date = timezone.now().date()
        
        while True:
            has_entry = (
                MoodEntry.objects.filter(patient=user, created_at__date=current_date).exists() or
                JournalEntry.objects.filter(patient=user, created_at__date=current_date).exists() or
                ActivityLog.objects.filter(patient=user, activity_date__date=current_date).exists()
            )
            
            if has_entry:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break
        
        return streak