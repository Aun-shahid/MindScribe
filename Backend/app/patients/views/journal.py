"""Journal entry views"""
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from collections import Counter
import random
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..models import JournalEntry, JournalPrompt
from ..serializers import JournalEntrySerializer, JournalAnalyticsSerializer, JournalPromptSerializer
from .permissions import IsPatient


@extend_schema_view(
    get=extend_schema(
        tags=['Patient - Journal'],
        summary='List journal entries',
        description='Get all journal entries with optional filtering by date and favorites.',
        parameters=[
            OpenApiParameter(name='start_date', description='Filter from date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Filter to date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='favorite', description='Filter favorites (true/false)', required=False, type=str),
        ]
    ),
    post=extend_schema(
        tags=['Patient - Journal'],
        summary='Create journal entry',
        description='Create a new text journal entry.'
    )
)
class JournalEntryListCreateView(generics.ListCreateAPIView):
    """
    GET: List all journal entries
    POST: Create a new journal entry
    """
    serializer_class = JournalEntrySerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['entry_date', 'created_at']
    ordering = ['-entry_date']
    search_fields = ['title', 'content']
    
    def get_queryset(self):
        queryset = JournalEntry.objects.filter(patient=self.request.user)
        
        # Filter by favorite
        is_favorite = self.request.query_params.get('favorite')
        if is_favorite == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(entry_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(entry_date__lte=end_date)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save()


@extend_schema_view(
    get=extend_schema(tags=['Patient - Journal'], summary='Get journal entry details'),
    put=extend_schema(tags=['Patient - Journal'], summary='Update journal entry (full)'),
    patch=extend_schema(tags=['Patient - Journal'], summary='Update journal entry (partial)'),
    delete=extend_schema(tags=['Patient - Journal'], summary='Delete journal entry')
)
class JournalEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a journal entry
    PATCH/PUT: Update a journal entry
    DELETE: Delete a journal entry
    """
    serializer_class = JournalEntrySerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return JournalEntry.objects.filter(patient=self.request.user)


@extend_schema(
    tags=['Patient - Journal'],
    summary='Journal analytics',
    description='Get journal statistics including entry counts, streaks, and common tags.',
    responses={200: JournalAnalyticsSerializer}
)
class JournalAnalyticsView(APIView):
    """Get journal analytics"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        all_entries = JournalEntry.objects.filter(patient=request.user)
        this_month = timezone.now().replace(day=1).date()
        
        # Count statistics
        total_entries = all_entries.count()
        entries_this_month = all_entries.filter(entry_date__gte=this_month).count()
        favorite_count = all_entries.filter(is_favorite=True).count()
        
        # Calculate streaks
        longest_streak = self._calculate_longest_streak(all_entries)
        current_streak = self._calculate_current_streak(all_entries)
        
        # Common tags
        all_tags = []
        for entry in all_entries:
            if entry.mood_tags:
                all_tags.extend(entry.mood_tags_list)
        tag_counts = Counter(all_tags).most_common(10)
        common_tags = [{'tag': tag, 'count': count} for tag, count in tag_counts]
        
        data = {
            'total_entries': total_entries,
            'entries_this_month': entries_this_month,
            'longest_streak': longest_streak,
            'current_streak': current_streak,
            'favorite_count': favorite_count,
            'common_tags': common_tags
        }
        
        serializer = JournalAnalyticsSerializer(data)
        return Response(serializer.data)
    
    def _calculate_longest_streak(self, entries):
        """Calculate longest consecutive days streak"""
        if not entries.exists():
            return 0
        
        dates = sorted(set(entries.values_list('entry_date', flat=True)))
        longest = current = 1
        
        for i in range(1, len(dates)):
            if (dates[i] - dates[i-1]).days == 1:
                current += 1
                longest = max(longest, current)
            else:
                current = 1
        
        return longest
    
    def _calculate_current_streak(self, entries):
        """Calculate current consecutive days streak"""
        if not entries.exists():
            return 0
        
        today = timezone.now().date()
        streak = 0
        current_date = today
        
        while entries.filter(entry_date=current_date).exists():
            streak += 1
            current_date -= timedelta(days=1)
        
        return streak


@extend_schema(
    tags=['Patient - Journal'],
    summary='Get today\'s journal prompt',
    description='Get a random journal prompt for today. Returns the same prompt for the day.',
    responses={200: JournalPromptSerializer}
)
class TodayJournalPromptView(APIView):
    """Get today's journal prompt"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        # Use date as seed for consistent daily prompt
        today = timezone.now().date()
        seed = int(today.strftime('%Y%m%d'))
        random.seed(seed)
        
        # Get all active prompts
        prompts = list(JournalPrompt.objects.filter(is_active=True))
        
        if not prompts:
            return Response(
                {'error': 'No prompts available'},
                status=404
            )
        
        # Select one based on today's date
        prompt = random.choice(prompts)
        serializer = JournalPromptSerializer(prompt)
        return Response(serializer.data)


@extend_schema(
    tags=['Patient - Journal'],
    summary='Get all journal prompts',
    description='Get all available journal prompts',
    parameters=[
        OpenApiParameter(name='category', description='Filter by category', required=False, type=str),
    ]
)
class JournalPromptsListView(generics.ListAPIView):
    """GET: List all journal prompts"""
    serializer_class = JournalPromptSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        queryset = JournalPrompt.objects.filter(is_active=True)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset
