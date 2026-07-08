# Journey 05 — PLATFORM_STORE_ONBOARDING_FEE_POLICY

Full evidence: [tools/checklist/JOURNEY-PLATFORM-STORE-ONBOARDING-FEE.md](../../../../tools/checklist/JOURNEY-PLATFORM-STORE-ONBOARDING-FEE.md)

## Summary

`store_onboarding_fee_policy` — a platform-wide singleton (enabled, amount, currency, appliesTo, chargeTiming,
actorCharged=partner, effectiveFrom, notes) — implemented end-to-end. DSH owns the policy **definition** only;
never creates a WLT ledger/financial record.

## Chain

`dsh-028` migration (singleton table, `id SMALLINT CHECK (id=1)`) → `platformpolicies.go`
(`GetStoreOnboardingFeePolicy`/`UpsertStoreOnboardingFeePolicy` + `deriveFeePolicyReadiness()` for the
enabled-but-incomplete blocking-reason requirement) → 3 routes (`GET/PUT /dsh/operator/platform/store-onboarding-fee`,
`GET /dsh/platform/store-onboarding-fee` read-only) → `StoreOnboardingFeePolicySection.tsx` (control-panel edit
UI, wired into `PlatformPoliciesScreen.tsx`) → read-only reference in app-field onboarding + app-partner's
onboarding-action screen → `dsh.openapi.yaml` (+3 operations, +3 schemas) + regenerated client.

## Closure status

CLOSED. Live DB proof (migration applied, schema+row confirmed via `psql`), live container rebuild, both new
routes confirmed live (401, not 404), all relevant guards PASS, app-client negative proof (0 grep matches).

One self-inflicted defect caught and fixed during this journey: an early OpenAPI comment draft used "WLT ledger
entry", which literally matched the repo's `catalog-contract.test.mjs` boundary safeguard
(`assert.doesNotMatch(contract, /\bledger entry\b/i)`); reworded, verified.
