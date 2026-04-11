# Mobile Readiness Checklist

This checklist is used for Phase 1 mobile hardening before hybrid packaging.

## Core Flows

- `client/src/components/ui/AppHeader.tsx`
  - [x] Mobile menu with touch-friendly actions
  - [x] Auth actions accessible on small screens
- `client/src/app/explore/page.tsx`
  - [x] Reduced mode on small screens / reduced motion
  - [x] Overlay controls readable and touch-friendly
- `client/src/app/tutorial/page.tsx`
  - [x] Learning path can be collapsed on mobile
- `client/src/app/tutorial/[slug]/page.tsx`
  - [x] Action button full width on mobile
  - [x] Objectives section stacks correctly
- `client/src/app/courses/[slug]/page.tsx`
  - [x] Lesson list toggle for mobile
  - [x] Hide dense navigation by default on small screens

## QA Baseline

- Minimum viewport tested: `320px` width
- No horizontal overflow in core pages
- Primary actions are at least `44px` touch target height
- Header navigation remains accessible while logged in/out
