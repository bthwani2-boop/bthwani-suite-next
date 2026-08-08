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

function listTextFiles(relativeRoot) {
  if (!exists(relativeRoot)) return [];
  const files = [];
  const stack = [relativeRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(path.join(repoRoot, current), { withFileTypes: true })) {
      const relative = path.posix.join(current.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) stack.push(relative);
      else if (/\.(?:md|json|ya?ml|mjs|js|ts|tsx|ps1|sh)$/i.test(entry.name)) files.push(relative);
    }
  }
  return files.sort();
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
    ["governance/tools/agent-tool-registry.json", "ACTIVE_CANONICAL"],
    ["AGENTS.md", "ADAPTER"],
    ["CLAUDE.md", "ADAPTER"],
    ["GEMINI.md", "ADAPTER"],
    ["LEAN-CTX.md", "ADAPTER"],
    ["opencode.json", "ADAPTER"],
    [".agents/skills", "OWNER_CONTRACT"],
    [".agents/tools", "ADAPTER"],
    [".agents/INDEX.md", "DERIVED_SUPPORT"],
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
    "governance/commercialization",
    "governance/operational_journey_protocol_package",
    "governance/guards/registrations",
    "governance/github/repository-enforcement.json",
    "governance/github/full-verification-policy.json",
    "tools/plans",
    "tools/diagnose-implementing",
    "tools/important-scripts",
    "tools/contracts",
    "tools/rules",
    "tools/yagni",
  ]) {
    if (byPath.has(forbidden)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `RETIRED_PARALLEL_AUTHORITY_REGISTERED ${forbidden}` });
  }
}

const retiredReferences = [
  "governance/policies/product.md",
  "governance/policies/contracts.md",
  "governance/policies/data.md",
  "governance/policies/runtime.md",
  "governance/policies/release.md",
  "governance/policies/governance.rego",
  "governance/domains/",
  "governance/product/decisions/",
  "governance/commercialization/",
  "governance/operational_journey_protocol_package/",
  "governance/guards/registrations/",
  "governance/github/repository-enforcement.json",
  "governance/github/repository-enforcement.schema.json",
  "governance/github/full-verification-policy.json",
  "governance/github/remediation-branch-return-policy.json",
  "tools/important-scripts/",
  "tools/contracts/",
  "tools/rules/",
  "tools/plans/",
  "tools/diagnose-implementing/",
  "tools/implementing/",
  "tools/yagni/",
  "tools/toolchain/tool-activation-baseline.json",
  ".reviewdog.yml",
  ".agents/AUTHORITY_BOUNDARY.md",
  ".agents/COMMAND_SAFETY_POLICY.md",
  ".agents/EVIDENCE_GATE_ROUTER.md",
  ".agents/SKILL_CATALOG.md",
];

const executableReferenceExclusions = new Set([
  "tools/guards/governance-schema-gate.mjs",
  "tools/guards/agent-governance-gate.mjs",
  "tools/guards/document-authority-conflicts-gate.mjs",
  "tools/guards/canonical-paths-gate.mjs",
  "tools/guards/cleanup-policy-gate.mjs",
  "tools/guards/repository-structure-gate.mjs",
]);
const executableFiles = [
  ...listTextFiles("tools/guards"),
  ...listTextFiles("tools/scripts"),
].filter((relative) => !relative.endsWith(".test.mjs") && !executableReferenceExclusions.has(relative));

const scannedFiles = new Set([
  "AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json",
  ...listTextFiles(".agents"),
  ...listTextFiles(".github"),
  ...listTextFiles("docs"),
  ...listTextFiles("tools/prompting"),
  ...executableFiles,
]);
for (const relative of scannedFiles) {
  const content = read(relative);
  for (const retiredRef of retiredReferences) {
    if (content.includes(retiredRef)) violations.push({ file: relative, line: 0, message: `RETIRED_REFERENCE ${retiredRef}` });
  }
  if (relative.startsWith("docs/") && /^Status:\s*ACTIVE_CANONICAL\s*$/m.test(content)) {
    violations.push({ file: relative, line: 0, message: "DOCUMENTATION_MAY_NOT_DECLARE_ACTIVE_CANONICAL_AUTHORITY" });
  }
}

const privateIp = /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/g;
for (const relative of listTextFiles("docs/runtime")) {
  const content = read(relative);
  privateIp.lastIndex = 0;
  if (privateIp.test(content)) violations.push({ file: relative, line: 0, message: "MACHINE_SPECIFIC_PRIVATE_IP_IN_RUNTIME_DOCUMENTATION" });
}

const leanCtxForbidden = ["always active", "replaces native tools", "replaces native", "always enabled", "replaces tools"];
for (const relative of ["AGENTS.md", "LEAN-CTX.md", ".agents/tools/leanctx.md"]) {
  const content = read(relative).toLowerCase();
  for (const phrase of leanCtxForbidden) if (content.includes(phrase)) violations.push({ file: relative, line: 0, message: `CONTRADICTORY_STATEMENT leanctx_claims_unauthorized_authority: ${phrase}` });
}

fail(guardId, violations);
