# Closure — Field 3

**Decision: OPEN — execution and evidence required.**

الإغلاق ممنوع افتراضيًا. وجود أي خلل معلوم قابل للمعالجة داخل نطاق الميداني أو علاقة مثبتة لازمة له يعيد الحزمة إلى OPEN حتى لو نجح build أو lint أو typecheck أو unit tests منفردة.

## Final gate

قبل اعتبار المهمة منتهية يجب إكمال جميع الوحدات بنتائج مرتبطة بأحدث execution SHA، ثم تنفيذ Final Cleanup + Hardening + Red-Team Review + End-to-End Verification. يلزم إثبات Backend/Frontend/API/Bindings/DB/Contracts/Authz/Security/Runtime/Offline/Finance/Build/CI وAndroid/cross-surface حسب الخطة.

لا يقبل workaround أو bypass أو fallback يخفي السبب، ولا تخفيف gate أو اختبار. التنظيف جزء من الإغلاق: البقايا الميتة/المكررة/المهجورة داخل النطاق تُزال عندما تكون الإزالة آمنة ومثبتة.

### Native exception is sequencing, not abandonment

خلال تنفيذ المنتج لا يتم حذف Native dependencies متفرقة. تُصنف وتُجمّد حتى U014، ثم تُزال العناصر `DEPRECATED_CONFIRMED` في نافذة coherent واحدة مع manifest/plugins/permissions وlocal native verification وبناء EAS مخطط. إذا بقيت إزالة Native لازمة ولم تنفذ U014 بنجاح، فالحزمة لا تُغلق.

### Zero-known-defect rule

الإغلاق يتطلب: صفر أخطاء معلومة، صفر فجوات/تناقضات معلومة، صفر تكرار أو كود ميت معلوم غير مبرر، صفر حالات أو صلاحيات أو تكاملات غير محسومة، صفر regressions معلومة، وصفر عمل متبقٍ معلوم قابل للتنفيذ داخل النطاق. أي evidence قديم أو غير قابل للإثبات لا يحسب.
