# 00 — خط الأساس البعيد والحالة الحالية

## 1. تاريخ الفرع

```yaml
repository: bthwani2-boop/bthwani-suite-next
default_branch: master
original_source: abdo@98ab47dd59e5fc6f615cbe96094ec61fa0c8ffa3
rejected_source: cleaning@731133fc0d727510cbc4e3b2896abd7f55fca7a0
execution_branch: validclean
audit_target: fbc0139234e2bdb34a8de77d74a6b91297a754b0
package_state: REPOSITORY_WIDE_RECONSTRUCTION_AUTHORIZED
```

تم اختيار `abdo` لأن `cleaning` حذف اختبارات أمن وعزل وماليات وRuntime وملفات سلطة ما زالت المراجع الحاكمة تعتمد عليها. نوايا التنظيف الصحيحة تُعاد بعد إثبات بدائل الحماية، ولا تُعتمد حذوفات جماعية غير مثبتة.

## 2. ما نُفذ قبل إعادة التأسيس

الدفعة السابقة عالجت نطاقًا محدودًا:

- إزالة رمز التفعيل الشامل `000000`.
- توحيد خريطة actor type إلى surface.
- منع Public OTP لأدوار Workforce.
- إزالة Tenant fallback في ProvisionActor.
- منع إعادة استخدام Actor عبر Tenant مختلف.
- حذف Master OpenAPI الجذري الموازي.
- بناء WLT Bundle/Client حتمي.
- حذف سجل WLT retirement الموازي.
- إعادة تسمية بعض عقود WLT من Journey names إلى domain names.

هذه الإنجازات لا تعني إغلاق المستودع؛ كانت دفعة Identity/WLT/OpenAPI محدودة.

## 3. الجرد الشامل المثبت

تم فحص كل الملفات المتتبعة على SHA:

```text
fbc0139234e2bdb34a8de77d74a6b91297a754b0
```

الدليل:

```yaml
workflow_run: 30422464222
artifact_id: 8712393270
artifact_digest: 64fd8d9a875a5acc2cb41f2765052d26df871b1b38434f451f0eed2897383895
total_paths: 3938
```

النتائج المنقحة:

```yaml
P0: 56
P1: 60
P2: 229
```

التفاصيل في `08_PINNED_FULL_REPOSITORY_AUDIT.md`.

## 4. P0 المثبت

### 4.1 ملكية OpenAPI مصدرية مكررة

24 operationId موجودة في أكثر من عقد مصدر قابل للتحرير.

#### Platform Control

- Change Sets في عقد الوحدة وعقد الخدمة.
- Progressive Rollout في عقد Journey وعقد الخدمة.

#### DSH

ثماني عمليات Pickup/Partner Delivery SLA مشتركة بين:

```text
services/dsh/contracts/dsh.fulfillment-operations.openapi.yaml
services/dsh/contracts/dsh.partner-delivery.openapi.yaml
```

القرار: Entry contract لا ينسخ Modules. Composer وBundle مولد، وoperationId له مالك مصدر واحد.

### 4.2 تاريخ الترحيلات غير محكوم برقم فريد

32 مجموعة تحمل البادئة الرقمية نفسها. Runner الحالي يرتب بالاسم الكامل ويسجل الاسم الكامل وChecksum؛ التنفيذ ممكن، لكن رقم Migration ليس ترتيبًا حاكمًا.

القرار: Manifest تاريخي صريح، تجميد الملفات المطبقة، Cutover إلى أسماء monotonic فريدة، ومنع أي تصادم جديد. راجع `12_DATABASE_MIGRATION_RECONSTRUCTION.md`.

## 5. P1 المثبت

```yaml
absolute_local_paths: 21
generated_without_provenance: 7
openapi_owner_missing: 22
unconsumed_generated_candidates: 9
```

وتشمل:

- مسارات جهاز محلي داخل كود ووثائق وحراس.
- Bridges/Facades مولدة أو مسماة generated بلا provenance واضح.
- عقود DSH/WLT/Workforce/Platform Control بلا مالك صريح.
- Identity build outputs لا يظهر لها مستهلك مباشر ويجب فحص package exports قبل القرار.

## 6. P2 المثبت

```yaml
duplicate_script_aliases: 16
empty_tracked_files: 87
exact_duplicate_groups: 36
noise_path_candidates: 19
unconsumed_tool_candidates: 47
```

هذه مرشحات قرار لا أوامر حذف آلي.

## 7. فجوات لم تُغلق بعد

- Platform Control contract composition.
- DSH contract ownership/naming/composition.
- Migration Manifest وFresh/Upgrade/Replay proof.
- Generated client provenance لـIdentity/Workforce/Platform Control/Providers/DSH.
- Runtime وDB evidence للماليات والعزل.
- جرد tenant_id الدلالي على كل الخدمات.
- Shared frontend brain وتصفية WLT-DSH generated UI copies.
- كل الأسطح من الشاشة إلى قاعدة البيانات.
- الخدمات والمجلدات الفارغة.
- الحوكمة والمهارات والحراس والأدوات والتقارير التاريخية.

## 8. حدود الادعاء

الحالة الحالية ليست `CLOSED_WITH_EVIDENCE`. التنفيذ مصرح ومستمر، والمرجع النهائي هو:

- `10_REPOSITORY_WIDE_EXECUTION_LEDGER.md`
- `17_FINAL_CLOSURE_MATRIX.md`

لا يُعلن الإغلاق حتى تصبح كل عدادات المصفوفة صفرًا على SHA واحد.
