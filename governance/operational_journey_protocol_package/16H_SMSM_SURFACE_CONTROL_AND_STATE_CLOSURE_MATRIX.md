# 16H — مصفوفة إغلاق الأسطح والتحكمات والحالات

> جزء إلزامي من الخطة الرئيسية. أرقام الاكتشاف التاريخية أدناه هي حد أدنى استرشادي فقط، ويجب إعادة توليدها على أحدث SHA قبل الإغلاق.

## 1. القاعدة الحاكمة لكل Surface

كل Surface يجب أن يثبت السلسلة التالية لكل Route/Screen/Tab/Button/Icon/Form/Modal/Sheet/Filter/Sort/Pagination:

```text
navigation entry
→ visibility permission
→ enablement condition
→ user intent
→ controller/view-model
→ generated client or governed adapter
→ canonical OpenAPI operation
→ backend handler
→ domain authorization/state machine
→ DB/provider/event effect
→ runtime readback
→ loading/empty/error/blocked/offline/conflict/unknown-result
→ audit/telemetry
```

أي حلقة مفقودة تمنع إغلاق التحكم والسطح والرحلة التابعة له.

## 2. app-client

### النطاق الإلزامي

- runtime entry، session gate، header، bottom navigation، deep links.
- Home Discovery: banners، filters، stores، promotions، reels، empty/error/location states.
- Store Discovery/Detail: search، sort، filters، categories، products، media، measurement/options، add-to-cart.
- Cart: lines، quantities، remove، totals، promotion، delivery estimate، restore/conflict.
- Checkout: address، fulfillment، payment، quote، validation، confirmation، unknown result.
- Orders: list، detail، timeline، tracking، pickup، cancellation، return/refund، proof readback.
- Account: profile، preferences، addresses، identity/session/device، wallet summary عبر DSH، notifications.
- Support: tickets، messages، attachments، reopen، escalation.

### الحالات الإلزامية

`unauthenticated`, `loading`, `refreshing`, `empty`, `no_address`, `unserviceable`, `offline`, `stale`, `conflict`, `forbidden`, `blocked`, `payment_pending`, `unknown_result`, `partial_failure`, `retryable_error`, `terminal_error`.

### اختبارات السطح

- deep link قبل/بعد login.
- duplicate taps للCart/Checkout/Order/Payment/Cancel/Refund.
- slow/offline/reconnect وstale cart/quote.
- accessibility labels/focus/RTL/large text.
- network proof: صفر اتصال مباشر بـWLT.
- customer IDOR وaddress/order/ticket isolation.

### معيار الإغلاق

```yaml
unmapped_client_routes_screens_controls: 0
client_controls_without_backend_effect: 0
client_local_catalog_cart_financial_truth: 0
client_direct_wlt_requests: 0
missing_visible_states: 0
client_idor_failures: 0
client_runtime_journeys: PASS
client_accessibility_rtl: PASS
```

## 3. app-partner

### النطاق الإلزامي

- entry/session/partner-store scope selector.
- Partner Hub: profile، settings، readiness، notifications، analytics، support.
- Team: members، roles، invitations، assignments، revoke/readback.
- Store: profile، hours، service/delivery settings، fleet، readiness/publication.
- Catalog: categories، assortment، inventory، price/preparation، product proposals، media، overrides، reels.
- Orders: inbox، alerts، accept/reject، preparation، substitutions/issues، conversation، handoff، tracking.
- Finance عبر DSH facade: wallet summary، COD custody، commissions، obligations، settlements، payout destinations/requests.

### الحالات الإلزامية

`no_partner_scope`, `no_store_scope`, `pending_onboarding`, `needs_information`, `suspended`, `store_unready`, `permission_denied`, `offline_queue`, `conflict`, `finance_unavailable`, `unknown_result`.

### الاختبارات

- cross-partner/store isolation لكل query/mutation.
- role visibility مقابل backend enforcement.
- duplicate order decision/inventory update/payout request.
- revoked member/session أثناء الاستخدام.
- offline inventory/order actions وفق policy.
- direct WLT network proof.

### معيار الإغلاق

```yaml
unmapped_partner_routes_screens_controls: 0
cross_partner_store_exposure: 0
partner_direct_master_catalog_writes: 0
partner_local_financial_truth: 0
partner_direct_wlt_requests: 0
partner_role_visibility_mismatches: 0
partner_runtime_journeys: PASS
```

## 4. app-captain

### النطاق الإلزامي

- activation/login/profile/readiness/availability.
- offers/inbox/accept/decline/expiry.
- active assignment، map، navigation context، contact policy.
- arrival، pickup verification، handoff exceptions.
- en-route actions، live location، customer contact attempts.
- PoD capture/upload/submit، failure reasons، rescue/support.
- COD custody/collection/handover وfinance eligibility عبر facade.
- notifications، settings، logout/device behavior.

### الحالات الإلزامية

`profile_incomplete`, `not_ready`, `suspended`, `financially_blocked`, `no_assignment`, `offer_expired`, `location_permission_missing`, `offline_action_queued`, `assignment_changed`, `proof_upload_pending`, `unknown_result`.

### الاختبارات

- wrong/expired offer، double accept، reassignment race.
- stale/forged location، cross-order access.
- pickup/PoD replay، wrong store/customer.
- offline execution and reconnect conflict.
- COD duplicate handover/wrong actor.
- accessibility أثناء القيادة وعدم عرض بيانات زائدة.

### معيار الإغلاق

```yaml
unmapped_captain_routes_screens_controls: 0
captain_readiness_bypasses: 0
multiple_active_assignments: 0
unauthorized_location_or_order_access: 0
pickup_pod_replay_effects: 0
cod_custody_breaks: 0
captain_runtime_journeys: PASS
```

## 5. app-field

### النطاق الإلزامي

- activation/profile completion/workforce readiness.
- assigned partner/store/area work queue.
- onboarding visits، basics، agreements، location، evidence.
- partner/store progress/history/verification.
- catalog lookup/operations/product proposals/assortment pause.
- escalation/readiness checklist/incident/support.
- finance category commission or collection references عبر DSH facade عند Product Truth.

### الحالات الإلزامية

`profile_missing`, `assignment_missing`, `assignment_expired`, `offline`, `queued`, `conflict`, `evidence_upload_pending`, `partner_out_of_scope`, `store_out_of_scope`, `suspended`.

### الاختبارات

- cross-area/partner/store access.
- revoked assignment أثناء offline queue.
- duplicate visit/evidence/proposal.
- bad location/media، partial onboarding.
- finance visibility without local calculation/direct WLT.

### معيار الإغلاق

```yaml
unmapped_field_routes_screens_controls: 0
field_assignment_bypasses: 0
cross_scope_field_actions: 0
offline_queue_duplicate_effects: 0
orphan_onboarding_evidence: 0
field_local_financial_truth: 0
field_runtime_journeys: PASS
```

## 6. Control Panel

### الأقسام الإلزامية

- Login/session/auth boundary.
- Dashboard وoperational overview.
- Administration: roles، permissions، approvals، diagnostics، rollback، support sessions.
- HR/Workforce: employees، field، captains، supervisors، scopes، shifts، readiness، documents.
- Partners: create/review/list/detail/governance/team/field readiness.
- Stores: ownership، profile، readiness، publication، service areas، pricing، fleet.
- Catalogs: taxonomy، products، proposals، approval، media، assortment، inventory، reels.
- Marketing: discovery، campaigns، coupons، loyalty، subscriptions التجارية، offers، visibility.
- Operations: live orders، cart/checkout activity، preparation، dispatch، pickup، tracking، proof، rescue، exceptions، special operations، SLA.
- Finance: payment sessions، COD، wallets، commissions، refunds، settlements، payouts، reconciliation، reports عبر DSH facade.
- Platform: policies، change sets، rollout، providers، variables، maps، privacy.
- Support: tickets، incidents، notifications، conversations، audits.
- Analytics: operational metrics، extensions، drilldowns، exports المقيدة.

### كل صفحة/تبويب/لوحة يجب أن يثبت

- route داخل shell الصحيح وnavigation entry.
- session/permission/object-scope enforcement في BFF/backend.
- filters/sort/pagination/cursor/export behavior.
- create/edit/approve/reject/suspend/rollback controls مع confirmation/reason/audit.
- loading/empty/error/forbidden/conflict/stale/partial states.
- URL state/deep link/back navigation.
- no direct DB أو WLT، ولا service secret في browser.

### الاختبارات

- role matrix لكل section/action.
- cross-partner/store/operator scope.
- stale approval/version conflict.
- duplicate administrative mutations.
- BFF cookie/CSRF/session expiry.
- keyboard/a11y/RTL/responsive/table pagination.
- export authorization/redaction.

### معيار الإغلاق

```yaml
unmapped_control_panel_pages_tabs_controls: 0
navigation_dead_entries: 0
pages_without_permission_and_object_auth: 0
direct_browser_service_or_wlt_secrets: 0
direct_db_or_uncontracted_mutations: 0
approval_and_rollback_bypasses: 0
missing_table_filter_sort_pagination_tests: 0
control_panel_runtime_journeys: PASS
```

## 7. DSH Shared Brain

### المسؤوليات

- API transports/adapters الوحيدة للأسطح.
- generated client binding، request/error/correlation handling.
- controllers/hooks/view-models/validators.
- state/allowedActions mapping من backend لا state machines موازية.
- offline queue/conflict handling المشترك.
- finance-wlt-link عبر DSH endpoints فقط.
- navigation/screen registries حيث تكون مشتركة.

### الممنوع

- حساب الرصيد/العمولة/التسوية/الاسترداد محليًا.
- permission authority أو trusted scope من props/local storage.
- hardcoded catalog/order states المتعارضة.
- raw fetch متكرر خارج transport governed.
- fallback إلى mock/fixture/legacy endpoint.

### معيار الإغلاق

```yaml
shared_brain_duplicate_transports: 0
shared_brain_parallel_state_machines: 0
shared_brain_local_permissions: 0
shared_brain_local_financial_truth: 0
shared_brain_legacy_fallbacks: 0
shared_brain_generated_client_drift: 0
shared_brain_tests: PASS
```

## 8. WLT frontend/shared/dsh

- الغرض هو محولات/قراءات مرجعية محكومة لخدمة حدود DSH-WLT، وليس سطحًا ماليًا عامًا مستقلاً.
- كل request يجب أن يثبت اتجاه الاتصال الصحيح وهوية الخدمة والعقد والـscope.
- يمنع أن يصبح مسارًا يسمح لتطبيقات DSH باستدعاء WLT مباشرة.

**معيار الإغلاق:** references/controllers مربوطة بعقود حية؛ direct surface imports/network paths صفر؛ duplicate financial models صفر؛ readback/error/unknown-result tests PASS.

## 9. Runtime Shells

لكل `apps/*/runtime`:

- entrypoint واحد صحيح.
- app config، package/project/tsconfig، Metro/Next config متقاربة.
- env validation fail-fast بلا defaults خطرة خارج local.
- deep links/session/device/observability initialized.
- no business logic duplication داخل runtime shell.

**معيار الإغلاق:** cold start/export/build/route smoke PASS؛ broken imports صفر؛ hidden port/config fallback صفر؛ shell-to-sovereign-surface binding واحد.

## 10. shared/ui-kit

- يملك presentation primitives فقط.
- لا domain types أو API calls أو permission/state truth.
- components تدعم a11y/RTL/theme/responsive/loading/disabled.

**معيار الإغلاق:** domain imports صفر؛ interactive primitives لها keyboard/a11y tests؛ duplicate local component systems المصنفة للاستبدال صفر.

## 11. webapp وwebsite وmobile

كل مسار يصنف على أحدث SHA:

```text
ACTIVE_SURFACE
FUTURE_DECLARED_SURFACE
DUPLICATE_SURFACE
DEAD_SCAFFOLD
SHARED_RUNTIME_SUPPORT
ABSENT
```

لا يعاد إنشاء سطح محذوف لمجرد ذكره في وثيقة تاريخية. إذا كان Active يضاف إلى COVERAGE-00 بكل متطلبات الإغلاق، وإذا كان Dead يحذف بعد إثبات عدم وجود مستهلك.

## 12. بوابة إغلاق جميع الأسطح

```yaml
surface_inventory_regenerated_on_final_sha: PASS
all_routes_screens_pages_mapped: PASS
all_tabs_buttons_icons_forms_mapped: PASS
all_visible_states_mapped: PASS
all_controls_have_real_effect_or_are_removed: PASS
all_required_surfaces_have_runtime_readback: PASS
all_excluded_surfaces_have_product_reason: PASS
direct_surface_wlt_calls: 0
surface_owned_business_truths: 0
runtime_reachable_mocks_and_fixtures: 0
navigation_dead_ends: 0
accessibility_critical_failures: 0
open_surface_findings: 0
```
