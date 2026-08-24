// Keeps the development identity fixture registry aligned with the explicit
// one-shot seed overlay. The production runtime and identity-api are checked
// to ensure they contain no bootstrap authority or credential wiring.
import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, read, repoRoot } from "./_guard-utils.mjs";
import { LOCAL_ACTORS, LOCAL_PLATFORM_ACTORS, LOCAL_WORKFORCE_PROVIDERS, localPasswordDefault } from "../dev/local-actors.mjs";

const guardId = "local-dev-actors-gate";
const violations = [];
const registryFile = "tools/dev/local-actors.json";
const devOverlayFile = "infra/docker/compose.dev-bootstrap.yml";
const runtimeComposeFile = "infra/docker/compose.runtime.yml";
const identityMainFile = "core/identity/backend/cmd/identity-api/main.go";
const seedCommandFile = "core/identity/backend/cmd/identity-local-bootstrap/main.go";

const registry = JSON.parse(read(registryFile));
const password = localPasswordDefault();
if (registry.passwordEnvVar !== "BTHWANI_LOCAL_DEV_PASSWORD") {
  violations.push({ file: registryFile, message: "DEV_PASSWORD_ENV_MUST_BE_BTHWANI_LOCAL_DEV_PASSWORD" });
}

const overlay = read(devOverlayFile);
if (!overlay.includes("identity-local-bootstrap") || !overlay.includes("Dockerfile.local-bootstrap")) {
  violations.push({ file: devOverlayFile, message: "DEVELOPMENT_SEED_OVERLAY_NOT_BOUND_TO_SEPARATE_EXECUTABLE" });
}
if (!overlay.includes("BTHWANI_LOCAL_DEV_PASSWORD:-123456")) {
  violations.push({ file: devOverlayFile, message: "DEVELOPMENT_SEED_PASSWORD_DEFAULT_NOT_FOUND" });
} else if (!overlay.includes(`BTHWANI_LOCAL_DEV_PASSWORD:-${password}`)) {
  violations.push({ file: devOverlayFile, message: "LOCAL_PASSWORD_DRIFT" });
}

for (const [file, source] of [
  [runtimeComposeFile, read(runtimeComposeFile)],
  [identityMainFile, read(identityMainFile)],
]) {
  for (const forbidden of ["IDENTITY_LOCAL_BOOTSTRAP", "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD", "identity-local-bootstrap"]) {
    const index = source.indexOf(forbidden);
    if (index >= 0) {
      violations.push({ file, line: lineNumber(source, index), message: `PRODUCTION_BOOTSTRAP_RESIDUE:${forbidden}` });
    }
  }
}

const seedSource = read(seedCommandFile);
for (const required of ["BTHWANI_RUNTIME_MODE", "BTHWANI_LOCAL_DEV_PASSWORD", "localbootstrap.Run"]) {
  if (!seedSource.includes(required)) {
    violations.push({ file: seedCommandFile, message: `SEED_COMMAND_MISSING:${required}` });
  }
}

for (const [key, actor] of Object.entries({ ...LOCAL_ACTORS, ...LOCAL_PLATFORM_ACTORS })) {
  if (!actor.actorId || !actor.username || !actor.role || !actor.phoneE164) {
    violations.push({ file: registryFile, message: `LOCAL_ACTOR_INCOMPLETE:${key}` });
  }
}
for (const [key, provider] of Object.entries(LOCAL_WORKFORCE_PROVIDERS)) {
  if (provider.username || provider.actorId) {
    violations.push({ file: registryFile, message: `WORKFORCE_PROVIDER_FIXED_IDENTITY:${key}` });
  }
}

const scannedRoots = ["tools/scripts", "tools/guards", "infra/docker/scripts", "tools/mobile"];
const scannedExtensions = new Set([".ps1", ".mjs", ".js"]);
const allowedFiles = new Set([registryFile, "tools/dev/local-actors.mjs", "tools/dev/local-actors.ps1", `tools/guards/${path.basename(import.meta.url)}`]);

function walk(dir, files = []) {
  const abs = path.join(repoRoot, dir);
  if (!fs.existsSync(abs)) return files;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(rel, files);
    } else if (scannedExtensions.has(path.extname(entry.name))) {
      files.push(rel);
    }
  }
  return files;
}

const loginCallSite = /(?:username\s*[=:]\s*|-Username\s+|getToken\(|Get-ActorToken\b[^\n]*|Get-LocalActorToken\s+|Get-ActorSession\s+|Login-Actor\s+|Login-PlatformLocalActor\b[^\n]*|\bLogin\s+)["']([^"']+)["']/g;
const loginUsernames = new Set(
  [...Object.values(LOCAL_ACTORS), ...Object.values(LOCAL_PLATFORM_ACTORS)].map((actor) => actor.username),
);

for (const file of scannedRoots.flatMap((dir) => walk(dir))) {
  if (allowedFiles.has(file)) continue;
  const content = read(file);
  const literal = content.indexOf(`"${password}"`) >= 0 ? content.indexOf(`"${password}"`) : content.indexOf(`'${password}'`);
  if (literal >= 0) {
    violations.push({ file, line: lineNumber(content, literal), message: "HARDCODED_LOCAL_PASSWORD" });
  }
  let match;
  loginCallSite.lastIndex = 0;
  while ((match = loginCallSite.exec(content))) {
    if (loginUsernames.has(match[1])) {
      violations.push({ file, line: lineNumber(content, match.index), message: `HARDCODED_LOCAL_USERNAME:${match[1]}` });
    }
  }
}

fail(guardId, violations);
