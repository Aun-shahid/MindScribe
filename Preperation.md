# MindScribe — Open House Preparation

---

## 🎤 1-Minute Presentation Script

> **Memorize this flow: Introduction → Use Case → Deliverables**

**"Good morning/afternoon everyone, I'm [Name] and this is MindScribe.**

**MindScribe is an AI-powered clinical documentation assistant built for psychologists and psychotherapists.** The idea is simple — therapists spend hours writing session notes after every appointment. That's time taken away from their patients.

**The real-world use case:** A therapist records their session, and MindScribe does everything else automatically. It transcribes the conversation — even in Urdu — identifies who is the therapist and who is the patient through speaker diarization, runs emotion analysis on the audio *and* the text, and then generates structured clinical SOAP notes that meet professional standards.

**What makes us different** is that a therapist can miss subtle emotional cues during a session — our AI catches those hidden signals at an early stage by analyzing both what was *said* and *how* it was said through audio emotion recognition.

**On the technical side, our backend is built in Python using two frameworks — Django and FastAPI** — running as separate microservices. Django handles all user management, authentication, session scheduling, and WebSocket real-time communication. FastAPI powers the entire AI pipeline — transcription, emotion analysis, SOAP note generation, and RAG-based recommendations. Both services are containerized with Docker and deployed on Railway.

**Our key deliverables:** two distinct frontends — a React (Vite) web app for therapists to manage their practice, and a React Native mobile app for patients. It's important to note that even without the AI features, our platform provides a very solid, fully functional management system for therapists. On top of that, we add our AI pipeline: AI-generated SOAP notes, emotion analysis, multilingual support (including Urdu), and real-time session management via WebSockets.

**Thank you — happy to take any questions."**

---

---

## 📋 Interview Questions & Answers

---

### 🏗️ ARCHITECTURE & FRAMEWORK QUESTIONS

---

**Q1: Why did you use both Django AND FastAPI? Couldn't one framework handle everything?**

**A:** This is a deliberate architectural decision based on the strengths of each framework:

- **Django** is a batteries-included framework — it gives us a built-in ORM, admin panel, authentication system, migrations, and Django REST Framework for traditional CRUD APIs. It's ideal for user management, session scheduling, patient records, and therapist profiles. It also has Django Channels for WebSocket support via Daphne (ASGI server).

- **FastAPI** is async-first, extremely fast, and lightweight — perfect for computationally heavy AI workloads. Our AI pipeline (transcription, diarization, emotion analysis, SOAP note generation) involves long-running tasks, external API calls (OpenAI, ElevenLabs), and loading ML models into memory. FastAPI's native `async/await` support and Pydantic schemas make this much cleaner.

- **Separation of Concerns:** By splitting into two services, we can scale them independently. The AI service might need GPU resources, while Django just needs a standard web server. If the AI service crashes, the main app keeps running.

- **Communication:** Django calls FastAPI's REST endpoints internally (service-to-service). They share the same JWT secret key (`AI_SERVICE_SECRET_KEY`) so authentication tokens work across both.

**In short:** Django = business logic & data layer. FastAPI = AI/ML processing layer. Together they form a microservices architecture.

---

**Q2: What type of APIs are you using? REST? GraphQL?**

**A:** We use **RESTful APIs** exclusively across both services.

- **Django side:** Built with **Django REST Framework (DRF)** — all endpoints follow REST conventions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). We use `drf-spectacular` to auto-generate **OpenAPI/Swagger** documentation at `/api/schema/swagger-ui/`.

- **FastAPI side:** FastAPI is inherently REST-based and also auto-generates Swagger docs at `/docs` and ReDoc at `/redoc`. Routes are organized under versioned prefixes like `/api/v1/session/`, `/api/v1/soap/`, `/api/v1/rag/`.

- **Data format:** All APIs use JSON for request/response bodies, with `multipart/form-data` for file uploads (audio files, profile pictures).

- **API Design:** We follow resource-based URL patterns — e.g., `/api/therapy_sessions/sessions/` for session CRUD, `/api/authenticator/login/` for auth, `/api/v1/session/process` for AI processing.

---

**Q3: How does authentication work in your system?**

**A:** We use **JWT (JSON Web Tokens)** via the `djangorestframework-simplejwt` library:

1. **Login Flow:** User sends email + password → backend verifies credentials → returns an `access` token (60 min TTL) and a `refresh` token (7-day TTL).

2. **Token Structure:** Access tokens contain the `user_id` claim, signed with HS256 algorithm using the `AI_SERVICE_SECRET_KEY`.

3. **Token Refresh:** When the access token expires, the client sends the refresh token to `/api/authenticator/token/refresh/` to get new tokens. Old refresh tokens are blacklisted after rotation.

4. **Protected Routes:** Every API request includes `Authorization: Bearer <access_token>` in the header. DRF's `JWTAuthentication` class validates this automatically.

5. **Cross-Service Auth:** Both Django and FastAPI share the same JWT signing key, so a token issued by Django is valid on FastAPI endpoints too. FastAPI verifies the token using the same `HS256` algorithm and secret.

6. **Role-Based Access:** Users have a `user_type` field — either `therapist` or `patient`. API views check this to restrict access (e.g., only therapists can create sessions, view SOAP notes, etc.).

---

**Q4: How does Google OAuth work in your app?**

**A:** We support **Google Sign-In**, but **only on the Web App (for therapists)**. The mobile app (for patients) uses standard authentication.

1. **Client-Side (Web Only):** The React web app uses Google's OAuth2 SDK to authenticate the therapist and obtain a Google `id_token`.

2. **Token Verification:** The client sends this `id_token` to our `POST /api/authenticator/google-login/` endpoint. The Django backend uses Google's `google-auth` library (`google.oauth2.id_token.verify_oauth2_token()`) to verify the token against our registered `GOOGLE_CLIENT_ID`.

3. **User Creation/Login:** If the email doesn't exist, we auto-create a user account with `email_verified=True` (since Google already verified it). If the user exists, we just log them in.

4. **Profile Creation:** Since this is web-only, a `TherapistProfile` is automatically created for new accounts.

5. **Token Issuance:** After verification, we issue our own JWT tokens (access + refresh), same as regular login. From this point on, the app uses our JWTs, not Google's token.

6. **Password Handling:** Google-authenticated users initially have no password set (unusable password in Django). They can optionally set a password later via the Change Password endpoint.

---

### 🔌 REAL-TIME & COMMUNICATION QUESTIONS

---

**Q5: Are you using WebSockets or Webhooks? What for?**

**A:** We use **WebSockets** for real-time session management and audio streaming during in-person therapy:

- **Technology Stack:** Django Channels + Daphne ASGI server + Redis (production) / InMemoryChannelLayer (dev).

- **What is memory (Redis) used for here?** Redis acts as the **channel layer** (a message broker). Even for in-person sessions, it manages the session state across the server. It ensures that session control commands (like "Start" or "End") are synchronized. If the therapist has multiple tabs open or if we add real-time feedback features, Redis handles that coordination in memory.

- **WebSocket Endpoint:** `ws/therapy-session/<room_id>/`

- **How is audio sent over WebSockets?** The therapist's device captures the in-person conversation, breaks it into small chunks, encodes them into **Base64 strings**, and streams them over the WebSocket inside a **JSON payload**. 

- **Why stream via WebSocket instead of a single upload?** Streaming chunk-by-chunk is much more reliable. It ensures that the audio is being received by the server in real-time. If the browser crashes or the device loses power at the end of a 50-minute session, the recording isn't lost because the server already has the data chunks.

**Webhooks:** We use ElevenLabs' webhook metadata field in our transcription API calls, but the primary communication pattern is WebSockets for session stability and REST for the final processing.

---

### 🎵 AUDIO & TRANSCRIPTION QUESTIONS

---

**Q6: Why do you use WAV audio format instead of MP3 or others?**

**A:** We use **WAV (PCM 16-bit)** as our standard audio format for several important reasons:

1. **Lossless Quality:** WAV is an uncompressed format — it preserves the full audio signal without lossy compression artifacts. This is critical for:
   - **Emotion recognition:** Our Wav2Vec2 model analyzes acoustic features like pitch, tone, and micro-expressions. MP3 compression discards frequency data that could affect emotion classification accuracy.
   - **Transcription accuracy:** Higher quality audio = better speech-to-text results, especially for Urdu where phonetic nuances matter.

2. **ML Model Compatibility:** Our Wav2Vec2 emotion model expects 16kHz, 16-bit PCM audio. WAV stores data in exactly this format natively. With MP3/AAC, we'd need to decode → resample, introducing potential quality loss.

3. **Processing Pipeline:** We use `librosa` and `soundfile` for audio resampling — both work natively with WAV. The resampled files are written as `PCM_16` WAV at 16kHz: `sf.write(path, audio, 16000, subtype='PCM_16')`.

4. **Trade-off:** WAV files are larger (~10MB/min vs ~1MB/min for MP3), but since we process audio server-side and don't store raw recordings long-term, the size trade-off is acceptable for the quality gain.

---

**Q7: Can you explain the complete life cycle of audio from the frontend to the AI model? How is it compiled and segmented?**

**A:** Since our sessions are **in-person**, the focus is on high-fidelity recording and stable processing:

1. **Capture & Streaming (Therapist's Device):** 
   The therapist starts the session on their device (web dashboard). The app captures the in-person conversation, breaks the audio into chunks, and streams them via **WebSockets** to our backend. This allows for a continuous, stable recording process that doesn't rely on a single massive upload at the end.

2. **Compilation (Server-Side):**
   When the therapist ends the session, the accumulated audio chunks are finalized. The backend sends this complete audio buffer (raw bytes) to the FastAPI AI service via a REST API call (`POST /{session_id}/stop`).

3. **Preprocessing & Resampling:**
   Inside FastAPI, we take those raw bytes and write them to a temporary `.raw` file. We then use Python's `wave` module to compile and resample the audio into a single, high-quality **16kHz, 16-bit PCM WAV file**. This ensures the audio is in the exact format required by our AI models.

4. **Segmentation (Diarization):**
   How do we know where to break the audio into segments? **We rely on ElevenLabs for this.** We send the complete WAV file to ElevenLabs' `scribe_v2` API. ElevenLabs performs **Speaker Diarization** — it analyzes the audio, detects when a speaker starts and stops talking, and returns an array of segments. Each segment comes with a `start` timestamp, an `end` timestamp, and a `speaker` label.

5. **Audio Slicing for Emotion Model:**
   Now that ElevenLabs has given us the exact timestamps for every sentence, we use the `pydub` library to physically slice the large WAV file into smaller audio chunks based on those `start` and `end` times. 
   *(Criteria: We only slice segments that are at least 500ms long, because anything shorter doesn't contain enough acoustic data for emotion recognition).*

6. **Parallel Processing:**
   These sliced audio chunks are passed to our local **Wav2Vec2** model for acoustic emotion analysis, while the transcribed text for that specific segment is translated to English and passed to **GPT-5-mini** for text emotion analysis.

**Q7.5: What models/APIs do you use for Transcription and Translation?**

**A:**
1. **Primary: ElevenLabs Scribe v2** — Handles full transcription and diarization simultaneously, supporting both Urdu and English.
2. **Fallback: OpenAI Whisper / gpt-4o-transcribe** — Used if ElevenLabs is unavailable.
3. **Translation:** **GPT-4o-mini** translates Urdu text to English with a custom prompt designed to preserve clinical and therapeutic terminology before sending it to the emotion model.

---

### 🧠 AI & ML MODEL QUESTIONS

---

**Q8: How does the audio emotion recognition model work?**

**A:** Our audio emotion model is a **fine-tuned Wav2Vec2** model:

1. **Base Model:** `Wav2Vec2ForSequenceClassification` from HuggingFace Transformers — originally a speech representation model by Facebook/Meta, fine-tuned for emotion recognition (base: `superb/wav2vec2-large-superb-er`, or our custom fine-tuned version `AudacityA/wav2vec-ft-er`).

2. **How It Works:**
   - Raw audio bytes (16kHz, 16-bit PCM) are converted to a float32 numpy array
   - The `AutoFeatureExtractor` normalizes and pads the audio into model-ready tensors
   - The model processes the waveform through CNN feature encoders → Transformer encoder layers → classification head
   - Output: logits for each emotion class → softmax → probabilities
   - We pick the highest-probability emotion and its confidence score

3. **Running Locally:** The model weights are loaded into memory on startup (or lazily on first request). On the server, it runs on **CPU** (or GPU if available via `torch.cuda`). The model files can be loaded from:
   - A HuggingFace model ID (downloaded and cached automatically)
   - A Google Drive URL (downloaded, unzipped, cached locally in `~/.cache/mindscribe/models/`)
   - A local file path

4. **Thread Safety:** Model loading uses a threading lock (`_model_lock`) to prevent race conditions during concurrent requests. The model is loaded once and cached in global variables.

5. **Emotion Labels:** The model outputs: `joy`, `sadness`, `anger`, `neutral`, `surprise`, `disgust`, `fear`. We normalize raw labels (e.g., `happiness` → `joy`, `angry` → `anger`) using a mapping function.

---

**Q9: How does the text emotion model work?**

**A:** Text emotion analysis uses a **GPT-based classifier** with role-aware prompting:

1. **Primary: GPT-5-mini** (configurable via `EMOTION_TEXT_MODEL` env var):
   - We send the transcript text to OpenAI's chat API with a specialized system prompt
   - The prompt is **role-aware** — it behaves differently for therapist vs. patient speech:
     - **Therapist:** Strong neutral bias. Reflective listening, paraphrasing, and mirroring are classified as NEUTRAL, not the emotion they reference. Non-neutral emotions only accepted if confidence ≥ 0.90.
     - **Patient:** Handles disambiguation — e.g., "superiority/pride" statements → NEUTRAL or ANGER (not SADNESS); past-emotion with positive resolution → JOY or NEUTRAL.
   - Returns structured JSON with `primary_emotion`, `confidence`, and `all_scores`
   - Text is anonymized for privacy before sending to the API

2. **Fallback: DistilRoBERTa** (`j-hartmann/emotion-english-distilroberta-base`):
   - A local HuggingFace pipeline that runs when GPT fails
   - Faster but less context-aware than GPT

---

**Q10: How does the emotion fusion work? How do audio and text combine?**

**A:** We use a **three-stage pipeline** with a lightweight fusion resolver:

1. **Stage 1 — Audio Emotion:** Wav2Vec2 analyzes the raw audio → `AudioEmotionResult`
2. **Stage 2 — Text Emotion:** GPT analyzes the transcript (with audio result as a weak prior) → `TextEmotionResult`
3. **Stage 3 — Fusion:** A rule-based resolver combines both:
   - **Text-first priority:** If text confidence ≥ 0.70, use text emotion
   - **Audio override:** Only if text is low-confidence AND audio confidence ≥ 0.85
   - **Agreement boost:** If both agree, confidence is boosted (capped at 0.98)
   - Audio labels like SADNESS/FEAR are calibrated — below a threshold (0.75/0.80), they default to NEUTRAL to reduce false positives from pitch-based misclassification

**Why text-first?** Audio models can confuse high pitch with sadness or monotone with neutrality. Text provides semantic context that is more reliable for distinguishing emotions like pride vs. sadness.

---

**Q11: How does the SOAP note generation work?**

**A:** SOAP (Subjective, Objective, Assessment, Plan) notes are generated using a **dual-provider system:**

1. **Primary: HuggingFace Space** — We host a custom SOAP generation model on HuggingFace Spaces. The transcript is formatted with speaker labels and emotion tags, then sent to the Space's `/generate-soap` endpoint.

2. **Refinement/Fallback: GPT-4o-mini** — If the HF Space is used, its output is optionally refined by GPT-4o-mini for clinical quality. If the Space fails, GPT-4o-mini generates the SOAP note directly.

3. **Clinical Pattern Analysis:** In parallel, a second GPT call analyzes the transcript for interpersonal patterns, cognitive patterns, affect regulation, resilience, therapeutic alliance, and diagnostic considerations. This is appended to the Assessment section.

4. **Valence/Arousal Scoring:** We compute average emotional valence (-1 to +1) and arousal (0 to 1) using Russell's circumplex model, which is included in the SOAP note metadata.

---

**Q12: What is the RAG system for?**

**A:** RAG (Retrieval-Augmented Generation) provides **personalized therapeutic recommendations:**

- It retrieves a patient's past session history (SOAP notes, emotion patterns, progress indicators)
- Uses OpenAI embeddings (`text-embedding-3-small`) for vector similarity search
- Generates tailored recommendations based on cumulative session data — things like recurring anxiety triggers, improving coping strategies, or treatment adjustments
- Currently uses an in-memory placeholder store, with MongoDB Atlas vector search planned for production

---

**Q13: What is speaker diarization and how does it work?**

**A:** Diarization is the process of identifying **"who spoke when"** in an audio recording:

1. **Primary: ElevenLabs Scribe v2** — Built-in diarization during transcription. Returns word-level speaker IDs.

2. **Secondary: PyAnnote** (`pyannote/speaker-diarization-3.1`):
   - A HuggingFace-based neural diarization model
   - Audio is loaded with `torchaudio` and passed as an in-memory tensor
   - Returns segments with speaker labels, start/end timestamps
   - Supports min/max speaker count hints

3. **Fallback: Silence-based segmentation** — If both fail, we use `pydub`'s `detect_nonsilent()` to split audio at silence gaps and assign alternating speaker labels.

4. **Post-processing:** Consecutive same-speaker segments are merged if the gap is ≤ 0.7 seconds. If too many speakers are detected, labels are collapsed using an adjacency heuristic.

---

### ☁️ CLOUD & DEPLOYMENT QUESTIONS

---

**Q14: How is the project deployed? What cloud platform?**

**A:** We deploy on **Railway** (PaaS) with Docker containers:

- **Two separate services on Railway:**
  1. **Backend (Django)** — Port 8000, served by Daphne ASGI server
  2. **AI Service (FastAPI)** — Port 8080, served by Uvicorn ASGI server

- **Database:** PostgreSQL hosted on Railway, connected via `DATABASE_URL` environment variable.

- **Redis:** Used in production for Django Channels layer (WebSocket message broker). Falls back to `InMemoryChannelLayer` locally.

- **Domain:** The backend is accessible at `*.railway.app` domains with HTTPS.

---

**Q15: How do the Dockerfiles work? Walk me through them.**

**A:** We have two Dockerfiles — one per service:

**Backend Dockerfile (Django):**
```dockerfile
FROM python:3.11-slim
# Install system deps (build-essential, libpq-dev for PostgreSQL)
# Copy requirements.txt → pip install
# Copy app/ directory and start.sh
# start.sh runs: collectstatic → migrate → daphne (ASGI server)
EXPOSE 8000
CMD ["/app/start.sh"]
```

**AI Service Dockerfile (FastAPI):**
```dockerfile
FROM python:3.11-slim
# Install system deps (gcc, g++, git, libsndfile1, ffmpeg for audio processing)
# Copy requirements.txt → pip install
# Create /app/models_cache for ML model storage
# Run uvicorn with dynamic PORT from environment
EXPOSE 8080
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}
```

Key differences: The AI service needs `ffmpeg` and `libsndfile1` for audio processing, plus `git` for downloading HuggingFace models.

---

**Q16: What does the `start.sh` script do?**

**A:** The backend's startup script runs three steps in order:
1. `python manage.py collectstatic --noinput` — Gathers static files for WhiteNoise to serve
2. `python manage.py migrate` — Applies any pending database migrations automatically
3. `exec daphne -b 0.0.0.0 -p ${PORT:-8000} app.asgi:application` — Starts the Daphne ASGI server (supports both HTTP and WebSocket protocols)

The `exec` replaces the shell process with Daphne so Docker signal handling works correctly.

---

**Q17: What is the `railway.toml` for?**

**A:** It's Railway's deployment configuration:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Backend/Dockerfile"
context = "Backend"

[deploy]
startCommand = "/app/start.sh"
healthcheckPath = "/api/authenticator/health/"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
maxRestartCount = 3
```
- Tells Railway to build using our Dockerfile from the `Backend/` context
- Sets a health check endpoint so Railway knows the service is alive
- Auto-restarts on failure (max 3 times)

---

**Q18: How do environment variables work across services?**

**A:** Both services use `.env` files locally and Railway's environment variable panel in production:

- **Shared variables:** `AI_SERVICE_SECRET_KEY` (JWT signing), `DATABASE_URL`, `OPENAI_API_KEY`
- **Django-specific:** `DJANGO_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `REDIS_URL`, `RESEND_API_KEY`
- **FastAPI-specific:** `EMOTION_MODEL_PATH`, `HF_TOKEN`, `ELEVENLABS_API_KEY`, `HF_SPACE_URL`
- **Service URLs:** Django knows FastAPI's URL via `AI_SERVICE_URL`, and vice versa via `BACKEND_URL`

Both use `python-dotenv` to load `.env` files. FastAPI uses Pydantic Settings for type-safe config validation.

---

### 🗄️ DATABASE & DATA QUESTIONS

---

**Q19: What database are you using and why?**

**A:** **PostgreSQL** — a robust, production-grade relational database:
- Handles complex queries, joins, and transactions needed for therapy session data
- Connected via `dj_database_url` which parses `DATABASE_URL` environment variable
- Django's ORM manages all schema via migrations (`makemigrations` → `migrate`)
- Django apps: `authenticator`, `users`, `therapy_sessions`, `transcription`, `history`, `patients`, `core`
- The AI Service connects to the same PostgreSQL database via `asyncpg` (async PostgreSQL driver) for storing AI processing results

---

**Q20: How do you handle file uploads (audio files)?**

**A:** Audio files are handled via Django's `FileSystemStorage`:
- Uploaded via `MultiPartParser` / `FormParser` in DRF views
- Stored in the `MEDIA_ROOT` directory (`media/` folder)
- Served at `/media/` URL path
- In production, this is ephemeral storage on Railway — a volume mount or S3 migration is planned
- Audio files are forwarded to the AI Service for processing via internal REST calls

---

### 🔒 SECURITY QUESTIONS

---

**Q21: How do you handle security?**

**A:**
- **JWT token rotation:** Refresh tokens are blacklisted after use (`token_blacklist` app)
- **Password hashing:** Django's default PBKDF2 with SHA256
- **Rate limiting:** Configurable `MAX_LOGIN_ATTEMPTS` (5) with `LOCKOUT_DURATION` (15 min)
- **CORS:** Configurable allowed origins; restricted in production, open in development
- **CSRF:** Trusted origins configured for Railway domains
- **SSL:** `SECURE_PROXY_SSL_HEADER` configured for Railway's reverse proxy
- **Email verification:** 6-digit code sent via Resend API, expires in 24 hours
- **PII anonymization:** Text sent to external APIs is anonymized before transmission
- **WebSocket auth:** JWT validated on connection handshake

---

### 🛠️ MISC TECHNICAL QUESTIONS

---

**Q22: What does your tech stack look like overall?**

| Layer | Technology |
|-------|-----------|
| **Backend API** | Django 5.2 + Django REST Framework |
| **AI Service** | FastAPI + Uvicorn |
| **Real-Time** | Django Channels + Daphne + Redis |
| **Database** | PostgreSQL (via dj_database_url) |
| **Auth** | JWT (simplejwt) + Google OAuth2 |
| **Transcription** | ElevenLabs Scribe v2 + OpenAI Whisper/gpt-4o-transcribe |
| **Emotion (Audio)** | Wav2Vec2 (HuggingFace Transformers, PyTorch) |
| **Emotion (Text)** | GPT-5-mini + DistilRoBERTa fallback |
| **SOAP Notes** | HuggingFace Space + GPT-4o-mini |
| **Translation** | GPT-4o-mini |
| **RAG** | OpenAI Embeddings + GPT-4o-mini |
| **Mobile App** | React Native (Expo) |
| **Web Frontend** | React (Vite) |
| **Deployment** | Docker + Railway |
| **API Docs** | Swagger (drf-spectacular + FastAPI auto-docs) |
| **Audio Processing** | librosa, soundfile, pydub, torchaudio, ffmpeg |
| **Email** | Resend API |
| **Static Files** | WhiteNoise |

---

**Q23: What Python libraries are critical to the project?**

**Backend (Django):**
- `djangorestframework` — REST API framework
- `djangorestframework-simplejwt` — JWT authentication
- `drf-spectacular` — OpenAPI/Swagger docs
- `channels` + `daphne` — WebSocket support
- `channels-redis` — Redis channel layer for WebSockets
- `google-auth` — Google OAuth token verification
- `dj-database-url` — Database URL parsing
- `whitenoise` — Static file serving
- `python-dotenv` — Environment variable loading
- `resend` — Transactional email service

**AI Service (FastAPI):**
- `fastapi` + `uvicorn` — ASGI web framework & server
- `transformers` + `torch` — Wav2Vec2 emotion model
- `librosa` + `soundfile` — Audio loading & resampling
- `pydub` — Audio segment extraction
- `torchaudio` — Audio tensor loading for diarization
- `pyannote.audio` — Speaker diarization (fallback)
- `openai` — GPT API client (transcription, emotion, SOAP, translation)
- `pydantic` + `pydantic-settings` — Data validation & config
- `nltk` — Natural language tokenization
- `numpy` — Audio array processing

---

**Q24: How do you handle errors and edge cases in the AI pipeline?**

**A:** Multi-level fallback strategy:
1. **Transcription:** ElevenLabs → OpenAI Whisper → empty string with error logged
2. **Diarization:** ElevenLabs built-in → PyAnnote → silence-based segmentation → single-segment fallback
3. **Emotion (Audio):** Wav2Vec2 → returns `UNKNOWN` with 0.0 confidence
4. **Emotion (Text):** GPT → DistilRoBERTa local model → returns `UNKNOWN`
5. **SOAP Notes:** HF Space → GPT-4o-mini refinement → GPT-4o-mini direct generation
6. **Each stage catches exceptions individually** so one failure doesn't crash the entire pipeline

---

**Q25: What would you do differently or improve?**

**A:**
- **Move audio storage to S3/Cloudflare R2** — Railway's disk is ephemeral
- **Add Celery + Redis** for background task processing (long audio files)
- **MongoDB Atlas** for RAG vector storage with proper semantic search
- **GPU deployment** for faster emotion model inference
- **Fine-tune the audio emotion model** on therapy-specific datasets
- **Add comprehensive test coverage** — currently unit tests exist but integration tests are limited
- **WebSocket scaling** — move to a dedicated WebSocket service for production scale

---

*Last updated: April 29, 2026 — Open House Preparation*
