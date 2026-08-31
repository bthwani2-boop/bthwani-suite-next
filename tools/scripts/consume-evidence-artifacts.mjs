import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  buildEvidenceEnvelope,
  buildUnifiedRootGraph,
  evidenceConsumptionClosed,
  summarizeEvidenceConsumption,
} from "./lib/evidence-envelope.mjs";

const SHA = /^[0-9a-f]{40}$/iu;
const normalizePath = (value) => String(value ?? "").replaceAll("\\", "/");

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else if (entry.isFile()) files.push(target);
  }
  return files.sort();
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function toolFromSchema(payload, file) {
  const schema = String(payload?.schema ?? "");
  if (schema.startsWith("bthwani-codeql-evidence/")) return "codeql";
  if (schema.startsWith("bthwani-sonar-evidence/")) return "sonar";
  if (schema.startsWith("bthwani-semgrep-evidence/")) return "semgrep";
  if (schema.startsWith("bthwani-osv-adjudication/")) return "osv-scanner";
  if (payload?.tool) return String(payload.tool);
  return path.basename(file, path.extname(file)).replace(/(?:-report|-summary|-evidence)$/u, "");
}

function payloadCandidate(payload) {
  return {
    headSha: payload?.candidate?.headSha ?? payload?.headSha ?? payload?.candidateSha ?? "",
    baseSha: payload?.candidate?.baseSha ?? payload?.baseSha ?? "",
  };
}

function hasRecognizedNativeAnalyzerShape(payload) {
  return Array.isArray(payload?.duplicates)
    || Array.isArray(payload?.issues)
    || Array.isArray(payload?.findings)
    || Array.isArray(payload?.violations)
    || Array.isArray(payload?.problems)
    || Array.isArray(payload?.messages)
    || Array.isArray(payload?.failures)
    || Array.isArray(payload?.circularDependencies);
}

function payloadStatus(payload, {allowImplicitPass = false} = {}) {
  const explicitRaw = payload?.status ?? payload?.outcome ?? payload?.executionStatus;
  const explicit = explicitRaw === undefined || explicitRaw === null || String(explicitRaw).trim() === ""
    ? ""
    : String(explicitRaw).toUpperCase();
  const passing = ["PASS", "SUCCESS", "COMPLETED", "N/A_PROVEN"];

  if (explicit && !passing.includes(explicit)) return explicit;
  if (payload?.evidenceComplete === false || String(payload?.coverageStatus ?? "").toUpperCase() === "INCOMPLETE") {
    return "INCOMPLETE";
  }
  if (explicit === "N/A_PROVEN") return "N/A_PROVEN";
  if (explicit) return "PASS";
  return allowImplicitPass ? "PASS" : "INCOMPLETE";
}

function canImplicitlyPass(payload) {
  const schema = String(payload?.schema ?? "");
  if (schema.startsWith("bthwani-")) return payload?.evidenceComplete === true;
  return !schema && hasRecognizedNativeAnalyzerShape(payload);
}

function isUniversalPayload(payload) {
  const normalized = String(payload?.schema ?? "").startsWith("bthwani-")
    && (Array.isArray(payload?.findings) || Array.isArray(payload?.results) || payload?.evidenceComplete !== undefined);
  return normalized || hasRecognizedNativeAnalyzerShape(payload);
}

function isUploadMetadata(file, payload) {
  const name = path.basename(file).toLowerCase();
  return name === "artifact-metadata.json"
    || (payload?.artifactId !== undefined && payload?.artifactName !== undefined && Object.keys(payload).length <= 3);
}

function descriptorEnvelope(file, descriptor, candidate) {
  const logFile = path.resolve(path.dirname(file), String(descriptor.log ?? `${descriptor.analyzer}.log`));
  const directory = path.resolve(path.dirname(file));
  const relative = path.relative(directory, logFile);
  const safeLog = relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
    ? logFile
    : "";
  const rawText = safeLog && fs.existsSync(safeLog) ? fs.readFileSync(safeLog, "utf8") : "";
  return buildEvidenceEnvelope({
    toolId: String(descriptor.analyzer),
    candidate: {...candidate, headSha: descriptor.candidateSha ?? candidate.headSha},
    status: payloadStatus(descriptor),
    exitCode: payloadStatus(descriptor) === "PASS" ? 0 : 1,
    rawText,
    nativePayload: rawText ? null : {...descriptor, evidenceComplete: false, errors: [`${descriptor.analyzer}: raw log is missing`]},
    rawPath: safeLog || file,
    claim: `${descriptor.analyzer} remote analyzer evidence`,
    scope: descriptor.scope ?? "repository candidate",
  });
}

function universalEnvelope(file, payload, candidate, baseline = false) {
  const nativeToolId = toolFromSchema(payload, file);
  const toolId = baseline ? `${nativeToolId}-baseline` : nativeToolId;
  const nativeCandidate = payloadCandidate(payload);
  const status = payloadStatus(payload, {allowImplicitPass: canImplicitlyPass(payload)});
  return buildEvidenceEnvelope({
    toolId,
    candidate: {
      ...candidate,
      headSha: baseline ? (nativeCandidate.headSha || candidate.baseSha) : candidate.headSha,
      baseSha: nativeCandidate.baseSha || candidate.baseSha,
      identity: baseline ? `${nativeCandidate.headSha || candidate.baseSha}:baseline-for:${candidate.headSha}` : candidate.identity,
    },
    status,
    exitCode: status === "PASS" ? 0 : 1,
    nativePayload: payload,
    rawText: JSON.stringify(payload),
    rawPath: file,
    claim: `${toolId} normalized analyzer evidence`,
  });
}

function logEnvelope(file, candidate) {
  const rawText = fs.readFileSync(file, "utf8");
  const exitCode = Number(rawText.match(/(?:^|\n)EXIT_CODE:\s*(-?\d+)/u)?.[1] ?? 0);
  const failed = exitCode !== 0 || /(?:^|\b)(?:FAIL|FAILED|BLOCKED)(?:\b|\])/u.test(rawText);
  const markerTool = rawText.match(/^\[([A-Z][A-Z0-9_-]+)\s+(?:PASS|FAIL|WARN|WARNING|BLOCKED|SKIP)/mu)?.[1]?.toLowerCase();
  return buildEvidenceEnvelope({
    toolId: markerTool || path.basename(file, path.extname(file)),
    candidate,
    status: failed ? "FAIL" : "PASS",
    exitCode,
    rawText,
    rawPath: file,
    claim: "tool log evidence",
  });
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha = "", requiredTools = []}) {
  if (!SHA.test(headSha)) throw new Error("headSha must be a full commit SHA");
  if (baseSha && !SHA.test(baseSha)) throw new Error("baseSha must be empty or a full commit SHA");
  const root = path.resolve(inputDir);
  const candidate = {headSha, baseSha, identity: headSha};
  const files = walk(root);
  const consumed = new Set();
  const envelopes = [];

  for (const file of files.filter((entry) => entry.endsWith(".json"))) {
    const payload = readJson(file);
    if (!payload) continue;
    if (payload.schema === "bthwani-evidence-envelope/1") {
      const payloadHead = String(payload.candidate?.headSha ?? "");
      if (payloadHead && payloadHead !== headSha && payloadHead !== baseSha) {
        envelopes.push(buildEvidenceEnvelope({
          toolId: `${payload.tool?.id ?? "tool"}-candidate-mismatch`,
          candidate,
          status: "INCOMPLETE",
          nativePayload: {evidenceComplete: false, errors: [`artifact candidate ${payloadHead} does not match ${headSha}`]},
          rawText: JSON.stringify(payload),
          rawPath: file,
        }));
        consumed.add(file);
        continue;
      }
      envelopes.push(payload);
      consumed.add(file);
      if (payload.raw?.path && fs.existsSync(payload.raw.path)) consumed.add(path.resolve(payload.raw.path));
      continue;
    }
    if (payload?.analyzer && payload?.candidateSha) {
      if (fs.existsSync(path.join(path.dirname(file), `${payload.analyzer}.evidence.json`))) {
        consumed.add(file);
        const log = path.resolve(path.dirname(file), String(payload.log ?? `${payload.analyzer}.log`));
        if (fs.existsSync(log)) consumed.add(log);
        continue;
      }
      envelopes.push(descriptorEnvelope(file, payload, candidate));
      consumed.add(file);
      const log = path.resolve(path.dirname(file), String(payload.log ?? `${payload.analyzer}.log`));
      if (fs.existsSync(log)) consumed.add(log);
      continue;
    }
    if (isUniversalPayload(payload)) {
      const baseline = normalizePath(path.relative(root, file)).split("/").includes("baseline");
      const toolId = baseline ? `${toolFromSchema(payload, file)}-baseline` : toolFromSchema(payload, file);
      const capturedEnvelope = path.join(path.dirname(file), `${toolId}.evidence.json`);
      if (!baseline && payload.schema !== "bthwani-evidence-envelope/1" && fs.existsSync(capturedEnvelope)) {
        consumed.add(file);
        continue;
      }
      if (envelopes.some((envelope) => envelope.tool.id === toolId && envelope.raw.path.includes(path.dirname(file)))) continue;
      envelopes.push(universalEnvelope(file, payload, candidate, baseline));
      consumed.add(file);
      continue;
    }
    // Every remaining JSON artifact is still evidence, but an unrecognized
    // schema may never infer PASS. Preserve it, mark coverage incomplete, and
    // force explicit disposition before closure.
    if (!isUploadMetadata(file, payload)) {
      const baseline = normalizePath(path.relative(root, file)).split("/").includes("baseline");
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      const unknownPayload = {
        ...payload,
        evidenceComplete: false,
        errors: [...errors, `UNRECOGNIZED_JSON_EVIDENCE_SCHEMA:${String(payload?.schema ?? "<none>")}`],
      };
      envelopes.push(universalEnvelope(file, unknownPayload, candidate, baseline));
      consumed.add(file);
    }
  }

  for (const file of files.filter((entry) => entry.endsWith(".log") && !consumed.has(entry))) {
    envelopes.push(logEnvelope(file, candidate));
    consumed.add(file);
  }

  for (const requiredTool of [...new Set(requiredTools.map((tool) => String(tool).trim()).filter(Boolean))]) {
    if (envelopes.some((envelope) => envelope.tool.id === requiredTool)) continue;
    envelopes.push(buildEvidenceEnvelope({
      toolId: requiredTool,
      candidate,
      status: "MISSING",
      exitCode: null,
      rawText: "",
      nativePayload: {evidenceComplete: false, errors: [`${requiredTool}: required evidence artifact missing`]},
      claim: `${requiredTool} required closure evidence`,
      scope: "exact candidate",
    }));
  }

  const rootGraph = buildUnifiedRootGraph(envelopes, candidate.identity);
  const summary = summarizeEvidenceConsumption(envelopes, rootGraph);
  const closed = evidenceConsumptionClosed(summary);
  fs.mkdirSync(outputDir, {recursive: true});
  writeJson(path.join(outputDir, "evidence-envelopes.json"), envelopes);
  writeJson(path.join(outputDir, "root-graph.json"), rootGraph);
  writeJson(path.join(outputDir, "evidence-consumption.json"), {...summary, closed, closureClaim: false});
  return {envelopes, rootGraph, summary, closed};
}

function argument(args, name, required = true) {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) {
    if (required) throw new Error(`missing ${name}`);
    return "";
  }
  return args[index + 1];
}

function main() {
  const args = process.argv.slice(2);
  const result = consumeEvidenceArtifacts({
    inputDir: argument(args, "--input-dir"),
    outputDir: argument(args, "--output-dir"),
    headSha: argument(args, "--head-sha"),
    baseSha: argument(args, "--base-sha", false),
    requiredTools: argument(args, "--required-tools", false).split(","),
  });
  process.stdout.write(`${JSON.stringify({...result.summary, closed: result.closed})}\n`);
  if (!result.closed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
