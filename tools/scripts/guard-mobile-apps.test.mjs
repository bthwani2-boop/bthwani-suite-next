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

function createCompleteFirebaseFile(filename, packageName, overrides = {}) {
  const filepath = path.join(tmpDir, filename);
  const content = {
    project_info: {
      project_number: "806591977022",
      project_id: "bthwani",
      storage_bucket: "bthwani.firebasestorage.app",
    },
    client: [
      {
        client_info: {
          mobilesdk_app_id: `1:806591977022:android:${packageName.replace(/[^a-z0-9]/gi, "")}`,
          android_client_info: {
            package_name: packageName,
          },
        },
        api_key: [
          {
            current_key: "test-only-firebase-api-key",
          },
        ],
      },
    ],
    configuration_version: "1",
    ...overrides,
  };
  fs.writeFileSync(filepath, JSON.stringify(content), "utf8");
  return filepath;
}

function createIncompleteFirebaseFile(filename, packageName) {
  const filepath = path.join(tmpDir, filename);
  fs.writeFileSync(filepath, JSON.stringify({
    client: [
      {
        client_info: {
          android_client_info: {
            package_name: packageName,
          },
        },
      },
    ],
  }), "utf8");
  return filepath;
}

function cleanProviderEnvironment(overrides = {}) {
  const environment = { ...process.env };
  const providerVariablePattern = /^(?:GOOGLE_SERVICES_JSON|GOOGLE_MAPS_(?:ANDROID|IOS)_API_KEY|SENTRY_|EXPO_PUBLIC_SENTRY_|BTHWANI_SENTRY_|BTHWANI_APP_ENV)/;

  for (const name of Object.keys(environment)) {
    if (providerVariablePattern.test(name)) delete environment[name];
  }

  return { ...environment, ...overrides };
}

function runGuard(args, env = {}) {
  return spawnSync(
    process.execPath,
    ["tools/scripts/guard-mobile-apps.mjs", ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: cleanProviderEnvironment(env),
    },
  );
}

test("guard-mobile-apps: development without Maps succeeds when complete Firebase is present", () => {
  setupTmp();
  try {
    const clientFb = createCompleteFirebaseFile("client-fb.json", "com.bthwani.client.next");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: clientFb },
    );
    assert.equal(res.status, 0, `Expected status 0, stderr: ${res.stderr}, stdout: ${res.stdout}`);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: captain development does not require a Maps key", () => {
  setupTmp();
  try {
    const captainFb = createCompleteFirebaseFile("captain-dev-fb.json", "com.bthwani.captain.next");
    const res = runGuard(
      ["--app", "app-captain", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      {
        GOOGLE_SERVICES_JSON_APP_CAPTAIN: captainFb,
      },
    );
    assert.equal(res.status, 0, `Development must allow the captain fallback without Maps. Stderr: ${res.stderr}`);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: internal without Maps fails when app has maps feature", () => {
  setupTmp();
  try {
    const captainFb = createCompleteFirebaseFile("captain-fb.json", "com.bthwani.captain.next");
    const res = runGuard(
      ["--app", "app-captain", "--require-build-secrets", "--platform", "android", "--profile", "internal"],
      { GOOGLE_SERVICES_JSON_APP_CAPTAIN: captainFb },
    );
    assert.notEqual(res.status, 0, "Expected failure for internal without Maps key");
    assert.match(res.stderr, /GOOGLE_MAPS_ANDROID_API_KEY is required/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: production without Maps fails when app has maps feature", () => {
  setupTmp();
  try {
    const captainFb = createCompleteFirebaseFile("captain-fb.json", "com.bthwani.captain.next");
    const res = runGuard(
      ["--app", "app-captain", "--require-build-secrets", "--platform", "android", "--profile", "production"],
      { GOOGLE_SERVICES_JSON_APP_CAPTAIN: captainFb },
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
    const wrongFb = createCompleteFirebaseFile("wrong-fb.json", "com.wrong.package");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: wrongFb },
    );
    assert.notEqual(res.status, 0, "Expected failure for wrong package name in Firebase file");
    assert.match(res.stderr, /Android package 'com\.bthwani\.client\.next' is required/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: incomplete placeholder Firebase file fails", () => {
  setupTmp();
  try {
    const incompleteFb = createIncompleteFirebaseFile("incomplete-fb.json", "com.bthwani.client.next");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      { GOOGLE_SERVICES_JSON_APP_CLIENT: incompleteFb },
    );
    assert.notEqual(res.status, 0, "Expected failure for a package-only placeholder file");
    assert.match(res.stderr, /project_info is required/);
    assert.match(res.stderr, /mobilesdk_app_id/);
    assert.match(res.stderr, /api_key\.current_key/);
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
      { GOOGLE_SERVICES_JSON_APP_CLIENT: invalidFb },
    );
    assert.notEqual(res.status, 0, "Expected failure for invalid JSON");
    assert.match(res.stderr, /file is not valid JSON/);
  } finally {
    cleanupTmp();
  }
});

test("guard-mobile-apps: non-existent Firebase file fails", () => {
  const nonExistent = path.join(root, ".tmp", "non-existent-fb.json");
  const res = runGuard(
    ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
    { GOOGLE_SERVICES_JSON_APP_CLIENT: nonExistent },
  );
  assert.notEqual(res.status, 0, "Expected failure for non-existent Firebase file");
  assert.match(res.stderr, /file does not exist/);
});

test("guard-mobile-apps: building a single app does not require Firebase files for other apps", () => {
  setupTmp();
  try {
    const clientFb = createCompleteFirebaseFile("client-fb.json", "com.bthwani.client.next");
    const res = runGuard(
      ["--app", "app-client", "--require-build-secrets", "--platform", "android", "--profile", "development"],
      {
        GOOGLE_SERVICES_JSON_APP_CLIENT: clientFb,
      },
    );
    assert.equal(res.status, 0, `Single app check failed when other app files were absent. Stderr: ${res.stderr}`);
  } finally {
    cleanupTmp();
  }
});
