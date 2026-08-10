# Diagnosis — U007 partner-finance-wlt-readback-cod

## Inclusion reason

Finance is visible inside the Partner hub and the current WLT bridge composes Partner COD custody, actor wallet, commissions and payout destination. This is therefore not a presentation-only concern: WLT is the sole authoritative owner for wallet, ledger, settlement, commission, payout and COD financial custody/reconciliation, while DSH may expose only the governed application-facing proxy/reference boundary. Control-panel WLT finance is included only where the applicable financial Product Truth grants operator lifecycle actions for Partner records.

## Current behavior and observable defect

`WltDshPartnerBridge` renders `PartnerCodCustodyPanel`, `ActorWalletPanel`, `RepresentativeCommissionPanel` and `PayoutDestinationPanel`. `wlt-partner-cod.api.ts` reads Partner COD records and performs a real remit mutation through `/dsh/partner/me/finance/cod-records/{id}/remit`, carrying correlation and idempotency. These are positive structural signals, but a successful panel or HTTP response cannot prove the final ledger effect, legal financial state, reconciliation case, audit attribution, payout-destination verification or actor isolation. The key defect class is any place where DSH/frontend derives or declares authoritative financial success instead of consuming WLT-owned result/readback.

## Root cause and target architecture

The target path is Partner intent/read → governed DSH application boundary → authenticated WLT operation → WLT service-owned PostgreSQL/ledger/audit/reconciliation → bounded canonical readback to Partner/operator. DSH supplies operational identities/evidence and may proxy allowed references, but cannot calculate authoritative settlement/commission amounts, write WLT tables, or convert an unknown financial outcome into local success. Full payout identifiers remain masked and protected by WLT/security policy.

## Exact affected paths and symbols

`services/wlt/frontend/shared/dsh/presentation/WltDshPartnerBridge.tsx`, `services/wlt/frontend/shared/dsh/actor-wallet`, `commissions`, `payouts`, `wlt-cod`, `services/wlt/backend`, `services/wlt/database`, DSH finance/WLT-link proxy paths and `apps/control-panel/runtime/src/app/(shell)/wlt/finance`. Key symbols include `WltDshPartnerBridge`, `PartnerCodCustodyPanel`, `fetchPartnerCodRecords`, `remitPartnerCodRecord`, `ActorWalletPanel`, `RepresentativeCommissionPanel` and `PayoutDestinationPanel`.

## Risks and evidence

Verify actor/Store isolation, duplicate remit/replay, illegal financial states, unknown/reconcilable outcomes, balanced ledger effects, immutable audit evidence, payout-destination masking/versioning, refresh/restart and operator readback. Do not broaden Captain/Field finance except shared code proven affected. Evidence: `EV-003`, `EV-005`, `EV-022`, `EV-023`, `EV-024`.
