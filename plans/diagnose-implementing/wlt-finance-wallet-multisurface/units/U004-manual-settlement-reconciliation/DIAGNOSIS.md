# U004 Diagnosis — Official-Wallet Payout, Manual Settlement, Reconciliation and Close

Current `BB` already has useful payout/evidence/batch/close primitives, but key semantics remain wrong and financially unsafe until proven removed end-to-end. `canonical_payout_destination.go` still carries legacy bank/mobile-money/manual destination semantics, while the canonical target is a verified official-wallet destination and `manual` is only the external execution method. More importantly, any partner/captain/field self-service path that creates, updates, deactivates, replaces or selects payout destination master data is forbidden. Beneficiary applications may only read the masked current destination status and submit payout intent as `FULL_AVAILABLE` or `SPECIFIED`; they must not submit `destinationId`, provider, beneficiary name or wallet identifier.

WLT must own the complete destination lifecycle. Initial destination provisioning and every material change must be a Finance-controlled master-data workflow with permission checks, mandatory reason and evidence, immutable version history, provider/account verification where available, and required independent approval before a new version becomes `VERIFIED + ACTIVE_FOR_PAYOUT`. If provider verification is unavailable, any necessary identifier capture remains a controlled Finance action backed by external evidence; it never becomes beneficiary free-form self-service. Existing verified history remains immutable and an already held/approved payout keeps its pinned destination version.

Payout amount resolution is also server authority. `FULL_AVAILABLE` must be calculated transactionally from canonical eligible funds after holds, reservations, pending payout reservations, unsettled amounts and restricted/disputed exposure. `SPECIFIED` accepts only the requested amount and must validate `0 < amount <= eligibleAvailable` inside the same authoritative boundary. WLT then resolves the current verified active destination and pins its version. A previously displayed balance, client-side calculation or beneficiary-selected destination is never authoritative.

Finance operators must not calculate or type authoritative earnings, balances, commissions, payable totals, control totals or settlement totals. Finance surfaces must render system-derived values and legal next actions. Any legitimate adjustment must be a typed governed WLT transaction/event with reason, evidence and approval policy as applicable; never a direct balance edit or generic monetary override field.

`daily_close.go` must use canonical double-entry truth and fail closed on missing/unverified evidence, unresolved reconciliation, mismatched control totals or blocking exceptions. Completion requires immutable approved payout snapshot + frozen batch row + manual execution evidence/reference + authoritative external statement/readback agreement. Sensitive official-wallet references must remain versioned, encrypted/masked and operator-context scoped. Preserve legacy financial history read-only; do not restore automated cash-out, bank/IBAN semantics, self-service destination mutation or manual arithmetic as shortcuts.

## Required negative proof before U004 can close

- partner/captain/field destination create/update/deactivate/replace routes are absent or server-denied;
- payout intent cannot select `destinationId`, provider, beneficiary name or wallet identifier;
- `FULL_AVAILABLE` cannot be supplied as a client-computed amount and is race-tested transactionally;
- `SPECIFIED` is positive, bounded and concurrency-safe against current eligible funds;
- destination provisioning/change requires Finance authorization + reason + evidence + versioning + verification + required approval;
- old destination versions and pinned payout versions cannot be rewritten;
- Finance cannot directly edit authoritative balances, commissions, eligibility or settlement totals;
- no bare `mark paid`, spreadsheet-as-truth or unreconciled completion path exists;
- DailyFinanceClose blocks unresolved financial exposure.
