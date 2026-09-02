import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const REF_PATTERN = /^refs\/(?:heads|pull)\/[^\s]+$/u;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/u;

function text(value) {
  return typeof value === "string" ? value : "";
}

function identifier(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? String(value)
    : typeof value === "string" && POSITIVE_INTEGER_PATTERN.test(value)
      ? value
      : "";
}

function normalizedCategory(value) {
  const category = text(value);
  return category.endsWith("/") ? category.slice(0, -1) : category;
}

function requiredMetadata(metadata) {
  const errors = [];
  if (!text(metadata.repository).match(/^[^/\s]+\/[^/\s]+$/u)) errors.push("repository is invalid");
  if (!SHA_PATTERN.test(text(metadata.candidateSha))) errors.push("candidate SHA is invalid");
  if (!REF_PATTERN.test(text(metadata.candidateRef))) errors.push("candidate ref is invalid");
  if (!text(metadata.expectedCategory)) errors.push("expected category is missing");
  if (!POSITIVE_INTEGER_PATTERN.test(text(metadata.runId))) errors.push("trusted run id is invalid");
  if (!POSITIVE_INTEGER_PATTERN.test(text(metadata.runAttempt))) errors.push("trusted run attempt is invalid");
  if (!POSITIVE_INTEGER_PATTERN.test(text(metadata.uploadId))) errors.push("SARIF upload id is invalid");
  return errors;
}

function validateEntry(entry, index) {
  const prefix = `analyses[${index}]`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [`${prefix} must be an object`];
  const errors = [];
  if (!identifier(entry.id)) errors.push(`${prefix}.id is missing or invalid`);
  if (!identifier(entry.sarif_id)) errors.push(`${prefix}.sarif_id is missing or invalid`);
  if (!SHA_PATTERN.test(text(entry.commit_sha))) errors.push(`${prefix}.commit_sha is missing or invalid`);
  if (!REF_PATTERN.test(text(entry.ref))) errors.push(`${prefix}.ref is missing or invalid`);
  if (!text(entry.category)) errors.push(`${prefix}.category is missing or invalid`);
  return errors;
}

export function validateCodeqlAnalysisBinding(response, metadata) {
  const errors = requiredMetadata(metadata);
  if (!Array.isArray(response)) {
    errors.push("CodeQL analyses response root must be an array");
    return {valid: false, errors};
  }
  if (response.length === 0) errors.push("CodeQL analyses response is empty but an analysis is required");
  response.forEach((entry, index) => errors.push(...validateEntry(entry, index)));

  const uploadId = text(metadata.uploadId);
  const candidateSha = text(metadata.candidateSha);
  const candidateRef = text(metadata.candidateRef);
  const expectedCategory = normalizedCategory(metadata.expectedCategory);
  const matches = response.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)
    && identifier(entry.sarif_id) === uploadId
    && text(entry.commit_sha) === candidateSha
    && text(entry.ref) === candidateRef
    && normalizedCategory(entry.category) === expectedCategory);

  if (matches.length !== 1) {
    errors.push(`expected exactly one exact CodeQL analysis binding, found ${matches.length}`);
  }

  const uploadEntries = response.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)
    && identifier(entry.sarif_id) === uploadId);
  if (uploadEntries.some((entry) => text(entry.commit_sha) !== candidateSha)) errors.push("CodeQL analysis contains a stale or wrong candidate SHA");
  if (uploadEntries.some((entry) => text(entry.ref) !== candidateRef)) errors.push("CodeQL analysis contains a wrong candidate ref");
  if (uploadEntries.some((entry) => normalizedCategory(entry.category) !== expectedCategory)) errors.push("CodeQL analysis contains a wrong tool category");

  const match = matches[0];
  return {
    schema: "bthwani-codeql-analysis-binding/1",
    valid: errors.length === 0,
    errors,
    repository: text(metadata.repository),
    candidate: {sha: candidateSha, ref: candidateRef},
    trustedRun: {id: text(metadata.runId), attempt: text(metadata.runAttempt)},
    tool: "github-code-scanning",
    analysis: match ? {
      id: identifier(match.id),
      sarifId: identifier(match.sarif_id),
      category: normalizedCategory(match.category),
      commitSha: text(match.commit_sha),
      ref: text(match.ref),
    } : null,
    exactBinding: errors.length === 0,
  };
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) throw new Error(`missing ${name}`);
  return args[index + 1];
}

function main() {
  const args = process.argv.slice(2);
  const input = argumentValue(args, "--input");
  const response = JSON.parse(fs.readFileSync(input, "utf8"));
  const binding = validateCodeqlAnalysisBinding(response, {
    repository: argumentValue(args, "--repository"),
    candidateSha: argumentValue(args, "--candidate-sha"),
    candidateRef: argumentValue(args, "--candidate-ref"),
    expectedCategory: argumentValue(args, "--expected-category"),
    uploadId: argumentValue(args, "--upload-id"),
    runId: argumentValue(args, "--run-id"),
    runAttempt: argumentValue(args, "--run-attempt"),
  });
  process.stdout.write(`${JSON.stringify(binding)}\n`);
  if (!binding.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
