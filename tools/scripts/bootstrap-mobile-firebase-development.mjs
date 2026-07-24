import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFirebaseBootstrapPlan,
  extractFirebaseCliJson,
  normalizeFirebaseAndroidApps,
} from "../mobile/firebase-bootstrap.mjs";
import { validateGoogleServicesConfigFile } from "../mobile/google-services-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const manifestPath = path.join(root, "tools/mobile/mobile-apps.manifest.json");
const localSecretsMapPath = path.join(root, "secrets.local.mobile.json");

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const projectId = valueAfter(args, "--project", "bthwani");
const firebaseToolsVersion = valueAfter(args, "--firebase-tools-version", "15.24.0");
const defaultSecretsRoot = process.platform === "win32"
  ? "C:\\bthwani-secrets\\firebase"
  : path.join(root, ".tmp/firebase-secrets");
const secretsRoot = path.resolve(valueAfter(
  args,
  "--secrets-root",
  process.env.BTHWANI_FIREBASE_SECRETS_ROOT || defaultSecretsRoot,
));

for (const [flag, value] of [
  ["--project", projectId],
  ["--firebase-tools-version", firebaseToolsVersion],
  ["--secrets-root", secretsRoot],
]) {
  if (!value || String(value).startsWith("--")) fail(`${flag} requires a value`);
}

function pnpmExecutable() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return { command: process.execPath, prefix: [npmExecPath] };
  }
  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    prefix: [],
  };
}

function runFirebase(firebaseArgs, { quiet = false } = {}) {
  const invocation = pnpmExecutable();
  const commandArgs = [
    ...invocation.prefix,
    "dlx",
    `firebase-tools@${firebaseToolsVersion}`,
    ...firebaseArgs,
  ];
  const result = spawnSync(invocation.command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
    env: { ...process.env, CI: "1" },
  });

  if (!quiet) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) throw new Error(`Firebase CLI could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Firebase CLI failed (${firebaseArgs.join(" ")})${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout ?? "";
}

function listAndroidApps() {
  const output = runFirebase([
    "apps:list",
    "ANDROID",
    "--project",
    projectId,
    "--non-interactive",
    "--json",
  ], { quiet: true });
  return normalizeFirebaseAndroidApps(extractFirebaseCliJson(output));
}

function printPlan(plan) {
  console.table(plan.map((entry) => ({
    App: entry.appKey,
    Package: entry.packageName,
    Firebase: entry.action === "existing" ? "Exists" : "Create",
    AppId: entry.appId ?? "-",
    Destination: entry.destination,
  })));
}

function createMissingApps(plan) {
  for (const entry of plan.filter((item) => item.action === "create")) {
    console.log(`\nCreating Firebase Android app: ${entry.appKey} (${entry.packageName})`);
    runFirebase([
      "apps:create",
      "ANDROID",
      entry.displayName,
      "--package-name",
      entry.packageName,
      "--project",
      projectId,
      "--non-interactive",
      "--json",
    ]);
  }
}

function downloadAndValidateConfigs(plan) {
  const localSecretsMap = {};

  for (const entry of plan) {
    if (!entry.appId) throw new Error(`${entry.appKey}: Firebase App ID was not resolved`);

    const destinationDirectory = path.dirname(entry.destination);
    fs.mkdirSync(destinationDirectory, { recursive: true });
    const temporaryPath = path.join(
      destinationDirectory,
      `.google-services.${process.pid}.${Date.now()}.tmp.json`,
    );

    try {
      console.log(`\nDownloading ${entry.appKey} google-services.json`);
      runFirebase([
        "apps:sdkconfig",
        "ANDROID",
        entry.appId,
        "--project",
        projectId,
        "--non-interactive",
        "--out",
        temporaryPath,
      ]);

      const validation = validateGoogleServicesConfigFile(temporaryPath, entry.packageName);
      if (validation.projectId !== projectId) {
        throw new Error(`${entry.appKey}: expected Firebase project '${projectId}', found '${validation.projectId}'`);
      }

      fs.copyFileSync(temporaryPath, entry.destination);
      localSecretsMap[entry.appKey] = entry.destination;
      console.log(`PASS: ${entry.appKey} -> ${entry.destination}`);
    } finally {
      fs.rmSync(temporaryPath, { force: true });
    }
  }

  fs.writeFileSync(localSecretsMapPath, `${JSON.stringify(localSecretsMap, null, 2)}\n`, "utf8");
  console.log(`\nLocal Firebase path map: ${localSecretsMapPath}`);
}

try {
  if (!fs.existsSync(manifestPath)) fail(`mobile manifest is missing: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  console.log("BThwani Firebase Android Bootstrap");
  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Firebase CLI: ${firebaseToolsVersion}`);
  console.log(`Secrets root: ${secretsRoot}`);
  console.log("EAS mutation: disabled by design\n");

  const existingApps = listAndroidApps();
  let plan = buildFirebaseBootstrapPlan(manifest.apps, existingApps, secretsRoot);
  printPlan(plan);

  if (!apply) {
    console.log("\nDRY RUN PASS: no Firebase apps or local files were changed.");
    console.log("Apply with:");
    console.log("  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/bootstrap-mobile-firebase-development.ps1 -Apply");
    process.exit(0);
  }

  createMissingApps(plan);
  plan = buildFirebaseBootstrapPlan(manifest.apps, listAndroidApps(), secretsRoot);
  const unresolved = plan.filter((entry) => !entry.appId);
  if (unresolved.length > 0) {
    throw new Error(`Firebase apps are still unresolved: ${unresolved.map((entry) => entry.appKey).join(", ")}`);
  }

  downloadAndValidateConfigs(plan);

  console.log("\nPASS: all four Firebase Android apps exist and complete package-isolated configs were downloaded.");
  console.log("No EAS variables were created or changed.");
  console.log("Next: validate locally, then explicitly upload EAS project variables in a separate command.");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
