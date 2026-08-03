# الرئيسية — عقد الإغلاق النهائي

```yaml
section_id: dashboard
canonical_route: /dsh/dashboard
routes: [/dsh/dashboard]
source_registry: ../CONTROL-PANEL-SECTION-REGISTRY.json
status: OPEN_UNTIL_RUNTIME_AND_MANUAL_EVIDENCE
```

## النتيجة النهائية

بطاقات صحة الخدمات، التنبيهات الحرجة، ملخص SLA، freshness، والاختصارات المسموحة. القسم Surface تشغيلية مشتقة من ملاك الحقيقة، ولا يملك قاعدة بيانات أو حالة أو سياسة أو مبلغًا موازيًا. كل قراءة تعرض `source/version/as_of` عند الانطباق، وكل Mutation تمر بعقد مولد وصلاحية وObject Scope وVersion وIdempotency وAudit وReadback.

## Routes والصفحات

- `/dsh/dashboard`

كل Route المبينة يجب أن تملك عنوانًا وغرضًا وscope ظاهرًا وbreadcrumbs وحالات تحميل/جاهزية/فراغ/خطأ/منع/قدم/تعارض/نتيجة مجهولة، ولا يجوز وجود Route أو صفحة Placeholder غير مصنفة.

## الصفحات والتبويبات

بطاقات صحة الخدمات، التنبيهات الحرجة، ملخص SLA، freshness، والاختصارات المسموحة. يجب جرد كل Tab وDrawer وDetail وWizard وTable وCard وForm وDialog وربطه بالرحلات والـoperationIds، مع N/A مبررة للعناصر غير المنطبقة.

## القدرات الحاكمة

- `service-health`
- `readiness`
- `critical-alerts`
- `sla-summary`
- `journey-entrypoints`

## التحكمات والأزرار والأيقونات

تحديث البطاقة، فتح التشخيص، فتح العنصر المالك، إقرار تنبيه وفق الصلاحية؛ لا Force Healthy ولا تعديل حقائق المجالات. كل تحكم يملك accessibility name وpermission visibility منفصلة عن business enablement وloading محليًا ومنع double-submit وstale-conflict handling وunknown-result lookup وsuccess readback. لا زر أو Icon شكلي بلا API binding أو أثر.

## الحالات والصلاحيات

- الحالات الإلزامية: `loading`, `ready`, `empty`, `error`, `forbidden`, `stale`, `conflict`, `unknown-result`, `dependency-unavailable`, `recovered`.
- الصلاحيات تطبق Backend وObject Scope؛ إخفاء التحكم لتحسين UX فقط.
- deep links وsearch وfilters وexports تخضع للنطاق نفسه.
- البيانات الحساسة masked، والكشف المؤقت يحتاج سببًا وتدقيقًا.

## العقود والبيانات والملكية

قراءات مجمعة تحمل source وversion وas_of؛ لا KPI بلا تعريف ولا حساب مالي محلي. يجب توثيق owner لكل حقل وحالة وقرار، operationId/handler/repository/table/event/job/cache consumer، ومنع أي type/status/policy/formatter/fallback محلي يكرر السلطة.

## الاختبارات الآلية

- Contract/generated-client binding لكل Query وMutation.
- Permission/Object-Scope/IDOR وstale version وduplicate submit وresponse loss.
- server-side search/filter/sort/pagination وprojection rebuild/freshness.
- accessibility/RTL/i18n/performance/security/redaction.
- dependency unavailable/recovery وevent/job/cache reconciliation.

## التجريب اليدوي

إسقاط كل اعتماد حرج منفردًا، التحقق من HEALTHY/DEGRADED/NOT_READY/STALE، اختبار refresh المتكرر والصلاحيات وعودة الخدمة. إضافة إلى ذلك: فتح كل Route مباشرة، refresh/back/session expiry، اختبار كل Tab وFilter وSort وPagination وForm وDialog وButton وIcon بحساب مصرح وغير مصرح، نقر مكرر، فقد الرد بعد commit، قارئ شاشة ولوحة مفاتيح وRTL وzoom 200%.

## أدلة الإغلاق

- Screenshots/video لكل حالة رئيسية.
- request/response redacted وربط operationId.
- DB/event/audit/readback من مالك الحقيقة.
- نتائج الاختبارات وRuntime على SHA واحد.
- قائمة صريحة لأي عنصر `OPEN` أو `UNPROVEN`.

## بوابة الإغلاق

`section_id=dashboard; registered_routes=PASS; unmapped_pages_tabs_controls_states=0; permission_backend_mismatches=0; parallel_truths=0; automated_tests=PASS; manual_acceptance=PASS; same_sha_evidence=PASS`.
