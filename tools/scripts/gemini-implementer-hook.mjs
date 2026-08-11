import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const READ_TOOLS = new Set([
  "list_directory",
  "read_file",
  "read_many_files",
  "glob",
  "grep_search",
]);
const WRITE_TOOLS = new Set(["write_file", "replace"]);
const STATIC_FORBIDDEN_WRITE = [
  "AGENTS.md",
  "GEMINI.md",
  "CLAUDE.md",
  "LEAN-CTX.md",
  "opencode.json",
  ".agents",
  ".gemini",
  ".claude",
  "governance",
  "tools/scripts/invoke-gemini-implementer.mjs",
  "tools/scripts/invoke-claude-gemini-implementer.mjs",
  "tools/scripts/invoke-claude-gemini-implementer.test.mjs",
  "tools/scripts/gemini-implementer-hook.mjs",
  "tools/scripts/gemini-implementer-hook.test.mjs",
];

function realCase(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function isInsideOrEqual(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveCandidate(raw, cwd, repoRoot) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const base = cwd && isInsideOrEqual(repoRoot, path.resolve(cwd)) ? path.resolve(cwd) : repoRoot;
  return path.resolve(base, raw);
}

function matchesPrefix(prefixes, target) {
  const normalizedTarget = realCase(target);
  return prefixes.some((prefix) => isInsideOrEqual(realCase(prefix), normalizedTarget));
}

function hasSymlinkAncestor(repoRoot, target) {
  if (!isInsideOrEqual(repoRoot, target)) return true;
  const rel = path.relative(repoRoot, target);
  let cursor = repoRoot;
  for (const segment of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) continue;
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return true;
    } catch {
      return true;
    }
  }
  return false;
}

function collectReadTargets(toolName, input, cwd, repoRoot) {
  const values = [];
  if (["read_file", "list_directory"].includes(toolName)) {
    values.push(input.file_path, input.path, input.dir_path, input.directory);
  } else if (toolName === "read_many_files") {
    if (Array.isArray(input.paths)) values.push(...input.paths);
    if (Array.isArray(input.files)) values.push(...input.files);
  } else if (["glob", "grep_search"].includes(toolName)) {
    values.push(input.dir_path, input.directory, input.path);
  }
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => resolveCandidate(value, cwd, repoRoot))
    .filter(Boolean);
}

export function evaluateToolCall(input, options) {
  const repoRoot = path.resolve(options.repoRoot);
  const cwd = path.resolve(input?.cwd || repoRoot);
  const toolName = String(input?.tool_name || "");
  const toolInput = input?.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
  const allowedWrite = (options.allowedWrite || []).map((value) => path.resolve(value));
  const forbiddenWrite = [
    ...(options.forbiddenWrite || []).map((value) => path.resolve(value)),
    ...STATIC_FORBIDDEN_WRITE.map((value) => path.resolve(repoRoot, value)),
  ];

  const allow = () => ({ decision: "allow", suppressOutput: true });
  const deny = (reason) => ({ decision: "deny", reason, suppressOutput: true });

  if (!toolName) return deny("Missing tool name.");

  if (READ_TOOLS.has(toolName)) {
    const targets = collectReadTargets(toolName, toolInput, cwd, repoRoot);
    for (const target of targets) {
      if (!isInsideOrEqual(realCase(repoRoot), realCase(target))) {
        return deny(`Read outside repository is forbidden: ${target}`);
      }
      if (hasSymlinkAncestor(repoRoot, target)) {
        return deny(`Read through a symbolic-link path is forbidden: ${target}`);
      }
    }
    return allow();
  }

  if (WRITE_TOOLS.has(toolName)) {
    const target = resolveCandidate(toolInput.file_path, cwd, repoRoot);
    if (!target) return deny(`${toolName} requires tool_input.file_path.`);
    if (!isInsideOrEqual(realCase(repoRoot), realCase(target))) {
      return deny(`Write outside repository is forbidden: ${target}`);
    }
    const gitRoot = path.join(repoRoot, ".git");
    if (isInsideOrEqual(realCase(gitRoot), realCase(target))) {
      return deny("Writes under .git are forbidden.");
    }
    if (hasSymlinkAncestor(repoRoot, target)) {
      return deny(`Write through a symbolic-link path is forbidden: ${target}`);
    }
    if (matchesPrefix(forbiddenWrite.map(realCase), realCase(target))) {
      return deny(`Write path is explicitly forbidden: ${target}`);
    }
    if (!matchesPrefix(allowedWrite.map(realCase), realCase(target))) {
      return deny(`Write path is outside the declared work-unit scope: ${target}`);
    }
    return allow();
  }

  return deny(`Tool '${toolName}' is not permitted for the bounded Gemini implementer.`);
}

function parseJsonArrayEnv(name) {
  const raw = process.env[name];
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error(`${name} must be a JSON string array.`);
  }
  return parsed;
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || "{}");
  const repoRoot = process.env.BTHWANI_GEMINI_REPO_ROOT;
  if (!repoRoot) throw new Error("BTHWANI_GEMINI_REPO_ROOT is required.");
  const result = evaluateToolCall(input, {
    repoRoot,
    allowedWrite: parseJsonArrayEnv("BTHWANI_GEMINI_ALLOWED_WRITE"),
    forbiddenWrite: parseJsonArrayEnv("BTHWANI_GEMINI_FORBIDDEN_WRITE"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({
      decision: "deny",
      reason: `Gemini implementer hook failure: ${error.message}`,
      suppressOutput: true,
    })}\n`);
  });
}
