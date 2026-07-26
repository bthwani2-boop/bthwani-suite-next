// The sole transition authority: given a current state and a requested next state,
// consults governance/remediation/task-state-machine.json and returns whether the
// move is legal. No other script may move a task's state.
import { readJson } from "../_remediation-utils.mjs";

export function validateTransition(machine, from, to) {
  if (!machine.states.includes(from)) return { legal: false, reason: `UNKNOWN_CURRENT_STATE ${from}` };
  if (!machine.states.includes(to)) return { legal: false, reason: `UNKNOWN_TARGET_STATE ${to}` };
  const forbidden = (machine.forbiddenTransitions ?? []).find((entry) => entry.from === from && entry.to === to);
  if (forbidden) return { legal: false, reason: `FORBIDDEN_TRANSITION ${forbidden.reason}` };
  const allowed = (machine.transitions[from] ?? []).includes(to);
  return allowed ? { legal: true } : { legal: false, reason: `NOT_IN_LEGAL_TRANSITION_SET ${from} -> ${to}` };
}

function main() {
  const [from, to] = process.argv.slice(2);
  if (!from || !to) {
    console.error("usage: validate-transition.mjs <from-state> <to-state>");
    process.exit(2);
  }
  const machine = readJson("governance/remediation/task-state-machine.json");
  const result = validateTransition(machine, from, to);
  console.log(JSON.stringify({ from, to, ...result }, null, 2));
  process.exit(result.legal ? 0 : 1);
}

if (process.argv[1]?.endsWith("validate-transition.mjs")) main();
