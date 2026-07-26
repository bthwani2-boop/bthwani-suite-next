// Orders open gaps by priority (spec §PHASE-5) and dependency readiness, then
// enforces WIP_WRITE_LIMIT=1: a gap whose bounded context is already locked by
// another in-flight task is skipped, not selected.
import { readJson } from "../_remediation-utils.mjs";
import { liveLockRoot, readLiveLock, isExpired } from "../agents/allocate-locks.mjs";
import fs from "node:fs";

const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
const writeStates = new Set(["CONTRACT_READY", "REPAIRING", "VERIFYING", "READY_TO_INTEGRATE", "INTEGRATING"]);

export function dependenciesSatisfied(gap, ledgerById) {
  for (const blockerId of gap.blockedBy ?? []) {
    const blocker = ledgerById.get(blockerId);
    if (blocker && blocker.status !== "CLOSED") return false;
  }
  return true;
}

export function activeWriteLocksByOwner() {
  if (!fs.existsSync(liveLockRoot)) return new Map();
  const owners = new Map();
  for (const name of fs.readdirSync(liveLockRoot).filter((entry) => entry.endsWith(".lock.json"))) {
    const lock = JSON.parse(fs.readFileSync(`${liveLockRoot}/${name}`, "utf8"));
    if (!isExpired(lock)) owners.set(lock.resource, lock.taskId);
  }
  return owners;
}

export function selectNextTask(ledger, { activeTaskIds = new Set() } = {}) {
  const ledgerById = new Map((ledger.gaps ?? []).map((gap) => [gap.gap_id, gap]));
  const open = (ledger.gaps ?? []).filter((gap) => gap.status !== "CLOSED" && gap.state !== "BLOCKED");
  const eligible = open.filter((gap) => dependenciesSatisfied(gap, ledgerById));

  eligible.sort((a, b) => {
    const priorityDelta = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    if (priorityDelta !== 0) return priorityDelta;
    return a.gap_id.localeCompare(b.gap_id);
  });

  const writingElsewhere = [...activeTaskIds].some((taskId) => {
    const gap = ledgerById.get(taskId);
    return gap && writeStates.has(gap.state);
  });

  if (writingElsewhere) {
    return { selected: null, reason: "WIP_WRITE_LIMIT_REACHED", candidates: eligible.map((gap) => gap.gap_id) };
  }

  return { selected: eligible[0] ?? null, candidates: eligible.map((gap) => gap.gap_id) };
}

function main() {
  const ledger = readJson("governance/remediation/gap-ledger.json");
  const activeTaskIds = new Set((ledger.gaps ?? []).filter((gap) => writeStates.has(gap.state)).map((gap) => gap.gap_id));
  const result = selectNextTask(ledger, { activeTaskIds });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.selected ? 0 : 1);
}

if (process.argv[1]?.endsWith("select-next-task.mjs")) main();
