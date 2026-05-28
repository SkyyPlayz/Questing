# Questing Planning Roadmap for Owner Review

Source issue: WEI-2141
Planning target date: 2026-06-07
Prepared branch intent: plans-up / owner-review branch; do not purge after review.

Repo: SkyyPlayz/Questing

**Owner: Gabe (Skyyplayz), not Peter. All references to the owner should be to Gabe/Skyyplayz.**

## Decision gate

This document is a planning branch for review by the project owner before a large GitHub issue rollout.

Requested owner action:
1. Review this planning document and comment on the pull request.
2. Confirm whether the backend/code-quality company should turn the plan below into GitHub issues and a GitHub Project board.
3. If approved, merge the planning branch into `main`.
4. After merge, create parent issues, child issues, links, and project fields from the approved plan.

Do not delete this branch just because the plan is pending. It is the review artifact.

## Omi conversation inputs from 2026-05-22


### Platform and Launch Intent

**Questing is intended as a mobile app for iOS and Android, with a web version for PC users or those who do not wish to download the app. All planning, requirements, and QA must reflect this cross-platform mobile-first approach.**

### Full app review / baseline launch


Relevant notes:
- Run a quick full app review with a baseline launch first.
- The app launch location should be clear so reviewers know exactly where to find it (on iOS/Android and web).
- Routines should have a clear place in the product/navigation.
- A recurring process was discussed to run every hour.
- A new branch was requested specifically for this work.
- The launch had some issues and needs follow-up.


Planning interpretation:
- Before broad feature work, establish a reproducible baseline launch checklist for all platforms (iOS, Android, web).
- Treat launch/routing confusion as a first-class planning item.
- Create QA issues that document the exact route, command, environment, and observed failures.

### Mac/front-end/company website bug-fix planning


Relevant notes:
- Questing is being used as a bug-hunt / troubleshooting project.
- The work is to help the team, but Gabe/Skyyplayz is the product owner. All owner review and product decisions are by Gabe/Skyyplayz.
- Current code may run on Linux, but Mac support matters; a Mac-specific version may be needed.
- Detailed requirements should live in GitHub planning documentation before coding.
- There are roughly 14 initial issues, but the plan should leave surplus work for the team.
- Goal: close one issue at a time, while creating enough structured work for the owner/company to review.


Planning interpretation:
- Existing security/bug issues #1-#14 are the immediate Beta stabilization pool.
- The backend/code-quality company should not unilaterally define product feel; owner review is required. All owner review is by Gabe/Skyyplayz.
- Planning should separate backend/security/code-quality work from product/feel/UX decisions.

### Front-end agent setup / file-location notes

Relevant notes:
- Agents on the front end are important.
- Proper file locations differ between backend Mac work and front-end work.
- iCloud / documentation paths and Windows-vs-Mac path differences were mentioned.
- Token/password handling must be careful; do not embed secrets in docs or code.
- Paperclip command-line setup should be investigated later.

Planning interpretation:
- Add issues for path portability, documentation paths, secret handling, and front-end agent setup.
- Keep environment-specific paths configurable and documented.
- Never commit real passwords, API keys, or tokens.

## Ownership model


Backend/code-quality company focus:
- Security, privacy, data access control, validation, tests, build reliability, CI, GitHub issue structure, and project hygiene.
- Produce concrete bug reports and implementation issues with acceptance criteria.
- Review diffs, require tests, and maintain branch hygiene.
- **All branches must pass all 3 CI tests before merging. This is required everywhere it is relevant.**

Owner/front-end/product focus:
- Product feel, final workflow decisions, copy, launch positioning, UX priorities, and Mac-specific product direction.
- Approve the issue rollout before the 60+ issue plan is created.


Shared rule:
- Work as a team. The backend/code-quality company can propose structure and safe implementation paths, but owner approval is required for product-direction commitments. All owner approvals are by Gabe/Skyyplayz.

## GitHub Project structure

Create one GitHub Project after owner approval.

Project name:
Questing Roadmap: Beta to Full release

Suggested project fields:
- Stage: Beta, Version 1, Version 2, Full release
- Phase Group: Stabilization, Security, Product, Platform, Operations, Growth
- Workstream: Backend, Frontend, Security, QA, Docs, DevOps, Product
- Priority: P0, P1, P2, P3
- Owner: Backend/code-quality company, Peter/Sky/product company, Shared
- Status: Backlog, Ready, In Progress, In Review, Blocked, Done
- Target milestone: 2026-06-07 initial plan, Beta, v1, v2, Full release
- Dependency: Parent issue / blocked-by issue

## Stage plan

### Stage A: Beta stabilization


Goal:
Make the current app safe enough to test and demo on iOS, Android, Mac, Linux, and web without obvious data leaks, auth gaps, or broken launch paths.


Exit criteria:
- Existing critical bug/security issues #1-#14 are triaged, linked to parent issues, and prioritized.
- Baseline launch can be reproduced on iOS, Android, Mac, Linux, and web.
- Missing environment variables fail gracefully or are documented.
- Authentication and authorization bugs have tests.
- Public APIs do not leak private job/user data.

### Stage B: Version 1


Goal:
Deliver the first owner-approved usable product shape with core jobs, onboarding, profile, payments, safety, and admin workflows, available as a mobile app (iOS/Android) and web version.

Exit criteria:
- User roles and permissions are explicit.
- Job lifecycle is tested end-to-end.
- Payment/dispute behavior is safe and auditable.
- Safety incident and emergency-contact flows are privacy reviewed.
- Mac support/documentation is good enough for owner/company use.

### Stage C: Version 2


Goal:
Improve UX, automation, agent-assisted intake, routines, notifications, and operational tooling for mobile and web users.

Exit criteria:
- Hourly/recurring intake process is reliable and observable.
- Admin dashboard clearly shows intake candidates, incidents, disputes, users, and config.
- Mac-specific packaging or setup decisions are made.
- Owner-approved UX/product feel improvements are implemented.

### Stage D: Full release


Goal:
Prepare the app for broader public use with security hardening, monitoring, accessibility, compliance, and release operations, ensuring mobile and web readiness.

Exit criteria:
- Security review complete.
- Accessibility pass complete.
- Data retention/privacy policy decisions documented.
- CI/CD, backups, rollback, monitoring, and support workflow are documented.
- Full release checklist accepted by owner.

## Parent issue groups and child issue seeds

The following is the proposed issue rollout. Parent issues should be created first. Child issues should link to their parent and be assigned to the correct stage/project fields.

### Parent 1: Beta launch baseline and environment clarity

1. Document baseline local launch command for Mac.
2. Document baseline local launch command for Linux.
3. Add `.env.example` covering required non-secret variables.
4. Add startup failure guide for missing env vars.
5. Verify app route map and identify the canonical launch URL.
6. Add a smoke test for the home page and core routes.
7. Document how to reset local development data safely.
8. Add troubleshooting notes for Next.js version-specific behavior.

### Parent 2: Authentication and account safety

9. Fix verification/reset email token body bug (existing #1).
10. Prevent banned/suspended/pending/unverified users from credential auth (existing #3).
11. Add auth regression tests for invalid states.
12. Review session contents for unnecessary private fields.
13. Add rate-limit plan for login, reset, and verification endpoints.
14. Add owner decision issue for supported auth providers.
15. Document password/token storage rules: never commit secrets.

### Parent 3: Public API privacy and authorization

16. Fix public job detail API data exposure (existing #2).
17. Fix check-in/location-history authorization leak (existing #4).
18. Fix unrelated user safety incident reporting (existing #10).
19. Add authorization matrix for poster, worker, admin, anonymous.
20. Add tests for every job detail API role.
21. Add tests for every chat/check-in/incident role.
22. Review all API route handlers for missing session checks.
23. Document privacy-sensitive fields that must never be public.

### Parent 4: Job lifecycle validation and status correctness

24. Fix invalid job status query crashes (existing #14).
25. Fix active jobs page including completed/cancelled jobs (existing #12).
26. Fix job create/update invalid pay/date/coordinate acceptance (existing #7).
27. Add central job status enum validation.
28. Add lifecycle transition rules for created, active, completed, cancelled, disputed.
29. Add end-to-end test plan for posting, applying, accepting, checking in, completing.
30. Add UI empty/error states for invalid filters.
31. Add timezone/date handling review for job scheduling.

### Parent 5: Payments, disputes, and background checks

32. Fix Stripe webhook marking background checks as passed immediately (existing #6).
33. Fix poster-favor dispute resolution releasing held payment (existing #11).
34. Fix build failure when Stripe env vars are absent (existing #9).
35. Add payment state machine documentation.
36. Add tests for checkout creation without live Stripe secrets.
37. Add tests for dispute resolution branches.
38. Add manual QA checklist for payments in test mode.
39. Add owner decision issue for fees, refunds, and release policy.

### Parent 6: Security dependency and CI hardening

40. Triage npm audit moderate vulnerabilities (existing #8).
41. Add CI workflow for lint and tests.
42. Add CI workflow for build with safe placeholder env.
43. Add dependency update policy.
44. Add secret scanning/pre-commit guidance.
45. Add security labels and severity definitions.
46. Add code review checklist for auth, payments, and privacy routes.
47. Add branch hygiene reminder issue for agents.

### Parent 7: Admin dashboard and operational visibility

48. Review admin dashboard route authorization.
49. Add dashboard cards for intake runs/candidates/errors.
50. Add dashboard cards for incidents/disputes/users/config.
51. Add audit-log plan for sensitive admin actions.
52. Add issue for surfacing hourly process status.
53. Add owner-facing operations documentation.
54. Add admin UX feedback issue for product owner.

### Parent 8: GitHub intake and recurring routines

55. Review GitHub intake docs and runtime behavior.
56. Validate hourly intake cron endpoint security.
57. Add tests for intake rule classification.
58. Add issue for owner-controlled intake approval before GitHub issue creation.
59. Add issue for mapping intake candidates to project stages.
60. Document how Omi/vault/Paperclip tasks become GitHub issues.
61. Add issue for duplicate-detection safeguards.
62. Add issue for retry/failure reporting.

### Parent 9: Mac support and front-end agent setup

63. Document Mac-specific setup path assumptions.
64. Document Windows/iCloud/documentation path differences.
65. Add issue for configurable front-end documentation path.
66. Add issue for agent setup instructions for front-end vs backend roles.
67. Add issue for Mac browser QA matrix.
68. Add issue for possible Mac-specific packaged version decision.
69. Add issue for local data/storage location review.
70. Add issue for accessibility on Mac/iOS Safari.

### Parent 10: Product feel, UX, and owner decisions

71. Add owner decision issue for core user personas.
72. Add owner decision issue for homepage value proposition.
73. Add owner decision issue for job/routine/navigation structure.
74. Add owner decision issue for onboarding flow copy.
75. Add owner decision issue for safety/emergency UX.
76. Add owner decision issue for maps and location UX.
77. Add owner decision issue for admin terminology.
78. Add owner decision issue for Beta launch scope.

### Parent 11: Version 1 build-out

79. Implement owner-approved onboarding improvements.
80. Implement owner-approved job creation improvements.
81. Implement owner-approved active jobs workflow improvements.
82. Implement owner-approved profile/settings improvements.
83. Implement owner-approved notification strategy.
84. Implement owner-approved admin workflow improvements.
85. Add v1 release notes template.
86. Add v1 acceptance checklist.

### Parent 12: Version 2 and full release readiness

87. Plan routines feature after owner clarifies scope.
88. Plan advanced notifications after v1 scope is stable.
89. Plan monitoring/observability after core workflows stabilize.
90. Plan backup/restore strategy.
91. Plan production deployment runbook.
92. Plan support/escalation process.
93. Plan accessibility audit.
94. Plan security review.
95. Plan full-release go/no-go checklist.


## CI Requirements

**All branches must pass all 3 CI tests before merging. This applies to every relevant workflow, branch, and PR.**

## Existing issue mapping

Known open GitHub bug issues at planning time:
- #1 Verification and password-reset emails send token=*** instead of the generated token.
- #2 Public job detail API exposes applicant emails, applications, check-ins, and incident details without auth.
- #3 Suspended, banned, pending, or unverified users can still authenticate with credentials.
- #4 Any authenticated user can list job check-ins and worker location history for any job id.
- #6 Stripe webhook marks background checks as PASSED immediately after payment.
- #7 Job create/update accepts invalid pay, date, and coordinate values.
- #8 npm audit reports moderate vulnerabilities in Next/PostCSS and Prisma transitive dependencies.
- #9 Build fails when Stripe env vars are absent.
- #10 Unrelated users can report safety incidents on any job.
- #11 Poster-favor dispute resolution captures and releases held payment.
- #12 My Active Jobs page includes completed/cancelled accepted jobs.
- #13 Rating endpoint accepts non-integer or non-numeric scores before Prisma write.
- #14 Invalid job status query values can crash jobs page/API filters.

These should be linked under the Beta stabilization parent groups instead of recreated as duplicates.


## Owner and Approval

**All owner review and approval is by Gabe (Skyyplayz).**

## Approval checklist before issue creation

- [ ] Owner has commented on the PR with approval or requested changes.
- [ ] Planning branch has been merged into `main`.
- [ ] Parent issue naming and labels are approved.
- [ ] GitHub Project fields are approved or adjusted.
- [ ] Existing issues #1-#14 are mapped instead of duplicated.
- [ ] Child issue creation is performed in batches so owner/company can review.
- [ ] The last created planning issue is: "Development plan issue review and updates" for the owner/company.

## Recommended first batch after approval

Create only the first batch immediately after merge:
1. Parent: Beta launch baseline and environment clarity.
2. Parent: Authentication and account safety.
3. Parent: Public API privacy and authorization.
4. Link existing issues #1, #2, #3, #4, #9, #14 to those parents.
5. Create child issues 1-8, 9-15, and 16-23 from this document.
6. Create the final planning-review issue for owner/company feedback before expanding to the remaining groups.

This keeps momentum while avoiding a sudden unreviewed flood of 60+ issues.
