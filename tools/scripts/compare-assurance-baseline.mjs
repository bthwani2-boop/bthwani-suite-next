import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASELINE_SCHEMA = "bthwani-assurance-baseline/1";

const severityRank = {
  INFO: 1,
  NOTE: 1,
  WARNING: 2,
  MEDIUM: 3,
  ERROR: 4,
  HIGH: 4,
  CRITICAL: 5,
  BLOCKER: 5,
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizePath = (value, root = "") => {
  let result = normalizeText(value).replace(/^file:\/\//u, "").replaceAll("\\", "/");
  try { result = decodeURIComponent(result); } catch { /* keep the raw path */ }
  result = result.replace(/^\.\//u, "");
  const normalizedRoot = normalizeText(root).replaceAll("\\", "/").replace(/\/$/u, "");
  if (normalizedRoot && result.startsWith(`${normalizedRoot}/`)) result = result.slice(normalizedRoot.length + 1);
  return result;
};

const firstLocation = (finding) => finding?.locations?.[0] ?? finding?.location ?? {};
const physicalLocation = (finding) => firstLocation(finding)?.physicalLocation ?? firstLocation(finding);
const locationPath = (finding) => physicalLocation(finding)?.artifactLocation?.uri ?? physicalLocation(finding)?.path ?? finding?.path;
const locationLine = (finding) => physicalLocation(finding)?.region?.startLine ?? finding?.start?.line ?? finding?.startLine;
const findingRule = (finding) => finding?.check_id ?? finding?.ruleId ?? finding?.rule_id ?? finding?.rule?.id ?? finding?.id ?? "UNSPECIFIED";
const findingMessage = (finding) => finding?.extra?.message ?? finding?.message ?? finding?.full_description?.text ?? finding?.text ?? "";
const findingSeverity = (finding) => normalizeText(finding?.extra?.severity ?? finding?.level ?? finding?.severity ?? "UNSPECIFIED").toUpperCase();
const findingState = (finding) => normalizeText(finding?.state ?? finding?.status ?? "OPEN").toUpperCase();

function rawFindings(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.findings)) return payload.findings;
  if (Array.isArray(payload?.issues)) return payload.issues;
  if (Array.isArray(payload?.runs)) return payload.runs.flatMap((run) => run?.results ?? []);
  return [];
}

function explicitFingerprint(finding) {
  const direct = [
    finding?.fingerprint,
    finding?.extra?.fingerprint,
    finding?.extra?.metadata?.fingerprint,
  ].find((value) => typeof value === "string" && value.trim());
  if (direct) return direct.trim();
  const partial = finding?.partialFingerprints;
  if (partial && typeof partial === "object") {
    const value = Object.values(partial).find((entry) => typeof entry === "string" && entry.trim());
    if (value) return value.trim();
  }
  return "";
}

export function normalizeFinding(finding, {tool = "unknown", root = ""} = {}) {
  const normalizedTool = normalizeText(finding?.tool ?? tool).toLowerCase();
  const ruleId = normalizeText(findingRule(finding));
  const sourcePath = normalizePath(locationPath(finding), root);
  const startLine = Number(locationLine(finding) ?? 0) || 0;
  const message = normalizeText(findingMessage(finding));
  const fingerprint = explicitFingerprint(finding) || crypto
    .createHash("sha256")
    .update(JSON.stringify({tool: normalizedTool, ruleId, path: sourcePath, startLine, message}))
    .digest("hex");
  return {
    fingerprint,
    tool: normalizedTool,
    ruleId,
    path: sourcePath,
    startLine,
    severity: findingSeverity(finding),
    state: findingState(finding),
    material: finding?.material !== false && !["IGNORED", "N/A_PROVEN"].includes(finding?.disposition),
    message,
  };
}

export function normalizeEvidence(payload, {tool = payload?.tool ?? "unknown", root = ""} = {}) {
  return rawFindings(payload).map((finding) => normalizeFinding(finding, {tool, root}));
}

function mapByFingerprint(findings) {
  return new Map(findings.map((finding) => [finding.fingerprint, finding]));
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unknownCoverage(payload) {
  if (numeric(payload?.unknownRequiredCoverage, 0) > 0) return numeric(payload.unknownRequiredCoverage);
  if (numeric(payload?.unknownEngineErrors, 0) > 0) return numeric(payload.unknownEngineErrors);
  if (payload?.allRawFindingsAccounted === false) return 1;
  return Array.isArray(payload?.errors) ? payload.errors.length : 0;
}

function executionComplete(payload, metadata, role = "candidate") {
  const explicitStatus = role === "baseline" ? metadata.baselineExecutionStatus : metadata.executionStatus;
  const executionPassed = explicitStatus === undefined || ["success", "completed", "pass"].includes(String(explicitStatus).toLowerCase());
  const evidencePassed = payload?.evidenceComplete === undefined || payload.evidenceComplete === true;
  return payload !== null && executionPassed && evidencePassed;
}

function status(state, reasons = []) {
  return {state, reasons: [...new Set(reasons.filter(Boolean))]};
}

export function compareAssuranceBaseline({baselinePayload = null, candidatePayload, metadata = {}}) {
  if (!candidatePayload || typeof candidatePayload !== "object") throw new Error("candidate evidence must be an object or array");
  const baseline = normalizeEvidence(baselinePayload ?? {}, metadata);
  const candidate = normalizeEvidence(candidatePayload, metadata);
  const baselineById = mapByFingerprint(baseline);
  const candidateById = mapByFingerprint(candidate);
  const added = candidate.filter((finding) => !baselineById.has(finding.fingerprint));
  const fixed = baseline.filter((finding) => !candidateById.has(finding.fingerprint));
  const unchanged = candidate.filter((finding) => baselineById.has(finding.fingerprint));
  const worsened = unchanged.filter((finding) => {
    const old = baselineById.get(finding.fingerprint);
    const severityWorsened = (severityRank[finding.severity] ?? 0) > (severityRank[old.severity] ?? 0);
    const reopened = ["RESOLVED", "FIXED", "CLOSED"].includes(old.state) && !["RESOLVED", "FIXED", "CLOSED"].includes(finding.state);
    return severityWorsened || reopened;
  });
  const newMaterial = added.filter((finding) => finding.material);
  const worsenedMaterial = worsened.filter((finding) => finding.material);
  const candidateMaterialCount = candidate.filter((finding) => finding.material).length;
  const baselineRequired = metadata.baselineRequired === true;
  const baselineAvailable = baselinePayload !== null;
  const candidateExecutionComplete = executionComplete(candidatePayload, metadata, "candidate");
  const baselineExecutionComplete = !baselineRequired || (baselineAvailable && executionComplete(baselinePayload, metadata, "baseline"));
  const unknownRequiredCoverage = Math.max(unknownCoverage(baselinePayload), unknownCoverage(candidatePayload));
  const evidenceComplete = candidateExecutionComplete && baselineExecutionComplete;
  const bypassUsed = metadata.bypassUsed === true || candidatePayload?.bypassUsed === true;
  const targetRootFixed = metadata.targetRootFixed === true || candidatePayload?.policy?.targetRootFixed === true;
  const touchedConeOpenRoots = numeric(metadata.touchedConeOpenRoots ?? candidatePayload?.policy?.touchedConeOpenRoots, 0);
  const invalidatedProofsPass = (metadata.invalidatedProofs ?? candidatePayload?.policy?.invalidatedProofs) === "PASS";

  const changeVerificationReasons = [];
  if (newMaterial.length) changeVerificationReasons.push(`new material findings: ${newMaterial.length}`);
  if (worsenedMaterial.length) changeVerificationReasons.push(`worsened material findings: ${worsenedMaterial.length}`);
  if (!evidenceComplete) changeVerificationReasons.push("required evidence did not complete");
  if (baselineRequired && !baselineAvailable) changeVerificationReasons.push("required baseline evidence is missing");
  if (bypassUsed) changeVerificationReasons.push("bypass used");
  const changeVerificationPass = changeVerificationReasons.length === 0 && evidenceComplete && !bypassUsed;

  const changeClosureReasons = [...changeVerificationReasons];
  if (!targetRootFixed) changeClosureReasons.push("target root is not proven fixed");
  if (touchedConeOpenRoots !== 0) changeClosureReasons.push(`touched cone has ${touchedConeOpenRoots} open roots`);
  if (!invalidatedProofsPass) changeClosureReasons.push("invalidated proofs are not PASS");
  const changeClosurePass = changeVerificationPass && changeClosureReasons.length === 0;

  const staticRepositoryBaselineReasons = [];
  if (!evidenceComplete) staticRepositoryBaselineReasons.push("required static baseline evidence did not complete");
  if (candidateMaterialCount) staticRepositoryBaselineReasons.push(`material static baseline findings: ${candidateMaterialCount}`);
  if (unknownRequiredCoverage) staticRepositoryBaselineReasons.push(`unknown required coverage: ${unknownRequiredCoverage}`);
  if (bypassUsed) staticRepositoryBaselineReasons.push("bypass used");
  const staticRepositoryBaselinePass = staticRepositoryBaselineReasons.length === 0;
  const repositoryClosurePass = changeClosurePass && staticRepositoryBaselinePass;

  return {
    schema: BASELINE_SCHEMA,
    candidate: {headSha: metadata.headSha ?? candidatePayload?.headSha ?? "", baseSha: metadata.baseSha ?? candidatePayload?.baseSha ?? ""},
    counts: {
      baseline: baseline.length,
      candidate: candidate.length,
      new: added.length,
      fixed: fixed.length,
      unchanged: unchanged.length,
      worsened: worsened.length,
      newMaterial: newMaterial.length,
      worsenedMaterial: worsenedMaterial.length,
      candidateMaterial: candidateMaterialCount,
      unknownRequiredCoverage,
    },
    dispositionCounts: {
      BASELINE: baseline.length,
      CANDIDATE: candidate.length,
      NEW: added.length,
      FIXED: fixed.length,
      UNCHANGED: unchanged.length,
      WORSENED: worsened.length,
    },
    findings: {new: added, fixed, unchanged, worsened},
    changeVerification: status(changeVerificationPass ? "PASS" : "OPEN", changeVerificationReasons),
    changeClosure: status(changeClosurePass ? "PASS" : "OPEN", changeClosureReasons),
    staticRepositoryBaseline: status(staticRepositoryBaselinePass ? "HEALTHY" : (evidenceComplete ? "BASELINE_OPEN" : "BLOCKED"), staticRepositoryBaselineReasons),
    repositoryClosure: status(repositoryClosurePass ? "CLOSED" : "NOT_CLOSED", repositoryClosurePass ? [] : [
      ...changeClosureReasons,
      ...staticRepositoryBaselineReasons,
      ...(bypassUsed ? ["bypass used; exact SHA is not closed"] : []),
    ]),
    policy: {
      targetRootFixed,
      touchedConeOpenRoots,
      invalidatedProofs: invalidatedProofsPass ? "PASS" : "OPEN",
      bypassUsed,
      baselineRequired,
      baselineAvailable,
      evidenceComplete,
      candidateExecutionComplete,
      baselineExecutionComplete,
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

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node tools/scripts/compare-assurance-baseline.mjs --candidate FILE [--baseline FILE] [--output FILE]");
    return;
  }
  const candidatePath = argumentValue(args, "--candidate");
  const baselinePath = argumentValue(args, "--baseline", false);
  const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  const result = compareAssuranceBaseline({
    candidatePayload: readJson(candidatePath),
    baselinePayload: baselinePath ? readJson(baselinePath) : null,
    metadata: {
      headSha: argumentValue(args, "--head-sha", false),
      baseSha: argumentValue(args, "--base-sha", false),
      root: argumentValue(args, "--root", false),
      executionStatus: argumentValue(args, "--execution-status", false) || undefined,
      baselineExecutionStatus: argumentValue(args, "--baseline-execution-status", false) || undefined,
      baselineRequired: args.includes("--require-baseline"),
      targetRootFixed: args.includes("--target-root-fixed"),
      touchedConeOpenRoots: numeric(argumentValue(args, "--touched-cone-open-roots", false), 0),
      invalidatedProofs: argumentValue(args, "--invalidated-proofs", false),
      bypassUsed: args.includes("--bypass-used"),
    },
  });
  const outputPath = argumentValue(args, "--output", false);
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) fs.writeFileSync(path.resolve(outputPath), serialized, "utf8");
  else process.stdout.write(serialized);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
