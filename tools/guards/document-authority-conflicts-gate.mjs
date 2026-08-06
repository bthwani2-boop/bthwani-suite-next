
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
const tools = readJson("governance/tools/agent-tool-registry.json");
const precedence = readJson("governance/authority/authority-precedence.json");
const catalogPath = path.join(repoRoot, ".agents/SKILL_CATALOG.md");
const catalog = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, "utf8") : "";
const indexPath = path.join(repoRoot, ".agents/INDEX.md");
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";

if (!catalog) {
  violations.push({ file: ".agents/SKILL_CATALOG.md", line: 0, message: "MISSING_REQUIRED_FILE" });
}
if (!index) {
  violations.push({ file: ".agents/INDEX.md", line: 0, message: "MISSING_REQUIRED_FILE" });
}

if (registry && tools && catalog && index) {
  const expected = {
    active: new Set((registry.entries ?? []).filter((entry) => entry.status === "active").map((entry) => entry.id)),
    conditional: new Set((registry.entries ?? []).filter((entry) => entry.status === "conditional").map((entry) => entry.id)),
    retired: new Set((registry.entries ?? []).filter((entry) => entry.status === "retired").map((entry) => entry.id)),
    tools: new Set((tools.entries ?? []).map((entry) => entry.id)),
  };
  const actualCatalog = {
    active: sectionIds(catalog, "Active skills"),
    conditional: sectionIds(catalog, "Conditional skills"),
    retired: sectionIds(catalog, "Retired entries"),
    tools: sectionIds(catalog, "Conditional tools"),
  };
  const actualIndex = {
    active: sectionIds(index, "Active skill"),
    conditional: sectionIds(index, "Conditional skills"),
    tools: sectionIds(index, "Conditional tools"),
  };

  const checkDrift = (file, expectedMap, actualMap) => {
    for (const status of Object.keys(actualMap)) {
      for (const id of expectedMap[status]) {
        if (!actualMap[status].has(id)) {
          violations.push({ file, line: 0, message: `CATALOG_MISSING ${status}:${id}` });
        }
      }
      for (const id of actualMap[status]) {
        if (!expectedMap[status].has(id)) {
          violations.push({ file, line: 0, message: `CATALOG_EXTRA_OR_WRONG_STATUS ${status}:${id}` });
        }
      }
    }
  };

  checkDrift(".agents/SKILL_CATALOG.md", expected, actualCatalog);
  checkDrift(".agents/INDEX.md", expected, actualIndex);
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
    [".github/copilot-instructions.md", "ADAPTER"],
    ["opencode.json", "ADAPTER"],
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

// LeanCTX text conflict checks
const leanCtxForbiddenPhrases = [
  "always active",
  "replaces native tools",
  "replaces native",
  "always enabled",
  "replaces tools"
];

function checkForbiddenPhrases(filePath, content) {
  const lowerContent = content.toLowerCase();
  for (const phrase of leanCtxForbiddenPhrases) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      violations.push({ file: filePath, line: 0, message: `CONTRADICTORY_STATEMENT leanctx_claims_unauthorized_authority: "${phrase}" found in ${filePath}` });
    }
  }
}

const agentsMdPath = path.join(repoRoot, "AGENTS.md");
if (fs.existsSync(agentsMdPath)) checkForbiddenPhrases("AGENTS.md", fs.readFileSync(agentsMdPath, "utf8"));

const leanCtxMdPath = path.join(repoRoot, "LEAN-CTX.md");
if (fs.existsSync(leanCtxMdPath)) checkForbiddenPhrases("LEAN-CTX.md", fs.readFileSync(leanCtxMdPath, "utf8"));

const leanCtxPolicyPath = path.join(repoRoot, ".agents/tools/leanctx.md");
if (fs.existsSync(leanCtxPolicyPath)) checkForbiddenPhrases(".agents/tools/leanctx.md", fs.readFileSync(leanCtxPolicyPath, "utf8"));


fail(guardId, violations);
