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

const mobileApps = ["app-client", "app-partner", "app-captain", "app-field"];

function pluginNames(config) {
  return new Set((config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin)));
}

function clearProviderEnvironment() {
  const pattern = /^(?:GOOGLE_SERVICES_JSON|GOOGLE_MAPS_(?:ANDROID|IOS)_API_KEY|SENTRY_|EXPO_PUBLIC_SENTRY_|BTHWANI_SENTRY_|BTHWANI_APP_ENV)/;
  for (const key of Object.keys(process.env)) {
    if (pattern.test(key)) delete process.env[key];
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

test("all four mobile apps keep the required provider capabilities", () => {
  for (const appKey of mobileApps) {
    const features = manifest.apps[appKey].features;
    assert.ok(features.includes("notifications"), `${appKey}: notifications are required`);
    assert.ok(features.includes("location"), `${appKey}: location is required`);
    assert.ok(features.includes("maps"), `${appKey}: native maps are required`);
  }

  assert.equal(manifest.apps["app-client"].features.includes("backgroundLocation"), false);
  assert.equal(manifest.apps["app-partner"].features.includes("backgroundLocation"), false);
  assert.equal(manifest.apps["app-field"].features.includes("backgroundLocation"), false);
  assert.equal(manifest.apps["app-captain"].features.includes("backgroundLocation"), true);
});

test("each app receives its own scoped Android Maps key", () => {
  for (const appKey of mobileApps) {
    withRestoredEnvironment(() => {
      const disabled = defineBthwaniExpoApp(appKey);
      assert.equal(disabled.android.config?.googleMaps, undefined);
      assert.equal(disabled.extra.maps.androidNativeConfigured, false);
      assert.ok(pluginNames(disabled).has("react-native-maps"));

      const variable = `GOOGLE_MAPS_ANDROID_API_KEY_${appEnvSuffix(appKey)}`;
      process.env[variable] = `development-${appKey}-map-key`;
      const configured = defineBthwaniExpoApp(appKey);
      assert.equal(configured.android.config?.googleMaps?.apiKey, `development-${appKey}-map-key`);
      assert.equal(configured.extra.maps.androidNativeConfigured, true);
    });
  }
});

test("one governed command owns Android EAS initialization, preflight, and build", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["mobile:eas"],
    "pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/mobile-eas.ps1",
  );

  const easAliases = Object.keys(packageJson.scripts).filter((name) => name.startsWith("mobile:eas:"));
  assert.deepEqual(easAliases, []);

  const compatibilityEntrypoint = fs.readFileSync(path.join(repoRoot, "tools/scripts/mobile-eas.ps1"), "utf8");
  const sharedEntrypoint = fs.readFileSync(path.join(repoRoot, "apps/mobile.ps1"), "utf8");
  const easEntrypoint = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas.ps1"), "utf8");
  const workflow = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas/workflow.ps1"), "utf8");
  const providers = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas/providers.ps1"), "utf8");
  for (const appKey of mobileApps) {
    assert.ok(compatibilityEntrypoint.includes(`'${appKey}'`));
    assert.ok(sharedEntrypoint.includes(`'${appKey}'`));
    assert.ok(fs.existsSync(path.join(repoRoot, "apps", appKey, "runtime", "mobile.ps1")));
  }
  for (const mode of ["Initialize", "Preflight", "Build"]) {
    assert.ok(compatibilityEntrypoint.includes(`'${mode}'`));
    assert.ok(sharedEntrypoint.includes(`'${mode}'`));
    assert.ok(easEntrypoint.includes(`'${mode}'`));
    assert.ok(workflow.includes(`'${mode}'`));
  }
  assert.match(easEntrypoint, /eas\\workflow\.ps1/);
  assert.equal(workflow.includes("foreach ($home in"), false);
  assert.equal(workflow.includes("--all"), false);
  assert.ok(providers.includes("GOOGLE_SERVICES_JSON"));
  assert.ok(providers.includes("GOOGLE_MAPS_ANDROID_API_KEY"));
  assert.ok(providers.includes("Sync-EasDevelopmentEnvironment"));
});

test("every app uses isolated local signing and EAS file variables for providers", () => {
  for (const appKey of mobileApps) {
    const runtime = path.join(repoRoot, "apps", appKey, "runtime");
    const eas = JSON.parse(fs.readFileSync(path.join(runtime, "eas.json"), "utf8"));
    assert.equal(eas.build.development.credentialsSource, "local");

    const easIgnore = fs.readFileSync(path.join(runtime, ".easignore"), "utf8");
    for (const marker of [
      "credentials.json",
      "*.jks",
      "*.keystore",
      ".env*",
      "google-services.json",
    ]) {
      assert.ok(easIgnore.includes(marker), `${appKey}: missing .easignore marker ${marker}`);
    }
    assert.equal(easIgnore.includes("!google-services.json"), false);
    assert.equal(easIgnore.includes("!.env.local"), false);
  }
});
