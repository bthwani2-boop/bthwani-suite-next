# 05 — بروتوكول الحذف والدمج والحماية

## 1. فلسفة التنظيف

التنظيف ليس تقليل عدد الملفات بأي ثمن. الهدف هو تقليل عدد مصادر القرار والكتابة والحقيقة، مع الحفاظ على القدرة التشغيلية والحماية.

```text
نحتفظ بالبيت والبنية التحتية الصالحة
→ نصلح عيوب الأساس
→ نزيل الأثاث والمنطق المتعارض
→ نعيد بناء الرحلات على مصادر حاكمة
```

Git history هو الأرشيف الافتراضي. لا ننقل الملفات المتقاعدة إلى مجلد Archive إلا لسبب قانوني أو تشغيلي مثبت.

## 2. الحالات المسموحة لكل ملف

### KEEP_ACTIVE

الملف صحيح، مملوك، مستهلك، ومتحقق.

### REPAIR_FOUNDATION

القدرة مطلوبة لكن تنفيذها معيب، مثل:

- Docker readiness خاطئ.
- EAS script غير مستقر.
- عقد مركزي صحيح الفكرة لكنه مفكك.
- Guard صحيح الغرض لكنه يملك قائمة يدوية.

يصلح التنفيذ ولا تحذف القدرة.

### MERGE_TO_CANONICAL_OWNER

المحتوى مفيد لكنه مكرر. تستخرج القواعد الفريدة إلى المالك الحاكم ثم يحذف المصدر المكرر.

### MOVE_TO_OWNER

الملف في مكان خاطئ ويملك مسؤولية واضحة داخل مجال آخر.

### REGENERATE

الملف مشتق ويجب أن ينتج حتميًا من المصدر الحاكم.

### REPLACE_THEN_DELETE

الملف حي لكنه خاطئ أو Legacy. يُنشأ البديل ويُرحّل المستهلكون ثم يحذف القديم في نفس الموجة أو نافذة انتقال قصيرة مؤرخة.

### DELETE_PROVEN_DEAD

لا مستهلك، لا سلطة، لا حماية فريدة، ولا أثر Runtime أو Build أو CI.

### BLOCKED_PENDING_EVIDENCE

الحذف خطر أو الملكية مجهولة.

## 3. ما يجب حمايته مبدئيًا

لا يعني الحماية منع التحسين، بل منع الحذف العشوائي:

- `apps/mobile/eas/` وما يعادله.
- `app.config.ts` و`eas.json` وmobile manifest.
- معرفات مشاريع EAS وFirebase وحزم Android/iOS.
- Dockerfiles وCompose وRuntime scripts الفعلية.
- `package.json` وlockfile وworkspace وNx وTypeScript configs.
- Migrations المنشورة وسجلها.
- اختبارات الأمن والعزل والمال والـIdempotency والاستعادة.
- محاكيات المزودين المستخدمة في اختبارات الفشل المالي.
- generated sources التي يعاد توليدها حتميًا إلى أن يثبت مسار توليدها.
- حراس حماية فعالة حتى لو احتاجت إعادة بناء.

## 4. شروط الحذف

لا يُحذف ملف إلا مع أدلة تنطبق عليه:

```yaml
no_runtime_imports: true
no_build_or_generation_consumers: true
no_ci_or_script_consumers: true
no_contract_or_migration_reference: true
no_unique_security_invariant: true
no_unique_financial_invariant: true
no_unique_recovery_or_runtime_invariant: true
replacement_verified: true | not_required
negative_search_completed: true
same_commit_checks_passed: true
```

## 5. الاختبارات

### تبقى أو يعاد بناؤها بقوة مساوية أو أعلى

- Authentication/session/device tests.
- Authorization and negative permission tests.
- Organization/tenant/store/actor isolation tests.
- Financial integrity and ledger balance tests.
- Migration fresh/old/replay/failure tests.
- Idempotency/concurrency/outbox tests.
- Runtime smoke/readiness/recovery tests.
- Contract-runtime-client binding tests.
- Accessibility runtime tests عند وجودها.

### يمكن إزالتها بعد الاستخلاص

- اختبارات نص تقرير أو اسم رحلة.
- Exact-SHA/branch-specific evidence tests.
- اختبارات وجود Registry تقاعد بدل اختبار غياب المسار.
- Snapshots لواجهة أزيلت.
- Mock-only success tests التي لا تثبت Runtime.
- اختبارات مكررة للسلوك نفسه دون قيمة إضافية.

## 6. generated وevidence

### Generated

يبقى في Git فقط إذا كان مستهلكًا من Build/Package/Runtime أو تحتاجه بيئة لا تستطيع التوليد، ويجب أن يمر:

```text
delete
→ regenerate
→ zero diff
```

### Evidence

- لا تلتزم تقارير تنفيذ مؤقتة أو logs أو screenshots أو scanner outputs.
- تستخدم CI artifacts للنتائج القابلة لإعادة التوليد.
- تبقى الأدلة القانونية أو التشغيلية التي لا يمكن إعادة بنائها فقط مع مالك ومدة احتفاظ.

## 7. التوافق القديم

أي Compatibility layer يجب أن يحمل:

```yaml
owner:
reason:
old_consumers:
new_path:
write_cutoff:
read_cutoff:
expiry_date:
removal_test:
```

الممنوع:

- Dual-write دائم.
- read-new-fallback-old.
- Alias دائم بلا انتهاء.
- Feature flag يحافظ على القديم بلا خطة إزالة.
- Registry يجعل Legacy جزءًا طبيعيًا من الحقيقة.

## 8. دفعة الحذف الآمنة

كل دفعة:

1. تثبيت SHA.
2. إثبات عدم الاستهلاك والبديل.
3. حذف نطاق صغير مترابط.
4. تشغيل import/build/contract/guard checks المتأثرة.
5. تشغيل Runtime smoke إذا كان الملف تشغيليًا.
6. مراجعة Diff كاملة.
7. Commit مستقل واضح.
8. منع خلط إصلاحات غير مرتبطة مع الحذف.

## 9. منع تكرار الضجيج

بعد كل فئة تنظيف، يضاف Guard عام فقط إذا كان يمنع نمطًا معماريًا متكررًا، مثل:

- أكثر من Master OpenAPI.
- Generated file معدل يدويًا.
- raw HTTP داخل surfaces.
- ثابت `000000` داخل auth flow.
- `local-dsh/default/public` كfallback حي.
- Legacy route دون expiry.

لا ينشأ Guard خاص باسم رحلة أو ملف واحد إذا كان اختبار Capability كافيًا.