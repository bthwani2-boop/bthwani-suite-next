import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SONAR_EVIDENCE_SCHEMA = "bthwani-sonar-evidence/1";

const normalizeText = (value) => String(value ?? "").trim();
const severityRank = { INFO: 1, MINOR: 1, MAJOR: 2, WARNING: 2, CRITICAL: 3, BLOCKER: 4 };

const arrayFrom = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.issues)) return payload.issues;
  if (Array.isArray(payload?.hotspots)) return payload.hotspots;
  return [];
};

const pageCoverage = (payload, label) => {
  if (!payload || typeof payload !== "object") return {complete: false, error: `${label}: response is missing`};
  if (payload.error) return {complete: false, error: `${label}: ${normalizeText(payload.error)}`};
  const paging = payload.paging;
  if (!paging || !Number.isFinite(Number(paging.total))) {
    return {complete: false, error: `${label}: paging.total is missing`};
  }
  const entries = arrayFrom(payload, label === "issues" ? "issues" : "hotspots");
  return Number(paging.total) <= entries.length
    ? {complete: true}
    : {complete: false, error: `${label}: response truncated (${entries.length}/${paging.total})`};
};

const normalizeIssue = (issue) => ({
  kind: "issue",
  fingerprint: normalizeText(issue?.key || issue?.hash || `${issue?.rule ?? issue?.ruleKey}:${issue?.component}:${issue?.line}`),
  rule: normalizeText(issue?.rule ?? issue?.ruleKey ?? "UNSPECIFIED"),
  severity: normalizeText(issue?.severity ?? "UNSPECIFIED").toUpperCase(),
  status: normalizeText(issue?.status ?? "OPEN").toUpperCase(),
  type: normalizeText(issue?.type ?? "UNSPECIFIED").toUpperCase(),
  path: normalizeText(issue?.component ?? issue?.project ?? ""),
  line: Number(issue?.line ?? 0) || 0,
  message: normalizeText(issue?.message ?? issue?.flows?.[0]?.locations?.[0]?.msg),
  material: (severityRank[normalizeText(issue?.severity).toUpperCase()] ?? 0) >= severityRank.MAJOR,
});

const normalizeHotspot = (hotspot) => ({
  kind: "hotspot",
  fingerprint: normalizeText(hotspot?.key || hotspot?.hash || `${hotspot?.ruleKey}:${hotspot?.component}:${hotspot?.line}`),
  rule: normalizeText(hotspot?.ruleKey ?? hotspot?.rule ?? "UNSPECIFIED"),
  severity: normalizeText(hotspot?.vulnerabilityProbability ?? "UNSPECIFIED").toUpperCase(),
  status: normalizeText(hotspot?.status ?? "TO_REVIEW").toUpperCase(),
  type: "SECURITY_HOTSPOT",
  path: normalizeText(hotspot?.component ?? ""),
  line: Number(hotspot?.line ?? 0) || 0,
  message: normalizeText(hotspot?.message),
  material: normalizeText(hotspot?.status ?? "TO_REVIEW").toUpperCase() !== "REVIEWED",
});

export function classifySonarEvidence(payload, metadata = {}) {
  const analysis = payload?.analysis;
  const qualityGate = payload?.qualityGate?.projectStatus ?? payload?.qualityGate ?? null;
  const issuesPayload = payload?.issues;
  const hotspotsPayload = payload?.hotspots;
  const issues = arrayFrom(issuesPayload, "issues").map(normalizeIssue);
  const hotspots = arrayFrom(hotspotsPayload, "hotspots").map(normalizeHotspot);
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  const executionStatus = normalizeText(metadata.executionStatus ?? "PASS").toUpperCase();
  const errors = [
    ...(Array.isArray(payload?.errors) ? payload.errors.map(normalizeText).filter(Boolean) : []),
    ...warnings.map(normalizeText).filter(Boolean),
  ];
  if (!["PASS", "SUCCESS", "COMPLETED"].includes(executionStatus)) errors.push(`execution: ${executionStatus}`);
  const issueCoverage = pageCoverage(issuesPayload, "issues");
  const hotspotCoverage = pageCoverage(hotspotsPayload, "hotspots");
  if (!issueCoverage.complete) errors.push(issueCoverage.error);
  if (!hotspotCoverage.complete) errors.push(hotspotCoverage.error);
  if (!qualityGate || !normalizeText(qualityGate.status)) errors.push("qualityGate: status is missing");
  const revision = normalizeText(analysis?.analyses?.[0]?.revision ?? analysis?.revision);
  if (!revision) errors.push("analysis: latest revision is missing");
  else if (metadata.headSha && revision !== metadata.headSha) errors.push(`analysis: revision ${revision} does not match candidate ${metadata.headSha}`);
  const analysisId = normalizeText(analysis?.analysisId ?? analysis?.analyses?.[0]?.key ?? analysis?.key);
  if (metadata.analysisId && !analysisId) errors.push("analysis: exact analysis id is missing");
  else if (metadata.analysisId && analysisId !== metadata.analysisId) errors.push(`analysis: id ${analysisId} does not match ${metadata.analysisId}`);
  if (metadata.prNumber) {
    const pullRequest = payload?.pullRequest;
    if (!pullRequest || String(pullRequest.key ?? "") !== String(metadata.prNumber)) {
      errors.push(`pull request: exact PR ${metadata.prNumber} is missing`);
    } else if (normalizeText(pullRequest?.commit?.sha) !== normalizeText(metadata.headSha)) {
      errors.push(`pull request: commit does not match candidate ${metadata.headSha}`);
    }
  }
  const findings = [...issues, ...hotspots];
  const materialFindings = findings.filter((finding) => finding.material);
  const evidenceComplete = errors.length === 0;
  const qualityGateStatus = normalizeText(qualityGate?.status).toUpperCase() || "UNKNOWN";
  const status = !evidenceComplete
    ? "INCOMPLETE"
    : qualityGateStatus !== "OK" ? "QUALITY_GATE_OPEN" : materialFindings.length > 0 ? "FINDINGS_OPEN" : "PASS";
  return {
    schema: SONAR_EVIDENCE_SCHEMA,
    candidate: {headSha: metadata.headSha ?? "", baseSha: metadata.baseSha ?? ""},
    mode: metadata.mode ?? "affected",
    executionStatus,
    coverageStatus: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
    analysis: {key: normalizeText(analysis?.analyses?.[0]?.key), analysisId, revision},
    qualityGate: {status: qualityGateStatus, conditions: qualityGate?.conditions ?? []},
    findings,
    issues,
    hotspots,
    measures: payload?.measures ?? null,
    warnings,
    errors,
    findingStatus: findings.length === 0 ? "CLEAN" : "FINDINGS_OPEN",
    evidenceConsumption: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
    evidenceComplete,
    evidenceDebt: !evidenceComplete,
    status,
    closureClaim: false,
    counts: {
      issues: issues.length,
      hotspots: hotspots.length,
      findings: findings.length,
      materialFindings: materialFindings.length,
      warnings: warnings.length,
      errors: errors.length,
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

export function runSonarClassifier({input, outputDir, headSha, baseSha, mode, analysisId, prNumber, executionStatus}) {
  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const result = classifySonarEvidence(payload, {headSha, baseSha, mode, analysisId, prNumber, executionStatus});
  fs.mkdirSync(outputDir, {recursive: true});
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "assurance-evidence.json"), `${JSON.stringify({
    ...result,
    raw: payload,
  }, null, 2)}\n`);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node tools/scripts/classify-sonar-evidence.mjs --input FILE --output-dir DIR --head-sha SHA");
    return;
  }
  const result = runSonarClassifier({
    input: argumentValue(args, "--input"),
    outputDir: argumentValue(args, "--output-dir"),
    headSha: argumentValue(args, "--head-sha"),
    baseSha: argumentValue(args, "--base-sha", false),
    mode: argumentValue(args, "--mode", false) || "affected",
    analysisId: argumentValue(args, "--analysis-id", false),
    prNumber: argumentValue(args, "--pr-number", false),
    executionStatus: argumentValue(args, "--execution-status", false) || "PASS",
  });
  console.log(JSON.stringify(result));
  if (!result.evidenceComplete) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
