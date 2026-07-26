import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("DSH operator governance runtime preflight", () => {
  const workflow = source("../../../.github/workflows/ci-runtime.yml");
  const preflight = source("../../../tools/scripts/runtime/smoke-dsh-operator-governance-preflight.ps1");

  it("runs after bootstrap and before the broad runtime smoke", () => {
    const bootstrap = workflow.indexOf('Invoke-LoggedPhase "runtime:full:bootstrap-dev"');
    const diagnostic = workflow.indexOf('Invoke-LoggedPhase "dsh-operator-governance-preflight"');
    const broadSmoke = workflow.indexOf('Invoke-LoggedPhase "runtime:full:smoke"');
    assert.ok(bootstrap >= 0);
    assert.ok(diagnostic > bootstrap);
    assert.ok(broadSmoke > diagnostic);
    assert.match(workflow, /DSH operator governance preflight: PASS/);
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
    assert.match(preflight, /value = if \(\[bool\]\$detail\.store\.isVisible\) \{ "visible" \} else \{ "hidden" \}/);
    assert.match(preflight, /action = "visibility"/);
    assert.match(preflight, /audit\.actorRole -ne "operator"/);
  });
});
