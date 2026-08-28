import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("DSH operator governance runtime preflight", () => {
  const workflow = source("../../../.github/workflows/ci-runtime.yml");
  const preflight = source("../../../tools/scripts/runtime/smoke-dsh-operator-governance-preflight.ps1");
  const diagnosis = source("../../../tools/scripts/runtime/diagnose-dsh-smoke-auth-boundary.ps1");

  it("runs after runtime startup and catalog readback and before the broad runtime smoke", () => {
    const runtimeUp = workflow.indexOf("-Action bootstrap-dev");
    const catalogReadback = workflow.indexOf("-Action catalog-readback");
    const diagnostic = workflow.indexOf(
      "tools/scripts/runtime/smoke-dsh-operator-governance-preflight.ps1",
    );
    const broadSmoke = workflow.indexOf("-Action smoke");
    assert.ok(runtimeUp >= 0);
    assert.ok(catalogReadback > runtimeUp);
    assert.ok(diagnostic > catalogReadback);
    assert.ok(broadSmoke > diagnostic);
    assert.match(preflight, /DSH operator governance preflight: PASS/);
  });

  it("names every request and preserves non-success response bodies", () => {
    for (const name of [
      "identity-operator-login",
      "dsh-operator-store-list",
      "dsh-operator-store-detail",
      "dsh-operator-store-governance",
    ]) {
      assert.match(preflight, new RegExp(`-Name "${name}"`));
    }
    assert.match(preflight, /SkipHttpErrorCheck = \$true/);
    assert.match(preflight, /response-body=\$responseBody/);
    assert.match(preflight, /failed with HTTP \$\(\[int\]\$response\.StatusCode\)/);
  });

  it("uses the current store version and preserves its visibility value", () => {
    assert.match(preflight, /expectedVersion = \[int\]\$detail\.store\.version/);
    assert.match(preflight, /\$serviceabilityStatus = \[string\]\$detail\.store\.serviceability\.status/);
    assert.match(preflight, /value = \$serviceabilityStatus/);
    assert.doesNotMatch(preflight, /\.serviceabilityStatus\b/);
    assert.match(diagnosis, /\$serviceabilityStatus = \[string\]\$detail\.store\.serviceability\.status/);
    assert.match(diagnosis, /value = \$serviceabilityStatus/);
    assert.match(preflight, /action = "serviceability"/);
    assert.match(preflight, /audit\.actorRole -ne "operator"/);
  });
});
