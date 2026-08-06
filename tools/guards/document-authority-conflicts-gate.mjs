
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "document-authority-conflicts-gate";
const violations = [];

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" });
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
}

function sectionIds(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const ids = new Set();
  let active = false;
  for (const line of lines) {
    if (line === `## ${heading}`) {
      active = true;
      continue;
    }
    if (active && line.startsWith("## ")) break;
    if (!active) continue;
    const match = line.match(/^- `([^`]+)`/);
    if (match) ids.add(match[1]);
  }
  return ids;
}

const registry = readJson("governance/skills/skills-registry.json");
const precedence = readJson("governance/authority/authority-precedence.json");
const catalogPath = path.join(repoRoot, ".agents/SKILL_CATALOG.md");
const catalog = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, "utf8") : "";

if (!catalog) {
  violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: "MISSING_REQUIRED_FILE" });
}

if (registry && catalog) {
  const expected = {
    active: new Set((registry.entries ?? []).filter((entry) => entry.status === "active").map((entry) => entry.id)),
    conditional: new Set((registry.entries ?? []).filter((entry) => entry.status === "conditional").map((entry) => entry.id)),
    retired: new Set((registry.entries ?? []).filter((entry) => entry.status === "retired").map((entry) => entry.id)),
  };
  const actual = {
    active: sectionIds(catalog, "Active skills"),
    conditional: sectionIds(catalog, "Conditional skills"),
    retired: sectionIds(catalog, "Retired entries"),
  };

  for (const status of Object.keys(expected)) {
    for (const id of expected[status]) {
      if (!actual[status].has(id)) {
        violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `CATALOG_MISSING ${status}:${id}` });
      }
    }
    for (const id of actual[status]) {
      if (!expected[status].has(id)) {
        violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: `CATALOG_EXTRA_OR_WRONG_STATUS ${status}:${id}` });
      }
    }
  }
}

if (precedence) {
  const seen = new Set();
  for (const document of precedence.documents ?? []) {
    if (seen.has(document.path)) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_DOCUMENT ${document.path}` });
    }
    seen.add(document.path);
  }

  const requiredClassifications = new Map([
    ["AGENTS.md", "ACTIVE_CANONICAL"],
    [".agents/skills", "OWNER_CONTRACT"],
    [".agents/tools", "ADAPTER"],
    ["CLAUDE.md", "ADAPTER"],
    ["GEMINI.md", "ADAPTER"],
    ["LEAN-CTX.md", "ADAPTER"],
    [".agents/INDEX.md", "DERIVED_SUPPORT"],
    [".agents/SKILL_CATALOG.md", "DERIVED_SUPPORT"],
    ["governance/tools/agent-tool-registry.json", "DERIVED_SUPPORT"],
  ]);
  const byPath = new Map((precedence.documents ?? []).map((entry) => [entry.path, entry]));
  for (const [file, classification] of requiredClassifications) {
    if (byPath.get(file)?.classification !== classification) {
      violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DOCUMENT_CLASSIFICATION_DRIFT ${file} expected=${classification}` });
    }
  }
}

fail(guardId, violations);
