# App Field — الرؤية النهائية

## الدور النهائي

سطح موظف الميدان للتزويد والزيارات والتدقيق وجمع الأدلة ومساعدة onboarding والمتجر والكتالوج والعمليات وCOD ضمن assignment موثوق، مع offline مضبوط ولا صلاحيات إدارية عامة.

## بنية التنقل

- Activation/session/readiness.
- Assigned work/visits.
- Partner onboarding assistance.
- Store creation/verification/readiness.
- Catalog lookup/proposals/assortment/stock verification.
- Area/location evidence.
- Operational audits/incidents.
- COD custody/handover عند التفويض.
- Notifications/support/profile.

## ما يجب أن يظهر

### الهوية والجاهزية

- Workforce profile، supervisor، shift، city، active assignments.
- reasons للحظر أو انتهاء الوردية/assignment.
- self-completion للحقول المسموحة فقط.

### قائمة العمل

- tasks scoped بالمنطقة/الشريك/المتجر والوقت.
- filter/sort/map/list مع freshness.
- task detail وrequired checklist/evidence.
- start/arrive/complete/escalate controls بgeo/time proof عند السياسة.

### Onboarding والمتجر

- اختيار Actor/Partner موجود أو إنشاء عبر orchestration مصرح.
- forms متعددة الخطوات مع drafts.
- evidence uploads وحالة scanning/review.
- store location/hours/area/readiness checklist.
- لا تفعيل أو نشر مباشر خارج permission/workflow.

### الكتالوج والمخزون

- barcode/product lookup في Master Catalog.
- proposal عند الغياب أو التصحيح.
- assortment/stock evidence ضمن Store scope.
- conflict UI عند تغير المنتج أو النسخة أثناء offline.

### التدقيق والحوادث

- checklist versioned، findings، severity، media، remediation/escalation.
- لا تعديل state تشغيلي غير مصرح من نتيجة التدقيق.

### COD

- custody tasks وamount masked ومطابق لrecord.
- collect/handover confirmation/proof.
- لا حساب أهلية أو رصيد محلي.

## التحكمات

Task filter/map/list، start visit، check-in، scan barcode، search product، create proposal، capture evidence، save draft، submit، request info، escalate incident، complete task، collect/handover COD، retry upload، resolve conflict، support.

كل تحكم يملك scope وoperation وoffline policy وreadback واختبارات cross-area/cross-store.

## الحالات المرئية

Profile incomplete، no assignment، shift not active، outside area، no tasks، stale task، offline draft، queued upload، conflict، evidence rejected، review pending، task blocked، incident escalated، COD mismatch، session revoked.

## التقنية والبرمجة

- Expo shell وshared DSH controllers.
- generated DSH clients فقط.
- encrypted offline drafts/queue مع expiry/version.
- camera/barcode/location/media permissions وتعافي الرفض.
- assignment revalidation عند كل mutation وعند reconnect.
- no local partner/store/catalog/finance truth.

## تجربة المستخدم

- مناسب للعمل الميداني والشبكة الضعيفة.
- خطوات قصيرة مع progress/checklist.
- وضوح ما تم حفظه محليًا وما تم إرساله.
- conflict resolution بلا فقد الأدلة.
- RTL، touch targets، contrast، large text، screen reader.

## التجريب اليدوي النهائي

- فعّل موظفًا وعيّنه، نفّذ زيارة onboarding/store/catalog/audit/COD عند الانطباق، ثم تحقق من Partner/Control Panel/Client.
- ألغِ assignment أثناء offline، بدّل المنطقة، اقطع uploads، غيّر النسخة، استخدم barcode مكررًا وStore خارج scope.
- يجب رفض الأفعال القديمة وحفظ الأدلة أو عرض conflict قابل للحل دون duplicate effect.

## بوابة الإغلاق

`assignment_bypasses=0; cross_area_store_actions=0; local_partner_catalog_finance_truths=0; lost_offline_evidence=0; unmapped_field_controls=0; manual_field_e2e=PASS; same_sha_evidence=PASS`.
