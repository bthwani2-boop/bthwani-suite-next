import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const { validateMobileDependencyClosure } = require("../mobile-dependency-closure.js");
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json"), "utf8"));

function fixture(mutator) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-mobile-deps-"));
  for (const appKey of Object.keys(manifest.apps)) {
    const source = path.join(repoRoot, "apps", appKey, "runtime", "package.json");
    const destination = path.join(root, "apps", appKey, "runtime", "package.json");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const pkg = JSON.parse(fs.readFileSync(source, "utf8"));
    mutator?.(appKey, pkg);
    fs.writeFileSync(destination, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return root;
}

test("canonical app dependencies are exact and SDK-aligned", () => {
  assert.doesNotThrow(() => validateMobileDependencyClosure(manifest, repoRoot));
});

test("undeclared native package fails closed", () => {
  const root = fixture((appKey, pkg) => {
    if (appKey === "app-client") pkg.dependencies["expo-av"] = `~${manifest.global.expoSdk}.0.0`;
  });
  try {
    assert.throws(
      () => validateMobileDependencyClosure(manifest, root),
      /app-client: undeclared or wrongly-owned dependencies: expo-av/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("mixed Expo SDK packages fail closed", () => {
  const mismatchedSdk = manifest.global.expoSdk - 1;
  const root = fixture((appKey, pkg) => {
    if (appKey === "app-field") pkg.dependencies.expo = `~${mismatchedSdk}.0.0`;
  });
  try {
    assert.throws(
      () => validateMobileDependencyClosure(manifest, root),
      new RegExp(`app-field: expo must belong to Expo SDK ${manifest.global.expoSdk}, found ~${mismatchedSdk}\\.0\\.0`),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Expo version-check exclusions cannot become a compatibility escape hatch", () => {
  const root = fixture((appKey, pkg) => {
    if (appKey === "app-captain") pkg.expo.install.exclude.push("react-native");
  });
  try {
    assert.throws(
      () => validateMobileDependencyClosure(manifest, root),
      /app-captain: expo\.install\.exclude must contain only typescript/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
