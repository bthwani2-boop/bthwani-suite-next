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
  `Refoundation operational-tooling check passed: eas-cli=${easVersion}, expo-doctor=${doctorVersion}, mobileApps=4, dockerVolumeBoundary=preserved.`,
);
