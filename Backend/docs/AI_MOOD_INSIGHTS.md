# AI-Powered Mood Insights

## Overview
The mood tracking system now uses **OpenAI GPT-4o-mini** to generate personalized, empathetic weekly insights based on patient mood patterns.

## Features

### ✅ **Intelligent Pattern Analysis**
- Analyzes mood frequency, intensity, and progression
- Detects emotional complexity (multiple moods per day)
- Identifies triggers and correlations
- Compares weekend vs weekday patterns

### ✅ **Personalized Insights**
- Context-aware recommendations
- Empathetic, supportive tone
- Actionable suggestions
- Adaptive to individual patterns

### ✅ **Automatic Fallback**
- Falls back to rule-based insights if OpenAI API is unavailable
- No service interruption
- Graceful degradation

---

## Setup Instructions

### 1. **Install OpenAI Package**
```bash
pip install openai==1.58.1
```

### 2. **Get OpenAI API Key**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

### 3. **Add to Environment Variables**

**For Local Development (.env file):**
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**For Railway/Production:**
1. Go to Railway dashboard
2. Select your project
3. Go to "Variables" tab
4. Add:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-your-actual-api-key-here`

### 4. **Restart Server**
```bash
python manage.py runserver
```

---

## How It Works

### **API Call Flow:**

1. **User requests weekly trend:**
   ```http
   GET /api/patients/mood/weekly-trend/
   ```

2. **Backend aggregates mood data:**
   - Collects 7 days of entries
   - Calculates dominant moods, intensities
   - Identifies triggers and patterns

3. **AI generates insight:**
   ```python
   # Data sent to AI:
   {
       'Mon': {
           'dominant_mood': 'anxious',
           'intensity': 4,
           'all_moods': ['anxious', 'stressed'],
           'triggers': ['work', 'sleep'],
           'entry_count': 2
       },
       'Tue': {...},
       ...
   }
   ```

4. **AI returns personalized insight:**
   ```json
   {
       "pattern_insight": "🌊 Your anxiety eased from intensity 4 (Mon) to peaceful by Wed. The sleep + exercise triggers helped! Keep that routine going.",
       "ai_powered": true
   }
   ```

---

## AI Prompt Structure

The system sends a carefully crafted prompt to OpenAI:

```
Mood tracking data for this week (5 days logged):

- Mon: anxious (intensity 4), also felt: stressed, triggers: work, sleep, 2 entries
- Tue: peaceful (intensity 3), also felt: grateful, triggers: exercise, 1 entry
- Wed: happy (intensity 5), also felt: excited, peaceful, triggers: sleep, exercise, 3 entries
- Thu: overwhelmed (intensity 3), also felt: anxious, triggers: work, 2 entries
- Fri: grateful (intensity 4), also felt: hopeful, triggers: social, 1 entry

Analyze this data and provide ONE empathetic insight focusing on:
1. Most significant pattern (streaks, weekend trends, progression)
2. Actionable encouragement or gentle suggestion
3. Acknowledge complexity if multiple moods are present

Be warm, supportive, and concise (1-2 sentences, under 200 chars).
```

### **AI System Instructions:**
```
You are a compassionate mental health assistant analyzing mood patterns.
Provide empathetic, actionable insights in 1-2 sentences.
Be supportive, non-judgmental, and encouraging.
Focus on patterns, progress, and gentle suggestions.
Use appropriate emojis (1-2 max) for emotional tone.
Keep response under 150 characters if possible, max 200.
```

---

## Example AI Insights

### **Scenario 1: Positive Progression**
```json
{
  "pattern_insight": "🌱 Beautiful progression! You moved from anxious (Mon) to peaceful by Wed. Sleep + exercise were key triggers. Keep nurturing that routine!",
  "ai_powered": true
}
```

### **Scenario 2: Emotional Complexity**
```json
{
  "pattern_insight": "🎭 You're experiencing rich emotional depth - 3 entries on Wed alone! Your awareness of shifting from anxious to peaceful shows great self-insight.",
  "ai_powered": true
}
```

### **Scenario 3: Weekend Pattern**
```json
{
  "pattern_insight": "☀️ Clear weekend lift: anxious weekdays transformed to grateful/hopeful Fri-Sun. What weekend activities can you bring into weekdays?",
  "ai_powered": true
}
```

### **Scenario 4: Challenging Week**
```json
{
  "pattern_insight": "💙 I notice 4 days of overwhelm and anxiety this week. You're not alone. Consider reaching out to your therapist or a trusted friend.",
  "ai_powered": true
}
```

---

## Cost Estimation

**Using GPT-4o-mini:**
- **Cost:** ~$0.00015 per insight (150 tokens)
- **Monthly (1000 users, weekly insights):** ~$0.60
- **Extremely affordable for production use**

---

## Fallback Mode

**If OpenAI API is unavailable:**
- System automatically uses rule-based insights
- No errors thrown
- Response includes: `"ai_powered": false`

**Fallback triggers:**
- No API key configured
- API rate limit exceeded
- Network timeout
- API error response

---

## Testing

### **Test with AI (if API key is set):**
```bash
# Create some mood entries
curl -X POST http://localhost:8000/api/patients/mood/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mood_intensities": {"anxious": 4, "stressed": 3},
    "triggers_list": ["work", "sleep"],
    "notes": "Tough Monday morning"
  }'

# Get weekly trend with AI insight
curl http://localhost:8000/api/patients/mood/weekly-trend/ \
  -H "Authorization: Bearer <token>"
```

**Expected Response:**
```json
{
  "weekly_moods": [...],
  "pattern_insight": "🌊 Your anxiety eased throughout the week...",
  "ai_powered": true
}
```

### **Test Fallback Mode:**
```bash
# Temporarily unset API key
unset OPENAI_API_KEY

# Restart server and test again
# Should return rule-based insights with "ai_powered": false
```

---

## Security Best Practices

✅ **Never commit API keys to Git**
✅ **Use environment variables only**
✅ **Rotate keys if exposed**
✅ **Monitor usage on OpenAI dashboard**
✅ **Set spending limits in OpenAI account**

---

## Monitoring

Track AI insight performance:
```python
# In Django shell
from patients.ai_insights import insight_generator

# Check if AI is active
print(f"AI Mode: {'Active' if not insight_generator.fallback_mode else 'Fallback'}")
```

---

## Future Enhancements

**Potential improvements:**
- [ ] Cache insights for 24 hours to reduce API calls
- [ ] Add sentiment analysis for deeper pattern detection
- [ ] Provide monthly summary insights
- [ ] Multi-language support
- [ ] Therapist-specific prompts based on treatment approach

---

## Support

**If AI insights aren't working:**
1. Check `OPENAI_API_KEY` is set in environment
2. Verify API key is valid on OpenAI dashboard
3. Check server logs for error messages
4. Test API key manually:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

**Fallback mode is always available - system continues functioning without AI.**
