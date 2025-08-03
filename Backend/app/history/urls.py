from django.urls import path
from .views import (
    PatientHistoryDashboardView, HistoryEntriesView, HistoryEntryDetailView,
    MoodEntriesView, JournalEntriesView, ActivityEntriesView, 
    GoalsProgressView, HistoryAnalyticsView, HistoryStatsView
)

urlpatterns = [
    # Dashboard
    path('dashboard/', PatientHistoryDashboardView.as_view(), name='history_dashboard'),
    
    # General entries management
    path('entries/', HistoryEntriesView.as_view(), name='history_entries'),
    path('entries/<uuid:pk>/', HistoryEntryDetailView.as_view(), name='history_entry_detail'),
    
    # Specific entry types (most commonly used)
    path('mood/', MoodEntriesView.as_view(), name='mood_entries'),
    path('journal/', JournalEntriesView.as_view(), name='journal_entries'),
    path('activities/', ActivityEntriesView.as_view(), name='activity_entries'),
    
    # Goals and progress
    path('goals/', GoalsProgressView.as_view(), name='goals_progress'),
    
    # Analytics and statistics
    path('analytics/', HistoryAnalyticsView.as_view(), name='history_analytics'),
    path('stats/', HistoryStatsView.as_view(), name='history_stats'),
]