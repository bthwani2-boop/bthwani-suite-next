import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const startScriptPath = path.join(repoRoot, "apps/control-panel/runtime/start.ps1");
const startScript = fs.readFileSync(startScriptPath, "utf8");
const runtimeBootstrapPath = path.join(repoRoot, "apps/control-panel/ensure-control-panel-dev-runtime.ps1");
const runtimeBootstrap = fs.readFileSync(runtimeBootstrapPath, "utf8");

test("control-panel startup converges the declared backend bundle before Next.js", () => {
  assert.match(startScript, /ensure-control-panel-dev-runtime\.ps1/);
  assert.match(startScript, /Control Panel runtime bootstrap failed/);
  for (const marker of [
    "runtime-readiness.contract.json",
    "bundles.controlPanelDevelopment",
    "check-frontend-binding-readiness.mjs",
    "invoke-runtime-phase.ps1",
    "BTHWANI_AUTO_START_BACKEND",
    "BthwaniControlPanelDevRuntimeBootstrap",
  ]) {
    assert.match(runtimeBootstrap, new RegExp(marker.replaceAll(".", "\\.")));
  }
  assert.match(runtimeBootstrap, /-Action\", \"up\"/);
  assert.match(runtimeBootstrap, /-Profiles\", \$Profiles/);
  assert.doesNotMatch(runtimeBootstrap, /-Action\", \"reset\"/);
});

test("control-panel startup forces all browser transports through the same-origin BFF", () => {
  assert.match(startScript, /NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED\s*=\s*"true"/);

  const browserRoutes = new Map([
    ["NEXT_PUBLIC_DSH_API_BASE_URL", "/api/dsh"],
    ["NEXT_PUBLIC_IDENTITY_API_BASE_URL", "/api/identity"],
    ["NEXT_PUBLIC_WORKFORCE_API_BASE_URL", "/api/workforce"],
    ["NEXT_PUBLIC_PROVIDERS_API_BASE_URL", "/api/providers"],
    ["NEXT_PUBLIC_PLATFORM_CONTROL_API_BASE_URL", "/api/platform-control"],
  ]);

  for (const [name, route] of browserRoutes) {
    assert.match(startScript, new RegExp(`${name}\\s*=\\s*\"${route.replaceAll("/", "\\/")}\"`));
  }

  assert.doesNotMatch(startScript, /NEXT_PUBLIC_[A-Z_]+_API_BASE_URL\s*=\s*"https?:\/\//);
});

test("control-panel startup keeps service origins in server-only environment variables", () => {
  const serverOrigins = new Map([
    ["DSH_API_BASE_URL", 58080],
    ["IDENTITY_API_BASE_URL", 58082],
    ["WORKFORCE_API_BASE_URL", 58086],
    ["PROVIDERS_API_BASE_URL", 58087],
    ["PLATFORM_CONTROL_API_BASE_URL", 58088],
  ]);

  for (const [name, port] of serverOrigins) {
    assert.match(startScript, new RegExp(`\\$env:${name}\\s*=\\s*\"http:\\/\\/127\\.0\\.0\\.1:${port}\"`));
  }
});


test("control-panel startup exposes the JavaScript TypeScript compiler API without package mutation", () => {
  assert.match(startScript, /typescript\/lib\/typescript\.js/);
  assert.match(startScript, /@typescript\/typescript6\/lib\/typescript\.js/);
  assert.match(startScript, /New-Item -ItemType Junction/);
  assert.match(startScript, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(startScript, /pnpm (?:add|install).*typescript/);
});

test("control-panel PowerShell startup script parses cleanly", (t) => {
  const probe = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);

  const quotedPath = startScriptPath.replaceAll("'", "''");
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
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
