# MASTER — ترتيب التنفيذ وحالة المراحل

## سلطة الملف

هذا الملف هو نقطة الدخول الوحيدة للحزمة. حالة الحزمة الحالية `DIAGNOSIS_AND_PLAN_ONLY`، ولا يجوز بدء تغييرات المنتج ضمن Commit إنشاء الحزمة.

## الحالات المسموحة

`PLANNED | IN_PROGRESS | BLOCKED | VERIFIED | CLOSED`

| الترتيب | المرحلة | الحالة الأولية | تعتمد على | مخرج الإغلاق |
|---:|---|---|---|---|
| 00 | `phases/PHASE-00-BASELINE-EVIDENCE.md` | PLANNED | لا شيء | SHA مثبت، دلتا وجرد متجدد، Baseline قابل للتكرار |
| 01 | `phases/PHASE-01-TRUST-IDENTITY-AUTHZ-FINANCE.md` | PLANNED | 00 | حدود ثقة وهوية وصلاحيات وسيادة مالية مثبتة |
| 02 | `phases/PHASE-02-CONTRACTS-DATA-DATABASES.md` | PLANNED | 01 | عقد مركزي وملكية بيانات ومهاجرات سليمة |
| 03 | `phases/PHASE-03-BACKENDS-RUNTIME-COMPATIBILITY.md` | PLANNED | 02 | Runtime أخضر ومسارات توافق مقيدة أو متقاعدة |
| 04 | `phases/PHASE-04-SHARED-FRONTEND-INTEGRATIONS.md` | PLANNED | 02,03 | Shared brains وعملاء وتكاملات موحدة |
| 05 | `phases/PHASE-05-MULTI-SURFACE-EXPERIENCE.md` | PLANNED | 04 | الأسطح الخمسة متسقة مع الحقيقة المركزية |
| 06 | `phases/PHASE-06-TOOLCHAIN-CI-GOVERNANCE-CLEANUP.md` | PLANNED | 00..05 | أدوات وCI وحوكمة دون سلطات أو حراس أو ملفات زائدة |
| 07 | `phases/PHASE-07-FINAL-VERIFICATION-CLOSURE.md` | PLANNED | 00..06 | دليل إغلاق كامل على SHA واحد |

## بروتوكول كل مرحلة

1. `PIN`: جلب أحدث رأس ريموت ومقارنته بآخر SHA مثبت.
2. `DIAGNOSE`: تجديد الأدلة والمواضع داخل نطاق المرحلة.
3. `DESIGN`: إثبات الملكية والبديل والترحيل والتراجع.
4. `FIX`: أصغر دفعة ذرية مترابطة فقط.
5. `VERIFY`: اختبارات مستهدفة وسلبية وبناء وتشغيل فعلي حسب النطاق.
6. `COMMIT/PUSH`: Commits ذرية قابلة للتراجع، بلا Force Push.
7. `RE-PIN`: تثبيت الرأس بعد Push ومطابقة الأدلة معه.
8. `CLOSE`: تحديث سجل المرحلة والنقاط غير المثبتة.

## شروط الانتقال

لا تنتقل إلى مرحلة لاحقة قبل إغلاق P0/P1 للمرحلة الحالية، أو توثيق مانع خارجي يستحيل تجاوزه. لا يُعتبر الاختبار الأخضر وحده دليلًا على سلامة التصميم؛ يجب إثبات الملكية والعقد والبيانات والتنفيذ والأسطح وعدم بقاء مسار قديم أو سلطة موازية.
