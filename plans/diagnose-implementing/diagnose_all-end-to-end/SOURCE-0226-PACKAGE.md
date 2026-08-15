# V5 Execution Package — Canonical Finance / Delivery / Captain Closure

## 0. Package contract

- Entry point: this file after reading `START-HERE.md`.
- Mode represented by this package: diagnosis complete; execution not yet performed.
- Baseline: `A@1796443080f9844c21b1af349ee3a953b23849ba`.
- Task branch: `task/v5-canonical-finance-delivery-captain-closure-20260816-0226`.
- `DECISION_REQUIRED = 0`.
- Default posture: `FAIL_CLOSED`.
- Foreign changes: `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.
- Applied migration history: immutable; corrective migrations are forward-only.
- Parallel source of truth/fallback after cutover: forbidden.

The executor must re-resolve current `A` before beginning, before every merge/rebase decision, and immediately before final push/merge. If `A` moved, classify delta as disjoint/related/overlap/conflict/authority-change and reconcile before proceeding.

## 1. Top-down execution frontier

The executor must not begin with low-level actor provenance merely because a workflow already exists. Execute highest proven systemic roots first.

### Frontier F0 — Freeze authority and evidence

Goals:

- re-pin latest `A` SHA and task SHA;
- inventory all affected money/eligibility/identifier writers/readers;
- create machine-readable canonical authority registry;
- bind each root cause to owners, contracts, consumers and invariants;
- classify any new Foreign Delta;
- prove `DECISION_REQUIRED=0` still holds under current evidence.

Gate F0:

- no unresolved owner ambiguity;
- no unclassified monetary writer;
- no unclassified eligibility writer;
- no unclassified identifier boundary;
- no product decision required.

### Frontier F1 — Canonical financial primitives in WLT

Implement WLT-owned primitives and invariants for:

- BTHWANI captain guarantee/collateral position;
- protected minimum and releasable excess;
- canonical payment allocation/tender legs;
- COD/Mixed exposure reservation using exact cash leg;
- cash custody distinct from exposure;
- receivable/debt;
- penalty monetary policy/version;
- immutable refund/reversal lineage;
- settlement evidence derivation;
- actor/correlation/idempotency metadata.

DB constraints must enforce locally provable invariants, including nonnegative amounts and allocation arithmetic.

Gate F1:

- WLT is the only authoritative writer for affected monetary facts;
- no caller can directly choose a canonical penalty/settlement/refund source amount when policy/lineage can derive it;
- concurrency/idempotency tests pass against PostgreSQL;
- no guarantee/custody/exposure conflation remains in the WLT model.

### Frontier F2 — Remove monetary authority from Workforce/DSH

Cut over:

- Workforce guarantee fields/calculation;
- duplicate DSH/Workforce financial eligibility calculations;
- caller-proposed penalty amount;
- caller-authoritative partner gross settlement;
- any mutable monetary projection used as a write gate.

Keep only explicit read-only source/version/freshness projections if operationally required.

Gate F2:

- adversarial search proves zero authoritative monetary writers outside WLT for this scope;
- API/DB/generated clients no longer expose old writable financial fields;
- tests prove callers cannot override WLT amounts.

### Frontier F3 — Canonical checkout/payment allocation

Implement exactly three UX choices:

- COD;
- BTHWANI Wallet;
- Mixed.

Persist exact allocation and cut all financial consumers to it.

Move official bank/e-wallet providers exclusively to wallet top-up/funding journeys per WLT external-wallet-switch architecture.

Gate F3:

- `official_wallet` is absent as checkout authority across backend/OpenAPI/generated/apps/tests/docs;
- COD/Wallet/Mixed arithmetic is exact and persisted;
- Mixed cash leg participates in every COD risk/custody/refund/settlement rule;
- external provider funding is idempotently reflected in internal WLT ledger before wallet spending.

### Frontier F4 — COD exposure/custody/settlement lifecycle

Implement BTHWANI captain lifecycle:

- activation baseline collateral;
- exact cash exposure reservation;
- rolling effective-collateral invariant;
- actual cash custody on collection;
- deadline/end-shift/day settlement;
- excess release request/approval;
- debt/hold/setoff policy;
- offboarding refund/reconciliation.

Gate F4:

- prepaid-only orders create zero collateral reservation;
- low collateral blocks COD/Mixed safely;
- exposure finalization cannot erase custody;
- overdue custody blocks new COD as policy requires;
- release race with concurrent assignment cannot violate protected collateral;
- captain/control-panel readback is consistent with WLT.

### Frontier F5 — Canonical captain eligibility and fleet semantics

Implement:

- exclusive primary `BTHWANI XOR PARTNER` affiliation;
- explicit partner store memberships;
- Workforce-only operational accreditation;
- Workforce suspension/absence/work-window/scopes;
- DSH ephemeral presence only;
- real service-area authorization in candidate/capacity/assign/reassign/accept;
- one composite eligibility primitive/contract;
- synchronous current authority checks for governed writes;
- versioned short-lived preview token only where justified.

Gate F5:

- one eligibility semantic across all consumers;
- wrong affiliation, wrong area, suspension, stale decision, WLT ineligibility and dependency failure all fail closed;
- capacity counts only currently eligible scoped captains;
- no offer-created-but-later-immediately-ineligible inconsistency due to omitted gate.

### Frontier F6 — Explicit identifiers and StoreBranch

Implement typed/explicit identifiers across APIs/events/DB/generated clients and real branch semantics.

Required resolution:

`captainMembershipId -> DSH Fleet -> captainActorId -> Workforce`

Never pass a membership ID directly to actor-readiness APIs.

Gate F6:

- zero generic ambiguous ID at affected authority boundaries;
- zero store-id-as-branch-id compatibility path;
- FK/domain/API tests reject wrong identifier class.

### Frontier F7 — Partner/store delivery canonical cutover

Converge store delivery on:

- Workforce canonical person/provider;
- DSH canonical primary affiliation + partner membership;
- app-captain PARTNER execution mode;
- app-partner management sections;
- same three customer tender choices;
- store as settlement counterparty;
- store courier as sub-custodian evidence only;
- store-owned optional guarantee responsibility;
- store-owned salary/compensation responsibility;
- monthly salary produces no per-delivery BTHWANI entitlement;
- delivery fee remains in store gross economics subject to partner/platform contract.

Gate F7:

- no free-text courier identity source;
- no partner courier reaches BTHWANI captain commission/collateral/debt/payout writer;
- no BTHWANI payroll liability is created for store employees;
- partner settlement derives/verifies canonical gross/tender/contract evidence in WLT;
- partner app cannot weaken platform safety baseline.

### Frontier F8 — Penalty/refund/reversal closure

Complete:

- versioned WLT penalty catalog managed by sovereign Finance/platform section;
- Operations selects policy, not amount;
- insufficient balance -> WLT receivable/debt;
- exact refund original funding lineage;
- real cash refund evidence path if supported;
- anti-over-refund/idempotent reversal protections.

Gate F8:

- caller arbitrary penalty amount rejected;
- caller arbitrary refund funding source rejected;
- every refund is bounded by original captured/collected lineage;
- retry cannot double debit/credit.

### Frontier F9 — Durable cross-service financial obligations

Replace best-effort required WLT calls with durable state machines/outbox/saga semantics.

At minimum cover order/payment/assignment/delivery/settlement/refund transitions where operational state and financial state must converge.

Gate F9:

- failure injection proves no silent operational completion with lost financial obligation;
- retry/recovery/reconciliation is deterministic and idempotent;
- terminal unresolved state is visible/operable, never silently discarded.

### Frontier F10 — Actor provenance repair

Return to `RC-ORDER-ACTOR-PROVENANCE` only after higher systemic contracts are stable.

Use the prior failed run as evidence, not as implementation authority. Diagnose and fix the exact DSH consumer compilation failure before rerunning the full governed path.

Gate F10:

- every relevant writer persists trusted `actorId` when known;
- historical unknown remains unknown;
- DB constraint/migration behavior is forward-safe;
- DSH backend consumers compile/test;
- OpenAPI/generated clients pass;
- full DSH tests/static checks pass;
- captain client smoke passes where affected;
- operator readback/redaction tests pass;
- no final commit occurs before all gates.

### Frontier F11 — Multi-surface cutover

Update and verify:

- app-client;
- app-captain;
- app-partner;
- control-panel;
- shared sovereign frontend packages;
- OpenAPI/generated clients;
- analytics/audit views affected by renamed payment/financial states.

Gate F11:

- no surface can write old authority;
- user/operator displays are sourced from canonical decision/ledger values;
- all affected TS checks/builds/smoke flows pass;
- no stale enum/generated type remains.

### Frontier F12 — Physical cleanup and governance reconciliation

Execute `CLEANUP.md` fully.

Reconcile human docs to the machine-readable authority registry. Delete/retire obsolete runtime code, fields, DTOs, routes, config, tests, scripts and stale active docs.

Gate F12:

- zero-residue inventory is classified and clean;
- no compatibility/fallback keeps old truth live;
- no `.tmp-*` or abandoned execution artifacts remain unless promoted to maintained tooling;
- no stale active Product Truth contradicts runtime authority.

### Frontier F13 — Adversarial final verification

Run on the **same candidate SHA**:

1. PostgreSQL migrations from supported starting state.
2. DB constraints and invariant tests.
3. writer/reader/source-of-truth inventory.
4. payment allocation arithmetic tests.
5. collateral/exposure/custody concurrency tests.
6. penalty/debt/refund/settlement idempotency tests.
7. negative authority and wrong-ID tests.
8. service-area/fleet/eligibility consistency tests.
9. durable failure/recovery/reconciliation tests.
10. OpenAPI and generated clients.
11. full affected Go tests/static checks.
12. affected TypeScript checks/builds.
13. app-client/app-captain/app-partner/control-panel smoke/readback.
14. privacy/redaction/audit evidence.
15. cleanup zero inventory.
16. governance/authority-registry drift check.

Gate F13: every mandatory item passes with fresh evidence bound to candidate SHA.

### Frontier F14 — Latest-A reconciliation and closure

Immediately before merge:

- fetch/re-resolve latest `A`;
- compare candidate vs latest `A`;
- classify all concurrent delta;
- reconcile any related/overlap/authority change;
- rerun affected gates after reconciliation;
- re-pin final candidate SHA;
- merge only fast-forward/normal governed path permitted by repository policy;
- verify target ref contains candidate;
- read back final files/runtime metadata where applicable.

No final status may use evidence from a pre-reconciliation SHA.

## 2. Required canonical invariants

The executor must encode and test at least these invariants:

### Financial ownership

`authoritative monetary writer in scope => WLT`

### Tender arithmetic

`walletLeg + cashLeg = payable`

`walletLeg >= 0`

`cashLeg >= 0`

### Cash exposure

`openCashCustody + proposedNewCashExposure <= effectiveCollateral`

### Protected release

`postReleaseEffectiveCollateral >= requiredProtectedMinimum`

and no policy-blocking overdue custody/debt/hold.

### Prepaid

`cashLeg == 0 => COD exposure reservation == 0`

### Mixed

`cashLeg > 0 => exact cash-leg exposure/custody rules apply`

### Fleet

`primaryAffiliation ∈ {BTHWANI, PARTNER}` and never both concurrently.

### Identity semantics

`membershipId != actorId` by type/contract even when textual values could coincidentally match.

### Partner finance isolation

`partner courier physical custody != BTHWANI captain financial counterparty`

### Salary semantics

`store monthly salary mode => BTHWANI per-delivery courier entitlement = 0`

### Refund

`refund <= refundable original lineage` and no source override.

### Provenance

`trusted actor known => canonical event actor provenance present`

`historical actor unproven => remains unknown`

## 3. Stop-the-line blockers

Execution must stop and remain OPEN if any of these occurs:

- new product/authority ambiguity not derivable from evidence;
- latest `A` introduces conflicting authority change;
- another writer is discovered after canonical cutover;
- a migration would require fabricated financial/provenance facts;
- financial dependency failure is still best-effort;
- a surface still writes old truth;
- generated clients/contracts disagree;
- final tests are run on different SHAs;
- cleanup leaves an unclassified residue;
- a required dependency is unavailable and code attempts a local eligibility/financial fallback.

## 4. Evidence bundle required for final closure

Final package/result must record:

- base SHA;
- implementation SHA(s);
- post-reconciliation final candidate SHA;
- final merged `A` SHA;
- migration list and checksums/ordinals as applicable;
- complete test command/result matrix;
- writer/readers inventory before/after;
- zero-residue cleanup report;
- API/OpenAPI/generated diff proof;
- UI surface proof;
- financial invariant proof;
- failure-injection/reconciliation proof;
- actor provenance proof;
- concurrent-delta classification;
- explicit `DECISION_REQUIRED=0`, `BLOCKER=0`, `KNOWN_FINDING_UNCLASSIFIED=0` before DONE.

## 5. Final closure predicate

Only the following state is DONE:

`ROOT_CAUSE_CLOSED = true`

AND

`PARALLEL_TRUTH = 0`

AND

`FALLBACK_AUTHORITY = 0`

AND

`DECISION_REQUIRED = 0`

AND

`BLOCKER = 0`

AND

`KNOWN_FINDING_UNCLASSIFIED = 0`

AND

`FULL_SAME_SHA_VERIFICATION = PASS`

AND

`LATEST_A_RECONCILED = true`

Anything less remains OPEN regardless of merge status or partial passing tests.
