# Questing Mobile Build Plan (iOS first, then Android)

Owner: Gabe (Skyyplayz)
Created: 2026-07-16
Status: Approved direction — ready for design/engineering handoff.
Extends: `docs/planning/questing-roadmap-2026-06-07.md` (the approved stabilization roadmap).

## Purpose

The approved 2026-06-07 roadmap is a backend stabilization and code-quality plan.
It states the product is "mobile-first (iOS/Android) with a web version," but it does
not describe **how the mobile app is actually built or how it connects to the existing
backend.** This document fills that gap so the iOS work can be handed off cleanly.

## Decision record (2026-07-16)

- **Architecture:** Keep Next.js as the backend + website. The iOS app is a separate
  client that talks to the **same** backend API. We do **not** rebuild business logic
  in the app.
- **Mobile framework:** **React Native (Expo).** One mobile codebase ships **iOS first,
  then Android** later with minimal extra work.
- **Rejected alternatives:** a WebView/Capacitor wrapper (weak at background GPS, push,
  and gamified UI; risks App Store rejection as a thin wrapper) and native SwiftUI
  (best iOS polish but requires a fully separate Android rebuild later).

## How the pieces fit together

```
   PostgreSQL            Backend API                Clients
   (the data)     →      (all the rules)      →     ┌─ Web browser   (Next.js pages — already built)
                         Next.js API routes         └─ iOS app       (React Native / Expo — to build)
                                                        Android later (same React Native codebase)
```

One source of truth (the backend). The website and the phone app are two windows into it.
The app never talks to the database directly — it always goes through the API.

## The critical prerequisite: make the backend "mobile-ready"

The backend today assumes a **browser**. Two things must change before the app can log in
and load data. This work should land **before or alongside** the iOS build, not after.

1. **Token-based login.** Auth today uses NextAuth **cookie sessions**, which a native
   app cannot use. The app needs to log in and receive a **bearer token** (JWT or opaque
   session token) that it sends on every request, plus a refresh/expiry story.
2. **A stable, documented, versioned JSON API.** The app needs a predictable contract
   (e.g. everything under `/api/v1/...`) with consistent success and error shapes, so the
   app and backend can evolve without breaking each other.

## Parent group A: Backend API readiness for mobile clients

Stage: Version 1 prerequisite · Workstream: Backend · Priority: P0

1. Add bearer-token issuance on login (credentials → token) that native clients can use
   alongside the existing web cookie session.
2. Add token refresh + expiry handling; document token lifetime and revocation on
   logout / ban / suspend (must respect `UserStatus`, matching existing auth rules).
3. Introduce a versioned API surface (e.g. `/api/v1`) and document which routes are the
   supported mobile contract vs. web-only/internal.
4. Standardize a JSON response + error envelope across mobile routes (ties into existing
   issues #78/#79 — malformed input currently returns empty 500s).
5. Configure CORS / allowed origins so the app (and Expo dev client) can call the API
   safely; keep cron/intake/admin-internal routes off the public mobile surface.
6. Add a device-token registration endpoint to store push tokens per user/device
   (foundation for push notifications).
7. Publish a typed/OpenAPI description of the mobile contract and share generated types
   with the React Native app so web, backend, and app stay in sync.
8. Add API tests for token auth on every mobile-facing route (poster, worker, admin,
   anonymous), mirroring the roadmap's authorization-matrix intent (Parent 3).

## Parent group B: iOS app (React Native + Expo)

Stage: Version 1 · Workstream: Frontend/Mobile · Priority: P0

9.  Stand up the Expo React Native project (recommend a `mobile/` folder in this repo or
    a dedicated repo; document the choice). Wire it to the versioned API.
10. Build auth screens (register, login, verify email, forgot/reset) against the token API.
11. Onboarding flow for workers/posters (mirrors web onboarding + owner-approved copy).
12. Quest Map with `react-native-maps` + list view of nearby quests.
13. GPS check-in using `expo-location`, including the background-location handling the
    safety flow needs; request permissions with clear usage strings.
14. Job detail, apply, and FCFS ("first come, first served") flows.
15. In-app chat: public Q&A threads + private worker/poster threads.
16. Payments via the **Stripe React Native SDK** (checkout, hold/release status).
17. Push notifications with `expo-notifications` for new/nearby quests, chat messages,
    application decisions, and SOS/safety events (uses Parent A #6).
18. Gamification UI: XP, level progression (Apprentice→Master), competency/reputation.
19. Safety: SOS button, safety-incident reporting, emergency-contact settings.
20. Profile + settings.
21. App Store readiness: privacy manifest, location/background-mode declarations,
    App Store Connect setup, TestFlight beta.

## Payments and the App Store (important)

- Questing sells **real-world services**, not digital goods. Apple's rules therefore do
  **not** force in-app purchase (the 30% tax); **Stripe is allowed**. Keep payments on
  Stripe.
- "Same-day pay after a quest" is a future goal (see `future-vision.md`). The realistic
  near-term path is **Stripe Connect instant payouts**; the full wallet/card product is a
  separate, much larger effort and is intentionally out of scope here.

## Handoff notes for design

- A basic app look already exists (owner-provided). Treat it as the visual starting point;
  reconcile it with the screens in Parent group B.
- The roadmap's ~15 "owner decision" items (personas, homepage value prop, navigation/
  routines placement, onboarding copy, safety UX, maps UX — Parent 10 in the roadmap) are
  delegated to **design to propose**, since the app mockups already answer most of them.
  Surface anything the mockups do *not* answer back to the owner (Gabe).

## Acceptance criteria

- A React Native app logs in with a token, loads nearby quests, and completes the core
  loop (apply → check in → complete → rate) against the real backend.
- Backend exposes a documented, versioned, token-authenticated API used by both clients.
- Payments work in Stripe test mode from the app.
- iOS build runs on a device via TestFlight.
- Android is reachable from the same codebase (deferred, but not blocked by the design).
