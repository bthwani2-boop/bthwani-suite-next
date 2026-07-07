# Gap Burndown Report

This report tracks the status and classification decisions of the first 25 gaps from `gap-ledger.json`.

## Burndown Statistics
- **Head SHA Before**: `682aec7ef7b51167a3d828448bcdfd11cec2cd60`
- **Head SHA After**: `4cbe5a8c0aac32308affe90295f496bb9d681c26`
- **Gap Count Before**: `184`
- **Gap Count After**: `178` (6 resolved by code)
- **Selected Gap Count**: `25`
- **Fixed by Code**: `6`
- **Keep Active with Proof**: `11`
- **False Positive with Proof**: `8`
- **Blocked External Only**: `0`

## Decided Gaps (First 25)

1. **services/dsh/frontend/shared/catalog/catalog.controller-core.ts** (loadCatalogState)
   - **Decision**: `FIXED_BY_CODE` (deleted unused export)
2. **services/dsh/frontend/shared/platform/platform-provider.registry.ts** (getProviderById, getProvidersByKind)
   - **Decision**: `FIXED_BY_CODE` (deleted unused exports and updated barrel file)
3. **apps/control-panel/runtime/src/styles/dsh-colors.ts**
   - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (design color tokens for control-panel sidebar/chrome UI)
4. **services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx**
   - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (screen entry component registered dynamically)
5. **apps/app-partner/runtime/src/App.tsx**
   - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (React Native/Expo app root component)
6. **apps/app-field/runtime/src/App.tsx**
   - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (React Native/Expo app root component)
7. **services/dsh/frontend/shared/catalog/catalog.states.ts** (catalogSubmissionLoadingState, catalogAuditIdleState)
   - **Decision**: `FIXED_BY_CODE` (deleted unused state functions)
8. **services/dsh/frontend/shared/checkout/checkout.states.ts** (checkoutOutOfAreaState)
   - **Decision**: `FIXED_BY_CODE` (deleted unused state function)
9. **services/dsh/frontend/shared/orders/orders.states.ts** (orderDetailIdleState, orderDetailLoadingState, orderDetailErrorState, orderDetailSuccessState)
   - **Decision**: `FIXED_BY_CODE` (deleted unused state functions)
10. **services/dsh/frontend/control-panel/dashboard/ControlPanelDshClosureDashboardScreen.tsx**
    - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (Next.js page component entry)
11. **services/dsh/frontend/control-panel/hr/ControlPanelHrScreen.tsx**
    - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (Next.js page component entry)
12. **services/dsh/frontend/control-panel/partners/PartnerListScreen.tsx**
    - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (Next.js page component entry)
13. **services/dsh/frontend/control-panel/partners/field-readiness/FieldReadinessQueueScreen.tsx**
    - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (Next.js page component entry)
14. **services/dsh/frontend/control-panel/support/SupportHubScreen.tsx**
    - **Decision**: `FALSE_POSITIVE_WITH_PROOF` (Next.js page component entry)
15. **shared/ui-kit/src/providers.tsx**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public UI kit module library exports)
16. **shared/ui-kit/src/foundation.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public UI kit library token functions)
17. **shared/ui-kit/src/appearance.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public UI kit appearance config exports)
18. **services/wlt/frontend/shared/dsh/wlt-dsh-reference.api.ts**
    - **Decision**: `FIXED_BY_CODE` (deleted unused API fetcher)
19. **services/dsh/frontend/shared/identity-access/dsh-role-permission.model.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (stubs for future role authorization rules)
20. **services/dsh/frontend/shared/catalog/use-catalog-controller.tsx**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public controller hook exported in service manifest)
21. **services/dsh/frontend/shared/catalog/catalog-registry.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public catalog UI mapping helpers)
22. **services/dsh/frontend/shared/runtime/control-panel.dashboard.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (dashboard layout metadata settings)
23. **services/dsh/frontend/shared/hr/control-panel.hr.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (HR workplace metadata settings stubs)
24. **services/dsh/frontend/shared/marketing/marketing.types.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (public types for marketing campaign options)
25. **services/dsh/frontend/shared/marketing/dsh-signal-layer.model.ts**
    - **Decision**: `KEEP_ACTIVE_WITH_PROOF` (signal notification API stub types)
