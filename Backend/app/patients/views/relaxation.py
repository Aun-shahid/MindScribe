"""Relaxation and Take a Break views"""
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg, F
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..models import RelaxationContent, RelaxationSession, RelaxationTip
from ..serializers import (
    RelaxationContentSerializer, RelaxationSessionSerializer,
    RelaxationTipSerializer, RelaxationAnalyticsSerializer
)
import logging
import traceback
from .permissions import IsPatient


@extend_schema(
    tags=['Patient - Relaxation & Wellness'],
    summary='List relaxation content',
    description='Browse available relaxation content including nature sounds, meditation, and breathing exercises.',
    parameters=[
        OpenApiParameter(name='type', description='Filter by content type (nature/meditation/breathing/music/ambient)', required=False, type=str),
        OpenApiParameter(name='category', description='Filter by category (rain/ocean/forest/birds/etc.)', required=False, type=str),
    ]
)
class RelaxationContentListView(generics.ListAPIView):
    """List all available relaxation content"""
    serializer_class = RelaxationContentSerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['title', 'play_count', 'average_rating']
    ordering = ['-play_count']
    
    def get_queryset(self):
        queryset = RelaxationContent.objects.filter(is_active=True)
        
        # Filter by type
        content_type = self.request.query_params.get('type')
        if content_type:
            queryset = queryset.filter(content_type=content_type)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset


@extend_schema(
    tags=['Patient - Relaxation & Wellness'],
    summary='Get relaxation content details',
    description='Get detailed information about specific relaxation content.'
)
class RelaxationContentDetailView(generics.RetrieveAPIView):
    """Get details of specific relaxation content"""
    serializer_class = RelaxationContentSerializer
    permission_classes = [IsPatient]
    queryset = RelaxationContent.objects.filter(is_active=True)


@extend_schema_view(
    get=extend_schema(
        tags=['Patient - Relaxation & Wellness'],
        summary='List relaxation sessions',
        description='Get history of all relaxation listening sessions.'
    ),
    post=extend_schema(
        tags=['Patient - Relaxation & Wellness'],
        summary='Start relaxation session',
        description='Begin a new relaxation listening session and track mood before.'
    )
)
class RelaxationSessionListCreateView(generics.ListCreateAPIView):
    """
    GET: List relaxation sessions
    POST: Start a new relaxation session
    """
    serializer_class = RelaxationSessionSerializer
    permission_classes = [IsPatient]
    ordering = ['-started_at']
    
    def get_queryset(self):
        return RelaxationSession.objects.filter(patient=self.request.user)
    
    def perform_create(self, serializer):
        session = serializer.save()
        # Increment play count
        # Use F-expression to increment atomically, then refresh the in-memory instance
        session.content.play_count = F('play_count') + 1
        session.content.save()
        try:
            session.content.refresh_from_db()
        except Exception:
            # If refresh fails for any reason, fallback to explicit update
            from django.db import transaction
            try:
                with transaction.atomic():
                    RelaxationContent.objects.filter(pk=session.content.pk).update(play_count=F('play_count') + 1)
                    session.content.refresh_from_db()
            except Exception:
                logging.exception('Failed to refresh or update play_count after session create')
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logging.exception("Error creating RelaxationSession")
            tb = traceback.format_exc()
            return Response({
                'detail': 'Error creating relaxation session',
                'error': str(e),
                'traceback': tb
            }, status=500)


@extend_schema_view(
    get=extend_schema(tags=['Patient - Relaxation & Wellness'], summary='Get relaxation session details'),
    put=extend_schema(tags=['Patient - Relaxation & Wellness'], summary='Update relaxation session (full)'),
    patch=extend_schema(tags=['Patient - Relaxation & Wellness'], summary='Complete relaxation session', description='Mark session as complete, add rating and mood after.')
)
class RelaxationSessionDetailView(generics.RetrieveUpdateAPIView):
    """Update relaxation session (complete, rate, etc.)"""
    serializer_class = RelaxationSessionSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return RelaxationSession.objects.filter(patient=self.request.user)


@extend_schema(
    tags=['Patient - Relaxation & Wellness'],
    summary='Relaxation analytics',
    description='Get relaxation session analytics including total time, completion rate, and mood improvement.',
    responses={200: RelaxationAnalyticsSerializer}
)
class RelaxationAnalyticsView(APIView):
    """Get relaxation session analytics"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        sessions = RelaxationSession.objects.filter(patient=request.user)
        
        total_sessions = sessions.count()
        total_minutes = sessions.aggregate(
            total=Avg('duration_listened_seconds')
        )['total'] or 0
        total_minutes = round(total_minutes / 60, 2)
        
        # Favorite content type
        type_counts = sessions.values('content__content_type').annotate(
            count=Count('content__content_type')
        ).order_by('-count')
        favorite_type = type_counts.first()['content__content_type'] if type_counts else 'none'
        
        # Average rating
        avg_rating = sessions.exclude(rating__isnull=True).aggregate(
            Avg('rating')
        )['rating__avg'] or 0
        
        # Completion rate
        completed = sessions.filter(completed=True).count()
        completion_rate = (completed / total_sessions * 100) if total_sessions > 0 else 0
        
        # Mood improvement
        mood_improved = sessions.filter(
            mood_before__isnull=False,
            mood_after__isnull=False
        ).count()
        mood_improvement_rate = (mood_improved / total_sessions * 100) if total_sessions > 0 else 0
        
        data = {
            'total_sessions': total_sessions,
            'total_minutes': total_minutes,
            'favorite_content_type': favorite_type,
            'average_rating': round(avg_rating, 2),
            'completion_rate': round(completion_rate, 2),
            'mood_improvement_rate': round(mood_improvement_rate, 2)
        }
        
        serializer = RelaxationAnalyticsSerializer(data)
        return Response(serializer.data)


@extend_schema(
    tags=['Patient - Relaxation & Wellness'],
    summary='List relaxation tips',
    description='Get relaxation tips and techniques to enhance the "Take a Break" experience.',
)
class RelaxationTipsListView(generics.ListAPIView):
    """List all relaxation tips"""
    serializer_class = RelaxationTipSerializer
    permission_classes = [IsPatient]
    queryset = RelaxationTip.objects.filter(is_active=True)
    ordering = ['order']
