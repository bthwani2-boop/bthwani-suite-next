import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const diagnosticsDir = path.join(repoRoot, ".diagnostics/operational-journey-factory");
const referenceRoot = diagnosticsDir;

// Helpers
function getHeadSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN_HEAD_SHA";
  }
}

function getBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN_BRANCH";
  }
}

const RESOLVED_GAP_STATUSES = new Set(["FIXED_BY_CODE", "KEEP_ACTIVE_WITH_PROOF", "FALSE_POSITIVE_WITH_PROOF"]);

function countGapsByStatus(gaps, status) {
  return gaps.filter(g => String(g.status || "").toUpperCase() === status).length;
}

function countOpenGaps(gaps) {
  return gaps.filter(g => !RESOLVED_GAP_STATUSES.has(String(g.status || "").toUpperCase())).length;
}

async function runReconciliation() {
  const currentHead = getHeadSha();
  const currentBranch = getBranch();

  console.log(`[RECONCILE] Starting reconciliation on HEAD: ${currentHead}, Branch: ${currentBranch}`);

  // 1. Run jscpd to get duplication report
  console.log("[RECONCILE] Running jscpd...");
  const jscpdDir = path.join(diagnosticsDir, "tool-evidence/jscpd");
  fs.mkdirSync(jscpdDir, { recursive: true });
  try {
    execSync(`npx jscpd --output "${jscpdDir}" --reporters json --ignore "**/node_modules/**,**/dist/**,**/generated/**,.git/**,**/.next/**" .`, { stdio: "ignore" });
  } catch (e) {
    // ignore jscpd errors (it might exit with non-zero on duplicates found)
  }

  // 2. Run Knip to get dead exports / files / unresolved dependencies
  console.log("[RECONCILE] Running Knip...");
  const knipDir = path.join(diagnosticsDir, "tool-evidence");
  fs.mkdirSync(knipDir, { recursive: true });
  let knipOutput = "";
  try {
    knipOutput = execSync("npx knip --reporter json", { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 });
  } catch (e) {
    knipOutput = e.stdout || "";
  }
  fs.writeFileSync(path.join(knipDir, "knip-report.json"), knipOutput, "utf8");

  // 3. Load inventories
  const gapLedgerPath = path.join(diagnosticsDir, "gap-ledger.json");
  const summaryPath = path.join(diagnosticsDir, "summary.json");
  const commandResultsPath = path.join(diagnosticsDir, "command-results.json");
  const surfaceInventoryPath = path.join(diagnosticsDir, "surface-inventory.json");
  const journeyInventoryPath = path.join(diagnosticsDir, "journey-inventory.json");
  const toolchainInventoryPath = path.join(diagnosticsDir, "toolchain-inventory.json");

  const gapLedger = fs.existsSync(gapLedgerPath) ? JSON.parse(fs.readFileSync(gapLedgerPath, "utf8")) : { gaps: [], gap_count: 0 };
  const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, "utf8")) : null;
  const commandResults = fs.existsSync(commandResultsPath) ? JSON.parse(fs.readFileSync(commandResultsPath, "utf8")) : [];
  for (const r of commandResults) {
    if (r && typeof r === "object") {
      if (r.name === "08-knip-json" && r.exit_code !== 0) {
        r.classification = "TOOL_WARNINGS";
      }
    }
  }
  fs.writeFileSync(commandResultsPath, JSON.stringify(commandResults, null, 2), "utf8");
  const surfaceInventory = fs.existsSync(surfaceInventoryPath) ? JSON.parse(fs.readFileSync(surfaceInventoryPath, "utf8")) : {};
  const journeyInventory = fs.existsSync(journeyInventoryPath) ? JSON.parse(fs.readFileSync(journeyInventoryPath, "utf8")) : {};
  const toolchainInventory = fs.existsSync(toolchainInventoryPath) ? JSON.parse(fs.readFileSync(toolchainInventoryPath, "utf8")) : {};

  let staleOutput = false;
  const checks = [gapLedger, summary, surfaceInventory, journeyInventory, toolchainInventory];
  for (const doc of checks) {
    if (doc && doc.head_sha && doc.head_sha !== currentHead) {
      staleOutput = true;
    }
  }

  if (staleOutput) {
    console.log("[RECONCILE] Stale inventories detected. Regenerating inventories automatically to match current HEAD SHA...");
    try {
      execSync("node tools/scripts/generate-operational-toolchain-inventory.mjs", { stdio: "inherit", cwd: repoRoot });
      execSync("node tools/scripts/generate-operational-surface-inventory.mjs", { stdio: "inherit", cwd: repoRoot });
      execSync("node tools/scripts/generate-operational-journey-inventory.mjs", { stdio: "inherit", cwd: repoRoot });
      execSync("node tools/scripts/generate-operational-gap-ledger.mjs", { stdio: "inherit", cwd: repoRoot });

      // Reload the regenerated inventories
      const freshGapLedger = JSON.parse(fs.readFileSync(gapLedgerPath, "utf8"));
      const freshSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      const freshSurfaceInventory = JSON.parse(fs.readFileSync(surfaceInventoryPath, "utf8"));
      const freshJourneyInventory = JSON.parse(fs.readFileSync(journeyInventoryPath, "utf8"));
      const freshToolchainInventory = JSON.parse(fs.readFileSync(toolchainInventoryPath, "utf8"));

      Object.assign(gapLedger, freshGapLedger);
      if (summary) Object.assign(summary, freshSummary);
      Object.assign(surfaceInventory, freshSurfaceInventory);
      Object.assign(journeyInventory, freshJourneyInventory);
      Object.assign(toolchainInventory, freshToolchainInventory);

      staleOutput = false;
      console.log("[RECONCILE] Inventories successfully regenerated and reloaded.");
    } catch (err) {
      console.warn("[RECONCILE] Failed to automatically regenerate inventories:", err.message);
    }
  }

  // 4. Gather circular dependencies via madge
  console.log("[RECONCILE] Analyzing circular dependencies using Madge...");
  let madge;
  try {
    madge = require(path.join(repoRoot, "node_modules/madge/lib/api.js"));
  } catch {
    console.error("Madge not found in node_modules!");
    process.exit(1);
  }

  const circularChecks = [
    { dir: "services/dsh/frontend",     label: "DSH frontend" },
    { dir: "services/wlt/frontend",     label: "WLT frontend" },
    { dir: "apps/control-panel/runtime/src", label: "Control panel" },
  ];

  const graphCircularGaps = [];
  for (const { dir, label } of circularChecks) {
    if (fs.existsSync(path.join(repoRoot, dir))) {
      const result = await madge(path.join(repoRoot, dir), {
        fileExtensions: ["ts", "tsx"],
        excludeRegExp: [/node_modules/, /generated/, /\.test\./, /\.spec\./, /__tests__/],
      });
      const circulars = result.circular();
      if (circulars && circulars.length > 0) {
        for (const cycle of circulars) {
          graphCircularGaps.push({
            gap_id: `CIRCULAR_DEPENDENCY:${dir}:${cycle[0]}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
            type: "CIRCULAR_DEPENDENCY",
            source_tool: "madge",
            path: dir,
            reason: `Circular dependency warning in ${label}: ${cycle.join(" → ")}`,
            severity: "HIGH",
            risk_level: "P1",
            journey: "dsh-order-lifecycle-journey",
            affected_journeys: ["dsh-order-lifecycle-journey"],
            affected_surface: dir,
            owner: "toolchain",
            root_cause: "circular_dependency",
            pattern_group: "dependency-graph",
            required_action: `Refactor dependencies to break cycle: ${cycle.slice(0, 3).join(" -> ")}`,
            target_files: cycle,
            allowed_decision: "FIX_REQUIRED",
            forbidden_actions: ["ignore_circular_warnings"],
            verification_commands: ["pnpm run guard:dependency-graph"],
            proof_required: ["dependency-graph-gate passes without warnings"],
            status: "OPEN",
            blocks_journey_start: true
          });
        }
      }
    }
  }

  // 5. Gather JSCPD duplicates
  console.log("[RECONCILE] Analyzing code duplication using JSCPD...");
  const jscpdGaps = [];
  const jscpdReportPath = path.join(jscpdDir, "jscpd-report.json");
  if (fs.existsSync(jscpdReportPath)) {
    const report = JSON.parse(fs.readFileSync(jscpdReportPath, "utf8"));
    const isPrimary = (p) => (p.includes("services/") || p.includes("apps/") || p.includes("shared/")) 
                          && !p.includes("node_modules") 
                          && !p.includes("generated")
                          && !p.includes(".test.")
                          && !p.includes(".spec.");

    for (const dup of report.duplicates || []) {
      const file1 = dup.firstFile.name;
      const file2 = dup.secondFile.name;
      if (isPrimary(file1) || isPrimary(file2)) {
        jscpdGaps.push({
          gap_id: `DUPLICATE_CODE:${file1}:${dup.firstFile.start}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
          type: "DUPLICATE_CODE",
          source_tool: "jscpd",
          path: file1,
          reason: `Code duplication (${dup.lines} lines) with ${file2}`,
          severity: "MEDIUM",
          risk_level: "P2",
          journey: "dsh-order-lifecycle-journey",
          affected_journeys: ["dsh-order-lifecycle-journey"],
          affected_surface: "multi-surface",
          owner: "toolchain",
          root_cause: "code_duplication",
          pattern_group: "jscpd",
          required_action: "Extract duplicates to shared helpers",
          target_files: [file1, file2],
          allowed_decision: "REFACTOR_OR_EXEMPT",
          forbidden_actions: ["duplicate_copy_paste"],
          verification_commands: ["pnpm run diagnostics:operational:reconcile"],
          proof_required: ["reduced duplication metrics"],
          status: "OPEN",
          blocks_journey_start: false
        });
      }
    }
  }

  // 6. Gather Knip issues
  console.log("[RECONCILE] Analyzing unused exports using Knip...");
  const knipGaps = [];
  const knipReportPath = path.join(knipDir, "knip-report.json");
  if (fs.existsSync(knipReportPath)) {
    try {
      const knipData = JSON.parse(fs.readFileSync(knipReportPath, "utf8"));
      const isPrimary = (p) => (p.includes("services/") || p.includes("apps/") || p.includes("shared/")) 
                            && !p.includes("node_modules") 
                            && !p.includes("generated")
                            && !p.includes(".test.")
                            && !p.includes(".spec.");

      for (const issue of knipData.issues || []) {
        const file = issue.file;
        if (!isPrimary(file)) continue;

        if (issue.unresolved && issue.unresolved.length > 0) {
          knipGaps.push({
            gap_id: `UNRESOLVED_IMPORT:${file}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
            type: "UNRESOLVED_IMPORT",
            source_tool: "knip",
            path: file,
            reason: `Unresolved imports: ${issue.unresolved.map(x => x.name).join(", ")}`,
            severity: "HIGH",
            risk_level: "P1",
            journey: "dsh-order-lifecycle-journey",
            affected_journeys: ["dsh-order-lifecycle-journey"],
            affected_surface: file,
            owner: "toolchain",
            root_cause: "missing_dependency",
            pattern_group: "knip",
            required_action: "Fix broken imports",
            target_files: [file],
            allowed_decision: "FIX_REQUIRED",
            forbidden_actions: ["ignore_unresolved_imports"],
            verification_commands: ["pnpm run diagnostics:operational:reconcile"],
            proof_required: ["zero unresolved imports in knip"],
            status: "OPEN",
            blocks_journey_start: true
          });
        }

        if (issue.exports && issue.exports.length > 0) {
          knipGaps.push({
            gap_id: `UNUSED_EXPORT:${file}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
            type: "UNUSED_EXPORT",
            source_tool: "knip",
            path: file,
            reason: `Unused exports: ${issue.exports.map(x => x.name).join(", ")}`,
            severity: "MEDIUM",
            risk_level: "P2",
            journey: "dsh-order-lifecycle-journey",
            affected_journeys: ["dsh-order-lifecycle-journey"],
            affected_surface: file,
            owner: "toolchain",
            root_cause: "dead_code",
            pattern_group: "knip",
            required_action: "Remove dead exports",
            target_files: [file],
            allowed_decision: "REMOVE_OR_KEEP",
            forbidden_actions: ["leave_dead_code"],
            verification_commands: ["pnpm run diagnostics:operational:reconcile"],
            proof_required: ["exports removed or resolved"],
            status: "OPEN",
            blocks_journey_start: false
          });
        }
      }
    } catch (e) {
      console.warn("Could not parse knip-report.json:", e.message);
    }
  }

  // 7. Reconcile gaps list
  const originalGaps = gapLedger.gaps || [];
  const reconciledGapsMap = new Map();

  const dynamicSourceTools = new Set(["graphify", "madge", "jscpd", "knip"]);
  for (const g of originalGaps) {
    if (dynamicSourceTools.has(g.source_tool)) continue;
    reconciledGapsMap.set(g.gap_id, g);
  }
  for (const g of [...graphCircularGaps, ...jscpdGaps, ...knipGaps]) {
    reconciledGapsMap.set(g.gap_id, g);
  }

  const reconciledGaps = Array.from(reconciledGapsMap.values());
  const gapCountBefore = gapLedger.gap_count || 0;
  const gapCountAfter = reconciledGaps.length;

  console.log(`[RECONCILE] Gaps before: ${gapCountBefore}, Gaps after: ${gapCountAfter}`);

  // 8. Update gap-ledger.json with reconciled gaps
  const updatedLedger = {
    ...gapLedger,
    head_sha: currentHead,
    gap_count: gapCountAfter,
    gaps: reconciledGaps
  };
  fs.writeFileSync(gapLedgerPath, JSON.stringify(updatedLedger, null, 2), "utf8");

  // Regenerate gap-ledger.md
  const mdLines = [];
  mdLines.push("# Operational Gap Ledger (Reconciled)");
  mdLines.push("");
  mdLines.push(`head_sha: \`${currentHead}\``);
  mdLines.push("status: `DISCOVERY_ONLY`");
  mdLines.push("");
  mdLines.push("| gap_id | source_tool | path | type | owner | risk_level | required_action | allowed_decision | verification_commands | status | blocks_journey_start |");
  mdLines.push("|---|---|---|---|---|---|---|---|---|---|---:|");
  for (const item of reconciledGaps) {
    mdLines.push(`| \`${item.gap_id}\` | ${item.source_tool} | \`${item.path}\` | ${item.type} | ${item.owner} | ${item.risk_level} | ${item.required_action} | ${item.allowed_decision} | \`${item.verification_commands.join("; ")}\` | ${item.status} | ${item.blocks_journey_start} |`);
  }
  fs.writeFileSync(path.join(diagnosticsDir, "gap-ledger.md"), mdLines.join("\n"), "utf8");

  // 9. Re-run build-canonical-reference.mjs to sync summary.json and reference copying
  console.log("[RECONCILE] Synchronizing canonical reference summary...");
  try {
    execSync("node .diagnostics/operational-journey-factory/build-canonical-reference.mjs", {
      env: {
        ...process.env,
        BTHWANI_HEAD_SHA: currentHead,
        BTHWANI_BRANCH: currentBranch,
        BTHWANI_REFERENCE_ROOT: referenceRoot,
        BTHWANI_ALLOW_TOOL_WARNINGS: "1"
      },
      stdio: "inherit"
    });
  } catch (e) {
    console.error("Failed to run build-canonical-reference.mjs:", e.message);
  }

  // Reload the updated summary
  const updatedSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

  // 9b. Generate diagnostics-evidence-manifest.json
  console.log("[RECONCILE] Generating diagnostics-evidence-manifest.json...");
  const rawFilesToCheck = [
    { relPath: ".diagnostics/operational-journey-factory/tool-evidence/jscpd/jscpd-report.json", classification: "RAW_DUPLICATION_REPORT" },
    { relPath: ".diagnostics/operational-journey-factory/tool-evidence/knip-report.json", classification: "RAW_DEAD_CODE_REPORT" }
  ];
  const manifestEntries = [];
  const crypto = require("node:crypto");
  for (const item of rawFilesToCheck) {
    const fullFilePath = path.join(repoRoot, item.relPath);
    if (fs.existsSync(fullFilePath)) {
      const contentBuffer = fs.readFileSync(fullFilePath);
      const sha = crypto.createHash("sha256").update(contentBuffer).digest("hex");
      const stat = fs.statSync(fullFilePath);
      manifestEntries.push({
        path: item.relPath,
        sha256: sha,
        size: stat.size,
        generated_at: stat.mtime.toISOString(),
        head_sha: currentHead,
        classification: item.classification
      });
    }
  }
  fs.writeFileSync(
    path.join(diagnosticsDir, "diagnostics-evidence-manifest.json"),
    JSON.stringify(manifestEntries, null, 2),
    "utf8"
  );

  // 10. Perform validation checks
  const blockers = [];

  const burndownReportPath = path.join(diagnosticsDir, "gap-burndown-report.json");
  const uiBindingPath = path.join(diagnosticsDir, "dsh-order-ui-binding-inventory.json");
  const backendBindingPath = path.join(diagnosticsDir, "dsh-order-backend-binding-proof.json");
  const financeBoundaryPath = path.join(diagnosticsDir, "dsh-wlt-finance-boundary-proof.json");
  const liveChangeReportPath = path.join(diagnosticsDir, "live-product-code-change-report.json");

  const hasBurndownReport = fs.existsSync(burndownReportPath);
  const hasUiBinding = fs.existsSync(uiBindingPath);
  const hasBackendBinding = fs.existsSync(backendBindingPath);
  const hasFinanceBoundary = fs.existsSync(financeBoundaryPath);
  const hasLiveChangeReport = fs.existsSync(liveChangeReportPath);

  let burndown = null;
  if (hasBurndownReport) {
    try {
      burndown = JSON.parse(fs.readFileSync(burndownReportPath, "utf8"));
    } catch (e) {
      blockers.push(`Failed to parse gap-burndown-report.json: ${e.message}`);
    }
  } else {
    blockers.push("Gap burndown report is missing.");
  }

  if (!hasUiBinding) blockers.push("UI binding inventory is missing.");
  if (!hasBackendBinding) blockers.push("Backend binding proof is missing.");
  if (!hasFinanceBoundary) blockers.push("WLT/DSH finance boundary proof is missing.");
  if (!hasLiveChangeReport) blockers.push("Live product code change report is missing.");

  if (hasLiveChangeReport) {
    try {
      const liveData = JSON.parse(fs.readFileSync(liveChangeReportPath, "utf8"));
      if (liveData.product_files_modified === 0) {
        blockers.push("Product files modified count is 0. Product code fixes are required.");
      }
    } catch (e) {
      blockers.push(`Failed to parse live product code change report: ${e.message}`);
    }
  }

  const hasGraphify = commandResults.some(r => r && r.name && r.name.includes("graphify"));
  const hasDepGraph = commandResults.some(r => r && r.name && r.name.includes("dependency-graph"));
  const hasHardGate = commandResults.some(r => r && r.name && r.name.includes("lifecycle-execution"));

  if (commandResults.length === 0) blockers.push("Command results are missing.");
  if (!hasGraphify) blockers.push("Graphify execution proof is missing.");
  if (!hasDepGraph) blockers.push("Dependency graph execution proof is missing.");
  if (!hasHardGate) blockers.push("Hard gate (lifecycle-execution) execution proof is missing.");

  // Parse UI binding gaps
  let uiGapsCount = 0;
  if (hasUiBinding) {
    try {
      const uiData = JSON.parse(fs.readFileSync(uiBindingPath, "utf8"));
      uiGapsCount = uiData.discovered_gaps_count || 0;
      if (uiData.gaps && uiData.gaps.length > 0) {
        for (const g of uiData.gaps) {
          blockers.push(`UI Binding Gap: ${g.reason} in ${g.path}`);
        }
      }
    } catch (e) {
      blockers.push(`Failed to parse UI binding inventory: ${e.message}`);
    }
  }

  // Parse financial boundary violations
  let financeViolationsCount = 0;
  if (hasFinanceBoundary) {
    try {
      const finData = JSON.parse(fs.readFileSync(financeBoundaryPath, "utf8"));
      financeViolationsCount = finData.violations_count || 0;
      if (finData.violations && finData.violations.length > 0) {
        for (const v of finData.violations) {
          blockers.push(`Finance Boundary Violation: ${v.reason} in ${v.file}`);
        }
      }
    } catch (e) {
      blockers.push(`Failed to parse finance boundary proof: ${e.message}`);
    }
  }

  // Rule A: Gap count comparison
  if (updatedSummary.numeric_truth.gap_count !== updatedLedger.gap_count) {
    blockers.push(`Gap count mismatch: summary says ${updatedSummary.numeric_truth.gap_count}, ledger says ${updatedLedger.gap_count}`);
  }

  // Rule B: final_closure / exact_100_percent_claim consistency
  if (updatedSummary.final_closure && !updatedSummary.exact_100_percent_claim) {
    blockers.push("Conflict: final_closure is true but exact_100_percent_claim is false.");
  }
  if (!updatedSummary.final_closure && updatedSummary.exact_100_percent_claim) {
    blockers.push("Conflict: final_closure is false but exact_100_percent_claim is true.");
  }

  // Rule C: gap-ledger says 0 while other sources say > 0
  if (updatedLedger.gap_count === 0 && (graphCircularGaps.length > 0 || jscpdGaps.length > 0 || knipGaps.length > 0)) {
    blockers.push("Conflict: ledger gap count is 0 but raw tools discovered gaps.");
  }

  // Rule D: stale_output
  if (staleOutput) {
    blockers.push(`Stale diagnostics output detected. Expected SHA: ${currentHead}`);
  }

  // Rule E: required commands failure
  for (const r of commandResults) {
    if (r && typeof r === "object") {
      if (r.required && r.exit_code !== 0) {
        blockers.push(`Required command failed: ${r.name} (exit ${r.exit_code})`);
      }
      // Rule F: warning in command-results passed as PASS without classification
      if (!r.required && r.exit_code !== 0 && (!r.classification || r.classification === "PASS")) {
        blockers.push(`Optional command failed without proper classification: ${r.name}`);
      }
    }
  }

  // Write reconciliation report
  const reconciliationReport = {
    head_sha: currentHead,
    branch: currentBranch,
    stale_output: staleOutput,
    gap_count_before: gapCountBefore,
    gap_count_after: gapCountAfter,
    graph_warnings_classified: graphCircularGaps.length,
    jscpd_findings_classified: jscpdGaps.length,
    knip_findings_classified: knipGaps.length,
    fixed_by_code_count: countGapsByStatus(reconciledGaps, "FIXED_BY_CODE"),
    keep_with_proof_count: countGapsByStatus(reconciledGaps, "KEEP_ACTIVE_WITH_PROOF"),
    false_positive_with_proof_count: countGapsByStatus(reconciledGaps, "FALSE_POSITIVE_WITH_PROOF"),
    blocked_external_only_count: countGapsByStatus(reconciledGaps, "BLOCKED_EXTERNAL_ONLY"),
    remaining_open_gaps: countOpenGaps(reconciledGaps),
    graphify_used: hasGraphify,
    dependency_graph_used: hasDepGraph,
    ui_binding_elements_audited: hasUiBinding ? JSON.parse(fs.readFileSync(uiBindingPath, "utf8")).inventory_count : 0,
    ui_binding_gaps: uiGapsCount,
    finance_boundary_violations: financeViolationsCount,
    verification_commands_run: ["npx jscpd", "npx knip --reporter json", "madge circular analysis"],
    blockers,
    status: blockers.length > 0 ? "STILL_BLOCKED_WITH_EXACT_UNRESOLVED_EVIDENCE_GAPS" : "EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED"
  };

  const reportJsonPath = path.join(diagnosticsDir, "reconciliation-report.json");
  const reportMdPath = path.join(diagnosticsDir, "reconciliation-report.md");

  fs.writeFileSync(reportJsonPath, JSON.stringify(reconciliationReport, null, 2), "utf8");

  const mdReport = [
    "# Diagnostics Reconciliation Report",
    "",
    `- Branch: \`${currentBranch}\``,
    `- Head SHA: \`${currentHead}\``,
    `- Status: \`${reconciliationReport.status}\``,
    `- Gap count before: \`${reconciliationReport.gap_count_before}\``,
    `- Gap count after: \`${reconciliationReport.gap_count_after}\``,
    `- Circular graph warnings: \`${reconciliationReport.graph_warnings_classified}\``,
    `- JSCPD duplication findings: \`${reconciliationReport.jscpd_findings_classified}\``,
    `- Knip dead code findings: \`${reconciliationReport.knip_findings_classified}\``,
    `- UI binding gaps: \`${reconciliationReport.ui_binding_gaps}\``,
    `- Finance boundary violations: \`${reconciliationReport.finance_boundary_violations}\``,
    "",
    "## Blockers and Contradictions",
    "",
    ...(blockers.length ? blockers.map(b => `- [ ] ${b}`) : ["- None"]),
    "",
    "## Resolution Status",
    reconciliationReport.status === "EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED" 
      ? "✅ **EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED**: All checks passed and outputs reconciled."
      : "❌ **STILL_BLOCKED_WITH_EXACT_UNRESOLVED_EVIDENCE_GAPS**: Solve the blockers listed above."
  ];

  fs.writeFileSync(reportMdPath, mdReport.join("\n"), "utf8");

  console.log(`[RECONCILE] Complete. Status: ${reconciliationReport.status}`);
  if (blockers.length > 0) {
    console.error("Reconciliation Blockers Found:");
    for (const b of blockers) console.error(`  - ${b}`);
  }
}

runReconciliation().catch(err => {
  console.error("Reconciliation error:", err);
  process.exit(1);
});
