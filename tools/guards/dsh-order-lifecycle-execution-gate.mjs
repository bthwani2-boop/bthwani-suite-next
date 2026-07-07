import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const diagnosticsDir = path.join(repoRoot, '.diagnostics/operational-journey-factory');
const journeyDir = path.join(repoRoot, 'governance/operational_journey_factory/generated/dsh-order-lifecycle-journey');

const gapLedgerPath = path.join(diagnosticsDir, 'gap-ledger.json');
const summaryPath = path.join(diagnosticsDir, 'summary.json');
const reconciliationReportPath = path.join(diagnosticsDir, 'reconciliation-report.json');
const surfaceInventoryPath = path.join(diagnosticsDir, 'surface-inventory.json');
const commandResultsPath = path.join(diagnosticsDir, 'command-results.json');

const executionGateMdPath = path.join(journeyDir, '15_EXECUTION_GATE.md');
const patchLedgerMdPath = path.join(journeyDir, '14_LIVE_CODE_PATCH_LEDGER.md');

const transportPath = path.join(repoRoot, 'services/dsh/frontend/shared/orders/dsh-order-lifecycle.transport.ts');
const policyPath = path.join(repoRoot, 'services/dsh/frontend/shared/orders/dsh-order-lifecycle.policy.ts');
const controllerPath = path.join(repoRoot, 'services/dsh/frontend/shared/orders/use-dsh-order-lifecycle-controller.ts');

const violations = [];

function addViolation(file, message, requiredFix, verificationCommand) {
  violations.push({
    file: path.relative(repoRoot, file),
    message,
    required_fix: requiredFix,
    verification_command: verificationCommand
  });
}

// 1. Load documents
const gapLedger = fs.existsSync(gapLedgerPath) ? JSON.parse(fs.readFileSync(gapLedgerPath, 'utf8')) : null;
const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null;
const reconReport = fs.existsSync(reconciliationReportPath) ? JSON.parse(fs.readFileSync(reconciliationReportPath, 'utf8')) : null;
const surfaceInventory = fs.existsSync(surfaceInventoryPath) ? JSON.parse(fs.readFileSync(surfaceInventoryPath, 'utf8')) : null;
const commandResults = fs.existsSync(commandResultsPath) ? JSON.parse(fs.readFileSync(commandResultsPath, 'utf8')) : [];
const executionGateMd = fs.existsSync(executionGateMdPath) ? fs.readFileSync(executionGateMdPath, 'utf8') : '';
const patchLedgerMd = fs.existsSync(patchLedgerMdPath) ? fs.readFileSync(patchLedgerMdPath, 'utf8') : '';

// 2. Parity validation
if (summary && gapLedger && summary.numeric_truth && summary.numeric_truth.gap_count !== gapLedger.gap_count) {
  addViolation(
    summaryPath,
    `Gap count mismatch: summary.json has ${summary.numeric_truth.gap_count} but gap-ledger.json has ${gapLedger.gap_count}`,
    'Run reconcile-operational-diagnostics to synchronize summaries.',
    'pnpm run diagnostics:operational:reconcile'
  );
}

if (reconReport && reconReport.status !== 'EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED' && reconReport.status !== 'STILL_BLOCKED_WITH_EXACT_UNRESOLVED_EVIDENCE_GAPS') {
  addViolation(
    reconciliationReportPath,
    `Invalid reconciliation status: ${reconReport.status}`,
    'Ensure reconciliation script completes and reports status.',
    'pnpm run diagnostics:operational:reconcile'
  );
}

// 3. Gap count checks on execution gate md
const gapCount = gapLedger ? gapLedger.gap_count : 0;
if (gapCount > 0) {
  if (executionGateMd.includes('EXECUTION_READY')) {
    addViolation(
      executionGateMdPath,
      'Journey marked as EXECUTION_READY, but gap-ledger contains open gaps.',
      'Change status declaration to PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS.',
      'Edit 15_EXECUTION_GATE.md'
    );
  }
  if (!executionGateMd.includes('PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS')) {
    addViolation(
      executionGateMdPath,
      'Journey must declare PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS when open gaps exist.',
      'Ensure the markdown declares PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS.',
      'Edit 15_EXECUTION_GATE.md'
    );
  }
}

// 4. File URLs check
const allJourneyFiles = fs.readdirSync(journeyDir);
for (const file of allJourneyFiles) {
  const filePath = path.join(journeyDir, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('file:///')) {
      addViolation(
        filePath,
        'Local file:/// link detected inside journey directory.',
        'Replace all file:/// links with repository-relative paths.',
        'node C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\fed1682f-176e-4a56-a594-774ee492a5f6\\scratch\\remove_local_links.js'
      );
    }
  }
}

// 5. Open blocking gaps validation
if (gapLedger && gapLedger.gaps) {
  const blockingTypes = ['UNRESOLVED_IMPORT', 'CIRCULAR_DEPENDENCY', 'DIRECT_API_IN_SURFACE', 'BUSINESS_LOGIC_IN_SURFACE', 'SHARED_API_LOGIC_MIXED'];
  for (const gap of gapLedger.gaps) {
    if (gap.status === 'OPEN' && blockingTypes.includes(gap.type)) {
      addViolation(
        gapLedgerPath,
        `Blocking gap of type ${gap.type} found in ${gap.path}`,
        `Resolve the gap in live code or classify it in gap-burndown-report.json.`,
        'Edit target file to resolve gap.'
      );
    }
  }
}

// 6. Capability validation (unsupported transitions)
if (fs.existsSync(transportPath) && fs.existsSync(policyPath)) {
  const transportContent = fs.readFileSync(transportPath, 'utf8');
  const policyContent = fs.readFileSync(policyPath, 'utf8');

  // Verify locationPush capability
  if (transportContent.includes("unsupportedTransition('captain location push")) {
    if (!policyContent.includes('locationPush: false')) {
      addViolation(
        policyPath,
        'Capability locationPush in policy does not match transport unsupportedTransition.',
        'Set locationPush: false in DSH_CAPTAIN_CONTRACT_CAPABILITIES.',
        'Edit dsh-order-lifecycle.policy.ts'
      );
    }
  }
  // Verify failDelivery capability
  if (transportContent.includes("unsupportedTransition('failed delivery")) {
    if (!policyContent.includes('failDelivery: false')) {
      addViolation(
        policyPath,
        'Capability failDelivery in policy does not match transport unsupportedTransition.',
        'Set failDelivery: false in DSH_CAPTAIN_CONTRACT_CAPABILITIES.',
        'Edit dsh-order-lifecycle.policy.ts'
      );
    }
  }
  // Verify confirmReturn capability
  if (transportContent.includes("unsupportedTransition('return confirmation")) {
    if (!policyContent.includes('confirmReturn: false')) {
      addViolation(
        policyPath,
        'Capability confirmReturn in policy does not match transport unsupportedTransition.',
        'Set confirmReturn: false in DSH_CAPTAIN_CONTRACT_CAPABILITIES.',
        'Edit dsh-order-lifecycle.policy.ts'
      );
    }
  }
}

// 7. Checkboxes and verification proofs
  const hasSuccessfulReconcile = reconReport && (reconReport.status === 'EVIDENCE_RECONCILED_AND_HARD_GATES_ENFORCED' || reconReport.status === 'STILL_BLOCKED_WITH_EXACT_UNRESOLVED_EVIDENCE_GAPS');
  if (!hasSuccessfulReconcile) {
    // If reconciliation gate hasn't passed successfully in command results
    addViolation(
      executionGateMdPath,
      'Typecheck/Lint or Automated Verification checked as passed, but reconciliation report shows failure or missing execution.',
      'Run guard:operational-diagnostics-reconciliation and ensure it passes.',
      'pnpm run guard:operational-diagnostics-reconciliation'
    );
  }

if (gapCount > 0 && executionGateMd.includes('- [x] **No Open Blocking Gaps**')) {
  addViolation(
    executionGateMdPath,
    'No Open Blocking Gaps is checked [x] but there are open gaps in the ledger.',
    'Uncheck No Open Blocking Gaps checkbox.',
    'Edit 15_EXECUTION_GATE.md'
  );
}

// 8. Output results
if (violations.length > 0) {
  console.error('dsh-order-lifecycle-execution-gate: FAIL');
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.message}`);
    console.error(`  Required Fix: ${v.required_fix}`);
    console.error(`  Verification Command: ${v.verification_command}`);
  }
  process.exit(1);
} else {
  console.log('dsh-order-lifecycle-execution-gate: PASS');
  // Update command-results.json with passing result
  if (fs.existsSync(commandResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(commandResultsPath, 'utf8'));
      const existingIndex = results.findIndex(r => r && r.name === 'guard:dsh-order-lifecycle-execution');
      const entry = {
        name: 'guard:dsh-order-lifecycle-execution',
        command: 'pnpm run guard:dsh-order-lifecycle-execution',
        required: true,
        exit_code: 0,
        log: 'tools/guards/dsh-order-lifecycle-execution-gate.mjs'
      };
      if (existingIndex >= 0) {
        results[existingIndex] = entry;
      } else {
        results.push(entry);
      }
      fs.writeFileSync(commandResultsPath, JSON.stringify(results, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write to command-results.json:', e.message);
    }
  }
  process.exit(0);
}
