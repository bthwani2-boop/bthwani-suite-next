# START HERE — Canonical Finance / Delivery / Captain Closure

## Status

- Package mode: `PREPARE_ONLY / EXECUTION-AUTHORITY-PACKAGE`
- Diagnosis baseline branch: `A`
- Initial diagnosis SHA: `1796443080f9844c21b1af349ee3a953b23849ba`
- Latest reconciled `A` before package merge: `13a7203677303196d04eea2b7fe2e50a6c99fa9e`
- Task branch: `task/v5-canonical-finance-delivery-captain-closure-20260816-0226`
- `FOREIGN_DELTA_CLASSIFIED = true`
- `DECISION_REQUIRED = 0`
- Runtime closure: **NOT ACHIEVED**
- Canonical cutover: **NOT IMPLEMENTED**
- Cleanup closure: **NOT ACHIEVED**
- Actor provenance closure: **OPEN / FAILED VERIFICATION**

This package is the authoritative execution package for the diagnosed cross-domain finance/delivery/captain root-cause cluster. It supersedes decision ambiguity in earlier diagnosis drafts, but it does **not** claim that the target runtime architecture already exists.

## Why this package exists

The system currently has a repeated failure pattern: a business fact has more than one effective owner, an operational service can choose a monetary value later posted by WLT, one identifier is used for several semantic identities, or an operational transition can commit while a required financial transition fails best-effort.

The highest proven root is:

`RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION`

It is coupled to:

1. `RC-MONETARY-FACT-OWNERSHIP-SPLIT`
2. `RC-CAPTAIN-OPERATIONAL-ELIGIBILITY-AUTHORITY-SPLIT`
3. `RC-STORE-DELIVERY-FLEET-COMPENSATION-PARALLEL-TRUTH`
4. `RC-IDENTIFIER-SEMANTIC-OVERLOADING`
5. `RC-DISTRIBUTED-FINANCIAL-OBLIGATION-BEST-EFFORT`
6. `RC-SERVICE-AREA-CAPACITY-TRUTH-DRIFT`
7. `RC-AVAILABILITY-AND-SUSPENSION-SEMANTIC-OVERLAP`
8. `RC-GOVERNANCE-AUTHORITY-DRIFT`
9. `RC-ORDER-ACTOR-PROVENANCE` — proven, but lower execution frontier after the systemic roots above; its prior implementation attempt is not closed.

## Merged work audit

Two requested task branches were integrated into `A` before this package was created:

- `task/v5-finance-delivery-canonical-truth-20260816-0214`
- `task/v5-all-surfaces-rootfix-20260815-2345`

The finance branch is a diagnosis package (`PREPARE_ONLY`); it does not contain the required runtime cutover.

The all-surfaces rootfix branch contains actor-provenance execution harness/evidence. GitHub Actions run `31908535848` failed at **Compile and test all DSH backend consumers** after DB/migration guards passed. OpenAPI/generated verification, full tests/static checks, client smoke, final DB reproof, and final governed commit were skipped. Therefore actor provenance must remain `OPEN`.

`A` moved after the initial pin by one related documentation/reconciliation commit. `RECONCILIATION.md` classifies that delta, incorporates its material findings, and narrows one older partner-courier compensation statement under the user's later explicit decision that store employee payroll/compensation remains the store's responsibility. No runtime authority change was introduced by that delta.

Any later movement of `A` remains `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`. Execution must re-pin again before every governed write and final merge.

## Canonical authority map

| Business truth | Single canonical owner |
|---|---|
| Authentication, session, principal, trusted identity context | Identity |
| Person/provider lifecycle, non-financial readiness, operational accreditation, work scopes, absence/suspension | Workforce |
| Store, branch, fleet primary affiliation, partner memberships, order, fulfillment, dispatch, ephemeral dispatch presence | DSH |
| Wallets, monetary amounts, guarantee/collateral, tender allocation financial effects, COD exposure, cash custody, debt, penalty monetary effect, settlement, payout, refund, ledger | WLT |

No writable parallel source is permitted after cutover.

## Frozen product decisions

The user explicitly resolved the previously open decisions and established the rule that unanswered decisions adopt the recommended option. `DECISIONS.md` records the complete binding decision set. No product decision remains open for the execution described by this package.

Key outcomes:

- BTHWANI captain collateral is a real WLT-owned restricted financial position.
- A platform-defined minimum/opening collateral is required for BTHWANI captain activation.
- Prepaid-only work does not reserve collateral.
- COD and Mixed reserve only the **actual cash leg**.
- `outstanding cash custody + new cash exposure <= effective collateral` is a mandatory financial invariant.
- Protected minimum collateral is not directly withdrawable; only governed excess may be released when safe.
- Low collateral blocks COD/Mixed eligibility; it does not create a fake reservation on prepaid orders.
- COD custody is rolling and must be settled by governed deadlines and shift/day closure.
- Checkout exposes exactly three payment choices: COD, BTHWANI Wallet, Mixed. Official banks/e-wallets are wallet top-up/funding rails, not a fourth checkout payment authority.
- Store delivery exposes the same three customer payment choices, but the store is the financial settlement counterparty and the store courier is a store sub-custodian, not a BTHWANI captain financial counterparty.
- Store-courier payroll/compensation and optional store-specific collateral remain the store's responsibility; BTHWANI does not become payer/custodian merely by providing management UI.
- Monthly-salary store couriers receive no per-delivery entitlement. Any alternative store compensation arrangement remains store-owned unless a future explicit product decision changes the authority boundary.
- Financial penalty amounts are WLT-owned versioned policy facts; Operations selects a penalty policy, not an arbitrary amount.
- Refunds follow original funding lineage.
- BTHWANI versus PARTNER primary fleet affiliation is mutually exclusive.
- Captain eligibility is one canonical decision primitive across all governed paths.

## Execution rule

This package must be executed top-down by root cause, not by whichever low-level file is easiest to modify. Early technical findings are evidence only until their operational parent and authority boundary are proven.

The implementation sequence and gates live in `PACKAGE.md`.

## Read order

1. `RECONCILIATION.md`
2. `DIAGNOSIS.md`
3. `DECISIONS.md`
4. `IMPLEMENTATION-AUDIT.md`
5. `COVERAGE.md`
6. `CLEANUP.md`
7. `PACKAGE.md`

## Definition of DONE

`DONE` is forbidden until all of the following are proven on the same final candidate SHA:

- zero duplicate money writers or caller-authoritative money amounts outside WLT;
- zero duplicate captain eligibility engines;
- zero ambiguous cross-authority identifiers;
- zero unprotected Mixed cash leg;
- zero conflation between collateral reservation and cash custody;
- zero partner-courier path into BTHWANI captain guarantee/commission/debt authority;
- zero best-effort ignored financial obligation after an operational commit;
- zero stale authoritative projections/fallbacks/compatibility sources;
- zero stale old-source code, DTO, route, schema field, file, folder, config, test, script, or governance reference after cutover;
- complete PostgreSQL, invariant, negative, concurrency, idempotency, OpenAPI/generated-client, Go/TS, runtime, multi-surface, readback, audit, and adversarial writer-inventory proof.
