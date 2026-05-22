# GitHub Issue Intake Backend

Backend endpoints for the admin-reviewed daily GitHub issue intake flow.

Environment variables:

- `GITHUB_INTAKE_CRON_SECRET`: shared secret required by `POST /api/github-intake/cron` using the `x-github-intake-secret` header or `?secret=` query.
- `GITHUB_INTAKE_REPO`: GitHub repo in `owner/name` form. Required only for open-issue dedupe and final issue creation.
- `GITHUB_INTAKE_TOKEN`: least-privilege GitHub token. Required only for open-issue dedupe and final issue creation; never sent to client code.

Admin APIs:

- `GET /api/admin/github-intake/runs`: list recent intake runs with candidates.
- `POST /api/admin/github-intake/runs`: create a manual dry run. Body: `{ "findings": [...] }`.
- `GET /api/admin/github-intake/candidates?status=pending_review`: list review candidates.
- `PATCH /api/admin/github-intake/candidates/:id`: review a candidate. Body: `{ "action": "approve" | "reject" | "defer", "reviewNote": "optional" }`.
- `POST /api/admin/github-intake/candidates/:id/github`: create a public GitHub issue. The candidate must be approved and not security-sensitive.

Cron API:

- `POST /api/github-intake/cron`: secret-guarded scheduled run endpoint. Body accepts `{ "findings": [...] }` and always stores review candidates without creating public GitHub issues.

Finding shape:

```json
{
  "title": "Short issue title",
  "description": "What is wrong and why it matters",
  "evidence": "Observed reproduction details, logs, screenshots, or file paths",
  "evidenceUrl": "https://optional-evidence-url",
  "category": "bug|ux|security|performance|general",
  "severity": "low|medium|high|critical"
}
```

Rules enforced by the backend:

- Evidence is required (`evidence` or `evidenceUrl`) before a candidate is persisted.
- A run stores at most 15 candidates.
- Candidate text is redacted before persistence and before public GitHub issue bodies.
- Fingerprint dedupe prevents repeated candidates; matching open GitHub issue titles are skipped when GitHub env vars are configured.
- Security-sensitive findings are labeled `security-review` and cannot be filed publicly through the public issue endpoint.
- Public GitHub issue creation only happens after an admin approval action and a separate filing call.
