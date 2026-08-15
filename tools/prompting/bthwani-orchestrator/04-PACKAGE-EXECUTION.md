# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: package lifecycle, JIT Sequence creation, write gates, root treatment, cutover and target integration.

## 1) Package topology

```text
NEW INVOCATION
→ unique TASK_ID/TASK_NAME
→ TASK_BRANCH from exact latest INTEGRATION_TARGET SHA
→ isolated workspace
→ new flat Package V2
→ sibling machine registry directory
```

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
└── NNN-<sequence>.md

plans/diagnose-implementing/_machine/<TASK_NAME>/
├── operational-root.json
├── lower-layer-observations.json
└── root-cause-landscape.json
```

Existing Package resume فقط بطلب مستخدم صريح للحزمة نفسها.

## 2) Overview vs machine ownership

Overview يملك identity/isolation/root/frontier/registry/accounting/closure summary. Machine registries تملك operational coverage/lower-layer hold/root-cause priority proof. Header لا يصنع machine PASS.

## 3) Bootstrap

```text
resolve latest target
→ create dedicated Task Branch
→ LOCAL: dedicated Worktree / REMOTE: Task Branch isolation
→ prove isolation
→ create package + machine registries OPEN
→ lock TARGET/ORCHESTRATION_ROOT/diagnostic altitude
```

## 4) Before first Sequence

```text
operational breadth/deepening needed for coverage
→ operational negative-space/adversarial
→ operational-root-gate PASS
→ findings + RC clusters
→ competitive deepening
→ root-cause-priority-gate PASS
→ frontier-derivation-gate --phase derive --cluster RC-NNN PASS
→ create Sequence JIT
```

No speculative future sequences, no fixed domain tree, no Sequence per Finding.

## 5) Sequence boundary

One Sequence = one coherent proven RC treatment/execution/verification/closure unit. It records cluster, priority basis, operational graph position, journeys/states/authorities/handoffs/truth owners impacted, dependencies/consumers, conflict domain, owner, verification and cleanup.

Allowed priority classes:

```text
PRIMARY_SYSTEMIC
UPSTREAM_FOUNDATION
INDEPENDENT_PARALLEL
DEPENDENT_SECONDARY
LEAF_LOCAL
```

## 6) Live write gate

Before Product/Runtime/Data/package execution write:

```text
canonical task-isolation gate PASS
canonical root-anchor gate PASS
canonical operational-root gate PASS
canonical root-cause-priority gate PASS
canonical frontier-derivation gate PASS
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
DECISION_IMPACT_PROPAGATED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
FINDINGS_DISPOSITIONED=YES
DEPENDENCIES_DISPOSITIONED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
CONFLICT_DOMAIN classified
EXECUTION_OWNER assigned
```

كلها على same reconciled truth.

## 7) Diagnostic blocker exception

قبل Operational PASS لا كتابة تقنية إلا `DIAGNOSTIC_BLOCKER` مثبت يمنع اكتساب الحقيقة نفسها. سجّل السبب والحد الأدنى للتغيير، تحقق أنه لا يغير Product semantics دون قرار، ثم عد فورًا للـOperational diagnosis. CI/lint/UI bug ليس blocker تلقائيًا.

## 8) Root treatment / coherent cutover

```text
highest proven root fix/refactor/redesign/rebuild
→ canonical owner
→ required writers/readers/consumers
→ contracts/data/generated sync/migrations
→ cross-surface behavior
→ obsolete/parallel truth removal
→ cleanup
→ canonical readback/runtime verification
```

No COMPLETE مع required consumer/migration/contradictory truth/reachable obsolete path/workaround/unclassified scope delta.

## 9) Reuse before create

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`. Create New آخر خيار بعد relationship/consumer search.

## 10) Backtracking

إذا ظهر upstream root أعلى:

```text
current = SUSPENDED_BY_DEPENDENCY
→ update operational/RC machine registries
→ invalidate affected rank/frontier
→ rerank
→ open upstream JIT only after gates
→ fix/verify upstream
→ invalidate descendants
→ resume only after current re-justification
```

## 11) Parallel writes

Read-only diagnosis واسع بالتوازي. Live writes فقط عندما RCs `INDEPENDENT_PARALLEL` + semantic conflict domains مستقلة + isolated worker branches/worktrees + execution owners. Outputs integrate into Task Branch أولًا.

## 12) Post-sequence reconciliation

بعد PREPARED/COMPLETE/material evidence:

```text
update operational nodes if affected
→ findings/RC state
→ dependency/blocking/blast-radius/risk/unlock
→ rerank affected open RCs
→ challenge next frontier
```

لا `SEQ-NNN+1` ميكانيكي.

## 13) Integration gate

Task Branch success ≠ target closure.

```text
task integration unit ready
→ resolve latest INTEGRATION_TARGET
→ classify foreign movement
→ reconcile/rebase/rebuild semantically
→ invalidate/reacquire affected operational/priority/evidence
→ rerun required gates/checks
→ assign one INTEGRATION_OWNER
→ non-force/fast-forward-safe integration
→ re-resolve target
→ INTEGRATION_COMPLETE=YES only after exact result proven on target
```

## 14) MODE

`PREPARE_ONLY`: diagnose/decide/prepare exact cutover/cleanup/verification; no Product/Runtime/Data mutation. Package may be integrated as authoritative handoff when governance permits.

`EXECUTE_END_TO_END`: execute root treatments after all gates, verify, reconcile/rerank until no authorized material work remains and closure gates pass.
