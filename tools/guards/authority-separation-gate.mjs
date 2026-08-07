import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "authority-separation-gate";
const violations = [];
const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));
const read = (relative) => exists(relative) ? fs.readFileSync(path.join(repoRoot, relative), "utf8") : "";
const readJson = (relative) => {
  if (!exists(relative)) { violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" }); return { entries: [] }; }
  try { return JSON.parse(read(relative)); } catch (error) { violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` }); return { entries: [] }; }
};

const agentPath = "governance/agents/agent-registry.json";
const skillPath = "governance/skills/skills-registry.json";
const indexPath = ".agents/INDEX.md";
const rolesPath = "governance/contracts/sdlc/roles-and-authority.yaml";
const gatesPath = "governance/contracts/sdlc/gate-catalog.yaml";
const agents = readJson(agentPath);
const skills = readJson(skillPath);
const index = read(indexPath);
const roles = read(rolesPath);
const gates = read(gatesPath);
const agentById = new Map((agents.entries ?? []).map((entry) => [entry.id, entry]));
const skillById = new Map((skills.entries ?? []).map((entry) => [entry.id, entry]));

for (const role of ["master-advisory-supervisor", "sdlc-program-authority", "product-manager-authority", "product-owner-acceptance-authority", "ux-journey-authority", "architecture-authority", "governance-contract-authority", "ci-workflow-authority", "engineering-executor", "independent-reviewer", "independent-quality-authority", "application-security-authority", "financial-control-authority", "release-authority", "risk-acceptance-authority"])
  if (!agentById.has(role)) violations.push({ file: agentPath, line: 0, message: `MISSING_REQUIRED_AUTHORITY ${role}` });

const supervisor = agentById.get("master-advisory-supervisor");
for (const mode of ["write", "approve", "release"]) if (supervisor?.allowed_modes?.includes(mode)) violations.push({ file: agentPath, line: 0, message: `ADVISORY_SUPERVISOR_FORBIDDEN_MODE ${mode}` });

const productManager = agentById.get("product-manager-authority");
const productOwner = agentById.get("product-owner-acceptance-authority");
if (productManager?.owner === productOwner?.owner) violations.push({ file: agentPath, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_HAVE_SEPARATE_OWNER_IDENTITIES" });
const governance = agentById.get("governance-contract-authority");
const ci = agentById.get("ci-workflow-authority");
if (governance?.owner === ci?.owner) violations.push({ file: agentPath, line: 0, message: "GOVERNANCE_AND_CI_MUST_HAVE_SEPARATE_OWNER_IDENTITIES" });
if (governance?.primary_file === ci?.primary_file) violations.push({ file: agentPath, line: 0, message: "GOVERNANCE_AND_CI_MUST_HAVE_SEPARATE_PRIMARY_SKILLS" });

const reviewer = agentById.get("independent-reviewer");
for (const mode of ["write", "release"]) if (reviewer?.allowed_modes?.includes(mode)) violations.push({ file: agentPath, line: 0, message: `INDEPENDENT_REVIEWER_FORBIDDEN_MODE ${mode}` });
if (reviewer && reviewer.requires_independent_review !== true) violations.push({ file: agentPath, line: 0, message: "INDEPENDENT_REVIEWER_MUST_REQUIRE_INDEPENDENCE" });

for (const [agentId, skillId] of [["governance-contract-authority", "bthwani-governance-contract-guardian"], ["ci-workflow-authority", "bthwani-ci-workflow-guardian"], ["independent-reviewer", "bthwani-independent-implementation-reviewer"]]) {
  const actual = agentById.get(agentId)?.primary_file?.split("/")?.[2];
  if (actual !== skillId) violations.push({ file: agentPath, line: 0, message: `AUTHORITY_PRIMARY_SKILL_DRIFT ${agentId}: ${actual ?? "missing"}` });
  const skill = skillById.get(skillId);
  if (!skill || skill.contract_level !== "governed" || !["active", "conditional"].includes(skill.status)) violations.push({ file: skillPath, line: 0, message: `AUTHORITY_SKILL_NOT_ACTIVE_GOVERNED ${skillId}` });
  if (!index.includes(`\`${skillId}\``)) violations.push({ file: indexPath, line: 0, message: `SEPARATED_SKILL_MISSING_FROM_INDEX ${skillId}` });
}

for (const authority of ["sdlc_program_authority", "product_manager_authority", "product_owner_acceptance_authority", "ux_journey_authority", "architecture_authority", "governance_contract_authority", "ci_workflow_authority", "engineering", "independent_reviewer", "independent_quality_authority", "application_security_authority", "financial_control_authority", "release_authority", "risk_acceptance_authority"])
  if (!new RegExp(`^  ${authority}:\\s*$`, "m").test(roles)) violations.push({ file: rolesPath, line: 0, message: `SDLC_AUTHORITY_MISSING ${authority}` });

if (!/G4_IMPLEMENTATION_VERIFIED:\s*\n\s+owner:\s+independent_reviewer\s*$/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G4_MUST_BE_OWNED_BY_INDEPENDENT_REVIEWER" });
if (!/G7_SECURITY_APPROVED:[\s\S]*?requires:\s*\[G6_QA_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G7_MUST_REQUIRE_G6" });
if (!/G8_RELEASE_APPROVED:[\s\S]*?requires:\s*\[G7_SECURITY_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G8_MUST_REQUIRE_G7" });
if (!/G9_DEPLOYED:[\s\S]*?requires:\s*\[G8_RELEASE_APPROVED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G9_MUST_REQUIRE_G8" });
if (!/G10_PRODUCTION_VERIFIED:[\s\S]*?requires:\s*\[G9_DEPLOYED\]/m.test(gates)) violations.push({ file: gatesPath, line: 0, message: "G10_MUST_REQUIRE_G9" });

fail(guardId, violations);
