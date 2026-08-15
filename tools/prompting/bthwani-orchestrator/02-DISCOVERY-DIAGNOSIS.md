# 02 — Discovery & Diagnosis

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: operational discovery, diagnostic methods, competitive deepening and evidence acquisition.

## 1) Governing order

```text
CREATE/RESUME OVERVIEW + MACHINE REGISTRIES EARLY
→ OPERATIONAL TRUTH RECONCILIATION
→ OPERATIONAL BREADTH PASS
→ MULTI-DIRECTIONAL RELATION/DEPENDENCY/IMPACT GRAPH
→ DEEPEN MATERIAL JOURNEY/STATE/AUTHORITY/HANDOFF QUESTIONS NEEDED FOR COVERAGE
→ OPERATIONAL NEGATIVE-SPACE PASS
→ OPERATIONAL ADVERSARIAL PASS
→ MACHINE OPERATIONAL-ROOT GATE
→ TARGET-WIDE FINDINGS
→ RC CORRELATION/CLUSTERING
→ COMPETITIVE DEEPENING OF ROOT CANDIDATES
→ PRIORITY MODEL + LANDSCAPE ADVERSARIAL
→ FRONTIER
→ FRONTIER-SPECIFIC DEEP DIAGNOSIS / DECISIONS / EXECUTION PREPARATION
```

**Frontier قبل Operational Root PASS ممنوع.**

## 2) Operational Breadth Pass

ابدأ دون questions-first، وغطِّ بحسب الانطباق:

```text
Product outcomes / required observable results
Actors / identities / authority / responsibility
Journeys / entries / actions / outcomes / failure / recovery
States / transitions / preconditions / invariants
Handoffs / next actor / responsibility transfer / cross-surface visibility
Canonical owners / writers / readers / consumers
Contracts / APIs / generated bindings
Data owners / schemas / migrations / persistence/readback
Permissions / scopes
Events / jobs / providers
Control-Panel interventions
Runtime / configs / env / dependencies / observability / CI/security boundaries
Structural residue / cleanup candidates
```

الهدف bounded material universe + relation graph، لا ادعاء «كل مجهول في الكون».

## 3) Operational Truth Reconciliation

قارن ولا تفترض:

```text
AUTHORIZED INTENT / PRODUCT TRUTH
↔ ACTUAL IMPLEMENTATION/RUNTIME/DATA BEHAVIOR
↔ GOVERNANCE / CONTRACT / CANONICAL OWNER
↔ USER-RESOLVED DECISIONS
```

صنف `PROVEN / INFERRED / CONTRADICTED / DECISION_REQUIRED`. Product documentation ليست حقيقة مطلقة إذا خالفت authority أعلى أو runtime evidence.

## 4) Journey / State / Authority coverage

كل Journey مادية يجب أن تجيب بلا تخمين عن Actor, Entry, Preconditions, Authorization, Action, Decision Rule, Current/Next State, Invariants, Side Effects, Handoff, Canonical Owner, Success/Failure/Recovery, Later Readback, Cross-Surface meaning.

Deepen هذه الجوانب **قبل Operational PASS** بالقدر اللازم لإزالة material uncertainty، لا بعد Frontier.

## 5) Multi-directional evidence

Orientation top-down لكن evidence يمكن أن تأتي forward/reverse/vertical/horizontal/cross-layer/cross-surface. Repository/code/DB/runtime قد يكشف operational node مفقودة؛ سجّلها وارفع معناها للأعلى قبل fix.

```text
Forward: Entry → Preconditions → Action → Decision → State → Handoff → Outcome
Reverse: Outcome → Handoff → State → Decision → Actor/Entry
Temporal: Before → Trigger → Pending → Complete/Fail → Recovery → Readback
```

## 6) Lower-layer holding queue

أي technical defect يظهر قبل parent/root placement يدخل Machine Queue:

```text
HOLD → no execution
PROMOTED → operationalParent + RC-NNN + promotion evidence + current priority
DISPOSITIONED → resolved/excluded with proof
```

هذا يمنع silent loss وفي الوقت نفسه يمنع leaf-first distraction.

## 7) Negative space

ابحث عما ينبغي أن يوجد لكنه مفقود: actor/authority/responsibility, journey/state/transition/action/validation, handoff/recovery/cancel/retry/idempotency, control-panel intervention, cross-surface visibility, owner/writer/reader/consumer, decision/failure path, technical route/job/API بلا operational parent، أو outcome بلا implementation/readback.

## 8) Competitive deepening

بعد Operational PASS وظهور RC candidates، عمق فقط candidate قادرة على الفوز أو نقض/حجب winner أو تغيير materially authority/dependency/blast-radius/risk/unlock. استخدم cheapest discriminating evidence:

```text
Observation → Hypothesis → cheapest differentiating evidence → Confirm/Reject → compare leverage
```

توقف عن تعميق candidate عندما يثبت أنها لا تستطيع outrank/invalidate/block winner؛ احفظها محاسبة للمرحلة اللاحقة.

## 9) Root-cause correlation

Cross-surface symptoms قد تكون جذرًا واحدًا. `20 Findings ≠ 20 Sequences`. اربط shared state/canonical owner/contract/data writer/dependency/migration/runtime boundary قبل فصل clusters.

## 10) Core diagnostic passes

لكل material journey/cluster بحسب الخطر: Logical, State/Transition, Forward, Reverse, Temporal, Actor/Responsibility, Invariant, Cross-Surface Differential, Cross-Layer Vertical, Failure/Recovery, Counterfactual, Negative-Space, Adversarial, Concurrency/Idempotency, Security/Isolation, Finance, Offline/Reconnect, Provider Failure, Migration/Compatibility.

## 11) Cross-layer trace

```text
Operational/Product meaning
→ Actor/Identity/Session/Scope
→ UX/Surface/Route/Control
→ Client state/controller/adapter
→ Contract/Binding/API
→ Validation/Domain/State Machine
→ Transaction/Data/Persistence
→ Cache/Idempotency
→ Events/Jobs/Providers
→ Response/Canonical Readback
→ Required Consumers/Surfaces
→ Observable Operational Result
→ Audit/Observability Evidence
```

لا تسقط enforcement/writer/reader/persistence/consumer ماديًا.

## 12) Experimental proof

Falsifiable hypothesis → smallest real check → canonical runtime/readback → expected vs actual. لا تدّع Runtime/E2E/Visual proof إذا لم ينفذ.

## 13) Reuse before create

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`. قبل إنشاء truth/contract/state/helper/config جديد ابحث imports/routes/callers/consumers/API/DB/tests/config/generated relationships.

## 14) Structural diagnosis

افحص dead/unreachable/stale/legacy/superseded code، duplicate truth/implementation، unused imports/deps، obsolete routes/contracts/models/config/env/scripts، TODO/FIXME/HACK/workarounds/fallbacks، orphan refs، wrong ownership/naming/placement، debug/temp/generated noise. لا تحذف بالحدس؛ أثبت Responsibility/Purpose/Consumer/Requirement/Architectural Reason.

## 15) Reopen

أي discovery يغير operational meaning/authority/ownership أو causal placement يعيد فتح affected operational/root/priority cone فقط؛ لا تكمل Frontier قديمة بسبب sunk cost.
