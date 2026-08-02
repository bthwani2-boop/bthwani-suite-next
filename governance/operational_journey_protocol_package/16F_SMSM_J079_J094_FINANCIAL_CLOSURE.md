# 16F — الرحلات J079..J094: الإغلاق المالي بين DSH وWLT

> جزء إلزامي من الخطة الرئيسية. الحقيقة المالية حصرًا في WLT، وكل Surface يصل إليها عبر DSH facade فقط.

## J079 — DSH Finance Facade والنقل المالي

- **الهدف:** إنشاء واجهة DSH واحدة لكل قراءة/أمر مالي تحتاجه أسطح DSH.
- **المالكون:** DSH يملك facade والتفويض التشغيلي؛ WLT يملك التنفيذ والحقيقة المالية.
- **الأسطح:** app-client/app-partner/app-captain/app-field/control-panel عبر DSH فقط.
- **النطاق:** service auth، scope propagation، correlation، idempotency، timeout، result lookup، error mapping.
- **الاختبارات:** direct WLT URL، forged scope، WLT timeout، duplicate mutation، unknown result، stale projection.
- **معيار الإغلاق:** browser/mobile direct WLT calls صفر؛ public WLT env صفر؛ facade operations كلها مربوطة؛ runtime network proof PASS.

## J080 — المدفوعات الإلكترونية وحقيقة المزود

- **الهدف:** إنشاء/تفويض/التقاط/فشل/إلغاء Payment Session وربط provider truth.
- **المالك:** WLT؛ DSH يحتفظ بالمرجع والحالة المقروءة فقط.
- **الحالات:** created/pending/authorized/captured/failed/cancelled/expired/unknown.
- **الأسطح:** app-client payment flow، Control Panel payment operations، app-partner order financial status masked.
- **الاختبارات:** tampered amount، duplicate capture، provider timeout، webhook replay/signature، late success after timeout.
- **معيار الإغلاق:** provider outcome reconciled؛ duplicate charge صفر؛ raw credentials/details خارج WLT صفر؛ DSH order readback متقارب.

## J081 — المحافظ والحسابات والأرصدة المقروءة

- **الهدف:** إدارة accounts/wallets والباقي المشتق من ledger دون تعديل مباشر.
- **المالك:** WLT.
- **الأسطح:** DSH facade panels للعملاء/الشركاء/الكباتن/الميداني/الممثل وControl Panel masked read.
- **الثوابت:** balance مشتق؛ لا set balance؛ account ownership وcurrency ثابتان وفق policy.
- **الاختبارات:** cross-actor account read، stale balance، concurrent entries، closed account، unsupported currency.
- **معيار الإغلاق:** direct balance mutations صفر؛ ledger reconciliation PASS؛ scoped/masked readback؛ cache لا يصبح حقيقة.

## J082 — Ledger والقيود والانعكاس

- **الهدف:** دفتر مزدوج/ذري لكل أثر مالي مع reversal بدل التعديل أو الحذف.
- **المالك:** WLT.
- **البيانات:** journals/entries/accounts/currency/idempotency/correlation/source reference/effective time.
- **الاختبارات:** unbalanced journal، duplicate source، concurrent post، reversal twice، partial transaction.
- **معيار الإغلاق:** debit=credit لكل journal؛ immutable posted entries؛ duplicate financial effect صفر؛ audit/rebuild/reconciliation PASS.

## J083 — سجلات COD

- **الهدف:** إنشاء سجل COD مالي مرتبط بطلب ودليل تشغيلي واحد.
- **المالكون:** DSH يرسل order/delivery evidence؛ WLT يملك COD record.
- **الحالات:** expected/collected/in_custody/handed_over/reconciled/short/over/disputed.
- **الأسطح:** app-captain/app-partner/control-panel عبر DSH facade.
- **الاختبارات:** duplicate delivery event، amount mismatch، wrong order/currency، late event، cancellation race.
- **معيار الإغلاق:** COD record واحد لكل obligation؛ amount from pinned order evidence؛ duplicates صفر؛ readback/status correlation PASS.

## J084 — حيازة COD والتحصيل والتسليم

- **الهدف:** تتبع انتقال حيازة النقد بين العميل والكابتن/الشريك/الممثل والخزينة.
- **المالك:** WLT للحيازة المالية؛ DSH يملك إثبات التسليم التشغيلي.
- **الأسطح:** app-captain COD actions، app-partner custody، app-field/representative collections، Control Panel reconciliation.
- **الثوابت:** custody transition requires actor/scope/proof؛ لا negative unexplained custody.
- **الاختبارات:** double handover، wrong actor، offline queued collection، amount mismatch، lost device.
- **معيار الإغلاق:** chain of custody كاملة؛ atomic transitions؛ unassigned custody صفر؛ offline/replay/recovery PASS.

## J085 — الأهلية المالية للكابتن والميداني والممثل

- **الهدف:** إرجاع قرار eligibility مالي قابل للتفسير دون نقل ledger logic إلى DSH.
- **المالك:** WLT؛ DSH يستهلك decision/reasons فقط.
- **النطاق:** debt/custody limits، account status، payout restrictions، effective policy/version.
- **الأسطح:** app-captain/app-field/operator dispatch، Control Panel finance/operations.
- **الاختبارات:** stale eligibility، forged actor، concurrent settlement، WLT unavailable، policy boundary.
- **معيار الإغلاق:** local eligibility calculation صفر؛ reason codes كاملة؛ fail behavior صريح؛ dispatch respects fresh decision.

## J086 — العمولات وسياساتها واحتسابها

- **الهدف:** تطبيق commission policy الفعالة وإصدار record/adjustment قابل للتدقيق.
- **المالك:** WLT؛ DSH يرسل immutable operational evidence.
- **النطاق:** partner/platform/captain/field categories عند Product Truth، basis، rate/fixed، caps، effective version.
- **الأسطح:** app-partner finance، field/captain summary، Control Panel commission governance عبر facade.
- **الاختبارات:** duplicate evidence، overlapping policy، wrong basis، reversal/cancellation، retroactive adjustment.
- **معيار الإغلاق:** commission calculation خارج WLT صفر؛ policy version pinned؛ duplicate records صفر؛ ledger linkage/reconciliation PASS.

## J087 — الاشتراك المالي والالتزامات وديون الشريك

- **الهدف:** تمثيل partner subscription/fees/debts كعلاقة مالية فقط دون SaaS/Tenant.
- **المالك:** WLT؛ DSH يملك commercial model reference.
- **الحالات:** obligation pending/due/paid/overdue/waived/reversed/disputed.
- **الأسطح:** app-partner commercial summary، Control Panel finance/partner detail عبر facade.
- **الاختبارات:** duplicate billing period، model change mid-period، waiver without approval، negative debt، timezone cutoff.
- **معيار الإغلاق:** tenant provisioning/billing semantics صفر؛ obligation uniqueness؛ ledger-backed balance؛ DSH raw debt truth صفر.

## J088 — تمويل العروض والكوبونات

- **الهدف:** توزيع وتمويل تكلفة promotion بين platform/partner وفق policy وorder evidence.
- **المالك:** WLT للfunding ledger؛ DSH للأهلية/redemption operationally.
- **الحالات:** reserved/committed/released/reversed/reconciled.
- **الاختبارات:** double reservation، budget race، cancelled order، partial refund، policy mismatch.
- **معيار الإغلاق:** budget overspend race صفر؛ funding entries balanced؛ release/reversal idempotent؛ operational/financial reconciliation PASS.

## J089 — الاستردادات

- **الهدف:** إنشاء refund بعد قرار تشغيلي صحيح، وتنفيذه ومصالحته مع provider/ledger.
- **المالك:** WLT؛ DSH يملك request/case evidence فقط.
- **الحالات:** requested/validated/pending_provider/succeeded/failed/unknown/reversed.
- **الأسطح:** app-client status، app-partner masked impact، Control Panel refund commands عبر DSH facade.
- **الاختبارات:** duplicate refund، amount above captured، provider timeout، late webhook، partial refund totals، unauthorized operator.
- **معيار الإغلاق:** no direct surface refund؛ cumulative limits enforced؛ duplicate money movement صفر؛ unknown-result reconciliation PASS.

## J090 — التسويات

- **الهدف:** تجميع المستحقات والخصومات والديون ضمن settlement period قابل للتدقيق.
- **المالك:** WLT.
- **الحالات:** open/calculating/review/approved/locked/paid/reopened_by_adjustment.
- **الأسطح:** app-partner settlement summary، Control Panel governed settlement عبر facade.
- **الاختبارات:** late order/refund، duplicate source، policy change، concurrent approve، reopen posted period.
- **معيار الإغلاق:** source completeness/reconciliation؛ locked settlements immutable؛ adjustments منفصلة؛ DSH settlement calculations صفر.

## J091 — وجهات الصرف

- **الهدف:** إدارة payout destinations الحساسة والتحقق منها مع masking.
- **المالك:** WLT حصريًا.
- **الأسطح:** app-partner destination panel، Control Panel review عبر DSH؛ DSH يحتفظ IDs/masked values فقط.
- **الحالات:** draft/pending_verification/verified/rejected/suspended/deleted.
- **الاختبارات:** raw bank persistence in DSH، duplicate destination، unauthorized change، verification replay، secret/log leakage.
- **معيار الإغلاق:** raw bank/IBAN/mobile in DSH صفر؛ encryption/masking/access audit PASS؛ verified destination required for payout.

## J092 — طلبات الصرف والفشل وإعادة المحاولة

- **الهدف:** إنشاء/اعتماد/إرسال payout ومتابعة provider proof والفشل دون تكرار الصرف.
- **المالك:** WLT.
- **الحالات:** requested/review/approved/submitted/succeeded/failed/unknown/retry_scheduled/cancelled.
- **الأسطح:** app-partner request/status، Control Panel payout queue عبر facade.
- **الاختبارات:** duplicate submit، insufficient available amount، destination changed، provider timeout، late success، retry after unknown.
- **معيار الإغلاق:** payout idempotency + atomic authorization؛ duplicate payout صفر؛ provider proof/reconciliation؛ DSH references only.

## J093 — المصالحة المالية وحالات الفروقات

- **الهدف:** مقارنة WLT ledger/provider/operational evidence وفتح reconciliation case لكل فرق.
- **المالك:** WLT؛ DSH يوفر evidence/readback.
- **الحالات:** detected/investigating/matched/adjustment_required/resolved/accepted_risk.
- **الأسطح:** Control Panel reconciliation، app-partner masked status عند الانطباق.
- **الاختبارات:** missing provider record، duplicate webhook، amount/date mismatch، stale evidence، unauthorized resolution.
- **معيار الإغلاق:** unexplained differences صفر أو `BLOCKED_EXTERNAL`; adjustments journaled؛ case lineage/audit كامل؛ no delete-to-resolve.

## J094 — التقارير المالية والملخص التجاري

- **الهدف:** تقارير وملخصات مالية مقيدة مشتقة من WLT مع تعريف metric وفترة وعملة.
- **المالك:** WLT؛ DSH facade للعرض.
- **الأسطح:** app-partner finance dashboard، captain/field summaries، Control Panel finance reports.
- **النطاق:** balances، revenues، commissions، debts، settlements، payouts، refunds، COD؛ pagination/export authorization.
- **الاختبارات:** cross-partner report، stale snapshot، timezone/currency، export PII، totals mismatch.
- **معيار الإغلاق:** report totals reconcile to ledger؛ scope isolation؛ freshness visible؛ local frontend aggregation as truth صفر؛ exports audited.

## بوابة إغلاق المجموعة J079..J094

```yaml
dsh_facade_only: PASS
direct_surface_wlt_calls: 0
public_wlt_environment_variables: 0
financial_truth_outside_wlt: 0
direct_balance_or_ledger_mutations: 0
duplicate_payment_refund_payout_effects: 0
raw_bank_data_in_dsh: 0
cod_chain_of_custody: PASS
commission_obligation_settlement_reconciliation: PASS
provider_unknown_result_recovery: PASS
financial_scope_and_atomic_authorization: PASS
financial_reports_reconcile_to_ledger: PASS
open_journeys_in_group: 0
failed_required_checks: 0
evidence_sha: FINAL_SHA
```
