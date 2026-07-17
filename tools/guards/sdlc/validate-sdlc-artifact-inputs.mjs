import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-artifact-inputs";
const args = process.argv.slice(2);
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });
const stageOrder = [
  "G0_INTAKE", "G1_PRODUCT_MODEL_APPROVED", "G2_DESIGN_APPROVED", "G3_READY_FOR_IMPLEMENTATION",
  "G4_IMPLEMENTATION_VERIFIED", "G5_PRODUCT_ACCEPTED", "G6_QA_APPROVED", "G7_SECURITY_APPROVED",
  "G8_RELEASE_APPROVED", "G9_DEPLOYED", "G10_PRODUCTION_VERIFIED", "CLOSED_WITH_EVIDENCE",
];

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
  try {
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const validate = ajv.compile(schema);
    if (!validate(input)) {
      for (const error of validate.errors ?? []) violations.push({ file: inputRelative, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
    }
    return input;
  } catch (error) {
    violations.push({ file: inputRelative, message: `INVALID_JSON_OR_SCHEMA ${error.message}` });
    return undefined;
  }
}

function atOrAfter(stage, threshold) {
  return stageOrder.indexOf(stage) >= stageOrder.indexOf(threshold);
}

const artifactPath = getArg("--artifact");
const impactPath = getArg("--impact");
const capability = getArg("--capability");
const affectedMode = args.includes("--affected");

if (affectedMode && (!artifactPath || !impactPath)) violations.push({ file: "<cli>", message: "AFFECTED_SDLC_GATE_REQUIRES_ARTIFACT_AND_IMPACT" });
if ((artifactPath && !impactPath) || (!artifactPath && impactPath)) violations.push({ file: "<cli>", message: "SDLC_ARTIFACT_AND_IMPACT_MUST_BE_PROVIDED_TOGETHER" });

const artifact = artifactPath ? readAndValidate(artifactPath, "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json") : undefined;
const impact = impactPath ? readAndValidate(impactPath, "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json") : undefined;

if (artifact && impact) {
  if (artifact.capabilityId !== impact.capabilityId) violations.push({ file: artifactPath, message: `CAPABILITY_MISMATCH artifact=${artifact.capabilityId} impact=${impact.capabilityId}` });
  if (capability && artifact.capabilityId !== capability) violations.push({ file: artifactPath, message: `CLI_CAPABILITY_MISMATCH cli=${capability} artifact=${artifact.capabilityId}` });
  if (artifact.branch !== impact.branch) violations.push({ file: artifactPath, message: `BRANCH_MISMATCH artifact=${artifact.branch} impact=${impact.branch}` });
  if (artifact.repositoryMode !== impact.repositoryMode) violations.push({ file: artifactPath, message: "REPOSITORY_MODE_MISMATCH" });
  if (artifact.resolvedCommitSha !== impact.baseCommitSha) violations.push({ file: artifactPath, message: `COMMIT_MISMATCH artifact=${artifact.resolvedCommitSha} impact=${impact.baseCommitSha}` });

  const highRisk = ["high", "critical"].includes(impact.riskClass);
  const passDecision = ["PASS", "CLOSED_WITH_EVIDENCE"].includes(artifact.decision);
  const closureDecision = artifact.decision === "CLOSED_WITH_EVIDENCE";
  const requiredApprovals = new Set(artifact.requiredApprovals ?? []);
  const approvalByAuthority = new Map();
  const applicableScopes = new Set(artifact.applicableEvidenceScopes ?? []);
  const passedScopes = new Set(artifact.passedEvidenceScopes ?? []);
  const notApplicableStages = new Set(artifact.notApplicableStages ?? []);
  const exclusionByStage = new Map();

  for (const exclusion of artifact.stageExclusions ?? []) {
    if (exclusionByStage.has(exclusion.stage)) violations.push({ file: artifactPath, message: `DUPLICATE_STAGE_EXCLUSION ${exclusion.stage}` });
    exclusionByStage.set(exclusion.stage, exclusion);
  }
  for (const stage of notApplicableStages) if (!exclusionByStage.has(stage)) violations.push({ file: artifactPath, message: `NOT_APPLICABLE_STAGE_WITHOUT_EVIDENCE ${stage}` });
  for (const stage of exclusionByStage.keys()) if (!notApplicableStages.has(stage)) violations.push({ file: artifactPath, message: `STAGE_EXCLUSION_NOT_DECLARED ${stage}` });

  for (const approval of artifact.approvals ?? []) {
    if (approvalByAuthority.has(approval.authority)) violations.push({ file: artifactPath, message: `DUPLICATE_AUTHORITY_APPROVAL ${approval.authority}` });
    approvalByAuthority.set(approval.authority, approval);
    if (approval.commitSha !== artifact.resolvedCommitSha) violations.push({ file: artifactPath, message: `STALE_APPROVAL_COMMIT ${approval.authority}` });
    const protectedChange = highRisk || impact.impacts.ci || impact.impacts.governance || impact.impacts.wltFinance;
    if (protectedChange && artifact.changeAuthor && approval.approver === artifact.changeAuthor) violations.push({ file: artifactPath, message: `PROTECTED_CHANGE_SELF_APPROVAL ${approval.authority}` });
  }

  const requiredScopes = new Set(["static"]);
  if (impact.productImpact === "CHANGED") requiredScopes.add("product");
  for (const [impactName, scope] of [
    ["runtime", "runtime"], ["visual", "visual"], ["qa", "qa"], ["security", "security"],
    ["wltFinance", "finance"], ["tenant", "isolation"], ["governance", "governance"],
    ["ci", "ci"], ["release", "release"], ["production", "production"],
  ]) if (impact.impacts[impactName] === true) requiredScopes.add(scope);

  for (const scope of requiredScopes) if (!applicableScopes.has(scope)) violations.push({ file: artifactPath, message: `IMPACT_REQUIRED_EVIDENCE_SCOPE_MISSING ${scope}` });
  if (highRisk && impact.impacts.security !== true) violations.push({ file: impactPath, message: "HIGH_RISK_CHANGE_MUST_DECLARE_SECURITY_IMPACT" });

  if (impact.productImpact === "CHANGED") {
    if (!artifact.productTruthContract || artifact.productTruthContract !== impact.productTruthContract) violations.push({ file: artifactPath, message: "CHANGED_PRODUCT_REQUIRES_MATCHING_PRODUCT_TRUTH_CONTRACT" });
    if (!artifact.productTruthState || artifact.productTruthState === "NOT_APPLICABLE") violations.push({ file: artifactPath, message: "CHANGED_PRODUCT_REQUIRES_PRODUCT_TRUTH_STATE" });
  }
  if (impact.productImpact === "NONE" && artifact.productTruthState && artifact.productTruthState !== "NOT_APPLICABLE") violations.push({ file: artifactPath, message: "PRODUCT_IMPACT_NONE_CONFLICTS_WITH_PRODUCT_TRUTH_STATE" });

  const gatePatternByScope = {
    product: /PRODUCT/,
    runtime: /RUNTIME|INTEGRATION/,
    visual: /VISUAL|UI|A11Y/,
    qa: /QA|QUALITY/,
    security: /SECURITY/,
    finance: /WLT|FINANCE/,
    isolation: /TENANT|ISOLATION/,
    governance: /GOVERNANCE|SDLC/,
    ci: /CI|WORKFLOW/,
    release: /RELEASE/,
    production: /PRODUCTION/,
  };
  for (const scope of requiredScopes) {
    const pattern = gatePatternByScope[scope];
    if (pattern && !(artifact.applicableGates ?? []).some((gate) => pattern.test(gate))) violations.push({ file: artifactPath, message: `EVIDENCE_SCOPE_WITHOUT_APPLICABLE_GATE ${scope}` });
  }

  const mandatoryStages = new Set(["G4_IMPLEMENTATION_VERIFIED"]);
  if (impact.productImpact === "CHANGED") for (const stage of ["G1_PRODUCT_MODEL_APPROVED", "G3_READY_FOR_IMPLEMENTATION", "G5_PRODUCT_ACCEPTED"]) mandatoryStages.add(stage);
  if (impact.impacts.visual) mandatoryStages.add("G5_PRODUCT_ACCEPTED");
  if (impact.impacts.qa) mandatoryStages.add("G6_QA_APPROVED");
  if (impact.impacts.security || impact.impacts.tenant) mandatoryStages.add("G7_SECURITY_APPROVED");
  if (impact.impacts.release) mandatoryStages.add("G8_RELEASE_APPROVED");
  if (impact.impacts.production) for (const stage of ["G9_DEPLOYED", "G10_PRODUCTION_VERIFIED"]) mandatoryStages.add(stage);
  for (const stage of mandatoryStages) if (notApplicableStages.has(stage)) violations.push({ file: artifactPath, message: `IMPACT_MANDATORY_STAGE_CANNOT_BE_NOT_APPLICABLE ${stage}` });

  function requireApproval(authority, threshold, label) {
    if (!atOrAfter(artifact.requestedStage, threshold)) return;
    if (!requiredApprovals.has(authority)) {
      violations.push({ file: artifactPath, message: `${label}_REQUIRED_APPROVAL_MISSING ${authority}` });
      return;
    }
    if (passDecision) {
      const approval = approvalByAuthority.get(authority);
      if (!approval || approval.decision !== "PASS") violations.push({ file: artifactPath, message: `${label}_PASS_WITHOUT_APPROVAL ${authority}` });
    }
  }

  if (impact.productImpact === "CHANGED") {
    requireApproval("product_manager_authority", "G1_PRODUCT_MODEL_APPROVED", "PRODUCT_MODEL");
    requireApproval("product_owner_acceptance_authority", "G3_READY_FOR_IMPLEMENTATION", "PRODUCT_OWNER");
  }
  if (impact.impacts.governance) requireApproval("governance_contract_authority", "G4_IMPLEMENTATION_VERIFIED", "GOVERNANCE_IMPACT");
  if (impact.impacts.ci) requireApproval("ci_workflow_authority", "G4_IMPLEMENTATION_VERIFIED", "CI_IMPACT");
  if (impact.impacts.wltFinance) requireApproval("financial_control_authority", "G4_IMPLEMENTATION_VERIFIED", "FINANCE_IMPACT");
  if (highRisk) requireApproval("independent_reviewer", "G4_IMPLEMENTATION_VERIFIED", "HIGH_RISK_REVIEW");
  if (impact.impacts.qa) requireApproval("independent_quality_authority", "G6_QA_APPROVED", "QA_IMPACT");
  if (impact.impacts.security || impact.impacts.tenant) requireApproval("application_security_authority", "G7_SECURITY_APPROVED", "SECURITY_IMPACT");
  if (impact.impacts.release || impact.impacts.production) requireApproval("release_authority", "G8_RELEASE_APPROVED", "RELEASE_IMPACT");

  if (passDecision) {
    for (const authority of requiredApprovals) {
      const approval = approvalByAuthority.get(authority);
      if (!approval || approval.decision !== "PASS") violations.push({ file: artifactPath, message: `REQUIRED_APPROVAL_NOT_PASSED ${authority}` });
    }
  }

  if (impact.impacts.ci && impact.impacts.governance) {
    const governanceApproval = approvalByAuthority.get("governance_contract_authority");
    const ciApproval = approvalByAuthority.get("ci_workflow_authority");
    if (governanceApproval && ciApproval && governanceApproval.approver === ciApproval.approver) violations.push({ file: artifactPath, message: "GOVERNANCE_AND_CI_APPROVERS_MUST_BE_SEPARATE" });
  }

  if (closureDecision) {
    for (const scope of applicableScopes) if (!passedScopes.has(scope)) violations.push({ file: artifactPath, message: `CLOSURE_APPLICABLE_SCOPE_NOT_PASSED ${scope}` });
    for (const scope of requiredScopes) if (!passedScopes.has(scope)) violations.push({ file: artifactPath, message: `CLOSURE_REQUIRED_SCOPE_NOT_PASSED ${scope}` });
    if (highRisk) {
      const enforcement = readAndValidate("governance/github/repository-enforcement.json", "governance/github/repository-enforcement.schema.json");
      if (!enforcement?.claims?.highRiskClosureAllowed) violations.push({ file: "governance/github/repository-enforcement.json", message: "HIGH_RISK_CLOSURE_BLOCKED_BY_GITHUB_ENFORCEMENT" });
    }
  }
}

fail(guardId, violations);
