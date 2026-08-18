import { execFileSync } from "node:child_process";
import { fail } from "./_guard-utils.mjs";

const guardId = "nomenclature-guard";
const violations = [];
const ZERO_SHA = /^0+$/;
const JOURNEY_ID = /\bJRN[-_\s]?\d{3}\b/i;
const FORBIDDEN_PLATFORM_LABEL = /\b(?:SaaS|multi[-\s]?tenant|tenant)\b/i;
const USER_VISIBLE_PROP = /\b(?:title|subtitle|label|heading|description|message|placeholder|accessibilityLabel|emptyText|errorText|sectionTitle|tabLabel)\s*[:=]/i;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function inUserFacingScope(file) {
  if (!/\.(?:tsx?|jsx?)$/i.test(file)) return false;
  if (/(?:^|\/)(?:tests?|__tests__|generated|clients\/generated)(?:\/|$)/i.test(file)) return false;
  return /^apps\/[^/]+\/runtime\/src\//.test(file) || /^services\/[^/]+\/frontend\//.test(file);
}

function getChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMR", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/).map(normalizePath).filter(Boolean);
  } catch (error) {
    console.warn(`Unable to resolve changed files for ${baseSha || "<none>"}..${headSha}. Assuming no files changed. Error: ${error.message}`);
    return [];
  }
}

function getDiffContent(baseSha, headSha, file) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase ? ["diff", "-U0", baseSha, headSha, "--", file] : ["show", "-U0", headSha, "--", file];
  try { return execFileSync("git", args, { encoding: "utf8" }); } catch { return ""; }
}

function exposesInternalJourneyId(line) {
  if (!JOURNEY_ID.test(line)) return false;
  return />[^<\r\n]*\bJRN[-_\s]?\d{3}\b[^<\r\n]*</i.test(line) || USER_VISIBLE_PROP.test(line);
}

function exposesForbiddenPlatformLabel(line) {
  if (!FORBIDDEN_PLATFORM_LABEL.test(line)) return false;
  return />[^<\r\n]*\b(?:SaaS|multi[-\s]?tenant|tenant)\b[^<\r\n]*</i.test(line) || USER_VISIBLE_PROP.test(line);
}

const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";
for (const file of getChangedFiles(baseSha, headSha).filter(inUserFacingScope)) {
  for (const line of getDiffContent(baseSha, headSha, file).split(/\r?\n/)) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const added = line.slice(1);
    if (exposesInternalJourneyId(added)) {
      violations.push({ file, line: 0, message: "INTERNAL_JOURNEY_ID_EXPOSED_TO_USER — replace the identifier with an objective product label" });
      break;
    }
    if (exposesForbiddenPlatformLabel(added)) {
      violations.push({ file, line: 0, message: "FORBIDDEN_INTERNAL_PLATFORM_LABEL_EXPOSED_TO_USER — use the actual operator, organization, partner, store, or subscription concept" });
      break;
    }
  }
}

fail(guardId, violations);
