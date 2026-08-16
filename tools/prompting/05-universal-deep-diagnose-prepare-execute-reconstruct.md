# الأمر 5 — التشخيص الشامل من الإبرة إلى الصاروخ → تجهيز الحزمة → التنفيذ الجذري → الإغلاق FAIL-CLOSED

Status: DERIVED_SUPPORT

هذا هو **المدخل العام الموحد** لأي مهمة مستقبلية تحتاج تشخيصًا عميقًا ثم تجهيز حزمة تنفيذ، أو تشخيصًا وتجهيزًا وتنفيذًا وإغلاقًا في نفس الاستدعاء. لا يخلق منهجًا موازيًا؛ التنفيذ الحاكم يبقى حصريًا وفق `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` و`plans/diagnose-implementing/PACKAGE.template.md` و`plans/diagnose-implementing/orchestrator.mjs` والحراس الحاكمين على الـSHA الحالي.

يستفيد هذا الأمر، حسب الحاجة، من:

- `tools/prompting/01-diagnose-plan-package.md`
- `tools/prompting/02-execute-verify-close.md`
- `tools/prompting/03-end-to-end-fail-closed.md`
- `tools/prompting/04-journey-multisurface-operational-diagnosis.md`
- `plans/diagnose-implementing/diagnose_all-end-to-end/**`
- الحزم السابقة والوثائق والتقارير والمرفقات ذات العلاقة

لكن كل ما سبق **Derived/Historical Support** ما لم يكن هو جزءًا صريحًا من السلطة الحاكمة الحالية. لا يجوز لأي Prompt/Plan/Package/README/Report/Comment/Historical commit أن يستبدل Product Truth أو Implementation Truth أو Runtime Truth أو Repository Truth.

---

# 0) صيغة الاستدعاء

استخدم هذا القالب لكل مهمة جديدة:

```text
REPOSITORY: <owner/repo>
INTEGRATION_BRANCH: <branch/ref الحاكم>
TARGET: <كل شيء | domain | application | surface | journey | capability | service | section | feature | path | semantic scope>
MODE: <PREPARE_ONLY | EXECUTE_END_TO_END>
TASK_NAME: <safe-kebab-name>
PROBLEM: <AUTO_DISCOVER | وصف المشكلة إن وجد>
OBJECTIVE: <AUTO_DERIVE | النتيجة المطلوبة إن كانت محددة>
PACKAGE_ROOT: plans/diagnose-implementing
EXCLUSIONS: <NONE | exclusions with explicit proof>
DELIVERY: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

القاعدة:

```text
MODE=PREPARE_ONLY
= Deep Diagnosis → Decisions → Root-Cause Landscape → Canonical Target → V5 Package → Prepared Frontier → STOP as PREPARED_NOT_CLOSED.

MODE=EXECUTE_END_TO_END
= Deep Diagnosis → Decisions → Root-Cause Landscape → Canonical Target → V5 Package → Root-First Execution → Migration/Cutover → Cleanup → Verification → Exact-Candidate Closure.
```

`TARGET` هو **الجذر الدلالي** وليس مجرد path. إذا كان `TARGET=كل شيء` فابدأ من System Operational Root. وإذا كان محدودًا، ابدأ من أعلى معنى تشغيلي مادي داخله ثم وسّع فقط عبر علاقة مثبتة.

---

# 1) الأمر التنفيذي الموحد — النص الذي يجب اتباعه حرفيًا

> **نفّذ المهمة على `REPOSITORY` و`INTEGRATION_BRANCH` و`TARGET` و`MODE` المحددة أعلاه، واستخدم حصريًا `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` كنقطة الدخول الحاكمة لمسار V5 FAIL-CLOSED. ابدأ دائمًا من أحدث حقيقة Git فعلية مثبتة، ثم نفّذ تشخيصًا استقصائيًا عميقًا من الإبرة إلى الصاروخ قبل السماح لأي خلل تقني سفلي بتحديد اتجاه التنفيذ. ابنِ أولًا المعنى التشغيلي الأعلى للنطاق: Product Outcomes → Actors/Identities → Authorities/Responsibilities → Capabilities → Journeys → States/Transitions/Preconditions/Invariants → Handoffs/Cross-Surface Meaning → Canonical Owners/Writers/Readers/Consumers → Contracts/APIs/Data/Persistence/Readback → Events/Jobs/Providers → Control-Panel interventions → Runtime/Config/Environment/Observability/Security/CI → Implementation. افحص كل شيء منطقيًا ووظيفيًا وتشغيليًا ومعماريًا وتقنيًا وتصميميًا وUI/UX وأمنيًا وبيانيًا وتكامليًا وتجريبيًا وتشغيليًا وتنظيميًا وبنيويًا، واحصر كل فجوة أو نقص أو تناقض أو غموض أو Regression أو عيب أو منطق ناقص أو مسار غير مكتمل أو state/transition غير قانوني أو ربط مفقود أو اختلاف Cross-Surface أو مصدر حقيقة موازٍ أو writer مكرر أو contract drift أو data/migration drift أو integration failure gap أو auth/scope/IDOR gap أو runtime/config gap أو test gap أو dead/stale/legacy code أو ملف/مجلد/اعتماد/تسمية/مرجع/هيكلة في سياق خاطئ. اعتبر كل Finding تقنية مبكرة `Evidence/HOLD` ولا تجعلها Execution Authority حتى تثبت Operational Parent وأعلى Root Cause سببية مادية لها. استخدم `TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE; FIX HIGHEST PROVEN ROOT FIRST`: نفّذ Broad Discovery أولًا، ثم Competitive Root Deepening، ثم Root-Cause/Dependency/Impact Graph، ثم رتّب الجذور حسب upstream depth + blocking power + canonical/foundation importance + blast radius + security/data/finance/operational risk + unlock value + cross-surface effect + structural debt، وليس حسب أحدث commit أو أسهل fix أو عدد الملفات أو أول CI failure. متى ثبت أعلى Root Cause قابل للتنفيذ، ولا يوجد جذر أعلى معروف يسبقه، أوقف التوسع الجانبي غير الضروري وابدأ معالجته الجذرية كاملة End-to-End. لا تعالج العرض ولا تنشئ patch/workaround/fallback/parallel truth لإمرار اختبار. حدّد أولًا Canonical Target State والمالك الصحيح والـcontracts والـdata model والـstate machine، ثم نفّذ المعالجة عبر كامل السلسلة المتأثرة: Product Truth/Logic/Journeys/States → Frontend/UI/UX → Shared bindings/controllers/view-models → Contracts/OpenAPI/Generated clients/Events → Backend/Domain → Data/DB/Migrations/Constraints/Backfill → Integrations/Outbox/Jobs/Providers/Reconciliation → Identity/Auth/Permissions/Audit → Runtime/Config/Environment/Deployment/Observability → جميع Writers/Readers/Consumers/Surfaces. هاجر كل المستهلكين والبيانات والمراجع والاعتمادات المتأثرة، ثم أثبت canonical readback، ثم احذف نهائيًا كل مسار قديم/مكرر/خاطئ/ميت/متروك/في سياق خاطئ وكل compatibility/workaround/fallback غير مبرر بعد إثبات replacement + zero-reference/reachability + migration/cutover safety. لا تُعد كتابة applied migrations؛ استخدم forward-only corrective migrations. لا تحذف قيمة صحيحة لمجرد أن مكانها خاطئ: طبّق `PRESERVE PROVEN VALUE → FIX CONTEXT/OWNERSHIP → MOVE/MERGE/SPLIT/REFACTOR/REWRITE/REPLACE AS NEEDED → MIGRATE CONSUMERS → VERIFY → DELETE SUPERSEDED RESIDUE`. لا تعتبر أي UI أو تصميم أو component قديمًا disposable تلقائيًا؛ صنّف كل أصل إلى KEEP/HARDEN/MOVE/RENAME/MERGE/SPLIT/REFACTOR/MIGRATE/REGENERATE/REWRITE/REPLACE/DELETE بالأدلة، واحفظ التصميم/UX/assets الصحيحة عند إعادة الهيكلة. استخدم كل أداة/Skill/Plugin/تكامل Codex ملائم ومتاح فعليًا لتحسين التشخيص أو graph/dependency analysis أو code review أو security أو contracts أو DB أو runtime أو CI أو E2E أو mobile/device verification؛ لا تهمل أداة ملائمة، ولا تدّع تشغيل شيء لم يُشغل. اشتق كل حقيقة يمكن اشتقاقها بنفسك ولا تسأل المستخدم عنها. اسأل فقط عند `DECISION_REQUIRED` حقيقي غير قابل للاشتقاق، وبصيغة: Decision ID + السؤال + لماذا لا يمكن حسمه + الخيارات + توصيتك + السبب + أثر كل خيار؛ ثم أعد تشخيص cone المتأثر فقط. تعامل مع أي package/plan/doc قديم كدليل تاريخي يحتاج revalidation، لا كـDONE ولا كـSource of Truth. قبل كل write batch أعد حل أحدث الرأس وصنّف أي Foreign Delta إلى UNRELATED / RELATED_NON_BLOCKING / UPSTREAM_OR_ROOT_CHANGING / BLOCKING / SEMANTIC_OVERLAP / DIRECT_CONFLICT / AUTHORITY_OR_TRUTH_CHANGE؛ احفظ عمل الآخرين، لا force-push، لا hard-reset فوق عمل أحدث، ولا تجعل recency تغيّر الأولوية دون دليل سببي. أنشئ/حدّث حزمة V5 باسم `TASK_NAME` داخل `PACKAGE_ROOT` بحيث تكون machine-checkable وتحتوي Operational Coverage + Root-Cause Graph + Ledger + Frontier + Evidence + Closure، ولا تمنح نفسك PASS أو READY يدويًا؛ الحالة مشتقة من `orchestrator.mjs`. إذا كان `MODE=PREPARE_ONLY` فتوقف فقط عندما تصبح الحزمة Prepared فعليًا: operational coverage settled، negative-space/adversarial pass، material findings/decisions/consumers/dependencies/scope deltas accounted، root causes clustered/ranked/deepened، canonical target and reconstruction/cutover plan defined، verification defined before execution، frontier كله PREPARED؛ ولا تدّع تنفيذًا أو closure. إذا كان `MODE=EXECUTE_END_TO_END` فاستمر بعد ذلك Root-by-Root حتى تنفيذ أعلى الجذور المثبتة، ترحيل كل المستهلكين والبيانات، تنظيف zero-residue، وتشغيل تحقق exact-candidate حديث عبر static/contracts/data/integration/security/runtime/UI/E2E/adversarial gates المناسبة، مع fail/retry/duplicate/idempotency/race/timeout/unknown-result/offline/restart/provider-failure/mixed-version/rollback/compensation/reconciliation paths حيث تنطبق. لا تعتبر الجذر أو TARGET مغلقًا مع أي Decision/Dependency/Consumer/Binding/Integration/Migration/Security/Runtime/Legacy/Cleanup/Evidence مادي مفتوح، ولا مع مصدر حقيقة موازٍ أو مسار قابل للوصول قديم أو fallback صامت أو TODO/FIXME/HACK يعوّض الإغلاق. بعد آخر source/data/config write أعد pin للرأس، أعد كل evidence المتأثرة على exact candidate، نفّذ final adversarial/negative-space review، ثم فقط اسمح للحالة التي يثبتها V5 فعليًا. غير مثبت = غير مغلق؛ غير مختبر = غير مغلق؛ معروف وقابل للمعالجة ولم يُعالج = غير مغلق.**

---

# 2) السلطة والحقيقة — لا تسمح للمصادر المشتقة بقيادة التنفيذ

ابدأ كل استدعاء بقراءة authority chain الحالية على SHA المثبت:

```text
current explicit task/user decisions
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable policies
→ applicable Product Truth contracts
→ machine contracts/registries/schemas
→ exact pinned code/data/config/runtime/repository evidence
→ derived plans/prompts/reports/history
```

افصل دائمًا:

```text
AUTHORITY TRUTH
PRODUCT TRUTH
IMPLEMENTATION TRUTH
DATA TRUTH
RUNTIME TRUTH
REPOSITORY-PLATFORM TRUTH
DERIVED/HISTORICAL SUPPORT
```

وتعامل مع:

```text
plans/**
plans/diagnose-implementing/**
docs/**
old prompts
old packages
old reports
comments
historical commits
conversation notes
```

كـDiscovery/Evidence input فقط. عند التعارض:

```text
higher/current authority wins
→ record contradiction
→ invalidate affected old evidence
→ do not silently inherit old intent
```

يجب فحص `plans/diagnose-implementing/diagnose_all-end-to-end/**` عند كل مهمة واسعة أو معمارية أو Cross-Surface للاستفادة من القرارات والجذور والمخاطر الموجودة، لكن لا يجوز اعتباره تنفيذًا أو PASS للحالة الحالية.

---

# 3) Phase 0 — Capability + Git + Safety Preflight

قبل التشخيص العميق:

## 3.1 اكتشاف القدرات

اكتشف ما هو متاح فعليًا ومناسبًا، مثل:

```text
repository/GitHub access
local shell/runtime
Graphify/dependency/call-flow analysis
OpenAPI/generated-client guards
DB/migration tooling
Docker/runtime smokes
Expo/EAS/device verification
CI/GitHub Actions
Sonar/CodeQL/Trivy or equivalent scanners
Codex Security skills/scans/validation/attack-path analysis
CodeRabbit or equivalent diff review
observability/log/trace tooling
browser/UI/visual checks
```

استخدم كل ما هو **Applicable** فقط.

## 3.2 تثبيت Git Truth

```text
resolve INTEGRATION_BRANCH
→ BASE_SHA
→ resolve/create governed TASK_BRANCH/workspace exactly as V5 requires
→ pin TASK_HEAD
→ read only from pinned truth during a diagnosis wave
```

للـFresh task، اتبع V5 isolation. لا تجعل هذا Prompt يعطل شرط `WRITE_POLICY: ISOLATED_TASK_BRANCH`.

إذا أصدر المستخدم أمرًا صريحًا مختلفًا مثل «لا تنشئ فرعًا أو worktree ونفذ على هذا الفرع فقط»، فلا تدّع compliance كاذبة. افحص أولًا هل الفرع نفسه Task Branch معزول بالنسبة إلى Integration Target؛ إن لم يكن، سجّل `GOVERNANCE_CONFLICT / DECISION_REQUIRED` قبل Product/Runtime writes بدل تجاوز V5 بصمت.

## 3.3 حماية من الأضرار

ممنوع:

```text
force push
hard reset فوق عمل أحدث
git add . أو staging غير محصور
blind delete
rewrite applied migrations
blind mass rename/move
copy whole legacy tree as canonical
empty clean-room rewrite إذا كان هناك foundation صحيح قابل للحفظ
silent dependency/version churn
secret exposure
production/destructive data mutation دون authority صريحة
```

للـstaging:

```text
inventory changed paths
→ allowed staging set
→ stage explicitly
→ inspect staged diff
→ prove unrelated files excluded
```

---

# 4) Phase 1 — Broad Discovery من أعلى المعنى

ابدأ بلا أسئلة للمستخدم، واحصر الصورة الكلية للنطاق الحقيقي:

```text
Product outcomes
Actors / identities / service principals
Roles / permissions / object scopes
Authorities / responsibilities
Domains / capabilities
Surfaces / apps / control-panel sections
Entry points
Routes / screens / tabs / actions
Journeys
States / transitions / preconditions / invariants
Handoffs / responsibilities / readback
Canonical writers / readers / consumers
Contracts / APIs / events
DB schemas / tables / columns / constraints / indexes
Migrations / seeds / backfills
Queues / outbox / jobs / callbacks / providers
Runtime / config / ports / environment / secrets
Observability / audit / correlation
Security / privacy / isolation
Tests / CI / release / rollback
Repository structure / ownership / naming / dependencies
Dead / stale / duplicate / legacy / fallback residue
```

وسع TARGET فقط بعلاقة مثبتة:

```text
semantic parent
journey
state transition
handoff
writer/read consumer
contract/data dependency
runtime dependency
security boundary
blast radius
```

إذا كان TARGET=كل شيء، فلا تستبعد أي domain/surface/foundation إلا بـ`NOT_APPLICABLE_WITH_PROOF`.

---

# 5) Phase 2 — Journey-by-Journey × Multi-Surface × Cross-Layer

لكل رحلة مادية ابنِ:

```text
Journey ID
Outcome
Actor
Entry
Preconditions
Authorization / scope
Action / command
Decision rule
Current state
Legal transition
Next state
Invariants
Persisted mutation
Side effects
Handoff
Next actor/surface
Canonical owner
Success
Failure
Recovery
Later readback
Cross-surface meaning
Evidence
```

ولا تفحص Client أو Partner أو Captain أو Field أو Control Panel كأنها منتجات مستقلة إذا كانت الرحلة نفسها تعبر بينها.

لكل مسار مادي اختبر ذهنيًا/تقنيًا حسب الانطباق:

```text
success
empty/missing
invalid
unauthenticated
denied
wrong role/scope
IDOR
forbidden state
not found
stale/conflict
boundary values
duplicate/replay
idempotency
race/concurrency
partial failure
dependency unavailable
timeout/unknown result
retry/backoff/DLQ
offline/reconnect
process/device restart
provider degraded/failure
old/new data
mixed-version migration
rollback/roll-forward
compensation
reconciliation
```

---

# 6) Phase 3 — التشخيص متعدد الأبعاد من الإبرة إلى الصاروخ

لا يكفي Journey correctness. افحص كل طبقة ذات علاقة:

## Product / Logic

- outcome correctness
- product rule ambiguity
- authority/responsibility
- policy vs invariant vs config
- legal state machine
- cross-actor responsibilities

## Frontend / UI / UX

- routes/screens/tabs/actions reachable
- correct shared binding
- no business/financial authority in UI
- loading/empty/error/retry/offline/stale/disabled/forbidden/success
- navigation/deep links
- RTL/accessibility/visual/layout
- permissions reflected but not authored by UI
- local persistence cannot become canonical truth

## Shared frontend

صنّف كل shared module إلى:

```text
transport adapter
generated-client wrapper
controller
view-model
state mapper
presentation policy
domain type
state machine
runtime binding
```

واكشف duplicate DTO/state/business rule/direct transport.

## Contracts / APIs

- OpenAPI/schema parity
- request/response/error semantics
- IDs explicit by meaning
- generated client provenance
- backwards/forward compatibility
- authorization at server boundary
- idempotency/concurrency contracts

## Backend / Domain

- canonical owner
- legal command path
- no best-effort required side effects
- no swallowed errors
- no direct cross-domain truth mutation
- one write path per transition

## Data / DB / Migrations

- owner per authoritative field/table
- FK/check/unique/index correctness
- transaction boundaries
- fresh install + supported upgrades
- backfill/cutover/readback
- mixed-version behavior
- no rewrite of applied history
- no duplicate/obsolete writer after cutover

## Integrations / Events / Jobs / Providers

- sender/receiver responsibility
- schema/version
- outbox/durability
- callback authenticity
- retry/replay/idempotency
- ordering
- unknown result
- reconciliation
- DLQ/terminal state
- desired config vs observed health

## Security / Privacy

- authn/authz
- role/object/tenant/store/partner/actor scope
- IDOR
- service identity
- sensitive-data redaction
- secrets
- maker/checker or step-up when required
- audit provenance
- consent provenance and revocation
- production rejection of debug/test identity paths

## Runtime / Operations

- canonical env/config
- ports/endpoints
- startup validation
- health/readiness truthfulness
- no hidden localhost/legacy fallback
- Docker/bootstrap
- mobile/native declarations
- EAS/build/runtime parity
- logs/metrics/traces/alerts
- release/rollback

## Repository / Structure

- canonical directories by owner/responsibility
- naming/context correctness
- dependency direction
- misplaced components/services/contracts
- duplicate packages
- dead/stale exports
- unused deps
- generated vs handwritten ownership
- docs/governance references that still claim obsolete truth

---

# 7) Phase 4 — Findings → Root Causes → Competitive Deepening

كل Finding مادي يجب أن يكون ID-addressable ويسجل:

```text
Finding ID
actual evidence
operational parent
classification
candidate root cause
canonical owner
blast radius
writers
readers/consumers
dependencies
security/data/finance risk
proposed target state
required proof
status
```

ثم:

```text
findings
→ root-cause clusters
→ dependency/impact graph
→ competitive deepening
→ systemic-leverage ranking
→ adversarial challenge
→ execution frontier
```

لا يُسمح ببقاء Finding بلا Root Cause إلا إذا `EXCLUDED_WITH_PROOF`.

كل Root Cause مادي يجب أن يكون:

```text
DEEPENED_ENOUGH_TO_RANK
or
PROVEN_CANNOT_OUTRANK
```

الـPriority=1 يجب أن يكون الأول فقط لأن الأدلة تثبت أنه أعلى جذر مادي قابل للتنفيذ، لا لأنه ظهر أولًا.

---

# 8) Phase 5 — Decision Closure

قبل تجاوز أي boundary يحتاج قرارًا منتجيًا/وظيفيًا/معماريًا غير مشتق:

```text
search authority/current code/contracts/data/runtime first
→ derive everything derivable
→ merge duplicate questions
→ keep only true non-derivable decisions
```

لكل سؤال:

```text
DEC-*
Question
Why evidence cannot decide
Option A
Option B
Option C if real
Recommendation
Reason
Impact/tradeoffs
Affected roots/journeys/surfaces/contracts/data
```

بعد الإجابة:

```text
record decision
→ propagate to affected graph
→ invalidate stale assumptions/evidence
→ re-diagnose only affected cone
→ re-rank if material
```

لا تخمّن لتجنب السؤال، ولا تسأل عن حقيقة يمكن إثباتها بنفسك.

---

# 9) Phase 6 — Canonical Target / Reconstruction Blueprint

قبل التنفيذ الجذري، اكتب Target State كافيًا لمنع refactor عشوائي.

لكل Root/Capability مادي حدّد:

```text
canonical owner
allowed writers
readers/projections
actor/permission
state machine
invariants
API/event contracts
data model
transaction/handoff model
idempotency/recovery
surface readback
security/audit
runtime/config
observability
migration/cutover
legacy-removal rule
verification
```

للمهام الواسعة/المعمارية يجب كذلك تحديد:

```text
Domain/Repository Target Architecture
→ canonical folders
→ ownership/context
→ dependency direction
→ generated-vs-handwritten boundaries
→ shared component rules
→ preserve/move/rewrite/delete map
```

القاعدة:

```text
INHERITED ≠ APPROVED
EXISTING ≠ CANONICAL
OLD ≠ DELETE
NEW ≠ BETTER
```

كل أصل يثبت مصيره بالأدلة.

---

# 10) Phase 7 — إنشاء/تحديث حزمة التنفيذ V5

أنشئ الحزمة في:

```text
plans/diagnose-implementing/<TASK_NAME>/
```

باستخدام V5 الحالي، ويجب أن يبقى `PACKAGE.md` مطابقًا لـ`PACKAGE.template.md` وقابلًا للفحص بواسطة `orchestrator.mjs`.

الحد الأدنى الحاكم داخل PACKAGE:

```text
Operational Coverage
Root-Cause Graph
Ledger
Frontier
Evidence
Closure
```

يجوز إضافة Derived Support مثل:

```text
START-HERE.md
DIAGNOSIS.md
DECISIONS.md
COVERAGE.md
RECONSTRUCTION-MAP.md
CLEANUP.md
RECONCILIATION.md
VERIFICATION.md
evidence/**
```

فقط عندما تضيف قيمة حقيقية ولا تنشئ file forest أو مصادر حقيقة موازية.

## بوابة PREPARE

لا يصبح `PREPARED` إلا إذا:

```text
operational coverage materially settled
negative-space pass
adversarial pass
all material findings accounted
all material decisions accounted
all material consumers/dependencies/scope deltas accounted
root causes clustered and ranked
priority winner deepened enough
canonical target state defined
migration/cutover/cleanup plan defined
verification defined before execution
all frontier rows PREPARED
no hidden material ambiguity
```

إذا `MODE=PREPARE_ONLY`: **توقف هنا فقط**، والحالة `PREPARED_NOT_CLOSED`.

---

# 11) Phase 8 — التنفيذ الجذري Root-by-Root

يعمل فقط في `MODE=EXECUTE_END_TO_END`.

لكل أعلى Root Cause:

```text
1. freeze canonical meaning/owner
2. define target state/contracts/data/state machine
3. inventory all writers/readers/consumers
4. implement authoritative owner first
5. enforce invariants
6. update backend/domain
7. forward-migrate schema/data/backfill
8. update contracts/events/OpenAPI
9. regenerate clients
10. migrate shared bindings/controllers
11. migrate all surfaces/actions
12. migrate jobs/providers/integrations
13. align auth/security/audit
14. align runtime/config/observability
15. prove failure/idempotency/concurrency/recovery
16. canonical readback
17. cut over callers
18. prove zero use of old authority
19. delete obsolete/duplicate/fallback residue
20. rerun affected + blast-radius verification
21. adversarially re-diagnose the root
22. close root only if every required condition passes
```

إذا ظهر جذر أعلى أثناء التنفيذ:

```text
suspend affected descendant work
→ update graph/evidence
→ rerank affected cone
→ fix upstream root
→ invalidate dependent evidence
→ resume only if still required
```

---

# 12) قاعدة إعادة الهيكلة — معالجة السياق لا سحق القيمة

أي ملف/مجلد/Component/API/Table/Service/Contract/Config يمر بإحدى الحالات:

```text
KEEP
HARDEN
MOVE
RENAME
MERGE
SPLIT
REFACTOR
MIGRATE
REGENERATE
REWRITE
REPLACE
DELETE
```

## لا تفقد التصميم أو UX الصحيح

إذا كان UI/UX/asset صحيحًا لكن سياقه خاطئ:

```text
preserve visual/product value
→ move into canonical ownership/context
→ replace wrong business/state/API binding
→ verify visual + functional parity
→ delete obsolete wrapper/path
```

## لا Clean-Room بلا سبب

لا تعِد بناء pnpm/Expo/EAS/Metro/Next/Go/Docker/CI/runtime/tooling من الصفر إذا ثبتت foundation سليمة. أعد بناء **العمارة والسياق والملكية**، لا كل سطر لمجرد أنه قديم.

---

# 13) ممنوعات الإغلاق الجذري

ممنوع أن يبقى كحل نهائي:

```text
patch-around
workaround
silent fallback
parallel source of truth
shadow writer
duplicate state machine
frontend authoritative finance/business logic
UI-only authorization
manual authoritative data edit خارج command الحاكم
caller-authored money when owner must derive it
best-effort required financial mutation
swallowed error
fake success before readback
indefinite compatibility alias
old reachable route بعد cutover
debug/test runtime authority
TODO/FIXME/HACK replacing real closure
disabled/skipped/weakened test to manufacture green
static/mock evidence used as runtime proof
```

Compatibility مؤقتة مسموحة فقط إذا كانت **حاجة انتقالية حقيقية** ولها:

```text
owner
scope
explicit contract
observability
expiry/removal gate
migration consumer list
negative tests
```

---

# 14) Phase 9 — التحقق حسب الخطر والطبقة

ابدأ بأصغر تحقق كافٍ أثناء root fix، ثم وسّع إلى blast-radius/global closure.

## Static / Build / Contracts

```text
compile
typecheck
lint
unit
schema/openapi lint
contract drift
generated-client provenance
boundary/ownership guards
diff check
```

## Data

```text
migration order/manifest
fresh DB
supported upgrade DB
constraints/invariants
backfill
mixed-version/cutover
restart/readback
old-writer zero residue
```

## Distributed / Integration

```text
success
invalid/denied
idempotent duplicate
payload-divergent replay
timeout after commit
unknown result
dependency outage
retry/backoff/DLQ
restart
out-of-order
race/concurrency
compensation/reconciliation
```

## UI / UX

```text
reachability
correct role/scope
canonical binding
loading
empty
error
retry
offline/stale
disabled/forbidden
success/readback
RTL
accessibility
visual/layout
no local authoritative truth
```

## Security

```text
authn/authz negatives
IDOR
cross-actor/store/partner/tenant isolation
service identity
financial mutation authority
secret/sensitive-data review
audit/correlation
security scan + validation + attack-path analysis when applicable/available
```

## Runtime

```text
services start
migrations/bootstrap
health/readiness
critical journeys
failure paths
logs/audit/readback
no fallback masking missing dependency
mobile/device/EAS where applicable
```

## Review

استخدم code-review tooling الملائم مثل CodeRabbit عندما يكون متاحًا، وأغلق أو افنِ بالدليل كل finding مهم قبل closure.

---

# 15) Phase 10 — Cleanup / Zero Residue

بعد cutover، ابحث نصيًا ودلاليًا عن:

```text
old names/types/enums
old APIs/routes
old clients/adapters
old tables/columns
old writers
old read models
legacy env/config keys
hardcoded URLs
fallback/workaround markers
dead imports/exports
unused deps
duplicate policy/calculation/state
stale tests
stale generated artifacts
stale governance/docs that still claim authority
misplaced files/folders
```

لكل Cleanup item:

```text
discover
→ prove obsolete/wrong/duplicate
→ replacement/cutover proof
→ zero-reference/reachability proof
→ remove/merge/move
→ repair refs/consumers
→ reverify
```

لا تحذف اعتمادًا على static orphan signal وحده.

---

# 16) Phase 11 — Exact Candidate / Foreign Delta / Final Closure

بعد آخر source/data/config write:

```text
resolve latest TASK_HEAD
→ invalidate affected prior evidence
→ run required candidate-bound verification
→ reconcile latest INTEGRATION_BRANCH
→ classify foreign delta
→ reverify affected cone
→ integrate non-force/fast-forward-safe when authorized
→ FINAL_CANDIDATE = exact live integration HEAD
→ final read-only runtime/security/adversarial verification
```

أي write بعد final verification يصنع Candidate جديدًا ويعيد فتح evidence المرتبطة.

---

# 17) معادلة الإغلاق

لا يسمح `CLOSED` إلا مع:

```text
ZERO unresolved material decisions
ZERO unaccounted material findings
ZERO unknown material consumers
ZERO unresolved material dependencies
ZERO contradictory canonical truths
ZERO duplicate authoritative writers
ZERO parallel source of truth
ZERO reachable obsolete path
ZERO unjustified workaround/fallback
ZERO material migration/backfill gap
ZERO material contract/binding drift
ZERO material auth/scope/security gap
ZERO material runtime proof gap
ZERO material cleanup residue
ZERO evidence bound to stale candidate
ZERO known fixable material defect inside proven scope
```

بالإضافة إلى:

```text
canonical Product/Operational meaning proven
all affected writers/readers/consumers migrated
exact-candidate evidence current
runtime/product evidence when required
final adversarial/negative-space pass
V5/governance guards pass
```

لا تستخدم `100%` أو `1000%` أو `10000%` كعبارة ثقة. ترجمتها الهندسية الوحيدة هي: **كل عنصر مادي معروف أو مطلوب في النطاق المثبت له disposition ودليل حديث على الـcandidate الصحيح**.

---

# 18) حالات التوقف الوحيدة المسموحة

```text
PREPARED_NOT_CLOSED
```
في `MODE=PREPARE_ONLY` بعد عبور بوابة التحضير.

```text
BLOCKED_DECISION_REQUIRED
```
عند قرار مادي غير مشتق، مع سؤال القرار الكامل.

```text
BLOCKED_EXTERNAL_WITH_EXACT_UNBLOCK
```
عند مانع خارجي حقيقي لا يمكن تنفيذه بالأدوات/السلطة الحالية، مع إثبات وشرط فك واضح.

```text
TARGET_CLOSED_EXACT_CANDIDATE_EVIDENCE
```
فقط عندما يشتق V5 الإغلاق فعلًا.

غير ذلك: **استمر**.

---

# 19) مخرجات التقرير النهائي لكل استدعاء

قدم فقط ما تثبته الأدلة:

```text
Pinned base/task/final SHA(s)
Target semantic root
Operational coverage summary
Root-cause landscape + priority rationale
Decisions resolved / decision blockers
Canonical target state
Package path
Prepared/executed frontier
Implemented roots (EXECUTE only)
Consumers/data migrated
Cleanup performed
Verification actually run + result + limits
Foreign delta reconciliation
Remaining exact blockers
Derived V5 state
```

ممنوع أن تجعل كتابة Package أو Documentation بحد ذاتها دليلاً على Product/Runtime PASS.

---

# 20) القاعدة النهائية المختصرة

```text
PIN TRUTH
→ UNDERSTAND THE SYSTEM FROM THE TOP
→ TRACE EVERY MATERIAL JOURNEY AND OWNER
→ ACCOUNT FOR EVERY MATERIAL GAP
→ FIND THE HIGHEST PROVEN ROOT
→ RESOLVE TRUE DECISIONS
→ DEFINE THE CANONICAL TARGET
→ PREPARE A MACHINE-CHECKABLE V5 PACKAGE
→ IF PREPARE_ONLY: STOP PREPARED
→ IF EXECUTE_END_TO_END: FIX ROOT END-TO-END
→ MIGRATE EVERY CONSUMER AND DATA PATH
→ PRESERVE PROVEN VALUE, REBUILD WRONG CONTEXT
→ DELETE SUPERSEDED RESIDUE
→ VERIFY THE EXACT CANDIDATE
→ ADVERSARIALLY TRY TO DISPROVE CLOSURE
→ CLOSE ONLY WHAT THE EVIDENCE ACTUALLY PROVES
```
