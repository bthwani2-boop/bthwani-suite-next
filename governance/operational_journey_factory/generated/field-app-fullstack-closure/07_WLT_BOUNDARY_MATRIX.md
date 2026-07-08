# WLT Boundary Matrix

Rule: WLT is the sole owner of financial truth (ledger/settlement/payment/commission). DSH may hold financial
**references** (read-only reflections) and **policy definitions**, but must never write a ledger entry.

| Feature | DSH owns | WLT owns | Enforcement |
|---|---|---|---|
| Bank account metadata | Partner-level readiness/metadata (`dsh_partners` columns) | N/A — not a payout instruction, purely declarative until control-panel/finance ops act on it manually outside this system | No WLT client call anywhere in the bank-account chain (grep-verified: zero `wlt` imports in `field-onboarding`/`partner` bank-field code paths) |
| Store onboarding fee policy | Policy **definition** (`dsh_platform_store_onboarding_fee_policy`: enabled/amount/currency/timing) | Financial **truth** once a settlement/payment for this fee is actually recorded (not implemented in this engagement — explicitly out of scope; this journey only defines the policy) | No DSH code path in `platformpolicies.go` calls the WLT client or writes any WLT-adjacent table |
| Field commission reference | N/A | `wlt_reference` table + `GET /wlt/references/field-commission` (WLT-owned route, called **directly** by app-field per documented exception) | Verified live in journey 04; `guard:wlt-financial-boundary` PASS |
| Control-panel finance dashboard | DSH proxy routes only (`/dsh/control-panel/finance/*`) | Settlements/ledger/refunds/COD/commissions (all read via DSH proxy, never direct) | Verified live in journey 04 (401 UNAUTHENTICATED, not 404 — proxy route registered); `guard:wlt-financial-boundary` PASS |

## Guard evidence

`pnpm run guard:wlt-financial-boundary` — **PASS**, re-run after every backend/contract change in this
engagement (bank account, platform fee, and the TransitionStatus fix).

## Contract-text self-check (see gap ledger #7)

`services/dsh/tests/catalog-contract.test.mjs` enforces `assert.doesNotMatch(dsh.openapi.yaml, /\bledger entry\b|\brefund finalization\b/i)`
across the **entire** contract file — a textual guard against DSH's own API documentation ever implying it
creates ledger entries. This engagement triggered and then fixed one violation of this rule (wording only, no
functional violation) during the platform-fee-policy journey.
