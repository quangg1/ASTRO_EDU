# Hybrid Capacitor Setup

This project now includes Capacitor scaffold files for Android/iOS wrappers.

## Added Assets

- `capacitor.config.ts`
- `capacitor-shell/index.html`
- `android/` platform project (generated)

## NPM Scripts

- `npm run hybrid:web:build` - build Next app
- `npm run hybrid:sync` - copy/sync assets and plugins
- `npm run hybrid:copy` - copy web assets to native projects
- `npm run hybrid:open:android` - open Android Studio project
- `npm run hybrid:open:ios` - open Xcode project (macOS only)
- `npm run hybrid:run:android` - run Android app with live reload
- `npm run hybrid:run:ios` - run iOS app with live reload (macOS only)

## Build Pipeline

1. Build/update web assets:
   - `npm run hybrid:web:build`
2. Sync Capacitor projects:
   - `npm run hybrid:sync`
3. Open native IDE and produce release binaries:
   - Android: `npm run hybrid:open:android`
   - iOS (macOS): `npm run hybrid:open:ios`

## Notes

- Current `webDir` is set to `capacitor-shell` for stable local wrapper scaffolding.
- For production wrapping of your deployed web app, configure `server.url` in
  `capacitor.config.ts` to your HTTPS domain and re-run `npm run hybrid:sync`.
