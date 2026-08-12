# Field 3 — App Field Root-Cause Final Closure

هذه حزمة تنفيذ مشتقة جديدة لتطبيق الميداني على الفرع `BB`، baseline التشخيصي `bee8e9cfe1762cef39690f0b254fdf0b6855e1a9`. اسم المجلد الآمن هو `field-3`.

## النطاق

الحزمة تشمل `app-field` وكل علاقة مثبتة لازمة لإغلاقه: Identity، Workforce، DSH، Media، WLT، أجزاء Control Panel المرتبطة بالميدان، و`app-partner`/`app-client` للـreadback الناتج من رحلة الميداني. `app-captain` لا يدخل كمنتج ميداني؛ يدخل فقط في U011/U012/U015 بقدر العقد المالي المشترك الذي يجب ألا يتراجع عند إصلاح مالية الميداني.

أي جزء عام لا يملك علاقة سببية مثبتة بالميداني يبقى خارج التنفيذ. لا يجوز استخدام عبارة "شامل" لتوسيع العمل إلى repository-wide cleanup غير مرتبط.

## قاعدة التنفيذ FAIL-CLOSED

الأصل `OPEN`. أي خلل معلوم قابل للمعالجة داخل النطاق — خطأ، فجوة، تناقض، تكرار غير مبرر، كود ميت، ضعف صلاحيات، عقد غير متطابق، حالة غير محسومة، regression أو cleanup متبقٍ — يمنع الإغلاق. كل وحدة تنفذ Root Cause ثم Blast Radius ثم إصلاحًا coherent ثم cleanup ثم verification حديثًا. لا bypass ولا workaround ولا إسكات gate.

## Native Graph Freeze

أثناء U001–U013 لا تُحذف dependencies Native لمجرد أنها تبدو غير مستخدمة. القرار يمر:
`KEEP → DEPRECATED_CANDIDATE → DEPRECATED_CONFIRMED → REMOVE_ON_NEXT_NATIVE_REBUILD → REMOVED_AND_VERIFIED`.
الحذف المادي، manifest/plugin/permission cleanup والبناء الجديد محصورون في U014 بعد اكتمال الأدلة، بهدف نافذة Native/EAS موحدة قدر الإمكان.

## التنفيذ

ابدأ بإعادة حل `BB` وتصنيف أي حركة منذ baseline، ثم نفذ الوحدات حسب `EXECUTION-ORDER.json`. أول blocker مشترك هو OpenAPI materialization/`pnpm install`; لا يتم تجاوزه. بعد كل write يصبح الدليل المتأثر أقدم من الحقيقة ويجب إعادة التحقق على SHA الجديد.

قبل الإغلاق النهائي يجب تشغيل:
`node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/field-3 --strict`
ثم تنفيذ أدلة U015 على **نفس candidate SHA**. هذه الحزمة لا تعلن نجاح أي أمر لم يُنفذ فعليًا.
