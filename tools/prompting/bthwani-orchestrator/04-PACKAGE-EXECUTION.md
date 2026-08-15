# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

هذا الملف يملك Package Readiness، Schema الحزمة الثلاثية، Governance Promotion، Root-Cause execution، consumer migration وlocal cleanup.

## 1) Package Readiness

لا تنشئ/تحدّث الحزمة الحالية قبل:

```text
DISCOVERY_COMPLETE = PASS/YES
DIAGNOSIS_COMPLETE = PASS/YES
DECISION_COMPLETE = PASS/YES
COVERAGE_COMPLETE = PASS/YES
latest-head drift reconciled
implementation/verification definable without guessing
```

إذا بقي قرار مادي غير محسوم، Finding غير مسجل، أو Root Cause/Owner مجهول بلا blocker صريح، فالحزمة غير جاهزة.

## 2) Exact Package Schema

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

**Exactly these three files.** لا Manifest/Coverage/units parallel schema ولا ملفات إضافية افتراضيًا. تاريخ الحزم القديمة لا يغير Schema الحالية.

## 3) Baseline Semantics

عند الإنشاء سجّل منفصلًا:

```text
START_SHA   = exact branch head at diagnosis start
CURRENT_SHA = exact latest diagnosis head after readiness reconciliation
```

`new-package.mjs` يأخذ `--start-sha` و`--current-sha` صراحةً. لا تستخدم SHA واحدة لتغطية baseline وcurrent truth إذا اختلفتا.

Execution metadata:

```text
PACKAGE_READY_BASE_SHA = CURRENT_SHA at package readiness
CURRENT_WORK_BASE_SHA  = latest safe reconciled execution base
```

## 4) Create / Resume / Rebaseline

```text
ABSENT → create current three-file package.
EXISTS + same task identity → RESUME_AND_RECONCILE.
EXISTS + different identity → COLLISION; do not overwrite.
```

عند استئناف legacy package: أعد معايرتها مقابل current Orchestrator/Governance/HEAD، حافظ فقط على valid evidence/decisions، وانقل المهمة النشطة إلى current three-file schema. لا تحافظ على legacy schema في القالب الحاكم.

## 5) File Ownership

`01-DIAGNOSIS.md`: identity/truth/scope/Macro/Graph/Journeys/Findings/Coverage/Decisions/Governance Candidates/Re-Diagnosis/Readiness.

`02-EXECUTION.md`: root-cause ordered plan + actual execution ledger + governance promotion + consumers + candidate movement + local cleanup + blockers.

`03-VERIFICATION-CLOSURE.md`: verification/evidence/runtime/approvals/cleanup/governance sync/fresh-head/adversarial/final decision.

لا تكرر نفس الحقيقة في الملفات الثلاثة؛ استخدم IDs/references.

## 6) PREPARE_ONLY

```text
create/update three files
→ record exact implementation plan
→ record governance promotion candidates
→ record evidence acquisition plan
→ set package readiness gates
→ LIFECYCLE_STATE=PREPARED
→ STOP_PREPARED
```

No product/governance/runtime mutation and no final product decision.

## 7) EXECUTE_END_TO_END

قبل أول Product write:

```text
re-read current authority/truth/head
→ revalidate package readiness
→ LIFECYCLE_STATE=READY_TO_EXECUTE
```

ثم:

```text
Governance Promotion where required
→ canonical implementation owner first
→ root fix/refactor/redesign/rebuild
→ migrate every affected writer/reader/consumer
→ synchronize contracts/generated/data transitions
→ remove obsolete/parallel path
→ local cleanup
→ targeted verify
→ adjacent regression search
```

## 8) Governance Promotion

لكل durable resolved rule:

```text
classify durability
→ existing canonical owner
→ authority check
→ canonical governance write when authorized
→ machine-readable counterpart/registry when applicable
→ implementation/consumer propagation
→ verification later in Governance Reconciliation
```

Do not create journey-history/topic-decision governance files when an existing canonical owner can hold the rule.

## 9) Root-Cause Execution Loop

```text
confirm current failure/evidence
→ correlate duplicate symptoms
→ identify first causal failure
→ challenge competing hypothesis
→ canonical owner/root cause
→ root fix
→ consumer migration
→ contract/data/generated synchronization
→ obsolete path removal
→ local cleanup
→ affected verification
→ neighboring regression search
→ update Finding
```

No patch loop without a new falsifiable hypothesis.

## 10) No Parallel Truth / Hidden Workaround

Forbidden as final state:

```text
patch masking root cause
silent fallback
parallel Product/Business truth
unbounded dual-write
surface-local duplicate business truth
UI-only authorization
state bypass
reachable legacy route after migration
financial retry identity before unknown-result reconciliation
test/guard weakening
compatibility residue without explicit need + owner + expiry/removal trigger
```

## 11) Consumer Migration

Each proven consumer is:

```text
MIGRATED
or NOT_AFFECTED_WITH_PROOF
```

Cover writers/readers/APIs/generated clients/surfaces/jobs/events/DB/config/permissions/tests/docs touched by semantic change.

## 12) Change Impact Propagation

Every material write:

```text
changed owner/contract/state
→ graph traversal
→ affected consumers
→ invalidated evidence
→ required re-verification
→ governance impact
→ cleanup residue
```

Use affected + risk expansion; no blind full repo repetition and no under-verification of shared/high-risk owners.

## 13) Local Cleanup

After each root fix:

```text
remove obsolete local path
remove expired compatibility/workaround
repair references/imports/exports
normalize directly affected naming/placement/ownership
remove debug/temp residue
verify reference integrity
```

Final comprehensive cleanup remains in unit 05.

## 14) Data / Security / Finance / Events

Data: forward deterministic migrations; no applied-history rewrite; expand/backfill/switch/contract where required; fresh + representative non-empty; locks/idempotency/restart/rollback/roll-forward/drift.

Security: enforce at trusted owner, cover auth/authz/session/object scope/IDOR/replay/input-output/PII/secrets/audit as affected.

Finance: canonical WLT/financial owner, idempotency/correlation/provider outcome/readback/reconciliation/unknown-result/compensation/replay safety.

Events/providers: stable identity, duplicate/out-of-order/replay, retry/backoff/DLQ/lease, timeout/unknown-result, provider auth/signature, restart/reconciliation.

## 15) Execution Completion Gate

Before Freeze:

```text
ZERO known in-scope finding requiring implementation write
ZERO FIXED_PENDING_VERIFY still requiring a write
all affected consumers migrated/dispositioned
all required durable governance promotions complete or explicitly blocking
all local cleanup complete
all package bookkeeping needed before Freeze complete
latest remote movement reconciled
```
