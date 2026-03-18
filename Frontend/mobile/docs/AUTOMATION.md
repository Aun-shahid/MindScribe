# Mobile Deployment Automation

This project now supports automated mobile delivery with two pipelines:

1. **OTA updates** (`.github/workflows/mobile-ota-update.yml`)
   - Trigger: push to `dev` or `main` when mobile files change.
   - `dev` -> publishes EAS Update to `preview` branch.
   - `main` -> publishes EAS Update to `production` branch.

2. **Binary builds** (`.github/workflows/mobile-build.yml`)
   - Trigger automatically on `main` when native/config files change (`app.json`, `package.json`, `eas.json`, `app.config.js`).
   - Also supports manual run from GitHub Actions UI for `preview/production` and `android/ios`.

## Required GitHub Secret

Add this repository secret:

- `EXPO_TOKEN`: token from Expo account settings.

## Important behavior

- **JS/TS-only changes** can ship without reinstall via OTA (`eas update`).
- **Native/config changes** still require fresh APK/AAB/IPA (`eas build`) and installation/store rollout.

## Recommended release flow

- Push feature changes to `dev` -> testers receive OTA on preview channel.
- Merge to `main` -> production OTA is published automatically.
- When native/config changes happen, `Mobile Build` workflow triggers and produces a new binary.
