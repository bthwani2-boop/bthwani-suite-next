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

test('mobile development data has one canonical implementation and checks all governed surfaces', () => {
  const compatibilityPath = path.join(repoRoot, 'tools/scripts/mobile-dev-data.mjs');
  const canonicalPath = path.join(repoRoot, 'tools/mobile/mobile-dev-data.mjs');
  for (const scriptPath of [compatibilityPath, canonicalPath]) {
    const syntax = spawnSync(process.execPath, ['--check', scriptPath], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);
  }

  const compatibility = fs.readFileSync(compatibilityPath, 'utf8');
  const canonical = fs.readFileSync(canonicalPath, 'utf8');
  assert.equal(compatibility.trim(), 'import "../mobile/mobile-dev-data.mjs";');
  assert.equal(compatibility.split(/\r?\n/).filter(Boolean).length, 1);

  for (const required of [
    '/dsh/home-discovery',
    '/dsh/partner/scopes',
    '/workforce/me',
    'LOCAL_ACTORS',
    "for (const role of ['field', 'captain'])",
    "MODE === 'repair'",
    "process.env.NODE_ENV === 'production'",
  ]) {
    assert.match(canonical, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(canonical, /field-local-001|captain-local-001/);
});

test('mobile preflight delegates lifecycle to runtime and repair logic to the canonical data implementation', () => {
  const compatibility = read('tools/scripts/ensure-mobile-dev-runtime.ps1');
  const canonical = read('tools/mobile/ensure-mobile-dev-runtime.ps1');
  const phaseAdapter = read('tools/mobile/invoke-runtime-phase.ps1');
  const runtimeAuthority = read('infra/docker/scripts/runtime.ps1');

  assert.match(compatibility, /\.\.\\mobile\\ensure-mobile-dev-runtime\.ps1/);
  for (const marker of [
    '-Action", "up"',
    '-Action", "bootstrap-dev"',
    'mobile-dev-data.mjs',
    '--check',
    'BthwaniMobileDevRuntimeBootstrap',
    'Ensure-BthwaniMobileBackend',
  ]) {
    assert.ok(canonical.includes(marker), `missing canonical mobile preflight marker: ${marker}`);
  }

  assert.doesNotMatch(canonical, /converge-local-runtime-database\.ps1/);
  assert.doesNotMatch(canonical, /repair-wlt-migration-ledger\.ps1/);
  assert.doesNotMatch(canonical, /-Action", "seed"/);
  assert.match(canonical, /--repair/);

  assert.match(phaseAdapter, /tools\/scripts\/invoke-runtime-phase\.ps1|tools\\scripts\\invoke-runtime-phase\.ps1/);
  assert.match(phaseAdapter, /No automatic database or ledger repair was attempted/);
  assert.match(runtimeAuthority, /"bootstrap-dev"/);
  assert.match(runtimeAuthority, /Invoke-GovernedMigrations/);
  assert.match(runtimeAuthority, /Invoke-GovernedSeeds/);
  assert.match(runtimeAuthority, /tools\/scripts\/mobile-dev-data\.mjs --repair/);
});

test('every mobile launcher reaches the shared preflight before Metro', () => {
  const shared = read('tools/mobile/mobile.ps1');
  const preflightIndex = shared.indexOf('$EnsureRuntimeScript');
  const runnerIndex = shared.indexOf('$RuntimeScript');
  const preflightCallIndex = shared.indexOf('& $EnsureRuntimeScript');
  const runnerCallIndex = shared.indexOf('& $RuntimeScript');
  assert.ok(preflightIndex >= 0 && runnerIndex >= 0);
  assert.ok(preflightCallIndex > preflightIndex);
  assert.ok(runnerCallIndex > preflightCallIndex);

  for (const app of mobileApps) {
    const start = read(`apps/${app}/runtime/start.ps1`);
    const appWrapper = read(`apps/${app}/runtime/mobile.ps1`);
    assert.match(start, /mobile\.ps1/);
    assert.match(appWrapper, /tools\\mobile\\mobile\.ps1/);
    assert.match(appWrapper, new RegExp(`-App\\s+'${app}'`));
  }
});

test('Android development client launch is owned only by the ADB transport', () => {
  const compatibility = read('tools/scripts/start-mobile-runtime.ps1');
  const source = read('tools/mobile/start-mobile-runtime.ps1');
  assert.match(compatibility, /\.\.\\mobile\\start-mobile-runtime\.ps1/);

  const argumentsStart = source.indexOf('$expoArguments = @(');
  const argumentsEnd = source.indexOf('$androidLaunchJob = $null', argumentsStart);
  assert.ok(argumentsStart >= 0 && argumentsEnd > argumentsStart, 'Expo argument array is missing');
  const expoArguments = source.slice(argumentsStart, argumentsEnd);
  assert.doesNotMatch(expoArguments, /--android/);
  assert.match(expoArguments, /\$expoHostFlag/);

  const launchStart = source.indexOf('$androidLaunchJob = $null');
  const launchEnd = source.indexOf('$adbWatchdog = $null', launchStart);
  assert.ok(launchStart >= 0 && launchEnd > launchStart, 'ADB launch block is missing');
  const launchBlock = source.slice(launchStart, launchEnd);
  assert.match(launchBlock, /if \(\$resolvedTransport -eq "adb"\)/);
  assert.match(launchBlock, /shell am start -W/);
  assert.match(launchBlock, /Metro port \$LaunchPort did not become ready for Android launch/);
});

test('Sentry root instrumentation is conditional on successful initialization', () => {
  for (const app of mobileApps) {
    const indexSource = read(`apps/${app}/runtime/src/index.ts`);
    const layoutSource = read(`apps/${app}/runtime/app/_layout.tsx`);
    const sentrySource = read(`apps/${app}/runtime/src/observability/sentry.ts`);
    assert.match(indexSource, /const sentryEnabled = initSentry\(\);/);
    assert.match(layoutSource, /export default sentryEnabled \? Sentry\.wrap\(RootLayout\) : RootLayout;/);
    assert.match(sentrySource, /export function initSentry\(\): boolean/);
    assert.match(sentrySource, /return false;/);
    assert.match(sentrySource, /return true;/);
  }
});

test('mobile development runtime has no parallel or shadow authority outside the canonical control plane', () => {
  // Canonical Runtime Execution Path:
  //   infra/docker/scripts/runtime.ps1                  (sole lifecycle owner: up/down/reset/bootstrap-dev/migrate/seed/smoke)
  //   tools/scripts/invoke-runtime-phase.ps1            (sole phase serialization + prepared-runtime marker)
  //   tools/mobile/invoke-runtime-phase.ps1             (thin adapter)
  //   tools/mobile/ensure-mobile-dev-runtime.ps1       (sole mobile preflight, delegates to invoke-runtime-phase + mobile-dev-data)
  //   tools/mobile/mobile-dev-data.mjs                 (sole convergence of client/partner/field/captain surfaces)
  //   tools/scripts/mobile-dev-data.mjs                (thin compat shim, one-line re-export)
  //   tools/scripts/ensure-mobile-dev-runtime.ps1       (thin compat shim, one-line forwarder)
  //   tools/scripts/start-mobile-runtime.ps1            (thin compat shim, one-line forwarder)
  //
  // No script outside this set may define bootstrap, health/recovery, data convergence, or
  // mutation semantics independently. Parallel or shadow repair authority is forbidden.
  const toolsScriptsDir = path.join(repoRoot, 'tools', 'scripts');
  const forbiddenParallelScripts = [
    'repair-mobile-dev-runtime.ps1',
    'repair-local-mobile-runtime.ps1',
    'bootstrap-dev-data.mjs',
  ];
  for (const relativeName of forbiddenParallelScripts) {
    const absolutePath = path.join(toolsScriptsDir, relativeName);
    assert.equal(
      fs.existsSync(absolutePath),
      false,
      `Parallel or shadow mobile runtime authority must not exist: ${relativeName}. ` +
        `The canonical path is infra/docker/scripts/runtime.ps1 (-Action bootstrap-dev) ` +
        `plus tools/mobile/mobile-dev-data.mjs (--repair).`,
    );
  }

  const packageJson = JSON.parse(read('package.json'));
  const scripts = packageJson.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(
      String(command),
      /repair-mobile-dev-runtime|repair-local-mobile-runtime|bootstrap-dev-data/,
      `package.json script '${name}' references deleted parallel mobile runtime authority. ` +
        `Route it through the canonical runtime:full:bootstrap-dev / runtime:full:smoke commands.`,
    );
  }

  // The canonical data convergence is the one and only data owner for mobile surfaces.
  const runtimeAuthority = read('infra/docker/scripts/runtime.ps1');
  assert.match(
    runtimeAuthority,
    /tools\/scripts\/mobile-dev-data\.mjs --repair/,
    'Canonical runtime must invoke the sole mobile data convergence during bootstrap-dev.',
  );
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
