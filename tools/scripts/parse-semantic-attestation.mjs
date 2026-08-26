#!/usr/bin/env node

import fs from "node:fs";

export const ATTESTATION_MARKER = "BTHWANI_SEMANTIC_REVIEW:v1";
export const ATTESTATION_SCHEMA = "BTHWANI_SEMANTIC_REVIEW";
export const ATTESTATION_VERSION = 1;

const SHA256 = /^[0-9a-f]{64}$/u;
const SHA40 = /^[0-9a-f]{40}$/u;
const TOOL_VERSION = /^\d+\.\d+\.\d+$/u;
const PACKAGE_INTEGRITY = /^[A-Za-z0-9+/]{86}==$|^[A-Za-z0-9+/]{88}$/u;

const exactKeys = (value, keys) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys.slice().sort()[index]);
};

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0 && value.length <= 256;

const validateContract = (contract, candidateSha) => {
  if (!exactKeys(contract, ["schema", "version", "candidateSha", "verdict", "reviewIdentity", "reviewProvenance"])) {
    return "contract fields are not exact";
  }
  if (contract.schema !== ATTESTATION_SCHEMA || contract.version !== ATTESTATION_VERSION) return "schema/version mismatch";
  if (!SHA40.test(contract.candidateSha) || contract.candidateSha !== candidateSha) return "candidate SHA mismatch";
  if (contract.verdict !== "PASS") return "verdict is not PASS";
  if (!exactKeys(contract.reviewIdentity, ["kind", "provider"])) return "review identity fields are not exact";
  if (contract.reviewIdentity.kind !== "external-authorized-host-agent" || !isNonEmptyString(contract.reviewIdentity.provider)) {
    return "review identity is not an external authorized host agent";
  }
  if (!exactKeys(contract.reviewProvenance, ["artifactIdentity", "contextSha256", "packageIntegrity", "toolVersion"])) {
    return "review provenance fields are not exact";
  }
  if (!isNonEmptyString(contract.reviewProvenance.artifactIdentity)) return "artifact identity is missing";
  if (!SHA256.test(contract.reviewProvenance.contextSha256)) return "context hash is invalid";
  if (!PACKAGE_INTEGRITY.test(contract.reviewProvenance.packageIntegrity)) return "package integrity is invalid";
  if (!TOOL_VERSION.test(contract.reviewProvenance.toolVersion)) return "tool version is invalid";
  return null;
};

/**
 * Parse exactly one canonical attestation from each comment body.
 * The GitHub comment author is intentionally kept outside the contract; callers
 * must authorize that live GitHub identity rather than trusting comment text.
 */
export const parseAttestationBody = (body, candidateSha) => {
  if (typeof body !== "string") return { ok: false, reason: "comment body is not text" };
  const normalized = body.endsWith("\n") ? body.slice(0, -1) : body;
  if (!normalized.startsWith(`${ATTESTATION_MARKER}\n`)) return { ok: false, reason: "canonical marker is absent" };
  const jsonText = normalized.slice(ATTESTATION_MARKER.length + 1);
  if (jsonText.length === 0 || jsonText.includes("\n")) return { ok: false, reason: "contract JSON is not one canonical line" };

  let contract;
  try {
    contract = JSON.parse(jsonText);
  } catch {
    return { ok: false, reason: "contract JSON is malformed" };
  }
  if (JSON.stringify(contract) !== jsonText) return { ok: false, reason: "contract JSON is not canonical" };
  const error = validateContract(contract, candidateSha);
  return error ? { ok: false, reason: error } : { ok: true, contract };
};

export const parseComments = ({ comments, candidateSha, prAuthor }) => {
  if (!SHA40.test(candidateSha)) throw new Error("candidate SHA must be a full lowercase SHA");
  if (!Array.isArray(comments)) throw new Error("comments must be an array");
  const candidates = [];
  const rejected = [];
  for (const comment of comments) {
    const bodyResult = parseAttestationBody(comment?.body, candidateSha);
    if (!bodyResult.ok) {
      if (typeof comment?.body === "string" && comment.body.includes(ATTESTATION_MARKER)) {
        rejected.push({ id: comment?.id ?? null, reason: bodyResult.reason });
      }
      continue;
    }
    const login = comment?.user?.login;
    if (!isNonEmptyString(login)) {
      rejected.push({ id: comment?.id ?? null, reason: "GitHub comment author is missing" });
      continue;
    }
    if (typeof prAuthor === "string" && login.toLowerCase() === prAuthor.toLowerCase()) {
      rejected.push({ id: comment?.id ?? null, reason: "PR author cannot author semantic attestation" });
      continue;
    }
    candidates.push({
      commentId: comment?.id ?? null,
      login,
      createdAt: comment?.created_at ?? null,
      contract: bodyResult.contract,
    });
  }

  if (candidates.length === 0) throw new Error("no valid non-author exact-candidate semantic attestation");
  if (candidates.length > 1) {
    const identities = new Set(candidates.map((candidate) => candidate.login.toLowerCase()));
    throw new Error(identities.size === 1 ? "duplicate semantic attestations are ambiguous" : "multiple semantic attestations are ambiguous");
  }
  return { attestation: candidates[0], rejected };
};

const main = () => {
  const args = process.argv.slice(2);
  const shaIndex = args.indexOf("--candidate-sha");
  const authorIndex = args.indexOf("--pr-author");
  const candidateSha = shaIndex >= 0 ? args[shaIndex + 1] : undefined;
  const prAuthor = authorIndex >= 0 ? args[authorIndex + 1] : undefined;
  if (!candidateSha) throw new Error("--candidate-sha is required");
  const input = fs.readFileSync(0, "utf8");
  const parsed = JSON.parse(input);
  if (!Array.isArray(parsed) || parsed.some((page) => !Array.isArray(page))) {
    throw new Error("GitHub comments response must be a paginated array of arrays");
  }
  const comments = parsed.flat();
  process.stdout.write(`${JSON.stringify(parseComments({ comments, candidateSha, prAuthor }))}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(`semantic attestation rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
