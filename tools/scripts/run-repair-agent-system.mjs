import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalPath = path.join(root, "tools/scripts/repair-agent-system.mjs");
if (!fs.existsSync(canonicalPath)) throw new Error("Missing remediation engine: " + canonicalPath);

let source = fs.readFileSync(canonicalPath, "utf8").replaceAll("\r\n", "\n");

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

source = source.replace(
  'const result = spawnSync(executable, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit" });',
  'const result = spawnSync(executable, ["exec", "markdownlint-cli2", ...files], { stdio: "inherit", shell: process.platform === "win32" });',
);

// Copilot is retired. Remove it from every generated/static adapter list.
for (const [before, after] of [
  [', ".github/copilot-instructions.md"', ""],
  ['  [".github/copilot-instructions.md", "AGENTS.md"],\n', ""],
  ['    [".github/copilot-instructions.md", "ADAPTER"],\n', ""],
  ['  ".github/copilot-instructions.md", "opencode.json",\n', '  "opencode.json",\n'],
  ['    ".github/copilot-instructions.md",\n', ""],
]) {
  source = source.split(before).join(after);
}

const cleanupFunction = [
  "function retireUnusedCopilotAdapter() {",
  '  const retiredPath = ".github/copilot-instructions.md";',
  '  const agents = readJson("governance/agents/agent-registry.json");',
  "  agents.entries = (agents.entries || []).filter((entry) => entry.id !== \"github-copilot\" && entry.primary_file !== retiredPath);",
  '  writeJson("governance/agents/agent-registry.json", agents);',
  "",
  '  const precedence = readJson("governance/authority/authority-precedence.json");',
  "  precedence.documents = (precedence.documents || []).filter((entry) => entry.path !== retiredPath);",
  '  writeJson("governance/authority/authority-precedence.json", precedence);',
  "",
  "  for (const relative of [",
  '    "tools/guards/agent-governance-gate.mjs",',
  '    "tools/guards/document-authority-conflicts-gate.mjs",',
  '    "tools/scripts/detect-ci-context.test.mjs",',
  "  ]) {",
  "    if (!fs.existsSync(path.join(root, relative))) continue;",
  "    let content = read(relative);",
  "    content = content",
  '      .split(\', ".github/copilot-instructions.md"\').join("")',
  '      .split(\'  [".github/copilot-instructions.md", "AGENTS.md"],\\n\').join("")',
  '      .split(\'    [".github/copilot-instructions.md", "ADAPTER"],\\n\').join("")',
  '      .split(\'  ".github/copilot-instructions.md", "opencode.json",\\n\').join(\'  "opencode.json",\\n\')',
  '      .split(\'    ".github/copilot-instructions.md",\\n\').join("");',
  "    write(relative, content);",
  "  }",
  "",
  "  const retiredFile = path.join(root, retiredPath);",
  "  if (fs.existsSync(retiredFile)) {",
  "    changes.add(retiredPath);",
  '    if (mode === "apply") fs.rmSync(retiredFile, { force: true });',
  "  }",
  "}",
].join("\n");

if (!source.includes("function retireUnusedCopilotAdapter()")) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: applyRepairs anchor");
  source = source.replace(anchor, cleanupFunction + "\n\n" + anchor + "  retireUnusedCopilotAdapter();\n");
}

const selfSync = '  if (process.env.BTHWANI_REPAIR_ENGINE_SOURCE) write("tools/scripts/repair-agent-system.mjs", fs.readFileSync(process.env.BTHWANI_REPAIR_ENGINE_SOURCE, "utf8"));';
if (!source.includes(selfSync)) {
  const anchor = "function applyRepairs() {\n";
  if (!source.includes(anchor)) throw new Error("Cannot patch remediation engine: self-sync anchor");
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
