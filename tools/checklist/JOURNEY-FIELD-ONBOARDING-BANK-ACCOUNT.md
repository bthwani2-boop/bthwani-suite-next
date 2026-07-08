# JOURNEY: FIELD_ONBOARDING_BANK_ACCOUNT_FULLSTACK

Scope: add "معلومات الحساب البنكي للشريك" section to app-field onboarding, end-to-end
(shared types → validation → readiness/missing-count → backend request/response → migration/storage →
control-panel masking) without creating a WLT mutation at onboarding time.

- [x] discovery
- [x] affected surfaces inventory
- [x] backend/API/database proof
- [x] frontend binding proof
- [x] WLT boundary proof
- [x] runtime proof
- [x] tests/guards proof
- [x] final closure ledger

## Fields
beneficiaryName, bankName, bankBranch, accountNumber, iban, payoutMobileNumber (optional),
settlementPreference, bankAccountHolderMatchesOwner (bool), bankNotes.

## Boundary rules (must hold at closure)
- Data is Partner-level metadata/readiness, stored via DSH — not a WLT mutation.
- app-client must never see bank fields (grep proof of no import/exposure).
- app-partner cannot edit after submission unless a dedicated authorized journey exists (must be proven absent
  or present, not assumed).
- control-panel must mask sensitive fields on display (accountNumber/iban masking proof).

## Required evidence before any [x]
1. Shared type definition location + validation logic.
2. Missing-count/readiness wiring (screen shows correct blocking state).
3. OpenAPI operation + generated client diff, backend handler + repository + migration.
4. Control-panel masking implementation (component/util proof).
5. app-client negative proof (search shows no bank-field reference).
6. Tests/guards run output (`typecheck`, `test`, `go test`, relevant guard scripts).

## Closure evidence (2026-07-08)

### 1. Shared type definition + validation
- `services/dsh/frontend/shared/field-onboarding/field-onboarding.types.ts`: 9 bank fields added to
  `FieldPartnerDraftForm`; `getBankAccountMissingCount()` added; `getFieldRequiredMissingItems()` extended
  (blocks submit until beneficiaryName/bankName/accountNumber/settlementPreference are filled, plus
  payoutMobileNumber when settlementPreference=mobile_wallet).
- `getAgreementReviewMissingCount()` rolls up bank-account missing count into the final-review badge.

### 2. Missing-count/readiness wiring
- `services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx`: new wizard group
  `bank_account` inserted between `evidence` and `agreement_review`, with its own missing-count badge and
  timeline node — matches all other groups' pattern exactly. `canSubmit` gate already used
  `getFieldRequiredMissingItems`, so bank completeness now blocks submission automatically.

### 3. Backend/API/database chain (pre-existing in this branch, verified live)
- `services/dsh/backend/internal/partner/model.go`: `Partner` + `UpdatePartnerInput` carry all 9 bank fields.
- `services/dsh/backend/internal/partner/repository.go`: `CreatePartner`/`GetPartner`/`UpdatePartner` SQL+scan
  updated.
- `services/dsh/database/migrations/dsh-027_partner_bank_account.sql`: adds 9 columns + a
  `settlement_preference` CHECK constraint on `dsh_partners`.
- `services/dsh/frontend/shared/partner/partner.types.ts`: `DshPartner` + `DshUpdatePartnerRequest` extended.
- `services/dsh/frontend/shared/partner/partner.api.ts`: `fieldUpdatePartner` (existed but was unexported/dead
  code) is now exported and used — it is the PATCH `/dsh/field/partners/{partnerId}` call, which
  `HandleFieldUpdatePartner` in `handler.go` already decoded generically into `UpdatePartnerInput` (no backend
  handler change required).
- `services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx`:
  `buildBankAccountInput()` + `fieldUpdatePartner()` call added to `submitDraft()`, before the store-draft PATCH;
  `partnerVersion` updated from the response for optimistic-concurrency correctness.
- OpenAPI: `services/dsh/contracts/dsh.openapi.yaml` — `DshPartner` and `DshUpdatePartnerRequest` schemas
  extended with the same 9 fields (enum-constrained `settlementPreference`).
- Generated client: `pnpm run openapi:generate:dsh` re-run — `services/dsh/clients/generated/dsh-api.ts` diff
  confirmed (+20 lines, both `beneficiaryName` and `bankAccountHolderMatchesOwner` present in both the
  `DshPartner` and `DshUpdatePartnerRequest` generated types).

### 4. Control-panel masking
- `services/dsh/frontend/shared/partner/partner.view-model.ts`: `DshPartnerBankAccountViewModel` +
  `buildBankAccountViewModel()` + `maskBankIdentifier()` (reveals only the last 4 characters of
  accountNumber/iban; full mask under 4 chars). Wired into `buildPartnerDetailViewModel()`.
- `services/dsh/frontend/control-panel/partners/PartnerDetailScreen.tsx`: new "بيانات الحساب البنكي" card in
  the overview tab, rendered only when `vm.bankAccount.hasBankAccount`, with an explicit note that the data is
  descriptive-only and creates no WLT financial movement.

### 5. app-client / app-partner negative proof
- `grep -rin "beneficiaryName|bankAccountHolderMatchesOwner|payoutMobileNumber|settlementPreference|accountNumber|\biban\b" services/dsh/frontend/app-client` → 0 matches.
- Same grep against `services/dsh/frontend/app-partner` → 0 matches (confirms app-partner has no
  post-submission edit path onto bank fields; boundary holds without a new guard).

### 6. Tests/guards run output
- `cd services/dsh/backend && go build ./...` → clean, no output.
- `go test ./... ` → all packages `ok` (cached) + forced fresh run
  `go test ./internal/partner/... ./internal/http/... -count=1` → `ok` both packages.
- **Live DB proof**: `pnpm run runtime:up` (postgres+identity+dsh containers), `pnpm run runtime:migrate` →
  `dsh-027_partner_bank_account.sql: PASS`. `docker exec bthwani-postgres-runtime psql ... \d dsh_partners`
  confirms all 9 columns + the settlement_preference CHECK constraint exist on the live table.
- **Live runtime proof**: `docker compose ... build dsh-api` (no-cache) rebuilt the image from the current
  source (bank fields included), `... up -d --force-recreate dsh-api` recreated the container, and
  `curl http://localhost:58080/dsh/health` → `{"service":"dsh","status":"healthy"}`.
- `DSH_REQUIRE_DB_TESTS=true DATABASE_URL=postgres://dsh_runtime:...@localhost:55432/dsh_runtime go test ./internal/partner/... -run TestPartnerLifecycleDBIntegration -v` → `PASS` against the live migrated database.
- `pnpm --filter "@bthwani/dsh" typecheck` → 9 pre-existing errors, all in `app-client/shared/ui/index.ts` and
  `app-partner/index.ts` (unrelated files, not touched by this journey, confirmed via `git log` predate this
  session). Zero errors in any file touched by this journey.
- `pnpm --filter "@bthwani/dsh" test` → 216/217 pass; the 1 failure
  (`tests/catalog-contract.test.mjs` → missing `app-client/catalog/PublishedCatalogScreen.tsx`) is a
  pre-existing gap from commit `c8625cb` (before this session), unrelated to bank-account/products work.
- `pnpm run guard:fullstack-boundary` → PASS
- `pnpm run guard:wlt-financial-boundary` → PASS
- `pnpm run guard:no-broken-imports` → PASS
- `pnpm run guard:api-binding` → PASS
- `pnpm run guard:backend-api-binding` → PASS

### Not performed (honest gap)
- A fully authenticated end-to-end `curl` PATCH round-trip against the running dsh-api container was not
  executed: `app-field`'s `devBypassLogin()` fabricates a client-side-only fake session token that the DSH
  backend's `internal/auth/client.go` cannot validate (it calls identity-api's real `/auth/session`), so a true
  round-trip needs a real identity-api login flow, which was judged out of proportion for this fix. DB schema
  truth, backend code truth (build+test+live container rebuild), and OpenAPI/generated-client truth are all
  verified live instead.

### Products-section visibility fix (companion fix, same session)
Reported alongside bank account: "قسم المنتجات في ملف الانضمام غير ظاهرة". Root cause: `onOpenProducts` was
accepted as a prop by `DshFieldOnboardingScreen` and `DshFieldPartnerProgressScreen` but never rendered
anywhere — the `products-upload` route and `DshFieldPartnerProductsScreen` existed and were wired in
`DshFieldRouteRenderer.tsx`, but nothing in the UI could ever navigate to them. Fixed by adding:
1. A persistent "قسم المنتجات" card inside `DshFieldOnboardingScreen` (visible for the whole onboarding flow,
   shows a blocked-reason before the partner draft exists, an actionable button once it does).
2. A reinforcing CTA on the post-submission success screen.
3. A "إدارة منتجات المتجر" button in `DshFieldPartnerProgressScreen` (post-submission read-only screen).
