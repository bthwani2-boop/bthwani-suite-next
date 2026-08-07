import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "document-authority-conflicts-gate";
const violations = [];

const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));
const read = (relative) => exists(relative) ? fs.readFileSync(path.join(repoRoot, relative), "utf8") : "";

function readJson(relative) {
  if (!exists(relative)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" });
    return null;
  }
  try { return JSON.parse(read(relative)); }
  catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
}

function sectionIds(markdown, heading) {
  const ids = new Set();
  let active = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (line === `## ${heading}`) { active = true; continue; }
    if (active && line.startsWith("## ")) break;
    if (!active) continue;
    const match = line.match(/^- `([^`]+)`/);
    if (match) ids.add(match[1]);
  }
  return ids;
}

const skills = readJson("governance/skills/skills-registry.json");
const tools = readJson("governance/tools/agent-tool-registry.json");
const authority = readJson("governance/authority/authority-precedence.json");
const index = read(".agents/INDEX.md");

if (!index) violations.push({ file: ".agents/INDEX.md", line: 0, message: "MISSING_REQUIRED_ROUTING_INDEX" });

if (skills && tools && index) {
  const expected = {
    active: new Set((skills.entries ?? []).filter((entry) => entry.status === "active").map((entry) => entry.id)),
    conditional: new Set((skills.entries ?? []).filter((entry) => entry.status === "conditional").map((entry) => entry.id)),
    tools: new Set((tools.entries ?? []).map((entry) => entry.id)),
  };
  const actual = {
    active: sectionIds(index, "Active skill"),
    conditional: sectionIds(index, "Conditional skills"),
    tools: sectionIds(index, "Conditional tools"),
  };

  for (const group of Object.keys(expected)) {
    for (const id of expected[group]) if (!actual[group].has(id)) violations.push({ file: ".agents/INDEX.md", line: 0, message: `ROUTING_INDEX_MISSING ${group}:${id}` });
    for (const id of actual[group]) if (!expected[group].has(id)) violations.push({ file: ".agents/INDEX.md", line: 0, message: `ROUTING_INDEX_EXTRA_OR_WRONG_STATUS ${group}:${id}` });
  }
}

if (authority) {
  const byPath = new Map();
  for (const document of authority.documents ?? []) {
    if (byPath.has(document.path)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_DOCUMENT ${document.path}` });
    byPath.set(document.path, document);
  }

  const expected = new Map([
    ["governance/GOVERNANCE.md", "ACTIVE_CANONICAL"],
    ["governance/product/PRD.md", "ACTIVE_CANONICAL"],
    ["governance/policies/engineering.md", "ACTIVE_CANONICAL"],
    ["governance/policies/security.md", "ACTIVE_CANONICAL"],
    ["governance/policies/delivery.md", "ACTIVE_CANONICAL"],
    ["AGENTS.md", "ADAPTER"],
    ["CLAUDE.md", "ADAPTER"],
    ["GEMINI.md", "ADAPTER"],
    ["LEAN-CTX.md", "ADAPTER"],
    ["opencode.json", "ADAPTER"],
    [".agents/skills", "OWNER_CONTRACT"],
    [".agents/tools", "ADAPTER"],
    [".agents/INDEX.md", "DERIVED_SUPPORT"],
    ["governance/tools/agent-tool-registry.json", "DERIVED_SUPPORT"],
  ]);
  for (const [relative, classification] of expected) {
    if (byPath.get(relative)?.classification !== classification) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DOCUMENT_CLASSIFICATION_DRIFT ${relative} expected=${classification}` });
  }

  for (const forbidden of [
    ".agents/AUTHORITY_BOUNDARY.md",
    ".agents/COMMAND_SAFETY_POLICY.md",
    ".agents/EVIDENCE_GATE_ROUTER.md",
    ".agents/SKILL_CATALOG.md",
    ".agents/UPDATE_POLICY.md",
    "governance/domains",
    "governance/product/decisions",
    "tools/plans",
    "tools/diagnose-implementing",
  ]) {
    if (byPath.has(forbidden)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `RETIRED_PARALLEL_AUTHORITY_REGISTERED ${forbidden}` });
  }
}

const leanCtxForbidden = ["always active", "replaces native tools", "replaces native", "always enabled", "replaces tools"];
for (const relative of ["AGENTS.md", "LEAN-CTX.md", ".agents/tools/leanctx.md"]) {
  const content = read(relative).toLowerCase();
  for (const phrase of leanCtxForbidden) if (content.includes(phrase)) violations.push({ file: relative, line: 0, message: `CONTRADICTORY_STATEMENT leanctx_claims_unauthorized_authority: ${phrase}` });
}

fail(guardId, violations);
