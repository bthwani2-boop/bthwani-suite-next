import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const commonEnv = {
  ...process.env,
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  EAS_SKIP_AUTO_FINGERPRINT: "1"
};

function bin(command) {
  if (process.platform === "win32" && command === "pnpm") {
    return "pnpm.cmd";
  }

  return command;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(bin(command), args, {
    cwd,
    shell: false,
    encoding: "utf8",
    env: commonEnv
  });

  if (result.error) {
    fail(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    fail(`${command} ${args.join(" ")} failed`);
  }

  return result.stdout;
}

const manifest = readJson("tools/mobile/mobile-apps.manifest.json");
const rootPkg = readJson("package.json");

if (rootPkg.packageManager !== `pnpm@${manifest.global.pnpm}`) {
  fail(`root packageManager must be pnpm@${manifest.global.pnpm}`);
}

if (rootPkg.engines?.node !== `>=${manifest.global.node} <25`) {
  fail("root node engine mismatch");
}

if (rootPkg.engines?.pnpm !== manifest.global.pnpm) {
  fail(`root pnpm engine must be ${manifest.global.pnpm}`);
}

if (rootPkg.pnpm) {
  fail("root package.json must not contain pnpm config; use pnpm-workspace.yaml");
}

for (const [key, app] of Object.entries(manifest.apps)) {
  const dir = path.join(root, "apps", key, "runtime");

  const pkg = readJson(path.join("apps", key, "runtime", "package.json"));
  const eas = readJson(path.join("apps", key, "runtime", "eas.json"));

  if (pkg.devDependencies?.typescript !== "~6.0.3") {
    fail(`${key}: TypeScript must be ~6.0.3`);
  }

  if (eas.build?.base?.node !== manifest.global.node) {
    fail(`${key}: EAS node must be ${manifest.global.node}`);
  }

  if (eas.build?.base?.pnpm !== manifest.global.pnpm) {
    fail(`${key}: EAS pnpm must be ${manifest.global.pnpm}`);
  }

  if (Object.prototype.hasOwnProperty.call(eas.build?.base ?? {}, "corepack")) {
    fail(`${key}: EAS base must not contain corepack`);
  }

  if (eas.build?.development?.developmentClient !== true) {
    fail(`${key}: developmentClient must be true`);
  }

  if (eas.build?.development?.distribution !== "internal") {
    fail(`${key}: development distribution must be internal`);
  }

  if (eas.build?.development?.android?.buildType !== "apk") {
    fail(`${key}: development android.buildType must be apk`);
  }

  if (eas.build?.production?.android?.buildType !== "app-bundle") {
    fail(`${key}: production android.buildType must be app-bundle`);
  }

  const raw = run("pnpm", ["--dir", dir, "exec", "expo", "config", "--json"], root);
  const jsonStart = raw.indexOf("{");

  if (jsonStart < 0) {
    fail(`${key}: expo config did not return JSON`);
  }

  const expo = JSON.parse(raw.slice(jsonStart));

  if (expo.name !== app.name) fail(`${key}: name mismatch`);
  if (expo.slug !== app.slug) fail(`${key}: slug mismatch`);
  if (expo.owner !== manifest.global.owner) fail(`${key}: owner mismatch`);
  if (expo.scheme !== app.scheme) fail(`${key}: scheme mismatch`);
  if (expo.android?.package !== app.androidPackage) fail(`${key}: android package mismatch`);
  if (expo.ios?.bundleIdentifier !== app.iosBundleIdentifier) fail(`${key}: ios bundleIdentifier mismatch`);
  if (expo.extra?.appKey !== key) fail(`${key}: extra.appKey mismatch`);
  if (expo.extra?.appLine !== manifest.global.appLine) fail(`${key}: extra.appLine mismatch`);
  if (expo.extra?.sourceRepo !== manifest.global.sourceRepo) fail(`${key}: extra.sourceRepo mismatch`);
  if (expo.extra?.eas?.projectId !== app.projectId) fail(`${key}: EAS projectId mismatch`);

  if (Array.isArray(expo.platforms) && expo.platforms.includes("web")) {
    fail(`${key}: web is forbidden in Expo mobile config`);
  }
}

const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");

if (!workspace.includes("apps/*/runtime")) {
  fail("pnpm-workspace.yaml must include apps/*/runtime");
}

if (!workspace.includes("allowBuilds:")) {
  fail("pnpm-workspace.yaml must define allowBuilds");
}

if (workspace.includes("onlyBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use onlyBuiltDependencies");
}

if (workspace.includes("ignoredBuiltDependencies")) {
  fail("pnpm-workspace.yaml must not use ignoredBuiltDependencies");
}

console.log("PASS: mobile apps resolved Expo/EAS config is centrally guarded");
