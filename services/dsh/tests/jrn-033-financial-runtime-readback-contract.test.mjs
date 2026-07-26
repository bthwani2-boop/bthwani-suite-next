import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-033 representative financial runtime readback", () => {
  const workflow = source("../../../.github/workflows/ci-runtime.yml");
  const smoke = source("../../../tools/scripts/finance/smoke-dsh-wlt-representative-readback.ps1");

  it("runs affected runtime proof independently of full verification", () => {
    assert.match(
      workflow,
      /if: \$\{\{ inputs\.runtime_proof \|\| inputs\.full_verification == 'true' \|\| inputs\.runtime == 'true' \}\}/,
    );
    assert.match(
      workflow,
      /if: \$\{\{ !inputs\.runtime_proof && inputs\.full_verification != 'true' && inputs\.runtime != 'true' \}\}/,
    );
    assert.doesNotMatch(
      workflow,
      /inputs\.full_verification == 'true' && inputs\.runtime == 'true'/,
    );
  });

  it("runs the representative readback after the full runtime smoke and requires its PASS marker", () => {
    assert.match(workflow, /runtime:full:smoke[\s\S]*smoke-dsh-wlt-representative-readback\.ps1/);
    assert.match(workflow, /DSH\/WLT representative financial readback smoke: PASS/);
    assert.match(workflow, /runtime proof did not record the representative financial readback PASS marker/);
  });

  it("proves all four representative actor boundaries through DSH", () => {
    for (const actorType of ["client", "partner", "captain", "field"]) {
      assert.match(smoke, new RegExp(`ActorType = "${actorType}"`));
      assert.match(smoke, new RegExp(`/dsh/\\$actorType/me/finance/wallet`));
      assert.match(smoke, new RegExp(`/dsh/\\$actorType/me/finance/ledger-entries`));
    }
    assert.match(smoke, /\/dsh\/control-panel\/finance\/wallets\/\$encodedType\/\$encodedId/);
    assert.match(smoke, /Assert-WalletParity/);
    assert.match(smoke, /Assert-LedgerParity/);
  });

  it("keeps WLT behind DSH instead of bypassing the governed boundary", () => {
    assert.doesNotMatch(smoke, /localhost:58083/);
    assert.doesNotMatch(smoke, /\/wlt\//);
    assert.match(smoke, /IdentityBaseUrl = "http:\/\/localhost:58082"/);
    assert.match(smoke, /DshBaseUrl = "http:\/\/localhost:58080"/);
  });

  it("checks commissions and payout readbacks for non-client representatives", () => {
    assert.match(smoke, /if \(\$actorType -ne "client"\)/);
    assert.match(smoke, /\/dsh\/\$actorType\/me\/finance\/commissions/);
    assert.match(smoke, /\/dsh\/\$actorType\/me\/finance\/payout-requests/);
    assert.match(smoke, /Assert-Property -Value \$commissions -Name "commissions"/);
    assert.match(smoke, /Assert-Property -Value \$payouts -Name "payoutRequests"/);
  });
});
