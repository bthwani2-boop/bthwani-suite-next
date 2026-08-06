# 02 — التصميم المستهدف

## 1. سلسلة السلطة

`authoritative execution command → exact task scope → branch/SHA → architecture/platform model → OpenAPI/contracts → service ownership → DB invariants → generated clients → runtime evidence → surface acceptance`

لا يسمح لأي تقرير أو registry أو generated artifact أن يصبح سلطة موازية.

## 2. ملكية المجالات

- **Identity:** actor identity، credentials، roles، permissions، sessions، activation/revocation، TOTP.
- **Workforce:** employee/person profile، employment/readiness، supervisor/shift/region، assignments المرتبطة بـactor_id.
- **DSH:** catalog/store/cart/order/fulfillment/delivery/operations truth، وواجهة DSH الحاكمة للأسطح.
- **WLT:** ledger، balance، payment، settlement، reconciliation، financial receipts والنتائج المالية حصريًا.
- **Contracts/OpenAPI:** authority للHTTP request/response/error/status/operationId.
- **Surfaces:** presentation/view state فقط؛ لا ledger ولا contract authority ولا direct WLT endpoint.

## 3. التدفق الحرج

`Surface → generated DSH client → DSH authorization/domain → WLT operation عند الحاجة → durable receipt/reference → DSH response → Surface state`

كل mutation حساسة يجب أن تثبت:

- actor/session.
- capability دقيقة وownership/scope.
- idempotency key.
- audit/correlation ID.
- atomic local transaction أو saga/compensation موثقة.
- known/unknown result semantics.
- reconciliation/readback.
- negative tests.

## 4. العقود والأنواع

- `contracts/openapi/index.yaml` نقطة تجميع واحدة.
- generated clients/types للمستهلكين.
- Domain models وView models مسموحة فقط إذا لم تعيد تعريف transport authority.
- route/verb/operationId/handler/client/surface matrix إلزامية.
- generated drift يساوي صفرًا في الإغلاق.

## 5. قواعد البيانات

- schema/migration authority واحدة لكل خدمة.
- migrations forward-only ومحفوظة تاريخيًا.
- fresh/upgrade/replay/seed-twice/data-preservation tests.
- لا direct cross-service DB access.
- indexes/FKs/checks/uniqueness تثبت invariants الحرجة.

## 6. الأسطح

مصفوفة موحدة:

`capability × actor × surface × route/screen/tab/control × permission × operationId × loading/ready/empty/error/forbidden/stale/conflict/unknown/offline × test`

## 7. CI والأدلة

- كل دليل على SHA واحد.
- targeted checks لكل Commit، full closure في المرحلة النهائية.
- detect-only لا يساوي closure.
- production-like runtime proof مطلوب للقدرات الحية.
- logs/artifacts بلا أسرار أو PII.
- فشل أداة غير موثوق يصنف tool defect، ولا يخفى ولا يساوى تلقائيًا بفشل المنتج.