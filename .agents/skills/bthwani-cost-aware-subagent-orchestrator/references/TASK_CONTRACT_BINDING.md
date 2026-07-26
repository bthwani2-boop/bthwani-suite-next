# TASK_CONTRACT_BINDING

How a progressive-remediation task contract (`governance/remediation/task-contract.schema.json`) binds to this skill's Work Unit Contract (`WORK_UNIT_CONTRACT.md`). The task contract is the parent; work units are dispatched under it and never exceed what it froze.

## Field inheritance

| Task contract field | Work unit field | Rule |
| --- | --- | --- |
| `task.id` | `work_unit_id` prefix | Every dispatched unit's id starts with the task id, e.g. `GAP-0007-WU-001`. |
| `scope.allowedPaths` | `allowed_write_paths` | Each unit's write paths must be a subset of the task's frozen paths; never a superset. |
| `scope.forbiddenPaths` | `forbidden_paths` | The union of task-level and unit-level forbidden paths applies; a unit cannot un-forbid a task-forbidden path. |
| `agents.roles` (`diagnosedBy`/`executedBy`/`reviewedBy`) | `role` | The unit's `role` must be consistent with the task's declared `executedBy`; a unit never assigns itself the `reviewedBy` role. |
| risk class (from `governance/remediation/risk-classes.json`, driven by the task's touched domains) | `capability_tier` ceiling | No unit's tier may exceed the ceiling implied by the task's risk class. |
| `budget.maxAgentIterations` | Micro-loop attempt cap | Bounds how many corrective work units one hypothesis may spend before `bthwani-engineering-loop-controller` must change the hypothesis or escalate. |
| `acceptance[]` | `acceptance_criteria` | Every unit's acceptance criteria must trace back to at least one task-level acceptance id; untraceable criteria are out of scope. |

## Sequencing

1. `bthwani-engineering-loop-controller` freezes or reads the task contract and computes the current iteration's plan.
2. This skill (`bthwani-cost-aware-subagent-orchestrator`) receives the plan's work-unit list, builds the dependency DAG, and dispatches units under the inherited constraints above.
3. Unit results return to the loop controller, which records the iteration, evaluates convergence, and decides `REPLAN`, `CONVERGED`, `LOOP_NOT_CONVERGING`, `REDIAGNOSE`, or `TASK_SPLIT_REQUIRED`.
4. This skill never itself decides task-level convergence or closure; it returns unit results and one scoped coordination decision, as its own `SKILL.md` already states.

## What this does not change

This binding adds no new authority to either skill. The orchestrator↔reviewer conflict, the loop-controller↔reviewer conflict, and every existing authority boundary in both skills' `SKILL.md` files apply unchanged.
