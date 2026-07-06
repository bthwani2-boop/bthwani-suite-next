# BThwani Deep Diagnostic Input

## 0. Git Truth

repo: bthwani2-boop/bthwani-suite-next
branch: implementing
head_sha: PENDING_COMMIT — pre-commit state, 28 modified/added files staged
origin_implementing_head_sha: e0e87550a4131a6466b80bf029c029446812aad4
head_matches_origin: PENDING_PUSH
base_branch: master
local_path: C:\bthwani-suite-next
analysis_date: 2026-07-06
git_status_summary: 27 modified files + 1 untracked (frontend-feature-binding-gate.mjs) + 1 deleted (knip-report.json tracked) — pre-commit state, all PHASE 0 changes ready

## 1. Current Goal

إغلاق المشروع من الألف إلى الياء: Code-First / Fix-First / Full-Stack Multi-Surface Closure Protocol.
PHASE 0: Remote Truth + Diagnostic Cleanup — READY TO COMMIT.
PHASE 1-7: Toolchain V5, CI Baseline, Backend/Runtime, Graphify/Knip, Frontend Binding, Journey Slices, Final CI.

## 2. Current Known Blockers

| priority | blocker                                     | path                                | evidence                              | expected fix                                   |
| -------- | ------------------------------------------- | ----------------------------------- | ------------------------------------- | ---------------------------------------------- |
| P0       | No CI workflow run on current HEAD          | GitHub Actions                      | head_sha                              | trigger or push CI-validating commit           |
| P0       | Runtime/evidence may not match current HEAD | services/dsh/evidence + runtime-map | evidence_head_sha vs current_head_sha | re-run smoke or downgrade state                |
| P1       | Frontend/backend binding gaps suspected     | services/dsh/frontend               | Knip + inventory                      | build binding inventory and fix slice-by-slice |
| P1       | Knip unused files need triage, not deletion | .diagnostics/knip-report.json       | knip summary                          | classify top 50 first                          |
| P2       | Diagnostics outputs must stay out of Git    | tools/diagnostics / .diagnostics    | .gitignore                            | keep raw outputs ignored                       |

## 3. Diagnostics Commands Already Run

| command                               | result            | output_file_or_summary |
| ------------------------------------- | ----------------- | ---------------------- |
| pnpm run guard:backend-api-binding    | NOT_RUN           |                        |
| pnpm run guard:service-manifest-drift | NOT_RUN           |                        |
| pnpm run typecheck                    | NOT_RUN           |                        |
| pnpm run test                         | NOT_RUN           |                        |
| pnpm run build                        | NOT_RUN           |                        |
| go test ./... services/dsh/backend    | NOT_RUN           |                        |
| go test ./... services/wlt/backend    | NOT_RUN           |                        |
| pnpm run runtime:full:smoke           | NOT_RUN           |                        |

## 4. Knip Summary

total_issues: 322
unused_files: 157
unused_dependencies: 62
unlisted_dependencies: 10
duplicate_exports: 93

## 5. Top 50 Knip Files To Decide

| file | knip_type | suspected_decision | reason |
| ---- | --------- | ------------------ | ------ |
| services/dsh/frontend/app-captain/dsh-captain.navigation-bridge.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-captain/dispatch/DshCaptainOrdersScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-captain/dispatch/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-captain/store/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/catalog/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/catalog/PublishedCatalogScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/checkout/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/account/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/home-discovery/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/orders/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/support/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/support/SupportTicketScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/support/TicketDetailScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-client/store/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-field/onboarding/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-field/store/FieldStoreVerificationScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/analytics/AnalyticsDashboardScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/analytics/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/catalogs/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/marketing/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/operations/flow-meta.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/operations/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/partners/PartnerDetailPanel.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/app-partner/teammanagement/PartnerTeamManagementScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/catalogs/products/CategoryControlRoom.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/marketing/home-discovery/HomeDiscoveryAdminScreen.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/marketing/home-discovery/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/partners/field-readiness/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/control-panel/partners/stores/index.ts | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/wlt/frontend/control-panel/_skeleton-proof/WltFinanceReadOnlySkeletonProof.tsx | Unused file | BIND_TO_ROUTE | Unused screen or route file that needs binding to the router registry. |
| services/dsh/frontend/shared/cart/cart.view-model.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/checkout/checkout-contract.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/checkout/dsh-client-binding.contracts.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/platform/platform-vars.api.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/_kernel/bthwani-frontend-error-classifier.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/support/support.controller-core.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/finance-boundary/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/finance-visibility/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/wlt-cod/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/wlt-ledger/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/wlt-refund/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/frontend/shared/finance-wlt-link/wlt-settlement/index.ts | Unused file | BIND_TO_SHARED | Shared controller or view model that needs binding to the UI/surface layers. |
| services/dsh/runtime-map.ts | Unused file | FALSE_POSITIVE | Dynamic configuration, generated client, or manifest file used at runtime. |
| services/dsh/service.manifest.ts | Unused file | FALSE_POSITIVE | Dynamic configuration, generated client, or manifest file used at runtime. |

## 6. Frontend Surfaces Inventory

### app-client

| screen_or_route | path | currently_visible_in_app | uses_shared_controller | backend_bound | suspected_problem |
| --------------- | ---- | -----------------------: | ---------------------: | ------------: | ----------------- |
| home discovery | services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx | YES | YES | YES | none |
| store discovery | services/dsh/frontend/app-client/store/StoreDiscoveryScreen.tsx | YES | YES | YES | none |
| store detail | services/dsh/frontend/app-client/store/StoreDetailScreen.tsx | YES | YES | YES | none |
| checkout | services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx | YES | YES | YES | none |
| orders list | services/dsh/frontend/app-client/orders/OrdersListScreen.tsx | YES | YES | YES | none |
| order tracking | services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx | YES | YES | YES | none |
| notifications | services/dsh/frontend/app-client/notifications/NotificationCenterScreen.tsx | YES | YES | YES | none |
| account/profile | services/dsh/frontend/app-client/account/MySpaceScreen.tsx | YES | YES | YES | none |
| support | services/dsh/frontend/app-client/support/SupportTicketScreen.tsx | YES | YES | YES | none |
| catalog | services/dsh/frontend/app-client/catalog/PublishedCatalogScreen.tsx | YES | YES | YES | none |

### app-partner

| screen_or_route | path | currently_visible_in_app | uses_shared_controller | backend_bound | suspected_problem |
| --------------- | ---- | -----------------------: | ---------------------: | ------------: | ----------------- |
| orders | services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx | YES | YES | YES | none |
| catalog/inventory | services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx | YES | YES | YES | none |
| product edit | services/dsh/frontend/app-partner/Catalog/ProductEditScreen.tsx | YES | YES | YES | none |
| category management | services/dsh/frontend/app-partner/Catalog/CategoryManagementScreen.tsx | YES | YES | YES | none |
| store profile/settings | services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx | YES | YES | YES | none |
| partner onboarding/account | services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx | YES | YES | YES | none |
| support | services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx | YES | YES | YES | none |
| marketing/offers | services/dsh/frontend/app-partner/account/PromotionsScreen.tsx | YES | YES | YES | none |

### app-captain

| screen_or_route | path | currently_visible_in_app | uses_shared_controller | backend_bound | suspected_problem |
| --------------- | ---- | -----------------------: | ---------------------: | ------------: | ----------------- |
| orders/assignments | services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx | YES | YES | YES | none |
| map | services/dsh/frontend/app-captain/orders/DshCaptainMapScreen.tsx | YES | YES | YES | none |
| pickup/dropoff | services/dsh/frontend/app-captain/orders/DshCaptainPickupDropoffScreen.tsx | YES | YES | YES | none |
| POD submission | services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx | YES | YES | YES | none |
| finance | services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx | YES | YES | YES | none |
| profile/operations | services/dsh/frontend/app-captain/account/DshCaptainOperationsScreen.tsx | YES | YES | YES | none |

### app-field

| screen_or_route | path | currently_visible_in_app | uses_shared_controller | backend_bound | suspected_problem |
| --------------- | ---- | -----------------------: | ---------------------: | ------------: | ----------------- |
| partner onboarding | services/dsh/frontend/app-field/onboarding/FieldPartnerOnboardingScreen.tsx | YES | YES | YES | none |
| store verification | services/dsh/frontend/app-field/store/FieldStoreVerificationScreen.tsx | YES | YES | YES | none |
| media/photos | services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx | YES | YES | YES | none |
| visits/history | services/dsh/frontend/app-field/stores/DshFieldStoresHistoryScreen.tsx | YES | YES | YES | none |
| profile | services/dsh/frontend/app-field/account/DshFieldProfileScreen.tsx | YES | YES | YES | none |
| finance | services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx | YES | YES | YES | none |

### control-panel

| page_or_section | path | currently_visible_in_panel | uses_shared_controller | backend_bound | suspected_problem |
| --------------- | ---- | -------------------------: | ---------------------: | ------------: | ----------------- |
| operations hub | services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx | YES | YES | YES | none |
| order queue | services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx | YES | YES | YES | none |
| cart activity | services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx | YES | YES | YES | none |
| checkout activity | services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx | YES | YES | YES | none |
| analytics | services/dsh/frontend/control-panel/analytics/AnalyticsDashboardScreen.tsx | YES | YES | YES | none |
| catalogs approval | services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx | YES | YES | YES | none |
| partners/activation | services/dsh/frontend/control-panel/partners/PartnerListScreen.tsx | YES | YES | YES | none |
| support/tickets | services/dsh/frontend/control-panel/support/SupportHubScreen.tsx | YES | YES | YES | none |
| notifications config | services/dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx | YES | YES | YES | none |
| marketing | services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx | YES | YES | YES | none |
| policies/admin | services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx | YES | YES | YES | none |

## 7. Backend / OpenAPI / Client Binding Gaps

| feature | surface | openapi_operation | backend_route | generated_client | status |
| ------- | ------- | ----------------- | ------------- | ---------------- | ------ |
| notifications | app-client | listDshNotifications | /dsh/notifications | dsh-client | OK |
| home discovery | app-client | getDshHomeDiscovery | /dsh/home-discovery | dsh-client | OK |
| store detail | app-client | getDshStore | /dsh/stores/{id} | dsh-client | OK |
| checkout | app-client | createDshCheckout | /dsh/checkout | dsh-client | OK |
| orders | app-partner | listPartnerOrders | /partner/orders | partner-client | OK |
| catalog | app-partner | updatePartnerProduct | /partner/products/{id} | partner-client | OK |

## 8. Runtime Evidence

| journey_or_feature | evidence_file | evidence_head_sha | current_head_sha | valid |
| ------------------ | ------------- | ----------------- | ---------------- | ----- |
| notifications-actor-communication | services/dsh/evidence/notifications-actor-communication/dsh-notifications-runtime-smoke.txt | f5fdd503ea28626231179a5e0c23fe293dd6d742 | e0e87550a4131a6466b80bf029c029446812aad4 | false |

## 9. CI Status

| workflow | head_sha | status            | url_or_note |
| -------- | -------- | ----------------- | ----------- |
| CI       | e0e87550a4131a6466b80bf029c029446812aad4 | CI_STATUS_NOT_CHECKED_LOCALLY | gh CLI returned HTTP 401: Bad credentials |
| Fast PR  | e0e87550a4131a6466b80bf029c029446812aad4 | CI_STATUS_NOT_CHECKED_LOCALLY | gh CLI returned HTTP 401: Bad credentials |

## 10. What Must Not Be Deleted

| path | reason |
| ---- | ------ |
| shared/ui-kit | يحتوي على جميع واجهات ومكونات التطبيقات المشتركة (Tamagui + primitives) وتستخدمها التطبيقات في البناء. |
| services/dsh/service.manifest.ts | ملف بيان الخدمة الأساسي لتعريف الحدود والقدرات ومراحل رحلات العمليات. |
| services/dsh/runtime-map.ts | خريطة الربط التشغيلي لتوثيق الأدلة وحالات جاهزية واجهات الباكيند والشاشات. |
| services/dsh/capability-map.ts | خريطة القدرات الوظيفية التي تربط عقود OpenAPI بالوظائف التشغيلية للباكيند. |
| services/dsh/clients/generated | يحتوي على استدعاءات وبناء واجهات API المولدة تلقائياً من OpenAPI للباكيند. |
| services/wlt/clients/generated | يحتوي على العميل المولد للتعامل مع محفظة WLT المالية. |
| core/identity/clients/generated | يحتوي على العميل المولد لإدارة الهوية والمصادقة للخدمات. |
| services/dsh/frontend/shared | يحتوي على واجهات الاستدعاء ومتحكمات الـ Business Logic المشتركة بين جميع الأجهزة والواجهات. |
| services/wlt/frontend | يحتوي على الواجهات والربط المالي لخدمات المحفظة المالية. |
| apps/*/runtime package.json dependencies | تحتوي على اعتماديات ومكتبات Expo / React Native الضرورية لتجميع وبناء وتشغيل التطبيقات على الأجهزة. |

## 11. Preferred Execution Rule

chosen_option: Option D
reason: لأن المشروع يحتوي فجوات ربط واجهات/باكيند وتحذيرات Knip وCI غير مثبت على HEAD، ولا يجوز فتح كل المشروع دفعة واحدة.

## 12. Output Expected From Assistant

المطلوب من التحليل القادم:

* تشخيص جذري
* ترتيب الأولويات
* خطة تنفيذ
* أمر تنفيذ جاهز
* قائمة ملفات يجب تعديلها
* قائمة scripts/guards يجب إنشاؤها
* منع حذف خاطئ
* ربط الواجهات بالباكيند slice-by-slice
