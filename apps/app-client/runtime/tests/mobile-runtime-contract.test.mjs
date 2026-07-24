import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const mobileApps = new Map([
  ["app-client", 18101],
  ["app-partner", 18102],
  ["app-captain", 18103],
  ["app-field", 18104],
]);

test("all mobile wrappers bind their canonical app key and fixed Metro port", () => {
  for (const [appKey, port] of mobileApps) {
    const wrapper = read(`apps/${appKey}/runtime/start.ps1`);
    assert.match(wrapper, new RegExp(`-AppKey\\s+"${appKey}"`));
    assert.match(wrapper, new RegExp(`-MetroPort\\s+${port}\\b`));
  }
});

test("the shared launcher is deterministic and declares verified adb reverse", () => {
  const launcher = read("tools/scripts/start-mobile-runtime.ps1");

  for (const marker of [
    "Get-NetTCPConnection",
    "EXPO_PUBLIC_ADB_REVERSE_ENABLED",
    "Invoke-BthwaniAdbReverse",
    "WatchPortsCsv",
    '"--localhost"',
    "reverse-only",
  ]) {
    assert.ok(launcher.includes(marker), `missing launcher contract marker: ${marker}`);
  }

  assert.doesNotMatch(launcher, /&\s+\$WatchAdb[\s\S]{0,120}\bdisconnect\s+\$WatchSerial/);
  assert.doesNotMatch(launcher, /&\s+\$WatchAdb[\s\S]{0,120}\bconnect\s+\$WatchSerial/);
});

test("the ADB helper selects transports deliberately and verifies reverse mappings", () => {
  const helper = read("tools/scripts/mobile-adb.ps1");

  for (const marker of [
    "BTHWANI_ANDROID_TRANSPORT",
    "Assert-BthwaniAdbReverse",
    "Get-BthwaniAdbReverseMappings",
    "reverse --list",
    "When both transports expose the same phone, USB is the stable default.",
  ]) {
    assert.ok(helper.includes(marker), `missing ADB helper contract marker: ${marker}`);
  }
});

test("PowerShell parses every governed application launcher", (t) => {
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
    "apps/reverse-all.ps1",
    ...[...mobileApps.keys()].map((appKey) => `apps/${appKey}/runtime/start.ps1`),
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
