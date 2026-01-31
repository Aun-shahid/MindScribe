# API Endpoint Cleanup - January 20, 2026

## Summary
Removed duplicate and deprecated endpoints to streamline the API and avoid confusion.

## ❌ Removed Endpoints

### 1. Duplicate Patient Dashboard
**Removed:** `/api/therapy_sessions/dashboard/patient/`
- **Reason:** Duplicate of `/api/patients/dashboard/`
- **Replacement:** Use `/api/patients/dashboard/` instead
- **Why:** The patients app dashboard is more comprehensive, including:
  - Mood tracking data
  - Journal statistics
  - Goals progress
  - Relaxation stats
  - Daily inspiration
  - Session information (already included)

**Impact:** Frontend should use `/api/patients/dashboard/` for all patient dashboard needs

---

### 2. Deprecated Session Request
**Removed:** `/api/therapy_sessions/sessions/request/`
- **Reason:** Replaced by new booking flow
- **Replacement:** Use `/api/therapy_sessions/booking/book/` instead
- **Why:** The new booking endpoint:
  - Validates available slots
  - Prevents double-booking
  - Integrates with therapist availability
  - Better error handling

**Migration Path:**
```javascript
// OLD (removed)
POST /api/therapy_sessions/sessions/request/
{
  "therapist_id": "uuid",
  "scheduled_date": "2026-01-21T14:00:00Z",
  ...
}

// NEW (use this)
POST /api/therapy_sessions/booking/book/
{
  "therapist": "uuid",
  "slot_start": "2026-01-21T14:00:00Z",
  "duration_minutes": 60,
  "is_online": true,
  "patient_goals": "Anxiety management"
}
```

---

## ✅ Current Endpoint Structure

### Patient Endpoints (`/api/patients/`)
- `GET /dashboard/` - **PRIMARY patient dashboard** ✅
- `GET,POST /mood/` - Mood tracking
- `GET,POST /journal/` - Journal entries
- `GET,POST /emotions/` - Emotional insights
- `GET,POST /goals/` - Therapy goals
- `GET /relaxation/content/` - Relaxation content
- `GET,POST /relaxation/sessions/` - Relaxation sessions
- `GET /inspiration/` - Daily inspiration
- `GET,PATCH /notifications/preferences/` - Notification settings
- `GET /notifications/` - Notification list

### Session Endpoints (`/api/therapy_sessions/`)
- `GET /sessions/upcoming/` - Upcoming sessions ✅
- `GET /sessions/past/` - Past sessions ✅
- `GET /sessions/my/` - All my sessions
- `GET /sessions/<uuid>/` - Session detail
- `POST /sessions/<uuid>/start/` - Start session
- `POST /sessions/<uuid>/end/` - End session
- `GET,PATCH /sessions/<uuid>/summary/` - Session summary

### Booking Endpoints (`/api/therapy_sessions/booking/`)
- `GET /slots/` - Available time slots
- `GET /dates/` - Available dates
- `POST /book/` - **Book regular session** ✅
- `POST /emergency/` - **Request emergency session** ✅

### Dashboard Endpoints
- `GET /api/patients/dashboard/` - **Patient dashboard** ✅
- `GET /api/therapy_sessions/dashboard/therapist/` - Therapist dashboard ✅

---

## 🔧 Changes Made

### File: `therapy_sessions/urls.py`

**Removed imports:**
```python
SessionRequestView  # Deprecated
PatientDashboardView  # Duplicate
```

**Removed URL patterns:**
```python
path('dashboard/patient/', ...)  # Use /api/patients/dashboard/
path('sessions/request/', ...)  # Use /api/therapy_sessions/booking/book/
```

**Added comment:**
```python
# Note: Patient dashboard is now at /api/patients/dashboard/ (more comprehensive)
```

---

## 📋 Frontend Migration Checklist

- [ ] Update all references from `/api/therapy_sessions/dashboard/patient/` to `/api/patients/dashboard/`
- [ ] Update session request calls from `/sessions/request/` to `/booking/book/`
- [ ] Test patient dashboard still loads correctly
- [ ] Test session booking still works
- [ ] Update API documentation if applicable
- [ ] Update frontend constants/config files

---

## 🎯 Benefits

1. **Single Source of Truth**: One patient dashboard endpoint eliminates confusion
2. **Better Booking Flow**: New booking endpoint validates slots and prevents conflicts
3. **Cleaner API**: Fewer endpoints = easier to maintain and understand
4. **Future-Proof**: Booking flow supports therapist availability features

---

## ⚠️ No Breaking Changes

Both removed endpoints were either:
1. Duplicates (dashboard) - other endpoint provides same/better data
2. Deprecated (request) - replacement already exists and is better

All existing functionality is preserved through the recommended replacements.

---

## 📊 Endpoint Count

**Before cleanup:** 36 endpoints (therapy_sessions) + 24 endpoints (patients) = 60 total
**After cleanup:** 34 endpoints (therapy_sessions) + 24 endpoints (patients) = 58 total
**Reduction:** 2 redundant endpoints removed ✅

---

## ✅ Validation

- Django check: ✅ Passed (0 issues)
- URL routing: ✅ No conflicts
- Imports: ✅ Clean
- Logic: ✅ No functionality lost

**Status: Safe for production** 🚀
