# Global Diagnosis — WLT Finance / Wallet Multi-Surface

## Candidate
Re-diagnosed against `BB@4e9f92436046fa1cded26e71250d5bd2db9f598f`. The old package evidence was pinned to `abbas@4445b3e8...`; it is stale for the requested branch. Historical U001-U003 results remain provenance only, not current closure evidence. A concurrent DSH checkout change on this candidate now consumes canonical minor-unit snapshots; it is preserved and treated as relevant input to pricing/PaymentAllocation verification, not as proof that WLT pricing authority is closed.

## Authority and boundary
Canonical authority is `wlt-money-movement-settlement.product-truth.json`, `representative-wallets.product-truth.json`, `settlements-commissions.product-truth.json`, then current WLT/DSH contracts, code, migrations and runtime wiring. In scope is only proven finance/wallet ownership, money movement, accounting, financial readback, financial policy/evidence and the runtime/integration wiring required to prove it. Unrelated catalog/HR/maps/media/marketing/identity feature work is excluded unless a direct finance dependency is proven.

## Confirmed root-cause gaps
1. Package baseline/evidence was stale and U004/U005 were never executed. U003 also recorded a required failed check while declaring PASS, so prior closure posture was not fail-closed.
2. Canonical double-entry writes (`wlt_ledger_transactions/lines/accounts`) coexist with legacy `wlt_ledger_entries` and direct `wlt_wallets` balance mutation. Current read/control paths can therefore diverge from canonical accounting.
3. `settlement/daily_close.go` totals legacy ledger entries and computes unverified manual evidence but proceeds instead of blocking. Close is neither canonical nor fail-closed.
4. `payout/canonical_payout_destination.go` still defaults to bank and permits bank/mobile-money/manual semantics, conflicting with verified official-wallet destination truth. Manual is execution method, not beneficiary destination type.
5. Historical U002 evidence found the WLT API runtime wiring a nil wallet DecisionService, causing mutation kill-switch failure before provider flows. This is a package-level runtime blocker, not an acceptable environment waiver.
6. `penalty/penalty.go` posts canonical ledger transactions and also directly mutates `wlt_wallets`; its HTTP boundary accepts operator-context header input. Penalty was previously unassigned in the package.
7. `commercial/onboarding_fee.go` uses `float64`, a singleton `id=1` policy without visible operator-context scoping, and lacks durable audit. Subscription lifecycle/payment/compensation is financially material and was omitted.
8. `promotionfunding` accepts operatorContextId through payload/header and records monetary funding transitions without proving one canonical ledger effect. `pricing/quote.go` accepts price/fee monetary inputs; each must be governed by trusted source ownership, exact minor units, bounds and PaymentAllocation binding.
9. `dispatchfinancialeligibility` is a material WLT financial decision based on captain wallet/policy; it must consume the same canonical wallet truth and DSH must honor context/policy/TTL without recalculating finance.
10. Product Truth requires current-candidate readback on app-client, app-partner, app-captain, app-field and control-panel. Static module/screen presence is not runtime, authorization, offline or visual evidence.

## Corrected execution ownership
- U004: official-wallet destination, payout holds/approval, immutable manual settlement, evidence, reconciliation and canonical daily close.
- U006: canonical ledger/wallet convergence, direct writer retirement, penalty and canonical representative ledger/wallet read model.
- U007: commercial/subscription/onboarding fee, promotion funding and pricing/PaymentAllocation controls.
- U008: runtime financial DecisionService/kill-switch, provider-mode/unknown-result readiness, dispatch financial eligibility and DSH retry/outbox integration.
- U005: final cross-surface finance control/readback and same-SHA end-to-end closure after U004/U006/U007/U008.

## Fail-closed rule
Remain OPEN until one latest candidate proves: single-source accounting, zero unauthorized direct balance writers, trusted operator-context isolation, idempotent/correlation-bound mutations, official-wallet/manual-settlement evidence, ambiguous-result reconciliation, blocking DailyFinanceClose, exact commercial/promotion/pricing money policy, current contracts/generated clients, executable governed runtime financial mutations, dispatch eligibility freshness, DSH retry exactly-once behavior, cross-actor/context negatives, and all five required surfaces. Historical PASS, cached tests, partial pass or environment excuses do not close finance.
