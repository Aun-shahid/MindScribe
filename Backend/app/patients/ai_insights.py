"""
AI-powered mood pattern analysis using OpenAI GPT
Generates personalized, empathetic insights based on weekly mood data
"""
import os
from openai import OpenAI
from django.conf import settings
import json


class MoodInsightGenerator:
    """Generate AI-powered insights from mood tracking data"""
    
    def __init__(self):
        self.client = None
        self.fallback_mode = False
        
        # Initialize OpenAI client if API key exists
        api_key = None
        try:
            from django.conf import settings
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
        except Exception:
            pass
        
        if not api_key:
            api_key = os.getenv('OPENAI_API_KEY')
        
        if api_key and api_key.strip():
            try:
                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                print(f"OpenAI initialization failed: {e}. Using fallback insights.")
                self.fallback_mode = True
        else:
            print("OPENAI_API_KEY not found. Using fallback insights.")
            self.fallback_mode = True
    
    def generate_weekly_insight(self, weekly_moods, patient_name=None):
        """
        Generate AI-powered weekly mood insight
        
        Args:
            weekly_moods: List of daily mood data with structure:
                [
                    {
                        'day': 'Mon',
                        'date': '2026-01-13',
                        'mood': 'anxious',
                        'intensity': 4,
                        'all_moods': ['anxious', 'stressed'],
                        'entry_count': 2,
                        'triggers': ['work', 'sleep'],
                        'mood_breakdown': {
                            'anxious': {'avg_intensity': 3.5, 'frequency': 2}
                        }
                    },
                    ...
                ]
            patient_name: Optional patient name for personalization
        
        Returns:
            str: AI-generated insight message
        """
        if self.fallback_mode or not self.client:
            return self._fallback_insight(weekly_moods)
        
        try:
            # Prepare structured data for AI
            mood_data = self._prepare_mood_summary(weekly_moods)
            
            # Create AI prompt
            prompt = self._create_insight_prompt(mood_data, patient_name)
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cost-effective
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a compassionate mental health assistant analyzing mood patterns. "
                            "Provide empathetic, actionable insights in 1-2 sentences. "
                            "Be supportive, non-judgmental, and encouraging. "
                            "Focus on patterns, progress, and gentle suggestions. "
                            "Use appropriate emojis (1-2 max) for emotional tone. "
                            "Keep response under 150 characters if possible, max 200."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=100
            )
            
            insight = response.choices[0].message.content.strip()
            return insight
            
        except Exception as e:
            print(f"AI insight generation failed: {e}. Using fallback.")
            return self._fallback_insight(weekly_moods)
    
    def _prepare_mood_summary(self, weekly_moods):
        """Prepare structured summary of weekly mood data for AI"""
        summary = {
            'total_days_tracked': len([m for m in weekly_moods if m.get('mood')]),
            'days_data': []
        }
        
        for day_data in weekly_moods:
            if day_data.get('mood'):
                summary['days_data'].append({
                    'day': day_data['day'],
                    'dominant_mood': day_data['mood'],
                    'intensity': day_data.get('intensity', 0),
                    'all_moods': day_data.get('all_moods', []),
                    'entry_count': day_data.get('entry_count', 1),
                    'triggers': day_data.get('triggers', []),
                    'mood_breakdown': day_data.get('mood_breakdown', {})
                })
        
        return summary
    
    def _create_insight_prompt(self, mood_data, patient_name=None):
        """Create detailed prompt for AI analysis"""
        days_tracked = mood_data['total_days_tracked']
        
        if days_tracked == 0:
            return "No mood entries this week. Encourage the user to start tracking daily."
        
        # Build concise data summary
        prompt_parts = [
            f"Mood tracking data for this week ({days_tracked} days logged):\n"
        ]
        
        for day in mood_data['days_data']:
            moods_str = ', '.join(day['all_moods'])
            triggers_str = ', '.join(day['triggers']) if day['triggers'] else 'none'
            
            prompt_parts.append(
                f"- {day['day']}: {day['dominant_mood']} (intensity {day['intensity']}), "
                f"also felt: {moods_str}, triggers: {triggers_str}, {day['entry_count']} entries"
            )
        
        prompt_parts.append(
            "\nAnalyze this data and provide ONE empathetic insight focusing on:\n"
            "1. Most significant pattern (streaks, weekend trends, progression)\n"
            "2. Actionable encouragement or gentle suggestion\n"
            "3. Acknowledge complexity if multiple moods are present\n"
            "Be warm, supportive, and concise (1-2 sentences, under 200 chars)."
        )
        
        return '\n'.join(prompt_parts)
    
    def _fallback_insight(self, weekly_moods):
        """Rule-based fallback when AI is unavailable"""
        mood_entries = [m for m in weekly_moods if m.get('mood')]
        
        if not mood_entries:
            return "Start tracking your mood daily to see patterns and insights! 📊"
        
        if len(mood_entries) < 3:
            return f"You've logged {len(mood_entries)} day(s) this week. Try tracking daily for more personalized insights! 🌱"
        
        # Simple pattern detection
        positive_moods = ['happy', 'peaceful', 'excited', 'grateful', 'hopeful']
        negative_moods = ['sad', 'angry', 'anxious', 'overwhelmed', 'stressed']
        
        positive_days = [m for m in mood_entries if m.get('mood') in positive_moods]
        negative_days = [m for m in mood_entries if m.get('mood') in negative_moods]
        
        # Check for streaks
        consecutive_positive = 0
        max_positive_streak = 0
        
        for entry in mood_entries:
            if entry.get('mood') in positive_moods:
                consecutive_positive += 1
                max_positive_streak = max(max_positive_streak, consecutive_positive)
            else:
                consecutive_positive = 0
        
        # Generate insight based on patterns
        if max_positive_streak >= 3:
            return f"🌟 Amazing! You've maintained {max_positive_streak} consecutive days of positive emotions. You're building great momentum!"
        
        if len(positive_days) >= len(mood_entries) * 0.7:
            return f"✨ Wonderful week! {len(positive_days)} out of {len(mood_entries)} days with positive emotions. Whatever you're doing, it's working!"
        
        if len(negative_days) >= len(mood_entries) * 0.7:
            return f"🫂 This has been a tough week with {len(negative_days)} challenging days. Please be gentle with yourself. Reach out to someone you trust."
        
        # Weekend analysis
        weekend_moods = [m for m in mood_entries if m.get('day') in ['Fri', 'Sat', 'Sun']]
        weekday_moods = [m for m in mood_entries if m.get('day') in ['Mon', 'Tue', 'Wed', 'Thu']]
        
        if len(weekend_moods) >= 2 and len(weekday_moods) >= 2:
            weekend_positive = sum(1 for m in weekend_moods if m.get('mood') in positive_moods)
            weekday_positive = sum(1 for m in weekday_moods if m.get('mood') in positive_moods)
            
            weekend_ratio = weekend_positive / len(weekend_moods)
            weekday_ratio = weekday_positive / len(weekday_moods)
            
            if weekend_ratio > weekday_ratio + 0.3:
                return "☀️ Your mood lifts significantly on weekends! Consider: what activities bring you joy then? Can you bring some of that energy into your weekdays?"
        
        # Default balanced insight
        return f"⚖️ You've navigated {len(positive_days)} positive and {len(negative_days)} challenging days this week. That's the natural rhythm of life - you're handling it well."


# Global instance
insight_generator = MoodInsightGenerator()
