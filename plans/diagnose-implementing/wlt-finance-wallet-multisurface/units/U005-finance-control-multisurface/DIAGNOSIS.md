# U005 Diagnosis — Final Finance Control and Multi-Surface Closure

This is the final package gate, not a UI-only cleanup. Product Truth requires the same canonical WLT facts on app-client, app-partner, app-captain, app-field and control-panel. Shared modules/screens already exist, but current-`BB` route binding, actor/operator-context isolation, canonical ledger/wallet source, offline/error/reconciliation states and visual behavior are not sufficient closure evidence until rerun on the final same candidate.

U005 executes only after U004/U006/U007/U008 and must prove the financial-authority model on every relevant surface:

- app-partner, app-captain and app-field show official-wallet destination data as masked read-only state only; there is no create/update/deactivate/replace/select destination control or hidden writable API binding;
- payout request UI exposes only `FULL_AVAILABLE` or `SPECIFIED`, with amount input only for `SPECIFIED`; destination/provider/beneficiary/wallet-reference selection is absent;
- `FULL_AVAILABLE` is server-resolved at mutation time rather than copied from a displayed balance;
- order, COD, earnings, commission, hold, settlement and balance effects appear from canonical backend events without actor-entered monetary values or local calculations;
- control-panel Finance shows server-calculated balances, liabilities, payout eligibility, commissions, settlement control totals, reconciliation variance, exceptions and legal next actions so the operator is not expected to calculate financial truth manually;
- destination provisioning/change exists only in the authorized Finance master-data workflow and visibly requires the governed reason/evidence/verification/approval lifecycle;
- any financial adjustment is a typed governed WLT transaction/event, never a generic amount/balance edit;
- read-only, loading, empty, blocked, forbidden, pending, reconciliation-required, error and offline states do not expose a fallback local financial truth.

No local authoritative finance calculation, hardcoded actor fallback, browser-supplied financial scope, beneficiary-controlled destination mutation, client-selected payout destination, manual balance/commission/payable override, obsolete automated cash-out UX or frontend-only separation-of-duties is acceptable. Closure requires executable authorization negatives plus same-SHA runtime and visual evidence across the affected surfaces.
