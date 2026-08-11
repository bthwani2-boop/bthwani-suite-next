import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createMobileEvidenceReceipt,
  resolveEvidenceOutputPath,
  writeMobileEvidenceReceipt,
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

// The receipt is staged with an exclusive create and then renamed, so no
// existence check can be won by another writer in between. The staging name must
// also be unique per attempt: keyed to the process id, one leftover file from a
// crashed run permanently failed every later write to the same output.
test("receipt staging is exclusive and survives a leftover staging file", () => {
  const relative = `.diagnostics/mobile-evidence/exclusive-write-${process.pid}.json`;
  const output = resolveEvidenceOutputPath(relative);
  const input = {
    outputPath: relative,
    sourceSha: SHA,
    producer: "tools/scripts/write-mobile-evidence-receipt.test.mjs",
    platform: "android",
    tiers: ["mobile:android:native-build"],
  };
  const stale = `${output}.tmp-${process.pid}`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(stale, "leftover from a crashed run\n", "utf8");

  try {
    const { receipt } = writeMobileEvidenceReceipt(input);
    assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).sourceSha, receipt.sourceSha);

    // A second write of the same evidence must also succeed and must not leave
    // staging files behind for the next run to trip over.
    writeMobileEvidenceReceipt(input);
    const leftovers = fs
      .readdirSync(path.dirname(output))
      .filter((name) => name.startsWith(`${path.basename(output)}.tmp-`) && name !== path.basename(stale));
    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(stale, { force: true });
    fs.rmSync(output, { force: true });
  }
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
