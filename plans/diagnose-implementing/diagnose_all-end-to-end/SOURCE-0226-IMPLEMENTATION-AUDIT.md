# Implementation Audit — What Is Actually Implemented?

## Audit rule

A document, plan, workflow, partial migration, or passing local guard is not implementation closure. A capability is `CLOSED` only when its canonical runtime path, all consumers, schema/contracts, generated clients, surfaces, failure/recovery path and cleanup are verified on the same candidate SHA.

## Current verdict

**Overall: `NOT_IMPLEMENTED / NOT_CLOSED`.**

The two requested task branches have been integrated into `A`, but integration is not equivalent to completion of the diagnosed canonical architecture.

## Branch integration audit

| Work | Integration status | Runtime closure status |
|---|---|---|
| `task/v5-finance-delivery-canonical-truth-20260816-0214` | Integrated into `A` | Diagnosis package only; `PREPARE_ONLY`; no runtime cutover |
| `task/v5-all-surfaces-rootfix-20260815-2345` | Integrated into `A` | Actor-provenance execution attempt failed verification; not closed |

Latest diagnosis baseline after reconciliation: `A@1796443080f9844c21b1af349ee3a953b23849ba`.

Later `A` movement during the session included unrelated/foreign plan cleanup and media-seed changes. These are `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`; they do not prove any finance/delivery root fixed.

## Actor provenance audit

GitHub Actions run `31908535848`:

- PostgreSQL setup: passed.
- schema/migration setup: passed.
- writer inventory: passed.
- forward migration `dsh-1009_order_event_actor_provenance.sql`: passed within the run environment.
- DB guard/service hardening steps before consumer compile: passed.
- `Compile and test all DSH backend consumers`: **failed**.
- OpenAPI/generated verification: skipped.
- full tests/static checks: skipped.
- captain client smoke: skipped.
- final DB/runtime reproof: skipped.
- governed final implementation commit: skipped.

Therefore:

`RC-ORDER-ACTOR-PROVENANCE = PROVEN_FINDING / OPEN_IMPLEMENTATION`.

No downstream package may treat the attempted migration or workflow as live canonical closure without a new successful execution and same-SHA proof.

## Capability-by-capability audit

| Capability / invariant | Current status | Why it is not closed |
|---|---|---|
| WLT-specific BTHWANI captain guarantee position | `NOT IMPLEMENTED` | Earlier diagnosis found generic wallet/transaction/hold primitives but no complete guarantee lifecycle product |
| Platform-defined collateral floor in WLT | `NOT IMPLEMENTED` | Decision exists; runtime policy/cutover not proven |
| Removal of Workforce financial guarantee authority | `NOT IMPLEMENTED` | Existing diagnosis found mutable guarantee-related fields/readiness outside WLT |
| Prepaid no-reservation invariant | `NOT PROVEN` | No same-SHA E2E evidence after canonical allocation cutover |
| Exact COD/Mixed cash exposure reservation | `NOT IMPLEMENTED` | Mixed protection is not proven to be based on persisted cash leg |
| Canonical persisted PaymentAllocation | `NOT IMPLEMENTED` | Existing checkout model still diagnosed around payment method categories rather than authoritative numeric allocation |
| Exactly three checkout methods | `NOT IMPLEMENTED` | `official_wallet` was diagnosed as a checkout enum/route concept; external-rail separation is target architecture, not proven live cutover |
| Official wallet/bank as top-up rail only | `TARGET DOCUMENTED / RUNTIME NOT CLOSED` | WLT external architecture documents target; live multi-surface E2E implementation not proven |
| Exposure distinct from cash custody | `NOT IMPLEMENTED` | Current COD reserve/finalize and collect/remit concepts were diagnosed as overlapping/conflated |
| Rolling custody settlement/deadline | `NOT IMPLEMENTED` | Product decision exists; runtime state machine/eligibility coupling not proven |
| Captain wallet transparency for collateral/exposure/custody/debt | `NOT IMPLEMENTED` | No complete runtime/UI proof on app-captain/control-panel |
| One canonical captain eligibility primitive | `NOT IMPLEMENTED` | Readiness/dispatch/financial/area gates remain diagnosed as distributed |
| Service-area scope in candidate/capacity/assignment | `NOT IMPLEMENTED` | Workforce scope was not proven to govern all DSH paths |
| Exclusive primary fleet affiliation BTHWANI XOR PARTNER | `PARTIAL / UNSAFE` | Membership model exists, but separate exclusive primary affiliation lifecycle is not proven |
| Workforce-only operational accreditation | `NOT IMPLEMENTED` | Duplicate mutable DSH accreditation authority remains a cleanup/cutover target |
| Workforce suspension vs DSH presence semantic split | `NOT IMPLEMENTED` | Target semantics agreed; physical schema/code cutover not proven |
| Explicit Actor/Membership/Person/Store/Branch IDs | `NOT IMPLEMENTED` | Prior diagnosis proved semantic overloading paths |
| Canonical StoreBranch entity | `NOT IMPLEMENTED` | Branch-like UI/fields can still be backed by store/scope IDs per diagnosis |
| Removal of legacy free-text store courier identity | `NOT IMPLEMENTED` | legacy courierName/courierPhone-style source remains a diagnosed parallel truth target |
| Store delivery uses store as settlement counterparty | `NOT CLOSED` | Existing paths were diagnosed as capable of mapping store courier into BTHWANI captain financial semantics |
| Store courier excluded from BTHWANI captain commission/guarantee/debt | `NOT CLOSED` | Legacy financial/outbox path must be physically removed and adversarially inventoried |
| Store-owned optional courier guarantee outside BTHWANI WLT | `DECIDED / NOT IMPLEMENTED` | Requires surface/contract cleanup so UI does not imply BTHWANI custody |
| Store-owned payroll/compensation | `DECIDED / NOT IMPLEMENTED` | Existing compensation/pricing settings require canonical separation and legacy removal |
| Monthly salary => no per-delivery entitlement | `DECIDED / NOT IMPLEMENTED` | Must be enforced in earnings writers and partner settlement path |
| Partner settlement amount derived/verified canonically in WLT | `NOT IMPLEMENTED` | caller-computed gross was diagnosed in current settlement boundary |
| WLT versioned penalty catalog/amount derivation | `NOT IMPLEMENTED` | Workforce/caller-proposed amount path was diagnosed |
| WLT receivable/debt for insufficient penalty balance | `NOT IMPLEMENTED` | target model not proven live |
| Exact refund funding lineage | `NOT IMPLEMENTED` | caller-supplied refund source was diagnosed instead of immutable lineage derivation |
| Distributed financial mutation saga/outbox with no ignored failure | `NOT IMPLEMENTED` | best-effort financial side effects were diagnosed in governed transitions |
| Machine-readable authority registry | `NOT IMPLEMENTED` | governance drift remains possible |
| Actor provenance | `FAILED / OPEN` | CI failed before consumer/OpenAPI/full verification and commit |
| Physical line/file/folder cleanup | `NOT STARTED AS FINAL CUTOVER` | old sources cannot be deleted safely until canonical replacements are live and verified |
| Full same-SHA E2E closure | `OPEN` | required gates have not run successfully on one final candidate SHA |

## What the current repository *does* establish

The repository now contains enough diagnosis and architectural direction to remove product ambiguity. It also contains a WLT external-wallet-switch architecture target that correctly treats official external providers as funding/top-up rails into the internal BTHWANI Wallet.

This is valuable design/governance evidence, but it is not proof that the user-facing top-up screens, checkout, ledger, dispatch and settlement paths all currently behave that way.

## False-DONE conditions explicitly prohibited

The following must never be used to claim closure:

- "the migration file exists";
- "the endpoint compiles in one package";
- "the UI shows the field";
- "WLT has a ledger";
- "Workforce returns eligible";
- "the workflow got past PostgreSQL";
- "the task branch was merged";
- "a plan says DONE";
- "the old path is left as fallback";
- "only happy-path tests pass".

## Required next-state proof

The implementation must produce a single final candidate SHA and attach evidence for:

- writer inventory before/after;
- authority registry and contracts;
- forward DB migrations and rollback/repair semantics where applicable;
- WLT financial invariants;
- cross-service idempotency/concurrency/retry/reconciliation;
- all DSH/WLT/Workforce consumers;
- OpenAPI and generated clients;
- app-client/app-captain/app-partner/control-panel type checks/build/smoke flows;
- PostgreSQL runtime proof;
- negative cross-authority tests;
- payment-allocation arithmetic and refund lineage;
- partner-versus-BTHWANI financial isolation;
- cleanup zero-inventory;
- final reconciliation against latest `A` immediately before merge.
