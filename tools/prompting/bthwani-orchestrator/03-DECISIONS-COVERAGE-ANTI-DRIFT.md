# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

## 1) القاعدة الدستورية

```text
EVERY DISCOVERED MATERIAL THING → RELATION GRAPH + COVERAGE STATUS.
EVERY DEFECT/GAP/CONTRADICTION → FINDING ID.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA ID.
EVERY TRUE DECISION → DECISION ID.
EVERY DECISION → FULL IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY PROVEN CLOSURE BOUNDARY → SEQUENCE REGISTRY.
EVERY REQUIRED PROOF → EVIDENCE ID.
NO SILENT MATERIAL ELEMENT.
```

## 2) Universe / Coverage

احصر حسب الانطباق Domains/Journeys/Actors/Surfaces/Routes/States/Actions/Transitions/Handoffs/Contracts/Services/Data Owners/Writers/Readers/Consumers/Runtime/Configs/Verification owners.

Coverage: `UNVISITED / IN_PROGRESS / PROVEN / CONTRADICTED / DECISION_REQUIRED / BLOCKED_EXTERNAL / NOT_APPLICABLE_WITH_PROOF`.

## 3) Bidirectional / Multi-Directional Traceability

```text
Journey → Code/Contract/Data/Runtime
AND reverse
AND cross-surface
AND cross-owner
AND temporal/failure/recovery paths
```

الـGraph لا يُعامل كسلسلة خطية.

## 4) Findings / Scope Delta

كل Finding مادي يسجل ID، ACTUAL/INTENDED/DESIRED/CONFLICT، evidence، hypotheses، root cause/missing proof، owner، consumers، blast radius، risk، status، required action/decision/verification، sequence placement، reopen trigger.

أي Scope Delta:

```text
DISCOVERED → CLASSIFY RELATION → ADD TO GRAPH → IMPACT ANALYSIS
→ IN_SCOPE | SUPPORTED_EXCLUSION | MATERIAL_UNCERTAIN
→ DISPOSITION
```

## 5) Decision Boundary + Propagation

ابدأ `QUESTION_CANDIDATE`، وحاول حسمه من authority/product truth/code/contracts/data/permissions/tests/runtime. لا يصل للمستخدم إلا قرار غير قابل للاشتقاق.

بعد الحسم:

```text
DECISION
→ full proven impact graph
→ writers/readers/consumers/contracts/states/data/surfaces/governance/runtime
→ invalidate affected assumptions/evidence
→ re-diagnose
```

لا يؤجل فهم الأثر إلى Sequence لاحقة.

## 6) Finding Disposition Rule

كل Finding جديدة فورًا تصبح:

```text
SAME_ROOT_CAUSE → current Sequence
UPSTREAM_OR_BLOCKER → structured backtrack
INDEPENDENT_IN_SCOPE → later/parallel proven Sequence
SUPPORTED_EXCLUSION → proof + reopen trigger
```

`IGNORE` وsilent TODO ممنوعان.

## 7) Sequence Derivation

Sequence = أصغر Closure Unit متماسكة. الفصل مبرر عند Root Cause/Canonical Owner/Hard Dependency/State-Journey/Verification-Runtime/Protected Risk/Consumer Migration/Governance boundary مستقل.

ادمج الأعراض عندما تشترك في Root Cause + Owner + Migration + Verification boundary.

## 8) Registry / Frontier Discipline

`00-OVERVIEW.md` يسجل:

```text
SEQUENCE_ID / FILE / SUBJECT / DERIVATION_BASIS
DEPENDS_ON / UNLOCKS / CONFLICT_DOMAIN
EXECUTION_OWNER / STATUS / REOPEN_TRIGGER
```

قواعد:

```text
one row ↔ one sequence file
contiguous sequence IDs as creation history, not execution chain
no placeholder future sequences
multiple non-terminal sequences allowed only when graph-justified
SUSPENDED_BY_DEPENDENCY / REOPENED are first-class states
ACTIVE_EXECUTION_FRONTIER may contain multiple independent sequences
no two live execution fronts may share the same conflict domain
```

## 9) Graph Frontier / Structured Backtracking

إذا Sequence تكشف Dependency أعمق:

```text
current → SUSPENDED_BY_DEPENDENCY
→ register dependency edge
→ derive/open upstream sequence JIT
→ close/prepare upstream
→ invalidate affected descendants
→ REOPEN/RESUME suspended sequence
→ re-diagnose before execution
```

إذا اكتشاف جديد يبطل Sequence مغلقة، تصبح `REOPENED`; descendants/evidence classified stale by invalidation cone.

## 10) Parallelism Safety

التوازي لا يُستنتج من اختلاف الملفات فقط. يجب إثبات استقلال:

```text
canonical owner / semantic state / contracts / data/migrations
runtime authority / shared generated artifacts / conflict domain
```

Parallel analysis is broader; parallel writes require graph-proven independent conflict domains + isolated workspace + execution owner. Target-branch integration remains serialized.

## 11) Mode-Specific Exit

PREPARE_ONLY قبل `PREPARED`:

```text
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
DECISION_IMPACT_PROPAGATED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
FINDINGS_DISPOSITIONED=YES
DEPENDENCIES_DISPOSITIONED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
IMPLEMENTATION_COMPLETE=NO
```

EXECUTE_END_TO_END قبل `COMPLETE`: كل ما سبق + implementation/consumers/cleanup/verification/governance/scope-delta gates.

## 12) Accounting Gate

قبل final handoff/closure:

```text
FINDINGS_ACCOUNTED=YES
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
```

لا يكفي `ZERO known findings` لإثبات completeness؛ يلزم Adversarial/negative-space discovery مستقل يحاول كشف nodes غير محسوبة.

## 13) Fresh Head / Periodic Reconciliation

قبل sequence creation، قبل live write، قبل integration، بعد sequence، وقبل handoff/closure:

```text
re-resolve HEAD
→ classify DISJOINT / RELATED_NON_CONFLICTING / SEMANTIC_OVERLAP / DIRECT_CONFLICT / AUTHORITY_OR_TRUTH_CHANGE
→ update graph/accounting
→ invalidate only affected evidence
```

الحركة غير المرتبطة لا توقف Frontiers المستقلة.
