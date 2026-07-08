# Live Code Patch Ledger

Every product/contract/guard file modified or created across this engagement (both the bank-account/products
session and this continuation). Governance/diagnostics/`.diagnostics` auto-generated files are excluded from
this table (they are regenerated output, not hand-authored evidence) but are listed in the raw `git status`
below for completeness.

## Backend (Go)

| File | Change |
|---|---|
| `services/dsh/backend/internal/partner/model.go` | +9 bank fields on `Partner`/`UpdatePartnerInput` |
| `services/dsh/backend/internal/partner/repository.go` | Bank fields in `CreatePartner`/`GetPartner`/`UpdatePartner`; **`TransitionStatus` bug fix** (bank fields missing from every transition response) |
| `services/dsh/backend/internal/platformpolicies/platformpolicies.go` | New: `StoreOnboardingFeePolicy` type + get/upsert + readiness derivation |
| `services/dsh/backend/internal/http/platformpolicies.go` | New: 3 handlers for the fee policy |
| `services/dsh/backend/internal/http/server.go` | +3 fee-policy routes |

## Migrations (new)

- `services/dsh/database/migrations/dsh-027_partner_bank_account.sql`
- `services/dsh/database/migrations/dsh-028_store_onboarding_fee_policy.sql`

## Contracts

- `services/dsh/contracts/dsh.openapi.yaml` — bank fields on `DshPartner`/`DshUpdatePartnerRequest`; 3 new
  operations + 3 new schemas for the fee policy.
- `services/dsh/clients/generated/dsh-api.ts` — regenerated (3× across the engagement).

## app-field

| File | Change |
|---|---|
| `onboarding/DshFieldOnboardingScreen.tsx` | +bank-account wizard step, +persistent products section, +products button in success state, +fee-policy reference card |
| `components/OnboardingBankAccountSection.tsx` | New wizard step component |
| `stores/DshFieldPartnerProgressScreen.tsx` | +products button |
| `stores/DshFieldStoresHistoryScreen.tsx` | **Bug fix**: operator-only controller → field-scoped controller |
| `account/DshFieldProfileScreen.tsx` | **Bug fix**: operator-only controller → field-scoped controller |
| `account/DshFieldProfileHomeScreen.tsx` | +"التحقق الميداني من المتجر" menu item |
| `components/DshFieldRouteRenderer.tsx` | +products button wiring, +verification route wiring |
| `dsh-field.routes.ts` | `verification` route: dropped unused `storeId` param |
| `finance/DshFieldFinanceScreen.tsx` | (prior session — finance-WLT-runtime fix) |

## app-partner

- `account/OperationScreens.tsx` — fee-policy reference self-fetch in `OnboardingActionScreen`.
- `account/PartnerOnboardingActionPanel.tsx` — optional `feePolicy` prop + display.

## control-panel

- `partners/PartnerDetailScreen.tsx` — masked bank-account card.
- `platform/PlatformPoliciesScreen.tsx` + `platform/index.ts` — fee-policy section wired in.
- `platform/StoreOnboardingFeePolicySection.tsx` — new.
- `finance/FinanceDashboardScreen.tsx` — (prior session — finance-WLT-runtime fix).

## shared (DSH frontend)

- `_kernel/dsh-http-request.ts` — (prior session) structured error parsing.
- `field-onboarding/{field-onboarding.types.ts,use-field-partner-onboarding-controller.tsx}` — bank fields,
  validation, missing-count, submit-flow wiring.
- `finance-wlt-link/finance/finance-hub-runtime.api.ts` — (prior session) error classification.
- `partner/{index.ts,partner.api.ts,partner.types.ts,partner.view-model.ts}` — bank fields, masking, exported
  `fieldUpdatePartner`.
- `platform-policies/{platform-policies.types.ts,platform-policies.api.ts,use-platform-policies-controller.tsx}`
  — new fee-policy types/adapters/controllers.

## WLT frontend

- `services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx` — (prior session)
  404 → graceful empty state.

## Tooling

- `tools/guards/frontend-feature-binding-gate.mjs` — 2 stale manifest paths corrected.

## Checklists (evidence, this repo's own governance artifacts)

- `tools/checklist/JOURNEY-FIELD-ONBOARDING-BANK-ACCOUNT.md`
- `tools/checklist/JOURNEY-FIELD-FINANCE-WLT-RUNTIME.md`
- `tools/checklist/JOURNEY-PLATFORM-STORE-ONBOARDING-FEE.md`
- `tools/checklist/JOURNEY-FIELD-MULTI-SURFACE-BINDING.md`
- `tools/checklist/JOURNEY-FIELD-APP-CLOSURE.md`

## Anomaly carried forward (disclosed, not caused by this engagement)

Six `tools/registry/runs/FOUNDATION-GATE-*/evidence.json` files show as deleted in `git status` at every point
in this engagement. No command run in any journey in this engagement touches that path. First disclosed in the
finance-WLT-runtime journey (prior session); re-confirmed still present/unexplained at this session's end.
