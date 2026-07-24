import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"),
);
const { defineBthwaniExpoApp } = require(
  path.join(repoRoot, "tools/mobile/defineBthwaniExpoApp.js"),
);

function pluginNames(config) {
  return new Set((config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin)));
}

function withRestoredEnvironment(run) {
  const previous = { ...process.env };
  try {
    return run();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(previous, key)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
}

test("development provider capabilities remain surface-specific", () => {
  const apps = manifest.apps;
  for (const appKey of ["app-client", "app-partner", "app-captain", "app-field"]) {
    assert.ok(apps[appKey].features.includes("notifications"), `${appKey}: FCM capability is required`);
    assert.ok(apps[appKey].features.includes("location"), `${appKey}: location capability is required`);
  }

  assert.equal(apps["app-client"].features.includes("maps"), false);
  assert.equal(apps["app-partner"].features.includes("maps"), false);
  assert.equal(apps["app-field"].features.includes("maps"), false);
  assert.equal(apps["app-captain"].features.includes("maps"), true);
  assert.equal(apps["app-captain"].features.includes("backgroundLocation"), true);
});

test("partner receives location native configuration without Google Maps", () => {
  withRestoredEnvironment(() => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY_APP_PARTNER = "must-not-be-used";
    const config = defineBthwaniExpoApp("app-partner");
    assert.ok(pluginNames(config).has("expo-location"));
    assert.equal(config.android.config?.googleMaps, undefined);
    assert.equal(config.extra.maps.androidNativeConfigured, false);
  });
});

test("captain receives Google Maps only when its scoped key exists", () => {
  withRestoredEnvironment(() => {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN;
    const disabled = defineBthwaniExpoApp("app-captain");
    assert.equal(disabled.android.config?.googleMaps, undefined);
    assert.equal(disabled.extra.maps.androidNativeConfigured, false);

    process.env.GOOGLE_MAPS_ANDROID_API_KEY_APP_CAPTAIN = "development-captain-map-key";
    const configured = defineBthwaniExpoApp("app-captain");
    assert.equal(configured.android.config?.googleMaps?.apiKey, "development-captain-map-key");
    assert.equal(configured.extra.maps.androidNativeConfigured, true);
  });
});

test("development permits the captain map fallback while release profiles require Maps", () => {
  const buildRunner = fs.readFileSync(
    path.join(repoRoot, "tools/scripts/eas-build-mobile.mjs"),
    "utf8",
  );
  for (const marker of [
    'profile === "development"',
    "GOOGLE_MAPS_ANDROID_API_KEY is required",
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
