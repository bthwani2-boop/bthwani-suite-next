# 02 — Discovery & Diagnosis

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/02-DISCOVERY-DIAGNOSIS.md`

هذا الملف يملك منهج الاكتشاف والتشخيص فقط. قواعد الحقيقة/السلطة/الكتابة في `01-CORE-CONTRACT.md`، وقواعد القرارات والتغطية في `03-DECISIONS-COVERAGE-ANTI-DRIFT.md`.

## 1) المنهج الحاكم

```text
BROAD DISCOVERY
→ BUILD RELATION GRAPH
→ MACRO OPERATIONAL BLUEPRINT
→ MACRO DECISION GATE
→ PRIORITIZE FOUNDATIONS / CONNECTED CLUSTERS
→ DEEP JOURNEY DIAGNOSIS WAVES
→ RESOLVE DERIVABLE FACTS
→ RECORD FINDINGS / CONTRADICTIONS / UNKNOWNS
→ TRUE DECISION BOUNDARY when necessary
→ RE-DIAGNOSIS after decisions
→ ADVERSARIAL COMPLETENESS
```

ممنوع: questions-first، app-by-app isolation، screen-by-screen isolation، full-repo wandering بلا علاقة، ask-after-every-finding، أو package creation قبل readiness.

## 2) Broad Discovery

ابدأ دون أسئلة للمستخدم واكتشف بقدر الانطباق:

```text
Domains
Actors
Responsibilities
Journeys
Entry Points
Surfaces
Routes/Screens/Controls
States
Actions
Transitions
Handoffs
Outcomes
Failure/Recovery Paths
Canonical owners
Writers/Readers/Consumers
Contracts/APIs/Bindings
Data owners / schemas / migrations
Permissions/scopes
Events/jobs/providers
Control-Panel intervention points
Runtime/readback paths
Configs/env/dependencies
Tests/guards/observability
```

الهدف هنا حصر الكون المرتبط، لا الغرق في كل تفصيلة.

## 3) Relation Graph

العقد الممكنة:

```text
Journey | Actor | State | Action | Surface | Route | Contract | Data Owner | Service | Runtime Path | Config | Dependency
```

العلاقات الأساسية:

```text
DEPENDS_ON
READS_FROM
WRITES_TO
TRIGGERS
HANDOFF_TO
CONSUMED_BY
VISIBLE_ON
AUTHORIZED_BY
OWNS
IMPLEMENTS
VERIFIED_BY
```

كل علاقة مادية تحتاج Evidence أو Status يوضح أنها فرضية تحتاج إثباتًا.

## 4) Macro Operational Blueprint

قبل التشخيص المجهري، كوّن:

```text
Major domains
Major actors
Major responsibilities
Major journeys
Canonical states
State/data owners
Major handoffs
Sources of truth
Major dependencies
Core invariants
Macro contradictions
```

وصنف كل عنصر:

```text
PROVEN
INFERRED
CONTRADICTED
DECISION_REQUIRED
```

لا تبنِ مئات الاستنتاجات الدقيقة فوق Macro Model غير محسوم. العناصر المؤثرة على اتجاه النظام تمر عبر Macro Decision Gate في الوحدة 03.

## 5) ترتيب العمل — Graph Driven

الأولوية:

```text
BLOCKS OTHERS
> CANONICAL TRUTH OWNER
> HIGH BLAST RADIUS
> MULTI-SURFACE SHARED
> BUSINESS CRITICAL
> HIGH UNCERTAINTY
> LEAF / LOW IMPACT
```

لا تستخدم ترتيب المجلدات أو أسماء التطبيقات كترتيب تشخيص افتراضي.

### Structured Backtracking

إذا:

```text
A reveals blocker B
B reveals foundation C
```

اعمل:

```text
A → B → C → resolve C → return B → return A
```

وإذا كانت عدة Journeys تشترك في State/Owner/Contract جذري، تعامل معها كـConnected Diagnostic Cluster بدل تكرار التشخيص.

## 6) الوحدة الأساسية

```text
Journey-by-Journey × Multi-Surface × Cross-Layer
```

لا تعتبر Journey مفهومة حتى يمكن تتبعها بين Actors والأسطح والطبقات ذات الصلة.

Journey Matrix المنطقية يجب أن تعرف على الأقل:

```text
Journey ID/Name
Actor
Entry/Context
Preconditions
Available Action
Validation
Decision Rule
Authorization/Scope
Current State
Transition/Next State
Side Effects/Persisted Change
Handoff/Next Actor
Surface visibility
Outcome
Failure Path
Recovery Path
Later Readback
Canonical Owner
Evidence/Confidence
```

شكل Cross-Surface حسب الانطباق:

```text
Client ↔ Partner ↔ Captain ↔ Field ↔ Control Panel ↔ Backend/Domain/Data/Runtime
```

شكل Cross-Layer الكامل حسب الانطباق:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device/Trusted Context
→ Role/Permission/Object Authorization
→ UX/UI / Surface / Route / Control
→ Surface State / Client Logic / Controller / Adapter
→ Contract / Binding / Generated Client
→ API
→ Validation / Transformation
→ Domain / Business Logic / State Machine
→ Transaction / Data / Persistence
→ Cache / Idempotency
→ Events / Jobs / Providers / Integrations
→ Networking / Response
→ Persisted Canonical Readback
→ Every Required Consumer / Surface
→ Observable Operational Result
→ Audit / Observability / Runtime Evidence
```

لا تختصر هذا المسار بطريقة تسقط enforcement أو writer/reader أو persistence أو consumer ماديًا.

## 7) Core Diagnostic Pass

لكل Journey مادية نفذ كحد أدنى بحسب الانطباق:

```text
Logical
→ State/Transition
→ Forward Trace
→ Reverse Trace
→ Cross-Surface Differential
→ Cross-Layer Vertical
→ Failure/Recovery
```

ثم فعّل passes إضافية حسب Risk/Signal:

```text
Temporal
Actor/Responsibility
Invariant
Counterfactual / What-if
Negative-Space
Experimental
Adversarial
Concurrency/Idempotency
Security/Isolation
Finance
Offline/Reconnect
Performance/Fanout
Provider Failure
Migration/Compatibility
```

## 8) Logical / State Analysis

اسأل بالدليل:

```text
هل Action مسموحة في State الحالية؟
هل Preconditions كافية؟
هل Validation/Authorization في المالك الصحيح؟
هل Transition قانونية؟
هل Outcome تترتب منطقيًا؟
هل توجد طريقة للوصول إلى State ممنوعة؟
هل State معرفة في أكثر من Truth owner؟
```

## 9) Forward + Reverse + Temporal

Forward:

```text
Entry → Preconditions → Action → Validation → Decision → State → Transition → Handoff → Outcome
```

Reverse:

```text
Outcome → Handoff → Transition → State → Decision → Validation → Action → Actor/Entry
```

Temporal عند الحاجة:

```text
Before → Trigger → During → Pending → Completed/Failed → Recovery → Later Readback
```

افحص timeout/retry/stale state/restart/delayed events/late surface propagation/version mismatch.

## 10) Actor / Responsibility / Ownership

لكل خطوة:

```text
who initiates?
who decides?
who executes?
who owns durable truth?
who may cancel/reverse/intervene?
who receives next?
who waits for whom?
```

Wrong owner، orphan handoff، responsibility gap، أو hidden writer = Finding.

## 11) Cross-Surface Differential

قارن نفس Entity/State/Event عبر الأسطح:

```text
canonical backend meaning
↔ client meaning
↔ partner meaning
↔ captain meaning
↔ field meaning
↔ control-panel meaning
```

أي اختلاف غير مبرر في المعنى أو Action أو timing أو visibility أو responsibility = Finding، حتى لو لم يفشل API.

## 12) UX / Decision Clarity

لكل Surface/Actor افحص عند الانطباق:

```text
Entry/Discoverability
Loading
Empty
Partial
Ready
Success
Error
Denied/Forbidden
Conflict
Stale
Pending
Timeout
Retry
Offline/Reconnect
Cancelled
Recovery
Completed
Later Readback
```

وافحص: هل يعرف المستخدم أين هو، ماذا حدث، ماذا ينتظر، من ينتظر من، الإجراء التالي، سبب المنع/الفشل، وكيف يصحح أو يسترد عند الحاجة؟ UI تعرض Action غير مسموحة أو تخفي Action لازمة = Finding.

## 13) Invariants

استخرج القواعد التي يجب ألا تُكسر، مثل:

```text
State C cannot precede B
Actor X cannot perform Y in Z
handoff cannot occur before prerequisite P
one canonical owner decides durable state
completed outcome cannot revert without an explicit recovery rule
```

ثم حاول كسرها عمدًا.

## 14) Negative Space

ابحث عما ينبغي أن يوجد لكنه مفقود بالكامل:

```text
missing journey/state/transition/action/validation
missing feedback/handoff/recovery
missing control-panel intervention
missing cross-surface visibility
missing owner/consumer/writer/reader
missing decision rule
missing failure path
```

عدم وجود code لا يعني عدم وجود Requirement gap.

## 15) Hypothesis-Driven Evidence

لتقليل الوقت:

```text
Observation
→ Hypothesis
→ Cheapest discriminating evidence
→ Confirm / Reject
→ Next hypothesis
```

مثال Missing State:

```text
DB truth?
→ API response?
→ contract/client mapping?
→ surface state?
→ rendering?
```

توقف عند أول Failure سببي ثم عمّق Root Cause وBlast Radius بدل تشغيل Checks عشوائية.

## 16) Experimental Validation

عندما تتوفر القدرة والبيئة:

```text
form falsifiable hypothesis
→ run smallest useful real check
→ capture runtime/readback
→ compare with expected state/journey
→ refine/reject hypothesis
```

لا تدّع Runtime/E2E/Visual proof إذا لم يُنفذ فعليًا.

## 17) Full-Stack Failure Matrix

غطِّ حسب الخطر:

```text
success
empty/missing data
invalid/malformed input
unauthenticated/denied
wrong role/scope/IDOR
forbidden state
not found
conflict/stale version
duplicate/replay/idempotency
boundary/min/max
race/concurrency
partial failure
dependency/database/network failure
timeout/unknown result
retry/backoff/DLQ where relevant
offline/reconnect
restart/recovery
old/new data
mixed-version/migration compatibility
rollback/roll-forward
compensation/reconciliation
```

## 18) Reuse Before Create

قبل إنشاء File/Helper/Contract/State/Config/Abstraction/Source-of-Truth أو مسار جديد:

```text
search exact name + semantics
→ imports / exports / re-exports
→ routes / navigation / registries / manifests
→ callers / consumers / writers / readers
→ API / DB / tests / bindings
→ configs / env / scripts / generated references
→ relationship/dependency tools when useful
```

ثم طبق ترتيب القرار:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

`CREATE_NEW` هو الخيار الأخير، ولا يُستخدم إذا أمكن لمالك حاكم موجود أن يمتلك المعنى دون خلق Truth/Path موازٍ. لا تعتبر اختلاف الاسم دليلًا على عدم وجود تنفيذ مكافئ.

## 19) Structural / Hygiene Diagnosis

أثناء التشخيص ابحث من السطر حتى النظام عن:

```text
dead/unreachable/stale/legacy/superseded code
duplicate implementation / duplicate truth
unused imports/exports/dependencies
obsolete routes/contracts/schemas/models
stale config/env/flags/scripts
TODO/FIXME/HACK/workarounds/fallbacks
orphan references / wrong placement / misleading naming
unnecessary compatibility layers
temporary/debug/generated noise
files/folders with no proven Purpose/Consumer/Responsibility
```

وحدة الفحص ليست الملف فقط:

```text
line / expression / condition / branch / block
→ function / method / type / class / component / helper / constant
→ file / file group / folder / module / package
→ service / surface / domain
→ contract / route / config / dependency
```

لكل عنصر مشكوك فيه لا تحذف ولا تُبقِه بالحدس. أثبت:

```text
Responsibility + Purpose + Consumer + Requirement + Architectural Reason
```

ولا تخطط Delete/Rename/Move/Merge/Split/Refactor/Replace قبل فهم Blast Radius وشبكة المراجع في الاتجاهين.

## 20) Adversarial Diagnosis

بعد أن يبدو التشخيص صحيحًا، حاول إثبات أنه ناقص من مداخل مختلفة:

```text
unmapped routes
states without consumers
APIs without surfaces
hidden writers/readers
jobs/events/background paths
admin interventions
fallback/legacy paths
unreachable error handling
race/partial transaction
permission leaks / cross-scope
contract/schema/data drift
stale runtime/config assumptions
orphan references
missing failure/recovery
unvalidated inputs
```

Finding جديد يعيد فتح Coverage والتشخيص في الوحدة 03.

## 21) شرط فهم Journey

لا تعتبر Journey مفهومة إذا لم تستطع الإجابة بلا تخمين عن Actor، Entry، visible state، allowed actions، Preconditions، Authorization/Scope، Decision Rule، current/next State، side effects، truth owner، Handoff، cross-surface visibility، success/failure/recovery، later readback، وحفظ نفس المعنى عبر UI/API/Domain/Data/Runtime.
