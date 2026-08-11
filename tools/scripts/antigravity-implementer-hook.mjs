import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const READ_TOOLS = new Set(["view_file", "list_dir", "grep_search", "find_by_name"]);
const WRITE_TOOLS = new Set(["write_to_file", "replace_file_content", "multi_replace_file_content"]);
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
  "tools/scripts/invoke-antigravity-implementer.mjs",
  "tools/scripts/invoke-antigravity-implementer.test.mjs",
  "tools/scripts/invoke-claude-antigravity-implementer.mjs",
  "tools/scripts/invoke-claude-antigravity-implementer.test.mjs",
  "tools/scripts/antigravity-implementer-hook.mjs",
  "tools/scripts/antigravity-implementer-hook.test.mjs",
];

function casePath(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function insideOrEqual(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveCandidate(raw, repoRoot) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();
  return path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(repoRoot, trimmed);
}

function hasSymlinkAncestor(repoRoot, target) {
  if (!insideOrEqual(casePath(repoRoot), casePath(target))) return true;
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

function matchesPrefix(prefixes, target) {
  const normalized = casePath(target);
  return prefixes.some((prefix) => insideOrEqual(casePath(prefix), normalized));
}

function toolTargets(toolName, args, repoRoot) {
  const values = [];
  if (toolName === "view_file") values.push(args.AbsolutePath);
  else if (toolName === "list_dir") values.push(args.DirectoryPath);
  else if (toolName === "find_by_name") values.push(args.SearchDirectory);
  else if (toolName === "grep_search") values.push(args.SearchPath);
  else if (WRITE_TOOLS.has(toolName)) values.push(args.TargetFile);
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => resolveCandidate(value, repoRoot))
    .filter(Boolean);
}

function parseStringArray(raw, name) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error(`${name} must be a JSON string array.`);
  }
  return parsed;
}

export function evaluateToolCall(input, options) {
  const repoRoot = path.resolve(options.repoRoot);
  const toolName = String(input?.toolCall?.name || "");
  const args = input?.toolCall?.args && typeof input.toolCall.args === "object" ? input.toolCall.args : {};
  const allowedWrite = (options.allowedWrite || []).map((value) => path.resolve(value));
  const forbiddenWrite = [
    ...(options.forbiddenWrite || []).map((value) => path.resolve(value)),
    ...STATIC_FORBIDDEN_WRITE.map((value) => path.resolve(repoRoot, value)),
  ];

  const allow = () => ({ decision: "allow" });
  const deny = (reason) => ({ decision: "deny", reason });
  if (!toolName) return deny("Missing Antigravity tool name.");

  if (READ_TOOLS.has(toolName)) {
    const targets = toolTargets(toolName, args, repoRoot);
    if (["view_file", "list_dir"].includes(toolName) && targets.length === 0) {
      return deny(`${toolName} did not declare a readable path.`);
    }
    for (const target of targets) {
      if (!insideOrEqual(casePath(repoRoot), casePath(target))) {
        return deny(`Read outside repository is forbidden: ${target}`);
      }
      if (hasSymlinkAncestor(repoRoot, target)) {
        return deny(`Read through a symbolic-link path is forbidden: ${target}`);
      }
    }
    return allow();
  }

  if (WRITE_TOOLS.has(toolName)) {
    const targets = toolTargets(toolName, args, repoRoot);
    if (targets.length === 0) return deny(`${toolName} did not declare TargetFile.`);
    for (const target of targets) {
      if (!insideOrEqual(casePath(repoRoot), casePath(target))) {
        return deny(`Write outside repository is forbidden: ${target}`);
      }
      const gitRoot = path.join(repoRoot, ".git");
      if (insideOrEqual(casePath(gitRoot), casePath(target))) return deny("Writes under .git are forbidden.");
      if (hasSymlinkAncestor(repoRoot, target)) return deny(`Write through a symbolic-link path is forbidden: ${target}`);
      if (matchesPrefix(forbiddenWrite, target)) return deny(`Write path is explicitly forbidden: ${target}`);
      if (!matchesPrefix(allowedWrite, target)) return deny(`Write path is outside the declared work-unit scope: ${target}`);
    }
    return allow();
  }

  return deny(`Tool '${toolName}' is not permitted for the bounded Antigravity implementer.`);
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || "{}");
  const repoRoot = process.env.BTHWANI_ANTIGRAVITY_REPO_ROOT;
  if (!repoRoot) throw new Error("BTHWANI_ANTIGRAVITY_REPO_ROOT is required.");
  const result = evaluateToolCall(input, {
    repoRoot,
    allowedWrite: parseStringArray(process.env.BTHWANI_ANTIGRAVITY_ALLOWED_WRITE, "BTHWANI_ANTIGRAVITY_ALLOWED_WRITE"),
    forbiddenWrite: parseStringArray(process.env.BTHWANI_ANTIGRAVITY_FORBIDDEN_WRITE, "BTHWANI_ANTIGRAVITY_FORBIDDEN_WRITE"),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ decision: "deny", reason: `Antigravity implementer hook failure: ${error.message}` })}\n`);
  });
}
