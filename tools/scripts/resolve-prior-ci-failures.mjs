import crypto from "node:crypto";
import fs from "node:fs";

import {planClaimEvidenceFrontier} from "./lib/claim-evidence-frontier.mjs";
import {
  applyForcedVerification,
  deriveRequiredClaims,
} from "./detect-ci-context.mjs";

const SHA = /^[0-9a-f]{40}$/iu;

const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();

const BACKEND_CLAIMS = new Map([
  ["backend:dsh", "dsh"],
  ["backend:wlt", "wlt"],
  ["backend:identity", "identity"],
  ["backend:workforce", "workforce"],
  ["backend:platform-control", "platform-control"],
  ["backend:providers", "providers"],
]);

const CONTROL_STEP = new Map([
  ["control:migration-manifest", "check governed migration manifest"],
  ["control:ci-source-immutability", "check verification-workflow source immutability"],
  ["control:sonar-coverage-ownership", "check sonar coverage ownership"],
]);

function jobName(job) {
  return lower(job?.name);
}

function findJob(jobs, fragment) {
  const needle = lower(fragment);
  return jobs.find((job) => jobName(job).includes(needle));
}

function jobResult(job) {
  return lower(job?.conclusion) === "success" ? "PASS" : "FAIL";
}

function controlClaimResult(job, claimId) {
  if (!job) return "FAIL";
  if (jobResult(job) === "PASS") return "PASS";
  const fragment = CONTROL_STEP.get(claimId);
  if (!fragment) return "FAIL";
  const step = (job.steps ?? []).find((entry) => lower(entry?.name).includes(fragment));
  return lower(step?.conclusion) === "success" ? "PASS" : "FAIL";
}

function claimEvidence(priorJobs, claimId, priorRunId) {
  if (CONTROL_STEP.has(claimId)) {
    const job = findJob(priorJobs, "ci control-plane verification");
    return {
      result: controlClaimResult(job, claimId),
      evidenceRef: job?.id ? `run:${priorRunId}/job:${job.id}` : `run:${priorRunId}/missing:${claimId}`,
    };
  }

  if (claimId === "contracts:diagnostics") {
    const job = findJob(priorJobs, "contract diagnostics");
    return {result: jobResult(job), evidenceRef: job?.id ? `run:${priorRunId}/job:${job.id}` : `run:${priorRunId}/missing:${claimId}`};
  }

  if (claimId === "node:verification") {
    const job = findJob(priorJobs, "node verification");
    return {result: jobResult(job), evidenceRef: job?.id ? `run:${priorRunId}/job:${job.id}` : `run:${priorRunId}/missing:${claimId}`};
  }

  if (claimId === "runtime:verification") {
    const job = findJob(priorJobs, "runtime verification");
    return {result: jobResult(job), evidenceRef: job?.id ? `run:${priorRunId}/job:${job.id}` : `run:${priorRunId}/missing:${claimId}`};
  }

  if (BACKEND_CLAIMS.has(claimId)) {
    const service = BACKEND_CLAIMS.get(claimId);
    const job = priorJobs.find((entry) => {
      const name = jobName(entry);
      return name.includes(`verify ${service} backend`) || name.includes(`verify-${service}-backend`);
    });
    return {result: jobResult(job), evidenceRef: job?.id ? `run:${priorRunId}/job:${job.id}` : `run:${priorRunId}/missing:${claimId}`};
  }

  return {result: "FAIL", evidenceRef: `run:${priorRunId}/unknown:${claimId}`};
}

function mergePriorClaimInputs(current, prior, replayedFailedClaims) {
  const next = {...current};
  const replayed = new Set(replayedFailedClaims);

  if (replayed.has("node:verification")) {
    next.node_contracts = next.node_contracts === true || prior.node_contracts === true || prior.contracts === true;
    next.node_ci_control_plane = next.node_ci_control_plane === true || prior.node_ci_control_plane === true || prior.ci_control_plane === true;
    next.node_dependency_changed = next.node_dependency_changed === true || prior.node_dependency_changed === true || prior.dependency_changed === true;
    next.node_platform = next.node_platform === true || prior.node_platform === true || prior.platform === true;
  }

  if (replayed.has("contracts:diagnostics")) {
    next.contracts = next.contracts === true || prior.contracts === true;
  }

  for (const [claimId] of BACKEND_CLAIMS) {
    if (!replayed.has(claimId)) continue;
    next.backend_database_changed = next.backend_database_changed === true
      || prior.backend_database_changed === true
      || prior.database_changed === true;
  }

  return next;
}

export function resolvePriorCiFailures({
  currentClassification,
  priorClassification,
  priorJobs,
  priorRunId,
  priorSha,
  headSha,
  trustedWorkflowSha,
  aggregateConclusion = "",
}) {
  if (!currentClassification || typeof currentClassification !== "object") throw new Error("currentClassification is required");
  if (!priorClassification || typeof priorClassification !== "object") throw new Error("priorClassification is required");
  if (!Array.isArray(priorJobs)) throw new Error("priorJobs must be an array");
  if (!/^[1-9][0-9]*$/u.test(text(priorRunId))) throw new Error("priorRunId must be a positive integer");
  if (!SHA.test(text(priorSha))) throw new Error("priorSha must be an exact commit SHA");
  if (!SHA.test(text(headSha))) throw new Error("headSha must be an exact commit SHA");
  if (!SHA.test(text(trustedWorkflowSha))) throw new Error("trustedWorkflowSha must be an exact commit SHA");

  const contextJob = findJob(priorJobs, "verify exact candidate and resolve affected scope");
  if (!contextJob || jobResult(contextJob) !== "PASS") {
    return {
      schema: "bthwani-prior-ci-frontier/1",
      frontier_usable: false,
      reason: "PRIOR_CONTEXT_NOT_SUCCESSFUL",
      reused_pass_claims: [],
      replayed_failed_claims: [],
      frontier_decisions: [],
    };
  }

  const priorRequired = deriveRequiredClaims(priorClassification);
  const currentRequired = deriveRequiredClaims(currentClassification);
  const currentSet = new Set(currentRequired);
  const allClaims = [...new Set([...priorRequired, ...currentRequired])].sort();

  const authorityDigest = hash(`trusted-workflow:${trustedWorkflowSha}`);
  const environmentDigest = hash("ubuntu-24.04|node-24.17.0|github-actions");
  const stableInputDigest = (claimId) => hash(`router-materiality:${claimId}:stable`);
  const changedInputDigest = (claimId) => hash(`router-materiality:${claimId}:affected:${headSha}`);
  const scopeDigest = (claimId) => hash(`claim-scope:${claimId}`);

  const previousClaims = priorRequired.map((claimId) => {
    const evidence = claimEvidence(priorJobs, claimId, priorRunId);
    return {
      claimId,
      result: evidence.result,
      proofSha: priorSha,
      evidenceRef: evidence.evidenceRef,
      inputsDigest: stableInputDigest(claimId),
      authorityDigest,
      scopeDigest: scopeDigest(claimId),
      environmentDigest,
    };
  });

  const requiredClaims = allClaims.map((claimId) => ({
    claimId,
    inputsDigest: currentSet.has(claimId) && priorRequired.includes(claimId)
      ? changedInputDigest(claimId)
      : stableInputDigest(claimId),
    authorityDigest,
    scopeDigest: scopeDigest(claimId),
    environmentDigest,
    invalidationReasons: currentSet.has(claimId) && priorRequired.includes(claimId)
      ? ["CURRENT_AFFECTED_CONE"]
      : [],
  }));

  const plan = planClaimEvidenceFrontier({
    previousClaims,
    requiredClaims,
    previousEvidenceTrusted: true,
    previousProofIsAncestor: true,
    aggregateConclusion,
  });

  const replayedFailedClaims = plan.decisions
    .filter((entry) => entry.action === "RERUN_FAILED")
    .map((entry) => entry.claimId);

  const claimsToRun = plan.decisions
    .filter((entry) => entry.action !== "REUSE_PASS")
    .map((entry) => entry.claimId);

  let classification = applyForcedVerification(currentClassification, claimsToRun);
  classification = mergePriorClaimInputs(classification, priorClassification, replayedFailedClaims);
  classification.required_claims = deriveRequiredClaims(classification);

  return {
    ...classification,
    schema: "bthwani-prior-ci-frontier/1",
    frontier_usable: true,
    prior_run_id: String(priorRunId),
    reused_pass_claims: plan.reusedPass,
    replayed_failed_claims: replayedFailedClaims,
    frontier_decisions: plan.decisions,
    frontier_counts: plan.counts,
    frontier_law: plan.policy.law,
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const args = process.argv.slice(2);
  const result = resolvePriorCiFailures({
    currentClassification: readJson(argument(args, "--current")),
    priorClassification: readJson(argument(args, "--prior")),
    priorJobs: readJson(argument(args, "--jobs")),
    priorRunId: argument(args, "--prior-run-id"),
    priorSha: argument(args, "--prior-sha"),
    headSha: argument(args, "--head-sha"),
    trustedWorkflowSha: argument(args, "--trusted-workflow-sha"),
    aggregateConclusion: argument(args, "--aggregate-conclusion", false),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}