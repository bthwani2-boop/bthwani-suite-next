// Keeps tools/dev/local-actors.json the single source of truth for the local
// development identity actors.
//
// Scripts import the registry directly, so they cannot drift. Three consumers
// structurally cannot import it — the Go bootstrap that seeds the actors, the
// Docker Compose default, and the runtime env example — so this guard asserts
// they still agree with the registry, and that no script re-introduces its own
// hardcoded copy.
import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, read, repoRoot } from "./_guard-utils.mjs";
import { LOCAL_ACTORS, LOCAL_PLATFORM_ACTORS, localPasswordDefault } from "../dev/local-actors.mjs";

const guardId = "local-dev-actors-gate";
const violations = [];

const registryFile = "tools/dev/local-actors.json";
const goBootstrapFile = "core/identity/backend/internal/identity/repository.go";
const goPlatformBootstrapFile = "core/identity/backend/internal/identity/platform_local_bootstrap.go";
const composeFile = "infra/docker/compose.runtime.yml";
const envExampleFile = "infra/docker/env/runtime.env.example";

const password = localPasswordDefault();

// --- 1. The Go bootstrap actor table must match the registry ------------------

const goSource = read(goBootstrapFile);
const goTable = goSource.match(/actors := \[\]struct \{\s*id, username, role, surface, scope, phone string\s*\}\{([\s\S]*?)\n\t\}/);
if (!goTable) {
  violations.push({ file: goBootstrapFile, message: "LOCAL_BOOTSTRAP_ACTOR_TABLE_NOT_FOUND — the guard can no longer verify registry drift" });
} else {
  const declared = new Map();
  const rowRegex = /\{"([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\}/g;
  let row;
  while ((row = rowRegex.exec(goTable[1]))) {
    const [, id, username, role, surface, scope, phone] = row;
    declared.set(id, { actorId: id, username, role, surface, scope, phoneE164: phone });
  }

  for (const [key, expected] of Object.entries(LOCAL_ACTORS)) {
    const actual = declared.get(expected.actorId);
    if (!actual) {
      violations.push({ file: goBootstrapFile, message: `LOCAL_ACTOR_MISSING_IN_BOOTSTRAP:${key} (${expected.actorId}) — declared in ${registryFile}` });
      continue;
    }
    for (const field of ["username", "role", "surface", "scope", "phoneE164"]) {
      if (actual[field] !== expected[field]) {
        violations.push({
          file: goBootstrapFile,
          line: lineNumber(goSource, goSource.indexOf(`"${actual.actorId}"`)),
          message: `LOCAL_ACTOR_DRIFT:${key}.${field} — bootstrap has "${actual[field]}", ${registryFile} has "${expected[field]}"`,
        });
      }
    }
    declared.delete(expected.actorId);
  }
  for (const orphan of declared.keys()) {
    violations.push({ file: goBootstrapFile, message: `LOCAL_ACTOR_MISSING_IN_REGISTRY:${orphan} — add it to ${registryFile}` });
  }
}

// --- 2. The Go platform bootstrap must match the registry ---------------------

const goPlatformSource = read(goPlatformBootstrapFile);
for (const [key, expected] of Object.entries(LOCAL_PLATFORM_ACTORS)) {
  for (const value of [expected.actorId, expected.username, expected.role, expected.phoneE164]) {
    if (!goPlatformSource.includes(`"${value}"`)) {
      violations.push({ file: goPlatformBootstrapFile, message: `LOCAL_PLATFORM_ACTOR_DRIFT:${key} — "${value}" from ${registryFile} is absent` });
    }
  }
}

// --- 3. Compose and env defaults must match the registry password -------------

const composeSource = read(composeFile);
const composeDefault = composeSource.match(/IDENTITY_LOCAL_BOOTSTRAP_PASSWORD:\s*"\$\{IDENTITY_LOCAL_BOOTSTRAP_PASSWORD:-([^}]*)\}"/);
if (!composeDefault) {
  violations.push({ file: composeFile, message: "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD_DEFAULT_NOT_FOUND" });
} else if (composeDefault[1] !== password) {
  violations.push({
    file: composeFile,
    line: lineNumber(composeSource, composeDefault.index),
    message: `LOCAL_PASSWORD_DRIFT — compose default is "${composeDefault[1]}", ${registryFile} has "${password}"`,
  });
}

const envSource = read(envExampleFile);
const envDefault = envSource.match(/^IDENTITY_LOCAL_BOOTSTRAP_PASSWORD=(.*)$/m);
if (!envDefault) {
  violations.push({ file: envExampleFile, message: "IDENTITY_LOCAL_BOOTSTRAP_PASSWORD_NOT_FOUND" });
} else if (envDefault[1].trim() !== password) {
  violations.push({
    file: envExampleFile,
    line: lineNumber(envSource, envDefault.index),
    message: `LOCAL_PASSWORD_DRIFT — env example has "${envDefault[1].trim()}", ${registryFile} has "${password}"`,
  });
}

// --- 4. No script may re-hardcode the password or a login username ------------

const scannedRoots = ["tools/scripts", "tools/guards", "infra/docker/scripts", "apps/mobile"];
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

// A login username is only a violation next to a login/token call site; the same
// words are legitimate role names and audit assertions elsewhere.
const loginCallSite = /(?:username\s*[=:]\s*|-Username\s+|getToken\(|Get-ActorToken\b[^\n]*|Get-LocalActorToken\s+|Get-ActorSession\s+|Login-Actor\s+|Login-PlatformLocalActor\b[^\n]*|\bLogin\s+)["']([^"']+)["']/g;
const loginUsernames = new Set(
  [...Object.values(LOCAL_ACTORS), ...Object.values(LOCAL_PLATFORM_ACTORS)].map((actor) => actor.username),
);

for (const file of scannedRoots.flatMap((dir) => walk(dir))) {
  if (allowedFiles.has(file)) continue;
  const content = read(file);

  const literal = content.indexOf(`"${password}"`) >= 0 ? content.indexOf(`"${password}"`) : content.indexOf(`'${password}'`);
  if (literal >= 0) {
    violations.push({
      file,
      line: lineNumber(content, literal),
      message: `HARDCODED_LOCAL_PASSWORD — import the accessor from ${registryFile} instead`,
    });
  }

  let match;
  loginCallSite.lastIndex = 0;
  while ((match = loginCallSite.exec(content))) {
    if (!loginUsernames.has(match[1])) continue;
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `HARDCODED_LOCAL_USERNAME:${match[1]} — use the accessor from ${registryFile} instead`,
    });
  }
}

fail(guardId, violations);
