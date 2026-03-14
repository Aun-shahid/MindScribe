# Mood Logging System

## Purpose
This is the single source of truth for how mood logging works across backend APIs, alerting, realtime notifications, and frontend clients.

## Data Model
- Model: `patients.MoodEntry`
- Core field: `mood_intensities` (JSON map of mood -> intensity 1..5)
- Multiple entries per day are allowed.
- Daily summary is derived by `MoodEntry.get_dominant_mood_for_day(patient, date)`.

Example payload:

```json
{
  "mood_intensities": {
    "happy": 4,
    "peaceful": 5,
    "anxious": 2
  },
  "triggers_list": ["sleep", "exercise"],
  "notes": "Felt better after a walk",
  "activities": "walk, breathing exercise",
  "mood_date": "2026-03-13"
}
```

## API Flow

### 1) Create Mood Entry
- Endpoint: `POST /api/patients/mood/` or `POST /api/patients/mood/today/`
- Serializer validates:
  - moods are from allowed set
  - intensity values are 1..5
- Entry is saved with authenticated patient.

### 2) Trigger Alert Rules
After save, backend calls `create_mood_alerts_for_therapists(patient)`:
- Downward trend alert rule
- 3 consecutive bad-mood-days alert rule (`sad`, `angry`, `anxious`, `overwhelmed`, `stressed`)

### 3) Persist + Realtime Notification
When a rule triggers:
- Notification is persisted in `patients.Notification`
- Realtime event is pushed to Channels group `notifications_user_<therapist_id>`
- WebSocket route: `ws/notifications/`

## Read APIs
- `GET /api/patients/mood/` supports filters:
  - `start_date`, `end_date`
  - `mood` (filters by mood key inside `mood_intensities`)
- `GET /api/patients/mood/today/` returns all today entries + summary
- `GET /api/patients/mood/analytics/` returns distribution and trend analytics
- `GET /api/patients/mood/weekly-trend/` returns weekly view and pattern insight

## AI Insight Generation
- Weekly trend response includes rule-based pattern insight.
- If OpenAI key is configured, AI insight generator can produce personalized text insight.
- If unavailable, system gracefully falls back to rule-based insight.

## Frontend Contracts
- Mobile and web create APIs must send `mood_intensities` payload (not legacy `mood`/`intensity` flat fields).
- Frontend should expect derived fields in response:
  - `moods_list`, `dominant_mood`, `average_intensity`, `triggers_list`

## Operational Notes
- There is currently no strict one-entry-per-day enforcement.
- Alert dedup is per day + action URL for therapist notifications.
- If adding new moods, update:
  - `MoodEntry.MOOD_CHOICES`
  - any frontend mood list/constants
  - docs/examples in this file
