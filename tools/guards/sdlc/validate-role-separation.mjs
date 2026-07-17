import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-role-separation";
const violations = [];
const rolesFile = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
const roles = fs.readFileSync(path.join(repoRoot, rolesFile), "utf8");
const agentRegistryFile = "governance/agents/agent-registry.json";
const agentRegistry = JSON.parse(fs.readFileSync(path.join(repoRoot, agentRegistryFile), "utf8"));

for (const marker of [
  "product_manager_authority:",
  "product_owner_acceptance_authority:",
  "independent_quality_authority:",
  "application_security_authority:",
  "release_authority:",
  "risk_acceptance_authority:",
  "must_not_be_change_author: true",
  "may_final_approve_own_high_risk_change: false",
  "may_approve_product_model: false",
  "may_approve_product_acceptance: false",
  "requires_product_acceptance: true",
  "- product_model_approval",
  "- product_acceptance",
  "- final_closure",
]) {
  if (!roles.includes(marker)) {
    violations.push({ file: rolesFile, message: `MISSING_ROLE_SEPARATION_RULE ${marker}` });
  }
}

const agents = new Map(agentRegistry.entries.map((entry) => [entry.id, entry]));
for (const requiredId of [
  "product-manager-authority",
  "product-owner-acceptance-authority",
  "engineering-executor",
  "independent-quality-authority",
  "application-security-authority",
  "release-authority",
  "independent-reviewer",
]) {
  if (!agents.has(requiredId)) {
    violations.push({ file: agentRegistryFile, message: `MISSING_REQUIRED_AUTHORITY_AGENT ${requiredId}` });
  }
}

const productManager = agents.get("product-manager-authority");
const productOwner = agents.get("product-owner-acceptance-authority");
if (productManager && productOwner && productManager.id === productOwner.id) {
  violations.push({ file: agentRegistryFile, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_BE_DISTINCT" });
}
if (productManager?.owner === "BThwani Engineering Team" || productOwner?.owner === "BThwani Engineering Team") {
  violations.push({ file: agentRegistryFile, message: "ENGINEERING_MUST_NOT_OWN_PRODUCT_APPROVAL_AUTHORITY" });
}

const approvalOwner = new Map();
for (const agent of agentRegistry.entries) {
  if (agent.may_final_approve_own_work === true) {
    violations.push({ file: agentRegistryFile, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
  }
  for (const domain of agent.approval_domains ?? []) {
    if (approvalOwner.has(domain)) {
      violations.push({ file: agentRegistryFile, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}: ${approvalOwner.get(domain)} and ${agent.id}` });
    }
    approvalOwner.set(domain, agent.id);
  }
}

if (approvalOwner.get("product_model_approval") === approvalOwner.get("product_acceptance")) {
  violations.push({ file: agentRegistryFile, message: "PRODUCT_MODEL_AND_PRODUCT_ACCEPTANCE_APPROVALS_MUST_BE_SEPARATE" });
}

fail(guardId, violations);
