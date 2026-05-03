import json
import uuid
from datetime import datetime, timedelta, timezone
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")
django.setup()

from django.db import connection

def generate_demo_data():
    therapist_id = "18ef7c96-74e4-433c-8d47-fa0e94709bc2"
    patient_id = "3180957b-b02c-4ad3-89c0-a38a163ef6ef"
    
    now = datetime.now(timezone.utc)
    
    sessions = []
    transcriptions = []
    segments = []
    emotions = []
    insights = []
    soap_notes = []

    segment_pk_counter = 1
    emotion_pk_counter = 1

    def create_session(session_number, days_ago, status, dialogue, session_notes="", insight_data=None, soap_data=None):
        nonlocal segment_pk_counter, emotion_pk_counter
        s_id = str(uuid.uuid4())
        s_start = now - timedelta(days=days_ago, hours=1)
        s_end = s_start + timedelta(minutes=50)
        
        sessions.append({
            "model": "therapy_sessions.session",
            "pk": s_id,
            "fields": {
                "patient": patient_id,
                "therapist": therapist_id,
                "session_number": session_number,
                "session_type": "individual",
                "is_recurring": False,
                "scheduled_date": s_start.isoformat(),
                "actual_start_time": s_start.isoformat() if status in ["COMPLETED", "IN_PROGRESS"] else None,
                "actual_end_time": s_end.isoformat() if status == "COMPLETED" else None,
                "duration_minutes": 50,
                "status": status,
                "location": "Online Video",
                "is_online": True,
                "session_notes": session_notes,
                "session_summary": "Summary of session " + str(session_number),
                "patient_goals": "Manage anxiety and stress",
                "homework_assigned": "Keep a daily mood journal.",
                "patient_mood_before": 5 if status == "COMPLETED" else None,
                "patient_mood_after": 7 if status == "COMPLETED" else None,
                "session_effectiveness": 8 if status == "COMPLETED" else None,
                "consent_recording": True,
                "consent_ai_analysis": True,
                "websocket_room_id": str(uuid.uuid4()),
                "created_at": s_start.isoformat(),
                "updated_at": s_end.isoformat() if status == "COMPLETED" else s_start.isoformat()
            }
        })
        
        if status in ["COMPLETED", "IN_PROGRESS"] and dialogue:
            t_id = str(uuid.uuid4())
            transcriptions.append({
                "model": "transcription.transcription",
                "pk": t_id,
                "fields": {
                    "session": s_id,
                    "status": "completed" if status == "COMPLETED" else "processing",
                    "language_detected": "en",
                    "processing_started_at": s_end.isoformat() if status == "COMPLETED" else s_start.isoformat(),
                    "processing_completed_at": (s_end + timedelta(minutes=5)).isoformat() if status == "COMPLETED" else None
                }
            })
            
            current_time = 0.0
            for line in dialogue:
                seg_id = segment_pk_counter
                segment_pk_counter += 1
                
                segments.append({
                    "model": "transcription.transcriptionsegment",
                    "pk": seg_id,
                    "fields": {
                        "transcription": t_id,
                        "speaker_type": line["speaker"],
                        "text": line["text"],
                        "start_time": current_time,
                        "end_time": current_time + line["duration"],
                        "confidence_score": 0.96
                    }
                })
                
                if "emotion" in line:
                    emotions.append({
                        "model": "transcription.emotionanalysis",
                        "pk": emotion_pk_counter,
                        "fields": {
                            "segment": seg_id,
                            "primary_emotion": line["emotion"]["primary"],
                            "emotion_scores": line["emotion"]["scores"],
                            "valence": line["emotion"]["val"],
                            "arousal": line["emotion"]["arousal"],
                            "confidence": 0.88
                        }
                    })
                    emotion_pk_counter += 1
                current_time += line["duration"] + 1.2
                
        if status == "COMPLETED" and insight_data:
            insights.append({
                "model": "therapy_sessions.sessioninsight",
                "pk": len(insights) + 1,
                "fields": {
                    "session": s_id,
                    "overall_mood": insight_data.get("overall_mood", "neutral"),
                    "mood_score": insight_data.get("mood_score", 5.0),
                    "key_themes": insight_data.get("key_themes", []),
                    "emotional_patterns": insight_data.get("emotional_patterns", {}),
                    "recommendations": insight_data.get("recommendations", ""),
                    "generated_at": (s_end + timedelta(minutes=6)).isoformat()
                }
            })
            
        if status == "COMPLETED" and soap_data:
            soap_notes.append({
                "session_id": s_id,
                "subjective": soap_data.get("subjective", ""),
                "objective": soap_data.get("objective", ""),
                "assessment": soap_data.get("assessment", ""),
                "plan": soap_data.get("plan", ""),
                "raw_json": json.dumps(soap_data),
                "created_at": (s_end + timedelta(minutes=10)).isoformat()
            })

    # Dialogue 1
    dialogue1 = [
        {"speaker": "therapist", "text": "Hello, how are you feeling today?", "duration": 3},
        {"speaker": "patient", "text": "A bit overwhelmed, to be honest. Work has been piling up.", "duration": 5, "emotion": {"primary": "overwhelmed", "scores": {"overwhelmed": 0.7, "sad": 0.2}, "val": -0.5, "arousal": 0.6}},
        {"speaker": "therapist", "text": "I hear you. When you say overwhelming, what specific part of work feels that way?", "duration": 6},
        {"speaker": "patient", "text": "It's mostly the new project deadlines. They feel impossible to meet.", "duration": 6, "emotion": {"primary": "anxious", "scores": {"anxious": 0.8, "fear": 0.1}, "val": -0.7, "arousal": 0.7}},
        {"speaker": "therapist", "text": "Let's break them down together. Have you tried making a prioritized list?", "duration": 5},
        {"speaker": "patient", "text": "Not yet. I just get frozen when I look at all of it at once.", "duration": 5, "emotion": {"primary": "fear", "scores": {"fear": 0.6, "helpless": 0.4}, "val": -0.8, "arousal": 0.5}},
        {"speaker": "therapist", "text": "That's a common reaction. What if we focus on just the very first step?", "duration": 5},
        {"speaker": "patient", "text": "That... actually sounds more manageable. I could probably do that.", "duration": 5, "emotion": {"primary": "hopeful", "scores": {"hopeful": 0.6, "calm": 0.4}, "val": 0.4, "arousal": 0.3}}
    ]
    insight1 = {
        "overall_mood": "anxious but improving",
        "mood_score": 6.5,
        "key_themes": ["workplace stress", "time management", "overwhelm"],
        "emotional_patterns": {"anxious": 0.6, "hopeful": 0.3, "fear": 0.1},
        "recommendations": "Patient responds well to task breakdown. Continue practicing prioritization."
    }
    soap1 = {
        "subjective": "Patient reports feeling overwhelmed by work and new project deadlines. States feeling 'frozen' when looking at tasks.",
        "objective": "Patient appeared anxious initially, speaking quickly. Demeanor calmed when discussing actionable steps.",
        "assessment": "Generalized anxiety symptoms exacerbated by workplace stressors. Patient demonstrates good insight and willingness to try behavioral interventions.",
        "plan": "Patient will create a prioritized list focusing only on the first step of the project. Follow up next week on task completion and anxiety levels."
    }

    # Dialogue 2
    dialogue2 = [
        {"speaker": "therapist", "text": "Welcome back. How did the prioritizing exercise go this week?", "duration": 4},
        {"speaker": "patient", "text": "It went surprisingly well. I actually got the first two tasks done.", "duration": 5, "emotion": {"primary": "happy", "scores": {"happy": 0.8, "proud": 0.2}, "val": 0.7, "arousal": 0.6}},
        {"speaker": "therapist", "text": "That's fantastic progress! How did it feel when you crossed them off?", "duration": 5},
        {"speaker": "patient", "text": "Really relieving. Like a huge weight was lifted off my shoulders.", "duration": 6, "emotion": {"primary": "relieved", "scores": {"relieved": 0.9}, "val": 0.8, "arousal": 0.2}},
        {"speaker": "therapist", "text": "Great! Did you face any moments where the anxiety returned?", "duration": 4},
        {"speaker": "patient", "text": "A little bit on Wednesday, but I remembered to focus on just one thing.", "duration": 6, "emotion": {"primary": "calm", "scores": {"calm": 0.7, "focused": 0.3}, "val": 0.3, "arousal": 0.2}}
    ]
    insight2 = {
        "overall_mood": "relieved and calm",
        "mood_score": 8.0,
        "key_themes": ["progress", "relief", "coping mechanism success"],
        "emotional_patterns": {"relieved": 0.5, "happy": 0.3, "calm": 0.2},
        "recommendations": "Reinforce successful use of focusing techniques. Introduce secondary coping strategy for mid-week anxiety spikes."
    }
    soap2 = {
        "subjective": "Patient reports successful completion of prioritized tasks. Describes feeling 'a huge weight lifted' and relief.",
        "objective": "Patient appears relaxed, with brighter affect and steady speech tempo compared to last session.",
        "assessment": "Patient is successfully applying CBT techniques (task breakdown/focus) to manage workplace anxiety. Symptoms significantly reduced.",
        "plan": "Continue current strategies. Introduce brief mindfulness exercise for sudden anxiety spikes. Re-evaluate in two weeks."
    }

    # Dialogue 3 (In Progress)
    dialogue3 = [
        {"speaker": "therapist", "text": "It's good to see you again. Where would you like to start today?", "duration": 4},
        {"speaker": "patient", "text": "I've been thinking about the mindfulness exercises...", "duration": 4, "emotion": {"primary": "thoughtful", "scores": {"thoughtful": 0.8}, "val": 0.2, "arousal": 0.3}}
    ]

    create_session(1, 14, "COMPLETED", dialogue1, "Initial discussion on workplace anxiety.", insight1, soap1)
    create_session(2, 7, "COMPLETED", dialogue2, "Follow-up on prioritization homework. Good progress.", insight2, soap2)
    create_session(3, 0, "IN_PROGRESS", dialogue3, "Session currently ongoing.") # In progress session
    create_session(4, -7, "UPCOMING", [], "") # Upcoming session

    demo_data = sessions + transcriptions + segments + emotions + insights
    
    with open("demo.json", "w") as f:
        json.dump(demo_data, f, indent=4)
        
    print("demo.json generated successfully without SOAP notes.")
    
    # Now manually insert soap_notes_ai
    print("Inserting SOAP notes into soap_notes_ai...")
    with connection.cursor() as cursor:
        cursor.execute("CREATE TABLE IF NOT EXISTS soap_notes_ai (id SERIAL PRIMARY KEY, session_id VARCHAR(255) NOT NULL, subjective TEXT, objective TEXT, assessment TEXT, plan TEXT, raw_json JSONB, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)")
        
        for note in soap_notes:
            cursor.execute("""
                INSERT INTO soap_notes_ai (session_id, subjective, objective, assessment, plan, raw_json, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, [
                note["session_id"], note["subjective"], note["objective"], note["assessment"], note["plan"], note["raw_json"], note["created_at"]
            ])
            print(f"Inserted SOAP note for session {note['session_id']}")

if __name__ == "__main__":
    generate_demo_data()
    print("All tasks completed.")
