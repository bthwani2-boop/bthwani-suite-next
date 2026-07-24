import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const require = createRequire(import.meta.url);

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

test('Android development client opens once outside Expo stream piping', () => {
  const source = read('tools/scripts/start-mobile-runtime.ps1');
  const argumentsStart = source.indexOf('$ExpoArguments = @(');
  const argumentsEnd = source.indexOf('if ($ShouldClearCache) {', argumentsStart);
  assert.ok(argumentsStart >= 0 && argumentsEnd > argumentsStart, 'Expo argument array is missing');
  const expoArguments = source.slice(argumentsStart, argumentsEnd);
  assert.doesNotMatch(expoArguments, /--android/);
  assert.match(source, /shell am start -W/);
  assert.match(source, /Metro port \$LaunchPort did not become ready for Android launch/);
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

test('Sentry Expo plugin is omitted until the native configuration is complete', () => {
  const environmentNames = [
    'EXPO_PUBLIC_SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
    'EXPO_PUBLIC_SENTRY_DSN_APP_CLIENT',
    'SENTRY_ORG_APP_CLIENT',
    'SENTRY_PROJECT_APP_CLIENT',
  ];
  const previous = Object.fromEntries(environmentNames.map((name) => [name, process.env[name]]));
  const restore = () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };

  try {
    for (const name of environmentNames) delete process.env[name];
    const { defineBthwaniExpoApp } = require(path.join(repoRoot, 'tools/mobile/defineBthwaniExpoApp.js'));

    const unconfigured = defineBthwaniExpoApp('app-client');
    assert.equal(unconfigured.plugins.some((plugin) => plugin === '@sentry/react-native/expo' || plugin?.[0] === '@sentry/react-native/expo'), false);
    assert.equal(unconfigured.extra.sentry.enabled, false);
    assert.equal(unconfigured.extra.sentry.nativeConfigured, false);

    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
    process.env.SENTRY_ORG = 'bthwani';
    process.env.SENTRY_PROJECT = 'app-client';
    const configured = defineBthwaniExpoApp('app-client');
    assert.equal(configured.plugins.some((plugin) => plugin?.[0] === '@sentry/react-native/expo'), true);
    assert.equal(configured.extra.sentry.enabled, true);
    assert.equal(configured.extra.sentry.nativeConfigured, true);
  } finally {
    restore();
  }
});
