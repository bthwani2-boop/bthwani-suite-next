# WLT Service Blueprint

## Status

WLT is an active financial platform service in this repository, but it is currently foundation-only.

## Runtime State

- runtimeState: CONTRACT_ONLY
- backendRuntimeReady: false
- databaseReady: false
- generatedClientReady: false
- frontendReady: false
- sliceRuntimeVerified: false

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

## Activation Rule

No WLT runtime, database, generated client, or frontend surface may be marked ready until a dedicated WLT slice passes contract, backend, database, Docker, and evidence gates.
