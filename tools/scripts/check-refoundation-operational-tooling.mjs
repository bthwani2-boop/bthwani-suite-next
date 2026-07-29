import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required operational tooling path: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function json(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function normalizedJson(value) {
  return JSON.stringify(value);
}

const packageJson = json("package.json");
const scripts = packageJson?.scripts ?? {};
const toolchain = json("shared/config/toolchain-lock.json");
const easVersion = toolchain?.locked?.easCli;
const doctorVersion = toolchain?.locked?.expoDoctor;
expect(/^\d+\.\d+\.\d+$/.test(easVersion ?? ""), "locked.easCli must be an exact semantic version");
expect(/^\d+\.\d+\.\d+$/.test(doctorVersion ?? ""), "locked.expoDoctor must be an exact semantic version");
expect(toolchain?.rules?.operationalCliVersionsMustBePinned === true, "operational CLI pin rule must remain enabled");

const easTemplate = json("tools/mobile/eas.template.json");
expect(easTemplate?.cli?.version === easVersion, "EAS template cli.version must match toolchain lock");
expect(easTemplate?.cli?.requireCommit === true, "EAS template must require a commit");
expect(easTemplate?.cli?.appVersionSource === "remote", "EAS template must use remote app versions");

for (const appKey of ["app-client", "app-partner", "app-captain", "app-field"]) {
  const appPath = `apps/${appKey}/runtime/eas.json`;
  const appEas = json(appPath);
  expect(appEas?.cli?.version === easVersion, `${appPath} cli.version must match toolchain lock`);
  expect(
    normalizedJson(appEas) === normalizedJson(easTemplate),
    `${appPath} must remain exactly synchronized with tools/mobile/eas.template.json`,
  );
}

const canonicalMobileScripts = [
  "apps/mobile/eas-build-mobile.mjs",
  "apps/mobile/eas/providers.ps1",
  "apps/mobile/eas/workflow.ps1",
  "tools/scripts/eas-build-mobile.mjs",
  "tools/scripts/mobile-eas.ps1",
  "tools/scripts/sync-mobile-apps.mjs",
];
for (const relativePath of canonicalMobileScripts) {
  const content = read(relativePath);
  expect(!/@latest\b/.test(content), `${relativePath} must not use @latest`);
}
expect(
  read("apps/mobile/eas-build-mobile.mjs").includes("shared/config/toolchain-lock.json"),
  "Canonical EAS build engine must read the central toolchain lock",
);
expect(
  read("apps/mobile/eas/providers.ps1").includes("Get-PinnedEasCliSpecifier"),
  "Canonical EAS provider workflow must resolve the pinned CLI",
);
expect(
  read("tools/scripts/sync-mobile-apps.mjs").includes("locked?.expoDoctor"),
  "Mobile synchronization preflight must resolve pinned Expo Doctor",
);

const downRuntime = read("infra/docker/scripts/down-runtime.ps1");
expect(/\bdown\s+--remove-orphans\b/.test(downRuntime), "Docker down must retain the non-destructive down route");
expect(!/\bdown\b[^\r\n]*(?:\s-v\b|--volumes\b)/.test(downRuntime), "Ordinary Docker down must not remove volumes");

const resetRuntime = read("infra/docker/scripts/reset-runtime.ps1");
expect(/\bdown\s+-v\s+--remove-orphans\b/.test(resetRuntime), "Volume deletion must remain explicit in reset-runtime.ps1");

const dockerConfigCheck = read("tools/scripts/check-refoundation-docker-config.ps1");
expect(dockerConfigCheck.includes('config", "--quiet"'), "Docker configuration check must use config --quiet");
expect(!/\b(?:up|down|stop|rm|reset)\b/.test(dockerConfigCheck.replace(/configuration/gi, "")), "Docker configuration check must not start, stop, reset, or remove runtime resources");

const platformRuntime = read("tools/scripts/invoke-platform-foundation-runtime.ps1");
for (const marker of [
  '"--profile", "providers"',
  '"--profile", "platform"',
  'foreach ($service in @("providers", "platform-control"))',
  'http://localhost:58087/providers/readiness',
  'http://localhost:58088/platform/readiness',
  '001_create_runtime_databases.sh',
]) {
  expect(platformRuntime.includes(marker), `Platform foundation runtime is missing ${marker}`);
}
expect(!/\bdown\b[^\r\n]*(?:\s-v\b|--volumes\b)/.test(platformRuntime), "Platform foundation runtime down must not delete volumes");

const fullRuntime = read("tools/scripts/invoke-full-runtime.ps1");
for (const marker of [
  "invoke-platform-foundation-runtime.ps1",
  "identity,workforce,dsh,wlt,financial-simulators,mail,media",
  'ValidateSet("up", "down", "migrate", "smoke", "status", "bootstrap-dev", "reset", "rebuild-reset")',
  "Assert-DestructiveActionAuthorized",
  'Action = "reset"',
  'Action = "all"',
]) {
  expect(fullRuntime.includes(marker), `True full runtime is missing ${marker}`);
}
expect(!/\bdown\b[^\r\n]*(?:\s-v\b|--volumes\b)/.test(fullRuntime), "True full runtime ordinary down must not delete volumes");
expect(
  scripts["runtime:full:reset"]?.includes("-Force") === true,
  "runtime:full:reset must require explicit -Force",
);
expect(
  scripts["runtime:full:rebuild-reset"]?.includes("-Force") === true,
  "runtime:full:rebuild-reset must require explicit -Force",
);
for (const scriptName of [
  "runtime:full",
  "runtime:full:up",
  "runtime:full:bootstrap-dev",
  "runtime:full:down",
  "runtime:full:reset",
  "runtime:full:smoke",
  "runtime:full:migrate",
  "runtime:full:status",
  "runtime:full:rebuild-reset",
]) {
  expect(
    scripts[scriptName]?.includes("tools/scripts/invoke-full-runtime.ps1") === true,
    `${scriptName} must use the true full-runtime orchestrator`,
  );
}

const destructiveRuntime = read("tools/scripts/invoke-destructive-runtime.ps1");
for (const marker of [
  'ValidateSet("reset", "all")',
  "if (-not $Force)",
  "infra/docker/scripts/runtime.ps1",
  "-Force",
]) {
  expect(destructiveRuntime.includes(marker), `Destructive runtime wrapper is missing ${marker}`);
}
for (const scriptName of [
  "docker:runtime:reset",
  "runtime:reset",
  "runtime:all:rebuild-reset",
  "runtime:identity:rebuild-reset",
  "runtime:wlt:rebuild-reset",
  "runtime:dev-core:rebuild-reset",
  "runtime:dev-financial:rebuild-reset",
]) {
  expect(
    scripts[scriptName]?.includes("tools/scripts/invoke-destructive-runtime.ps1") === true,
    `${scriptName} must use the Force-guarded destructive runtime wrapper`,
  );
  expect(scripts[scriptName]?.includes("-Force") === true, `${scriptName} must pass explicit -Force`);
}

const nextBundleDiagnostics = read("tools/scripts/run-next-bundle-diagnostics.mjs");
for (const marker of [
  'process.platform === "win32" ? "pnpm.cmd" : "pnpm"',
  'ANALYZE: "true"',
  'shell: false',
]) {
  expect(nextBundleDiagnostics.includes(marker), `Portable Next bundle diagnostics is missing ${marker}`);
}
expect(
  scripts["diagnostics:next-bundle"] === "node tools/scripts/run-next-bundle-diagnostics.mjs",
  "diagnostics:next-bundle must use the cross-platform Node launcher",
);

const refoundationVerification = read("tools/scripts/run-refoundation-verification.ps1");
expect(refoundationVerification.includes("runtime:full:down"), "Runtime verification must stop the full runtime");
expect(refoundationVerification.includes("Invoke-BestEffortRuntimeDown"), "Runtime verification must clean partial startup");
expect(!/runtime:[^"'\s]*(?:reset|rebuild-reset)/i.test(refoundationVerification), "Refoundation verification must never invoke reset or rebuild-reset");
expect(!/docker\s+compose[^\r\n]*(?:\s-v\b|--volumes\b)/i.test(refoundationVerification), "Refoundation verification must never delete Docker volumes directly");

const gitignore = read(".gitignore");
for (const marker of [
  ".env",
  ".env.*",
  "secrets.local.mobile.json",
  "tools/scripts/google-cloud/google-platform-input.local.json",
  "apps/*/runtime/google-services.json",
  "apps/*/runtime/credentials.json",
  "*.pem",
  "*.key",
  "*.p8",
  "*.p12",
]) {
  expect(gitignore.split(/\r?\n/).includes(marker), `.gitignore must protect ${marker}`);
}
expect(!gitignore.split(/\r?\n/).includes("**/*.md"), ".gitignore must not hide all Markdown files");
expect(!gitignore.split(/\r?\n/).includes("**/*.txt"), ".gitignore must not hide all text files");

if (failures.length > 0) {
  console.error("Refoundation operational-tooling check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Refoundation operational-tooling check passed: eas-cli=${easVersion}, expo-doctor=${doctorVersion}, mobileApps=4, trueFullRuntime=preserved, destructiveAliases=guarded, portableDiagnostics=preserved, dockerVolumeBoundary=preserved.`,
);
