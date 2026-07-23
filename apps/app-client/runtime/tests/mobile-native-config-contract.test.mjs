import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { defineBthwaniExpoApp } = require("../../../../tools/mobile/defineBthwaniExpoApp.js");
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const mobileApps = ["app-client", "app-partner", "app-captain", "app-field"];

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

test("placeholder Firebase files are never tracked as native credentials", () => {
  for (const appKey of mobileApps) {
    const file = path.join(repoRoot, "apps", appKey, "runtime", "google-services.json");
    assert.equal(fs.existsSync(file), false, `${appKey}: google-services.json must be supplied as a local/EAS file secret`);
  }
});

test("Android Firebase configuration is isolated per application", () => {
  withRestoredEnvironment(() => {
    delete process.env.GOOGLE_SERVICES_JSON;
    delete process.env.GOOGLE_SERVICES_JSON_APP_CLIENT;

    const disabled = defineBthwaniExpoApp("app-client");
    assert.equal(disabled.android.googleServicesFile, undefined);
    assert.equal(disabled.extra.notifications.androidNativeConfigured, false);

    process.env.GOOGLE_SERVICES_JSON_APP_CLIENT = "C:/secure/app-client/google-services.json";
    const configured = defineBthwaniExpoApp("app-client");
    assert.equal(configured.android.googleServicesFile, "C:/secure/app-client/google-services.json");
    assert.equal(configured.extra.notifications.androidNativeConfigured, true);
  });
});

test("mobile startup proves backends before Metro and avoids Expo Android stream piping", () => {
  const launcher = fs.readFileSync(path.join(repoRoot, "tools/scripts/start-mobile-runtime.ps1"), "utf8");
  for (const marker of [
    "Ensure-BthwaniMobileBackend",
    "identity,workforce,dsh,wlt,media",
    "Backend:",
    "AndroidLaunchJob",
    "android.intent.action.VIEW",
  ]) {
    assert.ok(launcher.includes(marker), `missing startup marker: ${marker}`);
  }
  assert.equal(launcher.includes('    "--android"'), false, "Expo --android must not own the ADB output stream");
});

test("push registration is fail-closed when Firebase or native APIs are absent", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "services/dsh/frontend/shared/notifications/use-mobile-push-registration.ts"),
    "utf8",
  );
  for (const marker of [
    "androidNativePushConfigured",
    "Firebase is not configured in the native Android build",
    'typeof getLastResponse === "function"',
    'typeof addPushTokenListener === "function"',
    "rebuild the development client after configuring GOOGLE_SERVICES_JSON",
  ]) {
    assert.ok(source.includes(marker), `missing push safety marker: ${marker}`);
  }
});
