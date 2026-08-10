import assert from "node:assert/strict";
import test from "node:test";

const policyUrl = new URL(
  "../src/features/readiness/captain-readiness.policy.ts",
  import.meta.url,
);

const {
  classifyCaptainReadiness,
  createCaptainEligibilityUnavailableGate,
} = await import(policyUrl.href);

test("captain readiness presentation is exhaustive and fail-closed", () => {
  assert.equal(classifyCaptainReadiness(null), "loading");
  assert.equal(classifyCaptainReadiness(undefined), "loading");
  assert.equal(classifyCaptainReadiness({ status: "BLOCKED" }), "blocked");
  assert.equal(classifyCaptainReadiness({ status: "ALLOWED" }), "allowed");
  assert.equal(classifyCaptainReadiness({ status: "UNKNOWN" }), "unknown");
});

test("captain readiness outage produces deterministic blocked evidence", () => {
  const checkedAt = "2026-08-10T21:00:00.000Z";
  assert.deepEqual(
    createCaptainEligibilityUnavailableGate(
      { actorId: "captain-1", workforceKind: "captain" },
      checkedAt,
    ),
    {
      actorId: "captain-1",
      workforceKind: "captain",
      status: "BLOCKED",
      blockerReasons: ["ELIGIBILITY_UNAVAILABLE"],
      checkedAt,
    },
  );
});
