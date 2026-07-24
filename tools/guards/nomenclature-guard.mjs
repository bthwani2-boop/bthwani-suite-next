import { execFileSync } from "node:child_process";
import { fail } from "./_guard-utils.mjs";

const guardId = "nomenclature-guard";
const violations = [];

const ZERO_SHA = /^0+$/;
const JOURNEY_ID = /\bJRN[-_\s]?\d{3}\b/i;
const USER_VISIBLE_PROP = /\b(?:title|subtitle|label|heading|description|message|placeholder|accessibilityLabel|emptyText|errorText|sectionTitle|tabLabel)\s*[:=]/i;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function inUserFacingScope(file) {
  if (!/\.(?:tsx?|jsx?)$/i.test(file)) return false;
  if (/(?:^|\/)(?:tests?|__tests__|generated|clients\/generated)(?:\/|$)/i.test(file)) return false;
  return (
    /^apps\/[^/]+\/runtime\/src\//.test(file) ||
    /^services\/[^/]+\/frontend\//.test(file)
  );
}

function getChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMR", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];

  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
  } catch (error) {
    console.warn(`Unable to resolve changed files for ${baseSha || "<none>"}..${headSha}. Assuming no files changed. Error: ${error.message}`);
    return [];
  }
}

function getDiffContent(baseSha, headSha, file) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "-U0", baseSha, headSha, "--", file]
    : ["show", "-U0", headSha, "--", file];
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch {
    return "";
  }
}

function exposesInternalJourneyId(line) {
  if (!JOURNEY_ID.test(line)) return false;

  // Internal route names, imports, identifiers, test references and governed
  // capability IDs are legitimate. Only rendered JSX text and common UI-copy
  // properties are user-facing nomenclature boundaries.
  const jsxText = />[^<\r\n]*\bJRN[-_\s]?\d{3}\b[^<\r\n]*</i.test(line);
  const visibleProperty = USER_VISIBLE_PROP.test(line);
  return jsxText || visibleProperty;
}

const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";

const files = getChangedFiles(baseSha, headSha).filter(inUserFacingScope);

for (const file of files) {
  const diff = getDiffContent(baseSha, headSha, file);
  const lines = diff.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (!exposesInternalJourneyId(line.slice(1))) continue;

    violations.push({
      file,
      line: 0,
      message: "INTERNAL_JOURNEY_ID_EXPOSED_TO_USER — replace JRN identifier with an objective product label",
    });
    break;
  }
}

fail(guardId, violations);
