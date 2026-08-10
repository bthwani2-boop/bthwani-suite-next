# WLT Finance & Wallet Multi-Surface Execution Package

## Mission

Prepare implementation for **finance and wallet concerns only** across BThwani. The package is pinned to `abbas` at `4445b3e8a9d25d0e19d4ee92c6f6a6f5f7e52133` and is a disposable derived-support artifact, not product/runtime/governance truth.

## Authoritative target

Read in this order before executing any unit:

1. `governance/authority/authority-precedence.json`
2. `governance/GOVERNANCE.md`
3. `governance/product/PRD.md`
4. `governance/policies/engineering.md`
5. `governance/policies/security.md`
6. `governance/policies/delivery.md`
7. `governance/product/contracts/wlt-money-movement-settlement.product-truth.json`
8. current WLT/DSH contracts, migrations, runtime code and tests on the execution SHA
9. `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md` as detailed design support only

## Scope

Included only when financially material:

- WLT wallet and double-entry ledger
- payment allocation and internal balance projections
- customer/captain Cash-In and provider evidence
- captain COD financial eligibility/reserve/finalization
- partner/captain/field earnings and commissions
- official-wallet payout destinations and verification
- payout holds, eligibility, approvals and immutable snapshots
- manual external official-wallet settlement
- settlement batches, XLSX execution artifacts, evidence and audit
- reconciliation, treasury controls and daily finance close
- refunds and source-aware reversal
- finance permissions, operator isolation and separation of duties
- control-panel finance workspace
- app-client/app-partner/app-captain/app-field financial screens and readback
- DSH operational facade only where it carries WLT-owned financial state

Explicitly excluded unless a proven finance dependency appears: catalogs, marketing, generic content, maps, unrelated HR, unrelated login UX, media except settlement evidence, and non-financial operational features.

## Capability preflight

Available through this preparation session: repository read/write, live GitHub branch/file inspection, commit construction and fast-forward ref update.

Unavailable here: shell, Node execution, package validator execution, database runtime, CI execution, production provider access, E2E device/browser execution and visual testing.

Therefore this package may be marked diagnosis COMPLETE / plan READY from remote evidence, but no implementation or verification PASS is claimed.

## Execution order

1. `U001-financial-core`
2. `U002-cashin-provider-refund`
3. `U003-captain-cod-earnings`
4. `U004-manual-settlement-reconciliation`
5. `U005-finance-control-multisurface`

Before each logical write batch, resolve `abbas` again. If the branch moved, compare the old base to the new head and reconcile affected financial owners/contracts/migrations before writing. Never overwrite newer work or force-update the branch.

## Non-negotiable boundaries

- WLT remains the sole internal financial truth writer.
- No frontend, spreadsheet, provider callback or DSH operational surface becomes a second ledger.
- No ambiguous external money movement is retried through another provider before authoritative resolution.
- No production fallback to mock/sandbox.
- No payout completion without the required evidence and reconciliation chain.
- No captain COD implementation may double-charge the same order through both funded-wallet and legacy custody/remit effects.
- No unrelated repository cleanup is bundled into this execution.
