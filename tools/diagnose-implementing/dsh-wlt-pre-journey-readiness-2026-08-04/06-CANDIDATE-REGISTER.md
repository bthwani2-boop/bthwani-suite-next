# 06 — سجل المرشحين للحذف أو النقل أو الدمج

> جميع الصفوف `CANDIDATE` وليست إذن تنفيذ. الثقة في وجود المرشح لا تساوي الثقة في قرار الحذف.

| ID | العنصر | القرار المحتمل | الإثبات المطلوب قبل القرار |
|---|---|---|---|
| C-001 | bindings وSHAs القديمة في حزمة الرحلات | REGENERATE/REPLACE | authority + semantic diff + current SHA |
| C-002 | `base_branch: master` | CORRECT_OR_JUSTIFY | repo metadata + protections + PR policy |
| C-003 | FOUNDATION وتقارير تاريخية قديمة | ARCHIVE/REGENERATE | unique findings harvested + zero live authority |
| C-004 | disabled/duplicate migration copies | REMOVE_OR_PROTECT | upgrade path + manifest + zero runtime use |
| C-005 | DSH fallback DB env/code | DELETE_AFTER_MIGRATION | all environments + negative fallback tests |
| C-006 | better-sqlite/drizzle/direct DB paths داخل DSH | REMOVE/CENTRALIZE | import/runtime/write census |
| C-007 | split Prisma/Drizzle finance truth | CONVERGE | data owner + migration + reconciliation |
| C-008 | manual checkout/payment request/status types | MIGRATE_TO_GENERATED | consumer list + generated equivalents |
| C-009 | stub/placeholder routes | IMPLEMENT_OR_DELETE | route registry + consumers + product decision |
| C-010 | generic WLT trips mapping | REPLACE_DOMAIN_APIS | capability/contract/data mapping |
| C-011 | removed orchestrator references | CLOSED_WITH_EVIDENCE | zero implementation/consumer + replacement |
| C-012 | passive collector-only gates | REWRITE_OR_REMOVE | assertion harvest + CI replacement |
| C-013 | compatibility wrappers/aliases | CLOSED_WITH_EVIDENCE | telemetry zero window + consumer migration |
| C-014 | generated artifacts داخل live source | CLOSED_WITH_EVIDENCE | build graph + clean-clone proof |
| C-015 | DSH `noop.js` وplaceholder lint | CLOSED_WITH_EVIDENCE | package role + real entrypoints |
| C-016 | WLT Unix-only cleanup command | CLOSED_WITH_EVIDENCE | Windows/Linux test |
| C-017 | duplicate Next/config files | CLOSED_WITH_EVIDENCE | prove loaded file + merge all settings |
| C-018 | duplicate shared HTTP helpers | CENTRALIZE/GENERATE | ownership + no reverse dependency |
| C-019 | populated `.gitkeep`/empty noise | CLOSED_WITH_EVIDENCE | tracked siblings + zero refs |
| C-020 | one-off migration/refactor scripts | CLOSED_WITH_EVIDENCE | assertions moved + zero script refs |
| C-021 | journey subsystem removal proposal | REJECT_OR_DEFER | user intent is journey execution; requires authority decision and complete semantic harvest |
| C-022 | old diagnostic package built on `09f7a33` | KEEP_AS_HISTORY_OR_SUPERSEDE | no live executor treats it as current |

## قرار الحذف الآمن

لا يصبح المرشح `SAFE_TO_DELETE` إلا إذا أثبت: صفر imports، صفر shell/package/workflow/route/registry references، عدم امتلاك بيانات أو migration أو contract أو test فريد، اكتمال البديل والترحيل، نجاح الفحوص المستهدفة والسلبية، وخطة تراجع من Git history دون نسخة احتياطية حية.