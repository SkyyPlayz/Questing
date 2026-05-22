import crypto from 'node:crypto';

const DEFAULT_LABEL = 'github-intake';
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const SECURITY_WORDS = /\b(security|secret|token|password|credential|auth|xss|csrf|injection|rce|private key|api key|leak)\b/i;

export function redactSensitiveText(value = '') {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:ghp|github_pat|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_SECRET]')
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g, '[REDACTED_SECRET]')
    .replace(/\b(?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*([^\s,;]+)/gi, (match) => {
      const separator = match.includes('=') ? '=' : ':';
      const key = match.slice(0, match.indexOf(separator)).trim();
      return `${key}${separator === '=' ? '=' : ': '}[REDACTED_SECRET]`;
    });
}

export function canonicalEvidenceUrl(value = '') {
  if (!value) return '';
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value).trim().toLowerCase();
  }
}

export function normalizeText(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:/?&.=# -]+/g, '')
    .replace(/\s+/g, ' ');
}

export function buildCandidateFingerprint(candidate = {}) {
  const parts = [
    normalizeText(candidate.category || 'general'),
    normalizeText(candidate.title || ''),
    canonicalEvidenceUrl(candidate.evidenceUrl || candidate.location || ''),
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

export function normalizeSeverity(candidate = {}) {
  const requested = normalizeText(candidate.severity || 'medium');
  const severity = SEVERITIES.has(requested) ? requested : 'medium';
  const haystack = [candidate.category, candidate.title, candidate.description, candidate.evidence].filter(Boolean).join(' ');
  const securitySensitive = Boolean(candidate.securitySensitive) || SECURITY_WORDS.test(haystack);
  const labels = [DEFAULT_LABEL];
  labels.push(securitySensitive ? 'security-review' : `severity:${severity}`);
  if (securitySensitive) labels.push(`severity:${severity}`);
  return { severity, securitySensitive, labels };
}

export function shouldCreatePublicIssue(candidate = {}) {
  return candidate.status === 'approved' && !candidate.securitySensitive;
}

export function sanitizeCandidateInput(input = {}) {
  const normalized = normalizeSeverity(input);
  return {
    title: redactSensitiveText(input.title || '').trim(),
    description: redactSensitiveText(input.description || '').trim(),
    evidence: redactSensitiveText(input.evidence || '').trim(),
    evidenceUrl: canonicalEvidenceUrl(input.evidenceUrl || ''),
    category: normalizeText(input.category || 'general'),
    severity: normalized.severity,
    labels: normalized.labels,
    securitySensitive: normalized.securitySensitive,
  };
}

export function renderGitHubIssueBody(candidate) {
  const safeDescription = redactSensitiveText(candidate.description || 'No description provided.');
  const safeEvidence = redactSensitiveText(candidate.evidence || 'No evidence details provided.');
  const lines = [
    '## Summary',
    safeDescription,
    '',
    '## Evidence',
    safeEvidence,
  ];
  if (candidate.evidenceUrl) {
    lines.push('', '## Evidence URL', canonicalEvidenceUrl(candidate.evidenceUrl));
  }
  lines.push('', '## Acceptance Criteria', '- Finding is reproduced or explicitly invalidated.', '- Fix includes regression coverage where practical.');
  return lines.join('\n');
}
