# Backend / API / Database Matrix

Every route touched or added in this engagement, with its full chain: frontend adapter → OpenAPI operationId →
Go route → handler → repository → table. `go build`/`go test ./...` clean at every step;
`guard:go-routes-ci` extracts 169 DSH routes (up from 166 pre-engagement, +3 for the fee policy) via real Go
AST parsing, not a manual list.

| Frontend adapter | OpenAPI operationId | Route | Handler | Repository fn | Table(s) |
|---|---|---|---|---|---|
| `fieldUpdatePartner` (now exported) | `updateFieldPartnerDraft` | `PATCH /dsh/field/partners/{id}` | `HandleFieldUpdatePartner` | `UpdatePartner` | `dsh_partners` (+9 bank cols, `dsh-027`) |
| `transitionPartner` (control-panel) | `transitionDshPartner` | `POST /dsh/operator/partners/{id}/transition` | `handleTransition` | `TransitionStatus` **(fixed this session — see gap ledger #3)** | `dsh_partners`, `dsh_partner_activation_events`, `dsh_stores` |
| `fetchStoreOnboardingFeePolicy` | `getDshStoreOnboardingFeePolicy` | `GET /dsh/operator/platform/store-onboarding-fee` | `handleGetStoreOnboardingFeePolicy` (new) | `GetStoreOnboardingFeePolicy` (new) | `dsh_platform_store_onboarding_fee_policy` (`dsh-028`, new) |
| `upsertStoreOnboardingFeePolicy` | `upsertDshStoreOnboardingFeePolicy` | `PUT /dsh/operator/platform/store-onboarding-fee` | `handleUpsertStoreOnboardingFeePolicy` (new) | `UpsertStoreOnboardingFeePolicy` (new) | `dsh_platform_store_onboarding_fee_policy` |
| `fetchStoreOnboardingFeeReference` | `getDshStoreOnboardingFeeReference` | `GET /dsh/platform/store-onboarding-fee` | `handleGetStoreOnboardingFeeReference` (new) | `GetStoreOnboardingFeePolicy` (shared) | `dsh_platform_store_onboarding_fee_policy` |
| (public, no adapter change) | `listDshStores`/`getDshStore` | `GET /dsh/stores`, `GET /dsh/stores/{id}` | `HandleListStores`/`HandleGetStore` | `ListStores`/`GetStoreByID` (verified unchanged, already correct 6-gate enforcement) | `dsh_stores` |

## Migrations added

- `dsh-027_partner_bank_account.sql` — 9 columns + 1 CHECK constraint on `dsh_partners`.
- `dsh-028_store_onboarding_fee_policy.sql` — new singleton table + 4 CHECK constraints.

Both applied live via `pnpm run runtime:migrate` against `bthwani-postgres-runtime`; schema verified with direct
`psql \d` and `SELECT` queries (see [08_RUNTIME_VERIFICATION_MATRIX.md](08_RUNTIME_VERIFICATION_MATRIX.md)).

## Contract drift check

`api-binding-gate` (frontend adapter ↔ OpenAPI operationId) and `backend-api-binding-gate` (Go route ↔ OpenAPI
path) both PASS — no drift introduced.
