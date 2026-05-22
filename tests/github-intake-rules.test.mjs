import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCandidateFingerprint,
  normalizeSeverity,
  redactSensitiveText,
  shouldCreatePublicIssue,
} from '../app/lib/github-intake-rules.mjs';

test('redactSensitiveText removes obvious secrets and emails before storage or GitHub publication', () => {
  const input = 'User jane@example.com saw token=ghp_1234567890abcdef1234567890abcdef1234 and password: hunter2';
  const redacted = redactSensitiveText(input);

  assert.equal(redacted.includes('jane@example.com'), false);
  assert.equal(redacted.includes('ghp_1234567890abcdef'), false);
  assert.equal(redacted.includes('hunter2'), false);
  assert.match(redacted, /\[REDACTED_EMAIL\]/);
  assert.match(redacted, /token=\[REDACTED_SECRET\]/);
  assert.match(redacted, /password: \[REDACTED_SECRET\]/);
});

test('buildCandidateFingerprint is stable for equivalent title/category/location tuples', () => {
  const first = buildCandidateFingerprint({
    title: '  Broken Login Button! ',
    category: 'Bug',
    evidenceUrl: 'https://example.com/path?utm_source=abc#frag',
  });
  const second = buildCandidateFingerprint({
    title: 'broken login button',
    category: 'bug',
    evidenceUrl: 'https://example.com/path',
  });

  assert.equal(first, second);
});

test('normalizeSeverity defaults security findings to private review', () => {
  const result = normalizeSeverity({ severity: 'critical', category: 'security', title: 'Leaked token in logs' });

  assert.equal(result.severity, 'critical');
  assert.equal(result.securitySensitive, true);
  assert.deepEqual(result.labels, ['github-intake', 'security-review', 'severity:critical']);
});

test('shouldCreatePublicIssue blocks unapproved, deferred, rejected, and security-sensitive candidates', () => {
  assert.equal(shouldCreatePublicIssue({ status: 'pending_review', securitySensitive: false }), false);
  assert.equal(shouldCreatePublicIssue({ status: 'rejected', securitySensitive: false }), false);
  assert.equal(shouldCreatePublicIssue({ status: 'deferred', securitySensitive: false }), false);
  assert.equal(shouldCreatePublicIssue({ status: 'approved', securitySensitive: true }), false);
  assert.equal(shouldCreatePublicIssue({ status: 'approved', securitySensitive: false }), true);
});
