# BThwani Progressive Engineering and Remediation System

Status: ACTIVE_CANONICAL for the progressive-remediation domain. Conflicts resolve through `governance/authority/authority-precedence.json`; decision words come from `governance/contracts/decision-vocabulary.json`.

This directory is the governance layer of the progressive remediation system: one gap at a time, contract-frozen scope, isolated child branch, independent review, same-commit evidence, merge to the work branch only, cleanup, baseline reconciliation, then the next gap. It layers **on top of** the existing agent layer — Task Contracts sit above the Work Unit Contract defined in `.agents/skills/bthwani-cost-aware-subagent-orchestrator/references/WORK_UNIT_CONTRACT.md`, and Iteration Records sit below work units.

## Non-negotiable invariants

- Zero false success, zero claims without evidence, zero known-but-unrecorded gaps, zero out-of-scope writes, zero unproven deletions, zero phase-skipping, zero merges to `master` without an explicit human decision.
- `WIP_WRITE_LIMIT = 1` per bounded context; `MAX_REPAIR_ITERATIONS = 3`; two attempts maximum for the same unchanged assertion.
- The executor never approves its own work. Missing required evidence resolves to `NEEDS_EVIDENCE`, never partial success.
- Archival over deletion: retired material is merged, moved, or archived — never destroyed.

## Files

| File | Purpose |
| --- | --- |
| `progressive-remediation-policy.json` | Machine-readable invariants and the disabled auto-merge conditions |
| `task-state-machine.json` | The 16 task states and the only legal transitions |
| `task-contract.schema.json` | Contract every task instance must satisfy before execution starts |
| `work-unit.schema.json` | Verbatim projection of the Work Unit Contract (drift-checked by the gate) |
| `gap-ledger.json` | The tracked ledger of every known gap and its state |
| `risk-classes.json` | Risk class to capability tier to minimum verification profile |
| `verification-profiles.json` | Named proof profiles over the 22 verification dimensions |
| `capability-graph.json` | Product model graph (populated progressively) |
| `requirement-traceability.json` | Requirement to gap to task to evidence links |
| `blind-spots.json` | Known-unknowable areas with review cadence |
| `flaky-tests.json` | Flaky test lifecycle registry |
| `agent-locks.json` | Globally locked resources and lock modes; live locks stay untracked |
| `cleanup-classification.json` | Cleanup and dead-code classification vocabulary |
| `iterations/` | Engineering-loop iteration records per task |
| `tasks/` | Task contract instances (`active/`, `blocked/`, `completed/`, `archived/`) |

Every `*.json` instance validates against its sibling `*.schema.json` through `pnpm run guard:remediation-governance` (`tools/guards/remediation-governance-gate.mjs`). Instances are JSON, not YAML, so validation needs no new dependency.

## Task path

```text
DISCOVERED -> TRIAGED -> QUEUED -> DIAGNOSING -> CONTRACT_READY -> REPAIRING
-> VERIFYING -> READY_TO_INTEGRATE -> INTEGRATING -> INTEGRATED -> CLEANING
-> CLEANED -> RECONCILED -> CLOSED
```

`BLOCKED` is reachable from `TRIAGED`, `DIAGNOSING`, and `FIX_REQUIRED` and exits only to `TRIAGED`. `REPAIRING`, `VERIFYING`, and `INTEGRATED` can never jump to `CLOSED`.

## Authorities

The five technical authorities map onto existing components: Progressive Orchestrator (`tools/remediation/orchestrator/`), Agent Controller (the governed local agent layer — CI never writes source), Specialized Workflows (`task-*.yml`), Evidence Engine (`tools/remediation/evidence/`), and this Gap and Capability Registry. Coordination stays split across the existing skills: workspace authority, task router, product truth governor, cost-aware orchestrator, evidence gate router, SDLC stage gates, independent reviewer, and the final closure judge.
