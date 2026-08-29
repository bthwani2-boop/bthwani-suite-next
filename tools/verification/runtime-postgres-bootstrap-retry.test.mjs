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
const dshRuntimeDispatcher = await readFile(
  new URL("../../infra/docker/scripts/runtime-dispatch.ps1", import.meta.url),
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
    /\$catalogParameters = @\{\}[\s\S]*\$catalogExitCode = Invoke-RuntimeBasePhase -ScriptPath \$CatalogReadbackScript -Parameters \$catalogParameters/,
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

test("partner onboarding closes the canonical store publication journey", () => {
  assert.match(dshRuntimeDispatcher, /DSH partner onboarding smoke[\s\S]*StatePath = \$statePath/);
  assert.match(dshRuntimeDispatcher, /\[switch\]\$SeedWlt[\s\S]*if \(\$SeedWlt\) \{ \$seedProfiles \+= "wlt" \}[\s\S]*EngineAction "seed" -EngineProfiles \(\$seedProfiles -join ","\)/);
  assert.match(dshRuntimeDispatcher, /\$profileList -contains "wlt" -or \$SeedWlt[\s\S]*clientParameters\.WltEnabled/);
  assert.match(phaseScript, /\$runtimeParameters\.SeedWlt = \$true/);
  assert.match(dshPartnerOnboardingSmoke, /catalogState\.masterProductId/);
  assert.match(dshPartnerOnboardingSmoke, /status = "ready"[\s\S]*deliveryModes = @\("delivery", "pickup"\)/);
  assert.match(dshPartnerOnboardingSmoke, /role = "store_logo"/);
  assert.match(dshPartnerOnboardingSmoke, /role = "store_cover"/);
  assert.match(dshPartnerOnboardingSmoke, /isPrimary = \$true/);
  assert.match(dshPartnerOnboardingSmoke, /\$expectedAssortmentPublicationStatus = if \(\$MediaEnabled\) \{ "client_visible" \} else \{ "approved" \}/);
  assert.match(dshPartnerOnboardingSmoke, /publicationStatus = \$expectedAssortmentPublicationStatus/);
  assert.match(dshPartnerOnboardingSmoke, /decision = "publish"/);
  assert.match(dshPartnerOnboardingSmoke, /\/dsh\/operator\/marketing\/stores\/\$smokeStoreId\/publication/);
  assert.match(dshPartnerOnboardingSmoke, /\/dsh\/stores\/\$smokeStoreId"/);
  assert.match(dshPartnerOnboardingSmoke, /\/dsh\/stores\/\$smokeStoreId\/catalog"/);
  assert.doesNotMatch(dshPartnerOnboardingSmoke, /"lifecycle" "active"/);
});
