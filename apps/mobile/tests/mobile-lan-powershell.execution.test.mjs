import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const helper = path.join(repoRoot, "apps/mobile/mobile-lan.ps1");

test("LAN gateway functions never collide with PowerShell's read-only Host automatic variable", (t) => {
  const pwsh = process.platform === "win32" ? "pwsh.exe" : "pwsh";
  const probe = spawnSync(pwsh, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return;
  }
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);

  const quoted = helper.replaceAll("'", "''");
  const command = [
    `. '${quoted}'`,
    "$names = @('Write-BthwaniMobileGatewayDescriptor','Test-BthwaniMobileDevGateway','Ensure-BthwaniMobileDevGateway')",
    "foreach ($name in $names) { $definition = Get-Command $name -ErrorAction Stop; if ($definition.Parameters.ContainsKey('Host')) { throw \"$name exposes forbidden Host parameter\" }; if (-not $definition.Parameters.ContainsKey('LanHost')) { throw \"$name is missing LanHost parameter\" } }",
  ].join("; ");
  const result = spawnSync(pwsh, ["-NoLogo", "-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("LAN gateway startup keeps Windows-only process decoration behind a platform gate", () => {
  const source = fs.readFileSync(helper, "utf8");
  assert.match(source, /\$startParameters\s*=\s*@\{/);
  assert.match(source, /if \(\$IsWindows\) \{ \$startParameters\.WindowStyle = "Hidden" \}/);
  assert.match(source, /Start-Process @startParameters/);
  assert.doesNotMatch(source, /Start-Process[\s\S]{0,260}-WindowStyle Hidden/);
});
