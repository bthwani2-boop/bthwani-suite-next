# 27 — سجل الرحلات الموحدة متعددة الأسطح

Status: ACTIVE_CANONICAL

Inventory mode: LIVING

Registry ID: `BTHWANI-FULLSTACK-JOURNEYS`

Recreated baseline branch: `ala`

Recreated baseline commit: `5edaac5f7fe5cc492f64735850de8f5945436688`

## ملاحظة الاستعادة

هذا الملف كان موجوداً سابقاً وحُذف عمداً ضمن commit `475fba912` ("refactor(governance): purge remaining SaaS and Tenancy references") مع عشرات ملفات الحوكمة الأخرى، كجزء من تطهير مصطلحات SaaS/Tenancy القديمة من المستودع. أُعيد إنشاؤه هنا **فارغاً من الرحلات ومن رموز الخدمات القديمة** بقرار صريح من مالك المستودع، وليس استعادة للمحتوى القديم — لا حالات `JRN-*` قديمة، ولا رموز خدمات مستأجرة (`knz`, `arb`, `amn`, `esf`, `mrf`, `snd`, `kwd`) التي كانت في النسخة المحذوفة. فهرس الرحلات أدناه يبدأ فارغاً ويُملأ رحلة رحلة عند فتحها فعلياً على SHA محدد، وليس بأثر رجعي.

## الغرض

هذا الملف هو السجل الحي الموحد لأسماء الرحلات التشغيلية وشرائحها في `bthwani-suite-next`. يجب الرجوع إليه عند التخطيط والتنفيذ والمراجعة، وتحديثه كلما ظهرت قدرة أو عقد أو مسار أو شاشة أو انتقال حالة جديد.

هذا السجل لا يثبت أن رحلة ما مكتملة، ولا يتجاوز Product Truth أو العقود أو manifests أو الكود أو قاعدة البيانات أو الأدلة الفعلية. عند التعارض تكون الحقيقة للمرجع الأعلى حسب `governance/authority/authority-precedence.json` وللحالة التنفيذية في الـcommit المثبت.

## النطاق الحالي (بعد التطهير)

- النوى المشتركة: `identity`, `workforce`, `platform-control`, `providers`.
- الخدمات الفعلية الحالية: `dsh`, `wlt`.
- الأسطح المسجلة: `app-client`, `app-partner`, `app-captain`, `app-field`, `control-panel`, `webapp`, `website`, `mobile`.
- لا يلزم ظهور كل رحلة في كل سطح؛ يجب تحديد الأسطح المطلوبة والمستبعدة مع السبب في Product Truth الخاص بالرحلة.
- لا توجد حالياً أي مجالات خدمات "مستأجرة" (tenant/SaaS-style) نشطة أو مخطط لها؛ أي اقتراح مستقبلي من هذا النوع يجب أن يثبت نفسه بـmanifest وعقد ومسار وتنفيذ فعلي قبل إضافته هنا، ولا يجوز إعادة استخدام الرموز القديمة المطهَّرة.

## طريقة استخدام السجل وتحديثه

1. ثبّت المستودع والفرع و`resolved_commit_sha` قبل أي تحليل أو كتابة.
2. اختر `Journey ID` واحدًا وعرّف نطاقه والأسطح المطلوبة والمستبعدة قبل التنفيذ.
3. حدّث الشرائح الوظيفية هنا إذا كشف التشخيص عقدًا أو مسارًا أو حالة أو شاشة غير مسجلة.
4. نفّذ شرائح قصيرة متسلسلة، ولا تنتقل للرحلة التالية عند وجود قرار إيقاف.
5. بعد كل شريحة سجّل commit الدليل والقرار والفجوات المتبقية في قسم سجل التنفيذ.
6. لا تحذف رحلة تاريخية؛ استخدم `MERGED_INTO`, `RETIRED` أو `OUT_OF_SCOPE_FOR_THIS_JOURNEY` مع المرجع والسبب.
7. أي عقد أو operation أو migration أو route أو شاشة جديدة غير ممثلة هنا تُعد فجوة سجل ويجب إضافتها قبل الدمج.
8. لا تُستخدم `CLOSED_WITH_EVIDENCE` إلا بعد نجاح كل نطاقات الأدلة المنطبقة على نفس commit وبالموافقات المستقلة المطلوبة.

## حالات التتبع والقرارات

حالة التتبع الداخلية: `NOT_ASSESSED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `PAUSED`, `MERGED_INTO`, `RETIRED`.

القرار الحاكم يجب أن يكون أحد قرارات `governance/contracts/decision-vocabulary.json`. كل رحلة تُضاف هنا تبدأ بـ`NOT_ASSESSED` حتى تُقيّم فعلياً على commit ثابت.

## الشرائح الثابتة الإلزامية داخل كل رحلة

- `FS-01` — Product Truth: المشكلة، الهدف، الممثلون، القيمة ومعايير القبول.
- `FS-02` — الأدوار والصلاحيات والأسطح المطلوبة والمستبعدة والأفعال الممنوعة.
- `FS-03` — الحالات والانتقالات و`allowedActions` والـnegative invariants.
- `FS-04` — مالك الحقيقة وحدود الخدمات، خصوصًا فصل DSH التشغيلي عن WLT المالي.
- `FS-05` — قاعدة البيانات: migrations، القيود، الفهارس، التزامن، الاحتفاظ وSeeds.
- `FS-06` — OpenAPI والعقود المجزأة والسجل والعملاء المولّدون أو المحولات المعتمدة.
- `FS-07` — الباك إند: routes، domain logic، validation، authz، idempotency والتزامن.
- `FS-08` — الأحداث وoutbox وreadback وإعادة المحاولة والمصالحة عند عبور الخدمات.
- `FS-09` — العقل المشترك: الأنواع، المحولات، controllers، view-models وحالات التشغيل.
- `FS-10` — كل سطح مطلوب: routes، الشاشات، التبويبات، الأزرار، الأيقونات والتنقل العميق.
- `FS-11` — الحالات المرئية: loading، empty، offline، forbidden، conflict، partial وerror recovery.
- `FS-12` — الترابط متعدد الأسطح وقراءة الحالة بعد الكتابة ومنع البيانات المحلية وMocks وFixtures في الشاشات.
- `FS-13` — الأمن والخصوصية وPII والعزل والـRBAC والأسرار وسجل التدقيق.
- `FS-14` — الوصولية، العربية/RTL، الترجمة، الأداء، الاعتمادية وتجربة الأجهزة والشبكة الضعيفة.
- `FS-15` — SLA والمراقبة والقياسات والتنبيهات والتشخيص ودليل الدعم التشغيلي.
- `FS-16` — تنظيف القديم والتكرار والضجيج والمسارات غير المملوكة والعملاء المتقادمين.
- `FS-17` — التحقق المستهدف: static، product، runtime، visual، QA، security، finance، isolation، governance، CI، release وproduction حسب الأثر.
- `FS-18` — دليل نفس الـcommit، الموافقات المستقلة، rollback والفجوات والمخاطر المتبقية.

## FOUNDATION-01 — اكتشاف التغطية الآلي (SHA `d856e7972`)

شُغِّلت أدوات الاكتشاف الآلي الموجودة فعلياً في `tools/scripts/` (لا أداة جديدة):
`generate-operational-journey-inventory.mjs`, `generate-operational-surface-inventory.mjs`,
`generate-operational-toolchain-inventory.mjs`, `generate-operational-gap-ledger.mjs`.

هذا اكتشاف خام (`DISCOVERY_ONLY`) — **ليس** ربطاً نهائياً لكل رحلة من J01-J107 بمسارها وكودها ودليلها؛ ذلك يتطلب فتح كل رحلة على حدة حسب §12.3 من هذا الملف، وهو عمل المرحلة القادمة (تنفيذ الرحلات)، لا هذه المرحلة.

```yaml
head_sha: d856e7972bdb48bfcd6096ba1e44a37b7ef63395
status: DISCOVERY_ONLY
proposed_journey_operations: 599   # عملية واحدة لكل operationId عبر كل العقود، غير مصنّفة بعد إلى J01-J107
proposed_journey_groups: 13
backend_routes_indexed: 212
open_gaps: 15
open_gaps_after_critical_closure: 13
```

### الفجوات المفتوحة المكتشفة (`gap-ledger.json`)

| الخطورة | العدد | النوع | الحالة | الأمثلة |
| --- | --- | --- | --- | --- |
| CRITICAL / P0 | 2 | `CI_NOT_PROVEN` | **أُغلقت** (SHA `7dd43feec`) — أُضيف `.github/workflows/codeql.yml` (javascript-typescript + مصفوفة go لكل خدمة) و`.github/workflows/sonarqube.yml`؛ actionlint وpinact وzizmor كلها PASS. تشغيل حقيقي على PR/push لم يُثبت بعد (لا يمكن تشغيله من هنا)، وSonarQube يحتاج `SONAR_TOKEN`/`SONAR_HOST_URL` من مالك المستودع في إعدادات GitHub | codeql، sonarqube |
| HIGH / P1 | 4 | `CI_WEAKLY_BOUND` | **أُغلقت** — أُضيفت خطوات gitleaks/trivy/osv-scanner فعلياً إلى `.github/workflows/ci-policy.yml` (تثبيت الثنائيات المُقفَلة الإصدار عبر `tools/scripts/install-oss-toolchain-binaries.sh security` الموجود مسبقاً وغير المستخدم، ثم تشغيل `guard:secrets`/`security:trivy`/`security:osv` بنمط continue-on-error+رفع تشخيص+enforce المطابق للموجود في الملف). `toolchain-activation-gate` → PASS للثلاثة. لـnx: هيكل الاكتشاف الآلي (`generate-operational-toolchain-inventory.mjs`) كان يبحث حصراً عن سلسلة `nx:projects` بينما CI يستدعي nx فعلياً عبر `nx run-many`/`nx affected` (موجود في `ci-node-verification.yml`) — أُضيف تعريف أدلة إضافي خاص بـnx يطابق نمط الاستدعاء الحقيقي بدل تعديل الحارس الرئيسي. `pnpm run diagnostics:operational:toolchain` → 0 `FIX_REQUIRED`/`BLOCKED_NEEDS_TOOL` للأربعة | gitleaks، nx، osv-scanner، trivy |
| HIGH / P1 | 6 | `BUSINESS_LOGIC_IN_SURFACE` | **أُغلقت بعد تحقق ملف-بملف** — فُحص كل ملف من الستة يدوياً: لا fetch مباشر ولا `process.env` في أي منها؛ كل المطابقات كانت دوال تحويل عرض نقية (status→label/tone: `commissionStatusLabel/Tone`, `ledgerDirectionLabel`, `refundTone`) أو دوال تنسيق قيمة مستلمة (`formatFee`, `toProductCardPrice`) أو استدعاءات مباشرة لدوال controller مستوردة من `shared/finance-wlt-link` (`rejectCommission`, `createRefund`) — لا منطق مالي محسوب محلياً في أي ملف. الأداة الخام (`generate-operational-surface-inventory.mjs`) صُممت عمداً لتبقى واسعة (ترشيحات للمراجعة البشرية، لا أحكام نهائية)؛ أُضيف سجل استثناءات مُبرَّر لكل ملف على حدة (`VERIFIED_PURE_RENDER_LOCAL_LOGIC_FILES` في `generate-operational-gap-ledger.mjs`، بسبب خاص لكل إدخالة) بدل إضعاف الكاشف العام أو تنفيذ تفكيك صوري بلا منطق حقيقي لنقله. `pnpm -r typecheck` PASS بعد التحقق | `StoreDetailShell.tsx`، `DshFieldFinanceScreen.tsx`، `PartnerDeliveryPricingCard.tsx`، `CommissionGovernancePanel.tsx`، `RefundsCommandPanel.tsx`، `RepresentativeWalletLookup.tsx` |
| MEDIUM / P2 | 3 | `DIRECT_API_IN_SHARED_UNCLASSIFIED` | **أُغلقت** — `home-discovery-events.ts` → أُعيد تسميته `home-discovery-events.adapter.ts` (نداء POST حقيقي عبر `createDshFlexibleHttpClient`)؛ `presigned-upload.ts` → أُعيد تسميته `presigned-upload.client.ts` (نداء `fetch` PUT حقيقي لرفع ثنائي)؛ كل المستوردين (`index.ts` وملفات catalog) حُدِّثوا. `google-maps-web-config.ts` (داخل `_kernel/` أصلاً) أُبقي باسمه وأُضيف إلى قائمة الاستثناءات المُسمّاة (`isAllowedSharedDirectApiFile`) بسبب موثَّق: لا fetch/XHR فيه، فقط قراءة متغير بيئة واحد وبناء نص رابط لسكربت JS خارجي — النقل الفعلي يتم عبر وسم `<script>` في المتصفح لا عبر هذا الملف. `pnpm run diagnostics:operational:surfaces` → 0 نتائج، `pnpm -r typecheck` PASS | `home-discovery-events.adapter.ts`، `presigned-upload.client.ts`، `google-maps-web-config.ts` |

**ملاحظة أداة معطوبة إضافية (لم تُعالَج، خارج نطاق هذه الجولة):** `reconcile-operational-diagnostics.mjs` يفشل عند خطوة التلخيص النهائي لأنه يستدعي `.diagnostics/operational-journey-factory/build-canonical-reference.mjs` — ملف غير موجود في المستودع إطلاقاً (بحث كامل بلا نتيجة). أداة تلخيص لم تُستكمل قط، لا عطل ناتج عن هذه الجلسة؛ مسجَّلة هنا كفجوة أدوات مفتوحة.

**النتيجة:** جميع الفجوات الـ13 المفتوحة من اكتشاف FOUNDATION-01 (بعد إغلاق CRITICAL في الجولة السابقة) أُغلقت بدليل فعلي: `pnpm run diagnostics:operational:gaps` يعيد `gap_count: 0` على SHA هذه الجولة. `reconcile-operational-diagnostics.mjs` يبقى أداة تلخيص معطوبة مسجَّلة، غير مُصلَحة.

## فهرس الرحلات

_فارغ حالياً على مستوى J01-J107 المسمّاة — يُملأ عند فتح كل رحلة فعلياً على commit محدد، وليس بأثر رجعي. الاكتشاف الخام أعلاه (599 عملية) هو المُدخل الذي ستُصنَّف منه هذه الرحلات عند فتحها، لا بديل عن فتحها._

| ID | الرحلة | المالك الرئيسي | الأسطح | القرار | آخر SHA للأدلة |
| --- | --- | --- | --- | --- | --- |

## سجل التحديثات

| التاريخ | الحدث |
| --- | --- |
| 2026-07-31 | أُعيد إنشاء السجل فارغاً بقرار مالك المستودع، بعد حذفه عمداً في `475fba912`. لا رحلات مضافة بعد. |
| 2026-08-01 | FOUNDATION-01: تشغيل أدوات الاكتشاف الآلي الموجودة (599 عملية مقترحة، 212 مسار خلفي، 15 فجوة مفتوحة موثّقة أعلاه). لا رحلات J01-J107 مصنَّفة بعد؛ التصنيف يحدث عند فتح كل رحلة. |
