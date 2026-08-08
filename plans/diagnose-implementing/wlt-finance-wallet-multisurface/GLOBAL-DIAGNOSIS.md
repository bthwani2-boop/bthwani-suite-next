# Global Diagnosis — WLT Finance & Wallet

## Pinned evidence state

Diagnosis was performed against `bthwani2-boop/bthwani-suite-next@abbas` SHA `4445b3e8a9d25d0e19d4ee92c6f6a6f5f7e52133`. The current capability Product Truth is `WLT_MONEY_MOVEMENT_SETTLEMENT`; it requires one WLT-owned wallet/ledger truth, authoritative external evidence, atomic captain COD, verified official-wallet destinations, governed manual external settlement, reconciliation and finance-close gates across all five product surfaces.

## Root-cause findings

### F1 — Strong ledger kernel, incomplete accounting vocabulary

`services/wlt/backend/internal/ledger/kernel.go` is already the canonical double-entry writer, has operator-context isolation and rejects idempotency payload conflicts. This should be preserved. The root gap is that account classification recognizes a narrow asset/income set and defaults other non-wallet accounts to liability. The target Cash-In/settlement model needs explicit asset/liability/income/expense classifications and purpose-driven postings. Opening balances and corrections must enter through ledger transactions, never direct balance updates.

### F2 — Payment/provider edge is transport-centric and card-shaped

The payment session implementation has valuable concurrency claims and `provider_result_unknown` handling, but `AuthorizeSessionWithProvider`/`CaptureSessionWithProvider` still call `/financial/card/authorize` and `/financial/card/capture` through a generic POST transport. That shape cannot safely represent official-wallet Cash-In across customer and captain funding. The root correction is a domain rail/registry/router with server-owned financial purpose, while reusing the existing idempotency, unknown-result and authoritative-finalization mechanisms.

### F3 — Captain COD has two incompatible economic models

Current `wlt_cod_records` uses `pending_collection -> collected -> remitted`, including captain collectors. Canonical Product Truth now says the captain-funded path uses one captain wallet, order-specific atomic financial authorization/reserve, cancellation release once, and finalization debit once; it explicitly forbids a second remittance liability for the same order value. The legacy custody/remit path therefore cannot remain active for the same captain effect. Historical rows must remain readable and any genuinely different non-captain custody model must be separately proven before retention as active behavior.

### F4 — Payout destination and execution semantics are obsolete

Current payout governance accepts `bank`, `mobile_money` and `manual`, persists bank/IBAN-oriented fields and has provider submission behavior. The current product decision is official-wallet destinations only for partner/captain/field settlement, with destination verification/versioning and manual external execution performed outside BThwani after approval. `manual` is an execution method, not a destination type. This requires a forward-compatible schema/state migration, not a UI label change.

### F5 — Settlement primitives exist but the complete control chain is not yet proven

The settlement package already contains governed-source, evidence and idempotent-policy primitives plus isolation tests. Reuse them. The missing target is one coherent chain: payout hold -> immutable approval snapshot -> frozen batch/control totals/hash -> controlled XLSX artifact -> manual execution reference/evidence -> independent verification -> authoritative statement matching -> reconciliation exception or completion -> SettlementAuditPack -> DailyFinanceClose. Treasury external-account reconciliation must be a control projection, not a second ledger.

### F6 — Finance control panel reflects the legacy provider-payout model and is fragmented

`PayoutRequestsPanel.tsx` exposes provider-pending/processing states and actions such as “send to provider” and provider inquiry. The WLT route tree separately exposes ledger, payment-session and COD inspectors, while shared finance modules already exist under `services/wlt/frontend/shared/dsh`. The correct change is to consolidate these into one permission-aware Finance Control Center without moving financial authority into the browser.

### F7 — All five surfaces are financially relevant, but with different write rights

The Product Truth explicitly requires app-client, app-captain, app-partner, app-field and control-panel. Customer surfaces create intents/read results; captain additionally sees Cash-In, COD and payout eligibility; partner/field manage verified destinations and settlement requests; control-panel operates finance workflows under server-enforced SoD. Shared WLT/DSH adapters should be extended before adding surface-local logic.

## Competing hypotheses rejected

- “Only the control panel needs change” is false: provider/payment, COD, payout and settlement backend semantics are inconsistent with the target.
- “Only WLT needs change” is incomplete: DSH operational read/write facades and every required surface consume the financial state.
- “Reuse the provider payout flow and call it manual” is unsafe because destination identity, execution method, evidence and completion semantics are materially different.
- “Create a new finance ledger/subledger” is rejected because WLT already owns the canonical double-entry ledger.
- “Delete the simulator before production” is rejected; mock/sandbox remain test implementations, while production must fail closed without a real adapter.
- “Copy old finance UX wholesale” is rejected; existing inspectors and components are reusable only where they display canonical WLT state.

## Data and compatibility strategy

All PostgreSQL changes are forward migrations. Use expand -> compatible backfill -> switch writers/readers -> verify -> contract obsolete columns only after compatibility expiry. Never rewrite applied migration history. Preserve historical bank/provider-payout/COD records for audit even when active behavior moves to official-wallet/manual-settlement and funded-wallet COD semantics. Mixed-version mobile/backends must fail safely rather than reinterpret old enum values.

## Security and concurrency risks

Financial object authorization is server-side and operator-context scoped. Sensitive destination identifiers are encrypted at rest and masked by default. Approval/execution/reconciliation identities must be auditable. Duplicate external references, replayed webhooks, batch mutation, destination changes, cross-context reads, double COD reservation, concurrent payout requests, timeout/unknown provider results and restart/retry paths all require explicit tests. No browser-only permission gate is sufficient.

## Verification limitations of this package creation

GitHub Remote provided static repository evidence and write capability only. Shell, database, CI, runtime simulator, provider sandbox/production, E2E and visual capabilities were unavailable, so no test PASS is claimed. Each unit binds implementation acceptance to commands discovered in current manifests/scripts and states what those checks do not prove.
