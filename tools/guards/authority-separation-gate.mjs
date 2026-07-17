import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "authority-separation-gate";
const violations = [];

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const agentsDocPath = "AGENTS.md";
const agentPath = "governance/agents/agent-registry.json";
const skillPath = "governance/skills/skills-registry.json";
const indexPath = ".agents/INDEX.md";
const rolesPath = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
const gatesPath = "governance/operational_journey_protocol_package/sdlc/gate-catalog.yaml";

const agentsDoc = readText(agentsDocPath);
const agents = readJson(agentPath);
const skills = readJson(skillPath);
const index = readText(indexPath);
const roles = readText(rolesPath);
const gates = readText(gatesPath);

const agentById = new Map((agents?.entries ?? []).map((entry) => [entry.id, entry]));
const skillById = new Map((skills?.entries ?? []).map((entry) => [entry.id, entry]));

const requiredRoles = [
  "master-advisory-supervisor",
  "sdlc-program-authority",
  "product-manager-authority",
  "product-owner-acceptance-authority",
  "ux-journey-authority",
  "architecture-authority",
  "governance-contract-authority",
  "ci-workflow-authority",
  "engineering-executor",
  "independent-reviewer",
  "independent-quality-authority",
  "application-security-authority",
  "financial-control-authority",
  "release-authority",
  "risk-acceptance-authority",
];

for (const role of requiredRoles) {
  if (!agentById.has(role)) violations.push({ file: agentPath, line: 0, message: `MISSING_REQUIRED_AUTHORITY ${role}` });
}

const supervisor = agentById.get("master-advisory-supervisor");
for (const forbiddenMode of ["write", "approve", "release"]) {
  if (supervisor?.allowed_modes?.includes(forbiddenMode)) violations.push({ file: agentPath, line: 0, message: `ADVISORY_SUPERVISOR_FORBIDDEN_MODE ${forbiddenMode}` });
}

const productManager = agentById.get("product-manager-authority");
const productOwner = agentById.get("product-owner-acceptance-authority");
if (productManager?.owner === productOwner?.owner) violations.push({ file: agentPath, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_HAVE_SEPARATE_OWNER_IDENTITIES" });

const governance = agentById.get("governance-contract-authority");
const ci = agentById.get("ci-workflow-authority");
if (governance?.owner === ci?.owner) violations.push({ file: agentPath, line: 0, message: "GOVERNANCE_AND_CI_MUST_HAVE_SEPARATE_OWNER_IDENTITIES" });
if (governance?.primary_file === ci?.primary_file) violations.push({ file: agentPath, line: 0, message: "GOVERNANCE_AND_CI_MUST_HAVE_SEPARATE_PRIMARY_SKILLS" });
if (governance?.allowed_modes?.includes("write")) violations.push({ file: agentPath, line: 0, message: "GOVERNANCE_APPROVER_MUST_NOT_WRITE" });
if (ci?.allowed_modes?.includes("write")) violations.push({ file: agentPath, line: 0, message: "CI_APPROVER_MUST_NOT_WRITE" });

const reviewer = agentById.get("independent-reviewer");
if (reviewer?.primary_file === supervisor?.primary_file) violations.push({ file: agentPath, line: 0, message: "INDEPENDENT_REVIEWER_MUST_NOT_SHARE_COORDINATOR_SKILL" });
for (const forbiddenMode of ["write", "release"]) {
  if (reviewer?.allowed_modes?.includes(forbiddenMode)) violations.push({ file: agentPath, line: 0, message: `INDEPENDENT_REVIEWER_FORBIDDEN_MODE ${forbiddenMode}` });
}
if (reviewer && reviewer.requires_independent_review !== true) violations.push({ file: agentPath, line: 0, message: "INDEPENDENT_REVIEWER_MUST_REQUIRE_INDEPENDENCE" });

const expectedPrimarySkills = new Map([
  ["governance-contract-authority", "bthwani-governance-contract-guardian"],
  ["ci-workflow-authority", "bthwani-ci-workflow-guardian"],
  ["independent-reviewer", "bthwani-independent-implementation-reviewer"],
]);
for (const [agentId, expectedSkillId] of expectedPrimarySkills) {
  const agent = agentById.get(agentId);
  const actualSkillId = agent?.primary_file?.split("/")?.[2];
  if (actualSkillId !== expectedSkillId) violations.push({ file: agentPath, line: 0, message: `AUTHORITY_PRIMARY_SKILL_DRIFT ${agentId}: ${actualSkillId ?? "missing"}` });
  const skill = skillById.get(expectedSkillId);
  if (!skill || skill.contract_level !== "governed" || !["active", "conditional"].includes(skill.status)) violations.push({ file: skillPath, line: 0, message: `AUTHORITY_SKILL_NOT_ACTIVE_GOVERNED ${expectedSkillId}` });
}

const reviewerSkill = skillById.get("bthwani-independent-implementation-reviewer");
if (!reviewerSkill?.conflicts_with?.includes("bthwani-cost-aware-subagent-orchestrator")) {
  violations.push({ file: skillPath, line: 0, message: "INDEPENDENT_REVIEWER_MUST_CONFLICT_WITH_COORDINATOR" });
}

const mixedSkill = skillById.get("bthwani-governance-ci-guardian");
if (!mixedSkill || mixedSkill.status !== "retired" || mixedSkill.contract_level !== "legacy") violations.push({ file: skillPath, line: 0, message: "MIXED_GOVERNANCE_CI_SKILL_MUST_BE_RETIRED" });
if (index.includes("→ `bthwani-governance-ci-guardian`") || /^- `bthwani-governance-ci-guardian`$/m.test(index)) violations.push({ file: indexPath, line: 0, message: "RETIRED_MIXED_SKILL_STILL_ROUTED" });

const skillAuthorityMarkers = new Map([
  ["bthwani-governance-contract-guardian", "`GOVERNANCE_CONTRACT_AUTHORITY`"],
  ["bthwani-ci-workflow-guardian", "`CI_WORKFLOW_AUTHORITY`"],
  ["bthwani-independent-implementation-reviewer", "independent reviewer"],
]);
for (const [requiredSkill, authorityMarker] of skillAuthorityMarkers) {
  if (!index.includes(`\`${requiredSkill}\``)) violations.push({ file: indexPath, line: 0, message: `SEPARATED_SKILL_MISSING_FROM_INDEX ${requiredSkill}` });
  if (!agentsDoc.toLowerCase().includes(authorityMarker.toLowerCase())) violations.push({ file: agentsDocPath, line: 0, message: `SEPARATED_AUTHORITY_MISSING_FROM_AGENTS ${authorityMarker}` });
}

for (const authority of [
  "sdlc_program_authority",
  "product_manager_authority",
  "product_owner_acceptance_authority",
  "ux_journey_authority",
  "architecture_authority",
  "governance_contract_authority",
  "ci_workflow_authority",
  "engineering",
  "independent_reviewer",
  "independent_quality_authority",
  "application_security_authority",
  "financial_control_authority",
  "release_authority",
  "risk_acceptance_authority",
]) {
  if (!new RegExp(`^  ${authority}:\\s*$`, "m").test(roles)) violations.push({ file: rolesPath, line: 0, message: `SDLC_AUTHORITY_MISSING ${authority}` });
}

for (const marker of [
  "`SDLC_PROGRAM_AUTHORITY`",
  "`GOVERNANCE_CONTRACT_AUTHORITY`",
  "`CI_WORKFLOW_AUTHORITY`",
  "`FINANCIAL_CONTROL_AUTHORITY`",
  "`RISK_ACCEPTANCE_AUTHORITY`",
]) {
  if (!agentsDoc.includes(marker)) violations.push({ file: agentsDocPath, line: 0, message: `AGENTS_AUTHORITY_MARKER_MISSING ${marker}` });
}

for (const scope of ["static", "product", "runtime", "visual", "qa", "security", "finance", "isolation", "governance", "ci", "release", "production"]) {
  if (!agentsDoc.includes(`\`${scope}\``)) violations.push({ file: agentsDocPath, line: 0, message: `AGENTS_CLOSURE_SCOPE_MISSING ${scope}` });
}

if (!/G4_IMPLEMENTATION_VERIFIED:\s*\n\s+owner:\s+independent_reviewer\s*$/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G4_MUST_BE_OWNED_BY_INDEPENDENT_REVIEWER" });
if (!/G7_SECURITY_APPROVED:[\s\S]*?requires:\s*\[G6_QA_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G7_MUST_REQUIRE_G6" });
if (!/G8_RELEASE_APPROVED:[\s\S]*?requires:\s*\[G7_SECURITY_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G8_MUST_REQUIRE_G7" });
if (!/G9_DEPLOYED:[\s\S]*?requires:\s*\[G8_RELEASE_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G9_MUST_REQUIRE_G8" });
if (!/G10_PRODUCTION_VERIFIED:[\s\S]*?requires:\s*\[G9_DEPLOYED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G10_MUST_REQUIRE_G9" });

fail(guardId, violations);
