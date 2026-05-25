import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

async function loadEmailModule() {
  const source = await readFile(new URL('../app/lib/email.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjsModule = { exports: {} };
  const sandbox = {
    console,
    module: cjsModule,
    exports: cjsModule.exports,
    process: { env: {} },
    URL,
    require(name) {
      if (name === 'resend') return { Resend: class Resend {} };
      throw new Error(`Unexpected require: ${name}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: 'app/lib/email.ts' });
  return cjsModule.exports;
}

test('email templates HTML-escape user-controlled names, job titles, and incident fields', async () => {
  const {
    emailApplicationSubmitted,
    emailIncidentReported,
    renderEmail,
  } = await loadEmailModule();
  const maliciousName = '<img src=x onerror=alert(1)> Jane & "Boss"';
  const maliciousTitle = '<a href="https://evil.example">Fake CTA</a>';
  const maliciousIncident = '<style>body{display:none}</style><b>hidden</b>';

  const application = emailApplicationSubmitted({
    workerName: maliciousName,
    posterName: maliciousName,
    jobTitle: maliciousTitle,
  });
  const incident = emailIncidentReported({
    reporterName: maliciousName,
    recipientName: maliciousName,
    jobTitle: maliciousTitle,
    severity: 'HIGH',
  });
  const admin = renderEmail('Safety Incident Alert', `Description: ${maliciousIncident}`);

  for (const html of [application.html, incident.html, admin]) {
    assert.equal(html.includes('<img'), false);
    assert.equal(html.includes('<a href="https://evil.example"'), false);
    assert.equal(html.includes('<style>'), false);
  }

  const combined = [application.html, incident.html, admin].join('\n');
  assert.match(combined, /&lt;img/);
  assert.match(combined, /&lt;\/?a/);
  assert.match(combined, /&lt;style&gt;/);
});

test('validateEmailUrl only allows http and https links in email HTML', async () => {
  const { validateEmailUrl } = await loadEmailModule();

  assert.equal(validateEmailUrl('https://questing.example/reset?token=abc'), 'https://questing.example/reset?token=abc');
  assert.throws(() => validateEmailUrl('javascript:alert(1)'), /http or https/);
});
