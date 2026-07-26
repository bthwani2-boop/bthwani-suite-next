import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "remediation-governance-gate";
const remediationRoot = "governance/remediation";

const schemaPairs = [
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

export function validateStateMachine(machine) {
  const violations = [];
  const states = new Set(machine.states ?? []);
  const transitions = machine.transitions ?? {};
  if (!states.has(machine.initialState)) violations.push(`INITIAL_STATE_UNKNOWN ${machine.initialState}`);
  for (const terminal of machine.terminalStates ?? []) {
    if (!states.has(terminal)) violations.push(`TERMINAL_STATE_UNKNOWN ${terminal}`);
    if ((transitions[terminal] ?? []).length > 0) violations.push(`TERMINAL_STATE_HAS_EXITS ${terminal}`);
  }
  for (const state of states) {
    if (!(state in transitions)) violations.push(`STATE_WITHOUT_TRANSITION_ENTRY ${state}`);
  }
  for (const [from, targets] of Object.entries(transitions)) {
    if (!states.has(from)) violations.push(`TRANSITION_FROM_UNKNOWN_STATE ${from}`);
    for (const to of targets) if (!states.has(to)) violations.push(`TRANSITION_TO_UNKNOWN_STATE ${from} -> ${to}`);
  }
  for (const { from, to } of machine.forbiddenTransitions ?? []) {
    if ((transitions[from] ?? []).includes(to)) violations.push(`FORBIDDEN_TRANSITION_PRESENT ${from} -> ${to}`);
  }
  const reachable = new Set([machine.initialState]);
  const queue = [machine.initialState];
  while (queue.length) {
    for (const next of transitions[queue.shift()] ?? []) {
      if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
    }
  }
  for (const state of states) if (!reachable.has(state)) violations.push(`STATE_UNREACHABLE ${state}`);
  return violations;
}

export function isTransitionLegal(machine, from, to) {
  return (machine.transitions?.[from] ?? []).includes(to);
}

export function validateLedger(ledger, machine, profiles) {
  const violations = [];
  const states = new Set(machine.states ?? []);
  const types = new Set(ledger.gapTypes ?? []);
  const profileIds = new Set((profiles.profiles ?? []).map((p) => p.id));
  const seen = new Set();
  for (const gap of ledger.gaps ?? []) {
    if (seen.has(gap.gap_id)) violations.push(`DUPLICATE_GAP_ID ${gap.gap_id}`);
    seen.add(gap.gap_id);
    if (!types.has(gap.type)) violations.push(`UNKNOWN_GAP_TYPE ${gap.gap_id}: ${gap.type}`);
    if (!states.has(gap.state)) violations.push(`UNKNOWN_GAP_STATE ${gap.gap_id}: ${gap.state}`);
    if (!profileIds.has(gap.verification_profile)) violations.push(`UNKNOWN_VERIFICATION_PROFILE ${gap.gap_id}: ${gap.verification_profile}`);
    if (gap.state === "BLOCKED" && !gap.blocked_reason) violations.push(`BLOCKED_WITHOUT_REASON ${gap.gap_id}`);
    if (gap.state === "CLOSED" && gap.status !== "CLOSED") violations.push(`STATE_STATUS_MISMATCH ${gap.gap_id}`);
  }
  return violations;
}

export function validateTaskContract(contract, policy) {
  const violations = [];
  const id = contract?.task?.id ?? "UNKNOWN";
  const roles = contract?.agents?.roles ?? {};
  if (roles.executedBy && roles.reviewedBy && roles.executedBy === roles.reviewedBy) {
    violations.push(`EXECUTOR_APPROVER_NOT_SEPARATED ${id}`);
  }
  if (roles.diagnosedBy && roles.executedBy && roles.diagnosedBy === roles.executedBy) {
    violations.push(`DIAGNOSIS_EXECUTION_NOT_SEPARATED ${id}`);
  }
  if ((contract?.agents?.maximumRepairIterations ?? 0) > (policy?.maxRepairIterations ?? 3)) {
    violations.push(`REPAIR_ITERATIONS_EXCEED_POLICY ${id}`);
  }
  const scope = contract?.scope ?? {};
  const budget = contract?.budget ?? {};
  if (scope.maximumChangedFiles > budget.maxChangedFiles) violations.push(`SCOPE_FILES_EXCEED_BUDGET ${id}`);
  if (scope.maximumChangedLines > budget.maxChangedLines) violations.push(`SCOPE_LINES_EXCEED_BUDGET ${id}`);
  const allowed = scope.allowedPaths ?? [];
  for (const unit of contract?.workUnits ?? []) {
    for (const writePath of unit.allowed_write_paths ?? []) {
      const inside = allowed.some((prefix) => writePath === prefix || writePath.startsWith(prefix.replace(/\*+$/, "")));
      if (!inside) violations.push(`WORK_UNIT_WRITE_OUTSIDE_CONTRACT_SCOPE ${id}: ${unit.work_unit_id} -> ${writePath}`);
    }
  }
  return violations;
}

export function validateIterations(records, policy) {
  const violations = [];
  const byTask = new Map();
  for (const record of records) {
    const list = byTask.get(record.taskId) ?? [];
    list.push(record);
    byTask.set(record.taskId, list);
  }
  for (const [taskId, list] of byTask) {
    list.sort((a, b) => a.iteration - b.iteration);
    if (list.length > (policy?.maxRepairIterations ?? 3)) violations.push(`ITERATION_BUDGET_EXCEEDED ${taskId}`);
    const seen = new Set();
    for (const record of list) {
      if (seen.has(record.iteration)) violations.push(`DUPLICATE_ITERATION_NUMBER ${record.iterationId}`);
      seen.add(record.iteration);
      const prior = record.antiThrash ?? {};
      const escalations = new Set(["LOOP_NOT_CONVERGING", "REDIAGNOSE", "TASK_SPLIT_REQUIRED"]);
      const evaluation = record.evaluation ?? {};
      // Repeating the same hypothesis or the same patch is always a literal repeat of
      // one attempt and requires escalation. A repeated failureFingerprint is not, by
      // itself: the fingerprint identifies which bug a converging sequence of
      // iterations is working on, and naturally stays constant while the hypothesis
      // and patch legitimately evolve toward a fix. It only signals thrash when the
      // fingerprint repeats AND this iteration still failed to converge (stalled or
      // degrading) — i.e. the same failure recurred with no real progress.
      const repeated =
        (prior.priorHypothesisHashes ?? []).includes(record.hypothesis?.hash) ||
        (record.execution?.patchHash && (prior.priorPatchHashes ?? []).includes(record.execution.patchHash)) ||
        (record.hypothesis?.failureFingerprint &&
          (prior.priorFailureFingerprints ?? []).includes(record.hypothesis.failureFingerprint) &&
          evaluation.convergence !== "IMPROVING");
      if (repeated && !escalations.has(record.decision?.status)) {
        violations.push(`REPEATED_ATTEMPT_WITHOUT_ESCALATION ${record.iterationId}`);
      }
      if (["CONVERGED", "PASS"].includes(record.decision?.status)) {
        if ((evaluation.regressionCount ?? 0) !== 0 || (evaluation.scopeViolationCount ?? 0) !== 0 || (evaluation.unexpectedDeletionCount ?? 0) !== 0) {
          violations.push(`CONVERGENCE_WITH_OPEN_VIOLATIONS ${record.iterationId}`);
        }
      }
      if (evaluation.convergence === "IMPROVING" && evaluation.failedGatesAfter > evaluation.failedGatesBefore) {
        violations.push(`IMPROVING_CLAIM_WITHOUT_IMPROVEMENT ${record.iterationId}`);
      }
    }
  }
  return violations;
}

export function validateWorkUnitDrift(schemaProperties, contractMarkdown) {
  const violations = [];
  const block = contractMarkdown.match(/## Assignment schema\s*```json\s*([\s\S]*?)```/);
  if (!block) return ["WORK_UNIT_CONTRACT_ASSIGNMENT_BLOCK_MISSING"];
  let reference;
  try {
    reference = JSON.parse(block[1]);
  } catch (error) {
    return [`WORK_UNIT_CONTRACT_ASSIGNMENT_BLOCK_INVALID ${error.message}`];
  }
  const referenceFields = new Set(Object.keys(reference));
  const schemaFields = new Set(Object.keys(schemaProperties ?? {}));
  for (const field of referenceFields) if (!schemaFields.has(field)) violations.push(`WORK_UNIT_SCHEMA_MISSING_FIELD ${field}`);
  for (const field of schemaFields) if (!referenceFields.has(field)) violations.push(`WORK_UNIT_SCHEMA_EXTRA_FIELD ${field}`);
  return violations;
}

function main() {
  const violations = [];
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const readJson = (relative) => {
    const full = path.join(repoRoot, relative);
    if (!fs.existsSync(full)) {
      violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" });
      return undefined;
    }
    try {
      return JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (error) {
      violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
      return undefined;
    }
  };

  const documents = new Map();
  const workUnitSchema = readJson(`${remediationRoot}/work-unit.schema.json`);
  const taskContractSchema = readJson(`${remediationRoot}/task-contract.schema.json`);
  const iterationSchema = readJson(`${remediationRoot}/iteration-record.schema.json`);
  if (workUnitSchema) {
    try { ajv.addSchema(workUnitSchema, "work-unit.schema.json"); } catch (error) {
      violations.push({ file: `${remediationRoot}/work-unit.schema.json`, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    }
  }
  for (const [documentName, schemaName] of schemaPairs) {
    const documentRelative = `${remediationRoot}/${documentName}`;
    const schemaRelative = `${remediationRoot}/${schemaName}`;
    const document = readJson(documentRelative);
    const schema = readJson(schemaRelative);
    if (!document || !schema) continue;
    documents.set(documentName, document);
    try {
      const validate = ajv.compile(schema);
      if (!validate(document)) {
        for (const issue of validate.errors ?? []) {
          violations.push({ file: documentRelative, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
        }
      }
    } catch (error) {
      violations.push({ file: schemaRelative, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    }
  }

  const policy = documents.get("progressive-remediation-policy.json");
  const machine = documents.get("task-state-machine.json");
  const ledger = documents.get("gap-ledger.json");
  const profiles = documents.get("verification-profiles.json");

  if (machine) {
    for (const message of validateStateMachine(machine)) {
      violations.push({ file: `${remediationRoot}/task-state-machine.json`, line: 0, message });
    }
  }
  if (ledger && machine && profiles) {
    for (const message of validateLedger(ledger, machine, profiles)) {
      violations.push({ file: `${remediationRoot}/gap-ledger.json`, line: 0, message });
    }
  }

  const guardRegistry = readJson("governance/guards/guard-registry.json");
  if (profiles && guardRegistry) {
    const registeredIds = new Set((guardRegistry.entries ?? guardRegistry.guards ?? []).map((entry) => entry.id));
    for (const profile of profiles.profiles ?? []) {
      for (const requiredGuard of profile.guardIds ?? []) {
        if (!registeredIds.has(requiredGuard)) {
          violations.push({ file: `${remediationRoot}/verification-profiles.json`, line: 0, message: `PROFILE_REFERENCES_UNREGISTERED_GUARD ${profile.id}: ${requiredGuard}` });
        }
      }
    }
  }

  const contractMarkdownRelative = ".agents/skills/bthwani-cost-aware-subagent-orchestrator/references/WORK_UNIT_CONTRACT.md";
  const contractMarkdownPath = path.join(repoRoot, contractMarkdownRelative);
  if (workUnitSchema && fs.existsSync(contractMarkdownPath)) {
    for (const message of validateWorkUnitDrift(workUnitSchema.properties, fs.readFileSync(contractMarkdownPath, "utf8"))) {
      violations.push({ file: `${remediationRoot}/work-unit.schema.json`, line: 0, message });
    }
  } else if (!fs.existsSync(contractMarkdownPath)) {
    violations.push({ file: contractMarkdownRelative, line: 0, message: "MISSING_REQUIRED_FILE" });
  }

  const tasksRoot = path.join(repoRoot, remediationRoot, "tasks");
  const taskContracts = [];
  if (fs.existsSync(tasksRoot) && taskContractSchema) {
    let validateContract;
    try { validateContract = ajv.compile(taskContractSchema); } catch (error) {
      violations.push({ file: `${remediationRoot}/task-contract.schema.json`, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    }
    for (const bucket of ["active", "blocked", "completed", "archived"]) {
      const bucketPath = path.join(tasksRoot, bucket);
      if (!fs.existsSync(bucketPath)) continue;
      for (const entry of fs.readdirSync(bucketPath).filter((name) => name.endsWith(".json"))) {
        const relative = `${remediationRoot}/tasks/${bucket}/${entry}`;
        const contract = readJson(relative);
        if (!contract) continue;
        taskContracts.push(contract);
        if (validateContract && !validateContract(contract)) {
          for (const issue of validateContract.errors ?? []) {
            violations.push({ file: relative, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
          }
        }
        for (const message of validateTaskContract(contract, policy)) {
          violations.push({ file: relative, line: 0, message });
        }
      }
    }
  }

  const iterationsRoot = path.join(repoRoot, remediationRoot, "iterations");
  const iterationRecords = [];
  if (fs.existsSync(iterationsRoot) && iterationSchema) {
    let validateIteration;
    try { validateIteration = ajv.compile(iterationSchema); } catch (error) {
      violations.push({ file: `${remediationRoot}/iteration-record.schema.json`, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    }
    for (const taskDir of fs.readdirSync(iterationsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      for (const entry of fs.readdirSync(path.join(iterationsRoot, taskDir.name)).filter((name) => name.endsWith(".json"))) {
        const relative = `${remediationRoot}/iterations/${taskDir.name}/${entry}`;
        const record = readJson(relative);
        if (!record) continue;
        iterationRecords.push(record);
        if (validateIteration && !validateIteration(record)) {
          for (const issue of validateIteration.errors ?? []) {
            violations.push({ file: relative, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
          }
        }
      }
    }
    for (const message of validateIterations(iterationRecords, policy)) {
      violations.push({ file: `${remediationRoot}/iterations`, line: 0, message });
    }
  }

  if (ledger) {
    const ledgerIds = new Set((ledger.gaps ?? []).map((gap) => gap.gap_id));
    for (const contract of taskContracts) {
      const id = contract?.task?.id;
      if (id && !ledgerIds.has(id)) {
        violations.push({ file: `${remediationRoot}/gap-ledger.json`, line: 0, message: `TASK_CONTRACT_WITHOUT_LEDGER_ENTRY ${id}` });
      }
    }
  }

  fail(guardId, violations);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
