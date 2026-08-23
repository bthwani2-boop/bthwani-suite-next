import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const mobileApps = new Map([
  ["app-client", 18101],
  ["app-partner", 18102],
  ["app-captain", 18103],
  ["app-field", 18104],
]);

test("all mobile wrappers stay thin and bind canonical fixed Metro ports", () => {
  const shared = read("tools/mobile/mobile.ps1");
  for (const [appKey, port] of mobileApps) {
    const start = read(`apps/${appKey}/runtime/start.ps1`);
    const appWrapper = read(`apps/${appKey}/runtime/mobile.ps1`);
    assert.match(start, /mobile\.ps1/);
    assert.match(appWrapper, new RegExp(`-App\\s+'${appKey}'`));
    assert.match(shared, new RegExp(`'${appKey}'\\s*=\\s*${port}\\b`));
    assert.doesNotMatch(start, /BTHWANI_MOBILE_TRANSPORT|Resolve-BthwaniAdb|Get-NetRoute|58110/);
    assert.doesNotMatch(appWrapper, /BTHWANI_MOBILE_TRANSPORT|Resolve-BthwaniAdb|Get-NetRoute|58110/);
  }
});

test("mobile runtime defaults to auto, resolves LAN before platform-aware Android fallback, and keeps backend lifecycle outside transport", () => {
  const shared = read("tools/mobile/mobile.ps1");
  const launcher = read("tools/mobile/start-mobile-runtime.ps1");

  assert.match(shared, /ensure-mobile-dev-runtime\.ps1/);
  assert.match(shared, /start-mobile-runtime\.ps1/);
  assert.doesNotMatch(launcher, /Ensure-BthwaniMobileBackend|invoke-runtime-phase\.ps1|runtime:mobile:up|bootstrap-dev/);

  assert.match(launcher, /BTHWANI_MOBILE_TRANSPORT/);
  assert.match(launcher, /if \(-not \$requestedTransport\) \{ \$requestedTransport = "auto" \}/);
  assert.match(launcher, /BTHWANI_MOBILE_PLATFORM/);
  assert.match(launcher, /if \(-not \$requestedPlatform\) \{ \$requestedPlatform = "auto" \}/);
  assert.match(launcher, /BTHWANI_MOBILE_PLATFORM must be one of: auto, android, ios/);
  assert.match(launcher, /iOS does not support the ADB fallback/);
  assert.match(launcher, /Resolve-BthwaniMobileLanContext/);
  assert.match(launcher, /\. \$AdbHelper/);
  assert.ok(
    launcher.indexOf("Resolve-BthwaniMobileLanContext") < launcher.indexOf(". $AdbHelper"),
    "auto must attempt LAN before loading the Android ADB helper",
  );
  assert.match(launcher, /"--lan"/);
  assert.match(launcher, /"--localhost"/);
});

test("LAN runtime branch contains no ADB execution path", () => {
  const launcher = read("tools/mobile/start-mobile-runtime.ps1");
  const start = launcher.indexOf('if ($resolvedTransport -eq "lan") {');
  const end = launcher.indexOf("} else {", start);
  assert.ok(start >= 0 && end > start, "LAN branch must be explicit");
  const lanBranch = launcher.slice(start, end);

  for (const forbidden of [
    "Resolve-BthwaniAdb",
    "Start-BthwaniAdbServer",
    "Get-BthwaniAndroidDevices",
    "Select-BthwaniAndroidDevice",
    "Invoke-BthwaniAdbReverse",
    "adb shell",
    "scrcpy",
  ]) {
    assert.equal(lanBranch.includes(forbidden), false, `LAN branch must not contain ${forbidden}`);
  }

  for (const required of [
    "Ensure-BthwaniMobileDevGateway",
    "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL",
    "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN",
    "EXPO_PUBLIC_DSH_API_BASE_URL",
    "EXPO_PUBLIC_IDENTITY_API_BASE_URL",
    "EXPO_PUBLIC_WORKFORCE_API_BASE_URL",
  ]) {
    assert.equal(lanBranch.includes(required), true, `LAN branch missing ${required}`);
  }
});

test("LAN helper rejects unsafe addressing and owns one versioned singleton gateway", () => {
  const lan = read("tools/mobile/mobile-lan.ps1");
  for (const marker of [
    "BTHWANI_MOBILE_LAN_HOST",
    "BTHWANI_MOBILE_ALLOW_PUBLIC_NETWORK",
    "NetworkCategory",
    "Public",
    "Test-BthwaniPrivateIpv4",
    "Global\\BthwaniMobileDevGateway",
    "mobile-dev-gateway.mjs",
    "bthwani-mobile-dev-gateway-v1.json",
    "Get-CimInstance",
  ]) {
    assert.ok(lan.includes(marker), `missing LAN transport marker: ${marker}`);
  }
  assert.match(lan, /-DestinationPrefix "0\.0\.0\.0\/0"/, "default-route discovery must stay explicit");
  assert.doesNotMatch(lan, /BTHWANI_MOBILE_DEV_GATEWAY_HOST\s*=\s*["']0\.0\.0\.0["']/);
  assert.doesNotMatch(lan, /-LanHost\s+["']0\.0\.0\.0["']/);
  assert.doesNotMatch(lan, /Resolve-BthwaniAdb|adb devices|adb reverse|scrcpy/);
});

test("development gateway is allowlisted and the underlying broker and MinIO stay loopback-only", () => {
  const gateway = read("tools/dev/mobile-dev-gateway.mjs");
  const broker = read("tools/dev/local-dev-session-broker.mjs");
  const compose = read("infra/docker/compose.runtime.yml");

  for (const marker of [
    "'/dsh/'",
    "'/identity/'",
    "'/workforce/'",
    "'/__dev-session'",
    "'/__media'",
    "MOBILE_DEV_GATEWAY_MEDIA_SIGNATURE_REQUIRED",
    "x-bthwani-dev-capability",
    "127.0.0.1",
    "59000",
  ]) {
    assert.ok(gateway.includes(marker), `missing gateway marker: ${marker}`);
  }
  assert.doesNotMatch(gateway, /0\.0\.0\.0/);
  assert.match(broker, /const HOST = '127\.0\.0\.1'/);
  assert.match(broker, /DEV_SESSION_LOOPBACK_REQUIRED/);
  assert.match(compose, /127\.0\.0\.1:\$\{BTHWANI_DSH_API_HOST_PORT:-58080\}:8080/);
  assert.match(compose, /127\.0\.0\.1:\$\{BTHWANI_MINIO_API_PORT:-59000\}:9000/);
  assert.doesNotMatch(gateway, /58083/);
});

test("developer session and presigned media clients use the governed gateway only when LAN exports it", () => {
  const brokerAdapter = read("services/dsh/frontend/shared/session/dev-session-broker.adapter.ts");
  const gatewayClient = read("services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts");
  const upload = read("services/dsh/frontend/shared/media/presigned-upload.client.ts");
  const partnerUpload = read("services/dsh/frontend/shared/catalog/catalog-binary-upload.adapter.ts");

  assert.match(brokerAdapter, /resolveMobileDevGatewayBaseUrl/);
  assert.match(brokerAdapter, /X-Bthwani-Dev-Capability/);
  assert.match(gatewayClient, /MOBILE_DEV_GATEWAY_CAPABILITY_MISSING/);
  assert.match(gatewayClient, /__media/);
  assert.match(upload, /rewriteMobileDevPresignedMediaUrl/);
  assert.match(partnerUpload, /rewriteMobileDevPresignedMediaUrl/);
});

test("ADB remains an explicit Android fallback with verified reverse mappings and preserves explicit device selection", () => {
  const helper = read("tools/mobile/mobile-adb.ps1");
  const launcher = read("tools/mobile/start-mobile-runtime.ps1");
  for (const marker of [
    "BTHWANI_ANDROID_TRANSPORT",
    "Assert-BthwaniAdbReverse",
    "Get-BthwaniAdbReverseMappings",
    "reverse --list",
    "When both transports expose the same phone, USB is the stable default.",
  ]) {
    assert.ok(helper.includes(marker), `missing ADB helper contract marker: ${marker}`);
  }
  assert.match(launcher, /Invoke-BthwaniAdbReverse/);
  assert.match(launcher, /58080, 18082, 58086, 58100, 59000, \$MetroPort/);
  assert.match(launcher, /Clear-BthwaniProcessEnvironment -Names @\("ANDROID_SERIAL", "BTHWANI_ANDROID_SERIAL", "ADB"\)/);
  assert.ok(
    launcher.indexOf('Clear-BthwaniProcessEnvironment -Names @("ANDROID_SERIAL", "BTHWANI_ANDROID_SERIAL", "ADB")')
      > launcher.indexOf('if ($resolvedTransport -eq "lan") {'),
    "ADB selection environment may only be cleared inside the LAN branch",
  );
  assert.match(launcher, /\$currentNodeOptions/);
  assert.doesNotMatch(launcher, /\$env:NODE_OPTIONS\s*=\s*"--dns-result-order=ipv4first"/);
  assert.doesNotMatch(launcher, /&\s+\$WatchAdb[\s\S]{0,120}\bdisconnect\s+\$WatchSerial/);
  assert.doesNotMatch(launcher, /&\s+\$WatchAdb[\s\S]{0,120}\bconnect\s+\$WatchSerial/);
});

test("runtime contract executes Expo through the governed pnpm CLI without shell parsing", () => {
  const contract = read("tools/mobile/test-mobile-runtime-contract.mjs");
  assert.match(contract, /process\.env\.npm_execpath/);
  assert.match(contract, /spawnSync\(\s*process\.execPath/);
  assert.doesNotMatch(contract, /shell\s*:/);
  assert.doesNotMatch(contract, /pnpm\.cmd/);
});

test("app env examples cannot reintroduce active direct LAN backend configuration", () => {
  for (const appKey of mobileApps.keys()) {
    const envExample = read(`apps/${appKey}/runtime/.env.example`);
    assert.doesNotMatch(envExample, /<MACHINE_LAN_IP>/);
    assert.doesNotMatch(envExample, /^MACHINE_LAN_IP\s*=/m);
    assert.doesNotMatch(envExample, /^EXPO_PUBLIC_(?:DSH|IDENTITY|WORKFORCE)_API_BASE_URL\s*=/m);
    assert.match(envExample, /BThwani Mobile Dev Gateway/);
  }
  const mobileEnv = read("infra/local/mobile.env.example");
  assert.match(mobileEnv, /^BTHWANI_MOBILE_TRANSPORT=auto$/m);
  assert.match(mobileEnv, /^BTHWANI_MOBILE_PLATFORM=auto$/m);
  assert.match(mobileEnv, /^BTHWANI_MOBILE_LAN_HOST=$/m);
});

test("PowerShell parses every governed mobile launcher and transport verifier", (t) => {
  const probe = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);

  const scripts = [
    "tools/scripts/mobile-adb.ps1",
    "tools/scripts/start-mobile-runtime.ps1",
    "tools/scripts/start-mobile-validation.ps1",
    "tools/scripts/verify-mobile-test-stack.ps1",
    "tools/scripts/verify-mobile-node-closure.ps1",
    "tools/scripts/verify-mobile-runtime-closure.ps1",
    "tools/scripts/verify-mobile-android-smoke.ps1",
    "tools/scripts/verify-mobile-lan-runtime.ps1",
    "tools/mobile/mobile-adb.ps1",
    "tools/mobile/mobile-lan.ps1",
    "tools/mobile/start-mobile-runtime.ps1",
    "tools/mobile/mobile.ps1",
    "tools/mobile/reverse-all.ps1",
    "tools/mobile/reverse-all.ps1",
    ...[...mobileApps.keys()].flatMap((appKey) => [
      `apps/${appKey}/runtime/start.ps1`,
      `apps/${appKey}/runtime/mobile.ps1`,
    ]),
  ];

  for (const relativePath of scripts) {
    const absolutePath = path.join(repoRoot, relativePath);
    const quotedPath = absolutePath.replaceAll("'", "''");
    const command = [
      "$tokens = $null",
      "$errors = $null",
      `[System.Management.Automation.Language.Parser]::ParseFile('${quotedPath}', [ref]$tokens, [ref]$errors) | Out-Null`,
      "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }",
    ].join("; ");
    const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", command], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 0, `${relativePath}\n${result.stderr || result.stdout}`);
  }
});
