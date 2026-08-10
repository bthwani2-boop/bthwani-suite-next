import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "mobile-test-policy-gate";
const violations = [];
const manifestPath = "tools/mobile/mobile-apps.manifest.json";
const manifest = JSON.parse(read(manifestPath));
const apps = Object.keys(manifest.apps ?? {}).sort();
const expectedApps = ["app-captain", "app-client", "app-field", "app-partner"];

if (JSON.stringify(apps) !== JSON.stringify(expectedApps)) {
  violations.push({ file: manifestPath, line: 0, message: `MOBILE_APP_INVENTORY_DRIFT expected=${expectedApps.join(",")} actual=${apps.join(",")}` });
}

for (const appKey of apps) {
  const packagePath = `apps/${appKey}/runtime/package.json`;
  const testsRelative = `apps/${appKey}/runtime/tests`;
  const testsDir = path.join(repoRoot, testsRelative);
  if (!fs.existsSync(path.join(repoRoot, packagePath))) {
    violations.push({ file: packagePath, line: 0, message: "MOBILE_PACKAGE_MISSING" });
    continue;
  }

  const pkg = JSON.parse(read(packagePath));
  const scripts = pkg.scripts ?? {};
  const expected = {
    "test:app": "node --test tests/*.test.mjs",
    "test:runtime": `node ../../mobile/test-mobile-runtime-contract.mjs --app ${appKey}`,
    test: "pnpm run test:app && pnpm run test:runtime",
  };
  for (const [scriptName, command] of Object.entries(expected)) {
    if (scripts[scriptName] !== command) {
      violations.push({ file: packagePath, line: 0, message: `MOBILE_TEST_COMMAND_DRIFT ${scriptName}` });
    }
  }

  if (!fs.existsSync(testsDir)) {
    violations.push({ file: testsRelative, line: 0, message: "MOBILE_TEST_DIRECTORY_MISSING" });
    continue;
  }

  const testFiles = fs.readdirSync(testsDir).filter((name) => name.endsWith(".test.mjs")).sort();
  if (testFiles.length === 0) {
    violations.push({ file: testsRelative, line: 0, message: "MOBILE_OWNED_TESTS_MISSING" });
    continue;
  }
  if (!testFiles.some((name) => name.endsWith(".execution.test.mjs"))) {
    violations.push({ file: testsRelative, line: 0, message: "MOBILE_EXECUTION_TEST_MISSING" });
  }

  for (const name of testFiles) {
    const relative = `${testsRelative}/${name}`;
    const source = read(relative);
    if (/\|\|\s*true|process\.exit\(0\)|continue-on-error/i.test(source)) {
      violations.push({ file: relative, line: 0, message: "MOBILE_TEST_FALSE_SUCCESS_FORBIDDEN" });
    }
    for (const sibling of expectedApps) {
      if (sibling === appKey) continue;
      if (source.includes(`apps/${sibling}/runtime/`)) {
        violations.push({ file: relative, line: 0, message: `MOBILE_TEST_SIBLING_OWNERSHIP_FORBIDDEN ${sibling}` });
      }
    }
  }
}

const sharedTestsRelative = "apps/mobile/tests";
const sharedTestsDir = path.join(repoRoot, sharedTestsRelative);
if (!fs.existsSync(sharedTestsDir)) {
  violations.push({ file: sharedTestsRelative, line: 0, message: "MOBILE_SHARED_TEST_DIRECTORY_MISSING" });
} else if (!fs.readdirSync(sharedTestsDir).some((name) => name.endsWith(".test.mjs"))) {
  violations.push({ file: sharedTestsRelative, line: 0, message: "MOBILE_SHARED_TESTS_MISSING" });
}

const runtimeContract = read("apps/mobile/test-mobile-runtime-contract.mjs");
for (const marker of ["test:app", "test:runtime", "*.execution.test.mjs"]) {
  if (!runtimeContract.includes(marker)) {
    violations.push({ file: "apps/mobile/test-mobile-runtime-contract.mjs", line: 0, message: `MOBILE_RUNTIME_CONTRACT_POLICY_MISSING ${marker}` });
  }
}

const ciPath = ".github/workflows/ci-node-verification.yml";
const ci = read(ciPath);
for (const marker of [
  "node tools/guards/mobile-test-policy-gate.mjs",
  "node --test apps/mobile/tests/*.test.mjs",
  "pnpm exec nx run-many -t test --all --outputStyle=stream",
  "pnpm exec nx affected -t test --outputStyle=stream",
]) {
  if (!ci.includes(marker)) {
    violations.push({ file: ciPath, line: 0, message: `MOBILE_TEST_CI_BINDING_MISSING ${marker}` });
  }
}

fail(guardId, violations);
