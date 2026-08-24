// Enforces one canonical authority for local-development Identity fixtures.
// The fixture registry is data-only. The privileged writer is a separate one-shot
// development binary; the production-capable identity-api must never contain or
// receive bootstrap authority.
import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, read, repoRoot } from "./_guard-utils.mjs";
import {
  LOCAL_ACTORS,
  LOCAL_PLATFORM_ACTORS,
  LOCAL_WORKFORCE_PROVIDERS,
  localPasswordDefault,
} from "../dev/local-actors.mjs";

const guardId = "local-dev-actors-gate";
const violations = [];

const registryFile = "tools/dev/local-actors.json";
const goBootstrapFile = "core/identity/backend/internal/identity/repository.go";
const goPlatformBootstrapFile = "core/identity/backend/internal/identity/platform_local_bootstrap.go";
const apiMainFile = "core/identity/backend/cmd/identity-api/main.go";
const apiDockerfile = "core/identity/backend/Dockerfile";
const bootstrapMainFile = "core/identity/backend/cmd/identity-local-bootstrap/main.go";
const bootstrapDockerfile = "core/identity/backend/Dockerfile.local-bootstrap";
const composeFile = "infra/docker/compose.runtime.yml";
const envExampleFile = "infra/docker/env/runtime.env.example";
const localProductionEnvFile = "infra/docker/env/runtime.local-production.env.example";

const password = localPasswordDefault();

// 1. Go fixture definitions must match the registry.
const goSource = read(goBootstrapFile);
const goTable = goSource.match(/actors := \[\]struct \{\s*id, username, role, phone string\s*\}\{([\s\S]*?)\n\t\}/);
if (!goTable) {
  violations.push({ file: goBootstrapFile, message: "LOCAL_BOOTSTRAP_ACTOR_TABLE_NOT_FOUND" });
} else {
  const declared = new Map();
  const rowRegex = /\{"([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\}/g;
  let row;
  while ((row = rowRegex.exec(goTable[1]))) {
    const [, id, username, role, phone] = row;
    declared.set(id, { actorId: id, username, role, phoneE164: phone });
  }
  for (const [key, expected] of Object.entries(LOCAL_ACTORS)) {
    const actual = declared.get(expected.actorId);
    if (!actual) {
      violations.push({ file: goBootstrapFile, message: `LOCAL_ACTOR_MISSING_IN_BOOTSTRAP:${key}` });
      continue;
    }
    for (const field of ["username", "role", "phoneE164"]) {
      if (actual[field] !== expected[field]) {
        violations.push({
          file: goBootstrapFile,
          line: lineNumber(goSource, goSource.indexOf(`"${actual.actorId}"`)),
          message: `LOCAL_ACTOR_DRIFT:${key}.${field}`,
        });
      }
    }
    declared.delete(expected.actorId);
  }
  for (const orphan of declared.keys()) {
    violations.push({ file: goBootstrapFile, message: `LOCAL_ACTOR_MISSING_IN_REGISTRY:${orphan}` });
  }
}

// Workforce is the sole owner of field/captain actor creation.
for (const [key, provider] of Object.entries(LOCAL_WORKFORCE_PROVIDERS)) {
  for (const forbidden of [provider.phoneE164, `${key}-local-001`]) {
    const index = goSource.indexOf(`"${forbidden}"`);
    if (index >= 0) {
      violations.push({
        file: goBootstrapFile,
        line: lineNumber(goSource, index),
        message: `WORKFORCE_PROVIDER_IN_BOOTSTRAP:${key}`,
      });
    }
  }
  if (provider.username || provider.actorId) {
    violations.push({ file: registryFile, message: `WORKFORCE_PROVIDER_FIXED_IDENTITY:${key}` });
  }
}

const goPlatformSource = read(goPlatformBootstrapFile);
for (const [key, expected] of Object.entries(LOCAL_PLATFORM_ACTORS)) {
  for (const value of [expected.actorId, expected.username, expected.role, expected.phoneE164]) {
    if (!goPlatformSource.includes(`"${value}"`)) {
      violations.push({ file: goPlatformBootstrapFile, message: `LOCAL_PLATFORM_ACTOR_DRIFT:${key}:${value}` });
    }
  }
}

// 2. Production-capable Identity runtime has zero development-bootstrap entry authority.
const apiMainSource = read(apiMainFile);
for (const forbidden of [
  "BootstrapLocalActors",
  "BootstrapLocalPlatformActors",
  "BootstrapSovereignLeadershipAccess",
  "ReconcileLocalBootstrapSecurityState",
  "LocalBootstrapConverged",
  "superviseLocalBootstrap",
  "IDENTITY_LOCAL_BOOTSTRAP",
  "BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD",
  "BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED",
]) {
  const index = apiMainSource.indexOf(forbidden);
  if (index >= 0) {
    violations.push({ file: apiMainFile, line: lineNumber(apiMainSource, index), message: `PRODUCTION_IDENTITY_BOOTSTRAP_AUTHORITY:${forbidden}` });
  }
}
const apiDockerSource = read(apiDockerfile);
if (apiDockerSource.includes("identity-local-bootstrap")) {
  violations.push({ file: apiDockerfile, message: "PRODUCTION_IDENTITY_IMAGE_CONTAINS_LOCAL_BOOTSTRAP" });
}

// 3. The separate one-shot binary owns the local writer and is fail-closed.
const bootstrapMainSource = read(bootstrapMainFile);
for (const required of [
  "BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED",
  "BTHWANI_RUNTIME_MODE",
  "BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED",
  "BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD",
  "BootstrapLocalActors",
  "BootstrapLocalPlatformActors",
  "BootstrapSovereignLeadershipAccess",
  "ReconcileLocalBootstrapSecurityState",
  "LocalBootstrapConverged",
]) {
  if (!bootstrapMainSource.includes(required)) {
    violations.push({ file: bootstrapMainFile, message: `LOCAL_BOOTSTRAP_REQUIRED_FENCE_OR_WRITE_MISSING:${required}` });
  }
}
const bootstrapDockerSource = read(bootstrapDockerfile);
if (!bootstrapDockerSource.includes("./cmd/identity-local-bootstrap") || bootstrapDockerSource.includes("./cmd/identity-api")) {
  violations.push({ file: bootstrapDockerfile, message: "LOCAL_BOOTSTRAP_IMAGE_BOUNDARY_INVALID" });
}

// 4. Compose must route local fixture writes through the one-shot service only.
const composeSource = read(composeFile);
const apiStart = composeSource.indexOf("  identity-api:");
const bootstrapStart = composeSource.indexOf("  identity-local-bootstrap:");
const workforceStart = composeSource.indexOf("  workforce-api:");
if (apiStart < 0 || bootstrapStart <= apiStart || workforceStart <= bootstrapStart) {
  violations.push({ file: composeFile, message: "IDENTITY_COMPOSE_SERVICE_BOUNDARIES_NOT_FOUND" });
} else {
  const apiBlock = composeSource.slice(apiStart, bootstrapStart);
  const bootstrapBlock = composeSource.slice(bootstrapStart, workforceStart);
  for (const forbidden of ["IDENTITY_LOCAL_BOOTSTRAP", "BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD", "BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED"]) {
    if (apiBlock.includes(forbidden)) {
      violations.push({ file: composeFile, line: lineNumber(composeSource, apiStart + apiBlock.indexOf(forbidden)), message: `IDENTITY_API_RECEIVES_LOCAL_BOOTSTRAP_CONFIG:${forbidden}` });
    }
  }
  for (const required of [
    "Dockerfile.local-bootstrap",
    "BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED",
    "BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD",
    "BTHWANI_RUNTIME_MODE",
    "BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED",
  ]) {
    if (!bootstrapBlock.includes(required)) {
      violations.push({ file: composeFile, message: `LOCAL_BOOTSTRAP_COMPOSE_BINDING_MISSING:${required}` });
    }
  }
  if (!apiBlock.includes("identity-local-bootstrap:") || !apiBlock.includes("condition: service_completed_successfully")) {
    violations.push({ file: composeFile, message: "IDENTITY_API_DOES_NOT_WAIT_FOR_ONE_SHOT_LOCAL_BOOTSTRAP" });
  }
}
if (composeSource.includes("IDENTITY_LOCAL_BOOTSTRAP:")) {
  violations.push({ file: composeFile, message: "LEGACY_IDENTITY_LOCAL_BOOTSTRAP_TOGGLE_REMAINS" });
}

const envSource = read(envExampleFile);
if (!/^BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED=true$/m.test(envSource)) {
  violations.push({ file: envExampleFile, message: "LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZATION_MISSING" });
}
const envDefault = envSource.match(/^BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD=(.*)$/m);
if (!envDefault || envDefault[1].trim() !== password) {
  violations.push({ file: envExampleFile, message: "LOCAL_BOOTSTRAP_PASSWORD_REGISTRY_DRIFT" });
}
if (/^IDENTITY_LOCAL_BOOTSTRAP(?:_PASSWORD)?=/m.test(envSource)) {
  violations.push({ file: envExampleFile, message: "LEGACY_LOCAL_BOOTSTRAP_ENV_REMAINS" });
}

const localProductionSource = read(localProductionEnvFile);
for (const required of ["BTHWANI_RUNTIME_MODE=production", "BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED=false"]) {
  if (!localProductionSource.includes(required)) {
    violations.push({ file: localProductionEnvFile, message: `LOCAL_PRODUCTION_BOOTSTRAP_FENCE_MISSING:${required}` });
  }
}
if (/^BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD=/m.test(localProductionSource)) {
  violations.push({ file: localProductionEnvFile, message: "LOCAL_PRODUCTION_MUST_NOT_CARRY_BOOTSTRAP_PASSWORD" });
}

// 5. No script may re-hardcode the local password or login usernames.
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
    violations.push({ file, line: lineNumber(content, literal), message: `HARDCODED_LOCAL_PASSWORD — use ${registryFile}` });
  }
  let match;
  loginCallSite.lastIndex = 0;
  while ((match = loginCallSite.exec(content))) {
    if (!loginUsernames.has(match[1])) continue;
    violations.push({ file, line: lineNumber(content, match.index), message: `HARDCODED_LOCAL_USERNAME:${match[1]}` });
  }
  const passwordProviderLookup = /Get-LocalUsername\s+["'](?:field|captain)["']/g;
  while ((match = passwordProviderLookup.exec(content))) {
    violations.push({ file, line: lineNumber(content, match.index), message: "WORKFORCE_PROVIDER_PASSWORD_LOGIN" });
  }
}

fail(guardId, violations);
