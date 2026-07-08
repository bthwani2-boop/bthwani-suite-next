# JOURNEY: PLATFORM_STORE_ONBOARDING_FEE_POLICY

Scope: `store_onboarding_fee_policy` in control-panel platform config (enabled, amount, currency, appliesTo,
chargeTiming, actorCharged=partner, effectiveFrom, notes), surfaced read-only to app-field/app-partner as
appropriate, never to app-client, with WLT retaining ledger/settlement truth (DSH does not create ledger).

- [x] discovery
- [x] affected surfaces inventory
- [x] backend/API/database proof
- [x] frontend binding proof
- [x] WLT boundary proof
- [x] runtime proof
- [x] tests/guards proof
- [x] final closure ledger

## Boundary rules (must hold at closure)
- control-panel platform owns policy definition (DSH-side config, not WLT).
- WLT owns financial truth once ledger/settlement/payment actually occurs — DSH must not create a ledger entry.
- app-field shows read-only reference value only if the policy design requires it during onboarding.
- app-partner sees fee post-approval / per policy readiness.
- app-client never sees this policy or fee.
- Missing-but-required policy must produce a readiness/blocking reason, not silent bypass.

## Required evidence before any [x]
1. Policy schema in shared/platform types + control-panel UI binding.
2. OpenAPI operation, generated client, DSH backend handler/repository/migration.
3. app-field / app-partner / app-client read-surface proofs (positive for field/partner, negative for client).
4. Guard proof: `guard:wlt-financial-boundary` passes with no DSH-side ledger writes introduced.

## Closure evidence (2026-07-08)

### 1. Backend/API/database
- `services/dsh/database/migrations/dsh-028_store_onboarding_fee_policy.sql`: singleton table
  `dsh_platform_store_onboarding_fee_policy` (`id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1)`), CHECK
  constraints on `applies_to`/`charge_timing`/`actor_charged='partner'`, seeded with a default row.
- `services/dsh/backend/internal/platformpolicies/platformpolicies.go`: `StoreOnboardingFeePolicy` +
  `StoreOnboardingFeePolicyInput` + `GetStoreOnboardingFeePolicy`/`UpsertStoreOnboardingFeePolicy` +
  `deriveFeePolicyReadiness()` — sets `isConfigured=false` and a `blockedReason` when the policy is `enabled`
  but `amount<=0` or `currency=""` (the readiness/blocking-reason requirement, satisfied at the definition
  surface, not silently bypassed).
- `services/dsh/backend/internal/http/platformpolicies.go`: 3 new handlers.
- `services/dsh/backend/internal/http/server.go`: 3 new routes registered:
  - `GET/PUT /dsh/operator/platform/store-onboarding-fee` (operator only — policy definition/edit)
  - `GET /dsh/platform/store-onboarding-fee` (field/partner/operator — read-only reference, no mutation)
- `go build ./...` clean; `go test ./... -count=1` → all packages `ok`, including the new
  `internal/platformpolicies` and `internal/http` coverage.

### 2. Frontend binding
- `services/dsh/frontend/shared/platform-policies/{platform-policies.types.ts,platform-policies.api.ts,use-platform-policies-controller.tsx}`:
  `DshStoreOnboardingFeePolicy(Input)` types, `fetchStoreOnboardingFeePolicy`/`upsertStoreOnboardingFeePolicy`/
  `fetchStoreOnboardingFeeReference` adapters, `useStoreOnboardingFeePolicyController` (operator CRUD) +
  `useStoreOnboardingFeeReferenceController` (read-only) — same module that already hosts zones/SLA policy
  code (the real, backend-wired platform-policies module, not the mock `DshPlatformWorkspaces.tsx` scaffolds
  found alongside it in the same directory, which use local-only fake `useState` data — deliberately not
  extended, to avoid presenting a fake control as real policy management).
- `services/dsh/frontend/control-panel/platform/StoreOnboardingFeePolicySection.tsx` (new) wired into
  `PlatformPoliciesScreen.tsx`: enabled/amount/currency/appliesTo/chargeTiming/notes form + save, with a
  `Badge` surfacing `blockedReason` when the policy is enabled but incomplete.
- `services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx`: read-only "رسوم انضمام المتجر
  (مرجع)" card, shown only when the policy is enabled — no edit affordance.
- `services/dsh/frontend/app-partner/account/{OperationScreens.tsx,PartnerOnboardingActionPanel.tsx}`:
  `OnboardingActionScreen` self-fetches the reference (own `useIdentitySession`) and passes it to
  `DshPartnerOnboardingActionPanel` as an optional `feePolicy` prop, rendered as a read-only info line — this
  is the partner's own onboarding-action screen ("بدء الاستقبال"), matching "post-approval / per policy
  readiness" placement without touching the much larger, higher-risk `PartnerHubScreen.tsx`.
- `services/dsh/frontend/app-client`: `grep -i "store_onboarding_fee|StoreOnboardingFee|store-onboarding-fee"`
  → 0 matches (negative proof).

### 3. WLT boundary
- DSH backend never writes to any WLT table or calls the WLT client for this feature — `GetStoreOnboardingFeePolicy`/
  `UpsertStoreOnboardingFeePolicy` only touch `dsh_platform_store_onboarding_fee_policy`.
- `pnpm run guard:wlt-financial-boundary` → **PASS**.
- Caught and fixed a real self-inflicted defect during this journey: `services/dsh/tests/catalog-contract.test.mjs`
  has a repo-wide boundary assertion, `assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i)`,
  over the **entire** `dsh.openapi.yaml` text — my first draft of the new operation summary/comment used the
  phrase "never a WLT ledger entry", which literally matched the forbidden pattern and failed this test. Reworded
  to "never a WLT financial record" / "DSH never records WLT financial truth directly" (same meaning, no
  forbidden phrase). Re-ran the full DSH test suite after the fix: back to the pre-existing baseline (216/217;
  the 1 failure is the unrelated missing `PublishedCatalogScreen.tsx`, logged in
  [[JOURNEY-FIELD-ONBOARDING-BANK-ACCOUNT]]'s closure evidence, predates this session).

### 4. Runtime proof (live, not assumed)
- `pnpm run runtime:migrate` → `dsh-028_store_onboarding_fee_policy.sql: PASS`.
- `docker exec bthwani-postgres-runtime psql ... \d dsh_platform_store_onboarding_fee_policy` confirms the live
  schema (all columns + 4 CHECK constraints); `SELECT * FROM ...` confirms the seeded default row.
- `docker compose ... build dsh-api` (rebuilt from current source) + `... up -d --force-recreate dsh-api` +
  `curl http://localhost:58080/dsh/health` → healthy.
- `curl http://localhost:58080/dsh/platform/store-onboarding-fee` (no token) →
  `401 {"code":"UNAUTHENTICATED",...}` — proves the broad-read route is live and registered, not missing.
- `curl http://localhost:58080/dsh/operator/platform/store-onboarding-fee` (no token) → same `401` — proves the
  operator route is live and registered.

### 5. Tests/guards
- `pnpm --filter "@bthwani/dsh" typecheck` → same 9 pre-existing errors in `app-client/shared/ui/index.ts` and
  `app-partner/index.ts` (unrelated, predate this session); zero errors in any file this journey touched.
- `pnpm --filter "@bthwani/dsh" test` → 216/217 (see WLT-boundary section above for the ledger-entry-phrase
  fix and the unrelated pre-existing failure).
- `pnpm run guard:wlt-financial-boundary` / `guard:api-binding` / `guard:backend-api-binding` /
  `guard:no-broken-imports` / `guard:fullstack-boundary` → all **PASS**.

## Final closure ledger
JOURNEY (PLATFORM_STORE_ONBOARDING_FEE_POLICY): **CLOSED**. Product files: 1 new migration, 2 backend Go files
(platformpolicies.go ×2 + server.go route registration), 1 new control-panel component + 1 screen wired, 3
shared/platform-policies files extended, 1 app-field screen extended, 2 app-partner files extended. Contract:
`dsh.openapi.yaml` (+3 operations, +3 schemas) and its generated client regenerated. No WLT backend or WLT
frontend files touched — DSH owns the policy definition exclusively, as required.
