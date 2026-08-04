# 03 — الخطة الرئيسية وترتيب التنفيذ

## قاعدة الدخول

لا يبدأ أي تعديل منتج حتى إغلاق PHASE-00 وPHASE-01 وإصدار Baseline report على أحدث SHA. الحالات: `PLANNED | IN_PROGRESS | BLOCKED | VERIFIED | CLOSED`.

| الترتيب | المرحلة | الحالة | تعتمد على | مخرج الإغلاق |
|---:|---|---|---|---|
| 00 | AUTHORITY / SHA / CI PROVENANCE | BLOCKED | لا شيء | base branch وtarget SHA وworkflow provenance محسومة |
| 01 | EXHAUSTIVE INVENTORY | PLANNED | 00 | جرد كل الملفات والاعتماديات والمسارات والعقود والبيانات والأسطح |
| 02 | TRUST / IDENTITY / AUTHZ | PLANNED | 01 | حدود الثقة والجلسات والصلاحيات والملكية مغلقة |
| 03 | CONTRACTS / DATA / DATABASES | PLANNED | 02 | عقد مركزي وملكية بيانات ومهاجرات وseeds خضراء |
| 04 | DSH / WLT SOVEREIGNTY | PLANNED | 03 | DSH operational truth وWLT financial truth دون مسارات موازية |
| 05 | BACKENDS / RUNTIME / INTEGRATIONS | PLANNED | 04 | خدمات وتكاملات وتشغيل فعلي ومصالحة قابلة للإثبات |
| 06 | MULTI-SURFACE / JOURNEYS | PLANNED | 05 | تنفيذ الرحلات على الأسطح الخمسة بمعايير قبول كاملة |
| 07 | RETIREMENT / CLEANUP | PLANNED | 06 | حذف/نقل/دمج موثق بعد zero-use proof |
| 08 | FINAL SAME-SHA CLOSURE | PLANNED | 00..07 | كل الأدلة على SHA واحد وقائمة المتبقي صريحة |

## PHASE-00 — Authority/SHA/Provenance

**المهام:** تثبيت remote head؛ حسم `main` مقابل `master`؛ تحديث task binding؛ ربط كل workflow run بالـSHA؛ إعادة فحص statuses؛ منع العمل المتوازي غير المثبت.

**القبول:** مصدر واحد للbase branch؛ target SHA واحد؛ CI inventory كامل؛ worktree/remote نظيفان؛ لا دليل من SHA آخر.

## PHASE-01 — Exhaustive Inventory

**المهام:** `git ls-files`، hashes/size/lines، empty/duplicate groups، TS/JS/Go imports، package/workflow/script references، routes، OpenAPI، DB artifacts، generated consumers، surface inventory، TODO/legacy/compat markers.

**القبول:** كل ملف متتبع مصنف؛ كل عنصر غير قابل للتحليل يسجل `UNPROVEN`; لا حذف.

## PHASE-02 — Trust/Identity/Authz

**المهام:** actor/session/TOTP/activation lifecycle؛ capability/ownership matrix؛ negative tests؛ Workforce profile readiness؛ service identity؛ secrets/audit boundaries.

**القبول:** لا endpoint حساس بلا permission+ownership؛ لا capability عامة بديلة؛ كل فشل أمني fail-closed.

## PHASE-03 — Contracts/Data/Databases

**المهام:** route-operation-handler-client matrix؛ types classification؛ schema/migration/seed authority؛ إصلاح seed-twice من السبب؛ fresh/upgrade/replay/preservation.

**القبول:** DSH DB contract أخضر على نفس SHA؛ zero contract/schema authority parallel؛ migrations محفوظة.

## PHASE-04 — DSH/WLT Sovereignty

**المهام:** كشف direct WLT surface access؛ ledger/status/receipt duplicates؛ operation-level allowlist؛ idempotency/reconciliation؛ إزالة manual financial truth بعد الترحيل.

**القبول:** WLT الحقيقة المالية الوحيدة؛ DSH facade/reference فقط؛ direct access negative tests ناجحة.

## PHASE-05 — Backends/Runtime/Integrations

**المهام:** handlers/routes/events/outbox/retries/compensation/readiness/observability؛ bootstrap idempotence؛ provider failures؛ error contract.

**القبول:** runtime smoke، failure injection، safe logs، reconciliation/readback، لا legacy path بلا owner/deadline.

## PHASE-06 — Multi-Surface/Journeys

**المهام:** تنفيذ registry بعد إعادة توليده من baseline الحالي؛ كل journey حسب dependencies؛ جميع screens/actions/states؛ web/mobile build/E2E/manual/accessibility/RTL/offline.

**القبول:** كل رحلة VERIFIED على capability matrix؛ لا phantom/placeholder/mocked success؛ كل surface يستخدم generated DSH client.

## PHASE-07 — Retirement/Cleanup

**المهام:** semantic harvest؛ zero-reference proof؛ consumer migration؛ deletion/move/merge atomic commits؛ إزالة authorities/compatibility/duplicates/tools القديمة بعد البديل.

**القبول:** deletion ledger كامل؛ no orphan references؛ builds/tests/runtime أخضر؛ rollback واضح.

## PHASE-08 — Final Closure

**المهام:** re-pin؛ full static/contract/security/DB/runtime/surface suites؛ compare base..head؛ evidence index؛ residual risks.

**القبول:** Same-SHA green evidence؛ كل عنصر `CLOSED` أو `OPEN/UNPROVEN` صريح؛ لا ادعاء كمال غير مدعوم.