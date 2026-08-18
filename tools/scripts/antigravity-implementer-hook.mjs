import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  if (!WRITE_TOOLS.has(toolName)) return deny(`Tool '${toolName}' is not permitted for the bounded Antigravity implementer.`);

  const target = resolveCandidate(args.TargetFile, repoRoot);
  if (!target) return deny(`${toolName} did not declare TargetFile.`);
  if (!insideOrEqual(casePath(repoRoot), casePath(target))) return deny(`Write outside repository is forbidden: ${target}`);
  if (insideOrEqual(casePath(path.join(repoRoot, ".git")), casePath(target))) return deny("Writes under .git are forbidden.");
  if (hasSymlinkAncestor(repoRoot, target)) return deny(`Write through a symbolic-link path is forbidden: ${target}`);
  if (matchesPrefix(forbiddenWrite, target)) return deny(`Write path is explicitly forbidden: ${target}`);
  if (!matchesPrefix(allowedWrite, target)) return deny(`Write path is outside the declared work-unit scope: ${target}`);
  return allow();
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
