import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const mobileApps = ['app-client', 'app-partner', 'app-captain', 'app-field'];

test('mobile development data script is syntactically valid and checks all governed surfaces', () => {
  const scriptPath = path.join(repoRoot, 'tools/scripts/mobile-dev-data.mjs');
  const syntax = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

  const source = fs.readFileSync(scriptPath, 'utf8');
  for (const required of [
    '/dsh/home-discovery',
    '/dsh/partner/scopes',
    '/workforce/me',
    'field-local-001',
    'captain-local-001',
    "MODE === 'repair'",
    "process.env.NODE_ENV === 'production'",
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('mobile preflight converges runtime seeds, catalog bootstrap and Workforce profiles', () => {
  const source = read('tools/scripts/ensure-mobile-dev-runtime.ps1');
  assert.match(source, /-Action", "seed"/);
  assert.match(source, /-Action", "bootstrap-dev"/);
  assert.match(source, /mobile-dev-data\.mjs/);
  assert.match(source, /--repair/);
  assert.match(source, /--check/);
  assert.match(source, /BthwaniMobileDevRuntimeBootstrap/);
});

test('every mobile launcher executes the shared preflight before Metro', () => {
  for (const app of mobileApps) {
    const source = read(`apps/${app}/runtime/start.ps1`);
    const preflightIndex = source.indexOf('ensure-mobile-dev-runtime.ps1');
    const runnerIndex = source.indexOf('start-mobile-runtime.ps1');
    assert.ok(preflightIndex >= 0, `${app} is missing the mobile data preflight`);
    assert.ok(runnerIndex > preflightIndex, `${app} must run preflight before the Metro runner`);
  }
});

test('Sentry root instrumentation is conditional on successful initialization', () => {
  for (const app of mobileApps) {
    const indexSource = read(`apps/${app}/runtime/src/index.ts`);
    const sentrySource = read(`apps/${app}/runtime/src/observability/sentry.ts`);
    assert.match(indexSource, /const sentryEnabled = initSentry\(\);/);
    assert.match(indexSource, /registerRootComponent\(sentryEnabled \? Sentry\.wrap\(Root\) : Root\);/);
    assert.match(sentrySource, /export function initSentry\(\): boolean/);
    assert.match(sentrySource, /return false;/);
    assert.match(sentrySource, /return true;/);
  }
});
