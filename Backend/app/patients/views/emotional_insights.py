"""Emotional exploration views"""
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg
from collections import Counter
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..models import EmotionalInsight
from ..serializers import EmotionalInsightSerializer, EmotionalAnalyticsSerializer
from .permissions import IsPatient


@extend_schema_view(
    get=extend_schema(
        tags=['Patient - Emotional Exploration'],
        summary='List emotional insights',
        description='Get all emotional exploration entries with optional filtering.',
        parameters=[
            OpenApiParameter(name='emotion', description='Filter by primary emotion', required=False, type=str),
            OpenApiParameter(name='resolved', description='Filter by resolved status (true/false)', required=False, type=str),
        ]
    ),
    post=extend_schema(
        tags=['Patient - Emotional Exploration'],
        summary='Create emotional insight',
        description='Record a new emotional exploration entry to understand feelings better.'
    )
)
class EmotionalInsightListCreateView(generics.ListCreateAPIView):
    """
    GET: List all emotional insights
    POST: Create a new emotional insight
    """
    serializer_class = EmotionalInsightSerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'intensity']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = EmotionalInsight.objects.filter(patient=self.request.user)
        
        # Filter by emotion
        emotion = self.request.query_params.get('emotion')
        if emotion:
            queryset = queryset.filter(primary_emotion=emotion)
        
        # Filter by resolved status
        resolved = self.request.query_params.get('resolved')
        if resolved == 'true':
            queryset = queryset.filter(is_resolved=True)
        elif resolved == 'false':
            queryset = queryset.filter(is_resolved=False)
        
        return queryset


@extend_schema_view(
    get=extend_schema(tags=['Patient - Emotional Exploration'], summary='Get emotional insight details'),
    put=extend_schema(tags=['Patient - Emotional Exploration'], summary='Update emotional insight (full)'),
    patch=extend_schema(tags=['Patient - Emotional Exploration'], summary='Update emotional insight (partial)'),
    delete=extend_schema(tags=['Patient - Emotional Exploration'], summary='Delete emotional insight')
)
class EmotionalInsightDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve an emotional insight
    PATCH/PUT: Update an emotional insight
    DELETE: Delete an emotional insight
    """
    serializer_class = EmotionalInsightSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return EmotionalInsight.objects.filter(patient=self.request.user)


@extend_schema(
    tags=['Patient - Emotional Exploration'],
    summary='Emotional insights analytics',
    description='Get analytics on emotional exploration including most explored emotions and top coping strategies.',
    responses={200: EmotionalAnalyticsSerializer}
)
class EmotionalAnalyticsView(APIView):
    """Get emotional exploration analytics"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        insights = EmotionalInsight.objects.filter(patient=request.user)
        
        total_insights = insights.count()
        resolved_count = insights.filter(is_resolved=True).count()
        
        # Most explored emotion
        emotion_counts = insights.values('primary_emotion').annotate(
            count=Count('primary_emotion')
        ).order_by('-count')
        most_explored = emotion_counts.first()['primary_emotion'] if emotion_counts else None
        
        # Emotion distribution
        emotion_distribution = {item['primary_emotion']: item['count'] for item in emotion_counts}
        
        # Average helpfulness
        avg_helpfulness = insights.exclude(
            helpfulness_rating__isnull=True
        ).aggregate(Avg('helpfulness_rating'))['helpfulness_rating__avg'] or 0
        
        # Top coping strategies
        all_strategies = [i.coping_strategies for i in insights if i.coping_strategies]
        strategy_words = []
        for strategies in all_strategies:
            strategy_words.extend(strategies.split(','))
        top_coping_strategies = [s.strip() for s, c in Counter(strategy_words).most_common(5)]
        
        data = {
            'total_insights': total_insights,
            'resolved_count': resolved_count,
            'most_explored_emotion': most_explored or 'none',
            'emotion_distribution': emotion_distribution,
            'average_helpfulness': round(avg_helpfulness, 2),
            'top_coping_strategies': top_coping_strategies
        }
        
        serializer = EmotionalAnalyticsSerializer(data)
        return Response(serializer.data)
