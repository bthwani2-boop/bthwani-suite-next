# 16C — الرحلات J020..J040: الشريك والمتجر والكتالوج والتسويق

> جزء إلزامي من الخطة الرئيسية. تطبق قواعد `16A` ومعيار إغلاق الرحلة العام على كل رحلة.

## J020 — إنشاء الشريك وبدء Onboarding

- **الهدف والمالك:** إنشاء Partner واحد داخل DSH مع مرجع Actor/Workforce صحيح؛ المالك `dsh`.
- **النطاق:** create partner، legal/commercial basics، onboarding case، idempotency، duplicate detection.
- **الأسطح:** Control Panel partner create/review، app-field onboarding، app-partner status readback.
- **الحالات:** `DRAFT | SUBMITTED | UNDER_REVIEW | NEEDS_INFORMATION | APPROVED | REJECTED`.
- **البيانات والعقود:** partner، onboarding evidence refs، actor links؛ لا tenant أو platform instance.
- **الاختبارات:** duplicate legal identity/phone، partial media upload، unauthorized creator، retry/unknown result.
- **معيار الإغلاق:** partner واحد بلا duplicate authority؛ orphan onboarding صفر؛ كل form/button/readback مربوط؛ recovery مثبت.

## J021 — مراجعة الشريك والتحقق ودورة الحياة

- **الهدف:** مراجعة الأدلة واتخاذ قرار وتغيير حالة Partner وفق policy مع audit.
- **المالك:** DSH؛ Workforce/Media مصادر داعمة فقط.
- **الحالات:** pending/reviewing/needs_info/approved/active/suspended/terminated؛ transitions محمية بالأسباب.
- **الأسطح:** Control Panel queues/detail/actions، app-field evidence follow-up، app-partner status/blocked states.
- **الاختبارات:** self-approval، stale version، missing evidence، concurrent decisions، suspension with active stores.
- **معيار الإغلاق:** state machine كاملة؛ audit decision + reason؛ invalid transitions صفر؛ readback متزامن بكل سطح.

## J022 — ملف الشريك وإدارته الذاتية والفريق

- **الهدف:** تمكين الشريك من تعديل البيانات المسموحة وإدارة فريقه داخل scope الخاص به.
- **المالكون:** DSH للملف، Identity للأدوار، Workforce للتكليفات المهنية.
- **الأسطح:** app-partner profile/settings/team؛ Control Panel detail/team audit.
- **الثوابت:** لا تعديل legal/financial sensitive fields دون workflow؛ لا دعوة خارج partner scope.
- **الاختبارات:** privilege escalation، cross-partner member، duplicate invite، revoked member session، stale permission.
- **معيار الإغلاق:** self-service allowlist صريحة؛ team changes في Identity/Workforce لا نسخة محلية؛ negative matrix PASS.

## J023 — النموذج التجاري للشريك

- **الهدف:** تعريف `COMMISSION | SUBSCRIPTION | HYBRID | OPERATOR_MANAGED` كعلاقة تجارية لا SaaS.
- **المالكون:** DSH يملك الاختيار التشغيلي، WLT يملك الالتزامات والفوترة المالية.
- **الأسطح:** Control Panel partner commercial panel، app-partner read-only summary.
- **الثوابت:** model لا ينشئ tenant؛ effective dating/versioning؛ لا حساب مبلغ نهائي في DSH.
- **الاختبارات:** overlapping models، retroactive edit، missing WLT policy، unauthorized partner mutation.
- **معيار الإغلاق:** model واحد فعال لكل فترة؛ DSH/WLT references متطابقة؛ SaaS/tenant behaviors صفر؛ financial readback من WLT.

## J024 — إنشاء المتجر وملكيته

- **الهدف:** إنشاء Store تابع لشريك واحد مع قيود ملكية ثابتة.
- **المالك:** DSH.
- **النطاق:** create store، partner relation، identifiers، address/location، hours baseline، ownership constraints.
- **الأسطح:** Control Panel stores، app-field verification، app-partner store profile.
- **الاختبارات:** cross-partner store، duplicate code/location policy، partner inactive، concurrent creation، forged partner_id.
- **معيار الإغلاق:** كل Store له Partner واحد؛ DB FK/unique constraints PASS؛ client scope غير موثوق؛ readback بكل سطح.

## J025 — جاهزية المتجر والنشر والتعليق

- **الهدف:** نشر متجر فقط بعد اكتمال الملف والموقع والساعات والتغطية والكتالوج والسياسات.
- **الحالات:** draft/incomplete/pending_review/published/paused/suspended/closed.
- **الأسطح:** Control Panel readiness/publish، app-field checklist، app-partner readiness، app-client visibility.
- **الثوابت:** unpublished store لا يظهر للعميل؛ suspension يوقف الطلبات فورًا مع تفسير.
- **الاختبارات:** missing assortment، expired hours، no service area، stale publish request، concurrent pause/order.
- **معيار الإغلاق:** readiness checklist قابلة للتفسير؛ publication atomic؛ client discovery reflects state؛ bypass صفر.

## J026 — مناطق الخدمة والحدود الجغرافية

- **الهدف:** تعريف service areas/regions/polygons وربطها بالمتاجر والسياسات.
- **المالك:** DSH؛ Providers للخرائط فقط.
- **الأسطح:** Control Panel maps/governance، app-field location verification، app-client serviceability.
- **البيانات:** geometry validated، SRID موحد، version/effective time، overlap policy، indexes.
- **الاختبارات:** invalid polygon، boundary point، overlap conflict، stale geocode، provider unavailable.
- **معيار الإغلاق:** spatial constraints/indexes PASS؛ deterministic serviceability؛ no client-side authoritative geometry؛ fallback واضح.

## J027 — أسطول الشريك وعضوية الكباتن

- **الهدف:** ربط Captain من نوع PARTNER بشريك/متجر وصلاحيات تشغيل صحيحة.
- **المالكون:** Workforce للهوية المهنية، DSH للعضوية التشغيلية.
- **الأسطح:** Control Panel fleet، app-partner fleet، app-captain affiliation readback.
- **الحالات:** invited/active/suspended/ended؛ effective ranges وعدم عضوية متعارضة.
- **الاختبارات:** captain in two forbidden fleets، cross-partner assignment، revoked membership، stale session.
- **معيار الإغلاق:** membership source واحد؛ affiliation لا يخلط BTHWANI/PARTNER؛ dispatch respects membership؛ isolation PASS.

## J028 — إعدادات التوصيل وتسعيره التشغيلي

- **الهدف:** إدارة `FREE_DELIVERY | BTHWANI_PRICING | PARTNER_FIXED_PRICING | ZONE_PRICING` دون حساب مالي موازٍ.
- **المالك:** DSH للسياسة التشغيلية؛ WLT يثبت الأثر المالي عند الطلب.
- **الأسطح:** Control Panel store pricing، app-partner settings، app-client quote readback.
- **الاختبارات:** invalid amount/currency، missing zone، overlapping effective policies، hardcoded fallback.
- **معيار الإغلاق:** policy version واحدة فعالة؛ quote uses canonical policy؛ local calculations الموازية صفر؛ order pins policy/version.

## J029 — Taxonomy والتصنيفات والوحدات والعلامات

- **الهدف:** كتالوج مركزي للتصنيفات والوحدات والسمات والعلامات.
- **المالك:** DSH central catalog.
- **الأسطح:** Control Panel catalog governance، app-partner selection/proposal، app-field catalog operations، app-client browsing.
- **الحالات:** draft/active/deprecated/merged؛ منع cycles والأسماء المكررة.
- **الاختبارات:** category cycle، unit incompatibility، deprecated use، locale collision، concurrent merge.
- **معيار الإغلاق:** taxonomy source واحد؛ local category lists صفر؛ جميع المستهلكين migrated؛ hierarchy/translation tests PASS.

## J030 — المنتجات المركزية والمتغيرات والباركود

- **الهدف:** Master Product واحد بvariants/units/barcodes وخصائص موحدة.
- **المالك:** DSH central catalog.
- **الأسطح:** Control Panel product room، app-partner catalog، app-field product lookup، app-client store assortment read.
- **الثوابت:** master product لا يساوي store assortment؛ barcode uniqueness؛ normalized attributes.
- **الاختبارات:** duplicate barcode، incompatible unit، concurrent edit، deprecated product، cross-category invalid attribute.
- **معيار الإغلاق:** central product truth واحدة؛ duplicate/local products صفر؛ readback عبر الأسطح؛ constraints/tests PASS.

## J031 — وسائط المنتج وأصول الكتالوج

- **الهدف:** رفع وربط واعتماد صور/فيديو المنتج مع Media ownership وretention.
- **المالكون:** Media للملف، DSH للربط والغرض والحالة.
- **الأسطح:** Control Panel/product media، app-partner media proposal، app-field evidence، app-client rendering.
- **الحالات:** upload_pending/scanning/approved/rejected/expired/deleted.
- **الاختبارات:** MIME spoofing، oversized file، malicious content، orphan upload، unauthorized read، broken URL.
- **معيار الإغلاق:** direct raw storage truth في DSH صفر؛ scanning/short-lived URL/cleanup PASS؛ placeholders/errors كاملة.

## J032 — اقتراحات المنتجات والتصحيحات

- **الهدف:** تمكين partner/field من اقتراح منتج أو تعديل دون كتابة مباشرة في master catalog.
- **المالك:** DSH proposal workflow.
- **الأسطح:** app-partner proposal/edit، app-field catalog operation، Control Panel review/readback.
- **الحالات:** draft/submitted/needs_info/approved/rejected/merged/conflict.
- **الاختبارات:** duplicate proposal، stale base version، unauthorized store، partial media، retry.
- **معيار الإغلاق:** direct partner master writes صفر؛ proposal state machine/audit كامل؛ approval creates canonical change مرة واحدة.

## J033 — مراجعة الكتالوج والتعارض والدمج

- **الهدف:** مراجعة proposals وحل duplicates/conflicts ودمجها بأمان.
- **الأسطح:** Control Panel approval/governance؛ app-partner/app-field status readback.
- **الثوابت:** merge يحفظ lineage؛ لا حذف references؛ optimistic concurrency.
- **الاختبارات:** simultaneous approvals، merge into deprecated product، conflicting barcode، rollback/readback.
- **معيار الإغلاق:** unresolved conflicts صفر داخل العنصر؛ lineage/audit كامل؛ consumers point to canonical IDs؛ no orphan assortment.

## J034 — Store Assortment

- **الهدف:** ربط Master Product بالمتجر مع الحالة والoverride المسموح.
- **المالك:** DSH؛ ليس كتالوجًا محليًا موازيًا.
- **الأسطح:** app-partner assortment، app-field catalog/partner products، Control Panel governance، app-client store catalog.
- **الحالات:** pending/active/paused/unavailable/retired.
- **الاختبارات:** product inactive، cross-store mutation، duplicate link، stale version، offline queued update.
- **معيار الإغلاق:** assortment references master product فقط؛ duplicate store products صفر؛ readback consistent؛ pause/remove semantics PASS.

## J035 — المخزون والتوفر وحدود الطلب

- **الهدف:** إدارة availability/stock signal/min-max/step دون تضارب بين surfaces.
- **المالك:** DSH.
- **الأسطح:** app-partner inventory actions، app-field pause، Control Panel monitor، app-client add-to-cart/availability.
- **الثوابت:** concurrency-safe decrement/reservation policy؛ unavailable item لا يدخل checkout.
- **الاختبارات:** oversell race، negative stock، stale client، duplicate adjustment، offline conflict.
- **معيار الإغلاق:** stock/availability write path واحد؛ race tests PASS؛ cart/checkout revalidation؛ audit adjustments كامل.

## J036 — السعر ووقت التحضير وسياسة التغيير

- **الهدف:** إدارة store price/preparation estimate/effective changes مع تاريخ واضح.
- **المالك:** DSH للسعر التشغيلي قبل order snapshot؛ WLT لا يملك catalog price.
- **الأسطح:** app-partner product override/preparation، Control Panel review، app-client display/cart/checkout.
- **الاختبارات:** negative/invalid currency، overlapping effective price، stale cart، concurrent edit، unauthorized override.
- **معيار الإغلاق:** one effective price per SKU/store/time؛ order snapshot ثابت؛ hardcoded/local price truth صفر؛ readback PASS.

## J037 — Reels ومحتوى المنتجات المرئي

- **الهدف:** إدارة Reels المرتبطة بمنتج/متجر مع review/visibility/analytics policy.
- **المالكون:** DSH للربط والحالة، Media للملف.
- **الأسطح:** app-partner management، Control Panel review، app-client discovery/store detail.
- **الحالات:** draft/uploading/review/approved/rejected/published/expired.
- **الاختبارات:** unsafe media، wrong owner، unpublished product، expired content، broken playback.
- **معيار الإغلاق:** moderation/ownership PASS؛ dead reels صفر؛ client fallback/accessibility؛ metrics لا تغير الحقيقة.

## J038 — Home Discovery ومحتوى الواجهة الرئيسية

- **الهدف:** بناء home feed مركزي حسب الموقع والسياق والجاهزية دون fixtures حية.
- **المالك:** DSH؛ Platform Control للrollout والسياسات.
- **الأسطح:** Control Panel marketing/home، app-client home sections/cards/banners/reels/filters.
- **الثوابت:** لا متجر غير منشور؛ targeting deterministic؛ pagination/order stable.
- **الاختبارات:** empty area، stale targeting، invalid campaign، provider/search down، duplicate cards.
- **معيار الإغلاق:** runtime data فقط؛ fixtures-as-truth صفر؛ كل section له loading/empty/error؛ analytics correlation مثبت.

## J039 — الحملات والعروض والكوبونات والمزادات

- **الهدف:** دورة حياة promotion/campaign/coupon/auction مع حدود التمويل والاستخدام.
- **المالكون:** DSH للأهلية والتطبيق التشغيلي، WLT لتمويل/التزام مالي.
- **الأسطح:** Control Panel marketing decks، app-partner promotions، app-client discovery/cart/checkout.
- **الحالات:** draft/scheduled/active/paused/exhausted/expired/cancelled.
- **الاختبارات:** double redemption، budget exhaustion race، invalid stacking، wrong scope، timezone boundary.
- **معيار الإغلاق:** eligibility source واحد؛ funding handoff to WLT؛ redemption idempotent؛ stacking/budget tests PASS.

## J040 — الولاء والمزايا

- **الهدف:** إدارة loyalty policy والbenefits دون جداول أو حسابات ميتة موازية.
- **المالكون:** DSH لعرض/أهلية benefit، WLT لأي رصيد أو التزام مالي.
- **الأسطح:** Control Panel loyalty، app-client benefits، partner visibility عند الانطباق.
- **الحالات:** policy draft/active/paused/retired؛ entitlement pending/active/consumed/expired.
- **الاختبارات:** duplicate accrual/consume، stale entitlement، policy change، unauthorized manual grant.
- **معيار الإغلاق:** dead loyalty tables/paths صفر؛ financial truth في WLT؛ benefit readback واضح؛ replay/concurrency PASS.

## بوابة إغلاق المجموعة J020..J040

```yaml
partner_store_truth_single_owner: PASS
partner_tenant_or_saas_residue: 0
store_without_partner: 0
published_unready_stores: 0
local_catalog_truths: 0
unmigrated_catalog_consumers: 0
catalog_media_orphans: 0
promotion_finance_boundary: PASS
all_required_surface_controls_mapped: PASS
open_journeys_in_group: 0
failed_required_checks: 0
evidence_sha: FINAL_SHA
```
