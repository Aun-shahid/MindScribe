"""
Patient Views Module

This module contains all views for the patient app, organized by feature.
"""

from .permissions import IsPatient
from .mood import MoodEntryListCreateView, MoodEntryDetailView, TodayMoodView, MoodAnalyticsView, WeeklyMoodTrendView
from .journal import (
    JournalEntryListCreateView, JournalEntryDetailView, JournalAnalyticsView,
    TodayJournalPromptView, JournalPromptsListView
)
from .emotional_insights import (
    EmotionalInsightListCreateView, EmotionalInsightDetailView, EmotionalAnalyticsView
)
from .relaxation import (
    RelaxationContentListView, RelaxationContentDetailView,
    RelaxationSessionListCreateView, RelaxationSessionDetailView,
    RelaxationAnalyticsView, RelaxationTipsListView
)
from .goals import PatientGoalListCreateView, PatientGoalDetailView
from .inspiration import DailyInspirationView
from .dashboard import PatientDashboardView
from .notifications import (
    NotificationPreferenceView, NotificationListView, UnreadNotificationCountView,
    MarkNotificationReadView, MarkAllNotificationsReadView, DeleteNotificationView
)

__all__ = [
    'IsPatient',
    # Mood views
    'MoodEntryListCreateView',
    'MoodEntryDetailView',
    'TodayMoodView',
    'MoodAnalyticsView',
    'WeeklyMoodTrendView',
    # Journal views
    'JournalEntryListCreateView',
    'JournalEntryDetailView',
    'JournalAnalyticsView',
    'TodayJournalPromptView',
    'JournalPromptsListView',
    # Emotional insights views
    'EmotionalInsightListCreateView',
    'EmotionalInsightDetailView',
    'EmotionalAnalyticsView',
    # Relaxation views
    'RelaxationContentListView',
    'RelaxationContentDetailView',
    'RelaxationSessionListCreateView',
    'RelaxationSessionDetailView',
    'RelaxationAnalyticsView',
    'RelaxationTipsListView',
    # Goals views
    'PatientGoalListCreateView',
    'PatientGoalDetailView',
    # Inspiration views
    'DailyInspirationView',
    # Dashboard views
    'PatientDashboardView',
    # Notification views
    'NotificationPreferenceView',
    'NotificationListView',
    'UnreadNotificationCountView',
    'MarkNotificationReadView',
    'MarkAllNotificationsReadView',
    'DeleteNotificationView',
]
