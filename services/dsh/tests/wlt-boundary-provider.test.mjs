import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { PLATFORM_PROVIDER_REGISTRY } = await import(
  "../dist/frontend/shared/platform/platform-provider.registry.js"
);

const { WLT_BOUNDARY_PROVIDER_KINDS } = await import(
  "../dist/frontend/shared/platform/platform-provider.policy.js"
);

const { DSH_GEO_POLICY } = await import(
  "../dist/frontend/shared/geo/geo.policy.js"
);

describe("wlt-boundary-provider", () => {
  test("no provider in the registry contains a real API key value", () => {
    const realKeyPatterns = [
      /AIza[A-Za-z0-9_\-]{30,}/,
      /sk_live_[A-Za-z0-9]{20,}/,
    ];
    for (const provider of PLATFORM_PROVIDER_REGISTRY) {
      for (const pattern of realKeyPatterns) {
        if (provider.maskedCredential) {
          assert.ok(
            !pattern.test(provider.maskedCredential),
            `Provider ${provider.id} has a real key in maskedCredential`,
          );
        }
      }
    }
  });

  test("payments provider has wltBoundary=true", () => {
    const payments = PLATFORM_PROVIDER_REGISTRY.find((p) => p.kind === "payments");
    assert.ok(payments, "payments provider should exist in registry");
    assert.equal(payments.wltBoundary, true);
  });

  test("maps provider has wltBoundary=false", () => {
    const maps = PLATFORM_PROVIDER_REGISTRY.find((p) => p.kind === "maps");
    assert.ok(maps, "maps provider should exist in registry");
    assert.equal(maps.wltBoundary, false);
  });

  test("WLT_BOUNDARY_PROVIDER_KINDS only contains payments", () => {
    assert.ok(!WLT_BOUNDARY_PROVIDER_KINDS.includes("maps"));
    assert.ok(WLT_BOUNDARY_PROVIDER_KINDS.includes("payments"));
  });

  test("DSH geo policy confirms WLT does not own geo coordinates", () => {
    assert.equal(DSH_GEO_POLICY.wltDoesNotOwnGeoCordinates, true);
  });

  test("maps provider secret policy marks real value forbidden in frontend", () => {
    const maps = PLATFORM_PROVIDER_REGISTRY.find((p) => p.kind === "maps");
    assert.ok(maps);
    assert.equal(maps.secretPolicy.realValueForbiddenInFrontend, true);
  });
});
