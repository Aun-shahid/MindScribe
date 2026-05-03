import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = list(User.objects.filter(email__contains='aun.shahid11').values('id', 'email'))
print("===USERS===")
print(json.dumps(users, default=str))
print("===END_USERS===")

from therapy_sessions.models import Session
from transcription.models import Transcription, TranscriptionSegment, EmotionAnalysis

print("===SESSIONS===")
sessions = list(Session.objects.all()[:2].values())
print(json.dumps(sessions, default=str))

