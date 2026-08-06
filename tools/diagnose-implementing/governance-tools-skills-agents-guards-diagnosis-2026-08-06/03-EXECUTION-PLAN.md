# Execution Plan — governance-tools-skills-agents-guards-diagnosis-2026-08-06

> Planning does not authorize implementation. Re-pin `abbas` before every write batch and stop on unexpected branch movement.

## 1. Planning baseline

```yaml
repository: bthwani2-boop/bthwani-suite-next
target_branch: abbas
pinned_start_sha: af1344c605983c2864d6a6f0a138c162446c69ae
requested_mode: DIAGNOSIS_AND_PLAN_ONLY
execution_authorization: NOT_AUTHORIZED
plan_status: READY_FOR_REVIEW
one_work_item_at_a_time: true
```

## 2. Dependency order

Authority and source ownership must converge before deleting legacy paths. Namespace cleanup and environment evidence must complete before guard aggregation. CI routing must be proven before external branch enforcement can be evaluated. Final closure requires all prior work and current external evidence.

## 3. Phase index

| Phase | Outcome | Findings | Preconditions | Exit gate | Status |
| --- | --- | --- | --- | --- | --- |
| PHASE-00 | Baseline, authority, inventory and diagnosis package | All | Exact remote SHA | Strict package validation | COMPLETE |
| PHASE-01 | Authority, adapter and tool-truth convergence | FND-0001, FND-0002, FND-0003 | PHASE-00 | Cross-registry authority gate | PLANNED |
| PHASE-02 | Skill/tool namespace cleanup and environment evidence | FND-0007, FND-0008 | PHASE-01 | Reference and toolchain verification | PLANNED |
| PHASE-03 | Guard aggregation, CI routing and same-commit evidence | FND-0004, FND-0005 | PHASE-01, PHASE-02 | CI and guard reachability gate | PLANNED |
| PHASE-04 | Master ruleset convergence and activation | FND-0006 | PHASE-03 | Live ruleset and focused CI gates | PLANNED |
| PHASE-05 | End-to-end closure and package disposal readiness | FND-0009 | PHASE-04 | All applicable zero gates | PLANNED |

## 4. Work-item order

| Order | Work item | Atomic outcome | Depends on | Verification |
| ---: | --- | --- | --- | --- |
| 1 | TASK-0001 | Converge LeanCTX lifecycle authority | None | VER-0001 |
| 2 | TASK-0002 | Normalize platform adapter registration | TASK-0001 | VER-0002 |
| 3 | TASK-0003 | Unify tool catalog authority and projections | TASK-0002 | VER-0003 |
| 4 | TASK-0004 | Remove retired tool policies from active skill namespace | TASK-0003 | VER-0004 |
| 5 | TASK-0005 | Define and execute AI tool environment evidence contract | TASK-0003 | VER-0005 |
| 6 | TASK-0006 | Create one fail-closed agent-system guard aggregate | TASK-0003, TASK-0004, TASK-0005 | VER-0006 |
| 7 | TASK-0007 | Require same-commit CI evidence for agent-system changes | TASK-0006 | VER-0007 |
| 8 | TASK-0008 | Converge and enable master branch enforcement | TASK-0007 | VER-0008 |
| 9 | TASK-0009 | Run end-to-end agent-system closure verification | TASK-0001, TASK-0002, TASK-0003, TASK-0004, TASK-0005, TASK-0006, TASK-0007, TASK-0008 | VER-0009 |

Only the first eligible work item may be `IN_PROGRESS`. A dependent task may not start while any prerequisite finding, failed check, unverified deletion or internal blocker remains nonzero.

## 5. Migration and deletion sequence

1. Select canonical ownership and lifecycle state.
2. Generate or update projections and migrate all consumers.
3. Search source, workflows, documentation and configuration for legacy references.
4. Run focused guards and host verification after the last write.
5. Delete retired paths only after zero references and replacement readiness.
6. Re-run the same checks on the deletion commit.
7. Preserve rollback as a normal revert; never force-push.

## 6. Verification strategy

- Static registry and projection checks prove only structural consistency.
- Tool version/verification commands prove only the named workstation environment.
- GitHub workflow checks prove only the exact commit and workflow scope.
- Live GitHub evidence proves the master ruleset exists but is disabled and bound to stale contexts; enabling it unchanged is prohibited.
- No check in this plan proves DSH/WLT runtime or production behavior.

## 7. Per-phase zero gate

```yaml
open_internal_findings: 0
failed_required_checks: 0
unverified_required_behaviors: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unverified_deletions: 0
unresolved_internal_blockers: 0
```

## 8. Commit and remote protocol

For each task: re-pin the branch, compare with the recorded predecessor, execute one atomic unit, run checks after the final write, commit only that unit, push without force, re-pin, and attach the resulting SHA to the task and verification records.

## 9. Rollback

Each task is one logical commit. Revert the failed task commit, restore canonical registries and projections together, preserve failure evidence, and rerun the same focused checks. Deletions must be reversible through Git history and a migration-first consumer plan.

## 10. Plan-readiness gate

```yaml
unclassified_inventory_items: 0
findings_without_evidence: 0
findings_without_root_cause: 0
internal_findings_without_work_items: 0
work_items_without_acceptance_criteria: 0
work_items_without_verification: 0
unresolved_template_markers: 0
dependency_cycles: 0
```
