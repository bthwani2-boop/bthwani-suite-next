import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "agent-governance-gate";
const violations = [];
const readJson = (relative) => {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_REGISTRY" });
    return null;
  }
  try { return JSON.parse(fs.readFileSync(full, "utf8")); }
  catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
};
const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));
const read = (relative) => exists(relative) ? fs.readFileSync(path.join(repoRoot, relative), "utf8") : "";
const frontmatter = (content, key) =>
  content.match(/^---\s*\n([\s\S]*?)\n---/m)?.[1]
    ?.match(new RegExp(`^${key}:\\s*([^\\n]+)$`, "m"))?.[1]?.trim();
const requiredSections = ["Purpose", "Invoke when", "Do not invoke when", "Authority boundary", "Required output"];

const skillsFile = "governance/skills/skills-registry.json";
const toolsFile = "governance/tools/agent-tool-registry.json";
const agentsFile = "governance/agents/agent-registry.json";
const decisionsFile = "governance/contracts/decision-vocabulary.json";
const indexFile = ".agents/INDEX.md";
const skills = readJson(skillsFile);
const tools = readJson(toolsFile);
const agents = readJson(agentsFile);
const decisions = readJson(decisionsFile);
const index = read(indexFile);
const canonicalDecisions = new Set((decisions?.canonicalDecisions ?? []).map((entry) => entry.id));
const deprecatedDecisions = new Set((decisions?.aliases ?? []).filter((entry) => entry.deprecated).map((entry) => entry.alias));
const bySkill = new Map();
const routable = new Set();

if (skills) {
  for (const skill of skills.entries ?? []) {
    if (bySkill.has(skill.id)) violations.push({ file: skillsFile, line: 0, message: `DUPLICATE_SKILL_ID ${skill.id}` });
    bySkill.set(skill.id, skill);
    const expected = `.agents/skills/${skill.id}`;
    if (toPosix(skill.path) !== expected) violations.push({ file: skillsFile, line: 0, message: `SKILL_PATH_MISMATCH ${skill.id}` });

    const live = ["active", "conditional"].includes(skill.status);
    const skillMd = `${expected}/SKILL.md`;
    if (live) {
      routable.add(skill.id);
      if (skill.contract_level !== "governed") violations.push({ file: skillsFile, line: 0, message: `ROUTABLE_SKILL_NOT_GOVERNED ${skill.id}` });
      if (!exists(skillMd)) {
        violations.push({ file: skillMd, line: 0, message: `MISSING_SKILL_MD ${skill.id}` });
        continue;
      }
      const content = read(skillMd);
      if (frontmatter(content, "name") !== skill.id) violations.push({ file: skillMd, line: 0, message: `SKILL_NAME_DRIFT ${skill.id}` });
      if (frontmatter(content, "version") !== skill.version) violations.push({ file: skillMd, line: 0, message: `SKILL_VERSION_DRIFT ${skill.id}` });
      for (const section of requiredSections) {
        if (!new RegExp(`^##\\s+${section}\\b`, "mi").test(content)) violations.push({ file: skillMd, line: 0, message: `SKILL_MISSING_SECTION ${skill.id}:${section}` });
      }
      if (!index.includes(`\`${skill.id}\``)) violations.push({ file: indexFile, line: 0, message: `ROUTABLE_SKILL_MISSING_FROM_INDEX ${skill.id}` });
      for (const token of [...content.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1])) {
        if ((token === "PASS" || token.endsWith("_REQUIRED") || canonicalDecisions.has(token) || deprecatedDecisions.has(token)) &&
            (!canonicalDecisions.has(token) || deprecatedDecisions.has(token))) {
          violations.push({ file: skillMd, line: 0, message: `NONCANONICAL_DECISION ${skill.id}:${token}` });
        }
      }
    } else if (skill.status === "retired") {
      if (exists(expected)) violations.push({ file: expected, line: 0, message: `RETIRED_SKILL_DIRECTORY_PRESENT ${skill.id}` });
      if ((skill.authority?.length ?? 0) || (skill.depends_on?.length ?? 0)) violations.push({ file: skillsFile, line: 0, message: `RETIRED_SKILL_OWNS_LIVE_CONTRACT ${skill.id}` });
      if (!skill.retirement_reason) violations.push({ file: skillsFile, line: 0, message: `RETIRED_SKILL_REASON_MISSING ${skill.id}` });
    } else {
      violations.push({ file: skillsFile, line: 0, message: `UNKNOWN_SKILL_STATUS ${skill.id}` });
    }
  }

  const skillsDir = path.join(repoRoot, ".agents/skills");
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const registered = bySkill.get(entry.name);
      if (!registered) violations.push({ file: skillsFile, line: 0, message: `UNREGISTERED_SKILL ${entry.name}` });
      else if (registered.status === "retired") violations.push({ file: `${registered.path}/SKILL.md`, line: 0, message: `RETIRED_SKILL_DISCOVERABLE ${entry.name}` });
    }
  }

  for (const skill of skills.entries ?? []) {
    for (const dependency of skill.depends_on ?? []) {
      if (!routable.has(dependency)) violations.push({ file: skillsFile, line: 0, message: `INVALID_SKILL_DEPENDENCY ${skill.id}->${dependency}` });
    }
    for (const conflict of skill.conflicts_with ?? []) {
      if (!(bySkill.get(conflict)?.conflicts_with ?? []).includes(skill.id)) violations.push({ file: skillsFile, line: 0, message: `ASYMMETRIC_SKILL_CONFLICT ${skill.id}<->${conflict}` });
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id, stack = []) => {
    if (visiting.has(id)) {
      violations.push({ file: skillsFile, line: 0, message: `SKILL_DEPENDENCY_CYCLE ${[...stack, id].join("->")}` });
      return;
    }
    if (visited.has(id) || !routable.has(id)) return;
    visiting.add(id);
    for (const dependency of bySkill.get(id)?.depends_on ?? []) visit(dependency, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of routable) visit(id);
}

if (tools) {
  const ids = new Set();
  const policies = new Set();
  for (const tool of tools.entries ?? []) {
    if (ids.has(tool.id)) violations.push({ file: toolsFile, line: 0, message: `DUPLICATE_TOOL_ID ${tool.id}` });
    ids.add(tool.id);
    if (tool.status !== "conditional") violations.push({ file: toolsFile, line: 0, message: `TOOL_NOT_CONDITIONAL ${tool.id}` });
    if ((tool.authority?.length ?? 0) > 0) violations.push({ file: toolsFile, line: 0, message: `TOOL_OWNS_AUTHORITY ${tool.id}` });
    if (!tool.policy_path?.startsWith(".agents/tools/") || !exists(tool.policy_path)) violations.push({ file: toolsFile, line: 0, message: `TOOL_POLICY_INVALID ${tool.id}` });
    if (policies.has(tool.policy_path)) violations.push({ file: toolsFile, line: 0, message: `DUPLICATE_TOOL_POLICY ${tool.policy_path}` });
    policies.add(tool.policy_path);
    if (!exists(tool.command_script)) violations.push({ file: toolsFile, line: 0, message: `TOOL_COMMAND_MISSING ${tool.id}` });
    if (exists(`.agents/skills/${tool.id}`)) violations.push({ file: `.agents/skills/${tool.id}`, line: 0, message: `TOOL_DISCOVERABLE_AS_SKILL ${tool.id}` });
  }
}

if (agents) {
  const ids = new Set();
  const approvals = new Map();
  for (const agent of agents.entries ?? []) {
    if (ids.has(agent.id)) violations.push({ file: agentsFile, line: 0, message: `DUPLICATE_AGENT_ID ${agent.id}` });
    ids.add(agent.id);
    if (!exists(agent.primary_file)) violations.push({ file: agentsFile, line: 0, message: `AGENT_PRIMARY_FILE_MISSING ${agent.id}` });
    if (agent.primary_file?.startsWith(".agents/skills/")) {
      const skillId = agent.primary_file.split("/")[2];
      if (!routable.has(skillId)) violations.push({ file: agentsFile, line: 0, message: `AGENT_PRIMARY_SKILL_NOT_ROUTABLE ${agent.id}->${skillId}` });
    }
    if (agent.may_final_approve_own_work) violations.push({ file: agentsFile, line: 0, message: `SELF_APPROVAL_FORBIDDEN ${agent.id}` });
    if (agent.kind === "adapter" && (agent.approval_domains?.length ?? 0)) violations.push({ file: agentsFile, line: 0, message: `ADAPTER_OWNS_APPROVAL ${agent.id}` });
    for (const domain of agent.approval_domains ?? []) {
      if (approvals.has(domain)) violations.push({ file: agentsFile, line: 0, message: `DUPLICATE_APPROVAL_AUTHORITY ${domain}` });
      approvals.set(domain, agent.id);
    }
  }
  for (const domain of ["implementation_review", "finance_approval", "residual_risk_acceptance"]) {
    if (!approvals.has(domain)) violations.push({ file: agentsFile, line: 0, message: `REQUIRED_APPROVAL_AUTHORITY_MISSING ${domain}` });
  }
}

for (const forbidden of [".agents/adapters", ".agents/hooks"]) {
  if (exists(forbidden)) violations.push({ file: forbidden, line: 0, message: "PARALLEL_OR_AUTOMATIC_POLICY_LAYER_PRESENT" });
}

const adapterRules = [
  ["CLAUDE.md", "authority-precedence.json"],
  ["GEMINI.md", "authority-precedence.json"],
  ["LEAN-CTX.md", ".agents/tools/leanctx.md"],
];
for (const [file, marker] of adapterRules) {
  const content = read(file);
  if (!content.includes("AGENTS.md") || !content.includes(marker)) violations.push({ file, line: 0, message: "THIN_ADAPTER_MISSING_AUTHORITY_POINTER" });
  if (content.length > 1800) violations.push({ file, line: 0, message: "ADAPTER_TOO_LARGE" });
}

const scanFiles = [
  "AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md",
  ".agents/AUTHORITY_BOUNDARY.md", ".agents/AGENT_SYSTEM_UPDATE_POLICY.md",
  ".agents/INDEX.md", ".agents/SKILL_CATALOG.md",
  "governance/tools/agent-tool-registry.json",
];
for (const file of scanFiles) {
  const content = read(file);
  if (/[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/]/i.test(content) || /\/home\/[^/\s]+\/|\/Users\/[^/\s]+\//.test(content)) {
    violations.push({ file, line: 0, message: "MACHINE_SPECIFIC_ABSOLUTE_PATH" });
  }
}
const trackedSensitiveRoots = [".agents", "governance/tools"];
for (const root of trackedSensitiveRoots) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) continue;
  const stack = [full];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(target);
      else if (/(\.bak|\.graphify-bak)$/i.test(entry.name)) violations.push({ file: toPosix(path.relative(repoRoot, target)), line: 0, message: "BACKUP_FILE_TRACKED" });
    }
  }
}

const agentsMd = read("AGENTS.md");
if (!agentsMd.includes("governance/tools/agent-tool-registry.json")) violations.push({ file: "AGENTS.md", line: 0, message: "AGENTS_MISSING_TOOL_REGISTRY" });
if (!agentsMd.includes("Implementation truth") || !agentsMd.includes("Authority truth")) violations.push({ file: "AGENTS.md", line: 0, message: "AGENTS_TRUTH_DOMAINS_NOT_SEPARATED" });
if (/use Graphify first/i.test(read("GEMINI.md"))) violations.push({ file: "GEMINI.md", line: 0, message: "GEMINI_GRAPHIFY_FIRST" });

fail(guardId, violations);
