# Patient Module - Quick Reference

## 🔗 Base URL
```
/api/patients/
```

For detailed mood internals (alerts, realtime notifications, daily aggregation), see:
`Backend/docs/MOOD_LOGGING_SYSTEM.md`

## 📍 All Endpoints at a Glance

### Dashboard
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard/` | GET | Get overview with stats, mood, sessions |

### Mood Tracking (5 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mood/` | GET/POST | List all mood entries / Create new mood entry |
| `/mood/<uuid:pk>/` | GET/PATCH/DELETE | Get/update/delete specific mood entry |
| `/mood/today/` | GET | Get today's mood entries |
| `/mood/analytics/` | GET | Get mood statistics |
| `/mood/weekly-trend/` | GET | Get last 7 days trend |

### Journal (5 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/journal/` | GET/POST | List journal entries / Create new entry |
| `/journal/<uuid:pk>/` | GET/PATCH/DELETE | Get/update/delete entry |
| `/journal/prompt/today/` | GET | Get today's prompt |
| `/journal/prompts/` | GET | List all prompts |
| `/journal/analytics/` | GET | Get journal statistics |

### Activities (3 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/activities/` | GET/POST | List activities / Log new activity |
| `/activities/<uuid:pk>/` | GET/PATCH/DELETE | Get/update/delete activity |
| `/activities/analytics/` | GET | Get activity statistics |

### Emotions (3 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/emotions/` | GET/POST | List emotional insights / Create new insight |
| `/emotions/<uuid:pk>/` | GET/PATCH/DELETE | Get/update/delete insight |
| `/emotions/analytics/` | GET | Get emotion statistics |

### Relaxation (6 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/relaxation/content/` | GET | List relaxation content |
| `/relaxation/content/<uuid:pk>/` | GET | Get specific content |
| `/relaxation/tips/` | GET | Get relaxation tips |
| `/relaxation/sessions/` | GET/POST | List sessions / Create session |
| `/relaxation/sessions/<uuid:pk>/` | GET/PATCH | Manage session |
| `/relaxation/sessions/analytics/` | GET | Session statistics |

### Goals (2 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/goals/` | GET/POST | List goals / Create new goal |
| `/goals/<uuid:pk>/` | GET/PATCH/DELETE | Get/update/delete goal |

### Inspiration (1 endpoint)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/inspiration/` | GET | Get daily inspiration quote |

### Notifications (6 endpoints)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/` | GET | List notifications |
| `/notifications/<uuid:pk>/` | DELETE | Delete notification |
| `/notifications/<uuid:notification_id>/read/` | POST | Mark as read |
| `/notifications/mark-all-read/` | POST | Mark all as read |
| `/notifications/unread-count/` | GET | Get unread count |
| `/notifications/preferences/` | GET/PUT | Manage preferences |

---

## 🎯 Most Common Use Cases

### 1. Daily Check-in
```javascript
// Get dashboard
GET /api/patients/dashboard/

// Log mood
POST /api/patients/mood/
{
  "mood_intensities": {"happy": 4, "peaceful": 5},
  "triggers_list": ["sleep", "exercise"],
  "notes": "Feeling great today",
  "activities": "morning run, meditation"
}

// Write journal
POST /api/patients/journal/
{
  "title": "Daily Reflection",
  "content": "Today was good...",
  "mood_tags_list": ["grateful", "hopeful"],
  "is_private": true
}
```

### 2. Activity Logging
```javascript
POST /api/patients/activities/
{
  "activity_type": "exercise",
  "activity_name": "Morning Run",
  "duration_minutes": 30,
  "intensity": 7,
  "mood_before": 5,
  "mood_after": 8,
  "energy_before": 4,
  "energy_after": 9,
  "notes": "Felt energized after the run"
}
```

**Activity Types:** `exercise`, `social`, `creative`, `relaxation`, `work`, `hobby`, `meditation`, `therapy`, `sleep`, `eating`, `other`

### 3. View Analytics
```javascript
// Mood analytics
GET /api/patients/mood/analytics/

// Activity analytics
GET /api/patients/activities/analytics/

// Journal analytics
GET /api/patients/journal/analytics/
```

---

## 📦 Request/Response Examples

### Create Mood Entry
**Request:**
```json
POST /api/patients/mood/
{
  "mood_intensities": {
    "happy": 4,
    "peaceful": 5,
    "anxious": 2
  },
  "triggers_list": ["work", "family"],
  "notes": "Good day at work",
  "activities": "exercise,socializing"
}
```

**Available Moods:** `happy`, `sad`, `angry`, `anxious`, `peaceful`, `excited`, `grateful`, `overwhelmed`, `hopeful`, `stressed`

**Intensity:** 1-5 (1 = Very Low, 5 = Very High)

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient": "660e8400-e29b-41d4-a716-446655440000",
  "patient_name": "John Doe",
  "mood_intensities": {
    "happy": 4,
    "peaceful": 5,
    "anxious": 2
  },
  "moods_list": ["happy", "peaceful", "anxious"],
  "dominant_mood": "peaceful",
  "average_intensity": 3.67,
  "notes": "Good day at work",
  "triggers": "work,family",
  "triggers_list": ["work", "family"],
  "activities": "exercise,socializing",
  "mood_date": "2026-01-25",
  "created_at": "2026-01-25T14:30:00Z",
  "updated_at": "2026-01-25T14:30:00Z"
}
```

### Create Journal Entry
**Request:**
```json
POST /api/patients/journal/
{
  "title": "Daily Reflection",
  "content": "Today was challenging but I learned a lot about myself. I faced my fears and came out stronger.",
  "mood_tags_list": ["growth", "challenges", "learning"],
  "is_private": true,
  "is_favorite": false
}
```

**Available Mood Tags:** `happy`, `sad`, `anxious`, `peaceful`, `angry`, `grateful`, `hopeful`, `overwhelmed`, `excited`, `calm`, `stressed`, `reflective`, `struggling`, `breakthrough`, `progress`

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "patient": "550e8400-e29b-41d4-a716-446655440000",
  "patient_name": "John Doe",
  "prompt": null,
  "title": "Daily Reflection",
  "content": "Today was challenging but I learned a lot about myself. I faced my fears and came out stronger.",
  "mood_tags": "growth,challenges,learning",
  "mood_tags_list": ["growth", "challenges", "learning"],
  "is_private": true,
  "is_favorite": false,
  "entry_date": "2026-01-25",
  "created_at": "2026-01-25T14:35:00Z",
  "updated_at": "2026-01-25T14:35:00Z"
}
```

---

## 🔧 Query Parameters

### Common Filters

| Parameter | Used In | Description | Example |
|-----------|---------|-------------|---------|
| `start_date` | mood, journal, activities | Filter from date | `?start_date=2026-01-01` |
| `end_date` | mood, journal, activities | Filter to date | `?end_date=2026-01-31` |
| `limit` | mood, journal, activities | Limit results | `?limit=10` |
| `search` | journal | Search text | `?search=growth` |
| `favorite` | journal | Only favorites | `?favorite=true` |
| `activity_type` | activities | Filter by type | `?activity_type=exercise` |
| `mood` | mood | Filter by mood | `?mood=happy` |

---

## 🚨 Authentication

**All endpoints require:**
```javascript
headers: {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

**User must have:**
- `user_type: 'patient'`
- Valid, non-expired access token

---

## ⚡ Quick Tips

1. **IDs are UUIDs** - Always strings, not numbers
2. **Dates are ISO 8601** - Use format: `2026-01-25T14:30:00Z`
3. **Mood Intensities** - Must be a dict/object: `{"happy": 4, "peaceful": 5}` with intensity 1-5
4. **Lists vs Strings** - Some fields accept arrays that get stored as comma-separated:
   - `triggers_list: ["work", "family"]` → stored as `triggers: "work,family"`
   - `mood_tags_list: ["happy", "grateful"]` → stored as `mood_tags: "happy,grateful"`
5. **Intensity/Ratings** - Mood intensity: 1-5, Activity intensity: 1-10, Ratings: 1-5
6. **Analytics endpoints** - Return aggregated statistics, not raw data
7. **Pagination** - Default 20 items per page
8. **PATCH vs PUT** - Use PATCH for partial updates, PUT for full replacement

---

## 🎨 Frontend Implementation Checklist

- [ ] Setup API service with base URL
- [ ] Add authentication interceptor
- [ ] Implement dashboard page
- [ ] Create mood tracking UI
- [ ] Build journal interface
- [ ] Add activity logging
- [ ] Implement goals tracking
- [ ] Add notifications UI
- [ ] Create analytics/charts views
- [ ] Handle loading states
- [ ] Add error handling
- [ ] Implement offline support
- [ ] Add form validation
- [ ] Test all CRUD operations

---

## 📱 Mobile App Reference

Check these files for working examples:
- `Frontend/mobile/app/patient/dashboard.tsx`
- `Frontend/mobile/app/patient/mood-tracker.tsx`
- `Frontend/mobile/app/patient/journal.tsx`
- `Frontend/mobile/app/patient/activity-tracker.tsx`
- `Frontend/mobile/app/patient/history-dashboard.tsx`

---

## 📊 Total Endpoint Count

- **Dashboard:** 1 endpoint
- **Mood:** 5 endpoints
- **Journal:** 5 endpoints
- **Activities:** 3 endpoints
- **Emotions:** 3 endpoints
- **Relaxation:** 6 endpoints
- **Goals:** 2 endpoints
- **Inspiration:** 1 endpoint
- **Notifications:** 6 endpoints

**Total: 32 endpoints** 🎉
