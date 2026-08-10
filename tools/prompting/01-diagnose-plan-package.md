# الأمر 1 — التشخيص العميق وإنشاء حزمة تنفيذ قابلة للتنفيذ

Status: DERIVED_SUPPORT

استخدم هذا الأمر لتشخيص مهمة/رحلة/تطبيق/سطح/قسم/صفحة/ميزة/خدمة/نطاق بعمق ثم تجهيز حزمة تنفيذ مكتفية ذاتيًا **دون تعديل المنتج نفسه**.

> هذا Prompt مساعد مشتق. كل Schema/enum/flag/path مذكور فيه يخضع للمصدر الحاكم الحالي على الـSHA المثبت. لا تجعل Prompt أو Package أو تقريرًا مصدر Product/Implementation/Runtime/Repository-Platform truth.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
TASK_NAME: <safe-kebab-name>
TARGET_KIND: <JOURNEY | APPLICATION | SURFACE | SECTION | PAGE | FEATURE | SERVICE | DOMAIN | FILE | OTHER>
TARGET: <name/path/outcome>
PROBLEM: <observed problem or gap>
OBJECTIVE: <measurable desired outcome>
EXCLUSIONS: <[] or explicit exclusions>
DELIVERY: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

## 1. السلطة والحقيقة

اقرأ حسب الترتيب الحالي:

```text
current authorized task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth
→ applicable machine contracts/registries
→ exact pinned implementation/runtime/repository-platform evidence
```

افصل:

```text
AUTHORITY TRUTH
PRODUCT TRUTH
IMPLEMENTATION TRUTH
RUNTIME TRUTH
REPOSITORY-PLATFORM TRUTH
```

أي Derived/Historical source أضعف من هذه الحقيقة ولا يورث حالة أو قرارًا لمجرد وجوده.

## 2. تثبيت الريموت والقدرات

قبل القراءة العميقة أو الكتابة:

```text
resolve REPOSITORY + exact TARGET_REF
→ PINNED_REMOTE_SHA = full current remote SHA
→ read from pinned truth
```

قبل كل logical write batch أعد حل الرأس. إذا تحرك:

```text
PINNED_REMOTE_SHA → LATEST_REMOTE_SHA
→ classify semantic impact
→ reconcile before write
```

بعد آخر write/push أعد الحل وسجّل `FINAL_OBSERVED_REMOTE_SHA`.

ممنوع default-branch substitution / force-push / hard-reset newer work / overwrite concurrent movement.

Capability Preflight — سجّل ما ينطبق:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_QUERY_LIVE_GITHUB
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_RUN_CI
CAN_RUN_SECURITY_CHECKS
CAN_RUN_E2E
CAN_RUN_VISUAL
CAN_ACCESS_PROVIDER
CAN_VERIFY_PRODUCTION
CAN_COMMIT
CAN_PUSH
```

قدرة مطلوبة وغير متاحة تصبح evidence/dependency requirement. لا تدّع تشغيل Tool/Test/Validator لم يُنفذ.

## 3. CODE_BASED_LEAN والنطاق

```text
smallest complete root-cause scope
→ proven dependency/risk expansion only
→ non-overlapping plan
→ risk-proportional verification
```

اسم السطح/التطبيق/الصفحة/الرحلة **نقطة بدء وليس حدًا**. وسّع فقط بعلاقة مثبتة: ownership/dependency/Product Truth/security/finance/data/runtime/readback.

```text
DIAGNOSIS_SCOPE = أصغر نطاق كامل يكشف السبب وكل علاقة لازمة للإغلاق.
EXECUTION_SCOPE = الهدف + الاعتماديات المثبتة + shared prerequisite اللازم فقط.
```

“عميق/شامل/100%” يرفع معيار الدليل ولا يبرر unrelated repository scan.

## 4. Seeded Coverage ليس مسحًا شاملًا

قد يزرع Generator الأسطح/المجالات كلها. هذه **assessment entries** لا أوامر deep scan:

```text
entry
→ bounded relevance check
→ RELATED: evidence + unit
→ proven non-related: supported exclusion + reason + reopen trigger
→ deepen only when relation/uncertainty is material
```

يجب تقييم required entries دون تحويل كل entry إلى مشروع تشخيص مستقل.

## 5. التشخيص الجذري

استخدم:

```text
DISCOVER → DIAGNOSE → CROSS-CHECK → CHALLENGE → RE-DIAGNOSE → PLAN → VERIFY_PLAN
```

لكل Finding مادي:

```text
path/symbol
problem + evidence
competing hypothesis checked
root cause
canonical truth/write owner
writers/readers/consumers
affected surfaces/journeys
security/data/financial/runtime risk
target state
required verification
```

حاول تكذيب Root Cause قبل اعتماده وابحث عن writer/reader/contract/state/runtime path بديل.
اعتمد الحل الجذري الصحيح دائماً بدل أي ترقيع (Patching) أو حل مؤقت. لا تقبل بأي Workaround يتجاهل السبب الجذري للخلل.

قبل إنشاء شيء جديد:

```text
search name + semantics
→ imports/exports/routes/navigation/registries/manifests
→ API/DB/test bindings
→ relationship tool only if ambiguity remains
```

الأولوية:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

## 6. Full-Stack Multi-Surface trace

تتبع بقدر الانطباق:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device
→ Trusted Platform/Operator/Partner/Store/Assignment scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ shared controller/adapter
→ generated client/canonical contract
→ API/domain/state machine
→ transaction/database
→ cache/idempotency
→ events/jobs/providers/WLT when financial
→ persisted canonical readback
→ every required consuming surface
→ audit/observability/runtime evidence
```

غطِّ success/invalid/denied/wrong-scope/forbidden-state/duplicate/replay/race/concurrency/timeout/unknown-result/offline/reconnect/retry/partial-failure/restart/mixed-version/compensation/reconciliation حسب الأثر.
أغلق أي فجوة، خطأ، أو تناقض (Contradiction) في العقود (Contracts) بين الـ APIs والـ Bindings وتطبيقات الـ Frontend والـ Backend، وتأكد من توحيد منطق التشغيل عبر جميع المسارات.

## 7. مخاطر يجب أن تدخل الخطة عند الانطباق

### PostgreSQL
Forward migration فقط؛ لا applied-history rewrite. خطط expand/compatible/backfill/switch/contract عند الحاجة، fresh/non-empty، drift/orphans/duplicates، locks/index/batching/idempotency، restart، rollback/roll-forward.

### Compatibility
old-mobile+new-backend، new-mobile+old-backend عند الحاجة، control-panel+backend، generated client/event/cache، mixed-version، rollback/roll-forward، compatibility owner/expiry/removal trigger.

### Security
auth/authz/session/token/secrets/PII/input-output validation/injection/SSRF/path traversal/upload/rate-limit/replay/IDOR/cross-scope/audit. UI-only auth غير مقبول.

### DSH/WLT
WLT يبقى المالك المالي. خطط idempotency/correlation/readback/reconciliation/unknown-result/compensation.

### Mobile / Control Panel
افحص native/deep-links/permissions/push/maps/SecureStore/offline/build/OTA/EAS/env عند Mobile، وroute/object auth/server-client/trusted scope/search isolation/bulk/audit/session/error/readback عند Control Panel.

## 8. Concurrent-Agent planning

عند احتمال تعدد الوكلاء، سجّل في مواضع الحزمة الحالية:

```text
integration-sensitive owners
shared contracts/schemas/generated clients
shared files + symbols
migration/transaction collision zones
cross-unit/journey collision zones
must-not-overwrite paths
reconciliation triggers when TARGET_REF moves
```

الحزمة لا تنشئ distributed lock ولا تفترض أن `pinnedStartSha` سيبقى push baseline.

## 9. Package lifecycle — Create / Resume / Rebaseline

المسار الحالي يحدد من framework الحي، حاليًا تحت `plans/diagnose-implementing/<TASK_NAME>/`.

قبل الإنشاء:

```text
ABSENT
→ create from current framework.

EXISTS + same task identity
→ RESUME_AND_RECONCILE; no overwrite/duplicate.

EXISTS + different identity
→ do not overwrite; distinct safe TASK_NAME.
```

### Current-schema projection

عند استئناف حزمة قديمة:

1. اقرأ **الـSchema/Generator/Validator الحاليين**.
2. الحقول القديمة/الإضافية غير المعروفة للـSchema الحالي = `DERIVED_LEGACY_METADATA` نصيًا؛ لا تخلق requirement أو scope أو approval بذاتها.
3. لا تتبع fixed slices/journeys/policies قديمة إذا تعارضت مع الحوكمة الحالية.
4. أي old PASS/DONE/evidence يعاد تقييمه مقابل current truth وcandidate binding.

### Stale-package rebaseline

إذا كان drift محدودًا: reconcile affected paths/contracts/owners فقط.

إذا تغيرت authority/framework/schema ماديًا، أو كان drift واسعًا/غير قابل للحد بأمان:

```text
DO NOT replay hundreds of commits mechanically
→ mark old assumptions/evidence stale where affected
→ re-diagnose target against latest head
→ rewrite the derived plan/package as needed
→ preserve history through Git
```

الحزمة المشتقة لا تستحق استهلاكًا غير محدود لمجرد قدمها.

## 10. إنشاء الحزمة بأمان

عند Shell استخدم generator الحالي بصيغته الفعلية.

عند GitHub Remote/API بلا Shell:

```text
read generator + templates + validator
→ apply current name/repo/ref/SHA/path validations manually
→ prefer one atomic tree+commit for package creation
→ if unavailable, minimum conditional writes with head re-resolve
→ fetch every created file from remote
→ compare shape with current framework
→ never claim Validator PASS
```

في بيئة متعددة الوكلاء، per-file Contents API لا يساوي branch-head Compare-And-Swap؛ final multi-file package writes تفضّل Git tree/commit + non-force ref update عندما تتوفر.

## 11. Coverage / Units / Ordering

`COVERAGE.json` هو structured coverage ledger الوحيد. استخدم assessments الحالية من Validator/Schema.

```text
evidence/finding
→ root cause/owner
→ coverage
→ unit
→ task
→ verificationId
→ acceptance
→ RESULT later
```

أنشئ وحدة واحدة لكل executionConcern غير متداخل. Foundation/Migration فقط عند shared blocker مثبت.

كل وحدة تحدد:

```text
root cause + truth owner
paths/symbols
writers/readers/consumers
surfaces/journeys
ordered atomic tasks
must-not-change
acceptance
verification + proof limits
rollback/roll-forward
logical commit boundary
dependsOn/unlocks
```

رتب hard dependency → foundation blocker → critical path → central unlock → high-risk early → cleanup last.

## 12. Verification plan + capability binding

اقرأ commands الحالية من manifests/scripts/workflows/registries:

```text
nearest root-cause check
→ unit/package integration
→ affected typecheck/lint/test/build
→ contract/data/security/isolation
→ runtime/readback/visual when claimed
→ full verification only if proven/policy-required
```

كل Check يذكر `proves` و`doesNotProve`. اربط كل planned evidence scope بقدرة فعلية ومسار الحصول عليها قبل التسليم.

## 13. Handoff Mapping إلزامي — بلا Schema موازٍ

```text
objective/claimed outcome → MANIFEST/START-HERE/GLOBAL-DIAGNOSIS
root cause/owner/write path → unit DIAGNOSIS + EXECUTION
required/excluded surfaces → COVERAGE + affectedSurfaces/journeys
must-not-change → EXECUTION tasks
acceptance/readback → acceptanceCriteria + VERIFICATION
verification/proof limits → VERIFICATION
evidence scopes/limits → GLOBAL-DIAGNOSIS + VERIFICATION
protected approvals → current authority resolution recorded in diagnosis/closure planning
compatibility/migration/rollback → unit diagnosis/execution/verification
external dependency/reopen trigger → COVERAGE/order planning
concurrency collision zones → diagnosis/execution must-not-change/dependencies
```

إذا عنصر لازم للإغلاق غير قابل للاستخراج من موضع واضح، الحزمة ليست Ready حتى لو لم يكتشفه Validator.

## 14. Readiness Gate

قبل التسليم:

```text
current schema/framework reconciled
MANIFEST diagnosis COMPLETE + plan READY
coverage COMPLETE + zero required UNASSESSED
order READY
planned units READY/valid DONE
no missing/cyclic dependency
no duplicate concern
no vague task
no unknown verification
no unresolved marker
no secrets/PII/production-sensitive content
handoff mapping complete
collision/reconciliation risks assessed
```

عند توفر Shell شغّل current `validate-package ... --strict`. لا تدّع PASS بدونه.

## 15. التسليم والـLatest-Head Gate

```text
NO_COMMIT | COMMIT | COMMIT_AND_PUSH
```

اكتب الحزمة فقط. لا product/runtime/governance changes في هذا الأمر.

محليًا:

```text
inventory pre-existing changes
→ never claim foreign delta
→ stage explicit package paths/hunks only
→ inspect staged diff
```

مباشرة قبل final commit/push:

```text
resolve latest TARGET_REF
→ compare old base → latest
→ reconcile authority/framework/package-path semantic impact
→ build on latest safe head
→ fast-forward-safe push only
→ re-resolve after final write/push
```

إذا تحرك الرأس مرة أخرى، أعد البوابة. Git pull/merge success ليس semantic proof.

## 16. Retention

الحزمة `DERIVED_SUPPORT`. صنفها وفق repository-retention policy:

```text
actively consumed → retain while needed
task-temporary/superseded/unconsumed/reproducible → remove when authorized and safe
Git history = default archive
```

لا تخترع `--disposal`.

## 17. التقرير والقرار

استخدم decision vocabulary الحالي فقط. `PASS` scoped وليس Final Closure.

```text
repository / target_ref
pinned_sha / final_observed_remote_sha
package_path / package_commit_sha
target + objective
root causes + owners
coverage/units/order
handoff + evidence/approval plan
concurrency/reconciliation zones
compatibility/security/finance/data/runtime concerns
strict validation actual result
remaining unknown/external dependencies
retention classification
final decision
confirmation: no operational project file modified
```
