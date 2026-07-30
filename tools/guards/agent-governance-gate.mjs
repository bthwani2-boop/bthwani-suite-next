import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "agent-governance-gate";
const violations = [];
const skillsRegistryRelative = "governance/skills/skills-registry.json";
const agentRegistryRelative = "governance/agents/agent-registry.json";
const decisionVocabularyRelative = "governance/contracts/decision-vocabulary.json";
const indexRelative = ".agents/INDEX.md";

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_REGISTRY" });
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
}

function frontmatterValue(content, key) {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1] ?? "";
  return frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)$`, "m"))?.[1]?.trim();
}

function allowedDecisionTokens(content) {
  const line = content.match(/^Allowed decisions:\s*(.+)$/mi)?.[1] ?? "";
  return [...line.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1]);
}

const skillsRegistry = readJson(skillsRegistryRelative);
const agentRegistry = readJson(agentRegistryRelative);
const decisions = readJson(decisionVocabularyRelative);
const skillsDir = path.join(repoRoot, ".agents/skills");
const index = fs.existsSync(path.join(repoRoot, indexRelative))
  ? fs.readFileSync(path.join(repoRoot, indexRelative), "utf8")
  : "";
const canonicalDecisions = new Set((decisions?.canonicalDecisions ?? []).map((entry) => entry.id));
const deprecatedAliases = new Set((decisions?.aliases ?? []).filter((entry) => entry.deprecated).map((entry) => entry.alias));
const skillById = new Map();
const activeSkillIds = new Set();

if (skillsRegistry && fs.existsSync(skillsDir)) {
  for (const skill of skillsRegistry.entries ?? []) {
    if (skillById.has(skill.id)) violations.push({ file: skillsRegistryRelative, line: 0, message: `DUPLICATE_SKILL_ID ${skill.id}` });
    skillById.set(skill.id, skill);

    const expectedPath = `.agents/skills/${skill.id}`;
    if (toPosix(skill.path) !== expectedPath) violations.push({ file: skillsRegistryRelative, line: 0, message: `SKILL_PATH_MISMATCH ${skill.id}: ${skill.path}` });

    const active = ["active", "conditional"].includes(skill.status);
    if (active) activeSkillIds.add(skill.id);
    if (active && skill.contract_level !== "governed") violations.push({ file: skillsRegistryRelative, line: 0, message: `ACTIVE_SKILL_MUST_BE_GOVERNED ${skill.id}` });
    if (skill.contract_level === "legacy" && skill.status !== "retired") violations.push({ file: skillsRegistryRelative, line: 0, message: `LEGACY_SKILL_MUST_BE_RETIRED ${skill.id}` });
    if (skill.status === "retired") {
      if ((skill.authority?.length ?? 0) > 0) violations.push({ file: skillsRegistryRelative, line: 0, message: `RETIRED_SKILL_OWNS_AUTHORITY ${skill.id}` });
      if ((skill.depends_on?.length ?? 0) > 0) violations.push({ file: skillsRegistryRelative, line: 0, message: `RETIRED_SKILL_HAS_DEPENDENCIES ${skill.id}` });
      if (!skill.retirement_reason) violations.push({ file: skillsRegistryRelative, line: 0, message: `RETIRED_SKILL_REASON_MISSING ${skill.id}` });
    }

    const skillDir = path.join(repoRoot, skill.path);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillDir)) {
      violations.push({ file: skill.path, line: 0, message: `MISSING_SKILL_DIRECTORY ${skill.id}` });
      continue;
    }
    if (!fs.existsSync(skillMdPath)) {
      violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `MISSING_SKILL_MD ${skill.id}` });
      continue;
    }

    const content = fs.readFileSync(skillMdPath, "utf8");
    const frontmatterName = frontmatterValue(content, "name");
    const frontmatterVersion = frontmatterValue(content, "version");
    if (frontmatterName && frontmatterName !== skill.id) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `FRONTMATTER_NAME_MISMATCH expected=${skill.id} actual=${frontmatterName}` });

    if (active) {
      if (frontmatterName !== skill.id) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `ACTIVE_SKILL_FRONTMATTER_NAME_MISSING ${skill.id}` });
      if (frontmatterVersion !== skill.version) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `ACTIVE_SKILL_VERSION_DRIFT registry=${skill.version ?? "none"} file=${frontmatterVersion ?? "none"}` });
      for (const section of ["Purpose", "Invoke when", "Do not invoke when", "Authority boundary", "Required output"]) {
        if (!new RegExp(`^##\\s+${section}\\b`, "mi").test(content)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `ACTIVE_SKILL_MISSING_SECTION ${section}` });
      }
      if (!skill.version || !skill.output_contract || !(skill.invoke_when?.length) || !(skill.do_not_invoke_when?.length)) violations.push({ file: skillsRegistryRelative, line: 0, message: `ACTIVE_SKILL_CONTRACT_INCOMPLETE ${skill.id}` });
      if (!index.includes(`\`${skill.id}\``)) violations.push({ file: indexRelative, line: 0, message: `ACTIVE_SKILL_MISSING_FROM_ROUTING_INDEX ${skill.id}` });
      if (/\bG0[-–]G9\b/.test(content)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `STALE_SDLC_RANGE_G0_G9 ${skill.id}` });
      if (/\bPRODUCT_CAPABILITY\b/.test(content)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `NONCANONICAL_TASK_MODE_PRODUCT_CAPABILITY ${skill.id}` });
      if (/\bBLOCKED_SECURITY_RISK\b/.test(content)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `NONCANONICAL_SECURITY_DECISION ${skill.id}` });
      for (const token of allowedDecisionTokens(content)) {
        if (!canonicalDecisions.has(token)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `ALLOWED_DECISION_NOT_CANONICAL ${skill.id}: ${token}` });
        if (deprecatedAliases.has(token)) violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `DEPRECATED_ALIAS_IN_ALLOWED_DECISIONS ${skill.id}: ${token}` });
      }
    }
  }

  const workspaceSkillDirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  for (const directory of workspaceSkillDirs) if (!skillById.has(directory)) violations.push({ file: skillsRegistryRelative, line: 0, message: `UNREGISTERED_SKILL ${directory}` });

  for (const skill of skillsRegistry.entries ?? []) {
    for (const dependency of skill.depends_on ?? []) {
      if (dependency === skill.id) violations.push({ file: skillsRegistryRelative, line: 0, message: `SELF_DEPENDENCY ${skill.id}` });
      else if (!skillById.has(dependency)) violations.push({ file: skillsRegistryRelative, line: 0, message: `UNKNOWN_SKILL_DEPENDENCY ${skill.id} -> ${dependency}` });
      else if (!activeSkillIds.has(dependency)) violations.push({ file: skillsRegistryRelative, line: 0, message: `DEPENDENCY_TARGET_NOT_ACTIVE_GOVERNED ${skill.id} -> ${dependency}` });
    }
    for (const conflict of skill.conflicts_with ?? []) {
      const target = skillById.get(conflict);
      if (!target) violations.push({ file: skillsRegistryRelative, line: 0, message: `UNKNOWN_SKILL_CONFLICT ${skill.id} -> ${conflict}` });
      else if (!(target.conflicts_with ?? []).includes(skill.id)) violations.push({ file: skillsRegistryRelative, line: 0, message: `ASYMMETRIC_SKILL_CONFLICT ${skill.id} <-> ${conflict}` });
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(skillId, stack = []) {
    if (visiting.has(skillId)) {
      violations.push({ file: skillsRegistryRelative, line: 0, message: `SKILL_DEPENDENCY_CYCLE ${[...stack, skillId].join(" -> ")}` });
      return;
    }
    if (visited.has(skillId) || !activeSkillIds.has(skillId)) return;
    visiting.add(skillId);
    for (const dependency of skillById.get(skillId)?.depends_on ?? []) visit(dependency, [...stack, skillId]);
    visiting.delete(skillId);
    visited.add(skillId);
  }
  for (const skillId of activeSkillIds) visit(skillId);
}

if (/\bG0[-–]G9\b/.test(index)) violations.push({ file: indexRelative, line: 0, message: "ROUTING_INDEX_STALE_SDLC_RANGE_G0_G9" });
if (/\bPRODUCT_CAPABILITY\b/.test(index)) violations.push({ file: indexRelative, line: 0, message: "ROUTING_INDEX_NONCANONICAL_TASK_MODE" });

if (agentRegistry) {
  const requiredRoles = new Set([
    "master-advisory-supervisor", "sdlc-program-authority", "product-manager-authority",
    "product-owner-acceptance-authority", "ux-journey-authority", "architecture-authority",
    "governance-contract-authority", "ci-workflow-authority", "engineering-executor",
    "independent-reviewer", "independent-quality-authority", "application-security-authority",
    "financial-control-authority", "release-authority", "risk-acceptance-authority",
  ]);
  const agentIds = new Set();
  const agentById = new Map();
  const approvalOwners = new Map();

  for (const agent of agentRegistry.entries ?? []) {
    if (agentIds.has(agent.id)) violations.push({ file: agentRegistryRelative, line: 0, message: `DUPLICATE_AGENT_ID ${agent.id}` });
    agentIds.add(agent.id);
    agentById.set(agent.id, agent);
    if (!fs.existsSync(path.join(repoRoot, agent.primary_file))) violations.push({ file: agentRegistryRelative, line: 0, message: `AGENT_PRIMARY_FILE_MISSING ${agent.id}: ${agent.primary_file}` });
    if (agent.primary_file.startsWith(".agents/skills/")) {
      const skillId = agent.primary_file.split("/")[2];
      if (!activeSkillIds.has(skillId)) violations.push({ file: agentRegistryRelative, line: 0, message: `AGENT_PRIMARY_SKILL_NOT_ACTIVE_GOVERNED ${agent.id} -> ${skillId}` });
    }
    if (agent.may_final_approve_own_work) violations.push({ file: agentRegistryRelative, line: 0, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
    if (agent.kind === "adapter" && (agent.approval_domains?.length ?? 0) > 0) violations.push({ file: agentRegistryRelative, line: 0, message: `ADAPTER_MUST_NOT_OWN_APPROVAL ${agent.id}` });
    if ((agent.approval_domains?.length ?? 0) > 0 && agent.allowed_modes.includes("write")) violations.push({ file: agentRegistryRelative, line: 0, message: `APPROVAL_AUTHORITY_MUST_NOT_WRITE ${agent.id}` });
    for (const domain of agent.approval_domains ?? []) {
      if (approvalOwners.has(domain)) violations.push({ file: agentRegistryRelative, line: 0, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}: ${approvalOwners.get(domain)} and ${agent.id}` });
      approvalOwners.set(domain, agent.id);
    }
  }

  for (const role of requiredRoles) if (!agentIds.has(role)) violations.push({ file: agentRegistryRelative, line: 0, message: `MISSING_REQUIRED_LOGICAL_ROLE ${role}` });
  const productModelOwner = approvalOwners.get("product_model_approval");
  const productAcceptanceOwner = approvalOwners.get("product_acceptance");
  if (!productModelOwner || !productAcceptanceOwner || productModelOwner === productAcceptanceOwner) violations.push({ file: agentRegistryRelative, line: 0, message: "PRODUCT_MODEL_AND_PRODUCT_ACCEPTANCE_MUST_HAVE_SEPARATE_AUTHORITIES" });
  const governanceOwner = approvalOwners.get("governance_contract_approval");
  const ciOwner = approvalOwners.get("ci_workflow_approval");
  if (!governanceOwner || !ciOwner || governanceOwner === ciOwner) violations.push({ file: agentRegistryRelative, line: 0, message: "GOVERNANCE_AND_CI_APPROVAL_MUST_HAVE_SEPARATE_AUTHORITIES" });
  else if (agentById.get(governanceOwner)?.owner === agentById.get(ciOwner)?.owner) violations.push({ file: agentRegistryRelative, line: 0, message: "GOVERNANCE_AND_CI_APPROVAL_MUST_HAVE_SEPARATE_OWNERS" });
  if (!approvalOwners.get("implementation_review")) violations.push({ file: agentRegistryRelative, line: 0, message: "INDEPENDENT_IMPLEMENTATION_REVIEW_AUTHORITY_MISSING" });
  if (!approvalOwners.get("finance_approval")) violations.push({ file: agentRegistryRelative, line: 0, message: "FINANCIAL_CONTROL_AUTHORITY_MISSING" });
  if (!approvalOwners.get("residual_risk_acceptance")) violations.push({ file: agentRegistryRelative, line: 0, message: "RISK_ACCEPTANCE_AUTHORITY_MISSING" });

  const sdlcRolesRelative = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
  const sdlcRolesPath = path.join(repoRoot, sdlcRolesRelative);
  if (!fs.existsSync(sdlcRolesPath)) violations.push({ file: sdlcRolesRelative, line: 0, message: "SDLC_ROLES_FILE_MISSING" });
  else {
    const sdlcRoles = fs.readFileSync(sdlcRolesPath, "utf8");
    const roleMap = new Map([
      ["sdlc-program-authority", "sdlc_program_authority"],
      ["product-manager-authority", "product_manager_authority"],
      ["product-owner-acceptance-authority", "product_owner_acceptance_authority"],
      ["ux-journey-authority", "ux_journey_authority"],
      ["architecture-authority", "architecture_authority"],
      ["governance-contract-authority", "governance_contract_authority"],
      ["ci-workflow-authority", "ci_workflow_authority"],
      ["engineering-executor", "engineering"],
      ["independent-reviewer", "independent_reviewer"],
      ["independent-quality-authority", "independent_quality_authority"],
      ["application-security-authority", "application_security_authority"],
      ["financial-control-authority", "financial_control_authority"],
      ["release-authority", "release_authority"],
      ["risk-acceptance-authority", "risk_acceptance_authority"],
    ]);
    for (const [agentId, authorityId] of roleMap) if (agentIds.has(agentId) && !new RegExp(`^  ${authorityId}:\\s*$`, "m").test(sdlcRoles)) violations.push({ file: sdlcRolesRelative, line: 0, message: `AGENT_SDLC_AUTHORITY_DRIFT ${agentId} -> ${authorityId}` });
  }
}

const agentsMdPath = path.join(repoRoot, "AGENTS.md");
const geminiMdPath = path.join(repoRoot, "GEMINI.md");
if (fs.existsSync(agentsMdPath) && fs.existsSync(geminiMdPath)) {
  const agents = fs.readFileSync(agentsMdPath, "utf8");
  const gemini = fs.readFileSync(geminiMdPath, "utf8");
  if (!agents.includes("governance/authority/authority-precedence.json")) violations.push({ file: "AGENTS.md", line: 0, message: "AGENTS_MISSING_AUTHORITY_PRECEDENCE_REFERENCE" });
  if (!agents.includes("PRODUCT_MODEL") || agents.includes("PRODUCT_CAPABILITY")) violations.push({ file: "AGENTS.md", line: 0, message: "AGENTS_TASK_MODE_VOCABULARY_DRIFT" });
  if (!gemini.includes("AGENTS.md") || !gemini.includes("authority-precedence.json")) violations.push({ file: "GEMINI.md", line: 0, message: "GEMINI_ADAPTER_MISSING_HIGHER_AUTHORITY_REFERENCE" });
  if (/use Graphify first/i.test(gemini)) violations.push({ file: "GEMINI.md", line: 0, message: "GEMINI_GRAPHIFY_FIRST_CONTRADICTS_SCOPED_TOOL_LADDER" });
}

fail(guardId, violations);
