import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const { defineBthwaniExpoApp } = require(
  path.join(repoRoot, "tools/mobile/defineBthwaniExpoApp.js"),
);

function pluginNames(config) {
  return new Set((config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin)));
}

function clearProviderEnvironment() {
  const providerVariablePattern = /^(?:GOOGLE_SERVICES_JSON|GOOGLE_MAPS_(?:ANDROID|IOS)_API_KEY|SENTRY_|EXPO_PUBLIC_SENTRY_|BTHWANI_SENTRY_|BTHWANI_APP_ENV)/;
  for (const key of Object.keys(process.env)) {
    if (providerVariablePattern.test(key)) delete process.env[key];
  }
}

function withRestoredEnvironment(run) {
  const previous = { ...process.env };
  try {
    clearProviderEnvironment();
    return run();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(previous, key)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
}

function appEnvSuffix(appKey) {
  return appKey.replaceAll("-", "_").toUpperCase();
}

const mobileApps = ["app-client", "app-partner", "app-captain", "app-field"];

test("development provider capabilities remain all-surface and role-specific", () => {
  const apps = manifest.apps;
  for (const appKey of mobileApps) {
    assert.ok(apps[appKey].features.includes("notifications"), `${appKey}: FCM capability is required`);
    assert.ok(apps[appKey].features.includes("location"), `${appKey}: location capability is required`);
    assert.ok(apps[appKey].features.includes("maps"), `${appKey}: native maps capability is required`);
  }

  assert.equal(apps["app-client"].features.includes("backgroundLocation"), false);
  assert.equal(apps["app-partner"].features.includes("backgroundLocation"), false);
  assert.equal(apps["app-field"].features.includes("backgroundLocation"), false);
  assert.equal(apps["app-captain"].features.includes("backgroundLocation"), true);
});

test("every app receives Google Maps only when its scoped key exists", () => {
  for (const appKey of mobileApps) {
    withRestoredEnvironment(() => {
      const disabled = defineBthwaniExpoApp(appKey);
      assert.equal(disabled.android.config?.googleMaps, undefined, `${appKey}: maps must remain disabled without a key`);
      assert.equal(disabled.extra.maps.androidNativeConfigured, false);
      assert.ok(pluginNames(disabled).has("react-native-maps"), `${appKey}: maps native plugin must remain registered`);

      const scopedName = `GOOGLE_MAPS_ANDROID_API_KEY_${appEnvSuffix(appKey)}`;
      process.env[scopedName] = `development-${appKey}-map-key`;
      const configured = defineBthwaniExpoApp(appKey);
      assert.equal(configured.android.config?.googleMaps?.apiKey, `development-${appKey}-map-key`);
      assert.equal(configured.extra.maps.androidNativeConfigured, true);
    });
  }
});

test("all map-enabled build profiles require scoped Maps inputs", () => {
  const buildRunner = fs.readFileSync(
    path.join(repoRoot, "tools/scripts/eas-build-mobile.mjs"),
    "utf8",
  );
  for (const marker of [
    "requireNativeProviderInputs",
    "GOOGLE_MAPS_ANDROID_API_KEY is required",
    "GOOGLE_MAPS_IOS_API_KEY is required",
    "because the app enables native maps",
  ]) {
    assert.ok(buildRunner.includes(marker), `missing build policy marker: ${marker}`);
  }

  const setupScript = fs.readFileSync(
    path.join(repoRoot, "tools/scripts/setup-mobile-firebase-development.ps1"),
    "utf8",
  );
  assert.ok(setupScript.includes("Validate every local Firebase input before EAS mutation"));
  assert.ok(setupScript.includes("Optional in development"));
  assert.ok(setupScript.includes('Name "GOOGLE_SERVICES_JSON"'));

  const bootstrapScript = fs.readFileSync(
    path.join(repoRoot, "tools/scripts/bootstrap-mobile-firebase-development.ps1"),
    "utf8",
  );
  assert.ok(bootstrapScript.includes("DRY RUN"));
  assert.ok(bootstrapScript.includes("No EAS project, variable, credential, build, or workflow was changed"));
});
