# Hybrid QA and Release Plan

## Test Matrix

### Platforms

- Mobile Web: Chrome Android, Safari iOS
- Hybrid Android: Android 13/14 mid-range devices
- Hybrid iOS: iOS 17+ (TestFlight phase)

### Core User Flows

1. Authentication
   - sign in / sign out
   - social callback redirect
   - session restore after app restart
2. Learning
   - open tutorial list and detail
   - mark tutorial completed
   - open course and switch lessons
3. Explore
   - mode toggle
   - Earth history flow
   - reduced mode behavior on low-end/mobile
4. Community
   - open forum list and post detail
   - create post/comment (authenticated)
5. Payments
   - redirect to provider and return route handling

## Device/Network Conditions

- Good network (WiFi)
- Weak mobile network (3G simulation)
- Offline start and resume
- Background/foreground transitions

## KPI Tracking

- Crash-free sessions (%)
- Route interactive time (P75):
  - `/tutorial`
  - `/tutorial/[slug]`
  - `/courses/[slug]`
  - `/explore`
- Completion conversion on mobile:
  - tutorial complete action rate
  - course next-lesson progression rate
- Engagement:
  - session length
  - screens/session

## Staged Rollout

1. Internal dogfood (team devices)
   - 3-5 days
   - bug triage daily
2. Closed Android beta
   - 50-100 users
   - monitor crashes, auth/payment regressions
3. TestFlight beta
   - 30-50 users
   - verify deep links + callback flows
4. Public rollout
   - gradual percentage ramp
   - rollback criteria:
     - crash-free sessions < 98%
     - payment return failures > baseline + 20%

## Release Gates

- No P0/P1 open defects
- Crash-free sessions >= 99% in beta
- P75 route interactive time stable vs web baseline
- Auth + payment + tutorial completion pass across matrix
