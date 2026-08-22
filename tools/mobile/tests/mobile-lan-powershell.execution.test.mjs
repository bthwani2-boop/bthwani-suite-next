import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const helper = path.join(repoRoot, "tools/mobile/mobile-lan.ps1");

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

function runPwsh(t, command) {
  const pwsh = process.platform === "win32" ? "pwsh.exe" : "pwsh";
  const probe = spawnSync(pwsh, ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (probe.error?.code === "ENOENT") {
    t.skip("pwsh is unavailable in this environment");
    return null;
  }
  return spawnSync(pwsh, ["-NoLogo", "-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  });
}

// Regression: Write-BthwaniMobileGatewayDescriptor declared a parameter named
// $Pid. PowerShell variable names are case-insensitive, so it collided with the
// read-only automatic $PID and every gateway start died with "Cannot overwrite
// variable Pid because it is read-only or constant." A grep for '$Pid' cannot
// prove the class is gone, so this asks PowerShell itself which variables are
// read-only and checks every exported function against that live set.
test("no mobile LAN gateway parameter collides with a read-only automatic variable", (t) => {
  const quoted = helper.replaceAll("'", "''");
  const command = [
    `. '${quoted}'`,
    "$reserved = @(Get-Variable -Scope Global | Where-Object { $_.Options -match 'ReadOnly|Constant' } | ForEach-Object { $_.Name })",
    "$failures = @()",
    "foreach ($definition in (Get-Command -CommandType Function | Where-Object { $_.Name -like '*Bthwani*' })) {",
    "  foreach ($parameter in $definition.Parameters.Keys) {",
    "    if ($reserved -contains $parameter) { $failures += \"$($definition.Name) declares reserved parameter -$parameter\" }",
    "  }",
    "}",
    "if ($failures.Count -gt 0) { throw ($failures -join '; ') }",
  ].join("; ");

  const result = runPwsh(t, command);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("the gateway descriptor is actually writable and keeps its public pid contract", (t) => {
  const quoted = helper.replaceAll("'", "''");
  // Invokes the real function rather than inspecting its text: binding a
  // reserved parameter name fails at call time, not at parse time.
  const command = [
    `. '${quoted}'`,
    "Write-BthwaniMobileGatewayDescriptor -LanHost '192.168.1.50' -Port 58110 -GatewayProcessId 4242 -Capability ('a' * 64) -ContractVersion 1",
    "$descriptor = Read-BthwaniMobileGatewayDescriptor",
    "if ($null -eq $descriptor) { throw 'descriptor was not written' }",
    "if ([int] $descriptor.pid -ne 4242) { throw \"descriptor.pid was $($descriptor.pid), expected 4242\" }",
    "if ([int] $descriptor.port -ne 58110) { throw 'descriptor.port drifted' }",
    "if ([string] $descriptor.host -ne '192.168.1.50') { throw 'descriptor.host drifted' }",
    "Remove-Item -LiteralPath (Get-BthwaniMobileGatewayDescriptorPath) -Force -ErrorAction SilentlyContinue",
  ].join("; ");

  const result = runPwsh(t, command);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("stale gateway replacement refuses to kill a process it cannot identify as the gateway", (t) => {
  const quoted = helper.replaceAll("'", "''");
  // Port 58110 replacement must never terminate an unrelated listener. Feeds a
  // synthetic listener owned by the current process, which is not the gateway.
  const command = [
    `. '${quoted}'`,
    "$listener = [pscustomobject]@{ OwningProcess = $PID }",
    "$refused = $false",
    "try { Stop-BthwaniStaleMobileDevGateway -Listener $listener -Port 58110 } catch { if ($_.Exception.Message -match 'not the BThwani mobile development gateway|cannot be verified safely') { $refused = $true } else { throw $_ } }",
    "if (-not $refused) { throw 'replacement did not refuse an unrelated process' }",
  ].join("; ");

  const result = runPwsh(t, command);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("LAN gateway startup keeps Windows-only process decoration behind a platform gate", () => {
  const source = fs.readFileSync(helper, "utf8");
  assert.match(source, /\$startParameters\s*=\s*@\{/);
  assert.match(source, /if \(\$IsWindows\) \{ \$startParameters\.WindowStyle = "Hidden" \}/);
  assert.match(source, /Start-Process @startParameters/);
  assert.doesNotMatch(source, /Start-Process[\s\S]{0,260}-WindowStyle Hidden/);
});
