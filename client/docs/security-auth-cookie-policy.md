# Security Auth and Cookie Policy

This frontend currently uses token-based auth for API access.

## Auth Transport

- Access token is sent using `Authorization: Bearer <token>`.
- Frontend auth requests now use:
  - `credentials: 'omit'`
  - `cache: 'no-store'`
- This avoids implicit cookie coupling and stale auth response caching.

## Token Storage

- Web: token in `localStorage` under `galaxies_token`.
- Hybrid native: mirrored token in Capacitor Preferences.
- Basic token format validation is applied before use.
- Invalid token format is cleared from storage automatically.

## Cookie Policy (Current)

- No auth cookie is required by current frontend flow.
- If backend later migrates to HttpOnly refresh cookies:
  - set `SameSite=Lax` (or `None; Secure` only when cross-site required)
  - enable `Secure` in non-local environments
  - rotate refresh tokens on use

## Required Operational Hygiene

- Never commit credential files or secrets into git.
- Root `.gitignore` now excludes:
  - `aws_credentials.txt`
  - `*.credentials`
  - `*.key`
  - `*.p12`
