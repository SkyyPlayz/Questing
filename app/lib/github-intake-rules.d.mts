export function redactSensitiveText(value?: string): string;
export function canonicalEvidenceUrl(value?: string): string;
export function normalizeText(value?: string): string;
export function buildCandidateFingerprint(candidate?: Record<string, unknown>): string;
export function normalizeSeverity(candidate?: Record<string, unknown>): { severity: string; securitySensitive: boolean; labels: string[] };
export function shouldCreatePublicIssue(candidate?: Record<string, unknown>): boolean;
export function sanitizeCandidateInput(input?: Record<string, unknown>): {
  title: string;
  description: string;
  evidence: string;
  evidenceUrl: string;
  category: string;
  severity: string;
  labels: string[];
  securitySensitive: boolean;
};
export function renderGitHubIssueBody(candidate: Record<string, unknown>): string;
