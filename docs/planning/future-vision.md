# Questing Future Vision (not yet scoped)

Owner: Gabe (Skyyplayz)
Created: 2026-07-16
Status: Captured ideas only. **Not committed, not scheduled, not in the current roadmap.**
This file exists so long-term direction isn't lost while the team stabilizes Beta/v1.

## Embedded payments — "Quest Wallet" + same-day pay

**The idea (owner):** Build Cash App–style money features directly into Questing — an
in-app balance/wallet, a linked bank account, and debit cards — so payments happen fully
in the app. The headline feature: **finish a quest, clock out, and get paid within
minutes** instead of waiting days.

**How this actually works in the real world (grounding notes):**

- We would **not** become a bank. Products like this are built on a **Banking-as-a-Service
  (BaaS) partner** that provides the regulated accounts, cards, and money movement (e.g.
  Stripe Treasury/Issuing, or a BaaS provider such as Unit). Questing builds the
  experience on top; the partner holds the license.
- **Same-day / instant pay is reachable much earlier** and independently of the full
  wallet: **Stripe Connect instant payouts** can push a worker's earnings to their debit
  card shortly after a quest completes. This is the pragmatic first step toward the vision
  and could slot into v2 without the full neobank build.
- The **full wallet + issued cards + stored balance** is a large, separate product with
  real compliance weight: KYC/identity verification, money-transmission considerations,
  fraud/risk, dispute handling, and support operations. It belongs **after** the core
  marketplace has real usage and revenue — likely post-Full-Release.

**Suggested staging when this becomes real:**

1. Instant payouts on top of existing Stripe (fastest path to "paid in minutes").
2. Stored in-app balance / wallet via a BaaS partner.
3. Issued debit cards + linked external bank accounts.

**Open questions for when this is picked up:** BaaS/partner choice, licensing model,
which US states/countries at launch, KYC provider, and how wallet balance interacts with
the existing escrow (hold/release) flow.

## Other long-term ideas (placeholder)

Add future, not-yet-scoped ideas here as they come up so they aren't lost — e.g.
routines/recurring quests, advanced notifications, and any Mac-specific packaging
decisions referenced in the 2026-06-07 roadmap's v2 section.
