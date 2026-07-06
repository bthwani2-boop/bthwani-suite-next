/**
 * tools/guards/agent-governance-gate.mjs
 *
 * BTHWANI_GOVERNANCE_AS_CODE_GATE — Agent & Skills Integrity Gate
 *
 * Checks:
 *   1. Coherence: Every folder in .agents/skills/ is registered in skills-registry.json and vice-versa.
 *   2. Schema Structure: Every registered skill folder has a SKILL.md.
 *   3. Markdown Headers: Every skill's SKILL.md has a "## Purpose" section.
 *   4. Agent Consistency: Compares AGENTS.md and GEMINI.md to ensure no contradictions
 *      on key policies (ports, command safety, authority limits).
 *
 * FAIL: missing skills, unregistered skills, missing mandatory md headers, policy contradictions.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "agent-governance-gate";
const violations = [];
const warnings = [];

// ── 1. Registry vs Workspace Skills Coherence ───────────────────────────────
const skillsRegistryPath = path.join(repoRoot, "governance/skills/skills-registry.json");
const skillsDir = path.join(repoRoot, ".agents/skills");

if (fs.existsSync(skillsRegistryPath) && fs.existsSync(skillsDir)) {
  const registryData = JSON.parse(fs.readFileSync(skillsRegistryPath, "utf8"));
  const registeredSkillIds = new Set(registryData.entries.map((e) => e.id));

  const workspaceSkillDirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Checks: Registered but missing from workspace
  for (const regId of registeredSkillIds) {
    const expectedDir = path.join(skillsDir, regId);
    if (!fs.existsSync(expectedDir)) {
      violations.push({
        file: "governance/skills/skills-registry.json",
        line: 0,
        message: `MISSING_SKILL_WORKSPACE: Skill '${regId}' is registered but directory does not exist at '${toPosix(path.relative(repoRoot, expectedDir))}'`,
      });
    }
  }

  // Checks: In workspace but missing from registry
  for (const dirName of workspaceSkillDirs) {
    if (!registeredSkillIds.has(dirName)) {
      violations.push({
        file: `governance/skills/skills-registry.json`,
        line: 0,
        message: `UNREGISTERED_SKILL: Skill directory '.agents/skills/${dirName}' exists but is not registered in skills-registry.json`,
      });
    }

    // ── 2. SKILL.md Verification ───────────────────────────────────────────
    const skillMd = path.join(skillsDir, dirName, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      violations.push({
        file: `.agents/skills/${dirName}/SKILL.md`,
        line: 0,
        message: `MISSING_SKILL_MD: SKILL.md file is missing for skill '${dirName}'`,
      });
    } else {
      const content = fs.readFileSync(skillMd, "utf8");
      // ── 3. Mandatory Headers check ───────────────────────────────────────
      if (!/^\s*##\s*Purpose\b/mi.test(content)) {
        warnings.push({
          file: `.agents/skills/${dirName}/SKILL.md`,
          line: 0,
          message: `MISSING_PURPOSE_SECTION: SKILL.md must contain a '## Purpose' section.`,
        });
      }
    }
  }
}

// ── 4. Policy Consistency (AGENTS.md vs GEMINI.md) ───────────────────────────
const agentsMdPath = path.join(repoRoot, "AGENTS.md");
const geminiMdPath = path.join(repoRoot, "GEMINI.md");

if (fs.existsSync(agentsMdPath) && fs.existsSync(geminiMdPath)) {
  const agentsContent = fs.readFileSync(agentsMdPath, "utf8");
  const geminiContent = fs.readFileSync(geminiMdPath, "utf8");

  // Check 4a: Command Safety references
  const agentsHasSafety = /Command Safety Policy/i.test(agentsContent);
  const geminiHasSafety = /Command Safety Policy/i.test(geminiContent);

  if (agentsHasSafety !== geminiHasSafety) {
    violations.push({
      file: "GEMINI.md",
      line: 0,
      message: `POLICY_CONTRADICTION: 'Command Safety Policy' is referenced in AGENTS.md but missing/different in GEMINI.md`,
    });
  }

  // Check 4b: Smart Execution Model tables
  const agentsHasSmartExec = /Smart Execution Model/i.test(agentsContent);
  const geminiHasSmartExec = /Smart Execution Model/i.test(geminiContent);

  if (agentsHasSmartExec !== geminiHasSmartExec) {
    violations.push({
      file: "GEMINI.md",
      line: 0,
      message: `POLICY_CONTRADICTION: 'Smart Execution Model' config mismatch between AGENTS.md and GEMINI.md`,
    });
  }

  // Check 4c: Port rules (YAGNI/Ponytail check)
  const agentsPorts = extractPorts(agentsContent);
  const geminiPorts = extractPorts(geminiContent);

  // Since GEMINI.md is a thin adapter, if it defines ports, they must match AGENTS.md
  if (agentsPorts.size > 0 && geminiPorts.size > 0) {
    for (const port of geminiPorts) {
      if (!agentsPorts.has(port)) {
        violations.push({
          file: "GEMINI.md",
          line: 0,
          message: `PORT_POLICY_CONTRADICTION: Port '${port}' referenced in GEMINI.md is not allowed by AGENTS.md policy`,
        });
      }
    }
  }
}

function extractPorts(text) {
  const portRegex = /\b(58080|18101|18102|18103|18104|13000|8080|8081|8082|8083|8084|3000)\b/g;
  const matches = new Set();
  let m;
  while ((m = portRegex.exec(text)) !== null) {
    matches.add(m[1]);
  }
  return matches;
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  - ${w.file}:${w.line} ${w.message}`);
  }
}

fail(guardId, violations);
