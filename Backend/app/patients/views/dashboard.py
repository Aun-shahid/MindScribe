"""Patient dashboard view"""
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
import random
from drf_spectacular.utils import extend_schema

from ..models import (
    MoodEntry, JournalEntry, PatientGoal,
    RelaxationSession, EmotionalInsight, DailyInspiration
)
from ..serializers import DashboardStatsSerializer, JournalEntrySerializer, DailyInspirationSerializer
from django.core.exceptions import MultipleObjectsReturned
import logging
import traceback
from .permissions import IsPatient


@extend_schema(
    tags=['Patient - Dashboard'],
    summary='Patient dashboard overview',
    description='Get comprehensive dashboard data including today\'s mood, journal stats, upcoming sessions, goals, and daily inspiration.',
    responses={200: DashboardStatsSerializer}
)
class PatientDashboardView(APIView):
    """
    Get comprehensive dashboard data for patient
    Includes: mood, journal stats, upcoming sessions, goals, inspiration
    """
    permission_classes = [IsPatient]
    
    def get(self, request):
        try:
            logging.info('[PatientDashboard] start building dashboard')
            user = request.user
            today = timezone.now().date()
            this_month_start = today.replace(day=1)
            
            # Today's mood (aggregate all entries for today)
            logging.info('[PatientDashboard] computing mood_today')
            mood_today = None
            try:
                mood_entries_today = MoodEntry.objects.filter(patient=user, mood_date=today)
            except Exception as e:
                logging.exception('[PatientDashboard] failed querying MoodEntry for today')
                raise
            if mood_entries_today.exists():
                # Get dominant mood for today using the class method
                day_data = MoodEntry.get_dominant_mood_for_day(user, today)
                if day_data:
                    dominant_mood = day_data['dominant_mood']
                    mood_display_name = None
                    for choice in MoodEntry.MOOD_CHOICES:
                        if choice[0] == dominant_mood:
                            mood_display_name = choice[1]
                            break
                    
                    mood_today = {
                        'mood': dominant_mood,
                        'mood_display': mood_display_name or dominant_mood.title(),
                        'intensity': day_data['dominant_intensity'],
                        'average_intensity': day_data['avg_intensity'],
                        'all_moods': day_data['all_moods'],
                        'entry_count': day_data['entry_count']
                    }
            
            logging.info('[PatientDashboard] computing journal_count_this_month')
            # Journal count this month
            journal_count_this_month = JournalEntry.objects.filter(
                patient=user,
                entry_date__gte=this_month_start
            ).count()
            
            logging.info('[PatientDashboard] computing next_session')
            # Next therapy session (from therapy_sessions app)
            next_session = None
            try:
                from therapy_sessions.models import Session as TherapySession
                try:
                    # Use actual model field names: `scheduled_date` and status 'UPCOMING'
                    upcoming = TherapySession.objects.filter(
                        patient=user,
                        scheduled_date__gte=timezone.now(),
                        status='UPCOMING'
                    ).order_by('scheduled_date').first()
                except MultipleObjectsReturned:
                    logging.exception('[PatientDashboard] MultipleObjectsReturned querying TherapySession.upcoming')
                    raise

                if upcoming:
                    # Resolve therapist display name safely — therapist may be a User or a related profile
                    therapist_name = None
                    try:
                        t = upcoming.therapist
                        if hasattr(t, 'user') and getattr(t, 'user') is not None:
                            therapist_name = getattr(t.user, 'full_name', None) or (t.user.get_full_name() if hasattr(t.user, 'get_full_name') else None)
                        else:
                            therapist_name = getattr(t, 'full_name', None) or (t.get_full_name() if hasattr(t, 'get_full_name') else None) or getattr(t, 'username', None) or str(t)
                    except Exception:
                        logging.exception('[PatientDashboard] failed resolving therapist name for upcoming session')
                        therapist_name = None

                    next_session = {
                        'id': str(upcoming.id),
                        'date': upcoming.scheduled_date.strftime('%A'),
                        'time': upcoming.scheduled_date.strftime('%I:%M %p'),
                        'datetime': upcoming.scheduled_date.isoformat(),
                        'therapist': therapist_name
                    }
            except Exception:
                logging.exception('[PatientDashboard] exception in next_session block')
                # continue building remaining dashboard data
            
            logging.info('[PatientDashboard] computing goals counts')
            # Goals
            active_goals_count = PatientGoal.objects.filter(
                patient=user,
                status__in=['not_started', 'in_progress']
            ).count()
            
            completed_goals_count = PatientGoal.objects.filter(
                patient=user,
                status='completed'
            ).count()
            
            logging.info('[PatientDashboard] computing mood_trend')
            # Mood trend (last 7 days)
            mood_trend = []
            for i in range(7):
                date = today - timedelta(days=6-i)
                try:
                    day_data = MoodEntry.get_dominant_mood_for_day(user, date)
                except Exception:
                    logging.exception(f'[PatientDashboard] error computing dominant mood for {date}')
                    day_data = None
                if day_data:
                    mood_trend.append({
                        'date': str(date),
                        'mood': day_data['dominant_mood'],
                        'intensity': day_data['dominant_intensity'],
                        'average_intensity': day_data['avg_intensity'],
                        'all_moods': day_data['all_moods']
                    })
                else:
                    mood_trend.append({
                        'date': str(date),
                        'mood': None,
                        'intensity': 0,
                        'all_moods': []
                    })
            
            logging.info('[PatientDashboard] fetching recent_journals')
            # Recent journal entries
            recent_journals = JournalEntry.objects.filter(patient=user).order_by('-entry_date')[:5]
            try:
                recent_journal_entries = JournalEntrySerializer(recent_journals, many=True).data
            except Exception:
                logging.exception('[PatientDashboard] failed serializing recent_journals')
                recent_journal_entries = []
            
            logging.info('[PatientDashboard] fetching upcoming_sessions list')
            # Upcoming sessions
            upcoming_sessions = []
            try:
                from therapy_sessions.models import Session as TherapySession
                try:
                    sessions = TherapySession.objects.filter(
                        patient=user,
                        scheduled_date__gte=timezone.now(),
                        status='UPCOMING'
                    ).order_by('scheduled_date')[:3]
                except MultipleObjectsReturned:
                    logging.exception('[PatientDashboard] MultipleObjectsReturned querying TherapySession.sessions')
                    raise

                for session in sessions:
                    therapist_name = None
                    try:
                        t = session.therapist
                        if hasattr(t, 'user') and getattr(t, 'user') is not None:
                            therapist_name = getattr(t.user, 'full_name', None) or (t.user.get_full_name() if hasattr(t.user, 'get_full_name') else None)
                        else:
                            therapist_name = getattr(t, 'full_name', None) or (t.get_full_name() if hasattr(t, 'get_full_name') else None) or getattr(t, 'username', None) or str(t)
                    except Exception:
                        logging.exception('[PatientDashboard] failed resolving therapist name for session id %s', session.id)
                        therapist_name = None

                    upcoming_sessions.append({
                        'id': str(session.id),
                        'date': session.scheduled_date.strftime('%B %d, %Y'),
                        'time': session.scheduled_date.strftime('%I:%M %p'),
                        'therapist': therapist_name
                    })
            except Exception:
                logging.exception('[PatientDashboard] exception in upcoming_sessions block')
                # continue
            
            logging.info('[PatientDashboard] selecting daily_inspiration')
            # Daily inspiration
            daily_inspiration = None
            try:
                inspiration = DailyInspiration.objects.filter(is_active=True, featured=True).first()
                if not inspiration:
                    count = DailyInspiration.objects.filter(is_active=True).count()
                    if count > 0:
                        random_index = random.randint(0, count - 1)
                        inspiration = DailyInspiration.objects.filter(is_active=True)[random_index]
            except Exception:
                logging.exception('[PatientDashboard] exception selecting DailyInspiration')
                inspiration = None
            
            if inspiration:
                try:
                    daily_inspiration = DailyInspirationSerializer(inspiration).data
                except Exception:
                    logging.exception('[PatientDashboard] failed serializing daily_inspiration')
                    daily_inspiration = None
            
            logging.info('[PatientDashboard] computing relaxation minutes')
            # Relaxation minutes this week
            week_start = today - timedelta(days=today.weekday())
            try:
                relaxation_sessions = RelaxationSession.objects.filter(
                    patient=user,
                    started_at__date__gte=week_start
                )
                relaxation_minutes = sum((s.duration_listened_seconds or 0) for s in relaxation_sessions) // 60
            except Exception:
                logging.exception('[PatientDashboard] exception computing relaxation minutes')
                relaxation_minutes = 0
            
            logging.info('[PatientDashboard] computing emotional_insights_count')
            # Emotional insights count
            try:
                emotional_insights_count = EmotionalInsight.objects.filter(patient=user).count()
            except Exception:
                logging.exception('[PatientDashboard] exception counting EmotionalInsight')
                emotional_insights_count = 0
            
            data = {
                'mood_today': mood_today,
                'journal_count_this_month': journal_count_this_month,
                'next_session': next_session,
                'active_goals_count': active_goals_count,
                'completed_goals_count': completed_goals_count,
                'mood_trend': mood_trend,
                'recent_journal_entries': recent_journal_entries,
                'upcoming_sessions': upcoming_sessions,
                'daily_inspiration': daily_inspiration,
                'relaxation_minutes_this_week': relaxation_minutes,
                'emotional_insights_count': emotional_insights_count
            }
            
            logging.info('[PatientDashboard] finished building data, serializing')
            serializer = DashboardStatsSerializer(data)
            return Response(serializer.data)
        except Exception as e:
            logging.exception("Error in PatientDashboardView.get")
            tb = traceback.format_exc()
            return Response({
                'detail': 'Error building dashboard',
                'error': str(e),
                'traceback': tb
            }, status=500)

        
        user = request.user
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        
        # Today's mood (aggregate all entries for today)
        mood_today = None
        mood_entries_today = MoodEntry.objects.filter(patient=user, mood_date=today)
        if mood_entries_today.exists():
            # Get dominant mood for today using the class method
            day_data = MoodEntry.get_dominant_mood_for_day(user, today)
            if day_data:
                dominant_mood = day_data['dominant_mood']
                mood_display_name = None
                for choice in MoodEntry.MOOD_CHOICES:
                    if choice[0] == dominant_mood:
                        mood_display_name = choice[1]
                        break
                
                mood_today = {
                    'mood': dominant_mood,
                    'mood_display': mood_display_name or dominant_mood.title(),
                    'intensity': day_data['dominant_intensity'],
                    'average_intensity': day_data['avg_intensity'],
                    'all_moods': day_data['all_moods'],
                    'entry_count': day_data['entry_count']
                }
        
        # Journal count this month
        journal_count_this_month = JournalEntry.objects.filter(
            patient=user,
            entry_date__gte=this_month_start
        ).count()
        
        # Next therapy session (from therapy_sessions app)
        next_session = None
        try:
            from therapy_sessions.models import TherapySession
            upcoming = TherapySession.objects.filter(
                patient=user,
                scheduled_start__gte=timezone.now(),
                status='scheduled'
            ).order_by('scheduled_start').first()
            
            if upcoming:
                next_session = {
                    'id': str(upcoming.id),
                    'date': upcoming.scheduled_start.strftime('%A'),
                    'time': upcoming.scheduled_start.strftime('%I:%M %p'),
                    'datetime': upcoming.scheduled_start.isoformat(),
                    'therapist': upcoming.therapist.user.full_name
                }
        except Exception:
            pass
        
        # Goals
        active_goals_count = PatientGoal.objects.filter(
            patient=user,
            status__in=['not_started', 'in_progress']
        ).count()
        
        completed_goals_count = PatientGoal.objects.filter(
            patient=user,
            status='completed'
        ).count()
        
        # Mood trend (last 7 days)
        mood_trend = []
        for i in range(7):
            date = today - timedelta(days=6-i)
            day_data = MoodEntry.get_dominant_mood_for_day(user, date)
            if day_data:
                mood_trend.append({
                    'date': str(date),
                    'mood': day_data['dominant_mood'],
                    'intensity': day_data['dominant_intensity'],
                    'average_intensity': day_data['avg_intensity'],
                    'all_moods': day_data['all_moods']
                })
            else:
                mood_trend.append({
                    'date': str(date),
                    'mood': None,
                    'intensity': 0,
                    'all_moods': []
                })
        
        # Recent journal entries
        recent_journals = JournalEntry.objects.filter(patient=user).order_by('-entry_date')[:5]
        recent_journal_entries = JournalEntrySerializer(recent_journals, many=True).data
        
        # Upcoming sessions
        upcoming_sessions = []
        try:
            from therapy_sessions.models import TherapySession
            sessions = TherapySession.objects.filter(
                patient=user,
                scheduled_start__gte=timezone.now(),
                status='scheduled'
            ).order_by('scheduled_start')[:3]
            
            for session in sessions:
                upcoming_sessions.append({
                    'id': str(session.id),
                    'date': session.scheduled_start.strftime('%B %d, %Y'),
                    'time': session.scheduled_start.strftime('%I:%M %p'),
                    'therapist': session.therapist.user.full_name
                })
        except Exception:
            pass
        
        # Daily inspiration
        daily_inspiration = None
        inspiration = DailyInspiration.objects.filter(is_active=True, featured=True).first()
        if not inspiration:
            count = DailyInspiration.objects.filter(is_active=True).count()
            if count > 0:
                random_index = random.randint(0, count - 1)
                inspiration = DailyInspiration.objects.filter(is_active=True)[random_index]
        
        if inspiration:
            daily_inspiration = DailyInspirationSerializer(inspiration).data
        
        # Relaxation minutes this week
        week_start = today - timedelta(days=today.weekday())
        relaxation_sessions = RelaxationSession.objects.filter(
            patient=user,
            started_at__date__gte=week_start
        )
        relaxation_minutes = sum(s.duration_listened_seconds for s in relaxation_sessions) // 60
        
        # Emotional insights count
        emotional_insights_count = EmotionalInsight.objects.filter(patient=user).count()
        
        data = {
            'mood_today': mood_today,
            'journal_count_this_month': journal_count_this_month,
            'next_session': next_session,
            'active_goals_count': active_goals_count,
            'completed_goals_count': completed_goals_count,
            'mood_trend': mood_trend,
            'recent_journal_entries': recent_journal_entries,
            'upcoming_sessions': upcoming_sessions,
            'daily_inspiration': daily_inspiration,
            'relaxation_minutes_this_week': relaxation_minutes,
            'emotional_insights_count': emotional_insights_count
        }
        
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)
