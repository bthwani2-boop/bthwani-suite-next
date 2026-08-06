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

function replaceRegexRequired(pattern, replacement, label) {
  if (pattern.test(source)) {
    source = source.replace(pattern, replacement);
    return;
  }
  if (source.includes(replacement)) return;
  throw new Error("Cannot patch remediation engine: " + label);
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

source = source.replaceAll('    ".github/copilot-instructions.md",\n', "");
source = source.replaceAll(', ".github/copilot-instructions.md"', "");
source = source.replaceAll('  ".github/copilot-instructions.md", "opencode.json",\n', '  "opencode.json",\n');
source = source.replaceAll('    [".github/copilot-instructions.md", "ADAPTER"],\n', "");
source = source.replaceAll('  [".github/copilot-instructions.md", "AGENTS.md"],\n', "");

const dynamicAdapterGuard = String.raw`const adapterTriggerGuard = String.raw\`import fs from "node:fs";
import path from "node:path";
import { classifyFiles } from "../scripts/detect-ci-context.mjs";
import { fail, repoRoot } from "./_guard-utils.mjs";
const violations = [];
const registryPath = path.join(repoRoot, "governance/agents/agent-registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const adapters = (registry.entries || []).filter((entry) => entry.kind === "adapter");
const adapterPaths = adapters.map((entry) => entry.primary_file);
const optionalToolInputs = [".lean-ctx.toml", ".graphifyignore", ".opencodereview/rule.json"];
for (const file of [...adapterPaths, ...optionalToolInputs]) {
  if (!classifyFiles([file]).governance_policy) violations.push({ file: "tools/scripts/detect-ci-context.mjs", line: 0, message: "ADAPTER_NOT_GOVERNANCE " + file });
}
for (const adapter of adapters) {
  if (!adapter.primary_file || !fs.existsSync(path.join(repoRoot, adapter.primary_file))) {
    violations.push({ file: registryPath, line: 0, message: "REGISTERED_ADAPTER_FILE_MISSING " + adapter.id + "->" + adapter.primary_file });
  }
}
const ci = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
const restricted = /^\\s{4}paths(?:-ignore)?:\\s*$/m.test(ci);
if (restricted) violations.push({ file: ".github/workflows/ci.yml", line: 0, message: "ROOT_CONTEXTUAL_CI_MUST_NOT_USE_PATH_FILTERS" });
fail("adapter-trigger-coverage-gate", violations);\`;`;

replaceRegexRequired(
  /const adapterTriggerGuard = String\.raw`[\s\S]*?`;\n\nconst affectedMarkdown/,
  dynamicAdapterGuard + "\n\nconst affectedMarkdown",
  "dynamic adapter coverage guard",
);

const adapterConvergence = String.raw`
function convergeRegisteredAdapters() {
  const retiredPath = ".github/copilot-instructions.md";
  const retiredFile = path.join(root, retiredPath);
  if (fs.existsSync(retiredFile)) {
    changes.add(retiredPath);
    if (mode === "apply") fs.rmSync(retiredFile);
  }

  const agents = readJson("governance/agents/agent-registry.json");
  agents.entries = (agents.entries || []).filter((entry) =>
    entry.id !== "github-copilot" && entry.primary_file !== retiredPath
  );
  writeJson("governance/agents/agent-registry.json", agents);

  const precedence = readJson("governance/authority/authority-precedence.json");
  precedence.documents = (precedence.documents || []).filter((entry) => entry.path !== retiredPath);
  writeJson("governance/authority/authority-precedence.json", precedence);

  for (const relative of [
    "tools/guards/agent-governance-gate.mjs",
    "tools/guards/document-authority-conflicts-gate.mjs",
    "tools/scripts/detect-ci-context.test.mjs",
  ]) {
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
}

function removeRootCiPathFilters() {
  const relative = ".github/workflows/ci.yml";
  let content = read(relative);
  const lines = content.split(/\r?\n/);
  const output = [];
  let insideRootTrigger = false;
  let triggerIndent = -1;
  let skippingPaths = false;
  let pathsIndent = -1;

  for (const line of lines) {
    const indent = line.match(/^\s*/)[0].length;
    if (/^  (pull_request|push):\s*$/.test(line)) {
      insideRootTrigger = true;
      triggerIndent = 2;
      skippingPaths = false;
      output.push(line);
      continue;
    }
    if (insideRootTrigger && indent <= triggerIndent && line.trim() && !/^  (pull_request|push):\s*$/.test(line)) {
      insideRootTrigger = false;
      skippingPaths = false;
    }
    if (insideRootTrigger && /^    paths(?:-ignore)?:\s*$/.test(line)) {
      skippingPaths = true;
      pathsIndent = indent;
      continue;
    }
    if (skippingPaths) {
      if (!line.trim()) continue;
      if (indent > pathsIndent && /^\s*-\s+/.test(line)) continue;
      skippingPaths = false;
    }
    output.push(line);
  }
  content = output.join("\n");
  write(relative, content);
}
`;

if (!source.includes("function convergeRegisteredAdapters()")) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: adapter convergence anchor");
  source = source.replace(anchor, adapterConvergence + "\n" + anchor + "  convergeRegisteredAdapters();\n  removeRootCiPathFilters();\n");
}

const selfSync = '  if (process.env.BTHWANI_REPAIR_ENGINE_SOURCE) write("tools/scripts/repair-agent-system.mjs", fs.readFileSync(process.env.BTHWANI_REPAIR_ENGINE_SOURCE, "utf8"));';
if (!source.includes(selfSync)) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: self synchronization anchor");
  source = source.replace(anchor, anchor + selfSync + "\n");
}

const temporaryPath = path.join(os.tmpdir(), "bthwani-repair-agent-system-" + process.pid + "-" + Date.now() + ".mjs");
fs.writeFileSync(temporaryPath, source, "utf8");

const initialHead = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "";
const initialStatus = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "";

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

  if ((result.status ?? 1) !== 0 && !initialStatus) {
    const currentHead = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout?.trim() || "";
    if (currentHead === initialHead) {
      spawnSync("git", ["reset", "--hard", initialHead], { cwd: root, stdio: "inherit" });
      spawnSync("git", ["clean", "-fd"], { cwd: root, stdio: "inherit" });
      console.error("Remediation failed before commit; local changes were rolled back to " + initialHead);
    }
  }
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
