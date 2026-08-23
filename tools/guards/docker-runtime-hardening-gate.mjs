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

if (failures.length > 0) {
  console.error("docker-runtime-hardening-gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("docker-runtime-hardening-gate: PASS");
