# Safety Escalation & Emergency Dispatch Plan

Owner: Gabe (Skyyplayz)
Created: 2026-07-16
Status: Groundwork spec. Defines how safety escalation MUST be built so the app can run
its own system now and switch to a partner (e.g. Nightlight) later — and so that
**contacting police / emergency services can never happen by accident.**

---

## 1. Current reality (verified in code on 2026-07-16)

A full search of the codebase was done. As of today:

- **The app has NO ability to contact police, 911, or any emergency service.** There is
  no such code, no phone/SMS/voice integration (no Twilio/Plivo/Vonage/etc.), and no
  emergency-dispatch API anywhere. Accidental contact is therefore **impossible today** —
  the capability does not exist.
- **The "SOS" button** (`app/api/jobs/[id]/sos/route.ts`) currently only:
  1. creates a `HIGH` severity `SafetyIncident` record,
  2. flips the job status to `DISPUTED` so an admin reviews it, and
  3. returns the worker's own **personal emergency contact** (a friend/family member the
     worker typed into their profile) plus an admin email, for the app to display.
- **The only outbound channel in the entire app is email** (via Resend), and it is a
  **no-op when `RESEND_API_KEY` is unset**. Payments (Stripe) are the only other external
  service. Every other `fetch()` in the app calls the app's own `/api` routes.
- Note: the SOS response says *"Admin and emergency contact will be notified,"* but the
  SOS route does not actually send those messages. **This copy is misleading and should be
  corrected** to match real behavior (see §6).

**Bottom line for the owner:** nothing in the app can call the police by accident right
now. This document defines the rules for keeping that guarantee true as real safety
escalation is built.

---

## 2. The non-negotiable safety principle

> The system must NEVER contact police or emergency services automatically, silently, or
> by accident. Any capability that could reach real emergency services is **OFF by
> default**, **fails closed**, and can only operate under explicit, multi-gated opt-in
> after coordinated live testing with the relevant authorities.

Every design decision below serves this principle.

---

## 3. Escalation modes (fail closed, simulate by default)

Escalation behavior is controlled by an explicit mode. The default is the safest.

| Mode | What it does | Reaches authorities? |
| --- | --- | --- |
| `SIMULATE` (default) | Logs what *would* happen; contacts no one externally. | No |
| `SELF_RUN` | Notifies your own admins/ops + the worker's personal emergency contact (email/SMS). | No |
| `PARTNER` | Hands the incident to a safety provider (e.g. Nightlight) via an adapter. | Only if that partner + config explicitly allow it |
| — | — | — |
| `LIVE_DISPATCH` capability | A **separate** flag layered on top of a mode, permitting contact with emergency services. | Yes — only when every gate is satisfied |

Rules:

- If configuration is missing, invalid, or ambiguous, the system resolves to **`SIMULATE`**.
- `LIVE_DISPATCH` is a distinct capability flag (`false` by default). A mode alone can
  never reach emergency services; live dispatch requires the capability **and** all gates
  in §4 to be simultaneously true.
- Non-production environments (test/CI/dev/staging) can **never** perform live dispatch,
  regardless of other settings.

---

## 4. Gates that must ALL be true for any real emergency-services contact

Live dispatch is blocked unless every one of these is simultaneously satisfied (any single
failure → no dispatch, log-only):

1. `NODE_ENV === "production"`.
2. Escalation mode is explicitly `SELF_RUN` or `PARTNER` (never `SIMULATE`).
3. `SAFETY_LIVE_DISPATCH_ENABLED === "true"` (explicit env opt-in).
4. A per-environment **"armed" window** is active (a deliberate, time-boxed enable — not a
   permanent on state).
5. The incident meets the defined trigger criteria (severity + confirmed, not a single
   accidental tap — see §5).
6. A global **kill switch** is not engaged.

Design intent: it should take **deliberate, auditable, multi-step action** to ever arm
real dispatch — and it disarms itself.

---

## 5. Accidental-trigger protections (UX + server)

- SOS requires a **deliberate confirmation** (e.g. press-and-hold or a confirm step), not
  a single tap, and offers a short **cancellation window** before anything escalates.
- The server independently re-checks all §4 gates; the client can never force live
  dispatch on its own.
- Every escalation decision writes an **audit record**: trigger, resolved mode, whether
  live dispatch was permitted, what (if anything) was actually sent, and why. Audit
  logging is mandatory in all modes, including `SIMULATE`.

---

## 6. Provider abstraction — the switchable groundwork (self-run now, partner later)

Build escalation behind a single interface so the trigger is decoupled from the delivery
channel. Switching from your own system to Nightlight (or any partner) becomes a config +
adapter change, with **no edits to the SOS/incident call sites.**

```
  SOS / incident trigger
          │
          ▼
  SafetyEscalationService  ──reads──▶  mode + gates (§3, §4)
          │
          ▼   selects an adapter implementing SafetyEscalationProvider
   ┌──────────────┬──────────────┬─────────────────────┐
   │ Simulate      │ SelfRun       │ Partner (Nightlight) │
   │ (default,     │ (your admins  │ (adapter to partner  │
   │  log only)    │  + contact)   │  API; future)        │
   └──────────────┴──────────────┴─────────────────────┘
```

- Define one interface, e.g. `SafetyEscalationProvider.escalate(incident, context)`.
- Ship `SimulateProvider` (default) and `SelfRunProvider` first; add `NightlightProvider`
  (or whichever partner) when you sign one.
- Call sites (SOS route, incident route) call the **service**, never a specific provider
  or channel. This is the "groundwork so I can switch easily" the owner asked for.

---

## 7. Live-test protocol (required before any authority contact)

No live/authority test may occur without ALL of the following:

1. Owner (Gabe/Skyyplayz) explicit sign-off.
2. **Prior coordination with the specific PSAP / police department through proper
   official channels**, with a scheduled test window agreed in advance.
3. A dedicated test context or clearly-marked test flag; real dispatch armed **only** for
   the agreed window, then disarmed immediately after.
4. An audit trail of the test.

This matches the owner's stated intent: contact authorities via proper channels and
schedule a supervised test time before anything goes live.

---

## 8. Test / CI requirements

- A test asserting that **default configuration resolves to `SIMULATE`** and that no live
  dispatch occurs without every §4 gate.
- A test asserting **non-production environments can never live-dispatch.**
- A "fail-closed" test: if a real provider is wired without the guards, the safety service
  refuses to escalate to authorities.

---

## 9. Acceptance criteria

- Escalation runs through one service + provider interface; adding/swapping a partner
  touches only an adapter + config.
- Default behavior everywhere is `SIMULATE`; nothing external fires without explicit
  configuration.
- Real emergency-services contact requires all §4 gates and is impossible in non-prod.
- Every escalation decision is audit-logged.
- The misleading SOS response copy (§1) is corrected to reflect actual behavior.
