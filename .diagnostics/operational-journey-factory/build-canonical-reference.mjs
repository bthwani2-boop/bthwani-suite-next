import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repo = process.cwd();
const head = process.env.BTHWANI_HEAD_SHA;
const branch = process.env.BTHWANI_BRANCH;
const referenceRoot = process.env.BTHWANI_REFERENCE_ROOT;
const applyCleanup = process.env.BTHWANI_APPLY_CLEANUP === "1";
const allowToolWarnings = process.env.BTHWANI_ALLOW_TOOL_WARNINGS === "1";

if (!head || !branch || !referenceRoot) {
  throw new Error("Missing BTHWANI_HEAD_SHA, BTHWANI_BRANCH, or BTHWANI_REFERENCE_ROOT.");
}

const diagnosticsRoot = ".diagnostics";
const factoryRoot = ".diagnostics/operational-journey-factory";

const coreFiles = [
  "toolchain-inventory.json",
  "toolchain-inventory.md",
  "surface-inventory.json",
  "surface-inventory.md",
  "journey-inventory.json",
  "journey-inventory.md",
  "gap-ledger.json",
  "gap-ledger.md"
].map(name => `${factoryRoot}/${name}`);

const rawAllowedToRemain = new Set([
  `${factoryRoot}/toolchain-inventory.json`,
  `${factoryRoot}/toolchain-inventory.md`,
  `${factoryRoot}/surface-inventory.json`,
  `${factoryRoot}/surface-inventory.md`,
  `${factoryRoot}/journey-inventory.json`,
  `${factoryRoot}/journey-inventory.md`,
  `${factoryRoot}/gap-ledger.json`,
  `${factoryRoot}/gap-ledger.md`
]);

function norm(p) {
  return String(p || "").replaceAll("\\", "/");
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function sha256(file) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

function relFromRepo(file) {
  return norm(path.relative(repo, path.resolve(file)));
}

function listAllFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listAllFiles(p));
    else out.push(norm(p));
  }
  return out;
}

function copyFileTo(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function cell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replaceAll("|", "\\|").trim();
}

function code(value) {
  return "`" + cell(value) + "`";
}

const blockers = [];
const warnings = [];

for (const f of coreFiles) {
  if (!fs.existsSync(f)) blockers.push(`Missing core inventory file: ${f}`);
}

const parsedCore = {};
for (const f of coreFiles.filter(f => f.endsWith(".json") && fs.existsSync(f))) {
  parsedCore[f] = readJson(f);
  if (parsedCore[f].head_sha !== head) {
    blockers.push(`Stale or mismatched head_sha in ${f}: expected ${head}, got ${parsedCore[f].head_sha}`);
  }
}

const commandResultsPath = path.join(referenceRoot, "command-results.json");
const commandResults = fs.existsSync(commandResultsPath) ? readJson(commandResultsPath) : [];
for (const r of commandResults) {
  if (r && typeof r === "object") {
    if (r.required && r.exit_code !== 0) blockers.push(`Required command failed: ${r.name}`);
    if (!r.required && r.exit_code !== 0) warnings.push(`Optional evidence command failed: ${r.name}`);
  }
}
if (!allowToolWarnings) {
  for (const w of warnings) blockers.push(w);
}

const inventoriesDir = path.join(referenceRoot, "inventories");
mkdirp(inventoriesDir);

const coreManifest = [];
for (const src of coreFiles) {
  if (!fs.existsSync(src)) continue;
  const dst = path.join(inventoriesDir, path.basename(src));
  copyFileTo(src, dst);
  coreManifest.push({
    source_path: src,
    reference_path: relFromRepo(dst),
    sha256: sha256(src),
    size_bytes: fs.statSync(src).size
  });
}

const gapLedger = parsedCore[`${factoryRoot}/gap-ledger.json`] || { gaps: [] };
const surfaceInventory = parsedCore[`${factoryRoot}/surface-inventory.json`] || {};
const journeyInventory = parsedCore[`${factoryRoot}/journey-inventory.json`] || {};
const toolchainInventory = parsedCore[`${factoryRoot}/toolchain-inventory.json`] || {};

const surfaceKeys = [
  "screens",
  "pages",
  "route_bindings",
  "navigation_bindings",
  "shared_imports",
  "direct_api_signs",
  "process_env_usage",
  "local_business_logic_candidates"
];

const numericTruth = {
  head_sha: head,
  branch,
  gap_count: Array.isArray(gapLedger.gaps) ? gapLedger.gaps.length : 0,
  blocking_gap_count: Array.isArray(gapLedger.gaps) ? gapLedger.gaps.filter(g => g.blocks_journey_start === true).length : 0,
  toolchain_tool_count: Array.isArray(toolchainInventory.tools) ? toolchainInventory.tools.length : 0,
  unused_script_count: Array.isArray(toolchainInventory.unused_scripts) ? toolchainInventory.unused_scripts.length : 0,
  surface_inventory_item_count: surfaceKeys.reduce((acc, k) => acc + (Array.isArray(surfaceInventory[k]) ? surfaceInventory[k].length : 0), 0),
  openapi_file_count: Array.isArray(journeyInventory.openapi_files) ? journeyInventory.openapi_files.length : 0,
  api_operation_count: Array.isArray(journeyInventory.proposed_journeys) ? journeyInventory.proposed_journeys.length : 0,
  generated_client_count: Array.isArray(journeyInventory.generated_clients) ? journeyInventory.generated_clients.length : 0,
  backend_route_count: Array.isArray(journeyInventory.backend_routes) ? journeyInventory.backend_routes.length : 0
};

const topLevel = [];
if (fs.existsSync(diagnosticsRoot)) {
  for (const ent of fs.readdirSync(diagnosticsRoot, { withFileTypes: true })) {
    const p = `${diagnosticsRoot}/${ent.name}`;
    topLevel.push({ name: ent.name, path: p, type: ent.isDirectory() ? "directory" : "file" });
  }
}

function classifyDiagnosticEntry(entry) {
  const p = norm(entry.path);
  if (p === factoryRoot) {
    return {
      decision: "KEEP_CANONICAL_FACTORY_ROOT",
      quote: "Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived."
    };
  }
  if (entry.name === "knip-report.json") {
    return {
      decision: "QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE",
      quote: "Knip output is supporting evidence for cleanup/toolchain decisions, not journey truth by itself."
    };
  }
  if (/toolchain|max-toolchain|tools/i.test(entry.name)) {
    return {
      decision: "QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE",
      quote: "Useful for tool ownership, failures, and optional/manual tool classification."
    };
  }
  if (/performance|storybook|logic|security/i.test(entry.name)) {
    return {
      decision: "QUOTE_AS_SPECIALIST_EVIDENCE_THEN_ARCHIVE",
      quote: "Useful specialist evidence; must be linked into operational gap ledger before controlling journeys."
    };
  }
  if (/p0|s01|s02|operational-closure|governance-operational-audit|journeys/i.test(entry.name)) {
    return {
      decision: "QUOTE_AS_HISTORICAL_EVIDENCE_THEN_ARCHIVE",
      quote: "Useful historical run evidence; stale unless head_sha matches current head and rerun proof exists."
    };
  }
  return {
    decision: "ARCHIVE_AFTER_MANIFEST",
    quote: "Not canonical journey truth. Archive after manifest unless explicitly promoted by a future gate."
  };
}

const diagnosticsManifest = [];
for (const entry of topLevel) {
  const classification = classifyDiagnosticEntry(entry);
  let fileCount = 0;
  let sizeBytes = 0;
  if (entry.type === "directory") {
    const files = listAllFiles(entry.path);
    fileCount = files.length;
    for (const f of files) sizeBytes += fs.statSync(f).size;
  } else if (fs.existsSync(entry.path)) {
    fileCount = 1;
    sizeBytes = fs.statSync(entry.path).size;
  }
  diagnosticsManifest.push({
    ...entry,
    file_count: fileCount,
    size_bytes: sizeBytes,
    decision: classification.decision,
    quote: classification.quote
  });
}

const factoryFiles = listAllFiles(factoryRoot);
const factoryManifest = [];
for (const f of factoryFiles) {
  const n = norm(f);
  let decision = "ARCHIVE_RAW_FACTORY_ARTIFACT_AFTER_REFERENCE";
  if (rawAllowedToRemain.has(n)) decision = "KEEP_CANONICAL_INVENTORY_FILE";
  if (n.includes("/canonical-reference/")) decision = "KEEP_CURRENT_REFERENCE";
  if (n.endsWith("patch-operational-factory-classification-v2.mjs")) decision = "BLOCKED_NEEDS_EVIDENCE_DO_NOT_DELETE_WITHOUT_REVIEW";
  factoryManifest.push({
    path: n,
    size_bytes: fs.statSync(f).size,
    sha256: sha256(f),
    decision
  });
}

const extractedEvidenceRows = [];
for (const entry of topLevel) {
  if (entry.path === factoryRoot) continue;
  if (entry.type === "directory") {
    const files = listAllFiles(entry.path).filter(f => /summary|report|ledger|inventory|result|closure|diagnostic/i.test(path.basename(f)));
    for (const f of files.slice(0, 25)) {
      extractedEvidenceRows.push({
        diagnostic_entry: entry.name,
        file: norm(f),
        action: classifyDiagnosticEntry(entry).decision
      });
    }
  } else {
    extractedEvidenceRows.push({
      diagnostic_entry: entry.name,
      file: norm(entry.path),
      action: classifyDiagnosticEntry(entry).decision
    });
  }
}

const cleanupCandidates = [];
for (const entry of topLevel) {
  if (entry.path === factoryRoot) continue;
  cleanupCandidates.push(norm(entry.path));
}

const rawFactoryCandidates = factoryManifest
  .filter(x => x.decision === "ARCHIVE_RAW_FACTORY_ARTIFACT_AFTER_REFERENCE")
  .map(x => x.path);

cleanupCandidates.push(...rawFactoryCandidates);

const cleanupPlan = {
  apply_cleanup: applyCleanup,
  archive_required_before_delete: true,
  archive_target_suggestion: `.diagnostics/_archive-before-cleanup/${head}-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`,
  cleanup_candidate_count: cleanupCandidates.length,
  cleanup_candidates: cleanupCandidates
};

write(path.join(referenceRoot, "core-inventory-manifest.json"), JSON.stringify(coreManifest, null, 2));
write(path.join(referenceRoot, "diagnostics-manifest.json"), JSON.stringify(diagnosticsManifest, null, 2));
write(path.join(referenceRoot, "factory-file-manifest.json"), JSON.stringify(factoryManifest, null, 2));
write(path.join(referenceRoot, "cleanup-plan.json"), JSON.stringify(cleanupPlan, null, 2));

const indexMd = [
  "# Canonical Operational Journey Reference",
  "",
  `- branch: ${branch}`,
  `- head_sha: ${head}`,
  `- generated_at: ${new Date().toISOString()}`,
  "- implementation_started: false",
  "- closure_claim: false",
  "",
  "## Numeric Truth",
  "",
  "| Metric | Value |",
  "|---|---:|",
  ...Object.entries(numericTruth).map(([k, v]) => `| ${k} | ${v} |`),
  "",
  "## Canonical Inventory Files",
  "",
  "| Source | Reference copy | sha256 | Size |",
  "|---|---|---|---:|",
  ...coreManifest.map(x => `| ${code(x.source_path)} | ${code(x.reference_path)} | ${code(x.sha256)} | ${x.size_bytes} |`),
  "",
  "## Diagnostics Folder Decisions",
  "",
  "| Entry | Type | Files | Size | Decision | Quote |",
  "|---|---|---:|---:|---|---|",
  ...diagnosticsManifest.map(x => `| ${cell(x.path)} | ${x.type} | ${x.file_count} | ${x.size_bytes} | ${x.decision} | ${cell(x.quote)} |`),
  "",
  "## Extracted Evidence Candidates",
  "",
  "| Diagnostic entry | File | Action |",
  "|---|---|---|",
  ...(extractedEvidenceRows.length ? extractedEvidenceRows.map(x => `| ${cell(x.diagnostic_entry)} | ${code(x.file)} | ${cell(x.action)} |`) : ["| none | none | none |"]),
  "",
  "## Blockers",
  "",
  ...(blockers.length ? blockers.map(b => `- BLOCKED_NEEDS_EVIDENCE: ${cell(b)}`) : ["- none"]),
  "",
  "## Warnings",
  "",
  ...(warnings.length ? warnings.map(w => `- ${cell(w)}`) : ["- none"]),
  "",
  "## Result",
  "",
  blockers.length
    ? "BLOCKED_NEEDS_EVIDENCE. Do not delete or execute journeys until blockers are resolved."
    : "CANONICAL_REFERENCE_PREPARED. This is still not final closure; it is the source-of-truth reference layer for future journey packages."
];

write(path.join(referenceRoot, "00_CANONICAL_REFERENCE_INDEX.md"), indexMd.join("\n"));

const summary = {
  status: blockers.length ? "BLOCKED_NEEDS_EVIDENCE" : "CANONICAL_REFERENCE_PREPARED",
  final_closure: false,
  exact_100_percent_claim: false,
  branch,
  head_sha: head,
  reference_root: norm(referenceRoot),
  numeric_truth: numericTruth,
  blockers,
  warnings,
  core_inventory_files: coreManifest,
  diagnostics_manifest_count: diagnosticsManifest.length,
  factory_manifest_count: factoryManifest.length,
  cleanup_candidate_count: cleanupCandidates.length,
  cleanup_plan: norm(path.join(referenceRoot, "cleanup-plan.json")),
  next_action: blockers.length
    ? "Resolve blockers; do not cleanup or execute journeys."
    : "Review cleanup-plan.json; rerun with -ApplyCleanup only after accepting archive-before-delete behavior."
};

write(path.join(referenceRoot, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
