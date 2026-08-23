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

const convergentUpDefinition =
  canonicalRuntimeScript.match(
    /function\s+Invoke-ComposeConvergentUp\s*\{([\s\S]*?)^\}/m,
  );

if (!convergentUpDefinition) {
  failures.push(
    "runtime.ps1: Invoke-ComposeConvergentUp definition is missing",
  );
} else {
  const body = convergentUpDefinition[1];

  if (
    !/Invoke-Compose\s+up\s+-d\s+--remove-orphans\s+@args/.test(body)
  ) {
    failures.push(
      "runtime.ps1: convergent-up helper must delegate to Invoke-Compose up -d --remove-orphans @args",
    );
  }

  if (/Invoke-ComposeConvergentUp/.test(body)) {
    failures.push(
      "runtime.ps1: recursive Invoke-ComposeConvergentUp is forbidden",
    );
  }
}

const rawComposeUpCalls =
  canonicalRuntimeScript.match(
    /Invoke-Compose\s+up\s+-d\b[^\r\n]*/g,
  ) ?? [];

if (
  rawComposeUpCalls.length !== 1 ||
  !/Invoke-Compose\s+up\s+-d\s+--remove-orphans\s+@args/.test(
    rawComposeUpCalls[0],
  )
) {
  failures.push(
    `runtime.ps1: expected exactly one canonical raw Compose up implementation; found ${rawComposeUpCalls.length}`,
  );
}

if (!canonicalRuntimeScript.includes("$name -match '^pr\\d+-'")) {
  failures.push(
    "runtime.ps1: PR residue containers must participate in topology governance",
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


// canonical-lifecycle-authority-v3
const lifecycleAuthority = "infra/docker/scripts/runtime.ps1";
const lifecycleVerbs = "(?:up|down|start|stop|restart|rm|kill|create|pause|unpause)";

function walkFiles(relativeRoot, extensions) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const results = [];
  const visit = (absoluteDir) => {
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolute = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!extensions.some((extension) => entry.name.endsWith(extension))) continue;
      results.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
  };

  visit(absoluteRoot);
  return results;
}

const lifecyclePowerShellFiles = [
  ...walkFiles("infra/docker/scripts", [".ps1"]),
  ...walkFiles("tools/scripts", [".ps1"]),
  ...walkFiles("services", [".ps1"]),
  ...walkFiles("apps", [".ps1"]),
];

for (const rel of [...new Set(lifecyclePowerShellFiles)]) {
  if (rel === lifecycleAuthority) continue;

  const normalized = read(rel)
    .replace(/<#[\s\S]*?#>/g, "")
    .replace(/^\s*#.*$/gm, "")
    .replace(/`\r?\n\s*/g, " ")
    .replace(/\\\r?\n\s*/g, " ");

  const executableLines = normalized;

  const forbidden = [
    new RegExp(`\\bdocker\\s+compose\\b[^\\n]*\\b${lifecycleVerbs}\\b`, "i"),
    new RegExp(`\\bdocker\\s+(?:container\\s+)?(?:start|stop|restart|rm|kill|create|pause|unpause)\\b`, "i"),
    new RegExp(`\\bdocker\\s+(?:network|volume)\\s+(?:create|rm)\\b`, "i"),
    new RegExp(`\\bInvoke-[A-Za-z0-9_-]*Compose\\b[^\\n]*\\b${lifecycleVerbs}\\b`, "i"),
  ];

  for (const pattern of forbidden) {
    if (pattern.test(executableLines)) {
      failures.push(
        `${rel}: Docker lifecycle mutation must delegate to ${lifecycleAuthority}`,
      );
      break;
    }
  }
}

const platformRuntimeAdapter = read("tools/scripts/platform-control-runtime.ps1");
const platformRuntimeCommon = read("tools/scripts/platform-control-runtime/common.ps1");
const platformSmoke = read("tools/scripts/platform-control-runtime/smoke.ps1");
const rebuildDatabase = read("infra/docker/scripts/rebuild-runtime-service-database.ps1");
const restoreRuntime = read("infra/docker/scripts/restore-runtime.ps1");

for (const [rel, text] of [
  ["tools/scripts/platform-control-runtime.ps1", platformRuntimeAdapter],
  ["tools/scripts/platform-control-runtime/common.ps1", platformRuntimeCommon],
]) {
  if (!text.includes("runtime.ps1")) {
    failures.push(`${rel}: must delegate lifecycle to runtime.ps1`);
  }
}

if (!platformRuntimeCommon.includes("function Invoke-PlatformDatabasePsql")) {
  failures.push(
    "platform-control-runtime/common.ps1: missing governed database verification helper",
  );
}

if (!platformSmoke.includes("Invoke-PlatformP3Smoke")) {
  failures.push(
    "platform-control-runtime/smoke.ps1: P3 semantic smoke coverage must be retained",
  );
}

for (const [rel, text] of [
  ["infra/docker/scripts/rebuild-runtime-service-database.ps1", rebuildDatabase],
  ["infra/docker/scripts/restore-runtime.ps1", restoreRuntime],
]) {
  if (!text.includes("-Action service-stop") || !text.includes("-Action service-up")) {
    failures.push(`${rel}: service stop/up must delegate to runtime.ps1`);
  }
}

if (!canonicalRuntimeScript.includes('"service-up"') ||
    !canonicalRuntimeScript.includes('"service-stop"') ||
    !canonicalRuntimeScript.includes("Invoke-Compose stop $Service") ||
    !canonicalRuntimeScript.includes("Invoke-ComposeConvergentUp --no-deps $Service")) {
  failures.push(
    "runtime.ps1: canonical service-level lifecycle actions are incomplete",
  );
}

if (failures.length > 0) {
  console.error("docker-runtime-hardening-gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("docker-runtime-hardening-gate: PASS");
