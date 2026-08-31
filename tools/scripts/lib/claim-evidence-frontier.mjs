import fs from "node:fs";

const SHA = /^[0-9a-f]{40}$/iu;
const REUSABLE_RESULT = "PASS";
const ACTIONS = Object.freeze({
  REUSE_PASS: "REUSE_PASS",
  RERUN_FAILED: "RERUN_FAILED",
  RERUN_INVALIDATED: "RERUN_INVALIDATED",
  RUN_NEWLY_REQUIRED: "RUN_NEWLY_REQUIRED",
});

const requiredFingerprintFields = ["inputsDigest", "authorityDigest", "scopeDigest"];

function text(value) {
  return String(value ?? "").trim();
}

function normalizeResult(value) {
  return text(value).toUpperCase();
}

function assertUniqueClaims(claims, label) {
  const seen = new Set();
  for (const claim of claims) {
    const claimId = text(claim?.claimId);
    if (!claimId) throw new Error(`${label}: every claim requires claimId`);
    if (seen.has(claimId)) throw new Error(`${label}: duplicate claimId ${claimId}`);
    seen.add(claimId);
  }
}

function assertCurrentClaim(claim) {
  const claimId = text(claim?.claimId);
  if (!claimId) throw new Error("current required claim requires claimId");
  for (const field of requiredFingerprintFields) {
    if (!text(claim?.[field])) {
      throw new Error(`${claimId}: current required claim is missing ${field}`);
    }
  }
}

function invalidationReasons(previous, current) {
  const reasons = [];
  if (!SHA.test(text(previous?.proofSha))) reasons.push("INVALID_OR_MISSING_PROOF_SHA");
  if (!text(previous?.evidenceRef)) reasons.push("MISSING_EVIDENCE_REF");

  for (const field of requiredFingerprintFields) {
    const before = text(previous?.[field]);
    const after = text(current?.[field]);
    if (!before) reasons.push(`MISSING_PREVIOUS_${field.toUpperCase()}`);
    else if (before !== after) reasons.push(`${field.toUpperCase()}_CHANGED`);
  }

  const previousEnvironment = text(previous?.environmentDigest);
  const currentEnvironment = text(current?.environmentDigest);
  if (previousEnvironment !== currentEnvironment) reasons.push("ENVIRONMENTDIGEST_CHANGED");

  for (const reason of current?.invalidationReasons ?? []) {
    const normalized = text(reason);
    if (normalized) reasons.push(normalized);
  }

  return [...new Set(reasons)];
}

function decision({claim, previous, previousEvidenceTrusted, previousProofIsAncestor}) {
  const claimId = text(claim.claimId);

  if (!previous) {
    return {
      claimId,
      action: ACTIONS.RUN_NEWLY_REQUIRED,
      reasons: ["NO_PRIOR_CLAIM_EVIDENCE"],
      priorResult: null,
      priorProofSha: null,
      reusedEvidenceRef: null,
    };
  }

  const priorResult = normalizeResult(previous.result);
  const priorProofSha = text(previous.proofSha) || null;

  if (!previousEvidenceTrusted) {
    return {
      claimId,
      action: ACTIONS.RERUN_INVALIDATED,
      reasons: ["PRIOR_EVIDENCE_NOT_TRUSTED"],
      priorResult,
      priorProofSha,
      reusedEvidenceRef: null,
    };
  }

  if (!previousProofIsAncestor) {
    return {
      claimId,
      action: ACTIONS.RERUN_INVALIDATED,
      reasons: ["PRIOR_PROOF_NOT_ANCESTOR"],
      priorResult,
      priorProofSha,
      reusedEvidenceRef: null,
    };
  }

  if (priorResult !== REUSABLE_RESULT) {
    return {
      claimId,
      action: ACTIONS.RERUN_FAILED,
      reasons: [`PRIOR_RESULT_${priorResult || "UNKNOWN"}`],
      priorResult,
      priorProofSha,
      reusedEvidenceRef: null,
    };
  }

  const reasons = invalidationReasons(previous, claim);
  if (reasons.length > 0) {
    return {
      claimId,
      action: ACTIONS.RERUN_INVALIDATED,
      reasons,
      priorResult,
      priorProofSha,
      reusedEvidenceRef: null,
    };
  }

  return {
    claimId,
    action: ACTIONS.REUSE_PASS,
    reasons: ["STILL_VALID_PASS"],
    priorResult,
    priorProofSha,
    reusedEvidenceRef: text(previous.evidenceRef),
  };
}

export function planClaimEvidenceFrontier({
  previousClaims = [],
  requiredClaims = [],
  previousEvidenceTrusted = true,
  previousProofIsAncestor = true,
  aggregateConclusion = "",
} = {}) {
  if (!Array.isArray(previousClaims)) throw new Error("previousClaims must be an array");
  if (!Array.isArray(requiredClaims)) throw new Error("requiredClaims must be an array");

  assertUniqueClaims(previousClaims, "previousClaims");
  assertUniqueClaims(requiredClaims, "requiredClaims");
  for (const claim of requiredClaims) assertCurrentClaim(claim);

  const previousById = new Map(previousClaims.map((claim) => [text(claim.claimId), claim]));
  const decisions = requiredClaims.map((claim) => decision({
    claim,
    previous: previousById.get(text(claim.claimId)),
    previousEvidenceTrusted: previousEvidenceTrusted === true,
    previousProofIsAncestor: previousProofIsAncestor === true,
  }));

  const nextVerification = decisions
    .filter((entry) => entry.action !== ACTIONS.REUSE_PASS)
    .map((entry) => entry.claimId);

  const reusedPass = decisions
    .filter((entry) => entry.action === ACTIONS.REUSE_PASS)
    .map((entry) => entry.claimId);

  return {
    schema: "bthwani-claim-evidence-frontier/1",
    policy: {
      reusableResult: REUSABLE_RESULT,
      aggregateConclusionIsNotReuseAuthority: true,
      law: "NEXT_VERIFICATION = FAILED ∪ INVALIDATED_BY_FIX ∪ NEWLY_REQUIRED",
    },
    priorAggregateConclusion: text(aggregateConclusion) || null,
    decisions,
    nextVerification,
    reusedPass,
    counts: {
      required: requiredClaims.length,
      reusePass: reusedPass.length,
      rerunFailed: decisions.filter((entry) => entry.action === ACTIONS.RERUN_FAILED).length,
      rerunInvalidated: decisions.filter((entry) => entry.action === ACTIONS.RERUN_INVALIDATED).length,
      newlyRequired: decisions.filter((entry) => entry.action === ACTIONS.RUN_NEWLY_REQUIRED).length,
    },
  };
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
  const previousFile = argument(args, "--previous");
  const requiredFile = argument(args, "--required");
  const outputFile = argument(args, "--out", false);
  const previousEvidenceTrusted = argument(args, "--trusted", false) !== "false";
  const previousProofIsAncestor = argument(args, "--ancestor", false) !== "false";
  const aggregateConclusion = argument(args, "--aggregate-conclusion", false);

  const previousPayload = JSON.parse(fs.readFileSync(previousFile, "utf8"));
  const requiredPayload = JSON.parse(fs.readFileSync(requiredFile, "utf8"));
  const result = planClaimEvidenceFrontier({
    previousClaims: previousPayload.claims ?? previousPayload,
    requiredClaims: requiredPayload.claims ?? requiredPayload,
    previousEvidenceTrusted,
    previousProofIsAncestor,
    aggregateConclusion,
  });

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputFile) fs.writeFileSync(outputFile, serialized, "utf8");
  process.stdout.write(serialized);
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}
