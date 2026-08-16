# BLUEPRINT TRACEABILITY — ATTACHED SYSTEM LOGIC -> LIVE CLOSURE

Status: `PREPARE / MUST_PROVE AGAINST CURRENT b`
Purpose: reflect the attached `BTHWANI_CANONICAL_SYSTEM_LOGIC_BLUEPRINT` into this V5 package without turning the blueprint into a competing source of truth.

## 1. Governing rule

The human blueprint explains authorized product/operational meaning. Machine-enforceable product truth belongs under `governance/product/contracts/**`; implementation truth belongs to the current repository candidate; operational completion belongs to current V5 evidence.

Therefore every blueprint concept is converted into an implementation/verification obligation below.

## 2. Blueprint classification matrix

| Blueprint concept | Classification | Canonical destination / owner | Required proof before closure |
|---|---|---|---|
| System purpose and product outcomes | ADOPT/REFINE | Product Truth + PRD | every active capability maps to an outcome and owner |
| Actors/personas/service identities | ADOPT | Product Truth + Identity/Workforce | stable actor IDs, roles, scopes and service identity traced through mutations |
| Authority/ownership map | ADOPT, MUST_PROVE | Product Truth + domain owners | one authority/writer per authoritative fact/mutation; projections explicit |
| Capabilities | ADOPT | Product Truth contracts | each capability has actor, permission, journey and verification |
| Journeys | ADOPT | Product Truth + V5 coverage | entry, steps, handoffs, failures, recovery, terminal outcome |
| States/state machines | ADOPT/REFINE | canonical domain contracts/code | legal transitions and invariant checks shared across consumers |
| Cross-surface behavior | ADOPT | shared/domain bindings + surface contracts | same semantic state/outcome across client/partner/captain/field/control-panel |
| Handoffs | ADOPT | domain/event/API contracts | sender authority, receiver responsibility, correlation/idempotency, failure semantics |
| Financial rules | ADOPT only when reconciled | WLT/financial Product Truth | canonical allocation/instrument/rail/ledger owner; no frontend/caller authority |
| Provider semantics | ADOPT/REFINE | core/providers + WLT/owner contracts | provider is explicit rail/integration; callback/degraded/reconciliation semantics |
| Security/trust boundaries | ADOPT | Identity/RBAC/domain security | authn/authz/IDOR/scope/service identity/audit negatives |
| Policies vs config | ADOPT | Product Truth + platform-control | hard invariant separated from versioned policy/config/operator value |
| Decision Registry | ADOPT | governance/Product Truth + DECISIONS.md | stable decision ID, rationale, effect, supersession, implementation trace |
| Invariants Registry | ADOPT | Product Truth + code/schema/tests | every invariant has enforcement owner and negative test |
| Forbidden Architecture | ADOPT | guards + package closure law | no parallel truth, silent fallback, fake success, duplicated policy, UI authority |
| Traceability Matrix | ADOPT | COVERAGE/IMPLEMENTATION-AUDIT | no skipped material layer from decision to runtime proof |
| Ubiquitous Language | ADOPT/REFINE | Product Truth/contracts | same definitions across contracts/code/UI; aliases are explicit migrations only |
| Canonical References | ADOPT | SOURCE-MANIFEST | source hierarchy remains unambiguous |
| Generated path/file inventory | MUST_PROVE | current `b` tree | path/reachability verified at execution SHA |
| Any blueprint “done/ready” implication | REJECT_AS_AUTHORITY | V5 evidence only | same-candidate closure proof required |

## 3. Required system blueprint sections in executable form

The execution phase must materialize the following registries from current evidence. These can live in canonical Product Truth or generated V5 evidence; do not create duplicate manual truth if an existing canonical registry already owns the concept.

### BP-01 Product Outcomes

For each outcome:

- stable ID;
- actors;
- preconditions;
- owner authority;
- success definition;
- failure/recovery definition;
- consumer surfaces;
- evidence.

### BP-02 Actor and Authority Registry

At minimum cover:

- customer;
- partner/legal entity;
- store/branch operators;
- captain/driver and fleet affiliation;
- field employee;
- support/operator/admin roles;
- finance/operator roles;
- internal service identities;
- external provider identities/callback principals.

Prove identity lifecycle vs workforce profile vs domain membership/assignment are separate where semantically distinct but connected by stable IDs.

### BP-03 Capability Registry

Each capability must define:

`capability_id, actor, authority, command/read, permission, journey, state impact, data owner, surfaces, failure semantics, verification`.

### BP-04 Journey Registry

Required journey families include at least:

1. customer registration/login/session/recovery;
2. workforce creation/activation/profile/readiness/suspension;
3. partner onboarding/approval;
4. store creation/publication/visibility/serviceability;
5. catalog/content/inventory exposure;
6. customer discovery/search/store/category/product;
7. cart/quote/pricing/promotion;
8. checkout and payment allocation;
9. official-provider wallet top-up/funding;
10. order creation/confirmation/cancellation;
11. partner preparation/accept/reject/handoff;
12. captain discovery/assignment/reassignment/accept;
13. pickup/delivery/proof/COD collection;
14. wallet/ledger/collateral/exposure/custody;
15. refund/reversal/settlement/payout/reconciliation;
16. field onboarding/inspection/scope workflows;
17. support/incident/escalation/rescue;
18. control-panel approval/change-set/configuration/audit;
19. provider callback/outage/degraded/recovery;
20. notification/outbox/job retry/replay;
21. data migration/upgrade/rollback;
22. security denial/step-up/revocation/session invalidation;
23. runtime startup/readiness/dependency loss;
24. operational reporting/read-model reconciliation.

Discovery may add families; it may not silently remove these without `NOT_APPLICABLE_WITH_PROOF`.

### BP-05 State/Transition Registry

For every authoritative aggregate/lifecycle record:

- canonical state set;
- legal transitions;
- command that triggers each transition;
- actor/permission;
- guards/preconditions;
- authoritative writer;
- DB constraint where appropriate;
- emitted event/handoff;
- retry/idempotency behavior;
- invalid-transition error;
- consumer mapping.

### BP-06 Invariants Registry

Minimum invariant classes:

- identity and actor provenance;
- partner/store separation;
- store visibility/serviceability consistency;
- order lifecycle legality;
- dispatch/captain eligibility consistency;
- financial authority and arithmetic;
- no provider rail as an accidental business tender authority;
- no authoritative financial calculation in frontend;
- no duplicate posting/refund/settlement on retry;
- authorization/tenant/scope isolation;
- migration/data-integrity constraints;
- runtime fail-closed config;
- audit/correlation provenance.

Each invariant must have `ID -> owner -> enforcement -> negative test -> evidence`.

### BP-07 Handoff Registry

For each cross-owner handoff record:

- source owner;
- destination owner;
- contract/event;
- correlation ID;
- idempotency key;
- source version;
- acceptance semantics;
- timeout/unknown result;
- retry/replay;
- duplicate/out-of-order behavior;
- reconciliation owner;
- user/operator visible state.

### BP-08 Security & Trust Boundaries

Prove:

- authentication;
- authorization;
- roles/scopes;
- tenant/partner/store/actor isolation;
- IDOR protection;
- service-to-service auth;
- financial mutation authority;
- sensitive-data handling;
- audit;
- step-up/maker-checker where current product policy requires it;
- callback authenticity/provider secret handling;
- debug/test shortcuts unavailable in production authority paths.

### BP-09 Policy and Configuration Model

Every mutable rule is classified:

- `HARD_INVARIANT`
- `VERSIONED_POLICY`
- `RUNTIME_CONFIGURATION`
- `OPERATOR_CONFIGURABLE_VALUE`
- `PRODUCT_DECISION`

For versioned policy/config prove:

- owner;
- schema/type/range;
- effective-from/effective-until/version;
- audit/change-set semantics;
- downstream cache/invalidation behavior;
- historical calculation uses correct policy version where required.

### BP-10 Decision Registry

Every unresolved product choice has stable `DEC-*` ID and:

- question;
- evidence;
- alternatives;
- recommendation;
- selected value when resolved;
- rationale;
- consequences/blast radius;
- supersedes/superseded-by;
- effective date/version;
- affected Product Truth and migrations.

Resolved decisions must not remain as ambiguous questions in implementation docs.

### BP-11 Forbidden Architecture Registry

MUST NOT survive closure:

- parallel product/financial/data authority;
- frontend authoritative calculations or business transitions;
- UI-only authorization;
- manual balance/state edits outside governed commands;
- provider-specific duplicate wallets when provider is a funding rail;
- fake success before authoritative readback;
- implicit COD/financial amount or identity source;
- silent fallback;
- hidden workaround;
- duplicated business policy;
- direct API transport from UI when shared/generated binding is the governed pattern;
- caller-provided authoritative amount/state when the canonical owner must derive it;
- demo/mock/seed truth leaking into live paths;
- debug identity headers as production auth;
- old route/schema/table kept reachable after canonical cutover without a bounded migration contract.

### BP-12 Traceability Matrix

Mandatory columns:

- decision ID;
- capability ID;
- journey ID;
- invariant IDs;
- actor;
- authority owner;
- Product Truth contract;
- service/core owner;
- API/command/event;
- domain handler/module;
- DB/write model;
- integration/provider/job;
- generated client;
- binding/controller/view-model;
- surface/screen/action;
- permission;
- states;
- tests;
- runtime proof;
- cleanup/legacy status;
- candidate SHA;
- final decision.

A row is incomplete if a material field is empty without a reasoned N/A.

### BP-13 Ubiquitous Language

At minimum normalize and distinguish:

- actor/person/provider/workforce profile;
- partner/store/branch;
- captain/fleet/membership/affiliation;
- order/fulfillment/delivery/task;
- cart/quote/checkout/payment intent/allocation;
- wallet/balance/available/held/reserved/restricted;
- funding rail/payment method/provider;
- collateral/exposure/custody/debt/earning/payable;
- settlement/payout/refund/reversal;
- state/status/readiness/visibility/publication/serviceability;
- policy/config/decision/invariant.

A glossary is not sufficient if code/contracts continue using contradictory meanings; execution must migrate the semantics.

## 4. Live-repository reconciliation obligations

The current repository already has `governance/product/contracts/**` with contracts covering platform model, identity activation/sessions, administration roles/approvals/audit, captain dispatch, maps/service area/address privacy, order creation, partner onboarding/store publication, platform change sets and others. Execution must:

1. inventory all contracts at the current SHA;
2. map them to BP sections/capabilities/journeys;
3. identify coverage gaps, overlap and contradictions;
4. extend/split/supersede canonical contracts only where evidence requires it;
5. update schema validation and all generated/consuming artifacts;
6. remove any prose-only duplicate authority after promotion/cutover.

## 5. Financial blueprint reflection

The blueprint’s financial language is incorporated with these refinements:

- checkout method, funding rail, provider, instrument, wallet, allocation, ledger entry and settlement are distinct concepts;
- `official_wallet`/official-provider concepts must not become a fourth checkout method simply because a provider funds the BTHWANI wallet;
- WLT/declared canonical financial owner derives authoritative money effects; frontend and arbitrary callers do not;
- every payment/refund/settlement effect is tied to immutable lineage/evidence and idempotency;
- current WLT/PYMT/FIN/ORDER/WALLET/LEDGER/STL responsibilities must be reconciled by writer/consumer evidence, not by names;
- legacy service boundaries are deleted/retained based on canonical ownership and reachability proof.

## 6. Blueprint closure gate

The attached blueprint is considered fully reflected only when:

- every section above has a canonical owner or explicit N/A proof;
- every active capability/journey appears in traceability;
- every invariant has enforcement + negative test;
- every decision is resolved or blocks execution explicitly;
- every authoritative writer is unique and traced;
- every surface is a consumer of canonical semantics;
- every distributed handoff has failure/idempotency/reconciliation semantics;
- every trust boundary is tested;
- every mutable policy has version/config authority;
- every forbidden architecture pattern has zero reachable residue;
- evidence is from the final candidate SHA.

Until then status remains `MUST_PROVE`, never `BLUEPRINT_CLOSED`.
