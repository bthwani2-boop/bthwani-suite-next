import assert from "node:assert/strict";
import test from "node:test";
import {
  loadMobileEvidenceContract,
  validateMobileEvidenceReceipts,
} from "./verify-mobile-evidence-receipts.mjs";

const SHA = "a".repeat(40);
const contract = loadMobileEvidenceContract();
const allApps = [...contract.apps];

function receipt(tiers, overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSha: SHA,
    result: "PASS",
    producer: "test-producer",
    apps: allApps,
    tiers,
    physicalDevice: false,
    ...overrides,
  };
}

test("mobile evidence contract requires Android and iOS physical closure", () => {
  assert.deepEqual(contract.apps, ["app-captain", "app-client", "app-field", "app-partner"]);
  assert.ok(contract.requiredTiers.includes("mobile:android:physical-integration"));
  assert.ok(contract.requiredTiers.includes("mobile:ios:physical-integration"));
  assert.ok(contract.requiredTiers.includes("mobile:ios:simulator-launch"));
});

test("final closure fails when physical integration evidence is missing", () => {
  assert.throws(
    () => validateMobileEvidenceReceipts({
      expectedSha: SHA,
      contract,
      receipts: [
        { source: "shared", receipt: receipt(["mobile:shared:integration"]) },
        { source: "android-native", receipt: receipt(["mobile:android:native-build"], { platform: "android" }) },
        { source: "android-launch", receipt: receipt(["mobile:android:physical-launch"], { platform: "android", physicalDevice: true }) },
        { source: "ios", receipt: receipt(["mobile:ios:native-build", "mobile:ios:simulator-launch"], { platform: "ios" }) },
      ],
    }),
    /BLOCKED missing required tiers: mobile:android:physical-integration, mobile:ios:physical-integration/,
  );
});

test("Simulator cannot impersonate physical iOS evidence", () => {
  assert.throws(
    () => validateMobileEvidenceReceipts({
      expectedSha: SHA,
      contract,
      receipts: [
        { source: "fake", receipt: receipt(["mobile:ios:physical-integration"], { platform: "ios", physicalDevice: false }) },
      ],
    }),
    /requires physicalDevice=true/,
  );
});

test("receipts are bound to exact SHA and all four apps", () => {
  assert.throws(
    () => validateMobileEvidenceReceipts({
      expectedSha: SHA,
      contract,
      receipts: [{ source: "wrong-sha", receipt: receipt(["mobile:shared:integration"], { sourceSha: "b".repeat(40) }) }],
    }),
    /sourceSha mismatch/,
  );
  assert.throws(
    () => validateMobileEvidenceReceipts({
      expectedSha: SHA,
      contract,
      receipts: [{ source: "partial", receipt: receipt(["mobile:shared:integration"], { apps: ["app-client"] }) }],
    }),
    /app inventory mismatch/,
  );
});

test("complete independent tiers close exactly once", () => {
  const result = validateMobileEvidenceReceipts({
    expectedSha: SHA,
    contract,
    receipts: [
      { source: "shared", receipt: receipt(["mobile:shared:integration"]) },
      { source: "android-native", receipt: receipt(["mobile:android:native-build"], { platform: "android" }) },
      { source: "android-physical", receipt: receipt(["mobile:android:physical-launch", "mobile:android:physical-integration"], { platform: "android", physicalDevice: true }) },
      { source: "ios-native", receipt: receipt(["mobile:ios:native-build", "mobile:ios:simulator-launch"], { platform: "ios" }) },
      { source: "ios-physical", receipt: receipt(["mobile:ios:physical-integration"], { platform: "ios", physicalDevice: true }) },
    ],
  });
  assert.deepEqual(result.tiers, contract.requiredTiers);
});
