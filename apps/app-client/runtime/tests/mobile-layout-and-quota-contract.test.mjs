import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../../..");
const mobileRoot = path.join(repoRoot, "apps/mobile");
const apps = ["app-client", "app-partner", "app-captain", "app-field"];

function read(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("Firebase REST authentication always supplies the governed quota project", () => {
  const firebase = read("apps", "mobile", "eas", "firebase.ps1");

  for (const marker of [
    "X-Goog-User-Project",
    "billing/quota_project",
    "serviceusage.googleapis.com",
    "firebase.googleapis.com",
    "Microsoft.PowerShell.Utility\\Invoke-RestMethod",
    "Get-FirebaseErrorText",
  ]) assert.ok(firebase.includes(marker), `missing Firebase quota marker: ${marker}`);

  for (const marker of [
    "https://firebase.googleapis.com/v1beta1",
    "projects/$ProjectId/androidApps",
    "configFileContents",
    "FromBase64String",
  ]) assert.ok(firebase.includes(marker), `missing Firebase REST marker: ${marker}`);

  assert.equal(firebase.includes("$_.ErrorDetails.Message"), false);
  assert.equal(firebase.includes("apps:sdkconfig"), false);
  assert.equal(firebase.includes("firebase-tools@"), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "apps", "mobile", "eas", "firebase-core.ps1")), false);
});

test("mobile operational scripts live under apps/mobile", () => {
  for (const file of ["mobile.ps1", "reverse-all.ps1"]) {
    assert.ok(fs.existsSync(path.join(mobileRoot, file)), `missing apps/mobile/${file}`);
  }

  const oldMobile = read("apps", "mobile.ps1");
  const oldReverse = read("apps", "reverse-all.ps1");
  assert.ok(oldMobile.includes("mobile\\mobile.ps1"));
  assert.ok(oldReverse.includes("mobile\\reverse-all.ps1"));
  assert.ok(oldMobile.split(/\r?\n/).length < 25);
  assert.ok(oldReverse.split(/\r?\n/).length < 10);
  assert.equal(fs.existsSync(path.join(repoRoot, "apps", "scrcpy-wifi.ps1")), false);

  for (const app of apps) {
    const entrypoint = read("apps", app, "runtime", "mobile.ps1");
    assert.ok(entrypoint.includes("mobile\\mobile.ps1"), `${app} does not use apps/mobile/mobile.ps1`);
  }
});
