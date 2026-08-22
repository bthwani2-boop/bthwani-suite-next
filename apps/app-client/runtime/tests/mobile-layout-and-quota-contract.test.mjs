import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../../..");
const mobileRoot = path.join(repoRoot, "tools/mobile");
const apps = ["app-client", "app-partner", "app-captain", "app-field"];

function read(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

test("Firebase REST authentication always supplies the governed quota project", () => {
  const firebase = read("tools", "mobile", "eas", "firebase.ps1");

  for (const marker of [
    "X-Goog-User-Project",
    "billing/quota_project",
    "serviceusage.googleapis.com",
    "firebase.googleapis.com",
    "Microsoft.PowerShell.Utility\\Invoke-RestMethod",
    "Get-FirebaseErrorText",
  ]) {
    assert.ok(firebase.includes(marker), `missing Firebase quota marker: ${marker}`);
  }

  for (const marker of [
    "https://firebase.googleapis.com/v1beta1",
    "projects/$ProjectId/androidApps",
    "configFileContents",
    "FromBase64String",
  ]) {
    assert.ok(firebase.includes(marker), `missing Firebase REST marker: ${marker}`);
  }

  assert.equal(firebase.includes("$_.ErrorDetails.Message"), false);
  assert.equal(firebase.includes("apps:sdkconfig"), false);
  assert.equal(firebase.includes("firebase-tools@"), false);
  assert.equal(
    fs.existsSync(path.join(repoRoot, "tools", "mobile", "eas", "firebase-core.ps1")),
    false,
  );
});

test("shared mobile operational authority lives only under tools/mobile", () => {
  for (const file of [
    "mobile.ps1",
    "reverse-all.ps1",
    "start-mobile-runtime.ps1",
    "ensure-mobile-dev-runtime.ps1",
    "mobile-adb.ps1",
    "mobile-lan.ps1",
    "eas.ps1",
    "eas-build-mobile.mjs",
  ]) {
    assert.ok(
      fs.existsSync(path.join(mobileRoot, file)),
      `missing tools/mobile/${file}`,
    );
  }

  for (const legacy of [
    path.join(repoRoot, "apps", "mobile"),
    path.join(repoRoot, "apps", "mobile.ps1"),
    path.join(repoRoot, "apps", "reverse-all.ps1"),
  ]) {
    assert.equal(
      fs.existsSync(legacy),
      false,
      `legacy shared mobile authority must not exist: ${legacy}`,
    );
  }

  for (const app of apps) {
    const entrypoint = read("apps", app, "runtime", "mobile.ps1");

    assert.ok(
      entrypoint.includes("tools\\mobile\\mobile.ps1"),
      `${app} does not delegate to tools/mobile/mobile.ps1`,
    );
  }
});

test("all four mobile runtimes remain independent of screen mirroring", () => {
  const runtimeFiles = [
    ["tools", "mobile", "mobile.ps1"],
    ["tools", "mobile", "start-mobile-runtime.ps1"],
    ["tools", "mobile", "mobile-adb.ps1"],
    ["tools", "scripts", "start-mobile-runtime.ps1"],
    ...apps.flatMap((app) => [
      ["apps", app, "runtime", "start.ps1"],
      ["apps", app, "runtime", "mobile.ps1"],
    ]),
  ];

  for (const segments of runtimeFiles) {
    const source = read(...segments);
    const label = segments.join("/");

    for (const forbidden of [
      "MirrorDevice",
      "BTHWANI_MIRROR_DEVICE",
      "scrcpy",
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `${label} must not depend on ${forbidden}`,
      );
    }
  }
});