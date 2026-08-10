import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const phaseScript = await readFile(
  new URL("../scripts/invoke-runtime-phase.ps1", import.meta.url),
  "utf8",
);
const dshCatalogSmoke = await readFile(
  new URL("../../infra/docker/scripts/runtime/smoke-dsh-catalog.ps1", import.meta.url),
  "utf8",
);
const dshRuntimeSmoke = await readFile(
  new URL("../../infra/docker/scripts/smoke-dsh-runtime.ps1", import.meta.url),
  "utf8",
);
const workforceActorHelper = await readFile(
  new URL("../dev/local-workforce-actors.ps1", import.meta.url),
  "utf8",
);
const dshPartnerOnboardingSmoke = await readFile(
  new URL("../../infra/docker/scripts/runtime/smoke-dsh-partner-onboarding.ps1", import.meta.url),
  "utf8",
);

test("runtime retries only the transient PostgreSQL bootstrap restart", () => {
  assert.match(phaseScript, /function Test-TransientPostgresBootstrapRestart/);
  assert.match(phaseScript, /\$Action -ne "up"/);
  assert.match(
    phaseScript,
    /database system is shutting down\|the database system is starting up/,
  );
  assert.match(phaseScript, /Retrying runtime:up once after stabilization/);
  assert.match(
    phaseScript,
    /Invoke-RuntimeBasePhase\s+-ScriptPath\s+\$phaseRuntimeScript\s+-Parameters\s+\$runtimeParameters\s+-Append/,
  );
  assert.doesNotMatch(phaseScript, /while\s*\(/);
  assert.doesNotMatch(phaseScript, /for\s*\([^)]*retry/i);
});

test("runtime still fails closed after the one narrow retry", () => {
  assert.match(
    phaseScript,
    /if \(\$runtimeExitCode -ne 0\) \{\s*throw "Runtime script action '\$Action' failed with exit code \$runtimeExitCode"/s,
  );
  assert.equal(
    (phaseScript.match(/transient-postgres-bootstrap-retry: one retry/g) ?? []).length,
    1,
  );
});

test("runtime accepts a single non-WLT profile under StrictMode", () => {
  assert.match(phaseScript, /\$runtimeProfiles = \$runtimeProfileList -join ","/);
  assert.match(
    phaseScript,
    /elseif \(-not \[string\]::IsNullOrWhiteSpace\(\$runtimeProfiles\)\)/,
  );
  assert.doesNotMatch(phaseScript, /\$runtimeProfileList\.Count/);
});

test("PowerShell-only runtime phases use the initialized exit-code boundary", () => {
  assert.match(
    phaseScript,
    /\$catalogExitCode = Invoke-RuntimeBasePhase -ScriptPath \$CatalogReadbackScript -Parameters @\{\}/,
  );
  assert.match(
    phaseScript,
    /\$wltSmokeExitCode = Invoke-RuntimeBasePhase -ScriptPath \$AuthenticatedWltSmokeScript -Parameters @\{\} -Append/,
  );
  assert.doesNotMatch(phaseScript, /if \(\$LASTEXITCODE -ne 0\)/);
});

test("DSH runtime smoke enforces the canonical HEALTHY readiness state", () => {
  assert.match(dshCatalogSmoke, /\$readiness\.status -eq "HEALTHY"/);
  assert.match(dshRuntimeSmoke, /\$readiness\.status -ne "HEALTHY"/);
  assert.doesNotMatch(dshCatalogSmoke, /\$readiness\.status -eq "ready"/);
  assert.doesNotMatch(dshRuntimeSmoke, /\$readiness\.status -ne "ready"/);
  assert.doesNotMatch(dshRuntimeSmoke, /\$storeId:/);
});

test("PowerShell runtime consumers authenticate Workforce providers by activation", () => {
  assert.match(workforceActorHelper, /workforce\/\$endpoint\/\$encodedActorId\/activation-codes/);
  assert.match(workforceActorHelper, /\$IdentityBaseUrl\/auth\/activate/);
  assert.match(workforceActorHelper, /activated\.identity\.subject/);
  assert.doesNotMatch(workforceActorHelper, /\/auth\/login/);
});

test("partner onboarding uses the governed owner and idempotent creation contract", () => {
  assert.match(dshPartnerOnboardingSmoke, /ownerActorId = \[string\]\$partnerActor\.actorId/);
  assert.match(
    dshPartnerOnboardingSmoke,
    /\$partnerDraftHeaders\["Idempotency-Key"\]/,
  );
  assert.doesNotMatch(dshPartnerOnboardingSmoke, /\n\s*ownerName\s*=/);
});
