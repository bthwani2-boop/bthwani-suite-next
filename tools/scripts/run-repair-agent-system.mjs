import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalPath = path.join(root, "tools/scripts/repair-agent-system.mjs");
if (!fs.existsSync(canonicalPath)) throw new Error("Missing remediation engine: " + canonicalPath);

let source = fs.readFileSync(canonicalPath, "utf8").replaceAll("\r\n", "\n");
const original = source;

function replaceRequired(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error("Cannot patch remediation engine: " + label);
  source = source.replace(before, after);
}

replaceRequired(
  'const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");',
  'const root = process.env.BTHWANI_REPO_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");',
  "repository root override",
);

replaceRequired(
  '    stdio: options.capture === false ? "inherit" : "pipe",\n    env: { ...process.env, ...(options.env || {}) },',
  '    stdio: options.capture === false ? "inherit" : "pipe",\n    shell: options.shell ?? (process.platform === "win32" && /\\.(?:cmd|bat)$/i.test(name)),\n    env: { ...process.env, ...(options.env || {}) },',
  "Windows command shell",
);

replaceRequired(
  'const result = spawnSync(executable, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit" });',
  'const result = spawnSync(executable, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit", shell: process.platform === "win32" });',
  "Windows markdown runner",
);

replaceRequired(
  'const aiEnvironmentGuard = String.raw`import { execFileSync } from "node:child_process";',
  'const aiEnvironmentGuard = String.raw`import { execFileSync, spawnSync } from "node:child_process";',
  "AI environment spawn import",
);

replaceRequired(
  '      const output = execFileSync(executable, ["--version"], { encoding: "utf8", timeout: 10000, windowsHide: true }).trim();\n      return { state: "VERIFIED_AVAILABLE", executable, version: output.split(/\\r?\\n/)[0] || "unknown" };',
  '      const result = spawnSync(executable, ["--version"], { encoding: "utf8", timeout: 10000, windowsHide: true, shell: process.platform === "win32" && /\\.(?:cmd|bat)$/i.test(executable) });\n      if (result.error || result.status !== 0) continue;\n      const output = String(result.stdout || result.stderr || "").trim();\n      return { state: "VERIFIED_AVAILABLE", executable, version: output.split(/\\r?\\n/)[0] || "unknown" };',
  "AI executable probe",
);

replaceRequired(
  'function project(actual, template) {\n  if (Array.isArray(template)) return template.map((item, index) => project(actual?.[index], item));\n  if (template && typeof template === "object") return Object.fromEntries(Object.keys(template).map((key) => [key, project(actual?.[key], template[key])]));\n  return actual;\n}',
  'function project(actual, template) {\n  if (Array.isArray(template)) {\n    const source = Array.isArray(actual) ? actual : [];\n    return template.map((item, index) => {\n      if (item && typeof item === "object") {\n        for (const key of ["type", "context", "actor_id"]) {\n          if (item[key] !== undefined) {\n            const match = source.find((candidate) => candidate && candidate[key] === item[key]);\n            return project(match, item);\n          }\n        }\n      }\n      return project(source[index], item);\n    });\n  }\n  if (template && typeof template === "object") return Object.fromEntries(Object.keys(template).map((key) => [key, project(actual?.[key], template[key])]));\n  return actual;\n}',
  "semantic ruleset projection",
);

replaceRequired(
  '  if (values.full) command(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "guard:agent-system-closure"], { capture: false });',
  '  if (values.full) {\n    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";\n    command(pnpm, ["run", "guard:workflow-lint"], { capture: false });\n    command(pnpm, ["run", "guard:workflow-security"], { capture: false });\n    command(pnpm, ["run", "guard:actions-pin"], { capture: false });\n  }',
  "pre-commit full verification",
);

replaceRequired(
  'if (values["commit-push"]) finalHead = commitAndPush();\nif (values["wait-ci"]) {',
  'if (values["commit-push"]) finalHead = commitAndPush();\nif (values.full && values["commit-push"]) command(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["run", "guard:same-commit-evidence"], { capture: false });\nif (values["wait-ci"]) {',
  "post-commit local evidence",
);

// The Copilot adapter is retired. Do not regenerate it in tests or adapter coverage.
source = source.replaceAll('    ".github/copilot-instructions.md",\n', "");

const copilotCleanup = String.raw`
function removeRetiredCopilotAdapter() {
  const agents = readJson("governance/agents/agent-registry.json");
  agents.entries = (agents.entries || []).filter((entry) =>
    entry.id !== "github-copilot" && entry.primary_file !== ".github/copilot-instructions.md"
  );
  writeJson("governance/agents/agent-registry.json", agents);

  const precedence = readJson("governance/authority/authority-precedence.json");
  precedence.documents = (precedence.documents || []).filter((entry) =>
    entry.path !== ".github/copilot-instructions.md"
  );
  writeJson("governance/authority/authority-precedence.json", precedence);

  const textFiles = [
    "tools/guards/agent-governance-gate.mjs",
    "tools/guards/document-authority-conflicts-gate.mjs",
    "tools/scripts/detect-ci-context.test.mjs",
  ];
  for (const relative of textFiles) {
    if (!fs.existsSync(path.join(root, relative))) continue;
    let content = read(relative);
    content = content
      .replaceAll(', ".github/copilot-instructions.md"', "")
      .replaceAll('  [".github/copilot-instructions.md", "AGENTS.md"],\n', "")
      .replaceAll('  ".github/copilot-instructions.md", "opencode.json",\n', '  "opencode.json",\n')
      .replaceAll('    [".github/copilot-instructions.md", "ADAPTER"],\n', "")
      .replaceAll('    ".github/copilot-instructions.md",\n', "");
    write(relative, content);
  }

  const relative = ".github/copilot-instructions.md";
  const file = path.join(root, relative);
  if (fs.existsSync(file)) {
    changes.add(relative);
    if (mode === "apply") fs.rmSync(file);
  }
}
`;

if (!source.includes("function removeRetiredCopilotAdapter()")) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: Copilot cleanup anchor");
  source = source.replace(anchor, copilotCleanup + "\n" + anchor + "  removeRetiredCopilotAdapter();\n");
}

const selfSync = '  if (process.env.BTHWANI_REPAIR_ENGINE_SOURCE) write("tools/scripts/repair-agent-system.mjs", fs.readFileSync(process.env.BTHWANI_REPAIR_ENGINE_SOURCE, "utf8"));';
if (!source.includes(selfSync)) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: self synchronization anchor");
  source = source.replace(anchor, anchor + selfSync + "\n");
}

const temporaryPath = path.join(os.tmpdir(), "bthwani-repair-agent-system-" + process.pid + "-" + Date.now() + ".mjs");
fs.writeFileSync(temporaryPath, source, "utf8");

try {
  const syntax = spawnSync(process.execPath, ["--check", temporaryPath], { stdio: "inherit", windowsHide: true });
  if (syntax.error || syntax.status !== 0) throw syntax.error || new Error("Remediation engine syntax check failed");

  const result = spawnSync(process.execPath, [temporaryPath, ...process.argv.slice(2)], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      BTHWANI_REPO_ROOT: root,
      BTHWANI_REPAIR_ENGINE_SOURCE: temporaryPath,
      BTHWANI_REPAIR_ENGINE_PATCHED: original === source ? "false" : "true",
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
