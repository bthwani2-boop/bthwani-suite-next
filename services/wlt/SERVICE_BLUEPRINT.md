# WLT Service Blueprint

## Status

WLT is an active financial platform service. Its local and staging provider-lab runtime is implemented, while production provider mutations and the final end-to-end journey gate remain blocked until fresh runtime evidence and production-provider approval are present.

## Runtime State

The executable source of truth is `services/wlt/service.manifest.ts`. This blueprint must remain aligned with it.

- `runtimeState`: `WLT_000_FOUNDATION_EVIDENCE_REQUIRED_WLT_001_PAYMENT_SESSION_REFERENCE_ACTIVE`
- `backendRuntimeReady`: `true`
- `databaseReady`: `true`
- `generatedClientReady`: `true`
- `frontendReady`: `true`
- `frontendDshBoundaryReady`: `true`
- `referenceRuntimeVerified`: `true`
- `journeyRuntimeVerified`: `false`
- `paymentSessionReferenceReady`: `true`
- `localSimulatorMutationsReady`: `true`
- `stagingProviderLabMutationsReady`: `true`
- `productionMutationsReady`: `false`

`journeyRuntimeVerified=false` and `productionMutationsReady=false` are hard blockers. No surface may translate the readiness flags above into a claim that production financial journeys are verified.

## Ownership

WLT owns the financial truth for:

- wallets
- payment sessions
- refunds
- settlements
- payout decisions
- commissions
- COD financial state
- ledger
- reconciliation
- finance reports
- audit references

DSH and application shells may store or display WLT references and statuses only. They must not calculate or mutate financial truth.

## DSH Boundary

DSH may own operational state and durable handoff/outbox records, including:

- WLT reference identifiers
- payment-session references
- payment/refund/settlement status references
- durable delivery-completed and cancellation handoff events
- correlation and reconciliation references

DSH must not own wallet balances, payment confirmation, refund finalization, settlement posting, payout decisions, commission finalization, or ledger mutation.

## Activation Rule

Local and staging-provider-lab mutations are allowed only under the runtime guards declared by the service manifest. Production provider mutations remain disabled unless `WLT_ALLOW_PRODUCTION_PROVIDER=true` and the required journey evidence is refreshed on the same commit SHA.

No `IMPLEMENTATION_PASS` or production-readiness claim is permitted while `journeyRuntimeVerified=false` or `productionMutationsReady=false`.
