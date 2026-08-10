import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-role-separation";
const violations = [];
const rolesFile = "governance/contracts/sdlc/roles-and-authority.yaml";
const agentRegistryFile = "governance/agents/agent-registry.json";
const singleOwnerFile = "governance/authority/single-owner-mode.json";
const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));
if (!exists(rolesFile)) violations.push({ file: rolesFile, message: "MISSING_SDLC_ROLES" });
if (!exists(agentRegistryFile)) violations.push({ file: agentRegistryFile, message: "MISSING_AGENT_REGISTRY" });
if (!exists(singleOwnerFile)) violations.push({ file: singleOwnerFile, message: "MISSING_SINGLE_OWNER_CONTRACT" });

const roles = exists(rolesFile) ? fs.readFileSync(path.join(repoRoot, rolesFile), "utf8") : "";
const agentRegistry = exists(agentRegistryFile) ? JSON.parse(fs.readFileSync(path.join(repoRoot, agentRegistryFile), "utf8")) : { entries: [] };
const singleOwner = exists(singleOwnerFile) ? JSON.parse(fs.readFileSync(path.join(repoRoot, singleOwnerFile), "utf8")) : {};

for (const marker of [
  "sdlc_program_authority:", "product_manager_authority:", "product_owner_acceptance_authority:",
  "governance_contract_authority:", "ci_workflow_authority:", "financial_control_authority:",
  "independent_reviewer:", "independent_quality_authority:", "application_security_authority:",
  "release_authority:", "risk_acceptance_authority:", "must_not_be_change_author: true",
  "execution_agent_may_impersonate_owner: false", "execution_agent_may_issue_owner_approval: false",
  "blanket_authorization_is_not_outcome_acceptance: true", "same_commit_automated_checks_required: true",
  "failed_checks_may_not_be_waived: true", "protected_domains_remain_independent_or_unclosed:"
]) if (!roles.includes(marker)) violations.push({ file: rolesFile, message: `MISSING_ROLE_SEPARATION_RULE ${marker}` });

if (singleOwner.mode !== "SOLE_OWNER" || singleOwner.status !== "ACTIVE") violations.push({ file: singleOwnerFile, message: "SOLE_OWNER_MODE_MUST_BE_ACTIVE" });
if (!singleOwner.ownerIdentity) violations.push({ file: singleOwnerFile, message: "SOLE_OWNER_IDENTITY_MISSING" });
if (singleOwner.acknowledgements?.automatedChecksRemainMandatory !== true) violations.push({ file: singleOwnerFile, message: "AUTOMATED_CHECKS_MUST_REMAIN_MANDATORY" });
if (singleOwner.acknowledgements?.blanketAuthorizationIsNotOutcomeAcceptance !== true) violations.push({ file: singleOwnerFile, message: "BLANKET_AUTHORIZATION_MUST_NOT_EQUAL_OUTCOME_ACCEPTANCE" });

const protectedDomains = new Set(singleOwner.approvalPolicy?.protectedDomains ?? []);
for (const domain of ["authentication_authorization_sessions", "pii_privacy_secrets_credentials", "operator_context_isolation", "security_approval", "financial_control", "migrations_and_production_data", "critical_high_vulnerability_acceptance", "residual_risk_acceptance", "release_approval", "deployment", "production_verification", "final_closure"])
  if (!protectedDomains.has(domain)) violations.push({ file: singleOwnerFile, message: `SOLE_OWNER_PROTECTED_DOMAIN_MISSING ${domain}` });
for (const domain of singleOwner.approvalPolicy?.allowedDomains ?? []) if (protectedDomains.has(domain)) violations.push({ file: singleOwnerFile, message: `SOLE_OWNER_DOMAIN_BOTH_ALLOWED_AND_PROTECTED ${domain}` });
for (const [key, expected] of Object.entries({ mayImpersonateOwner: false, mayConvertBlanketAuthorizationIntoOutcomeAcceptance: false, maySelfApproveProtectedDomains: false, mayMergeFailingCommit: false, mayBypassRepositoryProtection: false }))
  if (singleOwner.executorPolicy?.[key] !== expected) violations.push({ file: singleOwnerFile, message: `UNSAFE_SOLE_OWNER_EXECUTOR_POLICY ${key}` });

const agents = new Map((agentRegistry.entries ?? []).map((entry) => [entry.id, entry]));
for (const id of ["sdlc-program-authority", "product-manager-authority", "product-owner-acceptance-authority", "governance-contract-authority", "ci-workflow-authority", "engineering-executor", "independent-reviewer", "independent-quality-authority", "application-security-authority", "financial-control-authority", "release-authority", "risk-acceptance-authority"])
  if (!agents.has(id)) violations.push({ file: agentRegistryFile, message: `MISSING_REQUIRED_AUTHORITY_AGENT ${id}` });

if (agents.get("product-manager-authority")?.owner === agents.get("product-owner-acceptance-authority")?.owner) violations.push({ file: agentRegistryFile, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_OWNERS_MUST_BE_DISTINCT" });
if (agents.get("governance-contract-authority")?.owner === agents.get("ci-workflow-authority")?.owner) violations.push({ file: agentRegistryFile, message: "GOVERNANCE_AND_CI_APPROVAL_OWNERS_MUST_BE_DISTINCT" });

const approvalOwner = new Map();
for (const agent of agentRegistry.entries ?? []) {
  if (agent.may_final_approve_own_work === true) violations.push({ file: agentRegistryFile, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
  if ((agent.approval_domains?.length ?? 0) > 0 && agent.allowed_modes.includes("write")) violations.push({ file: agentRegistryFile, message: `APPROVAL_AUTHORITY_MUST_NOT_WRITE ${agent.id}` });
  for (const domain of agent.approval_domains ?? []) {
    if (approvalOwner.has(domain)) violations.push({ file: agentRegistryFile, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}` });
    approvalOwner.set(domain, agent.id);
  }
}
for (const [domain, expected] of [
  ["product_model_approval", "product-manager-authority"], ["product_acceptance", "product-owner-acceptance-authority"],
  ["governance_contract_approval", "governance-contract-authority"], ["ci_workflow_approval", "ci-workflow-authority"],
  ["implementation_review", "independent-reviewer"], ["finance_approval", "financial-control-authority"],
  ["qa_approval", "independent-quality-authority"], ["security_approval", "application-security-authority"],
  ["isolation_security_approval", "application-security-authority"], ["release_approval", "release-authority"],
  ["production_verification", "release-authority"], ["residual_risk_acceptance", "risk-acceptance-authority"]
]) if (approvalOwner.get(domain) !== expected) violations.push({ file: agentRegistryFile, message: `APPROVAL_DOMAIN_OWNER_DRIFT ${domain}: expected=${expected} actual=${approvalOwner.get(domain) ?? "missing"}` });

fail(guardId, violations);
