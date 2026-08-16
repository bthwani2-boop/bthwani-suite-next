# START HERE — diagnose_all-end-to-end

## Purpose

`plans/diagnose-implementing/diagnose_all-end-to-end` is the single continuing diagnosis root for the merged finance / delivery / captain / partner-store-delivery diagnosis. It replaces the previous temporary `SOURCE-*` copy layout with one coherent set of merged canonical files.

This directory merges, reconciles and supersedes the active diagnostic meaning of:

- `plans/diagnose-implementing/v5-finance-delivery-canonical-truth-20260816-0214`
- `plans/diagnose-implementing/v5-canonical-finance-delivery-captain-closure-20260816-0226`

The original source directories remain historical/provenance evidence. They are not the continuing active entry point after this consolidation.

## Consolidation rule

The merge is semantic, not a folder of duplicated source copies.

- overlapping findings are unified under one root-cause model;
- later explicit user decisions override older open/recommended wording;
- no older finding disappears merely because a later package renamed or regrouped it;
- failed execution evidence remains failed/open, never silently promoted to DONE;
- historical plans remain Derived Support unless re-proven against live current code/runtime;
- live current branch/code/contracts/data/runtime on the pinned candidate remain the highest technical truth;
- `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.

## Current package status

- Package kind: `CONTINUING_DIAGNOSIS_AND_EXECUTION_AUTHORITY`
- Integration branch: `A`
- Consolidation base: `232f2678101447844415e159edbf3dde2dd77f38`
- Prior finance package mode: `PREPARE_ONLY`
- Prior canonical closure package mode: `PREPARE_ONLY / EXECUTION-AUTHORITY-PACKAGE`
- `DECISION_REQUIRED = 0`
- Diagnosis: `CLOSED FOR CURRENT MERGED SCOPE`
- Runtime implementation: `OPEN`
- Canonical cutover: `OPEN`
- Cleanup closure: `OPEN`
- Final E2E closure: `OPEN`
- Actor provenance: `PROVEN FINDING / FAILED PRIOR VERIFICATION / OPEN IMPLEMENTATION`

No merge, document, migration file, local guard, workflow existence, or partial test is sufficient to claim runtime closure.

## Canonical authority map

| Truth | Canonical owner |
|---|---|
| Authentication, session, principal, trusted actor context | Identity |
| Person/provider lifecycle, non-financial readiness, operational accreditation, work scopes, absence/suspension/work windows | Workforce |
| Store, canonical branch, fleet primary affiliation, partner memberships, order, fulfillment, dispatch, ephemeral presence/capacity | DSH |
| Wallets, authoritative monetary amounts, captain collateral/guarantee, tender allocation effects, COD exposure, cash custody, debt, penalties, settlement, payout, refund, ledger | WLT |

A projection outside its owner may exist only as explicitly read-only, source/version/freshness-bound data. It may not become a second writer or write gate.

## Highest merged root-cause hierarchy

### Highest systemic root

`RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION`

The system must keep these concepts distinct:

1. customer tender / funding allocation;
2. BTHWANI captain financial collateral/exposure;
3. physical cash custody/evidence;
4. final settlement/payable/debt.

### Coupled roots

1. `RC-MONETARY-FACT-OWNERSHIP-SPLIT`
2. `RC-CAPTAIN-OPERATIONAL-ELIGIBILITY-AUTHORITY-SPLIT`
3. `RC-STORE-DELIVERY-FLEET-COMPENSATION-PARALLEL-TRUTH`
4. `RC-IDENTIFIER-SEMANTIC-OVERLOADING`
5. `RC-DISTRIBUTED-FINANCIAL-OBLIGATION-BEST-EFFORT`
6. `RC-SERVICE-AREA-CAPACITY-TRUTH-DRIFT`
7. `RC-AVAILABILITY-AND-SUSPENSION-SEMANTIC-OVERLAP`
8. `RC-ACCREDITATION-PARALLEL-AUTHORITY`
9. `RC-GOVERNANCE-AUTHORITY-DRIFT`
10. `RC-ORDER-ACTOR-PROVENANCE` — valid but lower-ranked until higher systemic roots are stabilized.

## Binding product outcomes

- Checkout exposes exactly three choices: `COD`, `BTHWANI Wallet`, `Mixed`.
- Official banks/e-wallets/providers are governed top-up/funding rails into BTHWANI Wallet, not a fourth order-payment authority.
- Canonical numeric `PaymentAllocation` owns tender decomposition. Financial logic never derives authoritative amounts from a payment-method label.
- BTHWANI captain collateral/guarantee is a real WLT-owned restricted financial position.
- Platform Finance governance defines the opening/protected minimum.
- Prepaid-only orders consume zero COD collateral exposure.
- COD/Mixed reserve only the actual cash leg.
- Mandatory invariant: `openCashCustody + proposedNewCashExposure <= effectiveCollateral`.
- Low collateral blocks COD/Mixed cash-bearing work while fully prepaid work may remain eligible if all non-financial gates pass.
- Protected minimum is not directly withdrawable; only governed safe excess may be released.
- Exposure reservation and physical cash custody are separate states. Finalizing exposure never erases custody.
- Store delivery offers the same three customer payment choices, but the store is the BTHWANI settlement counterparty; the store courier is only a store-scoped actor/sub-custodian for physical collection evidence.
- Store courier payroll/compensation and optional store-specific collateral remain the store's responsibility unless a future explicit product changes that boundary.
- Monthly-salary store courier receives no per-delivery BTHWANI entitlement.
- BTHWANI vs PARTNER primary dispatch affiliation is exclusive: `BTHWANI XOR PARTNER`.
- Workforce owns general operational accreditation; DSH duplicate accreditation authority must be removed.
- Workforce owns durable suspension/absence/work-window; DSH owns ephemeral online/offline/available/busy presence.
- One canonical captain eligibility primitive must govern candidate, capacity, assign, reassign, inbox/offer and accept.
- WLT owns penalty monetary policy/amount; Operations selects a policy/version, not an arbitrary amount.
- Refund follows immutable original funding lineage.
- Distributed financial obligations cannot be best-effort or silently ignored.
- Explicit typed identifier semantics are mandatory across actor, membership, person, store and branch boundaries.
- A real canonical StoreBranch must replace store/scope IDs masquerading as branch IDs.

## Merged mandatory carried-forward findings

The following findings from the earlier package remain explicitly in scope and are incorporated throughout the merged files:

- legacy store-courier identity/lifecycle parallel truth (`courierName`, `courierPhone`, copied active state or equivalent);
- legacy store-courier pricing/`pricingSource` parallel configuration;
- identifier semantic overloading beyond only `storeCourierId`;
- canonical StoreBranch gap;
- partner courier leakage into BTHWANI captain finance;
- distributed financial best-effort mutations beyond only `FinalizeCodReservation`;
- partner settlement caller-authored gross/amount authority drift;
- incomplete true E2E WALLET/MIXED customer journeys despite enums/primitives existing;
- tender/exposure/custody/settlement separation;
- store-delivery fleet/compensation parallel truth;
- actor provenance remains open and must be re-proven after higher roots.

## Prior actor-provenance execution evidence

GitHub Actions run `31908535848` passed PostgreSQL/migration/writer-guard portions and then failed at **Compile and test all DSH backend consumers**. OpenAPI/generated verification, full tests/static checks, client smoke, final DB reproof and governed final implementation commit were skipped.

Therefore actor provenance remains OPEN. The failed workflow/script is evidence only.

## Files in this merged package

1. `START-HERE.md` — this governing entry point.
2. `DIAGNOSIS.md` — merged top-down diagnosis and root-cause landscape.
3. `DECISIONS.md` — one final binding decision register; `DECISION_REQUIRED=0`.
4. `IMPLEMENTATION-AUDIT.md` — what is actually implemented versus only diagnosed/decided.
5. `COVERAGE.md` — authority, journey, surface, failure/recovery and evidence coverage.
6. `CLEANUP.md` — zero-residue cutover/deletion contract.
7. `PACKAGE.md` — execution frontier, gates, invariants, evidence and closure predicate.
8. `RECONCILIATION.md` — branch/source/decision/foreign-delta reconciliation.
9. `SOURCE-MANIFEST.md` — provenance mapping from every one of the 14 source artifacts into these merged files.

## Read order

1. `RECONCILIATION.md`
2. `DIAGNOSIS.md`
3. `DECISIONS.md`
4. `IMPLEMENTATION-AUDIT.md`
5. `COVERAGE.md`
6. `CLEANUP.md`
7. `PACKAGE.md`
8. `SOURCE-MANIFEST.md`

## Continuing diagnosis rule

All future diagnoses intended to extend this cross-system work should be added to this directory by updating the merged canonical files rather than creating another forest of parallel packages, unless a genuinely separate scope requires an isolated task package.

Every new finding must be linked to:

- operational parent;
- root cause;
- canonical owner;
- writers/readers/consumers;
- contracts/data/runtime path;
- blast radius;
- target invariant;
- disposition/evidence state;
- cleanup consequence;
- verification requirement.

## DONE is forbidden until

On one exact final candidate SHA there is proof of:

- zero duplicate monetary writers outside WLT;
- zero caller-authoritative monetary amounts where WLT policy/lineage derives them;
- zero duplicate captain eligibility engines;
- zero ambiguous cross-authority identifiers;
- zero store-ID-as-branch-ID fallback;
- zero Mixed cash-leg blind spot;
- zero exposure/custody conflation;
- zero partner-courier route into BTHWANI captain guarantee/commission/debt/payroll authority;
- zero silently ignored required financial mutation;
- zero reachable fallback/compatibility source of old truth;
- zero stale old-source code/DTO/route/schema/config/test/script/generated client/governance reference after cutover;
- full PostgreSQL, invariant, negative, concurrency, idempotency, OpenAPI/generated-client, Go/TypeScript, runtime, multi-surface, readback, privacy/audit and adversarial writer-inventory proof;
- latest `A` reconciled after the last write and all required affected gates rerun.
