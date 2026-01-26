"""Activity tracking views"""
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..models import ActivityLog
from ..serializers import ActivityLogSerializer, ActivityAnalyticsSerializer
from .permissions import IsPatient


@extend_schema_view(
    get=extend_schema(
        tags=['Patient - Activities'],
        summary='List activity logs',
        description='Get all activity logs with optional filtering by date, type, and more.',
        parameters=[
            OpenApiParameter(name='start_date', description='Filter from date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Filter to date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='activity_type', description='Filter by activity type', required=False, type=str),
            OpenApiParameter(name='limit', description='Limit results', required=False, type=int),
        ]
    ),
    post=extend_schema(
        tags=['Patient - Activities'],
        summary='Create activity log',
        description='Log a new activity with mood and energy tracking.'
    )
)
class ActivityLogListCreateView(generics.ListCreateAPIView):
    """
    GET: List all activity logs
    POST: Create a new activity log
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['activity_date', 'created_at', 'duration_minutes']
    ordering = ['-activity_date']
    
    def get_queryset(self):
        queryset = ActivityLog.objects.filter(patient=self.request.user)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(activity_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(activity_date__lte=end_date)
        
        # Filter by activity type
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        
        # Limit results
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        return queryset


@extend_schema_view(
    get=extend_schema(tags=['Patient - Activities'], summary='Get activity log details'),
    put=extend_schema(tags=['Patient - Activities'], summary='Update activity log (full)'),
    patch=extend_schema(tags=['Patient - Activities'], summary='Update activity log (partial)'),
    delete=extend_schema(tags=['Patient - Activities'], summary='Delete activity log')
)
class ActivityLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve an activity log
    PATCH/PUT: Update an activity log
    DELETE: Delete an activity log
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return ActivityLog.objects.filter(patient=self.request.user)


@extend_schema(
    tags=['Patient - Activities'],
    summary='Activity analytics',
    description='Get comprehensive activity statistics and trends.',
    responses={200: ActivityAnalyticsSerializer}
)
class ActivityAnalyticsView(APIView):
    """Get activity analytics and statistics"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        all_activities = ActivityLog.objects.filter(patient=request.user)
        
        # Time-based counts
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_start = now.replace(day=1)
        
        total_activities = all_activities.count()
        this_week = all_activities.filter(activity_date__gte=week_ago).count()
        this_month = all_activities.filter(activity_date__gte=month_start).count()
        
        # Calculate averages
        activities_with_duration = all_activities.exclude(duration_minutes__isnull=True)
        avg_duration = 0
        if activities_with_duration.exists():
            total_duration = sum(a.duration_minutes for a in activities_with_duration)
            avg_duration = round(total_duration / activities_with_duration.count(), 1)
        
        # Mood and energy improvements
        activities_with_mood = all_activities.exclude(
            mood_before__isnull=True
        ).exclude(mood_after__isnull=True)
        
        avg_mood_improvement = 0
        if activities_with_mood.exists():
            total_mood_improvement = sum(
                a.mood_after - a.mood_before for a in activities_with_mood
            )
            avg_mood_improvement = round(total_mood_improvement / activities_with_mood.count(), 1)
        
        activities_with_energy = all_activities.exclude(
            energy_before__isnull=True
        ).exclude(energy_after__isnull=True)
        
        avg_energy_improvement = 0
        if activities_with_energy.exists():
            total_energy_improvement = sum(
                a.energy_after - a.energy_before for a in activities_with_energy
            )
            avg_energy_improvement = round(total_energy_improvement / activities_with_energy.count(), 1)
        
        # Activity type distribution
        activity_types = [a.activity_type for a in all_activities]
        type_counter = Counter(activity_types)
        
        most_common_type = 'None'
        most_common_type_count = 0
        if type_counter:
            most_common_type, most_common_type_count = type_counter.most_common(1)[0]
        
        # Top activities by name
        activity_names = [a.activity_name for a in all_activities]
        name_counter = Counter(activity_names)
        top_activities = [
            {'name': name, 'count': count}
            for name, count in name_counter.most_common(5)
        ]
        
        # Activity type distribution for charts
        activity_type_distribution = dict(type_counter)
        
        analytics = {
            'total_activities': total_activities,
            'this_week': this_week,
            'this_month': this_month,
            'average_duration': avg_duration,
            'average_mood_improvement': avg_mood_improvement,
            'average_energy_improvement': avg_energy_improvement,
            'most_common_type': most_common_type,
            'most_common_type_count': most_common_type_count,
            'top_activities': top_activities,
            'activity_type_distribution': activity_type_distribution,
        }
        
        return Response(analytics)
