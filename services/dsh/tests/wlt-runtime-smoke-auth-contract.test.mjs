import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("authenticated WLT runtime smoke", () => {
  const phase = source("../../../tools/scripts/invoke-runtime-phase.ps1");
  const smoke = source("../../../tools/scripts/finance/smoke-wlt-authenticated-runtime.ps1");

  it("splits WLT only from the smoke phase and runs its authenticated verifier", () => {
    assert.match(phase, /\$runAuthenticatedWltSmoke = \$Action -eq "smoke" -and \$ProfileList -contains "wlt"/);
    assert.match(phase, /Where-Object \{ \$_ -ne "wlt" \}/);
    assert.match(phase, /=== runtime:wlt-authenticated-smoke ===/);
    assert.match(phase, /& \$AuthenticatedWltSmokeScript/);
    assert.match(phase, /Authenticated WLT runtime smoke failed with exit code/);
  });

  it("requires the governed DSH service identity for every protected WLT read", () => {
    assert.match(smoke, /WLT_DSH_SERVICE_TOKEN is required/);
    assert.match(smoke, /Authorization = "Bearer \$serviceToken"/);
    assert.match(smoke, /"X-Service-Caller" = "dsh"/);
    assert.match(smoke, /"X-Tenant-ID" = \$TenantId/);
    assert.match(smoke, /Invoke-WltRead -Path "\/wlt\/references\/payment-status/);
    assert.match(smoke, /Invoke-WltRead -Path "\/wlt\/references\/wallet-status/);
    assert.match(smoke, /Invoke-WltRead -Path "\/wlt\/payment-sessions\/\$\(\[Uri\]::EscapeDataString/);
  });

  it("keeps public health checks separate from protected financial reads", () => {
    assert.match(smoke, /Invoke-RestMethod -Method Get -Uri "\$BaseUrl\/wlt\/health"/);
    assert.match(smoke, /Invoke-RestMethod -Method Get -Uri "\$BaseUrl\/wlt\/readiness"/);
    assert.doesNotMatch(smoke, /PSDefaultParameterValues/);
  });

  it("proves mutation idempotency and canonical readback", () => {
    assert.match(smoke, /"Idempotency-Key" = "wlt-session-\$runIdentity"/);
    assert.match(smoke, /checkoutIntentId = "checkout-\$runIdentity"/);
    assert.match(smoke, /status -ne "reference_created"/);
    assert.match(smoke, /WLT authenticated runtime smoke: PASS/);
  });
});
