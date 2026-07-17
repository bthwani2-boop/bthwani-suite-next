import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "agent-governance-gate";
const violations = [];

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

const skillsRegistry = readJson("governance/skills/skills-registry.json");
const agentRegistry = readJson("governance/agents/agent-registry.json");
const skillsDir = path.join(repoRoot, ".agents/skills");

if (skillsRegistry && fs.existsSync(skillsDir)) {
  const skillById = new Map();
  for (const skill of skillsRegistry.entries) {
    if (skillById.has(skill.id)) {
      violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `DUPLICATE_SKILL_ID ${skill.id}` });
    }
    skillById.set(skill.id, skill);

    const expectedPath = `.agents/skills/${skill.id}`;
    if (toPosix(skill.path) !== expectedPath) {
      violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `SKILL_PATH_MISMATCH ${skill.id}: ${skill.path}` });
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
    const frontmatterName = content.match(/^---[\s\S]*?\nname:\s*([^\n]+)[\s\S]*?---/m)?.[1]?.trim();
    const contractLevel = skill.contract_level ?? "legacy";

    if (contractLevel === "governed") {
      if (frontmatterName !== skill.id) {
        violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `FRONTMATTER_NAME_MISMATCH expected ${skill.id}, found ${frontmatterName ?? "none"}` });
      }
      for (const section of ["Purpose", "Invoke when", "Do not invoke when", "Authority boundary", "Required output"]) {
        if (!new RegExp(`^##\\s+${section}\\b`, "mi").test(content)) {
          violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `GOVERNED_SKILL_MISSING_SECTION ${section}` });
        }
      }
      if (!skill.version || !skill.output_contract || !(skill.invoke_when?.length) || !(skill.do_not_invoke_when?.length)) {
        violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `GOVERNED_SKILL_CONTRACT_INCOMPLETE ${skill.id}` });
      }
    } else {
      if (frontmatterName && frontmatterName !== skill.id) {
        violations.push({ file: `${skill.path}/SKILL.md`, line: 0, message: `LEGACY_FRONTMATTER_NAME_MISMATCH expected ${skill.id}, found ${frontmatterName}` });
      }
    }
  }

  const workspaceSkillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  for (const directory of workspaceSkillDirs) {
    if (!skillById.has(directory)) {
      violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `UNREGISTERED_SKILL ${directory}` });
    }
  }

  for (const skill of skillsRegistry.entries) {
    for (const dependency of skill.depends_on ?? []) {
      if (dependency === skill.id) {
        violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `SELF_DEPENDENCY ${skill.id}` });
      } else if (!skillById.has(dependency)) {
        violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `UNKNOWN_SKILL_DEPENDENCY ${skill.id} -> ${dependency}` });
      }
    }
    for (const conflict of skill.conflicts_with ?? []) {
      const target = skillById.get(conflict);
      if (!target) {
        violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `UNKNOWN_SKILL_CONFLICT ${skill.id} -> ${conflict}` });
      } else if (!(target.conflicts_with ?? []).includes(skill.id)) {
        violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `ASYMMETRIC_SKILL_CONFLICT ${skill.id} <-> ${conflict}` });
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(skillId, stack = []) {
    if (visiting.has(skillId)) {
      violations.push({ file: "governance/skills/skills-registry.json", line: 0, message: `SKILL_DEPENDENCY_CYCLE ${[...stack, skillId].join(" -> ")}` });
      return;
    }
    if (visited.has(skillId)) return;
    visiting.add(skillId);
    for (const dependency of skillById.get(skillId)?.depends_on ?? []) visit(dependency, [...stack, skillId]);
    visiting.delete(skillId);
    visited.add(skillId);
  }
  for (const skillId of skillById.keys()) visit(skillId);
}

if (agentRegistry) {
  const requiredRoles = new Set([
    "master-advisory-supervisor",
    "product-manager-authority",
    "product-owner-acceptance-authority",
    "ux-journey-authority",
    "architecture-authority",
    "engineering-executor",
    "independent-quality-authority",
    "application-security-authority",
    "release-authority",
    "independent-reviewer"
  ]);
  const agentIds = new Set();
  const approvalOwners = new Map();

  for (const agent of agentRegistry.entries) {
    if (agentIds.has(agent.id)) {
      violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `DUPLICATE_AGENT_ID ${agent.id}` });
    }
    agentIds.add(agent.id);
    if (!fs.existsSync(path.join(repoRoot, agent.primary_file))) {
      violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `AGENT_PRIMARY_FILE_MISSING ${agent.id}: ${agent.primary_file}` });
    }
    if (agent.may_final_approve_own_work) {
      violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
    }
    if (agent.kind === "adapter" && (agent.approval_domains?.length ?? 0) > 0) {
      violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `ADAPTER_MUST_NOT_OWN_APPROVAL ${agent.id}` });
    }
    for (const domain of agent.approval_domains ?? []) {
      if (approvalOwners.has(domain)) {
        violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}: ${approvalOwners.get(domain)} and ${agent.id}` });
      }
      approvalOwners.set(domain, agent.id);
    }
  }
  for (const role of requiredRoles) {
    if (!agentIds.has(role)) {
      violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: `MISSING_REQUIRED_LOGICAL_ROLE ${role}` });
    }
  }
  if (approvalOwners.get("product_model_approval") === approvalOwners.get("product_acceptance")) {
    violations.push({ file: "governance/agents/agent-registry.json", line: 0, message: "PRODUCT_MODEL_AND_PRODUCT_ACCEPTANCE_MUST_HAVE_SEPARATE_AUTHORITIES" });
  }
}

const agentsMdPath = path.join(repoRoot, "AGENTS.md");
const geminiMdPath = path.join(repoRoot, "GEMINI.md");
if (fs.existsSync(agentsMdPath) && fs.existsSync(geminiMdPath)) {
  const agents = fs.readFileSync(agentsMdPath, "utf8");
  const gemini = fs.readFileSync(geminiMdPath, "utf8");
  if (!agents.includes("governance/authority/authority-precedence.json")) {
    violations.push({ file: "AGENTS.md", line: 0, message: "AGENTS_MISSING_AUTHORITY_PRECEDENCE_REFERENCE" });
  }
  if (!gemini.includes("AGENTS.md") || !gemini.includes("authority-precedence.json")) {
    violations.push({ file: "GEMINI.md", line: 0, message: "GEMINI_ADAPTER_MISSING_HIGHER_AUTHORITY_REFERENCE" });
  }
  if (/use Graphify first/i.test(gemini)) {
    violations.push({ file: "GEMINI.md", line: 0, message: "GEMINI_GRAPHIFY_FIRST_CONTRADICTS_SCOPED_TOOL_LADDER" });
  }
}

fail(guardId, violations);
