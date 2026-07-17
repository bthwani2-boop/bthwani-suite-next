import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-artifact-inputs";
const args = process.argv.slice(2);
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });

function getArg(name) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readAndValidate(inputRelative, schemaRelative) {
  const inputPath = path.join(repoRoot, inputRelative);
  const schemaPath = path.join(repoRoot, schemaRelative);
  if (!fs.existsSync(inputPath)) {
    violations.push({ file: inputRelative, message: "MISSING_SDLC_INPUT_FILE" });
    return undefined;
  }
  if (!fs.existsSync(schemaPath)) {
    violations.push({ file: schemaRelative, message: "MISSING_SDLC_SCHEMA" });
    return undefined;
  }

  let input;
  let schema;
  try {
    input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    violations.push({ file: inputRelative, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    violations.push({ file: schemaRelative, message: `INVALID_SCHEMA_JSON ${error.message}` });
    return undefined;
  }

  const validate = ajv.compile(schema);
  if (!validate(input)) {
    for (const error of validate.errors ?? []) {
      violations.push({ file: inputRelative, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
    }
  }
  return input;
}

const artifactPath = getArg("--artifact");
const impactPath = getArg("--impact");
const capability = getArg("--capability");
const affectedMode = args.includes("--affected");

if (affectedMode && (!artifactPath || !impactPath)) {
  violations.push({ file: "<cli>", message: "AFFECTED_SDLC_GATE_REQUIRES_ARTIFACT_AND_IMPACT" });
}
if ((artifactPath && !impactPath) || (!artifactPath && impactPath)) {
  violations.push({ file: "<cli>", message: "SDLC_ARTIFACT_AND_IMPACT_MUST_BE_PROVIDED_TOGETHER" });
}

const artifact = artifactPath
  ? readAndValidate(artifactPath, "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json")
  : undefined;
const impact = impactPath
  ? readAndValidate(impactPath, "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json")
  : undefined;

if (artifact && impact) {
  if (artifact.capabilityId !== impact.capabilityId) {
    violations.push({ file: artifactPath, message: `CAPABILITY_MISMATCH artifact=${artifact.capabilityId} impact=${impact.capabilityId}` });
  }
  if (capability && artifact.capabilityId !== capability) {
    violations.push({ file: artifactPath, message: `CLI_CAPABILITY_MISMATCH cli=${capability} artifact=${artifact.capabilityId}` });
  }
  if (artifact.branch !== impact.branch) {
    violations.push({ file: artifactPath, message: `BRANCH_MISMATCH artifact=${artifact.branch} impact=${impact.branch}` });
  }
  if (artifact.repositoryMode !== impact.repositoryMode) {
    violations.push({ file: artifactPath, message: "REPOSITORY_MODE_MISMATCH" });
  }
  if (artifact.resolvedCommitSha !== impact.baseCommitSha) {
    violations.push({ file: artifactPath, message: `COMMIT_MISMATCH artifact=${artifact.resolvedCommitSha} impact=${impact.baseCommitSha}` });
  }

  const highRisk = ["high", "critical"].includes(impact.riskClass);
  const passDecision = artifact.decision === "PASS" || artifact.decision === "CLOSED_WITH_EVIDENCE";
  const requiredApprovals = new Set(artifact.requiredApprovals ?? []);
  const approvalByAuthority = new Map();

  for (const approval of artifact.approvals ?? []) {
    if (approvalByAuthority.has(approval.authority)) {
      violations.push({ file: artifactPath, message: `DUPLICATE_AUTHORITY_APPROVAL ${approval.authority}` });
    } else {
      approvalByAuthority.set(approval.authority, approval);
    }
    if (approval.commitSha !== artifact.resolvedCommitSha) {
      violations.push({ file: artifactPath, message: `STALE_APPROVAL_COMMIT ${approval.authority}` });
    }
    const protectedChange = highRisk || impact.impacts.ci === true || impact.impacts.governance === true;
    if (protectedChange && artifact.changeAuthor && approval.approver === artifact.changeAuthor) {
      violations.push({ file: artifactPath, message: `PROTECTED_CHANGE_SELF_APPROVAL ${approval.authority}` });
    }
  }

  function requireImpactApproval(authority, impactName) {
    if (!requiredApprovals.has(authority)) {
      violations.push({ file: artifactPath, message: `${impactName}_REQUIRED_APPROVAL_MISSING ${authority}` });
      return;
    }
    if (!passDecision) return;
    const approval = approvalByAuthority.get(authority);
    if (!approval || approval.decision !== "PASS") {
      violations.push({ file: artifactPath, message: `${impactName}_PASS_WITHOUT_APPROVAL ${authority}` });
    }
  }

  if (highRisk && impact.impacts.security !== true) {
    violations.push({ file: impactPath, message: "HIGH_RISK_CHANGE_MUST_DECLARE_SECURITY_IMPACT" });
  }
  if (impact.productImpact === "CHANGED") {
    if (!artifact.productTruthContract || artifact.productTruthContract !== impact.productTruthContract) {
      violations.push({ file: artifactPath, message: "CHANGED_PRODUCT_REQUIRES_MATCHING_PRODUCT_TRUTH_CONTRACT" });
    }
    if (!artifact.productTruthState || artifact.productTruthState === "NOT_APPLICABLE") {
      violations.push({ file: artifactPath, message: "CHANGED_PRODUCT_REQUIRES_PRODUCT_TRUTH_STATE" });
    }
  }
  if (impact.productImpact === "NONE" && artifact.productTruthState && artifact.productTruthState !== "NOT_APPLICABLE") {
    violations.push({ file: artifactPath, message: "PRODUCT_IMPACT_NONE_CONFLICTS_WITH_PRODUCT_TRUTH_STATE" });
  }
  if (impact.impacts.wltFinance === true && !(artifact.applicableGates ?? []).some((gate) => /WLT|FINANCE/.test(gate))) {
    violations.push({ file: artifactPath, message: "WLT_FINANCE_IMPACT_WITHOUT_FINANCE_GATE" });
  }
  if (impact.impacts.tenant === true && !(artifact.applicableGates ?? []).some((gate) => /TENANT|ISOLATION/.test(gate))) {
    violations.push({ file: artifactPath, message: "TENANT_IMPACT_WITHOUT_ISOLATION_GATE" });
  }
  if (impact.impacts.ci === true) {
    if (!(artifact.applicableGates ?? []).some((gate) => /CI|WORKFLOW|RELEASE/.test(gate))) {
      violations.push({ file: artifactPath, message: "CI_IMPACT_WITHOUT_CI_OR_RELEASE_GATE" });
    }
    requireImpactApproval("ci_workflow_authority", "CI_IMPACT");
  }
  if (impact.impacts.governance === true) {
    if (!(artifact.applicableGates ?? []).some((gate) => /GOVERNANCE|SDLC|PRODUCT/.test(gate))) {
      violations.push({ file: artifactPath, message: "GOVERNANCE_IMPACT_WITHOUT_GOVERNANCE_GATE" });
    }
    requireImpactApproval("governance_contract_authority", "GOVERNANCE_IMPACT");
  }

  if (passDecision) {
    for (const authority of requiredApprovals) {
      const approval = approvalByAuthority.get(authority);
      if (!approval || approval.decision !== "PASS") {
        violations.push({ file: artifactPath, message: `REQUIRED_APPROVAL_NOT_PASSED ${authority}` });
      }
    }
  }

  if (passDecision && highRisk) {
    for (const authority of ["engineering_reviewer", "independent_quality_authority", "application_security_authority"]) {
      if (!requiredApprovals.has(authority)) {
        violations.push({ file: artifactPath, message: `HIGH_RISK_REQUIRED_APPROVAL_MISSING ${authority}` });
      }
    }
  }

  if (impact.impacts.ci === true && impact.impacts.governance === true) {
    const governanceApproval = approvalByAuthority.get("governance_contract_authority");
    const ciApproval = approvalByAuthority.get("ci_workflow_authority");
    if (governanceApproval && ciApproval && governanceApproval.approver === ciApproval.approver) {
      violations.push({ file: artifactPath, message: "GOVERNANCE_AND_CI_APPROVERS_MUST_BE_SEPARATE" });
    }
  }
}

fail(guardId, violations);
