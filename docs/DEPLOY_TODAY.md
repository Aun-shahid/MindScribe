# MindScribe Deployment (Today)

This runbook is optimized to get MindScribe deployed today with minimal risk.

## 1) Backend (Railway)

Service root: `MindScribe/Backend`

### Required Railway Variables

Set these in Railway service variables:

- `DJANGO_SECRET_KEY` = strong random string
- `DJANGO_DEBUG` = `False`
- `DATABASE_URL` = Railway Postgres URL
- `DJANGO_ALLOWED_HOSTS` = `.railway.app,your-api-domain.com`
- `CORS_ALLOW_ALL_ORIGINS` = `False`
- `CORS_ALLOWED_ORIGINS` = `https://your-web-domain.com`
- `CSRF_TRUSTED_ORIGINS` = `https://your-web-domain.com,https://*.railway.app`
- `SECURE_SSL_REDIRECT` = `True`
- `SESSION_COOKIE_SECURE` = `True`
- `CSRF_COOKIE_SECURE` = `True`
- `FRONTEND_URL` = `https://your-web-domain.com`
- `RESEND_API_KEY` = your Resend API key
- `EMAIL_FROM` = sender email
- `DEFAULT_FROM_EMAIL` = sender email
- `REDIS_URL` = Railway Redis URL (recommended for Channels)

### Deploy

- Railway reads `Backend/railway.toml` and `Backend/start.sh`.
- On deploy, static files collect + migrations run automatically.
- Validate backend health: `https://<your-backend>/api/authenticator/health/`

## 2) Web Frontend (Vercel/Netlify)

Project root: `MindScribe/Frontend/web`

### Build Settings

- Build command: `npm run build`
- Output directory: `dist`

### Required Environment Variables

- `VITE_BACKEND_URL` = `https://<your-backend-domain>`
- `VITE_AI_SERVICE_URL` = `https://<your-ai-service-domain>`

## 3) Mobile (Expo EAS)

Project root: `MindScribe/Frontend/mobile`

`eas.json` is included with `development`, `preview`, and `production` profiles.

### One-time setup

```bash
npm install
npm install -g eas-cli
eas login
```

### Internal testing build (APK)

```bash
eas build --platform android --profile preview
```

### Production builds

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Store submission

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## 4) Final Smoke Checklist

- Backend health endpoint returns 200
- Login works on web
- Patient notifications load and real-time updates arrive
- Mobile login works on release build (`preview` or `production`)
- Email verification sends successfully in production

## 5) Rollback Strategy (Same Day)

- Keep previous Railway deployment in history for rollback.
- Keep latest successful mobile `preview` artifact before pushing store build.
- Do not rotate signing credentials on release day.
