import crypto from "node:crypto";
import path from "node:path";

export const EVIDENCE_ENVELOPE_SCHEMA = "bthwani-evidence-envelope/1";
export const ROOT_GRAPH_SCHEMA = "bthwani-root-graph/1";

const normalizePath = (value) => String(value ?? "")
  .replaceAll("\\", "/")
  .replace(/^file:\/\//u, "")
  .replace(/^\.\//u, "");
const normalizeStatus = (value) => String(value ?? "UNKNOWN").trim().toUpperCase();
const normalizeSeverity = (value) => {
  const severity = String(value ?? "UNSPECIFIED").trim().toUpperCase();
  if (["ERR", "ERROR", "FATAL", "BLOCKER", "CRITICAL", "HIGH"].includes(severity)) return "ERROR";
  if (["WARN", "WARNING", "MEDIUM", "MAJOR"].includes(severity)) return "WARNING";
  if (["INFO", "INFORMATIONAL", "LOW", "MINOR", "NOTE", "NOTICE"].includes(severity)) return "INFO";
  return severity || "UNSPECIFIED";
};
const sha256 = (value) => crypto.createHash("sha256").update(String(value ?? "")).digest("hex");
const unique = (entries) => [...new Set(entries.filter(Boolean))];

function categoryForTool(toolId, message = "") {
  const value = `${toolId} ${message}`.toLowerCase();
  if (/generated|openapi|contract|binding|provenance/u.test(value)) return "CONTRACT_OR_PROVENANCE";
  if (/gitleaks|trivy|osv|zizmor|pinact|dependency|security|secret|vulnerab/u.test(value)) return "SECURITY_OR_SUPPLY_CHAIN";
  if (/knip|madge|jscpd|cycle|duplicate|unused|ownerless/u.test(value)) return "STRUCTURAL_INTEGRITY";
  if (/test|playwright|schemathesis|axe|runtime|smoke/u.test(value)) return "TEST_OR_RUNTIME_BEHAVIOR";
  if (/build|typecheck|tsc|compiler|golangci|eslint|shellcheck|hadolint|yamllint|actionlint/u.test(value)) return "STATIC_OR_BUILD_ANALYSIS";
  return "TOOL_OR_CHECK_FINDING";
}

function ownershipSegment(file) {
  const normalized = normalizePath(file);
  if (!normalized) return "repository";
  const segments = normalized.split("/").filter(Boolean);
  return segments.slice(0, Math.min(3, Math.max(1, segments.length - 1))).join("/") || "repository";
}

function rootCandidate(toolId, finding) {
  const owner = ownershipSegment(finding.location?.path);
  const family = finding.category || categoryForTool(toolId, finding.message);
  const rule = String(finding.ruleId || "UNSPECIFIED").toLowerCase();
  return {
    rootKey: `${family.toLowerCase()}:${owner}:${rule}`,
    rootFamily: family,
    canonicalOwnerHint: owner,
    sourceOfFixStatus: "REQUIRES_PRIMARY_AGENT",
  };
}

function normalizedFinding(toolId, finding, index = 0) {
  const location = finding.location ?? {};
  const file = normalizePath(finding.path ?? finding.file ?? finding.filepath ?? finding.component ?? location.path);
  const line = Number(finding.startLine ?? finding.line ?? location.line ?? 0) || 0;
  const column = Number(finding.startColumn ?? finding.column ?? location.column ?? 0) || 0;
  const ruleId = String(finding.ruleId ?? finding.rule ?? finding.check_id ?? finding.kind ?? finding.ident ?? "UNSPECIFIED");
  const message = String(finding.message ?? finding.desc ?? finding.description ?? finding.reason ?? "tool finding").trim();
  const severity = normalizeSeverity(finding.severity ?? finding.level ?? finding.type);
  const category = finding.category ?? categoryForTool(toolId, `${ruleId} ${message}`);
  const fingerprint = String(finding.fingerprint ?? finding.id ?? finding.key ?? sha256(JSON.stringify({toolId, ruleId, file, line, message, index})));
  const material = finding.material !== false && !["INFO", "NOTE", "NOTICE"].includes(severity);
  const result = {
    findingId: `${toolId}:${fingerprint}`,
    fingerprint,
    ruleId,
    category,
    severity,
    message,
    material,
    location: {path: file, line, column},
    rawIndex: index,
    disposition: finding.disposition ?? "MAPPED_TO_FINDING",
  };
  result.rootCandidate = finding.rootCandidate ?? rootCandidate(toolId, result);
  return result;
}

function tryParseJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function jsonDocuments(rawText) {
  const trimmed = String(rawText ?? "").trim();
  if (!trimmed) return [];
  const whole = tryParseJson(trimmed);
  if (whole !== null) return [whole];
  return trimmed.split(/\r?\n/u).map((line) => tryParseJson(line.trim())).filter((value) => value !== null);
}

function findingsFromTrivy(payload) {
  const findings = [];
  for (const result of payload?.Results ?? []) {
    for (const group of ["Vulnerabilities", "Misconfigurations", "Secrets", "Licenses"]) {
      for (const item of result?.[group] ?? []) {
        findings.push({
          fingerprint: item.VulnerabilityID ?? item.ID ?? item.RuleID,
          ruleId: item.VulnerabilityID ?? item.ID ?? item.RuleID ?? group,
          severity: item.Severity,
          path: result.Target,
          line: item.IacMetadata?.StartLine ?? item.StartLine,
          message: item.Title ?? item.Message ?? item.Description ?? `${group} finding`,
          category: "SECURITY_OR_SUPPLY_CHAIN",
        });
      }
    }
  }
  return findings;
}

function findingsFromOsv(payload) {
  const findings = [];
  for (const result of payload?.results ?? []) {
    for (const pkg of result?.packages ?? []) {
      for (const vulnerability of pkg?.vulnerabilities ?? []) {
        findings.push({
          fingerprint: `${vulnerability.id}:${pkg.package?.name ?? pkg.package?.purl ?? "package"}`,
          ruleId: vulnerability.id ?? "OSV_ADVISORY",
          severity: vulnerability.database_specific?.severity ?? "ERROR",
          path: result.source?.path ?? result.source?.lockfile?.path ?? "dependency",
          message: `${pkg.package?.name ?? pkg.package?.purl ?? "dependency"} ${vulnerability.summary ?? vulnerability.details ?? "is affected"}`,
          category: "SECURITY_OR_SUPPLY_CHAIN",
        });
      }
    }
  }
  return findings;
}

function findingsFromZizmor(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((finding) => ({
    fingerprint: finding.ident ?? finding.id,
    ruleId: finding.ident ?? "ZIZMOR",
    severity: finding.determinations?.severity,
    path: finding.locations?.[0]?.symbolic?.key?.Local?.verbatim_path
      ?? finding.locations?.[0]?.concrete?.location?.path,
    line: finding.locations?.[0]?.concrete?.location?.line,
    message: finding.desc ?? "workflow security finding",
    category: "SECURITY_OR_SUPPLY_CHAIN",
  }));
}

function findingsFromKnip(payload) {
  if (!Array.isArray(payload?.issues)) return [];
  const findings = [];
  for (const issue of payload.issues) {
    const file = issue.file ?? "repository";
    const kinds = Object.entries(issue).filter(([, value]) => Array.isArray(value));
    if (kinds.length === 0) findings.push({path: file, ruleId: "KNIP_UNUSED", message: "unused or ownerless artifact", severity: "WARNING"});
    for (const [kind, entries] of kinds) {
      for (const entry of entries) {
        findings.push({
          path: file,
          line: entry.line,
          ruleId: `KNIP_${kind.toUpperCase()}`,
          message: String(entry.name ?? entry.symbol ?? entry),
          severity: "WARNING",
          category: "STRUCTURAL_INTEGRITY",
        });
      }
    }
  }
  return findings;
}

function findingsFromStructured(toolId, payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload) && toolId === "gitleaks") return payload.map((finding) => ({
    fingerprint: finding.Fingerprint,
    ruleId: finding.RuleID ?? "SECRET_DETECTED",
    severity: "ERROR",
    path: finding.File,
    line: finding.StartLine,
    message: finding.Description ?? "potential secret detected",
    category: "SECURITY_OR_SUPPLY_CHAIN",
  }));
  if (String(payload.schema ?? "").startsWith("bthwani-codeql-evidence/")) return (payload.findings ?? []).map((finding) => ({
    ...finding,
    material: finding.material !== false && (payload.mode === "full" || finding.inChangedCone !== false),
    disposition: payload.mode === "full" || finding.inChangedCone !== false ? "MAPPED_TO_FINDING" : "BASELINE",
  }));
  if (String(payload.schema ?? "").startsWith("bthwani-sonar-evidence/")) return payload.findings ?? [...(payload.issues ?? []), ...(payload.hotspots ?? [])];
  if (String(payload.schema ?? "").startsWith("bthwani-semgrep-evidence/")) {
    const evaluated = new Set((payload.results ?? []).map((item) => JSON.stringify([item.check_id, item.path, item.start?.line, item.extra?.message])));
    return (payload.rawResults ?? payload.results ?? []).map((item) => {
      const inEvaluatedCone = evaluated.has(JSON.stringify([item.check_id, item.path, item.start?.line, item.extra?.message]));
      return {
        fingerprint: item.extra?.fingerprint,
        ruleId: item.check_id,
        severity: item.extra?.severity,
        path: item.path,
        line: item.start?.line,
        message: item.extra?.message,
        material: inEvaluatedCone,
        disposition: inEvaluatedCone ? "MAPPED_TO_FINDING" : "BASELINE",
      };
    });
  }
  const trivy = findingsFromTrivy(payload);
  if (trivy.length) return trivy;
  const osv = findingsFromOsv(payload);
  if (osv.length) return osv;
  const zizmor = findingsFromZizmor(payload);
  if (zizmor.length) return zizmor;
  const knip = findingsFromKnip(payload);
  if (knip.length) return knip;
  if (Array.isArray(payload.duplicates)) {
    const total = payload.statistics?.total ?? {};
    const hasBaselineCounters = total.newClones !== undefined || total.newDuplicatedLines !== undefined;
    const baselineOnly = hasBaselineCounters
      && Number(total.newClones ?? 0) === 0
      && Number(total.newDuplicatedLines ?? 0) === 0;
    return payload.duplicates.map((duplicate) => ({
      ruleId: "JSCPD_DUPLICATION",
      severity: "WARNING",
      path: duplicate.firstFile?.name ?? duplicate.firstFile?.path,
      line: duplicate.firstFile?.start,
      message: `duplicate with ${duplicate.secondFile?.name ?? duplicate.secondFile?.path ?? "another artifact"}`,
      category: "STRUCTURAL_INTEGRITY",
      material: !baselineOnly,
      disposition: baselineOnly ? "BASELINE" : "MAPPED_TO_FINDING",
    }));
  }
  const collections = [
    payload.findings,
    payload.issues,
    payload.violations,
    payload.results,
    payload.problems,
    payload.messages,
    payload.failures,
    payload.diagnostics,
    payload.warnings,
    payload.breakingChanges,
  ];
  const collection = collections.find(Array.isArray);
  if (collection) return collection;
  for (const key of ["finding", "issue", "violation", "diagnostic", "warning", "breakingChange", "failure"]) {
    if (payload[key] && typeof payload[key] === "object") return [payload[key]];
  }
  if (toolId === "actionlint" && (payload.filepath || payload.message)) return [payload];
  return [];
}

function findingsFromText(toolId, rawText) {
  const findings = [];
  const consumedLines = new Set();
  const lines = String(rawText ?? "").split(/\r?\n/u);
  const patterns = [
    /^(?<path>.+?):(?<line>\d+):(?<column>\d+):\s*(?<severity>error|warning|info|note):\s*(?<message>.*?)(?:\s*\[(?<rule>SC\d+)\])?$/iu,
    /^(?<path>.+?):(?<line>\d+)(?::(?<column>\d+))?\s+(?<rule>DL\d+|SC\d+|[A-Z][A-Z0-9_-]+)\s+(?<message>.+)$/u,
    /^(?<path>.+?):(?<line>\d+):(?<column>\d+):\s*\[(?<severity>warning|error)\]\s*(?<message>.+?)\s*\((?<rule>[^)]+)\)$/iu,
    /^(?<path>.+?):(?<line>\d+)\s+mutable action reference:\s*(?<message>.+)$/iu,
  ];
  lines.forEach((line, index) => {
    const trimmed = line.trim().replace(/\u001B\[[0-?]*[ -/]*[@-~]/gu, "");
    if (!trimmed) return;
    if (/\bDeprecationWarning\b|NO_COLOR.*FORCE_COLOR|trace-warnings/iu.test(trimmed)) return;
    if (/(?:^|\s)ℹ\s+(?:fail|skipped|pass|tests?|suites?)\b/iu.test(trimmed)) return;
    for (const pattern of patterns) {
      const match = pattern.exec(trimmed);
      if (!match?.groups) continue;
      findings.push({
        path: match.groups.path,
        line: match.groups.line,
        column: match.groups.column,
        ruleId: match.groups.rule ?? (toolId === "pinact" ? "MUTABLE_ACTION_REFERENCE" : "UNSPECIFIED"),
        severity: match.groups.severity ?? "WARNING",
        message: match.groups.message,
      });
      consumedLines.add(index);
      return;
    }
    const madge = /^\s*\d+\)\s+(?<message>.+)$/u.exec(trimmed);
    if (madge?.groups) {
      findings.push({ruleId: "CIRCULAR_DEPENDENCY", severity: "WARNING", message: madge.groups.message, category: "STRUCTURAL_INTEGRITY"});
      consumedLines.add(index);
    }
  });
  return {findings, consumedLines, lines};
}

function materialDiagnosticLines(lines, consumedLines) {
  return lines.map((line, index) => ({line: line.trim().replace(/\u001B\[[0-?]*[ -/]*[@-~]/gu, ""), index}))
    .filter(({line, index}) => line && !consumedLines.has(index)
      && !/^[ℹ✔✓]/u.test(line)
      && !/(?:^|\s)ℹ\s+(?:fail|skipped|pass|tests?|suites?)\b/iu.test(line)
      && !/^\(Use .*--trace-deprecation/iu.test(line)
      && !/\bDeprecationWarning\b/iu.test(line)
      && !/NO_COLOR.*FORCE_COLOR|trace-warnings/iu.test(line)
      && !/node_modules[\\/].*assets[\\/].+\s+\(\d+(?:\.\d+)?\s*(?:B|KB|MB)\)$/iu.test(line)
      && !/\bno\s+(?:breaking\s+changes?|violations?|issues?|errors?)\b/iu.test(line)
      && /(?:^|\b)(?:error|fail(?:ed|ure)?|warning|warn|missing|unresolved|skipped|blocked|incomplete|vulnerab|breaking|violation|panic|undefined|cannot\s+use|invalid)(?:\b|$)/iu.test(line)
      && !/^(?:exit_code|command|started):/iu.test(line));
}

export function buildEvidenceEnvelope({
  toolId,
  candidate = {},
  status = "UNKNOWN",
  exitCode = null,
  rawText = "",
  nativePayload = null,
  claim = "tool evidence",
  scope = "repository",
  invocationId = "",
  rawPath = "",
}) {
  if (!toolId) throw new Error("toolId is required");
  const documents = nativePayload == null ? jsonDocuments(rawText) : [nativePayload];
  const structuredRaw = documents.flatMap((payload) => findingsFromStructured(toolId, payload));
  const text = findingsFromText(toolId, rawText);
  const rawFindings = structuredRaw.length > 0 ? structuredRaw : text.findings;
  const diagnostics = nativePayload == null
    ? materialDiagnosticLines(text.lines, text.consumedLines).filter(({line}) => tryParseJson(line) === null)
    : [];
  const diagnosticFindings = diagnostics.filter(({line}) => !text.findings.some((finding) => line.includes(finding.message)));
  const findings = rawFindings.map((finding, index) => normalizedFinding(toolId, finding, index));
  const engineConditions = [];
  const coverageGaps = [];
  const payload = nativePayload && typeof nativePayload === "object" ? nativePayload : documents[0];
  const provenEngineLimitations = String(payload?.schema ?? "").startsWith("bthwani-semgrep-evidence/")
    && payload?.evidenceComplete === true
    && Number(payload?.unknownRequiredCoverage ?? 0) === 0;
  for (const error of payload?.errors ?? []) {
    const message = typeof error === "string" ? error : String(error?.message ?? JSON.stringify(error));
    engineConditions.push({
      conditionId: `${toolId}:engine:${sha256(message)}`,
      message,
      material: !provenEngineLimitations,
      disposition: provenEngineLimitations ? "TOOL_LIMITATION_PROVEN" : "MAPPED_TO_FINDING",
      rootCandidate: rootCandidate(toolId, {category: "TOOL_EXECUTION_OR_COVERAGE", message, location: {path: rawPath}}),
    });
  }
  if (payload?.evidenceComplete === false || payload?.coverageStatus === "INCOMPLETE") {
    coverageGaps.push({kind: "INCOMPLETE_NATIVE_EVIDENCE", message: `${toolId} declared incomplete evidence`});
  }
  const expectedHead = String(candidate.headSha ?? "");
  const payloadHead = String(payload?.candidate?.headSha ?? payload?.headSha ?? "");
  if (expectedHead && payloadHead && expectedHead !== payloadHead) {
    coverageGaps.push({kind: "CANDIDATE_MISMATCH", message: `${payloadHead} != ${expectedHead}`});
  }
  for (const {line} of diagnosticFindings) {
    if (findings.some((finding) => line.includes(finding.message))) continue;
    findings.push(normalizedFinding(toolId, {
      ruleId: normalizeStatus(status) === "PASS" ? "TOOL_WARNING" : "TOOL_EXECUTION_FINDING",
      severity: /warn|skipped|incomplete/iu.test(line) ? "WARNING" : "ERROR",
      message: line,
      path: rawPath,
      category: categoryForTool(toolId, line),
    }, findings.length));
  }
  if (normalizeStatus(status) !== "PASS" && findings.length === 0 && engineConditions.length === 0) {
    const message = String(rawText).trim() || `${toolId} exited ${exitCode ?? "without a result"}`;
    findings.push(normalizedFinding(toolId, {
      ruleId: "TOOL_EXECUTION_FINDING",
      severity: "ERROR",
      message: message.slice(0, 4000),
      path: rawPath,
    }, 0));
  }
  const rawFindingCount = structuredRaw.length > 0
    ? structuredRaw.length + diagnosticFindings.length
    : text.findings.length + diagnosticFindings.length;
  const accountedRawFindingCount = findings.length + engineConditions.length;
  const unparsedMaterialOutput = Math.max(0, rawFindingCount - accountedRawFindingCount);
  const unmappedMaterialFindings = findings.filter((finding) => finding.material && !finding.rootCandidate?.rootKey).length;
  const allRawFindingsAccounted = unparsedMaterialOutput === 0;
  const evidenceComplete = allRawFindingsAccounted && unmappedMaterialFindings === 0 && coverageGaps.length === 0;
  return {
    schema: EVIDENCE_ENVELOPE_SCHEMA,
    tool: {id: toolId, invocationId: invocationId || `${toolId}:${sha256(`${candidate.identity ?? candidate.headSha ?? ""}:${rawText}`)}`},
    candidate: {
      headSha: String(candidate.headSha ?? ""),
      baseSha: String(candidate.baseSha ?? ""),
      identity: String(candidate.identity ?? candidate.candidateIdentity ?? candidate.headSha ?? ""),
    },
    claim,
    scope,
    execution: {status: normalizeStatus(status), exitCode},
    raw: {
      path: rawPath,
      format: nativePayload == null ? (documents.length ? "JSON_OR_JSONL" : "TEXT") : "NATIVE_JSON",
      bytes: Buffer.byteLength(String(rawText ?? ""), "utf8"),
      sha256: sha256(rawText),
      native: nativePayload == null ? null : {
        format: "JSON",
        bytes: Buffer.byteLength(JSON.stringify(nativePayload), "utf8"),
        sha256: sha256(JSON.stringify(nativePayload)),
      },
    },
    findings,
    warnings: findings.filter((finding) => finding.severity === "WARNING"),
    engineConditions,
    coverage: {status: coverageGaps.length === 0 ? "COMPLETE" : "INCOMPLETE", gaps: coverageGaps},
    accounting: {
      rawFindingCount,
      accountedRawFindingCount,
      allRawFindingsAccounted,
      unparsedMaterialOutput,
      unmappedMaterialFindings,
      unknownRequiredCoverage: coverageGaps.length,
      evidenceComplete,
    },
    closureClaim: false,
  };
}

const NON_ROOT_DISPOSITIONS = new Set([
  "BASELINE",
  "N/A_PROVEN",
  "SUPERSEDED",
  "DUPLICATE_CORRELATED",
  "DESCENDANT_OF_ROOT",
]);

function dispositionSuppressesRoot(value) {
  return NON_ROOT_DISPOSITIONS.has(String(value?.disposition ?? "").trim().toUpperCase());
}

export function buildUnifiedRootGraph(envelopes, candidateIdentity = "") {
  const roots = new Map();
  for (const envelope of envelopes) {
    const evidenceEntries = [
      ...envelope.findings.map((finding) => ({kind: "finding", value: finding})),
      ...envelope.engineConditions.map((condition) => ({kind: "engine-condition", value: condition})),
    ];
    for (const entry of evidenceEntries) {
      if (entry.value.material === false || dispositionSuppressesRoot(entry.value) || !entry.value.rootCandidate?.rootKey) continue;
      const key = entry.value.rootCandidate.rootKey;
      const root = roots.get(key) ?? {
        rootId: key,
        rootFamily: entry.value.rootCandidate.rootFamily,
        canonicalOwnerHint: entry.value.rootCandidate.canonicalOwnerHint,
        sources: [],
        evidence: [],
        status: "OPEN",
        sourceOfFix: {status: "UNRESOLVED", path: null},
        requiredCleanup: [],
        invalidatedProofs: [],
      };
      if (!root.sources.includes(envelope.tool.id)) root.sources.push(envelope.tool.id);
      root.evidence.push({
        kind: entry.kind,
        id: entry.value.findingId ?? entry.value.conditionId,
        tool: envelope.tool.id,
        candidateIdentity: envelope.candidate.identity || candidateIdentity,
        rawPath: envelope.raw.path,
        disposition: entry.value.disposition ?? "ROOT_MAPPED",
      });
      roots.set(key, root);
    }
  }
  const sortedRoots = [...roots.values()].sort((left, right) => left.rootId.localeCompare(right.rootId));
  return {
    schema: ROOT_GRAPH_SCHEMA,
    candidateIdentity,
    authority: "evidence-and-root-candidates-only",
    roots: sortedRoots,
    rootQueue: sortedRoots.filter((root) => root.status !== "CLOSED").map((root) => root.rootId),
    closureClaim: false,
  };
}

export function summarizeEvidenceConsumption(envelopes, rootGraph = buildUnifiedRootGraph(envelopes)) {
  const sum = (selector) => envelopes.reduce((total, envelope) => total + selector(envelope), 0);
  return {
    schema: "bthwani-evidence-consumption-summary/1",
    allToolEvidenceConsumed: envelopes.length > 0 && envelopes.every((envelope) => envelope.accounting.allRawFindingsAccounted && envelope.accounting.evidenceComplete),
    toolInvocations: envelopes.length,
    rawFindings: sum((envelope) => envelope.accounting.rawFindingCount),
    unaccountedRawFindings: sum((envelope) => Math.max(0, envelope.accounting.rawFindingCount - envelope.accounting.accountedRawFindingCount)),
    unparsedMaterialOutput: sum((envelope) => envelope.accounting.unparsedMaterialOutput),
    unmappedMaterialFindings: sum((envelope) => envelope.accounting.unmappedMaterialFindings),
    unknownRequiredCoverage: sum((envelope) => envelope.accounting.unknownRequiredCoverage),
    incompleteEnvelopes: envelopes.filter((envelope) => envelope.accounting.evidenceComplete !== true).length,
    rootGraphPresent: rootGraph?.schema === ROOT_GRAPH_SCHEMA,
    rootGraphCandidateIdentity: rootGraph?.candidateIdentity ?? "",
    rootQueue: rootGraph?.rootQueue?.length ?? 0,
    sourceOfFixUnresolved: rootGraph?.roots?.filter((root) => root.sourceOfFix?.status !== "RESOLVED").length ?? 0,
    requiredCleanup: rootGraph?.roots?.reduce((count, root) => count + (root.requiredCleanup?.length ?? 0), 0) ?? 0,
    invalidatedProofsPending: rootGraph?.roots?.reduce((count, root) => count + (root.invalidatedProofs?.length ?? 0), 0) ?? 0,
  };
}

export function evidenceConsumptionClosed(summary) {
  return summary.allToolEvidenceConsumed
    && summary.unaccountedRawFindings === 0
    && summary.unparsedMaterialOutput === 0
    && summary.unmappedMaterialFindings === 0
    && summary.unknownRequiredCoverage === 0
    && summary.incompleteEnvelopes === 0
    && summary.rootGraphPresent
    && summary.rootQueue === 0
    && summary.sourceOfFixUnresolved === 0
    && summary.requiredCleanup === 0
    && summary.invalidatedProofsPending === 0;
}
