// Renders the canonical decision.json shape (spec §20) from a task contract and its
// evidence results, taking the weakest required confidence dimension (spec §21).
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../_remediation-utils.mjs";

export function renderDecisionSummary(contract, results = {}) {
  const confidence = contract?.confidence ?? {};
  const required = contract?.proof?.required ?? {};
  const weakestRequired = Object.entries(required)
    .filter(([, isRequired]) => isRequired)
    .map(([dimension]) => confidence[dimension] ?? "NEEDS_EVIDENCE")
    .reduce((weakest, value) => {
      const rank = { PROVEN: 2, NOT_APPLICABLE: 1, NEEDS_EVIDENCE: 0 };
      return rank[value] < rank[weakest] ? value : weakest;
    }, "PROVEN");

  const scopePassed = results.scopePassed ?? false;
  const sameCommit = results.sameCommitVerified === true;

  const decision =
    results.flakyTests > 0 || results.unresolvedMutations > 0 || results.unexpectedDeletions > 0 || results.unexpectedCapabilityLoss > 0
      ? "FIX_REQUIRED"
      : !scopePassed || !sameCommit
      ? "NEEDS_EVIDENCE"
      : weakestRequired === "NEEDS_EVIDENCE"
      ? "NEEDS_EVIDENCE"
      : "READY_TO_INTEGRATE";

  return {
    taskId: contract?.task?.id,
    sourceSha: contract?.source?.baseSha,
    // verifiedSha is the commit the caller actually ran verification on (typically
    // the current HEAD at closure time), not a re-derivation of baseSha: a task
    // legitimately advances past baseSha during REPAIRING, so baseSha equality is
    // the wrong same-commit test. sameCommit instead trusts an explicit
    // sameCommitVerified flag from the caller, who must have already run
    // validate-same-commit.mjs / guard:same-commit-evidence before rendering this.
    verifiedSha: results.verifiedSha ?? null,
    sameCommit,
    scopePassed,
    requiredEvidencePassed: weakestRequired === "PROVEN",
    flakyTests: results.flakyTests ?? 0,
    unresolvedMutations: results.unresolvedMutations ?? 0,
    unexpectedDeletions: results.unexpectedDeletions ?? 0,
    unexpectedCapabilityLoss: results.unexpectedCapabilityLoss ?? 0,
    decision,
  };
}

function main() {
  const [contractPath, resultsPath] = process.argv.slice(2);
  if (!contractPath) {
    console.error("usage: render-decision-summary.mjs <task-contract.json> [results.json]");
    process.exit(2);
  }
  const contract = JSON.parse(fs.readFileSync(path.resolve(repoRoot, contractPath), "utf8"));
  const results = resultsPath ? JSON.parse(fs.readFileSync(path.resolve(repoRoot, resultsPath), "utf8")) : {};
  console.log(JSON.stringify(renderDecisionSummary(contract, results), null, 2));
}

if (process.argv[1]?.endsWith("render-decision-summary.mjs")) main();
