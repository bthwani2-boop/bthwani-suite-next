import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const { validateMobileFeatureCapabilityManifest } = require("../mobile-feature-capability-model.js");
const readManifest = () => JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const clone = (value) => JSON.parse(JSON.stringify(value));

test("canonical mobile manifest justifies every native capability", () => {
  const manifest = readManifest();
  assert.equal(manifest.global.expoSdk, 56);
  assert.equal(manifest.global.capabilityModelVersion, 2);
  assert.deepEqual(manifest.apps["app-captain"].productFeatures.offlineSync, []);
  assert.deepEqual(manifest.apps["app-captain"].runtimeConcerns.powerAwareOfflineSync, ["battery"]);
  assert.deepEqual(manifest.apps["app-field"].productFeatures.offlineSync, []);
  assert.deepEqual(manifest.apps["app-field"].runtimeConcerns.powerAwareOfflineSync, ["battery"]);
  assert.doesNotThrow(() => validateMobileFeatureCapabilityManifest(manifest));
});

test("native capability without product or runtime owner fails closed", () => {
  const manifest = clone(readManifest());
  manifest.apps["app-client"].runtimeConcerns.platformActions = [
    "fileSystem",
    "sharing",
    "webBrowser",
  ];
  assert.throws(
    () => validateMobileFeatureCapabilityManifest(manifest),
    /native capability 'haptics' has no product feature or runtime concern owner/,
  );
});

test("runtime concern cannot claim an undeclared capability", () => {
  const manifest = clone(readManifest());
  manifest.apps["app-client"].runtimeConcerns.platformLifecycle.push("application");
  assert.throws(
    () => validateMobileFeatureCapabilityManifest(manifest),
    /runtimeConcerns 'platformLifecycle' requires undeclared capability 'application'/,
  );
});

test("Expo SDK target must be explicit canonical state", () => {
  const manifest = clone(readManifest());
  delete manifest.global.expoSdk;
  assert.throws(
    () => validateMobileFeatureCapabilityManifest(manifest),
    /mobile global\.expoSdk must be an integer >= 50/,
  );
});
