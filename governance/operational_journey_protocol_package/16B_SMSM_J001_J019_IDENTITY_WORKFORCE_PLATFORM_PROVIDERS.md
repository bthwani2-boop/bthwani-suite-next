# 16B — الرحلات J001..J019: الهوية والموارد البشرية والسياسات والمزودون

> جزء إلزامي من الخطة الرئيسية. تطبق قواعد `16A` ومعيار إغلاق الرحلة العام على كل رحلة أدناه.

## J001 — صحة الهوية وجاهزيتها

- **الهدف والمالك:** إثبات أن خدمة Identity قادرة على المصادقة وإدارة الجلسات؛ المالك `identity`.
- **النطاق:** health/readiness، اتصال قاعدة البيانات، حالة migrations، مفاتيح التوقيع، clock skew، rate limiter، dependencies.
- **الممثلون والأسطح:** كل التطبيقات وControl Panel والخدمات الداخلية كمستهلكين غير مباشرين؛ لا زر تجاري مستقل.
- **الحالات والثوابت:** `HEALTHY | DEGRADED | NOT_READY`; health لا يكشف أسرارًا، readiness يفشل إذا تعذر مكوّن حرج.
- **العقود والبيانات:** عمليات health/readiness في عقد Identity، runtime probes، metrics، structured logs.
- **الاختبارات:** dependency down، DB timeout، key missing، stale migration، restart، concurrent probes.
- **معيار الإغلاق:** probes PASS في runtime؛ false-ready صفر؛ secrets/PII leakage صفر؛ كل مستهلك يتعامل مع degraded/unavailable بوضوح.

## J002 — تزويد Actor والبحث والقراءة

- **الهدف والمالك:** إنشاء Actor واحد موثوق والبحث عنه وقراءته دون ازدواج؛ المالك `identity`.
- **النطاق:** provision actor، internal search، get by ID، uniqueness للهاتف/المعرفات، normalization، correlation.
- **الممثلون والأسطح:** Control Panel والعمليات الإدارية؛ app surfaces تقرأ `me` فقط ولا تستخدم internal search.
- **الحالات:** `PROVISIONED | PENDING_ACTIVATION | ACTIVE | INACTIVE`; لا إنشاء صامت عند التعارض.
- **العقود والبيانات:** actor record، identifiers، roles baseline، audit actor؛ ربط operationIds بالhandlers والgenerated client.
- **الاختبارات:** duplicate phone، invalid E.164، cross-context search، pagination، race على uniqueness، idempotent provisioning.
- **معيار الإغلاق:** مصدر Actor واحد؛ duplicate actors صفر؛ internal endpoints محمية؛ readback يطابق الحفظ؛ كل controls الإدارية مربوطة ومختبرة.

## J003 — دورة حياة Actor

- **الهدف:** تعطيل وإعادة تفعيل Actor مع أثر فوري على الجلسات والصلاحيات.
- **المالك:** Identity؛ Workforce يملك سبب الحالة الوظيفية عند ارتباطه بالموظف ولا يكتب Actor مباشرة.
- **العمليات:** deactivate/reactivate، revoke sessions، record reason/effective time، prevent invalid transition.
- **الأسطح:** Control Panel إدارة/HR؛ تطبيقات المستخدم تعرض blocked state عند التعطيل.
- **الثوابت:** inactive actor لا ينشئ جلسة ولا يستمر بجلسة صالحة؛ reactivation لا يعيد أدوارًا محذوفة تلقائيًا.
- **الاختبارات:** concurrent deactivate/login، stale token، repeated commands، self-deactivation restrictions، audit completeness.
- **معيار الإغلاق:** كل transition guarded؛ session revocation مثبت؛ blocked UI في كل سطح متأثر؛ orphan active sessions صفر.

## J004 — إصدار التفعيل وإلغاؤه وقراءته

- **الهدف:** إصدار رمز تفعيل قصير العمر لممثل موجود وإلغاؤه وقراءة حالته بأمان.
- **المالك:** Identity؛ الإدخال من Control Panel حسب actor المختار لا هاتف حر غير مربوط.
- **الحالات:** `ISSUED | CONSUMED | REVOKED | EXPIRED`; رمز واحد فعال حسب السياسة، ولا يعاد عرضه كاملًا بعد الإصدار.
- **الأسطح والضوابط:** أزرار إصدار/إلغاء/إعادة إصدار، confirmation، copy-once، masked readback، loading/error/conflict.
- **الأمن:** hash للرمز، attempt limits، expiry، single-use، audit، عدم تسجيل الرمز.
- **الاختبارات:** actor مفقود، repeated issue، revoke/consume race، expired code، brute force، unauthorized issuer.
- **معيار الإغلاق:** raw activation codes خارج response الأول صفر؛ جميع الحالات والضوابط مربوطة؛ race tests PASS؛ audit مكتمل.

## J005 — استهلاك التفعيل وتسجيل الدخول

- **الهدف:** تحويل actor المؤهل إلى جلسة صحيحة عبر رمز التفعيل أو آلية الدخول المعتمدة.
- **المالك:** Identity؛ Workforce readiness gate بعد المصادقة عند الموظفين.
- **التدفق:** normalize identifier، validate code، consume atomically، create session/device، return profile gate.
- **الأسطح:** app-partner/app-captain/app-field وControl Panel عند الانطباق؛ app-client وفق Product Truth.
- **الثوابت:** code لا يستهلك مرتين؛ surface/role compatibility؛ actor inactive أو profile suspended لا يدخل.
- **الاختبارات:** replay، wrong surface، wrong actor، expired/revoked، network unknown result، duplicate submit.
- **معيار الإغلاق:** atomic consume+session PASS؛ no duplicate sessions from replay؛ كل سطح يعرض حالات blocked/incomplete/expired بدقة.

## J006 — الجلسات والتحديث والخروج

- **الهدف:** إدارة access/refresh/logout/session readback بأمان.
- **المالك:** Identity؛ تخزين رموز mobile في SecureStore وControl Panel في cookies محمية.
- **النطاق:** rotation، reuse detection، expiry، logout current/all devices، CSRF/cookie flags، session metadata.
- **الحالات:** active/expired/revoked/compromised؛ refresh reuse يلغي السلسلة وفق السياسة.
- **الاختبارات:** concurrent refresh، stolen refresh، cookie tampering، clock skew، offline resume، logout propagation.
- **معيار الإغلاق:** refresh rotation/reuse PASS؛ tokens في logs/storage غير الآمن صفر؛ logout readback مؤكد بكل سطح.

## J007 — الأجهزة وPush Tokens

- **الهدف:** تسجيل جهاز وتحديث/إلغاء Push token دون ربط خاطئ بين Actors.
- **المالك:** Identity لملكية الجهاز؛ Notifications للتسليم.
- **النطاق:** device fingerprint الآمن، platform/app version، token rotation، logout cleanup، opt-in/out.
- **الأسطح:** جميع تطبيقات mobile؛ Control Panel لإدارة الجلسات لا raw push tokens.
- **الاختبارات:** token reused by another actor، reinstall، multiple devices، revoked session، provider invalid token.
- **معيار الإغلاق:** orphan tokens صفر؛ cross-actor token binding صفر؛ notification delivery يستخدم الجهاز النشط فقط؛ privacy retention مطبق.

## J008 — الأدوار والصلاحيات وحزم الوصول

- **الهدف:** تعريف أدوار وصلاحيات وحزم partner/operator بمالك واحد.
- **المالك:** Identity؛ Workforce يحدد التكليفات، والخدمات تنفذ object authorization.
- **النطاق:** role definitions، permission bundles، assignments، approval للامتيازات الحساسة، effective permissions readback.
- **الأسطح:** Control Panel administration/HR وapp-partner team؛ بقية الأسطح تقرأ visibility فقط.
- **الثوابت:** deny by default، لا دور محلي داخل surface، لا permission string غير مسجلة، least privilege.
- **الاختبارات:** privilege escalation، stale role cache، conflicting roles، cross-partner assignment، approval bypass.
- **معيار الإغلاق:** permission registry واحد؛ unknown permissions صفر؛ UI visibility والbackend enforcement متطابقان؛ negative matrix PASS.

## J009 — السياق الموثوق وObject Authorization

- **الهدف:** اشتقاق Platform/Operator/Partner/Store/Area/Actor/Object scope من هوية موثوقة.
- **المالكون:** Identity للclaims، Workforce للتكليف، DSH/WLT لتطبيق ملكية الكائن.
- **النطاق:** middleware، service identities، resource lookup، cache scope، query constraints، audit context.
- **الثوابت:** IDs القادمة من client محددات موارد لا سلطة؛ لا generic tenant scope؛ كل Store مرتبط بـPartner.
- **الاختبارات:** IDOR، cross-partner/store/actor، forged headers، stale assignment، service identity misuse، cache bleed.
- **معيار الإغلاق:** trusted scope fallback صفر؛ object authorization لكل mutation/read الحساسة؛ isolation tests PASS عبر API وDB/cache.

## J010 — الأشخاص والملف المهني

- **الهدف:** إنشاء Workforce person/profile منفصل عن بيانات المصادقة.
- **المالك:** Workforce؛ Identity يحتفظ بactor_id فقط؛ Media يملك المرفقات.
- **البيانات:** الاسم، employee code، employment status/type، supervisor، city، hire date، emergency contact، profile status.
- **الأسطح:** Control Panel HR، app-field/app-captain profile؛ app-partner فقط لموظفي الشريك المسموحين.
- **الحالات:** draft/incomplete/active/suspended/terminated؛ الحقول الحساسة مقيدة.
- **الاختبارات:** duplicate employee code، missing actor link، unauthorized self-edit، terminated access، PII redaction.
- **معيار الإغلاق:** profile واحد لكل actor/role policy؛ auth data غير مكرر؛ profile gates تعمل؛ PII access matrix PASS.

## J011 — التزويد الإداري والموارد البشرية

- **الهدف:** إنشاء موظف إداري/ميداني/كابتن كعملية ذرية منطقية بين Workforce وIdentity.
- **التدفق:** validate HR minimums، create workforce person، provision actor، assign role، compensation cleanup عند partial failure.
- **الأسطح:** Control Panel HR forms/buttons/wizards، readback/detail pages.
- **الحالات:** pending provisioning/provisioned/pending activation/failed compensated.
- **الاختبارات:** Identity down بعد Workforce write، duplicate retry، invalid supervisor، unauthorized creator، unknown result.
- **معيار الإغلاق:** orphan workforce/actor records صفر؛ idempotent orchestration؛ failure recovery مثبت؛ كل خطوة audit/correlation.

## J012 — جاهزية الكابتن

- **الهدف:** منع تشغيل الكابتن قبل اكتمال الهوية والملف والوثائق والتكليف والحالة.
- **المالكون:** Workforce للجاهزية المهنية، DSH للتكليف التشغيلي، WLT للأهلية المالية فقط.
- **الأسطح:** Control Panel HR/operations، app-captain entry/profile/operations.
- **الحالات:** incomplete/pending_review/active/suspended/expired_document/blocked_financially.
- **الاختبارات:** document expiry، no assignment، suspended actor، forged readiness، stale cache، financial block distinction.
- **معيار الإغلاق:** readiness reason codes كاملة؛ app-captain لا يصل للعمليات قبل PASS؛ operator readback مطابق؛ bypass صفر.

## J013 — جاهزية الميداني

- **الهدف:** تفعيل الميداني فقط بعد ملف Workforce وتكليف منطقة/شريك/متجر صالح.
- **الأسطح:** Control Panel partners/HR، app-field activation/profile/work queue.
- **الحالات:** profile missing/incomplete/pending assignment/active/suspended.
- **الثوابت:** لا مهمة ميدانية دون assignment فعال؛ self-completion محدود للحقول المسموحة.
- **الاختبارات:** assignment revoked أثناء session، offline stale assignment، cross-area access، incomplete documents.
- **معيار الإغلاق:** gate بعد login ووقت كل mutation؛ queues scoped؛ blocked/offline states مكتملة؛ unauthorized visits صفر.

## J014 — التكليفات والورديات والنطاقات

- **الهدف:** إدارة supervisor/shift/area/partner/store/department assignments بزمن فعالية واضح.
- **المالك:** Workforce؛ DSH يستهلكها ولا ينشئ نسخة موازية.
- **العمليات:** create/update/end assignment، overlap validation، effective read، audit history.
- **الأسطح:** Control Panel HR/partner field assignment، app-field/app-captain read-only schedule/scope.
- **الاختبارات:** overlapping shifts، retroactive changes، concurrent revoke/use، cross-scope، timezone boundaries.
- **معيار الإغلاق:** active assignment query واحدة؛ overlaps المحظورة صفر؛ historical audit كامل؛ authorization يتغير عند effective time.

## J015 — Platform Change Sets

- **الهدف:** إدارة تغييرات السياسات السيادية كمسودة ومراجعة واعتماد وتطبيق/تراجع.
- **المالك:** Platform Control؛ DSH/WLT يستهلكان النسخة الفعالة.
- **الحالات:** draft/submitted/approved/rejected/scheduled/applied/rolled_back/failed.
- **الأسطح:** Control Panel platform workflow، approvals، diff، rollback queue.
- **الاختبارات:** self-approval المحظور، stale version، conflicting change sets، partial apply، rollback failure.
- **معيار الإغلاق:** state machine محكومة؛ effective version واحدة؛ audit/diff كامل؛ runtime readback يثبت التطبيق والتراجع.

## J016 — Progressive Rollout وKill Switch

- **الهدف:** نشر capability تدريجيًا حسب actor/partner/store/percentage مع إيقاف آمن.
- **المالك:** Platform Control؛ لا feature flag محلي مستقل.
- **النطاق:** targeting، deterministic allocation، start/end، emergency disable، cache invalidation.
- **الأسطح:** Control Panel rollout panel؛ جميع surfaces تستهلك قرارًا موحدًا.
- **الاختبارات:** inconsistent allocation، stale cache، clock boundary، unauthorized kill switch، rollback.
- **معيار الإغلاق:** rollout decision متطابق عبر الخدمات والأسطح؛ local flags صفر؛ kill switch runtime proof PASS.

## J017 — السياسات التشغيلية وسياسات المنصة

- **الهدف:** تعريف سياسات الخدمة والتوصيل والخصوصية والرسوم التشغيلية بمعنى واحد وإصدار فعال.
- **المالكون:** Platform Control للسيادة، DSH للتطبيق التشغيلي، WLT للسياسة المالية التي يملكها.
- **الأسطح:** Control Panel policies، partner/client/captain readback عند الانطباق.
- **الثوابت:** لا حساب مالي نهائي في DSH؛ policy version مثبت في القرار/الطلب.
- **الاختبارات:** invalid policy، overlapping effective ranges، stale consumer، fallback to hardcoded value.
- **معيار الإغلاق:** hardcoded parallel policies صفر؛ versioned readback؛ negative validation PASS؛ كل مستهلك يستخدم المصدر الحاكم.

## J018 — سجل المزودين والقدرات والصحة

- **الهدف:** سجل مركزي للمزودين وقدراتهم وحالتهم ومراجع أسرارهم.
- **المالك:** Providers؛ الأسرار في secret store لا DB أو UI.
- **النطاق:** provider definition، capability matrix، environment binding، health، maintenance، ownership.
- **الأسطح:** Control Panel provider registry/health؛ الخدمات تقرأ adapters المعتمدة.
- **الاختبارات:** unknown provider، capability mismatch، secret reference missing، degraded provider، unauthorized edit.
- **معيار الإغلاق:** provider configs المتناثرة صفر؛ secret exposure صفر؛ health/readiness وحالة الصيانة واضحة؛ consumer fallback غير المصرح صفر.

## J019 — اعتمادات المزود والمهل وCircuit Breaker

- **الهدف:** اتصال خارجي آمن بمهل وإعادة محاولة وcircuit breaker وتحقق webhook.
- **المالكون:** Providers للاتصال، المجال المالك لتفسير النتيجة.
- **النطاق:** credentials references، TLS، timeout budget، retry classification، breaker states، webhook signatures، idempotency.
- **الحالات:** closed/open/half-open/degraded؛ unknown provider outcome يتصالح ولا يفترض الفشل/النجاح.
- **الاختبارات:** timeout، DNS/TLS failure، 429/5xx، duplicate webhook، invalid signature، secret rotation.
- **معيار الإغلاق:** unbounded calls صفر؛ unsigned webhooks صفر؛ retry storms صفر؛ breaker/unknown-result/reconciliation runtime proof PASS.

## بوابة إغلاق المجموعة J001..J019

```yaml
identity_truth_single_owner: PASS
workforce_truth_single_owner: PASS
platform_policy_single_owner: PASS
provider_registry_single_owner: PASS
cross_actor_and_scope_isolation: PASS
session_activation_device_security: PASS
workforce_readiness_gates: PASS
policy_rollout_runtime_readback: PASS
provider_failure_recovery: PASS
unmapped_controls_operations_data: 0
open_journeys_in_group: 0
failed_required_checks: 0
evidence_sha: FINAL_SHA
```
