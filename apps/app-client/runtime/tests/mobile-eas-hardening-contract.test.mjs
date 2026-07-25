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
const firebaseHelperPath = path.join(repoRoot, "apps/mobile/eas/firebase.ps1");
const mapsHelperPath = path.join(repoRoot, "apps/mobile/eas/maps.ps1");
const easEnginePath = path.join(repoRoot, "apps/mobile/eas-build-mobile.mjs");
const firebaseHelper = fs.readFileSync(firebaseHelperPath, "utf8");

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

test("EAS provider variables use idempotent env:set and exact short metadata parsing", () => {
  assert.ok(providers.includes("'env:set', 'development'"));
  assert.ok(providers.includes("'env:list', 'development'"));
  assert.ok(providers.includes("Remove-AnsiEscapeSequences"));
  assert.ok(providers.includes("$env:FORCE_COLOR = '0'"));
  assert.ok(providers.includes("$escapedName = [regex]::Escape($Name)"));
  assert.ok(providers.includes("EAS short format is: NAME | scope | type"));
  assert.ok(providers.includes('$shortPattern = "(?mi)^\\s*$escapedName\\s*\\|"'));
  assert.equal(providers.includes('$shortPattern = "(?m)^\\s*$escapedName="'), false);
  assert.ok(providers.includes("$longPattern"));
  assert.equal(providers.includes("'env:get', 'development'"), false);
  assert.equal(providers.includes("'env:update', 'development'"), false);
  assert.equal(providers.includes("'env:create', 'development'"), false);
  assert.equal(providers.includes("'--variable-environment', 'development'"), false);
  assert.equal(providers.includes("if (Test-EasVariable -Name $Name)"), false);
  assert.ok(providers.includes("$commandText = $commandText.Replace($secret, '<redacted>')"));
  assert.equal(signing.includes("Add-KeytoolCandidate"), false);
  const listAdds = signing.match(/[^\n]*\$candidates\.Add\([^\n]*/g) ?? [];
  assert.ok(listAdds.length > 0);
  for (const line of listAdds) assert.match(line, /\[void\]\s+\$candidates\.Add/);
});

test("active mobile build executors live under apps/mobile", () => {
  for (const file of [firebaseHelperPath, mapsHelperPath, easEnginePath]) {
    assert.ok(fs.existsSync(file), `missing active mobile executor: ${file}`);
  }
  const oldFirebase = fs.readFileSync(path.join(repoRoot, "tools/scripts/mobile-eas/ensure-firebase-app.ps1"), "utf8");
  const oldMaps = fs.readFileSync(path.join(repoRoot, "tools/scripts/google-cloud/create-android-maps-api-key.ps1"), "utf8");
  const oldEngine = fs.readFileSync(path.join(repoRoot, "tools/scripts/eas-build-mobile.mjs"), "utf8");
  assert.ok(oldFirebase.includes("apps\\mobile\\eas\\firebase.ps1"));
  assert.ok(oldMaps.includes("apps\\mobile\\eas\\maps.ps1"));
  assert.ok(oldEngine.includes("apps/mobile/eas-build-mobile.mjs"));
  assert.ok(oldFirebase.split(/\r?\n/).length < 30);
  assert.ok(oldMaps.split(/\r?\n/).length < 40);
  assert.ok(oldEngine.split(/\r?\n/).length < 5);
});

test("Firebase Android configuration uses the official Management REST API", () => {
  for (const marker of [
    "https://firebase.googleapis.com/v1beta1",
    "'auth', 'print-access-token'",
    "projects/$ProjectId/androidApps",
    "projects/-/androidApps/$encodedAppId/config",
    "configFileContents",
    "FromBase64String",
    "X-Goog-User-Project",
    "Get-FirebaseErrorText",
  ]) assert.ok(firebaseHelper.includes(marker), `missing Firebase REST marker: ${marker}`);
  assert.equal(/[\'"]apps:sdkconfig[\'"]/.test(firebaseHelper), false);
  assert.equal(firebaseHelper.includes("firebase-tools@"), false);
  assert.equal(/function\s+Invoke-Firebase\s*\{/i.test(firebaseHelper), false);
  assert.equal(firebaseHelper.includes("$_.ErrorDetails.Message"), false);
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
