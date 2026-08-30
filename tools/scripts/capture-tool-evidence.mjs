import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

import {buildEvidenceEnvelope} from "./lib/evidence-envelope.mjs";

function resolveCandidateFromEnvironment() {
  const headSha = String(
    process.env.CANDIDATE_SHA
      || process.env.HEAD_SHA
      || process.env.GITHUB_SHA
      || execFileSync("git", ["rev-parse", "HEAD"], {encoding: "utf8", windowsHide: true}),
  ).trim();
  const baseSha = String(process.env.BASE_SHA || process.env.GITHUB_BASE_SHA || "").trim();
  if (!/^[0-9a-f]{40}$/iu.test(headSha)) throw new Error("candidate head SHA must be a full commit SHA");
  if (baseSha && !/^[0-9a-f]{40}$/iu.test(baseSha)) throw new Error("candidate base SHA must be empty or a full commit SHA");
  return {headSha, baseSha, identity: headSha};
}

function readNative(file) {
  if (!file || !fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  try { return JSON.parse(raw); } catch { return null; }
}

export function captureToolEvidence({toolId, status, exitCode, rawFile, nativeFile = "", output, headSha, baseSha = "", scope = "exact candidate"}) {
  if (!/^[0-9a-f]{40}$/iu.test(String(headSha ?? ""))) throw new Error("headSha must be a full commit SHA");
  if (baseSha && !/^[0-9a-f]{40}$/iu.test(String(baseSha))) throw new Error("baseSha must be empty or a full commit SHA");
  const rawText = rawFile && fs.existsSync(rawFile) ? fs.readFileSync(rawFile, "utf8") : "";
  const nativePayload = readNative(nativeFile);
  const envelope = buildEvidenceEnvelope({
    toolId,
    candidate: {headSha, baseSha, identity: headSha},
    status,
    exitCode: Number.isFinite(Number(exitCode)) ? Number(exitCode) : null,
    rawText,
    nativePayload,
    rawPath: nativeFile || rawFile,
    claim: `${toolId} analyzer evidence`,
    scope,
  });
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  return envelope;
}

export function writeToolEvidence({
  toolId,
  status,
  exitCode,
  rawText = "",
  nativePayload = null,
  rawPath = "",
  outputDir = process.env.BTHWANI_EVIDENCE_DIR || ".diagnostics/tool-evidence",
  candidate = resolveCandidateFromEnvironment(),
  scope = "exact candidate",
  claim = String(toolId) + " invocation evidence",
}) {
  const envelope = buildEvidenceEnvelope({
    toolId,
    candidate,
    status,
    exitCode,
    rawText,
    nativePayload,
    rawPath,
    claim,
    scope,
  });
  const output = path.resolve(outputDir, toolId, "evidence.json");
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  return {envelope, output};
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
  const envelope = captureToolEvidence({
    toolId: argument(args, "--tool-id"),
    status: argument(args, "--status"),
    exitCode: argument(args, "--exit-code", false),
    rawFile: argument(args, "--raw-file"),
    nativeFile: argument(args, "--native-file", false),
    output: argument(args, "--output"),
    headSha: argument(args, "--head-sha"),
    baseSha: argument(args, "--base-sha", false),
    scope: argument(args, "--scope", false) || "exact candidate",
  });
  process.stdout.write(`${JSON.stringify({tool: envelope.tool.id, accounting: envelope.accounting})}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
