# الأمر 1 — التشخيص وإنشاء خطة تنفيذ قابلة للتنفيذ

Status: DERIVED_SUPPORT

استخدم هذا الأمر عندما يكون المطلوب **تشخيص مهمة/رحلة/تطبيق/سطح/صفحة/ميزة/خدمة/نطاق ثم تجهيز خطة تنفيذ مكتفية ذاتيًا** دون تنفيذ تغييرات المنتج نفسها.

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

## التنفيذ

نفّذ **التشخيص والتخطيط فقط** وفق `governance/GOVERNANCE.md` و`governance/product/PRD.md` والسياسة العامة المنطبقة وProduct Truth الحالي وبنموذج `CODE_BASED_LEAN`. ثبّت المستودع والفرع الذي حدده المستخدم وأحدث SHA ريموت كاملًا، ولا تستبدل الفرع أو تعتمد الذاكرة/التقارير التاريخية كحقيقة حالية.

افصل دائمًا بين:

```text
AUTHORITY TRUTH      = من يملك القاعدة أو القرار.
PRODUCT TRUTH        = ما يجب أن تحققه القدرة.
IMPLEMENTATION TRUTH = ما يفعله الكود والعقود والمهاجرات على SHA المثبت.
RUNTIME TRUTH        = ما ثبت فعليًا أثناء التشغيل/readback.
```

استخدم `plans/smsm-dsh-wlt-journeys/` كاكتشاف/تغطية مشتقة فقط عند الحاجة. عقود SDLC الحاكمة آليًا موجودة في `governance/contracts/sdlc/`. لا تجعل أي Plan أو Prompt أو تقرير Product Truth أو سياسة أو دليل تنفيذ.

حدّد النتيجة المطلوبة والفاعل والمالك الحاكم للحقيقة والكتابة، ثم تتبع أصغر مسار Full-Stack كامل مرتبط بالهدف عبر السطح، shared controller/adapter، generated contract/client، backend/domain، database/events/integrations، canonical readback، وكل سطح مستهلك متأثر. وسّع فقط بسبب مثبت في الملكية أو الاعتماديات أو المنتج أو الأمن أو المال أو البيانات أو runtime.

### شمول التشخيص عند الانطباق

```text
product outcome / actors / required & excluded surfaces
platform/operator/business/object scope
truth owner / write owner / read consumers
state machine / legal & forbidden transitions
OpenAPI / generated client / route registration
backend orchestration / validation / idempotency / concurrency
database migrations / constraints / indexes / transactions / backfill
events / outbox / jobs / retry / dedupe / reconciliation
providers / media / cache / search / service authentication
WLT financial ownership and DSH projection boundary
loading / empty / offline / forbidden / conflict / partial / error / recovery
RTL / localization / accessibility / device/network behavior
legacy / duplication / parallel truth / mock/fallback runtime state
required evidence scopes and protected approvals
```

لا تعتبر كل بند منطبقًا تلقائيًا؛ أثبت الانطباق ثم وسّع.

## إنشاء الحزمة

إذا كان Shell/Node متاحًا:

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <TASK_NAME> `
  --branch <TARGET_REF> `
  --sha <PINNED_REMOTE_SHA> `
  --surface <TARGET> `
  --objective "<OBJECTIVE>" `
  --repository <REPOSITORY>
```

أنشئ وحدة واحدة لكل concern تنفيذي غير متداخل:

```powershell
node plans/diagnose-implementing/new-unit.mjs `
  plans/diagnose-implementing/<TASK_NAME> `
  --id U001 `
  --name <unit-name> `
  --kind <TOPIC|CONTEXT|JOURNEY|FOUNDATION|MIGRATION|CLEANUP|VERIFICATION> `
  --depends-on "<comma-separated-unit-ids-or-empty>"
```

إذا لم يتوفر Shell فلا تدّع تشغيل المولد أو Validator. يمكن إنشاء الملفات عبر GitHub API فقط بعد قراءة القوالب الحالية والمحافظة على Schema، وتبقى نتيجة التحقق `NEEDS_EVIDENCE` حتى يُشغّل Validator فعليًا.

## كل وحدة تحدد

```text
executionConcern
rootCause
canonicalOwner
affectedPathsAndSymbols
affectedSurfacesAndReadbacks
orderedChanges
forbiddenChanges
dependencies
acceptanceCriteria
requiredChecksAndProofLimits
rollbackOrRollForward
logicalCommitBoundary
```

لا تكرر concern نفسه ولا تستخدم أوامر مبهمة من نوع “أصلح ما يلزم”.

إذا كان الهدف Journey/Application/Surface أو متعدد الأسطح، افتح Foundation concern فقط عندما يثبت أن عيبًا مشتركًا يمنع إثبات عدة وحدات؛ لا تستخدم Foundation ذريعة لمسح المستودع كاملًا.

## التحقق

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<TASK_NAME> --strict
```

لا تستخدم flags غير موجودة ولا `--closure` في مرحلة التخطيط.

## القرار

استخدم `governance/contracts/decision-vocabulary.json` فقط:

- `PASS`: strict شُغّل فعليًا ونجح والخطة كاملة ضمن نطاقها.
- `NEEDS_EVIDENCE`: الخطة موجودة لكن تحقق مطلوب مفقود/stale.
- `FIX_REQUIRED`: نقص/تداخل/Schema/سبب داخلي غير محسوم.
- `BLOCKED_EXTERNAL`: اعتماد خارجي حقيقي بعد استنفاد العمل الداخلي الآمن.

التقرير:

```text
repository
target_ref
pinned_sha
package_path
scope_summary
root_causes
execution_units
strict_validation
final_decision
remaining_unknowns_or_external_dependencies
```

لا تعدّل كود المنتج في هذا الأمر.
