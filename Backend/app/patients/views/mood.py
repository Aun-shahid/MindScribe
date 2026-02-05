"""Mood tracking views"""
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from ..schema import PatientAPITags
from ..models import MoodEntry
from ..serializers import MoodEntrySerializer, MoodAnalyticsSerializer
from .permissions import IsPatient


@extend_schema_view(
    get=extend_schema(
        tags=[PatientAPITags.MOOD],
        summary='List mood entries',
        description='Get all mood entries for the authenticated patient with optional filtering by date range and mood type.',
        parameters=[
            OpenApiParameter(name='start_date', description='Filter from date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='Filter to date (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='mood', description='Filter by mood type', required=False, type=str),
        ]
    ),
    post=extend_schema(
        tags=[PatientAPITags.MOOD],
        summary='Create mood entry',
        description='Create a new mood entry for today. Only one mood entry allowed per day.'
    )
)
class MoodEntryListCreateView(generics.ListCreateAPIView):
    """
    GET: List all mood entries for the authenticated patient
    POST: Create a new mood entry
    """
    serializer_class = MoodEntrySerializer
    permission_classes = [IsPatient]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['mood_date', 'created_at', 'intensity']
    ordering = ['-mood_date']
    
    def get_queryset(self):
        queryset = MoodEntry.objects.filter(patient=self.request.user)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(mood_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(mood_date__lte=end_date)
        
        # Filter by mood type
        mood = self.request.query_params.get('mood')
        if mood:
            queryset = queryset.filter(mood=mood)
        
        return queryset


@extend_schema_view(
    get=extend_schema(tags=['Patient - Mood Tracking'], summary='Get mood entry details'),
    put=extend_schema(tags=['Patient - Mood Tracking'], summary='Update mood entry (full)'),
    patch=extend_schema(tags=['Patient - Mood Tracking'], summary='Update mood entry (partial)'),
    delete=extend_schema(tags=['Patient - Mood Tracking'], summary='Delete mood entry')
)
class MoodEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific mood entry
    PATCH/PUT: Update a mood entry
    DELETE: Delete a mood entry
    """
    serializer_class = MoodEntrySerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        return MoodEntry.objects.filter(patient=self.request.user)


@extend_schema(
    tags=['Patient - Mood Tracking'],
    summary='Get or create today\'s mood',
    description='Retrieve or create mood entry for today. Only one mood allowed per day.',
    responses={200: MoodEntrySerializer}
)
class TodayMoodView(APIView):
    """Get or create today's mood entry"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        """Get today's mood entries (all entries for today)"""
        today = timezone.now().date()
        moods = MoodEntry.objects.filter(patient=request.user, mood_date=today)
        
        if not moods.exists():
            return Response({'detail': 'No mood entry for today yet.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get dominant mood data for today
        day_data = MoodEntry.get_dominant_mood_for_day(request.user, today)
        
        # Return all entries plus dominant mood summary
        serializer = MoodEntrySerializer(moods, many=True)
        return Response({
            'entries': serializer.data,
            'summary': {
                'dominant_mood': day_data['dominant_mood'],
                'avg_intensity': day_data['avg_intensity'],
                'entry_count': day_data['entry_count'],
                'all_moods': day_data['all_moods'],
                'triggers': day_data['triggers']
            }
        })
    
    def post(self, request):
        """Create today's mood entry (multiple entries allowed per day)"""
        serializer = MoodEntrySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        mood_entry = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Patient - Mood Tracking'],
    summary='Mood analytics and insights',
    description='Get comprehensive mood analytics including trends, distribution, and common triggers.',
    parameters=[
        OpenApiParameter(name='days', description='Number of days to analyze (default: 30)', required=False, type=int),
    ],
    responses={200: MoodAnalyticsSerializer}
)
class MoodAnalyticsView(APIView):
    """Get mood analytics for the patient"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        # Get time range (default: last 30 days)
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        moods = MoodEntry.objects.filter(
            patient=request.user,
            mood_date__gte=start_date
        )
                # Calculate statistics using new mood_intensities structure
        # Get all mood intensities and calculate average
        all_intensities = []
        all_mood_counts = Counter()
        
        for mood_entry in moods:
            if mood_entry.mood_intensities:
                for mood, intensity in mood_entry.mood_intensities.items():
                    all_intensities.append(intensity)
                    all_mood_counts[mood] += 1
        
        avg_intensity = sum(all_intensities) / len(all_intensities) if all_intensities else 0

        # Calculate statistics
        avg_intensity = moods.aggregate(Avg('intensity'))['intensity__avg'] or 0
        
        # Most common mood
        most_common_mood = all_mood_counts.most_common(1)[0][0] if all_mood_counts else None
        mood_counts = moods.values('mood').annotate(count=Count('mood')).order_by('-count')
        most_common_mood = mood_counts.first()['mood'] if mood_counts else None
        
        # Mood distribution
        mood_distribution = dict(all_mood_counts)
        mood_distribution = {item['mood']: item['count'] for item in mood_counts}
        
        # Weekly trend
        weekly_trend = []
        for i in range(7):
            date = timezone.now().date() - timedelta(days=i)
            day_data = MoodEntry.get_dominant_mood_for_day(request.user, date)

            day_moods = moods.filter(mood_date=date)
            if day_moods.exists():
                avg = day_moods.aggregate(Avg('intensity'))['intensity__avg'] or 0
                weekly_trend.append({
                    'date': str(date),
                    'average_intensity': round(avg, 2),
                    'dominant_mood': day_data['dominant_mood'] if day_data else None
                })
            else:
                weekly_trend.append({
                    'date': str(date),
                    'average_intensity': 0,
                    'dominant_mood': None
                })
        
        # Common triggers
        all_triggers = [m.triggers for m in moods if m.triggers]
        trigger_words = []
        for triggers in all_triggers:
            trigger_words.extend(triggers.split(','))
        common_triggers = [word.strip() for word, count in Counter(trigger_words).most_common(5)]
        
        data = {
            'average_intensity': round(avg_intensity, 2),
            'most_common_mood': most_common_mood or 'N/A',
            'mood_distribution': mood_distribution,
            'weekly_trend': weekly_trend[::-1],
            'monthly_comparison': {},
            'common_triggers': common_triggers
        }
        
        serializer = MoodAnalyticsSerializer(data)
        return Response(serializer.data)


@extend_schema(
    tags=['Patient - Mood Tracking'],
    summary='Weekly mood trend',
    description='Get this week\'s mood trend with daily moods and AI-generated pattern insights.',
    responses={200: 'Weekly mood data with insights'}
)
class WeeklyMoodTrendView(APIView):
    """Get weekly mood trend with pattern insights"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())  # Monday
        
        # Get this week's mood entries (aggregate multiple entries per day)
        weekly_moods = []
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        for i in range(7):
            date = week_start + timedelta(days=i)
            
            # Get dominant mood for this day (handles multiple entries)
            day_data = MoodEntry.get_dominant_mood_for_day(request.user, date)
            
            if day_data:
                dominant_mood = day_data['dominant_mood']
                # Get display label for dominant mood
                mood_choice = next((choice for choice in MoodEntry.MOOD_CHOICES if choice[0] == dominant_mood), None)
                mood_label = mood_choice[1] if mood_choice else dominant_mood.title()
                
                weekly_moods.append({
                    'day': days[i],
                    'date': str(date),
                    'mood': dominant_mood,
                    'mood_label': mood_label,
                    'intensity': day_data['dominant_intensity'],
                    'avg_intensity': day_data['avg_intensity'],
                    'all_moods': day_data['all_moods'],
                    'entry_count': day_data['entry_count'],
                    'triggers': day_data['triggers'],
                    'mood_breakdown': day_data['mood_breakdown']
                })
            else:
                weekly_moods.append({
                    'day': days[i],
                    'date': str(date),
                    'mood': None,
                    'mood_label': 'No entry',
                    'intensity': 0,
                    'all_moods': [],
                    'entry_count': 0,
                    'triggers': []
                })
        
        # Generate rule-based pattern insight
        pattern_insight = self._generate_pattern_insight(weekly_moods)
        
        data = {
            'weekly_moods': weekly_moods,
            'pattern_insight': pattern_insight
        }
        
        return Response(data)
    
    def _generate_pattern_insight(self, weekly_moods):
        """Generate refined rule-based and trend-focused pattern insight"""
        mood_entries = [m for m in weekly_moods if m['mood']]
        
        if not mood_entries:
            return "Start tracking your mood daily to unlock personalized insights and patterns! 📊"
        
        if len(mood_entries) < 3:
            return f"You've logged {len(mood_entries)} {'day' if len(mood_entries) == 1 else 'days'} this week. Track 3+ days to reveal meaningful patterns! 🌱"
        
        # Mood classifications
        positive_moods = ['happy', 'peaceful', 'excited', 'grateful', 'hopeful']
        negative_moods = ['sad', 'angry', 'anxious', 'overwhelmed', 'stressed']
        
        # Core metrics
        positive_days = [m for m in mood_entries if m['mood'] in positive_moods]
        negative_days = [m for m in mood_entries if m['mood'] in negative_moods]
        intensities = [m['intensity'] for m in mood_entries]
        avg_intensity = sum(intensities) / len(intensities)
        
        # Trend analysis
        first_half = intensities[:len(intensities)//2]
        second_half = intensities[len(intensities)//2:]
        first_avg = sum(first_half) / len(first_half) if first_half else 0
        second_avg = sum(second_half) / len(second_half) if second_half else 0
        intensity_change = second_avg - first_avg
        
        # Progression analysis (early week → late week)
        early_week = [m for m in mood_entries if m['day'] in ['Mon', 'Tue', 'Wed']]
        late_week = [m for m in mood_entries if m['day'] in ['Thu', 'Fri', 'Sat', 'Sun']]
        
        early_positive = sum(1 for m in early_week if m['mood'] in positive_moods)
        late_positive = sum(1 for m in late_week if m['mood'] in positive_moods)
        
        # Streak detection with context
        streaks = []
        current_streak = {'type': None, 'count': 0, 'days': []}
        
        for entry in mood_entries:
            mood_type = 'positive' if entry['mood'] in positive_moods else 'negative'
            if mood_type == current_streak['type']:
                current_streak['count'] += 1
                current_streak['days'].append(entry['day'])
            else:
                if current_streak['count'] >= 2:
                    streaks.append(current_streak.copy())
                current_streak = {'type': mood_type, 'count': 1, 'days': [entry['day']]}
        if current_streak['count'] >= 2:
            streaks.append(current_streak)
        
        # Weekend vs weekday
        weekend = [m for m in mood_entries if m['day'] in ['Sat', 'Sun']]
        weekday = [m for m in mood_entries if m['day'] in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']]
        
        # Trigger analysis
        all_triggers = []
        for m in mood_entries:
            if m.get('triggers'):
                all_triggers.extend(m['triggers'])
        trigger_counts = Counter(all_triggers)
        common_triggers = trigger_counts.most_common(3)
        
        # Emotional complexity
        complex_days = [m for m in mood_entries if len(m.get('all_moods', [])) >= 3]
        
        # Multiple entries per day tracking
        high_tracking_days = [m for m in mood_entries if m.get('entry_count', 1) >= 3]
        
        # --- INSIGHT GENERATION (Priority Order) ---
        
        # 1. STRONG POSITIVE PROGRESSION (early negative → late positive)
        if len(early_week) >= 2 and len(late_week) >= 2:
            early_neg_ratio = 1 - (early_positive / len(early_week)) if early_week else 0
            late_pos_ratio = late_positive / len(late_week) if late_week else 0
            
            if early_neg_ratio >= 0.6 and late_pos_ratio >= 0.6:
                improvement = ', '.join([m['day'] for m in late_week if m['mood'] in positive_moods])
                return f"🌈 Powerful transformation! You shifted from challenging early-week to uplifting {improvement}. What changed? Build on that! ✨"
        
        # 2. POSITIVE STREAK (3+ days)
        positive_streak = next((s for s in streaks if s['type'] == 'positive' and s['count'] >= 3), None)
        if positive_streak:
            days_str = '-'.join(positive_streak['days'][:3])
            if positive_streak['count'] >= 5:
                return f"🔥 Outstanding! {positive_streak['count']}-day positive streak ({days_str}+). You're in a great flow - keep this momentum!"
            return f"🌟 Excellent! {positive_streak['count']} days of positive energy ({days_str}). Something's working - keep it up!"
        
        # 3. RECOVERY PATTERN (negative streak → positive shift)
        negative_streak = next((s for s in streaks if s['type'] == 'negative' and s['count'] >= 2), None)
        if negative_streak and len(streaks) > 1:
            last_streak = streaks[-1]
            if last_streak['type'] == 'positive':
                return f"💪 Resilience! After {negative_streak['count']} tough days, you're bouncing back. That strength matters - keep moving forward."
        
        # 4. NEGATIVE STREAK (3+ days) - needs support
        if negative_streak and negative_streak['count'] >= 3:
            days_str = '-'.join(negative_streak['days'])
            return f"🫂 {negative_streak['count']} challenging days ({days_str}). You're not alone in this. Reach out to someone you trust, or try one small self-care step today."
        
        # 5. INTENSITY IMPROVEMENT (significant upward trend)
        if intensity_change >= 1.0 and len(intensities) >= 4:
            return f"📈 Energy rising! Your emotional intensity grew from {first_avg:.1f} → {second_avg:.1f} this week. You're feeling more alive and engaged!"
        
        # 6. WEEKEND TRANSFORMATION
        if len(weekend) >= 1 and len(weekday) >= 3:
            weekend_pos = sum(1 for m in weekend if m['mood'] in positive_moods)
            weekday_pos = sum(1 for m in weekday if m['mood'] in positive_moods)
            
            weekend_ratio = weekend_pos / len(weekend)
            weekday_ratio = weekday_pos / len(weekday) if weekday else 0
            
            if weekend_ratio >= 0.8 and weekday_ratio <= 0.4:
                return f"☀️ Clear pattern: weekends lift your mood significantly! What do you do on weekends that brings joy? Try bringing one of those activities into your weekdays."
        
        # 7. TRIGGER INSIGHTS
        if common_triggers and len(mood_entries) >= 4:
            top_trigger = common_triggers[0][0]
            trigger_mood_entries = [m for m in mood_entries if top_trigger in m.get('triggers', [])]
            
            if len(trigger_mood_entries) >= 3:
                trigger_positive = sum(1 for m in trigger_mood_entries if m['mood'] in positive_moods)
                trigger_ratio = trigger_positive / len(trigger_mood_entries)
                
                if trigger_ratio >= 0.7:
                    return f"💡 Insight: '{top_trigger}' appears in {len(trigger_mood_entries)} entries and correlates with positive moods! This is good for you - lean into it."
                elif trigger_ratio <= 0.3:
                    return f"⚠️ Pattern noticed: '{top_trigger}' linked to {len(trigger_mood_entries)} challenging entries. Consider strategies to manage this trigger better."
        
        # 8. EMOTIONAL COMPLEXITY WITH HIGH TRACKING
        if len(high_tracking_days) >= 2 and len(complex_days) >= 3:
            return f"🎭 Deep self-awareness! You tracked {len(high_tracking_days)} days intensively with rich emotional variety. This mindfulness is powerful for growth."
        
        # 9. CONSISTENT POSITIVE MAJORITY
        if len(positive_days) >= len(mood_entries) * 0.75 and len(mood_entries) >= 5:
            return f"✨ Thriving! {len(positive_days)} out of {len(mood_entries)} days were positive. You're cultivating wellbeing - this is the goal! 🎯"
        
        # 10. BALANCED WEEK
        if abs(len(positive_days) - len(negative_days)) <= 1 and len(mood_entries) >= 5:
            return f"⚖️ Natural balance: {len(positive_days)} positive, {len(negative_days)} challenging days. Life has ups and downs - you're navigating them with awareness."
        
        # 11. INTENSITY VARIATION (high engagement)
        intensity_std = (sum((x - avg_intensity) ** 2 for x in intensities) / len(intensities)) ** 0.5
        if intensity_std >= 1.2 and len(intensities) >= 5:
            high_days = sum(1 for i in intensities if i >= 4)
            return f"🎢 Emotional richness! Your intensity varied widely this week ({high_days} high-energy days). You're fully experiencing life - both highs and lows."
        
        # 12. LOW ENERGY WEEK
        if avg_intensity < 2.5 and len(mood_entries) >= 4:
            return f"🌱 Quiet week - average intensity {avg_intensity:.1f}. If you're feeling flat, try small energizing steps: sunlight, movement, or connecting with someone."
        
        # 13. PREDOMINANTLY DIFFICULT
        if len(negative_days) >= len(mood_entries) * 0.7 and len(mood_entries) >= 4:
            return f"💙 Tough week with {len(negative_days)} difficult days. Please be compassionate with yourself. Small acts of self-care matter. You don't have to face this alone."
        
        # 14. MODERATE POSITIVE WEEK
        if len(positive_days) >= len(mood_entries) * 0.6:
            return f"🌸 Good week! {len(positive_days)} positive days show you're finding moments of wellbeing. Keep building on what's working."
        
        # FALLBACK - Encouraging tracking continuation
        return f"📊 {len(mood_entries)} days tracked this week. Patterns become clearer with time - you're building valuable self-knowledge!"
