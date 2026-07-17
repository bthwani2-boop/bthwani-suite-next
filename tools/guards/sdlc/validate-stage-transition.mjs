import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-stage-transition";
const args = process.argv.slice(2);

function getArg(name) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const requestedStage = getArg("--stage");
const artifactPath = getArg("--artifact");
const lifecyclePath = path.join(
  repoRoot,
  "governance/operational_journey_protocol_package/sdlc/lifecycle.state-machine.yaml",
);
const content = fs.readFileSync(lifecyclePath, "utf8");
const orderedStages = [
  ...content.matchAll(/^\s+- (G[0-9]_[A-Z0-9_]+|CLOSED_WITH_EVIDENCE)$/gm),
].map((match) => match[1]);
const terminalFailureStages = new Set(["FIX_REQUIRED", "HARD_BLOCKED_EXTERNAL_ONLY"]);
const allowedStages = new Set([...orderedStages, ...terminalFailureStages]);
const violations = [];

if (requestedStage && !allowedStages.has(requestedStage)) {
  violations.push({
    file: "tools/guards/sdlc/validate-stage-transition.mjs",
    message: `UNKNOWN_REQUESTED_STAGE: ${requestedStage}`,
  });
}

if (!content.includes("rule: stages_must_not_skip_required_evidence_or_approval")) {
  violations.push({
    file: "governance/operational_journey_protocol_package/sdlc/lifecycle.state-machine.yaml",
    message: "MISSING_NO_SKIP_RULE",
  });
}

if (artifactPath) {
  const artifactFullPath = path.join(repoRoot, artifactPath);
  if (fs.existsSync(artifactFullPath)) {
    let artifact;
    try {
      artifact = JSON.parse(fs.readFileSync(artifactFullPath, "utf8"));
    } catch (error) {
      violations.push({ file: artifactPath, message: `INVALID_JSON: ${error.message}` });
    }

    if (artifact) {
      if (requestedStage && artifact.requestedStage !== requestedStage) {
        violations.push({
          file: artifactPath,
          message: `REQUESTED_STAGE_MISMATCH: cli=${requestedStage} artifact=${artifact.requestedStage}`,
        });
      }

      if (!allowedStages.has(artifact.currentStage)) {
        violations.push({ file: artifactPath, message: `UNKNOWN_CURRENT_STAGE: ${artifact.currentStage}` });
      }
      if (!allowedStages.has(artifact.requestedStage)) {
        violations.push({ file: artifactPath, message: `UNKNOWN_ARTIFACT_REQUESTED_STAGE: ${artifact.requestedStage}` });
      }

      const isPassDecision = artifact.decision === "GATE_PASS" || artifact.decision === "CLOSED_WITH_EVIDENCE";
      if (isPassDecision) {
        const currentIndex = orderedStages.indexOf(artifact.currentStage);
        const nextIndex = orderedStages.indexOf(artifact.requestedStage);
        if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
          violations.push({
            file: artifactPath,
            message: `ILLEGAL_STAGE_SKIP: ${artifact.currentStage} -> ${artifact.requestedStage}`,
          });
        }

        const failedGates = artifact.failedGates ?? [];
        const missingEvidence = artifact.missingEvidence ?? [];
        const openBlockers = artifact.openBlockers ?? [];
        if (failedGates.length > 0) {
          violations.push({ file: artifactPath, message: "PASS_DECISION_WITH_FAILED_GATES" });
        }
        if (missingEvidence.length > 0) {
          violations.push({ file: artifactPath, message: "PASS_DECISION_WITH_MISSING_EVIDENCE" });
        }
        if (openBlockers.length > 0) {
          violations.push({ file: artifactPath, message: "PASS_DECISION_WITH_OPEN_BLOCKERS" });
        }

        const passedGates = new Set(artifact.passedGates ?? []);
        for (const gate of artifact.applicableGates ?? []) {
          if (!passedGates.has(gate)) {
            violations.push({ file: artifactPath, message: `APPLICABLE_GATE_NOT_PASSED: ${gate}` });
          }
        }

        const requestedIndex = orderedStages.indexOf(artifact.requestedStage);
        if (requestedIndex >= orderedStages.indexOf("G5_QA_APPROVED") && artifact.separationOfDutiesPass !== true) {
          violations.push({ file: artifactPath, message: "SEPARATION_OF_DUTIES_NOT_PROVEN" });
        }

        const evidence = artifact.evidence ?? [];
        const requiredApprovalByStage = new Map([
          ["G4_IMPLEMENTATION_VERIFIED", "engineering-reviewer"],
          ["G5_QA_APPROVED", "qa-lead"],
          ["G6_SECURITY_APPROVED", "security-authority"],
          ["G7_RELEASE_APPROVED", "release-authority"],
        ]);
        const approvalRole = requiredApprovalByStage.get(artifact.requestedStage);
        if (approvalRole && !evidence.some((item) => item.startsWith(`approval:${approvalRole}:`))) {
          violations.push({
            file: artifactPath,
            message: `MISSING_APPROVAL_EVIDENCE: ${approvalRole}`,
          });
        }
      }

      if (artifact.decision === "CLOSED_WITH_EVIDENCE" && artifact.requestedStage !== "CLOSED_WITH_EVIDENCE") {
        violations.push({ file: artifactPath, message: "CLOSURE_DECISION_WITHOUT_CLOSURE_STAGE" });
      }
    }
  }
}

fail(guardId, violations);
