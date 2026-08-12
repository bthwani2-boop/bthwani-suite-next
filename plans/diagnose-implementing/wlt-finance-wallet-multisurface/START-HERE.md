# START HERE — WLT Finance / Wallet Multi-Surface

Repository: `bthwani2-boop/bthwani-suite-next`  
Branch: `BB`

This is the same existing package, corrected after the finance-only diagnosis. Do not create another package.

Read `GLOBAL-DIAGNOSIS.md`, then `COVERAGE.json`, `EXECUTION-ORDER.json`, then the selected unit files. Historical unit results are audit provenance only, not current-candidate closure evidence. Execute remaining work in this order: U004 -> U006 -> U007 -> U008 -> U005.

## Non-negotiable financial-authority rule

All authoritative monetary values are WLT/server-derived from trusted events, canonical state and versioned policy. Partner, captain and field surfaces may only read masked official-wallet destination state and request payout as `FULL_AVAILABLE` or `SPECIFIED`; they cannot create/update/deactivate/replace/select payout destination master data or submit provider/beneficiary/wallet identifiers. WLT resolves the current eligible amount and verified active destination transactionally. Destination provisioning/change is a Finance-controlled WLT master-data workflow requiring authorization, reason, evidence, versioning, verification and required approval. Finance staff must operate from server-calculated balances, commissions, eligibility, control totals and variances rather than manual arithmetic or generic financial override fields.

Only finance/wallet code, data, contracts, proven DSH consumers and required runtime wiring are authorized. Done means one newest exact SHA passes every required accounting, authorization-negative, security, runtime, reconciliation and multisurface check with zero beneficiary financial-master-data mutation, zero manual authoritative monetary override and no unresolved material finance exception.
