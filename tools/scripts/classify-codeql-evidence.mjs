import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CODEQL_EVIDENCE_SCHEMA = "bthwani-codeql-evidence/1";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const normalizeCategory = (value) => String(value ?? "").replace(/\/+$/u, "");
const firstLocation = (result) => result?.locations?.[0]?.physicalLocation ?? {};
const normalizePath = (value) => {
  let result = String(value ?? "").replace(/^file:\/\//u, "").replaceAll("\\", "/");
  try { result = decodeURIComponent(result); } catch { /* keep the raw URI */ }
  result = result.replace(/^\.\//u, "");
  const marker = "/services/";
  const markerIndex = result.indexOf(marker);
  if (markerIndex >= 0) result = result.slice(markerIndex + 1);
  return result;
};

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
      currentPath = fileMatch[1];
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

function pathMatches(candidate, expected) {
  const left = normalizePath(candidate);
  const right = normalizePath(expected);
  return left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
}

function locationInRanges(location, ranges) {
  const physical = location?.physicalLocation ?? location;
  const uri = physical?.artifactLocation?.uri ?? "";
  const start = Number(physical?.region?.startLine ?? 0) || 0;
  const end = Number(physical?.region?.endLine ?? start) || start;
  if (!uri || start < 1) return false;
  for (const [file, fileRanges] of ranges) {
    if (!pathMatches(uri, file)) continue;
    if (fileRanges.some((range) => start <= range.end && end >= range.start)) return true;
  }
  return false;
}

function findingInDiff(result, ranges) {
  return [
    ...(Array.isArray(result?.locations) ? result.locations : []),
    ...(Array.isArray(result?.relatedLocations) ? result.relatedLocations : []),
  ].some((location) => locationInRanges(location, ranges));
}

function sarifFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name.endsWith(".sarif")) files.push(target);
    }
  };
  visit(root);
  return files.sort();
}

function findingFingerprint({category, result, ruleId, uri, line, message}) {
  const partial = result?.partialFingerprints;
  const explicit = partial && Object.values(partial).find((value) => typeof value === "string" && value.trim());
  if (explicit) return explicit.trim();
  return crypto.createHash("sha256")
    .update(JSON.stringify({tool: "codeql", category, ruleId, uri, line, message}))
    .digest("hex");
}

export function classifyCodeqlEvidence({documents, headSha = "", baseSha = "", mode = "full", diffText = ""}) {
  const errors = [];
  const categories = [];
  const findings = [];
  const diffRanges = parseDiffRanges(diffText);

  for (const {file, document} of documents) {
    if (document?.version !== "2.1.0") {
      errors.push(`${file}: unsupported SARIF version ${document?.version ?? "missing"}`);
      continue;
    }
    if (!Array.isArray(document.runs) || document.runs.length === 0) {
      errors.push(`${file}: SARIF has no runs`);
      continue;
    }
    for (const run of document.runs) {
      const category = normalizeCategory(run?.automationDetails?.id);
      if (!category) errors.push(`${file}: SARIF run has no automation category`);
      else categories.push(category);
      if (!Array.isArray(run?.results)) {
        errors.push(`${file}: SARIF run has no results array`);
        continue;
      }
      for (const result of run.results) {
        const location = firstLocation(result);
        const uri = location?.artifactLocation?.uri ?? "";
        const line = Number(location?.region?.startLine ?? 0) || 0;
        const ruleId = String(result?.ruleId ?? "UNSPECIFIED");
        const message = String(result?.message?.text ?? "").trim();
        const rule = run?.tool?.driver?.rules?.find((candidate) => candidate?.id === result?.ruleId);
        const securitySeverity = Number(rule?.properties?.["security-severity"] ?? 0);
        findings.push({
          fingerprint: findingFingerprint({category, result, ruleId, uri, line, message}),
          category,
          ruleId,
          level: String(result?.level ?? "none").toUpperCase(),
          securitySeverity: Number.isFinite(securitySeverity) ? securitySeverity : 0,
          path: uri,
          startLine: line,
          message,
          material: true,
          sourceFile: file,
          inChangedCone: (mode === "full" && diffRanges.size === 0) || findingInDiff(result, diffRanges),
        });
      }
    }
  }

  const scopedFindings = findings.filter((finding) => finding.inChangedCone);
  const inheritedFindings = findings.filter((finding) => !finding.inChangedCone);
  const evidenceComplete = errors.length === 0;
  const securityClean = evidenceComplete && findings.every((finding) => !finding.material);
  return {
    schema: CODEQL_EVIDENCE_SCHEMA,
    candidate: {headSha, baseSha},
    categories: [...new Set(categories)].sort(),
    findings,
    errors,
    status: errors.length ? "INCOMPLETE" : scopedFindings.some((finding) => finding.material) ? "FINDINGS_OPEN" : "PASS",
    mode,
    diffFiles: [...diffRanges.keys()].sort(),
    scopedFindings,
    inheritedFindings,
    executionStatus: documents.length > 0 ? "PASS" : "INCOMPLETE",
    coverageStatus: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
    findingStatus: findings.length === 0 ? "CLEAN" : "FINDINGS_OPEN",
    securityClean,
    evidenceConsumption: evidenceComplete ? "COMPLETE" : "INCOMPLETE",
    evidenceComplete,
    evidenceDebt: !evidenceComplete,
    closureClaim: false,
    counts: {
      documents: documents.length,
      categories: new Set(categories).size,
      findings: findings.length,
      materialFindings: findings.filter((finding) => finding.material).length,
      scopedFindings: findings.filter((finding) => finding.inChangedCone).length,
      scopedMaterialFindings: findings.filter((finding) => finding.inChangedCone && finding.material).length,
      inheritedFindings: findings.filter((finding) => !finding.inChangedCone).length,
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

export function runCodeqlClassifier({inputDir, outputDir, headSha, baseSha, mode = "full", diffText = ""}) {
  const files = sarifFiles(inputDir);
  fs.mkdirSync(outputDir, {recursive: true});
  const documents = [];
  const errors = [];
  if (files.length === 0) errors.push(`${inputDir}: no SARIF documents found`);
  for (const file of files) {
    try { documents.push({file, document: readJson(file)}); }
    catch (error) { errors.push(`${file}: invalid JSON: ${error.message}`); }
  }
  const result = classifyCodeqlEvidence({documents, headSha, baseSha, mode, diffText});
  result.errors.push(...errors);
  if (errors.length) {
    result.status = "INCOMPLETE";
    result.counts.errors += errors.length;
    result.coverageStatus = "INCOMPLETE";
    result.evidenceComplete = false;
    result.securityClean = false;
    result.evidenceConsumption = "INCOMPLETE";
    result.evidenceDebt = true;
  }
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "findings.json"), `${JSON.stringify(result.findings, null, 2)}\n`);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const diffFile = argumentValue(args, "--diff-file", false);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node tools/scripts/classify-codeql-evidence.mjs --input-dir DIR --output-dir DIR --head-sha SHA [--base-sha SHA]");
    return;
  }
  const result = runCodeqlClassifier({
    inputDir: argumentValue(args, "--input-dir"),
    outputDir: argumentValue(args, "--output-dir"),
    headSha: argumentValue(args, "--head-sha"),
    baseSha: argumentValue(args, "--base-sha", false),
    mode: argumentValue(args, "--mode", false) || "full",
    diffText: diffFile
      ? fs.readFileSync(diffFile, "utf8")
      : "",
  });
  console.log(JSON.stringify(result));
  if (result.status !== "PASS") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
