import assert from "node:assert/strict";
import test from "node:test";
import {
  createMobileEvidenceReceipt,
  resolveEvidenceOutputPath,
} from "./write-mobile-evidence-receipt.mjs";

const SHA = "a".repeat(40);

test("evidence writer accepts only diagnostics JSON outputs", () => {
  const allowed = resolveEvidenceOutputPath(".diagnostics/mobile-evidence/android-native.json");
  assert.match(allowed.replaceAll("\\", "/"), /\.diagnostics\/mobile-evidence\/android-native\.json$/);
  assert.throws(() => resolveEvidenceOutputPath("apps/app-client/runtime/evidence.json"), /output must be a file below/);
  assert.throws(() => resolveEvidenceOutputPath(".diagnostics/mobile-evidence/../source.json"), /output must be a file below/);
  assert.throws(() => resolveEvidenceOutputPath(".diagnostics/mobile-evidence/evidence.txt"), /must be a \.json file/);
});

test("native receipts are SHA-bound and derive the canonical four-app inventory", () => {
  const receipt = createMobileEvidenceReceipt({
    sourceSha: SHA,
    producer: ".github/workflows/ci-runtime.yml#android-native",
    platform: "android",
    tiers: ["mobile:android:native-build"],
  });
  assert.equal(receipt.sourceSha, SHA);
  assert.deepEqual(receipt.apps, ["app-captain", "app-client", "app-field", "app-partner"]);
  assert.deepEqual(receipt.tiers, ["mobile:android:native-build"]);
  assert.equal(receipt.physicalDevice, false);
});

test("writer rejects malformed SHA, unknown tiers, and platform impersonation", () => {
  assert.throws(() => createMobileEvidenceReceipt({
    sourceSha: "HEAD",
    producer: "test",
    platform: "android",
    tiers: ["mobile:android:native-build"],
  }), /exact 40-character/);
  assert.throws(() => createMobileEvidenceReceipt({
    sourceSha: SHA,
    producer: "test",
    platform: "ios",
    tiers: ["mobile:android:native-build"],
  }), /requires platform=android/);
  assert.throws(() => createMobileEvidenceReceipt({
    sourceSha: SHA,
    producer: "test",
    platform: "android",
    tiers: ["mobile:unknown"],
  }), /unknown evidence tier/);
});

test("physical and Simulator tiers cannot be forged by ordinary CI producers", () => {
  assert.throws(() => createMobileEvidenceReceipt({
    sourceSha: SHA,
    producer: "test",
    platform: "ios",
    tiers: ["mobile:ios:physical-integration"],
  }), /requires physicalDevice=true/);
  assert.throws(() => createMobileEvidenceReceipt({
    sourceSha: SHA,
    producer: "test",
    platform: "ios",
    tiers: ["mobile:ios:simulator-launch"],
    physicalDevice: true,
  }), /Simulator evidence cannot be physical-device evidence/);
});
