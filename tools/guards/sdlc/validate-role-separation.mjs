import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-role-separation";
const violations = [];
const rolesFile = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
const agentRegistryFile = "governance/agents/agent-registry.json";
const roles = fs.readFileSync(path.join(repoRoot, rolesFile), "utf8");
const agentRegistry = JSON.parse(fs.readFileSync(path.join(repoRoot, agentRegistryFile), "utf8"));

for (const marker of [
  "sdlc_program_authority:",
  "product_manager_authority:",
  "product_owner_acceptance_authority:",
  "governance_contract_authority:",
  "ci_workflow_authority:",
  "financial_control_authority:",
  "independent_reviewer:",
  "independent_quality_authority:",
  "application_security_authority:",
  "release_authority:",
  "risk_acceptance_authority:",
  "must_not_be_change_author: true",
  "must_not_be_change_author_when_high_risk: true",
  "must_not_be_work_coordinator: true",
  "may_final_approve_own_high_risk_change: false",
  "may_approve_product_model: false",
  "may_approve_product_acceptance: false",
  "may_approve_governance_contract: false",
  "may_approve_ci_workflow: false",
  "may_approve_finance: false",
  "must_be_separate_from_governance_contract_authority: true",
  "requires_product_acceptance: true",
  "- product_model_approval",
  "- product_acceptance",
  "- governance_contract_approval",
  "- ci_workflow_approval",
  "- finance_approval",
  "- independent_review_high_risk",
  "- final_closure",
]) if (!roles.includes(marker)) violations.push({ file: rolesFile, message: `MISSING_ROLE_SEPARATION_RULE ${marker}` });

const agents = new Map(agentRegistry.entries.map((entry) => [entry.id, entry]));
for (const requiredId of [
  "sdlc-program-authority",
  "product-manager-authority",
  "product-owner-acceptance-authority",
  "governance-contract-authority",
  "ci-workflow-authority",
  "engineering-executor",
  "independent-reviewer",
  "independent-quality-authority",
  "application-security-authority",
  "financial-control-authority",
  "release-authority",
  "risk-acceptance-authority",
]) if (!agents.has(requiredId)) violations.push({ file: agentRegistryFile, message: `MISSING_REQUIRED_AUTHORITY_AGENT ${requiredId}` });

const supervisor = agents.get("master-advisory-supervisor");
const productManager = agents.get("product-manager-authority");
const productOwner = agents.get("product-owner-acceptance-authority");
const governance = agents.get("governance-contract-authority");
const ci = agents.get("ci-workflow-authority");
const reviewer = agents.get("independent-reviewer");
const finance = agents.get("financial-control-authority");
const risk = agents.get("risk-acceptance-authority");

if (productManager?.owner === productOwner?.owner) violations.push({ file: agentRegistryFile, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_OWNERS_MUST_BE_DISTINCT" });
if (productManager?.owner === "BThwani Engineering Team" || productOwner?.owner === "BThwani Engineering Team") violations.push({ file: agentRegistryFile, message: "ENGINEERING_MUST_NOT_OWN_PRODUCT_APPROVAL_AUTHORITY" });
if (governance?.owner === ci?.owner) violations.push({ file: agentRegistryFile, message: "GOVERNANCE_AND_CI_APPROVAL_OWNERS_MUST_BE_DISTINCT" });
if (reviewer?.primary_file === supervisor?.primary_file) violations.push({ file: agentRegistryFile, message: "REVIEWER_MUST_NOT_SHARE_COORDINATOR_SKILL" });
if (finance?.owner === "BThwani Engineering Team") violations.push({ file: agentRegistryFile, message: "ENGINEERING_MUST_NOT_OWN_FINANCIAL_APPROVAL_AUTHORITY" });
if (risk?.owner === "BThwani Engineering Team") violations.push({ file: agentRegistryFile, message: "ENGINEERING_MUST_NOT_OWN_RISK_ACCEPTANCE_AUTHORITY" });

const approvalOwner = new Map();
for (const agent of agentRegistry.entries) {
  if (agent.may_final_approve_own_work === true) violations.push({ file: agentRegistryFile, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
  if ((agent.approval_domains?.length ?? 0) > 0 && agent.allowed_modes.includes("write")) violations.push({ file: agentRegistryFile, message: `APPROVAL_AUTHORITY_MUST_NOT_WRITE ${agent.id}` });
  for (const domain of agent.approval_domains ?? []) {
    if (approvalOwner.has(domain)) violations.push({ file: agentRegistryFile, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}: ${approvalOwner.get(domain)} and ${agent.id}` });
    approvalOwner.set(domain, agent.id);
  }
}

for (const [domain, expected] of [
  ["product_model_approval", "product-manager-authority"],
  ["product_acceptance", "product-owner-acceptance-authority"],
  ["governance_contract_approval", "governance-contract-authority"],
  ["ci_workflow_approval", "ci-workflow-authority"],
  ["implementation_review", "independent-reviewer"],
  ["finance_approval", "financial-control-authority"],
  ["qa_approval", "independent-quality-authority"],
  ["security_approval", "application-security-authority"],
  ["isolation_security_approval", "application-security-authority"],
  ["release_approval", "release-authority"],
  ["production_verification", "release-authority"],
  ["residual_risk_acceptance", "risk-acceptance-authority"],
]) if (approvalOwner.get(domain) !== expected) violations.push({ file: agentRegistryFile, message: `APPROVAL_DOMAIN_OWNER_DRIFT ${domain}: expected=${expected} actual=${approvalOwner.get(domain) ?? "missing"}` });

fail(guardId, violations);
