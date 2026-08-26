import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const cspPolicyUrl = new URL("../src/server/csp-policy.ts", import.meta.url).href;
const { buildControlPanelContentSecurityPolicy } = await import(cspPolicyUrl);

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const provisioningPath = "tools/scripts/google-cloud/create-browser-maps-api-key.ps1";
const preflightPath = "apps/control-panel/runtime/assert-google-maps-env.ps1";
const startPath = "apps/control-panel/runtime/start.ps1";
const packagePath = "apps/control-panel/runtime/package.json";
const webConfigPath = "services/dsh/frontend/shared/_kernel/google-maps-web-config.ts";
const canvasPath = "services/dsh/frontend/control-panel/maps/GoogleMapsWebCanvas.tsx";
const manifestPath = "tools/mobile/google-platform.manifest.json";

function assertPowerShellParses(relativePath, t) {
  const probe = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);

  const absolute = path.join(repoRoot, relativePath).replaceAll("'", "''");
  const command = [
    "$tokens = $null",
    "$errors = $null",
    `[System.Management.Automation.Language.Parser]::ParseFile('${absolute}', [ref]$tokens, [ref]$errors) | Out-Null`,
    "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }",
  ].join("; ");
  const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("control-panel development imports and fail-closes on the governed browser Maps key", () => {
  const start = read(startPath);
  const runtimePackage = JSON.parse(read(packagePath));
  const preflight = read(preflightPath);

  assert.match(start, /infra\\local\\control-panel\.google\.env/);
  assert.match(start, /Import-EnvironmentFile -Path \$GoogleEnvironmentPath/);
  assert.match(runtimePackage.scripts.dev, /assert-google-maps-env\.ps1/);
  assert.match(runtimePackage.scripts.dev, /&& next dev --port 13000/);
  assert.match(preflight, /NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY/);
  assert.match(preflight, /\^AIza\[0-9A-Za-z_-\]\{20,\}\$/);
  assert.match(preflight, /Refusing to start the Control Panel/);
  assert.doesNotMatch(preflight, /Write-Host\s+\$key/);
});

test("browser Maps provisioning is idempotent and resilient to gcloud progress output", () => {
  const script = read(provisioningPath);

  assert.match(script, /Normalize-AllowedReferrers/);
  assert.match(script, /-split ','/);
  assert.match(script, /Get-BalancedJsonDocument/);
  assert.match(script, /Get-KeyNamesByDisplayName/);
  assert.match(script, /Multiple API keys use display name/);
  assert.match(script, /services', 'api-keys', 'get-key-string'/);
  assert.match(script, /--format=value\(keyString\)/);
  assert.match(script, /Set-EnvironmentFileValue/);
  assert.match(script, /maps-backend\.googleapis\.com/);
  assert.match(script, /--allowed-referrers/);
});

test("Maps JavaScript loader uses async loading and exposes authentication failures", () => {
  const config = read(webConfigPath);
  const canvas = read(canvasPath);

  assert.match(config, /loading:\s*"async"/);
  assert.match(config, /https:\/\/maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(canvas, /gm_authFailure/);
  assert.match(canvas, /HTTP referrer/);
  assert.match(canvas, /GOOGLE_MAPS_SCRIPT_ID/);
  assert.match(canvas, /document\.getElementById\(GOOGLE_MAPS_SCRIPT_ID\)\?\.remove\(\)/);
  assert.match(canvas, /delete window\.__bthwaniGoogleMapsPromise/);
});

test("control-panel CSP permits the official Maps JavaScript runtime domains", async () => {
  const csp = buildControlPanelContentSecurityPolicy({ nonce: "test-nonce" });

  assert.match(csp, /script-src[^;]*https:\/\/\*\.googleapis\.com/);
  assert.match(csp, /script-src[^;]*https:\/\/\*\.gstatic\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.googleapis\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.gstatic\.com/);
  assert.match(csp, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(csp, /style-src[^;]*'nonce-test-nonce'/);
  assert.match(csp, /frame-src https:\/\/\*\.google\.com/);
});

test("Google platform manifest separates Android Maps from the control-panel browser key", () => {
  const manifest = JSON.parse(read(manifestPath));
  assert.equal(manifest.maps.androidApiService, "maps-android-backend.googleapis.com");
  assert.equal(manifest.maps.controlPanel.apiService, "maps-backend.googleapis.com");
  assert.equal(manifest.maps.controlPanel.environmentVariable, "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY");
  assert.deepEqual(manifest.maps.controlPanel.developmentReferrers, [
    "http://localhost:13000/*",
    "http://127.0.0.1:13000/*",
  ]);
});

test("Google Maps PowerShell scripts parse cleanly", (t) => {
  assertPowerShellParses(provisioningPath, t);
  if (!t.signal?.aborted) assertPowerShellParses(preflightPath, t);
});
