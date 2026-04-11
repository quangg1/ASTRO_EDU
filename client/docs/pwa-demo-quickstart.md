# PWA Demo Quickstart

Use this path when you only need demo delivery without APK signing.

## 1) Build and run production web

```bash
npm run build
npm run start
```

Open the app from a phone browser on the same domain/network.

## 2) Install as app (PWA)

- Android Chrome:
  - open the site
  - tap browser menu -> `Install app` / `Add to Home screen`
- iOS Safari:
  - open the site
  - Share -> `Add to Home Screen`

## 3) Offline behavior

- App shell and key routes are cached by `public/sw.js`.
- If network is down and navigation fails, user is sent to `/offline`.

## 4) Notes

- Service worker registration is enabled in production mode only.
- Rebuild/redeploy to propagate new service worker logic.
