import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tmpDir = path.join(root, ".tmp", "test-guard-firebase");

function setupTmp() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function cleanupTmp() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function createDummyFirebaseFile(filename, packageName) {
  const filepath = path.join(tmpDir, filename);
  const content = JSON.stringify({
    client: [
      {
        client_info: {
          android_client_info: {
            package_name: packageName,
          },
        },
      },
    ],
  });
  fs.writeFileSync(filepath, content, "utf8");
  return filepath;
}

function runGuard(args, env = {}) {
  return spawnSync(
    process.execPath,
    ["tools/scripts/guard-mobile-apps.mjs", ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
      },
    }
  );
}

test("guard-mobile-apps: Development without Maps succeeds when correct Firebase is present", () => {
  setupTmp();
  try {
    const clientFb = createDummyFirebaseFile("client-fb.json", "com.bthwani.client.next");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: clientFb }
    );
    assert.equal(res.status, 0, `Expected status 0, stderr: ${res.stderr}, stdout: ${res.stdout}`);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: Internal without Maps fails when app has maps feature", () => {
  setupTmp();
  try {
    const captainFb = createDummyFirebaseFile("captain-fb.json", "com.bthwani.captain.next");
    const res = runGuard(
      ["--app", "app-captain", "--require-build-secrets", "--platform", "android", "--profile", "internal"],
      { GOOGLE_SERVICES_JSON_APP_CAPTAIN: captainFb, GOOGLE_MAPS_ANDROID_API_KEY: "" }
    );
    assert.notEqual(res.status, 0, "Expected failure for internal without Maps key");
    assert.match(res.stderr, /GOOGLE_MAPS_ANDROID_API_KEY is required/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: Production without Maps fails when app has maps feature", () => {
  setupTmp();
  try {
    const captainFb = createDummyFirebaseFile("captain-fb.json", "com.bthwani.captain.next");
    const res = runGuard(
      ["--app", "app-captain", "--require-build-secrets", "--platform", "android", "--profile", "production"],
      { GOOGLE_SERVICES_JSON_APP_CAPTAIN: captainFb, GOOGLE_MAPS_ANDROID_API_KEY: "" }
    );
    assert.notEqual(res.status, 0, "Expected failure for production without Maps key");
    assert.match(res.stderr, /GOOGLE_MAPS_ANDROID_API_KEY is required/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: Firebase file with wrong package fails", () => {
  setupTmp();
  try {
    const wrongFb = createDummyFirebaseFile("wrong-fb.json", "com.wrong.package");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: wrongFb }
    );
    assert.notEqual(res.status, 0, "Expected failure for wrong package name in Firebase file");
    assert.match(res.stderr, /must contain Android package 'com\.bthwani\.client\.next'/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: Firebase file with invalid JSON fails", () => {
  setupTmp();
  try {
    const invalidFb = path.join(tmpDir, "invalid-fb.json");
    fs.writeFileSync(invalidFb, "{ invalid json ...", "utf8");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: invalidFb }
    );
    assert.notEqual(res.status, 0, "Expected failure for invalid JSON in Firebase file");
    assert.match(res.stderr, /is not valid JSON/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: Non-existent Firebase file fails", () => {
  const nonExistent = path.join(root, ".tmp", "non-existent-fb.json");
  const res = runGuard(
    ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
    { GOOGLE_SERVICES_JSON_APP_CLIENT: nonExistent }
  );
  assert.notEqual(res.status, 0, "Expected failure for non-existent Firebase file");
  assert.match(res.stderr, /GOOGLE_SERVICES_JSON does not point to an existing file/);
});

test("guard-mobile-apps: Building a single app does NOT require Firebase files for other apps", () => {
  setupTmp();
  try {
    const clientFb = createDummyFirebaseFile("client-fb.json", "com.bthwani.client.next");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      {
        GOOGLE_SERVICES_JSON_APP_CLIENT: clientFb,
        GOOGLE_SERVICES_JSON_APP_PARTNER: "",
        GOOGLE_SERVICES_JSON_APP_CAPTAIN: "",
        GOOGLE_SERVICES_JSON_APP_FIELD: "",
        GOOGLE_SERVICES_JSON: "",
      }
    );
    assert.equal(res.status, 0, `Single app check failed when other app files were absent. Stderr: ${res.stderr}`);
  } finally {
    cleanupTmp();
  }
});
