# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

هذا الملف يملك Living Task Package، Wave Readiness، PREPARE handoff design، Governance Promotion، Root-Cause execution، consumer migration وlocal cleanup.

## 1) Package Lifecycle — Create Early, Ready Late

بعد تثبيت Task identity وRepository/Branch/START_SHA:

```text
ABSENT → create current three-file package early.
EXISTS + same task identity → RESUME_AND_RECONCILE.
EXISTS + different identity → COLLISION; do not overwrite.
```

أنشئ/استأنف الحزمة **قبل deep diagnosis waves** حتى تُوثق الحقيقة المشتقة تدريجيًا. لا تنتظر Global `PACKAGE_READY` لإنشاء أو تحديث الملفات.

```text
PACKAGE_EXISTS ≠ PACKAGE_READY
PACKAGE_HAS_CONTENT ≠ DIAGNOSIS_COMPLETE
PACKAGE_READY ≠ PRODUCT_IMPLEMENTED
```

`PACKAGE_READY` حالة نهائية للتسليم في `PREPARE_ONLY` وحالة مصالحة عالمية مطلوبة قبل Final Closure في `EXECUTE_END_TO_END`.

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
CURRENT_SHA = exact latest diagnosis head after last reconciliation
```

`new-package.mjs` يأخذ `--start-sha` و`--current-sha` صراحةً. لا تستخدم SHA واحدة لتغطية baseline وcurrent truth إذا اختلفتا.

Execution metadata:

```text
PACKAGE_READY_BASE_SHA = UNSET until global PACKAGE_READY is actually proven
CURRENT_WORK_BASE_SHA  = latest safe reconciled execution/diagnosis base
CURRENT_WAVE_BASE_SHA  = exact reconciled base used to prove current wave readiness
```

في `PREPARE_ONLY` يعيّن `PACKAGE_READY_BASE_SHA` عند Final Package Ready. في `EXECUTE_END_TO_END` لا يلزم تعيينه قبل أول Wave؛ يعيّن عند global package reconciliation قبل closure.

## 4) File Ownership

`01-DIAGNOSIS.md`: identity/truth/scope/Macro/Graph/Journeys/Findings/Coverage/Decisions/Governance Candidates/Re-Diagnosis/global readiness.

`02-EXECUTION.md`: root-cause ordered plan + current wave machine-readable state + actual execution ledger + governance promotion + consumers + candidate movement + local cleanup + blockers.

`03-VERIFICATION-CLOSURE.md`: verification/evidence/runtime/approvals/wave evidence references/final cleanup/governance sync/fresh-head/adversarial/final decision.

لا تكرر نفس الحقيقة في الملفات الثلاثة؛ استخدم IDs/references.

## 5) Shared Sequential Work Model

كلا الـMODEين يتبعان:

```text
SELECT_NEXT_WAVE_BY_DEPENDENCY
→ DIAGNOSE
→ ROOT_CAUSE / BLAST_RADIUS
→ RESOLVE DERIVABLE FACTS
→ ASK TRUE DECISION(S) IF NEEDED
→ APPLY DECISION
→ RE-DIAGNOSE
→ DEFINE EXACT ROOT SOLUTION
→ CURRENT_WAVE_SOLUTION_READY
```

لا تؤجل كل الأسئلة إلى نهاية الهدف، ولا تنتقل إلى dependent Wave مع قرار مادي غير محسوم في الحالية.

## 6) PREPARE_ONLY — Sequential Preparation

بعد `CURRENT_WAVE_SOLUTION_READY`:

```text
record exact root fix/design
→ record canonical owner + exact target state
→ record dependencies + writers/readers/consumers
→ record contract/data/state/governance changes required
→ record obsolete/parallel paths to remove
→ record local/final cleanup actions
→ record exact acceptance + verification strategy
→ prove WAVE_PREPARED
→ next wave
```

لا Product/Governance/Runtime mutation. لا Implementation SHA مختلقة. لا تعتبر عبارات مثل `fix backend`, `update frontend`, `run tests` خطة قابلة للتسليم.

قبل الانتقال من Wave في `PREPARE_ONLY` يجب أن يستطيع وكيل آخر تنفيذ تلك الـWave دون:

```text
product/architecture guessing
new material decision
unknown root cause
unknown owner/consumer/dependency
unclear target state
unclear execution order
unclear cleanup/removal
unclear acceptance/verification
```

بعد جميع الـWaves:

```text
Global Reconciliation
→ Global Adversarial Completeness
→ reconcile final execution ordering/dependencies
→ set global diagnosis/decision/coverage gates
→ PACKAGE_READY_BASE_SHA = latest reconciled head
→ PACKAGE_READY=YES
→ LIFECYCLE_STATE=PREPARED
→ STOP_PREPARED
```

Governance changes remain `GOVERNANCE_PROMOTION_PENDING` with exact owner + exact semantic change.

## 7) EXECUTE_END_TO_END — Sequential Immediate Execution

لا ينتظر Global `PACKAGE_READY` قبل التنفيذ. بعد كل Wave Diagnosis/Decision/Re-Diagnosis، يجب أولًا تعيين وفحص current-wave fields:

```text
CURRENT_WAVE_ID
CURRENT_WAVE_BASE_SHA
CURRENT_WAVE_STATUS = READY_TO_EXECUTE
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

ثم فقط:

```text
Governance Promotion where required
→ canonical implementation owner first
→ root fix/refactor/redesign/rebuild
→ migrate every affected writer/reader/consumer
→ synchronize contracts/generated/data transitions
→ remove obsolete/parallel path
→ local cleanup
→ targeted/required verification
→ runtime/readback when applicable
→ adjacent regression/adversarial search
→ update the three living documentation files
```

بعد التنفيذ لا تنتقل إلى next Wave حتى:

```text
CURRENT_WAVE_STATUS = COMPLETE
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
```

إذا اكتشف التنفيذ Evidence مادية جديدة تغير Root Cause/Decision/Blast Radius:

```text
STOP affected write path
→ REOPEN CURRENT/AFFECTED WAVE
→ diagnose new evidence
→ decision if needed
→ re-diagnose
→ update solution
→ execute only after Wave Write Gate passes again
```

## 8) Governance Promotion

لكل durable resolved rule في `EXECUTE_END_TO_END`:

```text
classify durability
→ existing canonical owner
→ authority check
→ canonical governance write when authorized
→ machine-readable counterpart/registry when applicable
→ implementation/consumer propagation
→ wave verification
→ final Governance Reconciliation later
```

Do not create journey-history/topic-decision governance files when an existing canonical owner can hold the rule.

في `PREPARE_ONLY`: document only; no governance mutation.

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
→ update Finding + Wave state
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

في `PREPARE_ONLY` يسجل exact migration/disposition required. في `EXECUTE_END_TO_END` يجب تنفيذها أو إثبات عدم التأثر قبل `WAVE_COMPLETE`.

## 12) Change Impact Propagation

Every material decision/write:

```text
changed owner/contract/state
→ graph traversal
→ affected consumers
→ affected waves/journeys
→ invalidated evidence
→ required re-diagnosis/re-verification
→ governance impact
→ cleanup residue
```

Use affected + risk expansion; no blind full repo repetition and no under-verification of shared/high-risk owners.

## 13) Local Cleanup

After each root fix in `EXECUTE_END_TO_END`:

```text
remove obsolete local path
remove expired compatibility/workaround
repair references/imports/exports
normalize directly affected naming/placement/ownership
remove debug/temp residue
verify reference integrity
```

في `PREPARE_ONLY` حدد هذه الإجراءات بدقة كجزء من handoff ولا تنفذها.

Final comprehensive cleanup remains in unit 05.

## 14) Data / Security / Finance / Events

Data: forward deterministic migrations; no applied-history rewrite; expand/backfill/switch/contract where required; fresh + representative non-empty; locks/idempotency/restart/rollback/roll-forward/drift.

Security: enforce at trusted owner, cover auth/authz/session/object scope/IDOR/replay/input-output/PII/secrets/audit as affected.

Finance: canonical WLT/financial owner, idempotency/correlation/provider outcome/readback/reconciliation/unknown-result/compensation/replay safety.

Events/providers: stable identity, duplicate/out-of-order/replay, retry/backoff/DLQ/lease, timeout/unknown-result, provider auth/signature, restart/reconciliation.

## 15) Global Completion After All Waves

### PREPARE_ONLY

```text
ZERO material wave without WAVE_PREPARED
ZERO unresolved decision required for execution
ZERO unknown root cause/owner/consumer/dependency required for execution
ZERO unclear target state/order/cleanup/verification
all global coverage/diagnosis/decision gates = YES
PACKAGE_READY = YES
```

### EXECUTE_END_TO_END — Before Freeze

```text
ZERO material wave not COMPLETE
ZERO known in-scope finding requiring implementation write
ZERO FIXED_PENDING_VERIFY still requiring a write
all affected consumers migrated/dispositioned
all required durable governance promotions complete or explicitly blocking
all local cleanup complete
all global coverage/diagnosis/decision gates = YES
PACKAGE_READY = YES after living-package reconciliation
all package bookkeeping needed before Freeze complete
latest remote movement reconciled
```
