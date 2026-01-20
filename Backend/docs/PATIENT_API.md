# Patient Module API Documentation

**Version:** 1.0  
**Last Updated:** January 16, 2026  
**Base URL:** `/api/patients/`

---

## Quick Start

### Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

Get token from:
```bash
POST /api/authenticator/login/
Body: { "email": "patient@example.com", "password": "yourpassword" }
```

### Test the API
**Swagger UI:** http://localhost:8000/api/schema/swagger-ui/

---

## API Endpoints

### Dashboard
**GET** `/api/patients/dashboard/`

Returns patient dashboard overview with current mood, journal stats, goals, and next session.

**Response:**
```json
{
  "current_mood": { "mood": "happy", "intensity": 8, "date": "2026-01-16" },
  "journal_count_this_month": 12,
  "active_goals_count": 3,
  "next_session": { "date": "Tomorrow", "time": "2:00 PM" }
}
```

---

### Mood Tracking

#### List/Create Mood Entries
**GET/POST** `/api/patients/mood/`

**Query Params (GET):**
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `mood`: Filter by specific mood

**POST Body:**
```json
{
  "mood": "happy",
  "intensity": 8,
  "notes": "Feeling good today",
  "triggers": "Good sleep, exercise",
  "activities": "Therapy session, morning walk",
  "mood_date": "2026-01-16"
}
```

**Mood Choices:** `very_happy`, `happy`, `neutral`, `sad`, `very_sad`, `anxious`, `angry`, `stressed`, `calm`, `excited`

#### Get Today's Mood
**GET** `/api/patients/mood/today/`

#### Mood Analytics
**GET** `/api/patients/mood/analytics/`

Returns mood trends, averages, and distribution.

---

### Journal Entries

#### List/Create Journal Entries
**GET/POST** `/api/patients/journal/`

**Query Params (GET):**
- `start_date`, `end_date`: Date range
- `is_favorite`: Filter favorites (true/false)
- `entry_type`: text/voice/mixed

**POST Body (Text):**
```json
{
  "title": "Today's Reflection",
  "content": "Feeling grateful for the progress...",
  "entry_type": "text",
  "mood_tags": "grateful,hopeful",
  "is_private": true
}
```

**POST Body (Voice):**
```json
{
  "title": "Voice Journal",
  "entry_type": "voice",
  "voice_recording_url": "https://storage.example.com/recording.mp3",
  "voice_duration_seconds": 180,
  "voice_transcription": "Transcribed text...",
  "is_private": true
}
```

#### Journal Statistics
**GET** `/api/patients/journal/analytics/`

Returns total entries, counts by type, favorites, and most used tags.

---

### Emotional Exploration

#### List/Create Emotional Insights
**GET/POST** `/api/patients/emotions/`

**POST Body:**
```json
{
  "primary_emotion": "anxiety",
  "intensity": 7,
  "what_happened": "Had a difficult conversation at work",
  "body_sensations": "Tight chest, rapid heartbeat",
  "thoughts": "I'm worried I said the wrong thing",
  "behaviors": "Withdrew from social interaction",
  "insights_learned": "Recognized my anxiety triggers",
  "coping_strategies": "Deep breathing, journaling"
}
```

**Emotion Choices:** `joy`, `sadness`, `anger`, `fear`, `anxiety`, `love`, `guilt`, `shame`, `pride`, `hope`, `gratitude`, `confusion`

#### Emotional Analytics
**GET** `/api/patients/emotions/analytics/`

---

### Relaxation & Nature Therapy

#### List Relaxation Content
**GET** `/api/patients/relaxation/content/`

**Query Params:**
- `content_type`: nature/meditation/breathing/music/ambient
- `category`: rain/ocean/forest/birds/wind/fire/etc.

#### Start Relaxation Session
**POST** `/api/patients/relaxation/sessions/`

```json
{
  "content": "content-uuid",
  "mood_before": "stressed"
}
```

#### Complete Session
**PATCH** `/api/patients/relaxation/sessions/{id}/`

```json
{
  "duration_listened_seconds": 900,
  "completed": true,
  "mood_after": "calm",
  "rating": 5,
  "notes": "Very relaxing"
}
```

---

### Daily Inspiration

**GET** `/api/patients/inspiration/`

Returns daily inspirational quote with reflection prompt.

**Response:**
```json
{
  "quote": "Healing is not about forgetting or moving on...",
  "author": "Unknown",
  "category": "healing",
  "reflection_prompt": "What experiences have taught you the most?"
}
```

---

### Goals

#### List/Create Goals
**GET/POST** `/api/patients/goals/`

**Query Params (GET):**
- `status`: not_started/in_progress/completed/on_hold
- `priority`: low/medium/high

**POST Body:**
```json
{
  "title": "Practice mindfulness daily",
  "description": "Spend 10 minutes each morning in meditation",
  "priority": "high",
  "target_date": "2026-03-01",
  "milestones": "Week 1: 5 min, Week 2: 7 min, Week 3: 10 min"
}
```

#### Update Goal
**PATCH** `/api/patients/goals/{id}/`

```json
{
  "progress_percentage": 60,
  "status": "in_progress"
}
```

---

## Testing Examples

### Using curl

**Get Dashboard:**
```bash
curl -X GET "http://localhost:8000/api/patients/dashboard/" \
  -H "Authorization: Bearer <TOKEN>"
```

**Create Mood Entry:**
```bash
curl -X POST "http://localhost:8000/api/patients/mood/" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"mood":"happy","intensity":8}'
```

### Using Postman

1. Set base URL: `http://localhost:8000`
2. Add header: `Authorization: Bearer <your-token>`
3. Import endpoints from Swagger

---

## Mobile App Feature Mapping

| Mobile Feature | API Endpoint |
|----------------|--------------|
| Today's Mood | `POST /mood/` |
| Journal Entries Count | `GET /journal/analytics/` |
| Take a Break | `GET /relaxation/content/` |
| Journal (Text/Voice) | `POST /journal/` |
| Mood Tracker | `GET /mood/analytics/` |
| Emotional Exploration | `POST /emotions/` |
| Daily Inspiration | `GET /inspiration/` |
| Goal Setting | `POST /goals/` |
| Dashboard | `GET /dashboard/` |

---

## Error Responses

**400 Bad Request:**
```json
{ "field_name": ["Error message"] }
```

**401 Unauthorized:**
```json
{ "detail": "Authentication credentials were not provided." }
```

**403 Forbidden:**
```json
{ "detail": "Only patients can access this endpoint." }
```

**404 Not Found:**
```json
{ "detail": "Not found." }
```

---

## Notes

- All dates: `YYYY-MM-DD` format
- All timestamps: ISO 8601 format
- UUIDs used for all IDs
- Pagination: 20 items per page (default)
- Only patients can access these endpoints

---

## Complete Endpoint List

```
GET    /api/patients/dashboard/
GET    /api/patients/mood/
POST   /api/patients/mood/
GET    /api/patients/mood/{id}/
PATCH  /api/patients/mood/{id}/
DELETE /api/patients/mood/{id}/
GET    /api/patients/mood/today/
GET    /api/patients/mood/analytics/
GET    /api/patients/journal/
POST   /api/patients/journal/
GET    /api/patients/journal/{id}/
PATCH  /api/patients/journal/{id}/
DELETE /api/patients/journal/{id}/
GET    /api/patients/journal/analytics/
GET    /api/patients/emotions/
POST   /api/patients/emotions/
GET    /api/patients/emotions/{id}/
PATCH  /api/patients/emotions/{id}/
DELETE /api/patients/emotions/{id}/
GET    /api/patients/emotions/analytics/
GET    /api/patients/relaxation/content/
GET    /api/patients/relaxation/content/{id}/
POST   /api/patients/relaxation/sessions/
GET    /api/patients/relaxation/sessions/
PATCH  /api/patients/relaxation/sessions/{id}/
GET    /api/patients/relaxation/sessions/analytics/
GET    /api/patients/goals/
POST   /api/patients/goals/
GET    /api/patients/goals/{id}/
PATCH  /api/patients/goals/{id}/
DELETE /api/patients/goals/{id}/
GET    /api/patients/inspiration/
```

**Total:** 30+ endpoints
