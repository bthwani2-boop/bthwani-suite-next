# 04 — موجات التنفيذ الحاكمة

## المرجع التنفيذي

التفاصيل والشرائح والحالات في:

```text
10_REPOSITORY_WIDE_EXECUTION_LEDGER.md
```

هذا الملف يحدد ترتيب الاعتماديات فقط ولا يكرر محتوى السجل.

## دورة كل شريحة

```text
PIN SHA
→ INVENTORY
→ CHOOSE OWNER
→ BUILD REPLACEMENT
→ MIGRATE CONSUMERS
→ DELETE OLD PATHS
→ VERIFY STATIC/CONTRACT/DB/RUNTIME
→ RECORD SAME-SHA EVIDENCE
```

## الموجة 0 — إعادة تأسيس الحزمة

```text
VC-100 full audit
VC-101 package state unification
VC-102 path decision registry
```

لا يبدأ تنظيف واسع قبل إزالة تضارب حالة الحزمة وتثبيت مرجع الجرد.

## الموجة 1 — العقود والترحيلات

```text
VC-110 Platform Control contracts
VC-120 DSH contracts
VC-130 migration history
VC-140 OpenAPI metadata
VC-150 generated clients
```

السبب: بقية المنظومة تعتمد على عقود وSchema يمكن الوثوق بها.

## الموجة 2 — الثقة والنطاق والماليات

```text
VC-160 Identity trust
VC-170 actor/organization/tenant semantics
VC-180 WLT invariants
VC-190 DSH operational truth
```

لا يُسمح بإعادة هيكلة أسطح واسعة قبل وضوح حدود الثقة ومالك البيانات.

## الموجة 3 — Workforce والأسطح

```text
VC-200 Workforce/administration
VC-210 shared frontend brains
VC-220 all surfaces
```

كل Capability يغلق رأسيًا، لا شاشة منفردة.

## الموجة 4 — Runtime والبنية

```text
VC-230 runtime interface
VC-240 mobile/EAS/Firebase/Sentry
VC-250 infrastructure namespaces
```

الهدف تشغيل نظيف دون إعدادات جهاز مخفية أو readiness كاذب.

## الموجة 5 — الحوكمة والأدوات والضجيج

```text
VC-260 governance authority
VC-270 agents/skills/guards
VC-280 tooling and commands
VC-290 documentation and paths
```

الحذف النهائي للضجيج يأتي بعد ترحيل المستهلكين، لا قبله.

## الموجة 6 — الإغلاق

```text
VC-300 same-SHA full verification
VC-310 final deletion sweep
VC-320 closure declaration
```

## قواعد الانتقال

- P0 داخل الموجة الحالية يمنع الانتقال.
- `IMPLEMENTED_PENDING_*` ليست إغلاقًا.
- أي مسار قديم يبقى بعد عمل البديل يمنع إغلاق الشريحة.
- أي Guard يقرأ قائمة بديلة بدل المصدر الحاكم يمنع الإغلاق.
- أي DB/Runtime proof على SHA مختلف يرفض.
- الحالة النهائية الوحيدة: `CLOSED_WITH_EVIDENCE` وفق `17_FINAL_CLOSURE_MATRIX.md`.
