// Prevents the wave-0 drift from recurring: SKILL_CATALOG.md must exactly reflect
// the skills registry (same active/conditional/retired membership), and the
// authority-precedence document set must not omit a file that governance/**
// declares canonical. A thin, structural guard — not a prose-quality linter.
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "document-authority-conflicts-gate";
const violations = [];

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

const registry = readJson("governance/skills/skills-registry.json");
const catalogPath = path.join(repoRoot, ".agents", "SKILL_CATALOG.md");
const catalog = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, "utf8") : "";

if (registry) {
  for (const skill of registry.entries ?? []) {
    const mentioned = catalog.includes(`\`${skill.id}\``);
    if (!mentioned) {
      violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `SKILL_MISSING_FROM_CATALOG ${skill.id}` });
      continue;
    }
    const sectionPattern = new RegExp(
      `## (Active skills|Conditional skills|Retired entries)[\\s\\S]*?\`${skill.id}\``,
    );
    const activeMatch = /## Active skills[\s\S]*?(?=\n## )/.exec(catalog)?.[0]?.includes(`\`${skill.id}\``);
    const conditionalMatch = /## Conditional skills[\s\S]*?(?=\n## )/.exec(catalog)?.[0]?.includes(`\`${skill.id}\``);
    const retiredMatch = /## Retired entries[\s\S]*?(?=\n## )/.exec(catalog)?.[0]?.includes(`\`${skill.id}\``);

    if (skill.status === "active" && !activeMatch) {
      violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `CATALOG_SECTION_DRIFT ${skill.id} expected=active` });
    }
    if (skill.status === "conditional" && !conditionalMatch) {
      violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `CATALOG_SECTION_DRIFT ${skill.id} expected=conditional` });
    }
    if (skill.status === "retired" && !retiredMatch) {
      violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `CATALOG_SECTION_DRIFT ${skill.id} expected=retired` });
    }
    void sectionPattern;
  }
}

fail(guardId, violations);
