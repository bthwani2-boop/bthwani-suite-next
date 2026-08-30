import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL_LIMITATION_PROVEN = "TOOL_LIMITATION_PROVEN";
export const UNKNOWN_ENGINE_ERROR = "UNKNOWN_ENGINE_ERROR";
export const REVIEW_FINDING = "REVIEW_FINDING";
export const BLOCKING_FINDING = "BLOCKING_FINDING";

const workflowPath = (value) => typeof value === "string" && value.startsWith(".github/workflows/");
const typescriptPath = (value) => typeof value === "string" && /\.(?:ts|tsx|mts|cts)$/.test(value);
const powershellPath = (value) => typeof value === "string" && /\.ps1$/i.test(value);
const normalizePath = (value) => String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");

function parseDiffRanges(diffText = "") {
  const ranges = new Map();
  let currentPath = "";
  for (const line of String(diffText).split(/\r?\n/u)) {
    const headerMatch = /^diff --git a\/(.+) b\/(.+)$/u.exec(line);
    if (headerMatch) {
      currentPath = normalizePath(headerMatch[2]);
      continue;
    }
    const fileMatch = /^\+\+\+ b\/(.+)$/u.exec(line);
    if (fileMatch) {
      currentPath = normalizePath(fileMatch[1]);
      continue;
    }
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/u.exec(line);
    if (!hunkMatch || !currentPath) continue;
    const start = Number(hunkMatch[1]);
    const count = hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]);
    if (count > 0) {
      const entries = ranges.get(currentPath) ?? [];
      entries.push({start, end: start + count - 1});
      ranges.set(currentPath, entries);
    }
  }
  return ranges;
}

function findingInDiff(finding, ranges) {
  const file = normalizePath(finding?.path);
  const start = Number(finding?.start?.line ?? finding?.startLine ?? 0) || 0;
  const end = Number(finding?.end?.line ?? finding?.endLine ?? start) || start;
  const fileRanges = ranges.get(file);
  if (start < 1) return Boolean(fileRanges?.length);
  return Boolean(fileRanges?.some((range) => start <= range.end && end >= range.start));
}

const normalizedType = (raw) => {
  if (Array.isArray(raw?.type)) return raw.type[0] ?? "UNSPECIFIED";
  return raw?.type ?? "UNSPECIFIED";
};

const normalizedMessage = (raw) => typeof raw?.message === "string" ? raw.message : "";

const isWorkflowBashMetavariableParse = (raw, type, message) => {
  if (!workflowPath(raw?.path)) return false;
  if (!message.includes("metavariable-pattern")) return false;
  if (!message.includes("parsing a snippet as Bash")) return false;
  return type === "PartialParsing" || type === "Internal matching error";
};

const isKnownWorkflowInternalParse = (raw, type, message) => {
  if (!workflowPath(raw?.path) || type !== "Internal matching error") return false;
  return message.includes("metavariable-pattern failed when parsing $SHELL's content as Bash");
};

const isKnownReadonlyImportTypeParse = (raw, type, message) => {
  if (!typescriptPath(raw?.path) || type !== "PartialParsing") return false;
  return /`readonly import\((['"])[^'"]+\1\)\.[A-Za-z_$][\w$]*` was unexpected/.test(message);
};

const isKnownModernTypeScriptParse = (raw, type, message) => {
  if (!typescriptPath(raw?.path) || type !== "PartialParsing") return false;
  return /`(?:type|,)` was unexpected/.test(message);
};

const isKnownPowerShellPartialParse = (raw, type) => powershellPath(raw?.path) && type === "PartialParsing";

export function classifySemgrepEngineCondition(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      classification: UNKNOWN_ENGINE_ERROR,
      type: "UNSPECIFIED",
      path: "",
      ruleId: "",
      message: "raw engine condition is not an object",
      raw,
    };
  }

  const type = normalizedType(raw);
  const message = normalizedMessage(raw);
  const result = {
    classification: UNKNOWN_ENGINE_ERROR,
    type,
    path: raw.path ?? "",
    ruleId: raw.rule_id ?? "",
    message,
    raw,
  };

  if (isWorkflowBashMetavariableParse(raw, type, message) || isKnownWorkflowInternalParse(raw, type, message)) {
    return {...result, classification: TOOL_LIMITATION_PROVEN, reason: "semgrep-yaml-github-actions-bash-metavariable-parser"};
  }
  if (isKnownReadonlyImportTypeParse(raw, type, message)) {
    return {...result, classification: TOOL_LIMITATION_PROVEN, reason: "semgrep-typescript-readonly-import-type-parser"};
  }
  if (isKnownModernTypeScriptParse(raw, type, message)) {
    return {...result, classification: TOOL_LIMITATION_PROVEN, reason: "semgrep-typescript-modern-syntax-parser"};
  }
  if (isKnownPowerShellPartialParse(raw, type)) {
    return {...result, classification: TOOL_LIMITATION_PROVEN, reason: "semgrep-powershell-parser-not-authoritative"};
  }
  return result;
}

const findingClassification = (result) => {
  const ruleId = typeof result?.check_id === "string" ? result.check_id : "";
  return {
    classification: ruleId.includes(".audit.") ? REVIEW_FINDING : BLOCKING_FINDING,
    ruleId,
    path: result?.path ?? "",
    line: result?.start?.line ?? null,
    severity: result?.extra?.severity ?? "UNSPECIFIED",
    message: result?.extra?.message ?? "",
  };
};

const countBySeverity = (results) => {
  const counts = new Map();
  for (const result of results) {
    const severity = result?.extra?.severity ?? "UNSPECIFIED";
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([severity, count]) => ({ severity, count }));
};

export function classifySemgrepEvidence(payload, metadata = {}) {
  const payloadValid = Boolean(payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray(payload.results));
  const results = payloadValid ? payload.results : [];
  const rawErrors = Array.isArray(payload?.errors) ? payload.errors : [];
  const classifiedErrors = rawErrors.map(classifySemgrepEngineCondition);
  const classifiedFindings = results.map(findingClassification);
  const toolLimitations = classifiedErrors.filter((entry) => entry.classification === TOOL_LIMITATION_PROVEN);
  const unknownErrors = classifiedErrors.filter((entry) => entry.classification === UNKNOWN_ENGINE_ERROR);
  const reviewFindings = classifiedFindings.filter((entry) => entry.classification === REVIEW_FINDING);
  const blockingFindings = classifiedFindings.filter((entry) => entry.classification === BLOCKING_FINDING);
  const mode = metadata.mode ?? "full";
  const diffRanges = parseDiffRanges(metadata.diffText ?? "");
  const scopedResults = mode === "full" ? results : results.filter((result) => findingInDiff(result, diffRanges));
  const scopedErrors = mode === "full" ? classifiedErrors : classifiedErrors.filter((entry) => findingInDiff(entry.raw, diffRanges));
  const unknownErrorsInEvaluatedCone = mode === "full"
    ? unknownErrors.length
    : scopedErrors.filter((entry) => entry.classification === UNKNOWN_ENGINE_ERROR).length;
  const evidenceComplete = payloadValid && classifiedFindings.length === results.length && classifiedErrors.length === rawErrors.length && unknownErrorsInEvaluatedCone === 0;
  const findingsInEvaluatedCone = mode === "full" ? results.length : scopedResults.length;

  return {
    classifiedErrors,
    classifiedFindings,
    evaluatedResults: scopedResults,
    summary: {
      schemaVersion: 4,
      headSha: metadata.headSha ?? "",
      mode,
      baseSha: metadata.baseSha ?? "",
      totalFindings: results.length,
      reviewFindings: reviewFindings.length,
      blockingFindings: blockingFindings.length,
      scopedFindings: scopedResults.length,
      inheritedFindings: results.length - scopedResults.length,
      engineConditions: rawErrors.length,
      classifiedEngineErrors: classifiedErrors.length,
      toolLimitationsProven: toolLimitations.length,
      unknownEngineErrors: unknownErrors.length,
      unknownEngineErrorsInChangedCone: scopedErrors.filter((entry) => entry.classification === UNKNOWN_ENGINE_ERROR).length,
      toolLimitationsInChangedCone: scopedErrors.filter((entry) => entry.classification === TOOL_LIMITATION_PROVEN).length,
      severities: countBySeverity(results),
      allRawFindingsAccounted: payloadValid && classifiedFindings.length === results.length && classifiedErrors.length === rawErrors.length,
      unknownRequiredCoverage: unknownErrorsInEvaluatedCone,
      executionStatus: payloadValid ? "PASS" : "INCOMPLETE",
      coverageStatus: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
      findingStatus: findingsInEvaluatedCone === 0 ? "CLEAN" : "FINDINGS_OPEN",
      evidenceConsumption: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
      evidenceDebt: !evidenceComplete,
      evidenceComplete,
      closureClaim: false,
    },
  };
}

const argumentValue = (args, name, required = true) => {
  const index = args.indexOf(name);
  if (index === -1) {
    if (required) throw new Error(`missing ${name}`);
    return "";
  }
  if (index + 1 >= args.length) throw new Error(`missing value for ${name}`);
  return args[index + 1];
};

export function runNormalizer({ input, outputDir, headSha, mode, baseSha, diffText = "" }) {
  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const normalized = classifySemgrepEvidence(payload, { headSha, mode, baseSha, diffText });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "semgrep.pretty.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "classified-errors.json"), `${JSON.stringify(normalized.classifiedErrors, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "classified-findings.json"), `${JSON.stringify(normalized.classifiedFindings, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(normalized.summary, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "assurance-evidence.json"), `${JSON.stringify({
    schema: "bthwani-semgrep-evidence/1",
    tool: "semgrep",
    headSha,
    baseSha,
    mode,
    results: normalized.evaluatedResults,
    rawResults: payload.results,
    errors: payload.errors ?? [],
    unknownRequiredCoverage: normalized.summary.unknownRequiredCoverage,
    allRawFindingsAccounted: normalized.summary.allRawFindingsAccounted,
    evidenceComplete: normalized.summary.evidenceComplete,
  }, null, 2)}\n`);
  return normalized.summary;
}

const main = () => {
  const args = process.argv.slice(2);
  const diffFile = argumentValue(args, "--diff-file", false);
  const summary = runNormalizer({
    input: argumentValue(args, "--input"),
    outputDir: argumentValue(args, "--output-dir"),
    headSha: argumentValue(args, "--head-sha"),
    mode: argumentValue(args, "--mode"),
    baseSha: argumentValue(args, "--base-sha"),
    diffText: diffFile ? fs.readFileSync(diffFile, "utf8") : "",
  });

  console.log(JSON.stringify(summary));
  if (!summary.evidenceComplete) process.exitCode = 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
