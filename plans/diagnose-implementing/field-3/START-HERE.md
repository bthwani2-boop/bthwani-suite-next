# Field 3 — Canonical execution entry

هذه هي **الحزمة التنفيذية الوحيدة** لكل ما يتعلق بـ app-field وكل أثر سببي له في Control Panel. الحزمتان الأقدم حُذفتا من شجرة التنفيذ، وأي RESULT تاريخي داخل Field 3 صُفّر ويجب إعادة إثباته على الفرع `A`.

## قرارات ملزمة

- الميداني والكابتن **مقدما خدمة مستقلان** وليسَا موظفين. Field لا يملك Shift. الاسم التشغيلي في لوحة التحكم: **مقدم خدمة ميداني**، وداخل التطبيق: **ميداني**.
- Identity يملك actor/auth/session؛ Workforce يملك ملف مقدم الخدمة والتفعيل؛ DSH يملك assignments/stores/onboarding/visits/readiness؛ Central Catalog يملك Master Product؛ Marketing في Control Panel يملك قرار publication؛ WLT يملك المال.
- الواجهة العامة الوحيدة لإنشاء الميداني هي `/workforce/field-agents`: Workforce orchestrates إنشاء/ربط Identity داخليًا ثم ملف Workforce بصورة idempotent. `provisioning-cases` العامة والمسارات/controllers الميتة تُزال، ولا يبقى مساران متنافسان.
- تسجيل الميداني للمستخدم بالهاتف؛ username داخلي فقط. Activation Code قصير العمر، single-use، surface-bound، ولا يصدر إلا يدويًا بعد readiness. الحد الإلزامي: الاسم + الهاتف + service zone + supervisor + هوية موثقة + عقد معتمد. الضامن ومصدر الإحالة ليسا شرطين عالميين إلا إذا أثبتت Policy فعالة خلاف ذلك.
- Field actor نوع واحد فقط حاليًا؛ لا Field+Captain multi-kind. `suspended` مؤقت و`terminated` نهائي بلا hard delete. Home/service Zone واحدة في Workforce وDSH يستطيع إدارة scopes/assignments متعددة.
- الميداني **يستطيع بدء onboarding لشريك/متجر بدون Assignment** لتسهيل الاستحواذ، لكن كل draft يحمل provenance واضحًا (`self_initiated` أو `assignment_linked`) ويمر بنفس المراجعة والجاهزية؛ لا bypass ولا متجر عام تلقائي.
- Assignment النشط واحد للمهمة، مع formal handoff بعد بدء العمل، Priority + dueAt + SLA/overdue، وWork Queue هو مصدر الحقيقة؛ Push تنبيه فقط.
- لا تتبع مستمر لموقع الميداني. المطلوب نقاط إثبات فقط: GPS عند الأحداث المطلوبة، radius configurable، server timestamps، camera-first للـfield evidence. الوثائق القانونية تسمح gallery/file picker.
- Checklist ليست hardcoded: تُدار من Control Panel حسب Business Vertical مع typed/critical items. Field يجمع الدليل، وقسم Partners يعتمد readiness بصورة مستقلة.
- Legal Partner وStore/Branch كيانان منفصلان. داخل Partners يدخل فقط ما له causal relation موثقة بالميداني، ويجب تنظيمه كمساحة عمل واحدة مرتبة بلا تبويبات مكررة أو مسارات بديلة.
- Field في Catalog يستطيع اختيار Master Products وتحديد السعر/التوفر/local description واقتراح منتج/تصحيح/صورة للمراجعة؛ لا يعدّل Master Truth مباشرة. Product proposal يتجه إلى Catalog؛ store assortment يبقى store-owned. Marketing review حسب policy.
- نشر المتجر وظيفة Marketing: Composite Publication Gate تلقائي هو الأصل مع audited manual override. نشر المنتج تلقائي بعد master approval + assortment conditions. تعليق الميداني لا يخفي متجرًا معتمدًا.
- Bottom navigation تبقى: الرئيسية، المهام، محفظتي، حسابي. UI/UX closure يشمل RTL/states/accessibility/responsive/consistency وإعادة هيكلة فقط عند ثبوت الخلل.
- Offline-first للزيارات/checklists/escalations/onboarding drafts/evidence؛ Catalog cache+draft ثم revalidation/OCC؛ queue retention 30 يومًا؛ pending/failed/quarantined ظاهرة للمستخدم. القرارات المالية والنشر الحساسة online governed.
- Inbox داخل التطبيق هو السجل + Push + scoped deep links. Escalation: open → acknowledged → resolved/escalated مع severity/SLA/reason.
- Android real-device E2E إلزامي، iOS build/type compatibility، وEAS Preview ضمن الإغلاق الحالي.
- عمولات الميداني policy-driven وتصبح مستحقة بعد تحقق الدليل واعتماد النتيجة؛ التصحيح reversal/adjustment لا تعديل للقيد القديم. Finance تدير payout destination، والميداني يراها masked ويطلب FULL_AVAILABLE/SPECIFIED فقط. WLT policies تضبط الحدود/الرسوم. Approve→execute→verify/complete. Termination لا ينتظر المال؛ يفتح offboarding settlement حتى التسوية.
- **COD خارج Field بالكامل. Incidents/Penalties ملغاة من Field ويجب إزالة UI/API/state/dead code المرتبط بها داخل نطاق الميداني، وإزالة المشترك الميت إذا لم يبق له مستهلك شرعي.**
- لا تعقيد أدوار زائد: صلاحيات server-side بسيطة ومتناسبة مع فريق صغير، مع سبب+audit للإجراءات الحساسة. لا UI-only authorization.

## قاعدة التنفيذ والإغلاق

ابدأ من U001 بالترتيب والاعتماديات. قبل كل write/push: fetch latest `A` → classify delta → reconcile → verify → fast-forward only. يسمح بالوكلاء المتوازيين للتشخيص/التنفيذ، لكن Push Owner واحد لكل batch. لا يعتبر أي شيء DONE بدليل سابق. الإغلاق النهائي يتطلب exact same SHA: static/tests + backend/database + Control Panel + Android app-field + Partner/Client readback + security + applicable CI، مع positive وnegative publication path ونفس storeId/productId.
