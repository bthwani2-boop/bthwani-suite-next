# عقد الرحلة والشرائح

## الرحلة

الرحلة وحدة نتيجة تشغيلية، وليست عنوان Feature. يجب أن تحدد المشكلة، Actors، النتيجة، الحالات، التبعيات، المالك، مسار الكتابة، المستهلكين، الأسطح، التحكمات، البيانات، الأحداث، التعافي، التجريب اليدوي، والأدلة.

## الشرائح الإلزامية

| الشريحة | الغرض |
|---|---|
| SL-01 | Product Truth والنتيجة والثوابت |
| SL-02 | Actors وهويات الخدمات |
| SL-03 | التبعيات وشروط الدخول والخروج |
| SL-04 | Identity/session/device |
| SL-05 | Permission/trusted scope/object authorization |
| SL-06 | Entrypoints/routes/deep links/navigation |
| SL-07 | Screens/pages/tabs/buttons/icons/forms |
| SL-08 | Shared brain/view model/visible states |
| SL-09 | OpenAPI/error/security/idempotency |
| SL-10 | Generated clients/transports |
| SL-11 | Backend handler/domain/repository |
| SL-12 | State machine/allowed actions |
| SL-13 | Database/migrations/constraints/indexes |
| SL-14 | Events/outbox/inbox/jobs/DLQ |
| SL-15 | Media/providers/cache/search |
| SL-16 | DSH↔WLT financial boundary |
| SL-17 | Concurrency/idempotency/unknown result |
| SL-18 | Offline/retry/recovery |
| SL-19 | Cross-surface readback |
| SL-20 | Security/privacy/negative tests |
| SL-21 | Audit/observability/performance |
| SL-22 | Accessibility/RTL/localization |
| SL-23 | Manual operational acceptance |
| SL-24 | Cleanup/same-SHA evidence/closure |

كل ملف رحلة يكرر هذه الشرائح مع المطلوب داخل سياق الرحلة حتى لا تضيع التفاصيل بالرجوع إلى قالب خارجي.

## حالات الشريحة

`NOT_ASSESSED | IN_PROGRESS | FIX_REQUIRED | NEEDS_EVIDENCE | BLOCKED_EXTERNAL | PASS`

## بوابة الانتقال

لا تنتقل الشريحة إلى `PASS` إلا بعد تصنيف عناصرها الفعلية، إصلاح failures الداخلية، تشغيل تحققها، تسجيل Runtime/Readback عند الانطباق، وربط الدليل بالـSHA الحالي.
