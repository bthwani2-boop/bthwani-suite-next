# Unit diagnosis — U007 / wlt-finance-settlement-reconciliation

## Inclusion reason

COV-018 is the WLT Finance section; COV-027 is its DSH presentation bridge; COV-034 and COV-035 bind WLT backend/contracts/database and shared DSH presentation; COV-040 binds current money-movement and settlement/commission Product Truth; COV-038 brings only the payout-reference dependency from Partner onboarding; COV-042 includes payment-session/COD/ledger inspector routes; COV-043 includes direct Client/Partner/Captain/Field financial readbacks. Finance is the most protected boundary in this package and must remain WLT-owned.

## Current behavior and observable defect

The `/wlt/finance` route imports DSH Control Panel finance presentation, while canonical financial behavior lives in WLT and WLT shared DSH modules. The finance UI spans payment sessions, internal wallets, COD, refunds, commissions, payout requests, settlement batches, reconciliation and ledger inspection. Product Truth says the current capability still contains legacy/partial semantics and requires one evidence-backed financial lifecycle. A local UI fix, DSH amount calculation, bare mark-paid operation or retry of an ambiguous provider result can create duplicate money movement or a parallel ledger even if the screen appears correct.

## Root cause

The structural risk is confusing a DSH-facing facade/presentation with financial ownership. DSH supplies operational evidence and authorized references; it must not calculate authoritative monetary amounts or write WLT tables. External official-wallet/provider evidence also cannot replace the internal double-entry ledger. Completion requires immutable approved snapshots/batches, evidence and reconciliation, not an operator label.

## Correct truth owner and target architecture

WLT is the sole writer of wallet balances, ledger transactions, payments, refunds, COD financial effects, commissions, payout destinations, payouts, settlements, reconciliation and financial close. DSH owns source operational evidence and may expose governed references/projections. Control Panel submits authorized intent and renders WLT canonical readback. Partner/Captain/Field/Client see only actor-scoped financial state relevant to them. Unknown external outcomes block new money movement until reconciled.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/wlt/finance` and hidden inspectors, `services/dsh/frontend/control-panel/finance`, `services/wlt/frontend/shared/dsh`, WLT backend/contracts/database/provider/ledger/payment/COD/settlement/reconciliation paths, DSH finance facade/source-evidence paths, Partner onboarding payout references, and direct Client/Partner/Captain/Field financial consumers.

## Risks, compatibility, migration, and removal impact

Financial changes are ledger-, idempotency-, concurrency-, privacy- and audit-sensitive. Never direct-edit balances or historical financial evidence. Payout destination identifiers require masking/encryption and versioned verification. Maker-checker/separation of duties cannot be bypassed for speed. Remove duplicate DSH/frontend financial calculations only after WLT produces canonical replacements. Final closure requires runtime simulator/reconciliation evidence and independent finance/security review where Product Truth demands it.

## Evidence references

EV-016, EV-020, EV-021, EV-024.
