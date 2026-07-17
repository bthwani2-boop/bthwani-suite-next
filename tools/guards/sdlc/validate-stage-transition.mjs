import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-stage-transition";
const args = process.argv.slice(2);
const violations = [];

function getArg(name) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function extractList(yaml, key) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return [];
  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[^\s]/.test(line) && line.trim() !== "") break;
    const match = line.match(/^\s+-\s+([A-Z0-9_]+)\s*$/);
    if (match) values.push(match[1]);
  }
  return values;
}

const requestedStage = getArg("--stage");
const artifactPath = getArg("--artifact");
const lifecycleRelative = "governance/operational_journey_protocol_package/sdlc/lifecycle.state-machine.yaml";
const lifecycle = fs.readFileSync(path.join(repoRoot, lifecycleRelative), "utf8");
const orderedStages = extractList(lifecycle, "ordered_stages");
const nonTerminalDecisions = new Set(extractList(lifecycle, "non_terminal_decisions"));
const allowedStages = new Set(orderedStages);
const allowedDecisions = new Set([...nonTerminalDecisions, "PASS", "CLOSED_WITH_EVIDENCE"]);

for (const marker of [
  "product_truth_precedes_implementation",
  "product_acceptance_precedes_qa",
  "same_commit_evidence_required",
  "all_applicable_evidence_scopes_required_for_closure",
  "executor_cannot_finally_approve_own_high_risk_work",
  "governance_change_requires_governance_contract_authority",
  "ci_change_requires_ci_workflow_authority",
  "governance_and_ci_approvers_must_be_separate_when_both_apply",
]) if (!lifecycle.includes(marker)) violations.push({ file: lifecycleRelative, message: `MISSING_LIFECYCLE_RULE ${marker}` });

if (requestedStage && !allowedStages.has(requestedStage)) violations.push({ file: "<cli>", message: `UNKNOWN_REQUESTED_STAGE ${requestedStage}` });

if (artifactPath) {
  const artifactFullPath = path.join(repoRoot, artifactPath);
  if (!fs.existsSync(artifactFullPath)) {
    violations.push({ file: artifactPath, message: "MISSING_ARTIFACT" });
  } else {
    let artifact;
    try {
      artifact = JSON.parse(fs.readFileSync(artifactFullPath, "utf8"));
    } catch (error) {
      violations.push({ file: artifactPath, message: `INVALID_JSON ${error.message}` });
    }

    if (artifact) {
      if (!allowedStages.has(artifact.currentStage)) violations.push({ file: artifactPath, message: `UNKNOWN_CURRENT_STAGE ${artifact.currentStage}` });
      if (!allowedStages.has(artifact.requestedStage)) violations.push({ file: artifactPath, message: `UNKNOWN_ARTIFACT_REQUESTED_STAGE ${artifact.requestedStage}` });
      if (requestedStage && artifact.requestedStage !== requestedStage) violations.push({ file: artifactPath, message: `REQUESTED_STAGE_MISMATCH cli=${requestedStage} artifact=${artifact.requestedStage}` });
      if (!allowedDecisions.has(artifact.decision)) violations.push({ file: artifactPath, message: `UNKNOWN_DECISION ${artifact.decision}` });

      const passDecision = ["PASS", "CLOSED_WITH_EVIDENCE"].includes(artifact.decision);
      if (requestedStage && !passDecision) violations.push({ file: artifactPath, message: `REQUESTED_STAGE_NOT_APPROVED decision=${artifact.decision}` });

      if (passDecision) {
        const currentIndex = orderedStages.indexOf(artifact.currentStage);
        const requestedIndex = orderedStages.indexOf(artifact.requestedStage);
        if (currentIndex < 0 || requestedIndex <= currentIndex) {
          violations.push({ file: artifactPath, message: `NON_FORWARD_STAGE_TRANSITION ${artifact.currentStage} -> ${artifact.requestedStage}` });
        } else {
          const skippedStages = orderedStages.slice(currentIndex + 1, requestedIndex);
          const notApplicable = new Set(artifact.notApplicableStages ?? []);
          const exclusions = new Map((artifact.stageExclusions ?? []).map((entry) => [entry.stage, entry]));
          for (const stage of skippedStages) {
            if (!notApplicable.has(stage)) violations.push({ file: artifactPath, message: `STAGE_SKIP_WITHOUT_NOT_APPLICABLE ${stage}` });
            const exclusion = exclusions.get(stage);
            if (!exclusion || !exclusion.reason || !(exclusion.evidence?.length)) violations.push({ file: artifactPath, message: `STAGE_SKIP_WITHOUT_EXCLUSION_EVIDENCE ${stage}` });
          }
          if (notApplicable.has(artifact.currentStage)) violations.push({ file: artifactPath, message: `CURRENT_STAGE_CANNOT_BE_NOT_APPLICABLE ${artifact.currentStage}` });
          if (notApplicable.has(artifact.requestedStage)) violations.push({ file: artifactPath, message: `REQUESTED_STAGE_CANNOT_BE_NOT_APPLICABLE ${artifact.requestedStage}` });
        }

        if (artifact.evidenceCommitSha !== artifact.resolvedCommitSha) violations.push({ file: artifactPath, message: "EVIDENCE_COMMIT_MUST_MATCH_RESOLVED_COMMIT" });
        for (const [field, value] of [["failedGates", artifact.failedGates], ["missingEvidence", artifact.missingEvidence], ["openBlockers", artifact.openBlockers]]) {
          if ((value ?? []).length > 0) violations.push({ file: artifactPath, message: `PASS_DECISION_WITH_NONEMPTY_${field.toUpperCase()}` });
        }

        const passedGates = new Set(artifact.passedGates ?? []);
        if (artifact.decision === "PASS" && !passedGates.has(artifact.requestedStage)) violations.push({ file: artifactPath, message: `REQUESTED_STAGE_GATE_NOT_PASSED ${artifact.requestedStage}` });
        if (artifact.decision === "CLOSED_WITH_EVIDENCE") {
          for (const gate of artifact.applicableGates ?? []) if (!passedGates.has(gate)) violations.push({ file: artifactPath, message: `CLOSURE_APPLICABLE_GATE_NOT_PASSED ${gate}` });
          const passedScopes = new Set(artifact.passedEvidenceScopes ?? []);
          for (const scope of artifact.applicableEvidenceScopes ?? []) if (!passedScopes.has(scope)) violations.push({ file: artifactPath, message: `CLOSURE_APPLICABLE_SCOPE_NOT_PASSED ${scope}` });
        }

        const stageIndex = requestedIndex;
        const g3Index = orderedStages.indexOf("G3_READY_FOR_IMPLEMENTATION");
        const g5Index = orderedStages.indexOf("G5_PRODUCT_ACCEPTED");
        const g6Index = orderedStages.indexOf("G6_QA_APPROVED");
        if (stageIndex >= g3Index && artifact.productTruthState !== "NOT_APPLICABLE") {
          if (!artifact.productTruthContract) violations.push({ file: artifactPath, message: "PRODUCT_TRUTH_CONTRACT_REQUIRED" });
          if (!["READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "PRODUCT_ACCEPTED"].includes(artifact.productTruthState)) violations.push({ file: artifactPath, message: `PRODUCT_TRUTH_NOT_READY ${artifact.productTruthState}` });
        }
        if (stageIndex >= g5Index && artifact.productTruthState !== "NOT_APPLICABLE" && artifact.productTruthState !== "PRODUCT_ACCEPTED") violations.push({ file: artifactPath, message: "PRODUCT_ACCEPTANCE_REQUIRED_BEFORE_G5_OR_LATER" });
        if (stageIndex >= g6Index && artifact.separationOfDutiesPass !== true) violations.push({ file: artifactPath, message: "SEPARATION_OF_DUTIES_NOT_PROVEN" });

        const requiredAuthorityByStage = new Map([
          ["G1_PRODUCT_MODEL_APPROVED", "product_manager_authority"],
          ["G2_DESIGN_APPROVED", "architecture_authority"],
          ["G3_READY_FOR_IMPLEMENTATION", "product_owner_acceptance_authority"],
          ["G4_IMPLEMENTATION_VERIFIED", "independent_reviewer"],
          ["G5_PRODUCT_ACCEPTED", "product_owner_acceptance_authority"],
          ["G6_QA_APPROVED", "independent_quality_authority"],
          ["G7_SECURITY_APPROVED", "application_security_authority"],
          ["G8_RELEASE_APPROVED", "release_authority"],
          ["G9_DEPLOYED", "release_authority"],
          ["G10_PRODUCTION_VERIFIED", "release_authority"],
        ]);
        const requiredAuthority = requiredAuthorityByStage.get(artifact.requestedStage);
        if (requiredAuthority) {
          const approval = (artifact.approvals ?? []).find((item) => item.authority === requiredAuthority && item.decision === "PASS");
          if (!approval) violations.push({ file: artifactPath, message: `MISSING_APPROVAL ${requiredAuthority}` });
          else if (approval.commitSha !== artifact.resolvedCommitSha) violations.push({ file: artifactPath, message: `APPROVAL_COMMIT_MISMATCH ${requiredAuthority}` });
        }
      }

      if (artifact.decision === "CLOSED_WITH_EVIDENCE" && artifact.requestedStage !== "CLOSED_WITH_EVIDENCE") violations.push({ file: artifactPath, message: "CLOSURE_DECISION_WITHOUT_CLOSURE_STAGE" });
    }
  }
}

fail(guardId, violations);
