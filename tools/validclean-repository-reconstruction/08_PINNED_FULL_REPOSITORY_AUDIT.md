# 08 — خط أساس الجرد الكامل المثبت

## المرجع غير القابل للالتباس

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch_at_audit_start: validclean
target_sha: fbc0139234e2bdb34a8de77d74a6b91297a754b0
target_short_sha: fbc013923
audit_workflow_run: 30422464222
audit_artifact_id: 8712393270
audit_artifact_sha256: 64fd8d9a875a5acc2cb41f2765052d26df871b1b38434f451f0eed2897383895
audit_mode: READ_ONLY_PINNED_CHECKOUT
source_mutation: false
```

تم تشغيل الفاحص على Checkout منفصل ومثبت على SHA أعلاه. ملفات الأداة والـWorkflow كانت في Checkout آخر، لذلك لا تحتوي النتائج على الملفات التي أضيفت بعد `fbc013923`.

## حجم المستودع المثبت

```yaml
total_tracked_paths: 3938
total_bytes: 32209598
total_text_lines: 509826
security_protected_paths: 347
financial_protected_paths: 598
migration_protected_paths: 403
runtime_protected_paths: 344
```

### التصنيف البنيوي

```yaml
governance: 218
source: 2120
documentation: 34
runtime: 329
test: 414
contract: 159
generated: 25
database: 403
tooling: 236
```

## النتائج المنقحة

النسخة الأولى من الفاحص اعتبرت الـBundles المولدة منافسًا لعقودها المصدرية. تم رفض هذا الاستنتاج وتصحيح الفاحص بحيث يميز بين:

```text
CANONICAL_SOURCE
GENERATED_DERIVATIVE
```

العدادات المعتمدة بعد التصحيح:

```yaml
total_findings: 345
P0: 56
P1: 60
P2: 229
```

### P0 — أخطار تمنع ادعاء الإغلاق

```yaml
canonical_operation_id_collisions: 24
migration_prefix_collisions: 32
```

#### ملكية عمليات OpenAPI المكررة

المثبت حاليًا:

- عمليات Progressive Rollout موجودة في `core/platform-control/contracts/jrn-041-progressive-rollout.openapi.yaml` و`core/platform-control/contracts/platform-control.openapi.yaml` معًا.
- عمليات Platform Change Sets موجودة في `core/platform-control/contracts/platform-change-sets.openapi.yaml` و`core/platform-control/contracts/platform-control.openapi.yaml` معًا.
- ثماني عمليات تخص Pickup/Partner Delivery SLA موجودة في `services/dsh/contracts/dsh.fulfillment-operations.openapi.yaml` و`services/dsh/contracts/dsh.partner-delivery.openapi.yaml` معًا.

القرار الحاكم: لا يُسمح لعقد دخول الخدمة أن يكون نسخة يدوية من وحداته. يجب أن يكون إما Entry Composer أو Bundle مولدًا، ولا يبقى operationId في مصدرين قابلين للتحرير.

#### تصادم بادئات الترحيلات

آلية DSH الحالية:

```text
Sort-Object Name
→ ledger key = full migration filename
→ checksum per full filename
```

وبالتالي لا يعني تكرار الرقم أن الملف لن ينفذ، لكنه يعني أن الرقم لم يعد ترتيبًا حاكمًا وأن ترتيب الملفات يعتمد على المقارنة النصية للأسماء. هذا يخلق خطرًا دلاليًا، ويمنع استخدام الرقم كمرجع تاريخي موثوق.

المعالجة الجذرية موثقة في `12_DATABASE_MIGRATION_RECONSTRUCTION.md`، ولا تتضمن إعادة تسمية Migration مطبقة.

### P1 — انحراف مستمر ومصادر ضجيج عالية التأثير

```yaml
absolute_local_paths: 21
generated_without_provenance: 7
openapi_owner_missing: 22
unconsumed_generated_candidates: 9
validclean_package_state_conflicts: 1
```

#### مسارات محلية مطلقة

توجد إشارات إلى `C:\...` أو `file:///c:/...` داخل ملفات تشغيل وحوكمة وأدوات، منها:

- أدوات EAS/Firebase/Sentry.
- وثائق حوكمة وتشغيل.
- `README.md` الجذري.
- `tools/guards/cleanup-policy-gate.mjs`.

لا يُحذف كل ذكر لمسار Windows تلقائيًا؛ يُصنف إلى:

```text
RUNTIME_PATH_BUG
LOCAL_RUNBOOK_EXAMPLE
TEST_FIXTURE
STALE_EVIDENCE
```

ثم يُستبدل بمسار نسبي، متغير بيئة، أو يُحذف الملف التاريخي.

#### Generated بلا Provenance أو استهلاك مثبت

أبرز المرشحين:

- واجهات WLT-DSH تحت `services/dsh/frontend/shared/finance-wlt-link/wlt/generated/`.
- ملفات `core/identity/clients/generated/identity-api.{js,d.ts,map}` التي لم يظهر لها inbound reference مباشر.

لا يعني ذلك الحذف الفوري. القرار المطلوب لكل ملف:

```text
GENERATE_AND_CONSUME
MOVE_TO_BUILD_ARTIFACT
REPLACE_THEN_DELETE
DELETE_PROVEN_DEAD
```

### P2 — ضجيج وتعقيد

```yaml
duplicate_script_aliases: 16
empty_tracked_files: 87
exact_duplicate_content_groups: 36
noise_path_candidates: 19
repeated_basenames: 24
unconsumed_tool_candidates: 47
```

هذه عدادات مرشحة وليست أوامر حذف آلية. `.gitkeep` قد يكون ضروريًا فقط إذا كان المجلد الفارغ جزءًا من عقد هيكلي فعلي؛ وإلا يحذف المجلد الوهمي كاملًا.

## فجوة الحزمة السابقة المثبتة

الحزمة نفسها كانت تحمل حالات متعارضة:

```text
PLAN_ONLY_AWAITING_OWNER_APPROVAL
READY_FOR_OWNER_REVIEW
CLOSED_WITH_EVIDENCE   # مذكورة كحالة انتقال/شرط في ملفات أخرى
```

بينما التنفيذ كان قد بدأ بالفعل. لذلك أصبحت الحزمة مصدر حالة غير موثوق. تحديث README وManifest إلزامي ضمن VC-101، ولا يجوز إبقاء نصوص تقول إن الحذف أو التعديل لم يبدأ.

## حدود هذا الجرد

الفاحص يغطي كل ملف متتبع ويكشف بنيويًا:

- الحجم والتصنيف والحماية.
- التكرار المطابق.
- operationId المصدرية المتكررة.
- بادئات الترحيلات المتصادمة.
- OpenAPI metadata.
- Workflows ذات صلاحيات أو mutation.
- المسارات المطلقة.
- Generated provenance.
- الاستهلاك الداخلي الظاهر بالـimports والمراجع والمسارات.

لكنه لا يثبت وحده:

- صحة منطق الأعمال.
- صحة كل Route مقابل Runtime.
- أن الملف بلا inbound reference غير مستهلك عبر discovery ديناميكي.
- سلامة قواعد البيانات القديمة.
- اكتمال كل Surface.

لذلك يتحول الجرد إلى موجات تنفيذ واختبارات رأسية، ولا يُستخدم كبديل عن Runtime وDB evidence.
