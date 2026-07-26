// Parses the JRN-* journey registry (governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md)
// to seed product-model-node candidates, feeding governance/remediation/capability-graph.json
// population (wave P1-A). Extracts, per journey: id, title, owning domain(s), the
// registry's own decision status, and candidate surfaces (from each journey's own
// "الأسطح المرشحة" line). This is a real, mechanical parse of the registry's own text,
// not a fabricated or inferred chain: deeper links (actor/step/state/action/controller/
// api_operation/domain_command/repository/database_effect/event_outbox/readback_surface/
// error_behavior) are NOT claimed here because they require per-journey code inspection
// beyond this registry document. Read-only.
import { repoRoot, writeInventory, readJson } from "../_remediation-utils.mjs";
import fs from "node:fs";
import path from "node:path";

const registryPath = "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md";
const full = path.join(repoRoot, registryPath);
const content = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";

const KNOWN_SURFACES = new Set([
  "app-client", "app-partner", "app-captain", "app-field", "control-panel",
  "dsh-backend", "wlt-backend", "identity", "workforce", "platform-control",
  "providers", "database", "runtime", "infrastructure", "observability",
]);

// Idioms the registry uses in place of an explicit backtick list of surfaces.
const SURFACE_IDIOMS = [
  { pattern: /جميع الأسطح ذات تسجيل الدخول/, surfaces: ["app-client", "app-partner", "app-captain", "app-field", "control-panel"] },
  { pattern: /التطبيقات الأربعة/, surfaces: ["app-client", "app-partner", "app-captain", "app-field"] },
];

function parseIndexTable(markdown) {
  const index = new Map();
  const tableMatch = markdown.match(/## فهرس الرحلات\n\n([\s\S]*?)\n\n##/);
  if (!tableMatch) return index;
  const rows = tableMatch[1].split("\n").filter((line) => /^\|\s*JRN-\d{3}\s*\|/.test(line));
  for (const row of rows) {
    const cells = row.split("|").map((cell) => cell.trim()).filter((cell, idx, arr) => !(idx === 0 && cell === "") && !(idx === arr.length - 1 && cell === ""));
    const [journeyId, title, owner, decision] = cells;
    if (journeyId) index.set(journeyId, { title, owner, decision });
  }
  return index;
}

function parseJourneySections(markdown) {
  const sections = new Map();
  const headingRegex = /^### (JRN-\d{3}) — (.+)$/gm;
  const matches = [...markdown.matchAll(headingRegex)];
  for (let i = 0; i < matches.length; i += 1) {
    const [, journeyId, title] = matches[i];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
    const body = markdown.slice(start, end);
    sections.set(journeyId, { title, body });
  }
  return sections;
}

function extractSurfaces(body) {
  const line = body.split("\n").find((l) => l.includes("الأسطح المرشحة"));
  if (!line) return [];
  const surfaces = new Set();
  for (const match of line.matchAll(/`([a-z-]+)`/g)) {
    if (KNOWN_SURFACES.has(match[1])) surfaces.add(match[1]);
  }
  for (const idiom of SURFACE_IDIOMS) {
    if (idiom.pattern.test(line)) for (const surface of idiom.surfaces) surfaces.add(surface);
  }
  return [...surfaces];
}

const indexTable = parseIndexTable(content);
const sections = parseJourneySections(content);
const journeyIds = [...new Set([...indexTable.keys(), ...sections.keys()])].sort((a, b) => a.localeCompare(b));

const graph = readJson("governance/remediation/capability-graph.json");

const items = journeyIds.map((journeyId) => {
  const indexed = indexTable.get(journeyId);
  const section = sections.get(journeyId);
  const surfaces = section ? extractSurfaces(section.body) : [];
  return {
    journeyId,
    title: indexed?.title ?? section?.title ?? null,
    owner: indexed?.owner ?? null,
    decision: indexed?.decision ?? null,
    surfaces,
    registryPopulated: Boolean(indexed && section),
    fullChainPopulated: false,
  };
});

writeInventory("capabilities", {
  generatedAt: new Date().toISOString(),
  sourceRegistry: registryPath,
  chain: graph?.chain ?? [],
  journeyCount: items.length,
  items,
});
