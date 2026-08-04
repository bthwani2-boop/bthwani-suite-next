# 01 — جرد الاعتماديات والتدفقات

## خريطة السيادة

- Identity: actor identity، credentials، roles/permissions، sessions، activation/revocation.
- Workforce: human employment/profile/readiness/assignment facts.
- DSH: commerce/delivery/operations truth، facade للأسطح، references للنتائج المالية.
- WLT: ledger/balance/payment/settlement/reconciliation truth حصريًا.
- Contracts/OpenAPI: authority للطلبات والاستجابات والحالات والعملاء المولدين.
- Surfaces: عرض وتفاعل فقط، دون Request/Response/Status authority أو ledger محلي.

## التدفق الحرج

`Surface → DSH facade → Identity/Workforce authorization → DSH domain → WLT operation عند الحاجة → receipt/reference → DSH response → Surface state`

يجب لكل mutation حساسة إثبات: actor، scope، permission، idempotency key، audit/correlation ID، نتيجة معروفة أو unknown-result قابلة للمصالحة، وتعويض عند فشل متعدد الخدمات.

## الاعتماديات المثبتة ذات الخطورة

1. `.wlt-mutation-approved` يسمح على مستوى شجرة كاملة بدل operation-level allowlist.
2. نسختان متطابقتان من DSH API URL/HTTP helpers بين DSH وWLT shared.
3. `next.config.mjs` و`next.config.ts` سلطتان متعارضتان.
4. TypeScript 7 و`@typescript/typescript6` و`.pnpmfile.cjs` تقسم CLI/API بصورة غامضة.
5. `postinstall-generate-clients.mjs` يجعل التوليد الشامل side effect لكل install.
6. legacy route wrappers وhandler aliases ما زالت مرتبطة بتسجيلات HTTP.
7. Journey subsystem مرتبط بـPackage scripts وCI/router/registries/infra/docs.
8. وثائق متعددة تدّعي canonical/sole authority وتحتوي SHAs/branch قديمة.

## عناصر محمية افتراضيًا

- Database migrations وmanifests.
- OpenAPI والعقود المولدة ومولداتها.
- اختبارات الحدود السلبية والأمنية والتعاقدية.
- WLT money types الحالية المشتقة أو المنطق الآمن للأعداد الصحيحة.
- DSH API base resolver الحالي الذي يمنع المنافذ القديمة.
- View models المحلية التي لا تدّعي سلطة عقدية.

## قاعدة تجديد الجرد

استخدم `inventory/REGENERATION.md` قبل كل مرحلة. أي ملف تغيّر أو اختفى بعد SHA التشخيص يصنف `STALE_EVIDENCE` ويعاد تحليله بدل تطبيق قرار قديم عليه.
