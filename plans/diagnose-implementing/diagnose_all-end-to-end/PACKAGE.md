# V5 Execution Package — diagnose_all-end-to-end

## 0. Package contract

- Schema: `BTHWANI_PACKAGE_V5`
- Active continuing package: `plans/diagnose-implementing/diagnose_all-end-to-end`
- Integration branch: `A`
- Consolidation base: `232f2678101447844415e159edbf3dde2dd77f38`
- Mode represented here: diagnosis/decisions consolidated; runtime execution not yet performed
- `DECISION_REQUIRED = 0`
- Default posture: `FAIL_CLOSED`
- `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`
- Applied migrations: immutable history; corrective changes are forward-only
- Parallel source of truth/fallback after cutover: forbidden

Before execution, before any merge/rebase/reconciliation decision, after any related foreign delta, and immediately before final merge, re-resolve the latest `A` and pin exact SHAs.

## 1. Operational root

Bthwani must have one canonical source of truth for every durable business fact and decision across customer payment, wallet funding, captain collateral/COD, store delivery, eligibility, settlement, penalty, refund, identity boundaries and all consuming surfaces.

Execution is driven by root cause and dependency graph, not file order.

## 2. Root-cause priority

### Highest systemic root

`RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION`

### Coupled roots

1. `RC-MONETARY-FACT-OWNERSHIP-SPLIT` — P0
2. `RC-CAPTAIN-OPERATIONAL-ELIGIBILITY-AUTHORITY-SPLIT` — P0
3. `RC-STORE-DELIVERY-FLEET-COMPENSATION-PARALLEL-TRUTH` — P1
4. `RC-IDENTIFIER-SEMANTIC-OVERLOADING` — P1
5. `RC-DISTRIBUTED-FINANCIAL-OBLIGATION-BEST-EFFORT` — P1
6. `RC-SERVICE-AREA-CAPACITY-TRUTH-DRIFT` — P1
7. `RC-AVAILABILITY-AND-SUSPENSION-SEMANTIC-OVERLAP` — P1
8. `RC-ACCREDITATION-PARALLEL-AUTHORITY` — P1
9. `RC-GOVERNANCE-AUTHORITY-DRIFT` — P2
10. `RC-ORDER-ACTOR-PROVENANCE` — P2/HOLD until higher systemic contracts stabilize

## 3. Execution frontier

### F0 — Pin, reconcile and freeze authority/evidence

Actions:

- re-pin latest `A` and isolated task SHA;
- inventory all affected writers/readers/consumers/contracts/data/runtime paths;
- create machine-readable authority registry;
- enumerate all money writers and caller-authored monetary inputs;
- enumerate all eligibility writers/evaluators;
- enumerate all ambiguous identifier boundaries;
- enumerate checkout/payment enums and all `official_wallet` usage;
- enumerate legacy store-courier identity/pricing sources;
- enumerate branch/store/scope ID semantics;
- enumerate distributed required WLT calls and ignored/best-effort patterns;
- classify any concurrent/foreign delta;
- prove `DECISION_REQUIRED=0` remains valid.

Gate F0:

- no unresolved canonical owner;
- no unclassified monetary writer;
- no unclassified eligibility writer;
- no unclassified identifier boundary;
- no unclassified relevant legacy store-courier source;
- no material product decision required.

### F1 — Canonical WLT financial primitives

Implement/reconcile WLT-owned primitives for:

- restricted BTHWANI captain collateral/guarantee position;
- protected minimum and releasable excess;
- persisted PaymentAllocation financial dimensions;
- exact COD/Mixed cash exposure reservation;
- physical cash custody distinct from exposure;
- receivable/debt;
- penalty policy/version and derived amount;
- refund/reversal lineage;
- partner/store settlement evidence derivation;
- actor/correlation/idempotency/source-version metadata.

DB constraints should enforce locally provable invariants such as nonnegative amounts, allocation arithmetic, referential integrity and exclusivity where appropriate.

Gate F1:

- WLT is the only authoritative writer for affected monetary facts;
- no guarantee/exposure/custody semantic conflation remains in canonical WLT model;
- caller cannot override policy/lineage-derived money;
- PostgreSQL concurrency/idempotency/invariant tests pass.

### F2 — Remove monetary authority from Workforce/DSH/callers

Cut:

- Workforce financial guarantee fields/arithmetic/write gates;
- caller-proposed penalty amount;
- caller-authoritative partner gross settlement;
- caller-authoritative refund source;
- DSH/WLT reservation caller amount authority where WLT can derive/verify canonical cash leg;
- duplicate financial eligibility calculations/projections used as write authority.

Gate F2:

- adversarial whole-target search proves zero authoritative monetary writers outside WLT for this scope;
- old writable DTO/OpenAPI/generated/UI controls removed;
- callers cannot override WLT canonical amount/source decisions.

### F3 — Canonical checkout and PaymentAllocation

Implement exactly three customer UX choices:

- COD;
- BTHWANI Wallet;
- Mixed.

Persist exact numeric allocation and cut all financial consumers to it.

External official banks/e-wallets/providers move exclusively into top-up/funding journeys.

Gate F3:

- `official_wallet` absent as checkout authority across backend/DB/contracts/generated/apps/tests/docs;
- arithmetic is exact/persisted;
- Mixed cash leg participates in every relevant risk/custody/refund/settlement rule;
- external provider credit is idempotently reflected in WLT before wallet spending.

### F4 — WALLET and MIXED complete E2E payment lifecycle

Implement/prove:

`checkout -> WLT authorization/funding -> order confirmation -> capture -> rollback/unknown-result -> retry/reconciliation -> canonical readback`

For Mixed, wallet and cash legs remain independently accountable throughout cancellation/failure/refund.

Gate F4:

- no primitive-only false DONE;
- no order/wallet state divergence hidden by timeout;
- duplicate/retry is idempotent;
- rollback/reconciliation is deterministic;
- Mixed cash leg never bypasses COD financial controls.

### F5 — BTHWANI collateral/exposure/custody/settlement lifecycle

Implement:

- activation baseline collateral;
- protected minimum;
- exact cash exposure reservation;
- rolling invariant `openCashCustody + newCashExposure <= effectiveCollateral`;
- actual collection opens custody;
- deadline/shift/day settlement;
- safe excess release;
- debt/hold/setoff policy;
- offboarding close/release/refund.

Gate F5:

- prepaid orders create zero COD reservation;
- low collateral blocks COD/Mixed safely;
- reservation release/finalization cannot erase custody;
- overdue custody blocks new cash exposure as policy requires;
- concurrent release/assignment cannot breach protected collateral;
- app-captain/control-panel readback matches WLT.

### F6 — Canonical captain eligibility and service-area/capacity semantics

Implement one composed eligibility contract across:

- candidate discovery;
- capacity forecast;
- manual assignment;
- automatic assignment;
- reassignment;
- inbox/offer visibility where governed;
- acceptance;
- relevant financial transition gates.

Inputs include Identity/order context, DSH primary affiliation/membership, Workforce active/suspension/accreditation/scopes/work-window, DSH presence/conflicts/capacity and WLT financial/exact cash eligibility.

Gate F6:

- one semantic result across all consumers;
- wrong area, wrong affiliation, suspension, stale decision, insufficient collateral and required dependency failure fail closed;
- capacity counts only truly eligible scoped captains;
- no offer-created-but-immediately-ineligible inconsistency from omitted gates.

### F7 — Fleet, accreditation and presence authority cutover

Implement:

- exclusive primary `BTHWANI XOR PARTNER`;
- explicit partner-store memberships;
- audited transfer lifecycle;
- Workforce-only general operational accreditation;
- Workforce durable suspension/absence/work windows;
- DSH ephemeral online/offline/available/busy presence only.

Gate F7:

- no duplicate accreditation writer;
- no DSH durable suspension authority;
- transfer checks active assignments/exposure/custody/debt/holds;
- partner membership does not replace primary affiliation.

### F8 — Explicit identifiers and canonical StoreBranch

Implement explicit/branded IDs across DB, Go, TS, OpenAPI, generated clients, events, audit and UI state.

Required resolution:

`captainMembershipId -> DSH Fleet -> captainActorId -> Workforce`

Implement real canonical StoreBranch and migrate branch-named fields that contain Store/Scope IDs.

Gate F8:

- wrong identifier class rejected;
- zero membership-as-actor call;
- zero store/scope-as-branch fallback;
- branch FKs and all related service-area/inventory/delivery links are coherent.

### F9 — Partner/store delivery canonical cutover

Converge on:

- Workforce canonical person/provider;
- DSH canonical primary affiliation + store membership + task;
- app-captain PARTNER execution mode;
- app-partner management surfaces;
- same three customer tender choices;
- store as financial settlement counterparty;
- store courier as sub-custodian evidence only;
- store-owned payroll/compensation;
- store-owned optional collateral requirement/evidence;
- monthly salary => zero per-delivery BTHWANI entitlement;
- delivery fee remains store gross economics subject to contract.

Remove legacy free-text courier identity and parallel courier pricing source.

Gate F9:

- no `courierName`/`courierPhone` parallel identity authority;
- no parallel `pricingSource` calculation authority;
- no partner courier reaches BTHWANI captain commission/collateral/debt/payout/payroll writer;
- partner settlement derives/verifies immutable canonical evidence in WLT;
- app-partner cannot weaken platform safety baseline.

### F10 — Penalty, debt, refund and reversal closure

Complete:

- versioned WLT penalty catalog;
- Operations selects policy, not amount;
- insufficient balance -> WLT receivable/debt;
- exact original funding-lineage refund;
- true evidenced cash-refund path only where supported;
- anti-over-refund and idempotent reversal protections.

Gate F10:

- caller arbitrary penalty amount rejected;
- caller arbitrary refund source rejected;
- refund/reversal bounded by original immutable lineage;
- retry cannot double debit/credit;
- policy-authorized setoff only.

### F11 — Durable distributed financial obligations

Replace best-effort required finance mutations with durable state machines/outbox/saga semantics across relevant order/payment/assignment/delivery/settlement/refund/promotion/coupon flows.

Gate F11:

- failure injection cannot produce hidden operational-complete/finance-lost state;
- unknown-result state is explicit and operable;
- retry/recovery/reconciliation deterministic and idempotent;
- no ignored required WLT call remains.

### F12 — Actor provenance repair

Return to `RC-ORDER-ACTOR-PROVENANCE` only after higher contracts stabilize.

Diagnose/fix the exact DSH consumer compilation failure from run `31908535848` before rerunning.

Gate F12:

- every relevant writer persists trusted actorId when known;
- unknown historical actor remains unknown;
- forward migration safe;
- DSH backend consumers compile/test;
- OpenAPI/generated clients pass;
- full DSH tests/static checks pass;
- app-captain smoke where affected passes;
- operator readback/client-partner redaction passes;
- no governed final commit before all gates.

### F13 — Multi-surface cutover, physical cleanup and adversarial verification

Update/verify:

- app-client;
- app-captain;
- app-partner;
- app-field where provider/scopes intersect;
- control-panel Platform/Operations/Finance/Partner;
- shared sovereign frontend packages;
- OpenAPI/generated clients;
- analytics/audit;
- DB/events/jobs/reconciliation;
- governance/authority registry.

Execute `CLEANUP.md` fully and run the same-SHA matrix:

1. supported PostgreSQL migrations fresh + upgrade;
2. DB constraints/invariants;
3. writer/reader/source inventory;
4. PaymentAllocation arithmetic;
5. collateral/exposure/custody concurrency;
6. penalty/debt/refund/settlement idempotency;
7. wrong-authority/wrong-ID/wrong-store/wrong-area negatives;
8. service-area/fleet/eligibility consistency;
9. provider funding callback/unknown-result/reconciliation;
10. WALLET/MIXED complete E2E;
11. distributed failure/recovery;
12. OpenAPI/generated clients;
13. affected Go tests/static checks;
14. affected TS typechecks/builds;
15. app/control-panel smoke/readback;
16. privacy/redaction/audit;
17. zero-residue cleanup;
18. governance drift.

Gate F13: every mandatory item passes on the same candidate SHA with fresh evidence.

### F14 — Latest-A reconciliation and final closure

Immediately before merge:

- fetch/re-resolve latest `A`;
- compare candidate vs current `A`;
- classify all concurrent delta as disjoint/related/overlap/conflict/authority-change;
- reconcile related/overlap/authority changes;
- rerun every affected gate after reconciliation;
- re-pin final candidate SHA;
- merge only via governed repository path;
- verify `A` contains the candidate;
- read back final files/runtime metadata/evidence.

No final status may use evidence from a pre-reconciliation candidate.

## 4. Required canonical invariants

### Ownership

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

`primaryAffiliation ∈ {BTHWANI, PARTNER}` and never both simultaneously.

### Accreditation

`generalOperationalAccreditationWriter == Workforce`

### Presence

`durable suspension/absence != DSH ephemeral presence`

### Identifier semantics

`membershipId != actorId by contract/type`

`branchId != storeId/scopeId by semantic contract`

### Partner finance isolation

`store courier physical custody != BTHWANI captain financial counterparty`

### Salary semantics

`store monthly salary mode => BTHWANI per-delivery courier entitlement = 0`

### Refund

`refund <= refundable original lineage`

and mutable caller source cannot override lineage.

### Provenance

`trusted actor known => canonical event actor provenance present`

`historical actor unproven => remains unknown`

## 5. Stop-the-line blockers

Execution remains OPEN if:

- a new product/authority ambiguity cannot be derived from evidence;
- latest `A` introduces conflicting authority change;
- another monetary/eligibility writer is discovered after cutover;
- migration would require fabricated financial/provenance facts;
- required financial dependency failure is still best-effort;
- any surface writes old truth;
- generated clients/contracts disagree with runtime;
- final mandatory tests run on different SHAs;
- cleanup leaves unclassified residue;
- required dependency outage triggers local monetary/eligibility fallback;
- store-courier compensation/collateral accidentally turns into BTHWANI liability without an explicit new product decision.

## 6. Finding disposition contract

Every known finding must end as one of:

- `FIXED_BY_CODE`
- `KEEP_ACTIVE_WITH_MACHINE_PROOF`
- `FALSE_POSITIVE_WITH_MACHINE_PROOF`
- `BLOCKED_EXTERNAL_ONLY`

`LEAVE_OPEN`, internal blocker, report-only fix, manual zeroing, parallel fallback and undocumented scope drop are not closure states.

## 7. Evidence bundle required for final closure

Record:

- original and reconciled base SHA;
- implementation SHA(s);
- post-reconciliation final candidate SHA;
- final merged `A` SHA;
- migration list/checksums/ordinals as applicable;
- complete test command/result matrix;
- writer/readers/routes/events/UI/generated inventory before/after;
- authority registry snapshot;
- zero-residue cleanup report;
- OpenAPI/generated diff proof;
- multi-surface proof;
- financial invariant/concurrency/idempotency proof;
- provider funding and WALLET/MIXED E2E proof;
- failure-injection/reconciliation proof;
- partner/BTHWANI isolation proof;
- actor provenance/redaction proof;
- concurrent-delta classification;
- explicit `DECISION_REQUIRED=0`, `BLOCKER=0`, `KNOWN_FINDING_UNCLASSIFIED=0` before DONE.

## 8. Final closure predicate

DONE only when:

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

Anything less remains OPEN regardless of merge status, document completeness or partial passing tests.
