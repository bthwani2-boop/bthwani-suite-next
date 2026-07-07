import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "operational-diagnostics-reconciliation-gate";
const violations = [];

const diagnosticsDir = path.join(repoRoot, ".diagnostics/operational-journey-factory");
const reconciliationReportPath = path.join(diagnosticsDir, "reconciliation-report.json");
const summaryPath = path.join(diagnosticsDir, "summary.json");
const gapLedgerPath = path.join(diagnosticsDir, "gap-ledger.json");
const executionGatePath = path.join(repoRoot, "governance/operational_journey_factory/generated/dsh-order-lifecycle-journey/15_EXECUTION_GATE.md");

// 1. Run the reconciliation script first to make sure everything is freshly generated
console.log(`[${guardId}] Running reconcile-operational-diagnostics.mjs...`);
try {
  execSync("node tools/scripts/reconcile-operational-diagnostics.mjs", { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  violations.push({ file: "tools/scripts/reconcile-operational-diagnostics.mjs", line: 0, message: "Reconciliation script failed to run." });
}

// 2. Read the reconciliation report and checks
if (fs.existsSync(reconciliationReportPath)) {
  const report = JSON.parse(fs.readFileSync(reconciliationReportPath, "utf8"));
  
  // Fail on stale head_sha
  if (report.stale_output) {
    violations.push({ file: "reconciliation-report.json", line: 0, message: `STALE_DIAGNOSTICS_OUTPUT: expected HEAD SHA ${report.head_sha}` });
  }

  // Fail on any blockers in reconciliation report
  for (const blocker of report.blockers || []) {
    violations.push({ file: "reconciliation-report.json", line: 0, message: `RECONCILIATION_BLOCKER: ${blocker}` });
  }

  // Fail if status is not successful
  if (report.status !== "EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED") {
    violations.push({ file: "reconciliation-report.json", line: 0, message: `INVALID_RECONCILIATION_STATUS: ${report.status}` });
  }

  // 3. Check if any raw report is committed in git (Policy says raw reports must not be committed)
  console.log(`[${guardId}] Verifying git tracking policy for .diagnostics/...`);
  try {
    const trackedFilesRaw = execSync("git ls-files .diagnostics/", { encoding: "utf8", cwd: repoRoot });
    const trackedFiles = trackedFilesRaw.split(/\r?\n/).filter(Boolean);
    
    // Allowed tracked files: only bounded summaries/manifests
    const allowedPatterns = [
      /\.md$/, // markdown summaries
      /\.mjs$/, // helper scripts
      /diagnostics-evidence-manifest\.json$/,
      /reconciliation-report\.json$/,
      /gap-ledger\.json$/,
      /summary\.json$/,
      /journey-inventory\.json$/,
      /surface-inventory\.json$/,
      /toolchain-inventory\.json$/,
      /core-inventory-manifest\.json$/,
      /diagnostics-manifest\.json$/,
      /factory-file-manifest\.json$/,
      /cleanup-plan\.json$/,
      /gap-burndown-report\.(json|md)$/,
      /dsh-order-ui-binding-inventory\.(json|md)$/,
      /dsh-order-backend-binding-proof\.json$/,
      /dsh-wlt-finance-boundary-proof\.json$/,
      /live-product-code-change-report\.json$/
    ];

    for (const file of trackedFiles) {
      const isAllowed = allowedPatterns.some(pat => pat.test(file));
      if (!isAllowed) {
        violations.push({
          file,
          line: 0,
          message: `RAW_REPORT_TRACKED_IN_GIT: Raw diagnostic output ${file} is tracked in git. Remove using git rm --cached.`
        });
      }
    }
  } catch (e) {
    violations.push({ file: ".diagnostics", line: 0, message: `Failed to check git tracked files: ${e.message}` });
  }

  // 4. Verify canonical reference files exist
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    for (const item of summary.core_inventory_files || []) {
      const refPath = path.join(repoRoot, item.reference_path);
      if (!fs.existsSync(refPath)) {
        violations.push({
          file: "summary.json",
          line: 0,
          message: `MISSING_CANONICAL_REFERENCE_FILE: Reference copy not found at ${item.reference_path}`
        });
      }
    }
  }

  // 5. Gap count mismatch checking with Execution Gate
  if (fs.existsSync(gapLedgerPath) && fs.existsSync(executionGatePath)) {
    const gapLedger = JSON.parse(fs.readFileSync(gapLedgerPath, "utf8"));
    const execGateContent = fs.readFileSync(executionGatePath, "utf8");

    const hasNoOpenBlockingGapsChecked = /- \[[xX]\] \*\*No Open Blocking Gaps\*\*/.test(execGateContent);
    const totalGaps = gapLedger.gap_count || 0;

    if (totalGaps > 0 && hasNoOpenBlockingGapsChecked) {
      violations.push({
        file: "15_EXECUTION_GATE.md",
        line: 0,
        message: `EXECUTION_GATE_CONTRADICTION: 'No Open Blocking Gaps' is checked, but gap-ledger contains ${totalGaps} open gaps.`
      });
    }

    // Fail if generated status declares readiness while there are gaps
    if (totalGaps > 0 && /Execution State:\s*`?EXECUTION_READY`?/i.test(execGateContent)) {
      violations.push({
        file: "15_EXECUTION_GATE.md",
        line: 0,
        message: "EXECUTION_GATE_CONTRADICTION: Execution State declares EXECUTION_READY, but gaps exist."
      });
    }
  }
} else {
  violations.push({ file: "reconciliation-report.json", line: 0, message: "Reconciliation report was not generated." });
}

fail(guardId, violations);
