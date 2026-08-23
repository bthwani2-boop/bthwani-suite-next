import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const failures = [];

function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: missing`);
    return "";
  }
  return fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
}

const composeFiles = [
  "infra/docker/compose.runtime.yml",
  "infra/docker/compose.financial-simulators.yml",
  "infra/docker/compose.observability.yml",
];

const runtimeCompose = read(composeFiles[0]);
const dockerfiles = [
  ...new Set(
    [...runtimeCompose.matchAll(/^\s*dockerfile:\s*["']?([^"'#\s]+)["']?\s*$/gm)]
      .map((match) => match[1]),
  ),
];

for (const rel of dockerfiles) {
  const text = read(rel);
  const lines = text.split("\n");
  const fromIndexes = [];

  lines.forEach((line, index) => {
    if (!/^\s*FROM\s+/i.test(line)) return;
    fromIndexes.push(index);
    if (/:latest(?:\s+AS\s+\S+)?\s*$/i.test(line.trim())) {
      failures.push(`${rel}:${index + 1}: Docker base images must not use :latest`);
    }
  });

  if (fromIndexes.length === 0) {
    failures.push(`${rel}: no FROM instruction`);
    continue;
  }

  const finalStage = lines.slice(fromIndexes.at(-1));
  if (!finalStage.some((line) => /^\s*USER\s+\S+/i.test(line))) {
    failures.push(`${rel}: final runtime stage must declare USER`);
  }
}

function expandDefaultEnv(value) {
  return value.replace(/\$\{[^}:]+:-([^}]+)\}/g, "$1");
}

for (const rel of composeFiles) {
  const text = read(rel);
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    if (/^\s*image:\s*/.test(line) && /:latest(?:[}"'\s]|$)/i.test(line)) {
      failures.push(`${rel}:${index + 1}: Compose images must not use :latest`);
    }
  });

  let portsIndent = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();

    if (/^ports:\s*$/.test(trimmed)) {
      portsIndent = indent;
      continue;
    }

    if (portsIndent === null) continue;
    if (trimmed && indent <= portsIndent) {
      portsIndent = null;
      continue;
    }
    if (!trimmed.startsWith("- ")) continue;

    let published = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
    published = expandDefaultEnv(published);
    if (!published.startsWith("127.0.0.1:")) {
      failures.push(`${rel}:${index + 1}: published port must bind 127.0.0.1 (${published})`);
    }
  }
}

const dockerignore = read(".dockerignore");
const ignoreRules = new Set(
  dockerignore.split("\n").map((line) => line.trim()).filter(Boolean),
);
for (const rule of [".git", "**/node_modules", ".env", "**/.env", "services/dsh/database/seeds/local/media"]) {
  if (!ignoreRules.has(rule)) {
    failures.push(`.dockerignore: missing required rule ${rule}`);
  }
}

const contextHelper = read("tools/scripts/docker-context-local.ps1");
if (/docker\s+context\s+use\s+default/i.test(contextHelper)) {
  failures.push("docker-context-local.ps1: must not blindly force the default context");
}
if (!/\^\(npipe\|unix\):\/\//.test(contextHelper)) {
  failures.push("docker-context-local.ps1: must restrict local endpoints to npipe:// or unix://");
}


const canonicalRuntimeScript = read("infra/docker/scripts/runtime.ps1");

for (const required of [
  '"-f", $script:ComposeFile',
  '"-f", $script:FinancialComposeFile',
  '"-f", $script:ObservabilityComposeFile',
  "Invoke-ComposeConvergentUp",
  "--remove-orphans",
  '$CanonicalComposeProject = "bthwani-runtime"',
  "$HardPublishedBindingCeiling = 15",
]) {
  if (!canonicalRuntimeScript.includes(required)) {
    failures.push(`runtime.ps1: missing canonical Docker invariant: ${required}`);
  }
}

if (/Invoke-Compose\s+up\s+-d\b/.test(canonicalRuntimeScript)) {
  failures.push(
    "runtime.ps1: raw Compose up is forbidden; use Invoke-ComposeConvergentUp",
  );
}

const compatibilityDelegates = [
  "infra/docker/scripts/up-runtime.ps1",
  "infra/docker/scripts/down-runtime.ps1",
  "infra/docker/scripts/reset-runtime.ps1",
  "infra/docker/scripts/smoke-runtime.ps1",
  "infra/docker/scripts/up-local-production.ps1",
];

for (const rel of compatibilityDelegates) {
  const text = read(rel);

  if (!text.includes("runtime.ps1")) {
    failures.push(`${rel}: must delegate to runtime.ps1`);
  }

  if (/\bdocker\s+(?:compose|run|start|stop|restart|rm|kill)\b/i.test(text)) {
    failures.push(`${rel}: parallel Docker lifecycle execution is forbidden`);
  }
}

const dshDatabaseAdapter = read(
  "services/dsh/database/scripts/invoke-dsh-database.ps1",
);

if (!dshDatabaseAdapter.includes("-Action ensure-db")) {
  failures.push(
    "invoke-dsh-database.ps1: Docker lifecycle must delegate to runtime:ensure-db",
  );
}

if (
  /Get-DockerComposeBaseArguments[\s\S]{0,1500}\bup\b/i.test(
    dshDatabaseAdapter,
  )
) {
  failures.push(
    "invoke-dsh-database.ps1: direct Compose up lifecycle is forbidden",
  );
}

const fullRuntimeClosure = read(
  "tools/scripts/run-lian-full-runtime-closure-v2.ps1",
);

if (/function\s+Invoke-Compose\b/.test(fullRuntimeClosure)) {
  failures.push(
    "run-lian-full-runtime-closure-v2.ps1: parallel Compose lifecycle helper is forbidden",
  );
}

for (const rel of composeFiles) {
  const text = read(rel);

  for (const [pattern, message] of [
    [/\bprivileged\s*:\s*true\b/i, "privileged containers are forbidden"],
    [/\bnetwork_mode\s*:\s*["']?host["']?/i, "host networking is forbidden"],
    [/\/var\/run\/docker\.sock/i, "Docker socket mounts are forbidden"],
  ]) {
    if (pattern.test(text)) {
      failures.push(`${rel}: ${message}`);
    }
  }
}

const declaredPublishedBindings = composeFiles.reduce((count, rel) => {
  const lines = read(rel).split("\n");

  return (
    count +
    lines.filter((line) =>
      /^\s*-\s*["']?127\.0\.0\.1:/.test(line),
    ).length
  );
}, 0);

if (declaredPublishedBindings !== 15) {
  failures.push(
    `canonical Docker model must expose exactly 15 governed loopback bindings; found ${declaredPublishedBindings}`,
  );
}

const dockerAuthorityFiles = [
  canonicalRuntimeScript,
  ...compatibilityDelegates.map((rel) => read(rel)),
  dshDatabaseAdapter,
  fullRuntimeClosure,
];

for (const text of dockerAuthorityFiles) {
  if (/--publish-all\b/.test(text)) {
    failures.push("Docker --publish-all is forbidden");
  }
}

if (failures.length > 0) {
  console.error("docker-runtime-hardening-gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("docker-runtime-hardening-gate: PASS");
