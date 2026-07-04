import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  PROVIDER_MUTATION_POLICY,
  WLT_BOUNDARY_PROVIDER_KINDS,
  ALLOWED_PROVIDER_CONSUMER_SURFACES,
  FORBIDDEN_PROVIDER_CONSUMER_SURFACES,
} = await import("../dist/services/dsh/frontend/shared/platform/platform-provider.policy.js");

describe("platform-provider.policy", () => {
  test("provider mutation requires backend contract", () => {
    assert.equal(PROVIDER_MUTATION_POLICY.requiresBackendContract, true);
    assert.equal(PROVIDER_MUTATION_POLICY.localOnlyApplyForbidden, true);
    assert.equal(PROVIDER_MUTATION_POLICY.previewOnlyApplyForbidden, true);
  });

  test("payments is the only WLT-boundary provider kind", () => {
    assert.deepEqual([...WLT_BOUNDARY_PROVIDER_KINDS], ["payments"]);
  });

  test("app-client is in forbidden consumer surfaces", () => {
    assert.ok(FORBIDDEN_PROVIDER_CONSUMER_SURFACES.includes("app-client"));
  });

  test("app-captain is in forbidden consumer surfaces", () => {
    assert.ok(FORBIDDEN_PROVIDER_CONSUMER_SURFACES.includes("app-captain"));
  });

  test("control-panel is in allowed consumer surfaces", () => {
    assert.ok(ALLOWED_PROVIDER_CONSUMER_SURFACES.includes("control-panel"));
  });
});
