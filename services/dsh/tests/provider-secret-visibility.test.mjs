import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { PROVIDER_SECRET_POLICIES, PROVIDER_CREDENTIAL_VISIBILITY, isForbiddenInFrontend } = await import(
  "../dist/frontend/shared/platform/platform-provider-secrets.policy.js"
);

describe("provider-secret-visibility", () => {
  test("all provider secret policies have realValueForbiddenInFrontend = true", () => {
    for (const [kind, policy] of Object.entries(PROVIDER_SECRET_POLICIES)) {
      assert.equal(
        policy.realValueForbiddenInFrontend,
        true,
        `${kind}: realValueForbiddenInFrontend must be true`,
      );
    }
  });

  test("maps credential visibility is public_restricted_key (browser tile key only)", () => {
    assert.equal(PROVIDER_CREDENTIAL_VISIBILITY["maps"], "public_restricted_key");
  });

  test("payments credential visibility is masked_only", () => {
    assert.equal(PROVIDER_CREDENTIAL_VISIBILITY["payments"], "masked_only");
  });

  test("ai is forbidden in frontend", () => {
    assert.equal(isForbiddenInFrontend("ai"), true);
  });

  test("fraud is forbidden in frontend", () => {
    assert.equal(isForbiddenInFrontend("fraud"), true);
  });

  test("hosting is forbidden in frontend", () => {
    assert.equal(isForbiddenInFrontend("hosting"), true);
  });

  test("analytics is forbidden in frontend", () => {
    assert.equal(isForbiddenInFrontend("analytics"), true);
  });
});
