import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../../..");
const apps = ["app-client", "app-partner", "app-captain", "app-field"];
const wrapper = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas.ps1"), "utf8");
const workflow = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas/workflow.ps1"), "utf8");
const providers = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas/providers.ps1"), "utf8");
const signing = fs.readFileSync(path.join(repoRoot, "apps/mobile/eas/signing.ps1"), "utf8");
const firebaseHelper = fs.readFileSync(
  path.join(repoRoot, "tools/scripts/mobile-eas/ensure-firebase-app.ps1"),
  "utf8",
);

function runtimePackage(app) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "apps", app, "runtime/package.json"), "utf8"));
}

test("Initialize is mandatory and bound to immutable provider inputs", () => {
  assert.ok(wrapper.includes("eas\\workflow.ps1"));
  for (const marker of [
    "InitializeStampPath",
    "PreflightStampPath",
    "keystoreSha256",
    "firebaseFileSha256",
    "firebaseKeySha256",
    "mapsKeySha256",
    "Assert-EasDevelopmentEnvironment",
  ]) assert.ok(workflow.includes(marker), `missing marker: ${marker}`);
  assert.ok(workflow.indexOf("Assert-StateStamp -Path $InitializeStampPath") < workflow.indexOf("if ($Mode -eq 'Preflight')"));
  assert.ok(workflow.indexOf("Assert-StateStamp -Path $PreflightStampPath") < workflow.indexOf("Write-Step 'Submit remote build'"));
});

test("EAS provider variables use one unambiguous environment selector", () => {
  assert.ok(providers.includes("'env:get', 'development'"));
  assert.ok(providers.includes("'env:update', 'development'"));
  assert.ok(providers.includes("'env:create', 'development'"));
  assert.equal(providers.includes("'--variable-environment', 'development'"), false);
  assert.equal(providers.includes("'--force', '--non-interactive'"), false);
  assert.ok(providers.includes("if (Test-EasVariable -Name $Name)"));
  assert.equal(signing.includes("Add-KeytoolCandidate"), false);
  const listAdds = signing.match(/[^\n]*\$candidates\.Add\([^\n]*/g) ?? [];
  assert.ok(listAdds.length > 0);
  for (const line of listAdds) assert.match(line, /\[void\]\s+\$candidates\.Add/);
});

test("Firebase Android configuration uses the official Management REST API", () => {
  for (const marker of [
    "https://firebase.googleapis.com/v1beta1",
    "'auth', 'print-access-token'",
    "projects/$ProjectId/androidApps",
    "projects/-/androidApps/$encodedAppId/config",
    "configFileContents",
    "FromBase64String",
  ]) assert.ok(firebaseHelper.includes(marker), `missing Firebase REST marker: ${marker}`);
  assert.equal(firebaseHelper.includes("apps:sdkconfig"), false);
  assert.equal(firebaseHelper.includes("firebase-tools@"), false);
  assert.equal(firebaseHelper.includes("Invoke-Firebase"), false);
});

test("every remote Android build verifies Firebase and Maps on the EAS worker", () => {
  const validator = path.join(repoRoot, "apps/mobile/verify-eas-provider-inputs.mjs");
  assert.ok(fs.existsSync(validator));
  const text = fs.readFileSync(validator, "utf8");
  for (const marker of [
    "GOOGLE_SERVICES_JSON",
    "GOOGLE_MAPS_ANDROID_API_KEY",
    "bthwani-platform",
    "Firebase and Maps API keys must be separate",
  ]) assert.ok(text.includes(marker));
  for (const app of apps) {
    assert.equal(
      runtimePackage(app).scripts["eas-build-pre-install"],
      `node ../../mobile/verify-eas-provider-inputs.mjs --app ${app}`,
    );
  }
});
