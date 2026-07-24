import { execFileSync } from "node:child_process";
import { fail } from "./_guard-utils.mjs";

const guardId = "nomenclature-guard";
const violations = [];

const ZERO_SHA = /^0+$/;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
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
  } catch (error) {
    return "";
  }
}

const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";

const files = getChangedFiles(baseSha, headSha);

for (const file of files) {
  // Check filename first
  if (/jrn/i.test(file)) {
    violations.push({ file, line: 0, message: "OBJECTIVE_NOMENCLATURE_REQUIRED_IN_FILENAME" });
    continue;
  }

  // Check diff content
  const diff = getDiffContent(baseSha, headSha, file);
  const lines = diff.split(/\r?\n/);
  
  for (const line of lines) {
    // Only care about newly added lines (+), but not file header (+++)
    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (/jrn/i.test(line)) {
        violations.push({ file, line: 0, message: "OBJECTIVE_NOMENCLATURE_REQUIRED_IN_CODE" });
        break; // One violation per file is enough
      }
    }
  }
}

fail(guardId, violations);
