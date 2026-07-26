import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  validateStateMachine,
  isTransitionLegal,
  validateLedger,
  validateTaskContract,
  validateIterations,
  validateWorkUnitDrift,
} from "./remediation-governance-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const remediationRoot = path.join(repoRoot, "governance", "remediation");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(remediationRoot, name), "utf8"));

const machine = readJson("task-state-machine.json");
const policy = readJson("progressive-remediation-policy.json");
const ledger = readJson("gap-ledger.json");
const profiles = readJson("verification-profiles.json");
const taskContractSchema = readJson("task-contract.schema.json");
const workUnitSchema = readJson("work-unit.schema.json");
const iterationSchema = readJson("iteration-record.schema.json");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(workUnitSchema, "work-unit.schema.json");
const validateContractSchema = ajv.compile(taskContractSchema);
const validateIterationSchema = ajv.compile(iterationSchema);

function baseContract() {
  return {
    schemaVersion: 1,
    task: { id: "GAP-0099", title: "Fixture task", class: "GOVERNANCE", priority: "P1", status: "CONTRACT_READY" },
    source: { repository: "bthwani2-boop/bthwani-suite-next", workBranch: "reemsam", baseSha: "a".repeat(40) },
    problem: {
      statement: "Fixture problem statement for validation.",
      evidenceState: "PROVEN",
      evidence: [{ path: "governance/remediation/README.md" }],
      rootCauseHypothesis: ["Fixture hypothesis."],
    },
    product: { journey: "governance", actors: ["operator"], includedSurfaces: ["repository"], excludedSurfaces: [] },
    behavior: { current: ["Broken."], required: ["Fixed."], forbidden: ["Scope expansion."] },
    scope: { allowedPaths: ["governance/remediation/**"], forbiddenPaths: [".github/**"], maximumChangedFiles: 5, maximumChangedLines: 200 },
    dependencies: { blockedBy: [], blocks: [], sharedContracts: [], sharedGeneratedOutputs: [] },
    agents: {
      required: ["governance"],
      maximumRepairIterations: 3,
      roles: { diagnosedBy: "product-diagnosis", executedBy: "governance-executor", reviewedBy: "independent-reviewer" },
    },
    proof: {
      required: { static: true, contract: false, unit: false, integration: false, database: false, runtime: false, visual: false, native: false, security: false, tenancy: false, performance: false, resilience: false },
      commands: ["pnpm run guard:remediation-governance"],
      scenarios: [{ id: "fixture-valid" }],
    },
    acceptance: [{ id: "AC-001", statement: "The gate passes.", evidenceRequired: ["static"] }],
    cleanup: { temporaryPaths: [], expectedArchivedPaths: [], archivePaths: [] },
    approval: { protectedDomains: [], humanApprovalRequired: false },
    budget: { maxJobs: 20, maxRuntimeMinutes: 120, maxAgentIterations: 3, maxChangedFiles: 20, maxChangedLines: 800, maxArtifactsMb: 250, maxFullScans: 1 },
    confidence: {
      productModel: "NOT_APPLICABLE", static: "PROVEN", contract: "NOT_APPLICABLE", database: "NOT_APPLICABLE",
      runtime: "NOT_APPLICABLE", visual: "NOT_APPLICABLE", native: "NOT_APPLICABLE", security: "NOT_APPLICABLE",
      tenancy: "NOT_APPLICABLE", finance: "NOT_APPLICABLE", performance: "NOT_APPLICABLE", resilience: "NOT_APPLICABLE",
      recovery: "NOT_APPLICABLE",
    },
  };
}

function baseIteration(overrides = {}) {
  return {
    schemaVersion: 1,
    iterationId: "GAP-0099-I01",
    taskId: "GAP-0099",
    iteration: 1,
    loop: "MICRO",
    sourceSha: "a".repeat(40),
    hypothesis: { statement: "Fixture hypothesis statement.", evidence: [], hash: `sha256:${"1".repeat(64)}`, failureFingerprint: "fp-1" },
    plan: { planHash: `sha256:${"2".repeat(64)}`, intendedChanges: ["one"], expectedOutcomes: ["pass"], forbiddenChanges: [] },
    execution: { agentRole: "GOVERNANCE_EXECUTOR", capabilityTier: "T1_BALANCED", changedPaths: [], patchHash: `sha256:${"3".repeat(64)}` },
    observation: { checks: [{ command: "pnpm run guard:remediation-governance", before: "FAIL", after: "PASS" }], unexpectedResults: [] },
    evaluation: { failedGatesBefore: 1, failedGatesAfter: 0, regressionCount: 0, scopeViolationCount: 0, unexpectedDeletionCount: 0, convergence: "IMPROVING" },
    diagnosis: { hypothesisConfirmed: true, newFindings: [], rootCauseState: "CONFIRMED" },
    improve: { missingGuards: [], regressionTestsNeeded: [], reusableRepairScripts: [], blindSpotsFound: [] },
    decision: { status: "CONVERGED" },
    antiThrash: { priorHypothesisHashes: [], priorPatchHashes: [], priorFailureFingerprints: [] },
    ...overrides,
  };
}

test("all shipped remediation instances validate against their schemas", () => {
  const pairs = [
    ["progressive-remediation-policy.json", "progressive-remediation-policy.schema.json"],
    ["task-state-machine.json", "task-state-machine.schema.json"],
    ["gap-ledger.json", "gap-ledger.schema.json"],
    ["risk-classes.json", "risk-classes.schema.json"],
    ["verification-profiles.json", "verification-profiles.schema.json"],
    ["capability-graph.json", "capability-graph.schema.json"],
    ["requirement-traceability.json", "requirement-traceability.schema.json"],
    ["blind-spots.json", "blind-spots.schema.json"],
    ["flaky-tests.json", "flaky-tests.schema.json"],
    ["agent-locks.json", "agent-locks.schema.json"],
    ["cleanup-classification.json", "cleanup-classification.schema.json"],
  ];
  for (const [documentName, schemaName] of pairs) {
    const validate = ajv.compile(readJson(schemaName));
    assert.equal(validate(readJson(documentName)), true, `${documentName}: ${JSON.stringify(validate.errors)}`);
  }
});

test("state machine is internally consistent and forbids repair-to-closed jumps", () => {
  assert.deepEqual(validateStateMachine(machine), []);
  assert.equal(isTransitionLegal(machine, "DISCOVERED", "TRIAGED"), true);
  assert.equal(isTransitionLegal(machine, "RECONCILED", "CLOSED"), true);
  assert.equal(isTransitionLegal(machine, "REPAIRING", "CLOSED"), false);
  assert.equal(isTransitionLegal(machine, "VERIFYING", "CLOSED"), false);
  assert.equal(isTransitionLegal(machine, "INTEGRATED", "CLOSED"), false);
  assert.equal(isTransitionLegal(machine, "DISCOVERED", "INTEGRATED"), false);
});

test("a corrupted machine with an illegal closure edge fails", () => {
  const corrupted = structuredClone(machine);
  corrupted.transitions.REPAIRING = ["VERIFYING", "CLOSED"];
  assert.ok(validateStateMachine(corrupted).includes("FORBIDDEN_TRANSITION_PRESENT REPAIRING -> CLOSED"));
});

test("shipped ledger passes; unknown state or missing blocked reason fails", () => {
  assert.deepEqual(validateLedger(ledger, machine, profiles), []);
  const corrupted = structuredClone(ledger);
  corrupted.gaps[0].state = "IMAGINARY";
  corrupted.gaps[1].state = "BLOCKED";
  corrupted.gaps[1].blocked_reason = "";
  const messages = validateLedger(corrupted, machine, profiles);
  assert.ok(messages.some((message) => message.startsWith("UNKNOWN_GAP_STATE GAP-0001")));
  assert.ok(messages.some((message) => message.startsWith("BLOCKED_WITHOUT_REASON GAP-0002")));
});

test("a valid task contract passes schema and semantic checks", () => {
  const contract = baseContract();
  assert.equal(validateContractSchema(contract), true, JSON.stringify(validateContractSchema.errors));
  assert.deepEqual(validateTaskContract(contract, policy), []);
});

test("a task without allowed paths fails", () => {
  const contract = baseContract();
  contract.scope.allowedPaths = [];
  assert.equal(validateContractSchema(contract), false);
});

test("a task without acceptance criteria fails", () => {
  const contract = baseContract();
  contract.acceptance = [];
  assert.equal(validateContractSchema(contract), false);
});

test("a task without required proof fails", () => {
  const contract = baseContract();
  delete contract.proof.required;
  assert.equal(validateContractSchema(contract), false);
});

test("executor approving own work fails", () => {
  const contract = baseContract();
  contract.agents.roles.reviewedBy = contract.agents.roles.executedBy;
  assert.ok(validateTaskContract(contract, policy).some((message) => message.startsWith("EXECUTOR_APPROVER_NOT_SEPARATED")));
});

test("work unit writing outside frozen scope fails", () => {
  const contract = baseContract();
  contract.workUnits = [{
    work_unit_id: "GAP-0099-WU-001", title: "Fixture", role: "GOVERNANCE_EXECUTOR", objective: "One outcome",
    dependencies: [], risk_level: "LOW", capability_tier: "T1_BALANCED", execution_mode: "WRITE",
    allowed_read_paths: [], allowed_write_paths: ["services/dsh/backend/main.go"], forbidden_paths: [],
    required_context: [], required_skills: [], acceptance_criteria: ["done"], verification_commands: [],
    output_budget: "COMPACT", escalation_conditions: [],
  }];
  assert.ok(validateTaskContract(contract, policy).some((message) => message.includes("WORK_UNIT_WRITE_OUTSIDE_CONTRACT_SCOPE")));
});

test("a fourth iteration is schema-invalid and budget-invalid", () => {
  const fourth = baseIteration({ iterationId: "GAP-0099-I04", iteration: 4 });
  assert.equal(validateIterationSchema(fourth), false);
  const records = [1, 2, 3].map((n) => baseIteration({ iterationId: `GAP-0099-I0${n}`, iteration: n, decision: { status: "REPLAN" } }));
  records.push(baseIteration({ iterationId: "GAP-0099-I03", iteration: 3 }));
  assert.ok(validateIterations(records, policy).some((message) => message.startsWith("ITERATION_BUDGET_EXCEEDED")));
});

test("a repeated patch hash without escalation forces LOOP_NOT_CONVERGING", () => {
  const repeated = baseIteration({
    iterationId: "GAP-0099-I02",
    iteration: 2,
    decision: { status: "REPLAN" },
    antiThrash: { priorHypothesisHashes: [], priorPatchHashes: [`sha256:${"3".repeat(64)}`], priorFailureFingerprints: [] },
  });
  assert.ok(validateIterations([repeated], policy).some((message) => message.startsWith("REPEATED_ATTEMPT_WITHOUT_ESCALATION")));
  repeated.decision.status = "LOOP_NOT_CONVERGING";
  assert.deepEqual(validateIterations([repeated], policy), []);
});

test("convergence claims with open violations fail", () => {
  const record = baseIteration({ evaluation: { failedGatesBefore: 1, failedGatesAfter: 0, regressionCount: 1, scopeViolationCount: 0, unexpectedDeletionCount: 0, convergence: "IMPROVING" } });
  assert.ok(validateIterations([record], policy).some((message) => message.startsWith("CONVERGENCE_WITH_OPEN_VIOLATIONS")));
});

test("work unit schema matches WORK_UNIT_CONTRACT.md verbatim", () => {
  const markdown = fs.readFileSync(
    path.join(repoRoot, ".agents", "skills", "bthwani-cost-aware-subagent-orchestrator", "references", "WORK_UNIT_CONTRACT.md"),
    "utf8",
  );
  assert.deepEqual(validateWorkUnitDrift(workUnitSchema.properties, markdown), []);
  const drifted = { ...workUnitSchema.properties };
  delete drifted.output_budget;
  assert.ok(validateWorkUnitDrift(drifted, markdown).includes("WORK_UNIT_SCHEMA_MISSING_FIELD output_budget"));
});

test("verification profiles reference only registered guards", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "governance", "guards", "guard-registry.json"), "utf8"));
  const ids = new Set((registry.entries ?? registry.guards ?? []).map((entry) => entry.id));
  for (const profile of profiles.profiles) {
    for (const guardIdentifier of profile.guardIds) {
      assert.ok(ids.has(guardIdentifier), `${profile.id} references unregistered guard ${guardIdentifier}`);
    }
  }
});
