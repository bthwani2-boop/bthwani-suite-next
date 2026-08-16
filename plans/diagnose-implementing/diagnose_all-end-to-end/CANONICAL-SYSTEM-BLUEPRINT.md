# BTHWANI CANONICAL SYSTEM BLUEPRINT

## 0. Document contract

This file is the human-readable target-system blueprint for the whole BThwani platform.

It defines the intended product and operational meaning required to guide reconstruction:

- actors;
- authorities;
- responsibilities;
- canonical owners;
- capabilities;
- journeys;
- states/transitions;
- handoffs;
- invariants;
- cross-surface meaning;
- financial constitution;
- security/trust boundaries;
- repository/implementation boundary rules.

It does **not** prove that current code/runtime implements the target.

Authority order remains:

`authorized Product Truth / explicit resolved product decision → current machine contracts and governance → current implementation/data/runtime evidence`

This file must never become a parallel financial, runtime, database, contract or execution source of truth. Durable machine-enforceable product truth belongs in canonical governance/product contracts. Execution completion belongs to V5 evidence on the current candidate.

## 1. System constitution

BThwani is one unified multi-surface B2B2C commerce, fulfillment, operations, workforce and financial platform.

Its surfaces are operating views over shared governed truth, not independent products.

Required principles:

1. one durable fact has one canonical owner;
2. one legal state transition has one canonical write path;
3. UI and caches collect intent/render truth but do not create server authority;
4. cross-domain effects preserve actor, correlation, idempotency and source/version provenance;
5. unknown outcomes remain explicit and reconcilable;
6. no silent fallback to local authority;
7. no parallel truth retained after canonical cutover;
8. failure/recovery is part of the product model, not test-only behavior;
9. every material visible action is reachable, authorized and tied to canonical readback;
10. cleanup and removal of superseded paths are part of DONE.

## 2. Required surfaces

### app-client

Owns no durable domain truth.

Responsibilities include:

- discovery;
- store/product browsing;
- cart;
- checkout;
- customer wallet interaction/readback;
- orders/tracking;
- support;
- ratings/feedback;
- benefits/commercial programs where authorized;
- account/profile/privacy/consent actions.

### app-partner

Owns no sovereign business truth by UI state.

Responsibilities include:

- partner/store onboarding/readback;
- catalog/assortment actions;
- order preparation;
- partner-delivery management;
- store fleet/team management;
- store-owned courier requirements/compensation configuration where supported;
- partner support;
- authorized financial readback/request intent.

### app-captain

Personal execution surface for an authenticated Captain actor.

Supports canonical mode according to primary affiliation:

- `BTHWANI`
- `PARTNER`

Responsibilities include:

- availability/presence intent where allowed;
- assignment/offer readback and acceptance;
- pickup/handoff/delivery;
- tracking;
- proof/exception handling;
- support;
- financial/collateral/custody/earning readback and governed request intent.

### app-field

Personal execution surface for Field providers.

Responsibilities include:

- activation/readiness;
- assigned onboarding/verification work;
- visits/checklists/evidence;
- store/partner onboarding support;
- bounded catalog/assortment proposal workflows;
- offline-safe task intent;
- authorized financial readback only where current product permits.

### control-panel

Governed operator control plane composed from sovereign domain owners.

Major concerns include:

- Identity/administration;
- Platform Control;
- Providers;
- Workforce/HR;
- DSH operations;
- Partner/Store/catalog/publication;
- Support/rescue;
- WLT Finance;
- analytics/read models.

A Control Panel section does not become owner merely because it renders or triggers a domain action.

## 3. Canonical domain ownership

| Durable truth class | Canonical owner | Forbidden competing authority |
|---|---|---|
| Actor identity, credentials, authentication, sessions, role/surface context | Identity | app-local session truth, client headers granting trusted context |
| Person/provider lifecycle, employment/provider profile, non-financial readiness, operational accreditation, durable suspension/absence/work windows/scopes | Workforce | DSH duplicate accreditation/suspension authority |
| Partner, Store, StoreBranch, catalog consumption/assortment, order, fulfillment, dispatch, delivery, fleet affiliation/membership, ephemeral presence/capacity, support/rescue | DSH | surface-local operational state, Workforce assignment authority |
| Wallet, ledger, payment allocation, financial balance, captain collateral, cash exposure, cash custody, debt, penalty monetary effect, commission, settlement, payout, refund, reconciliation | WLT | Workforce/DSH/frontend authoritative money |
| Platform-wide governed variables/change/rollout state | Platform Control | hardcoded UI/server duplicates |
| Provider registration/capabilities/connection policy | Providers | surface-local provider truth |
| Governed binary/document media where assigned | Media | arbitrary copied blobs/URLs used as authority |
| Analytics | Read model only | becoming source of truth for underlying fact |

A projection outside its owner is allowed only when:

- read-only;
- contractually defined;
- source/version/freshness bound when material;
- never used as a second authoritative writer.

## 4. Actor model

Each actor must have explicit:

- canonical actor identity;
- role(s);
- surface authorization;
- business scope;
- workforce/provider relation when applicable;
- financial relation when applicable;
- lifecycle;
- suspension/offboarding semantics;
- allowed and forbidden actions.

Identity, Workforce affiliation, DSH fleet/store membership and WLT financial ownership are separate concepts.

Never treat:

- membership ID as actor ID;
- Store ID as Branch ID;
- Partner ID as actor ID;
- Workforce person ID as DSH membership ID.

## 5. Canonical identifier model

Required semantically explicit identifiers include at minimum:

- `actorId`
- `captainActorId`
- `captainMembershipId`
- `workforcePersonId`
- `partnerId`
- `storeId`
- `branchId`
- `orderId`
- `assignmentId`
- `walletId`
- `ledgerEntryId`
- `paymentAllocationId`
- `financialDecisionId`
- `policyId`
- `providerTransactionId`

Across authority boundaries, identifiers must use typed/branded/domain-specific contract forms rather than generic unqualified strings where confusion is possible.

## 6. Canonical StoreBranch

The target system has a real StoreBranch entity when branch semantics are exposed.

Minimum meaning:

- unique `branchId`;
- parent `storeId`;
- address/location;
- operating hours;
- status/readiness;
- service areas;
- inventory/assortment relation where applicable;
- fleet/courier relation where applicable;
- fulfillment/delivery relation.

No post-cutover path may populate branch fields from Store or Scope IDs merely to satisfy non-null storage.

## 7. Capability contract template

Every material capability must be defined using this structure:

### CAPABILITY: `<CAP-ID> <NAME>`

- Purpose
- Product outcome
- Actors
- Authorities/responsibilities
- Required surfaces
- Explicitly excluded surfaces
- Preconditions
- Entry points
- Happy path
- Alternative paths
- Failure paths
- Recovery paths
- States
- Legal transitions
- Forbidden transitions
- Transition preconditions
- Business rules
- Decision rules
- Invariants
- Canonical owner
- Authoritative writers
- Readers
- Consumers
- Inputs/outputs
- Side effects
- Data/persistence
- Events/jobs/providers
- Authorization/object scope
- Idempotency/concurrency/replay
- Offline/reconnect/restart behavior
- Observability/audit
- Privacy/redaction
- Acceptance evidence
- Negative evidence
- Cleanup/cutover requirements

`Open material decisions: NONE` is required before an implementation frontier can execute that capability.

## 8. Journey contract

A canonical journey is recorded as:

`Actor → Entry → Preconditions → Authorization → Action → Decision Rule → Current State → Transition → Next State → Side Effects → Persistence → Handoff → Next Actor/Surface → Canonical Readback → Success/Failure/Recovery`

Every journey must answer:

- who is responsible now?
- who owns the next decision?
- what exact state changed?
- who may write it?
- what financial/data effect occurred?
- what other surfaces must observe?
- what happens on timeout/unknown outcome/retry?
- what invariant prevents unsafe progression?

## 9. Required whole-system journey families

The whole-system map must include at minimum:

### Identity/account

- actor creation;
- activation;
- login/session/refresh;
- role/surface authorization;
- logout/device rotation;
- suspension/reactivation;
- account/privacy/consent rights.

### Partner/Store

- partner onboarding;
- store creation/readiness;
- StoreBranch lifecycle;
- field-assisted and self-service onboarding convergence;
- approval/publication;
- team/fleet management;
- store suspension/offboarding.

### Catalog/discovery

- canonical taxonomy/product;
- store assortment;
- local commercial data;
- proposal/review where allowed;
- publication;
- serviceability;
- client discovery;
- stale/offline readback.

### Cart/checkout/order

- cart;
- pricing/discount/promotion;
- address/serviceability;
- fulfillment selection;
- payment allocation;
- exactly-once order creation;
- partner receipt;
- cancellation/failure.

### Fulfillment/delivery

- partner accept/preparation;
- ready-for-pickup;
- candidate discovery;
- assignment;
- reassignment;
- offer/inbox;
- accept/decline;
- pickup;
- departure;
- arrival;
- proof;
- exception;
- completion;
- support/rescue.

### Finance

- customer wallet top-up;
- captain wallet/collateral funding;
- checkout COD;
- checkout wallet;
- checkout mixed;
- authorization/capture/rollback;
- COD exposure;
- cash custody;
- settlement;
- captain earnings;
- commissions;
- partner/store settlement;
- debt/penalties;
- payout;
- refund/reversal;
- provider unknown-result/reconciliation.

### Field

- provider creation;
- activation/readiness;
- assignment;
- visit/checklist;
- evidence;
- partner/store onboarding handoff;
- catalog proposal;
- offline queue/replay/quarantine;
- escalation.

### Platform/operations

- configuration policy/version;
- provider health;
- operational intervention;
- finance maker/checker where required;
- analytics/readback;
- audit/investigation.

## 10. Financial constitution

### 10.1 Sole financial truth

WLT is the only authoritative financial owner.

Other domains may send:

- operational fact;
- immutable evidence;
- policy reference;
- order/pricing reference;
- actor/correlation/idempotency context.

They must not author authoritative monetary amount when WLT policy/lineage is responsible for deriving it.

### 10.2 Exactly three checkout choices

Customer checkout exposes:

1. COD;
2. BTHWANI Wallet;
3. Mixed.

Official banks/e-wallets/providers are funding rails into BTHWANI Wallet, not a fourth order-payment authority.

### 10.3 PaymentAllocation

One persisted server-owned numeric allocation is canonical.

Minimum invariant:

`wallet leg + cash-on-delivery leg = governed payable total`

All exposure, custody, refund and settlement logic consumes numeric allocation rather than method-name guessing.

### 10.4 BTHWANI captain collateral

BTHWANI captain has a real WLT-owned restricted collateral/guarantee position.

Required lifecycle:

- funding;
- activation/protected minimum;
- effective collateral;
- safe excess;
- exposure reservations;
- permitted setoff;
- offboarding release/refund;
- reconciliation;
- immutable ledger lineage.

Platform/Finance governs versioned minimum requirements.

Fully prepaid work consumes zero COD exposure.

COD and Mixed reserve only their actual cash leg.

Mandatory invariant:

`open cash custody + proposed new cash exposure <= effective collateral`

### 10.5 Exposure versus custody

Exposure answers:

> may the platform accept more cash risk from this captain?

Cash custody answers:

> how much physical cash has the captain collected and not yet settled?

They are never the same state.

Releasing/finalizing exposure never erases custody.

### 10.6 Store delivery finance

For partner/store delivery:

- customer sees the same three payment choices;
- store is the BTHWANI financial settlement counterparty;
- store courier may be recorded as sub-custodian evidence;
- store courier never becomes a BTHWANI captain financial liability merely by executing delivery;
- store courier salary/compensation remains store responsibility under the current product boundary;
- monthly salary implies no BTHWANI per-delivery courier entitlement;
- customer delivery fee is store economics subject to the canonical partner/platform commercial contract;
- store courier compensation is a separate store expense.

### 10.7 Penalties/debt

Platform Finance owns a versioned WLT penalty catalog.

Operations selects a policy/version against immutable incident evidence.

WLT derives/posts the financial effect.

Insufficient funds create governed debt/receivable rather than arbitrary negative spendable balance.

### 10.8 Refunds

Refund/reversal follows original immutable funding lineage and is bounded by what was actually captured/collected.

Collected cash defaults to governed wallet refund unless a true cash-refund transition is executed and evidenced.

## 11. Captain operational model

A captain has one primary dispatch affiliation at a time:

`BTHWANI XOR PARTNER`

PARTNER mode may have multiple allowed store memberships, but a captain cannot simultaneously operate as primary BTHWANI and PARTNER dispatch capacity.

One canonical eligibility semantic must govern:

- candidate discovery;
- capacity;
- manual assignment;
- automatic assignment;
- reassignment;
- governed offer visibility;
- acceptance;
- financial transition gate where applicable.

Eligibility composition includes:

- trusted identity/order context;
- fleet affiliation/membership;
- Workforce active/non-suspended/accredited/scoped/work-window truth;
- service-area authorization;
- DSH ephemeral presence/current conflict/capacity;
- WLT financial eligibility and exact cash-bearing exposure eligibility.

Required authority unavailable at a governed write means fail closed.

## 12. Field provider model

Workforce is canonical for provider/person lifecycle and non-financial readiness.

Target direction:

- one public provider-creation orchestration;
- one readiness policy;
- one canonical detail/readback model;
- one lifecycle for self-initiated and Field-assisted onboarding with provenance;
- field evidence remains evidence, not approval authority unless explicitly assigned;
- configurable vertical checklist policy where authorized;
- event/location proof without unnecessary continuous tracking;
- offline durable intent with idempotent replay and quarantine;
- no Field-owned COD or financial penalty truth.

## 13. Catalog/publication model

Canonical catalog identity/taxonomy/product does not live independently in each app.

Field/Partner may have bounded proposal/assortment/local-commercial actions where authorized.

Publication/serviceability must use one server-owned composite gate.

Client visibility can never be created by local cache, stale publication state or a UI-only decision.

## 13A. Inventory and return constitution

Inventory is authoritative operational/commercial state owned by the canonical DSH inventory boundary, not a UI counter.

Every stock-affecting journey must define:

- available/on-hand/reserved semantics;
- reserve/release/consume/adjust/return transitions;
- TTL/expiry where reservations can lapse;
- idempotency and duplicate prevention;
- concurrent oversell prevention;
- restart/replay behavior;
- reconciliation against canonical stock evidence;
- Store/Branch scope;
- historical order snapshot preservation.

Negative inventory is forbidden except through an explicit governed reconciliation/adjustment model that preserves cause and audit.

Returns are a complete cross-domain journey, not merely a refund button. They must account for:

`eligible item/quantity → approval/rule → logistics/custody → received condition → inventory/restock/disposition → WLT refund/reversal lineage → client/partner readback`

Partial return, retry, duplicate, cancellation and already-refunded quantities must be bounded by immutable order/return lineage.

## 13B. Visibility, cache and public aggregation constitution

Canonical deny always outranks stale positive cache/search/index state.

A suspended, deleted, forbidden or unpublished Store/product/content/actor cannot remain publicly eligible because an index or local cache is stale.

Ratings/reviews/public aggregates must consume the canonical moderation/publication state. Pending, rejected, disputed or non-public records cannot contribute to a public aggregate merely because an unrelated `active` flag remains true.

Any public read model must state:

- source owner;
- inclusion predicate;
- freshness;
- rebuild/reconciliation behavior;
- canonical-deny invalidation path.

## 13C. Consent, privacy and retention constitution

Consent is governed evidence, not a bare preference boolean.

Where legally/product applicable, consent records require:

- purpose/policy/version;
- accepted/revoked timestamps;
- source/surface;
- actor;
- provenance/audit;
- jurisdiction/legal-basis fields only when authoritative policy requires them.

No retention duration is invented by implementation. The mechanism must support policy-driven classes for high-frequency location, delivery/incident evidence, Partner/Workforce documents, account deletion/anonymization, financial/legal records, security/audit and consent evidence.

Account deletion does not fabricate erasure of records that must legally/financially remain; instead use governed deletion/anonymization/retention semantics.

## 13D. Provider, media, notification and observed-health constitution

Provider desired configuration and observed health are distinct truths.

`ProviderConfig / CredentialsReference / MaintenanceState` are governed desired state.

`ObservedHealth / LastCheck / DegradedReason` are runtime evidence and cannot be authored by an operator as if observed.

Media bootstrap/provisioning is separate from readiness. Readiness is read-only:

- optional + disabled → N/A;
- required + unconfigured → NOT_READY;
- configured + inaccessible → NOT_READY;
- configured + healthy → READY.

Media must also define ACL/download authorization, public/private visibility, URL/token expiry, metadata, retention/redaction and orphan/deleted-target cleanup.

Notifications are durable delivery work where material. Account for producer, audience/scope, consent policy, device endpoint registration/rotation/deactivation, dedupe/idempotency, retry/backoff/DLQ, delivery status, safe deep-link/action routing and privacy-safe payloads.

## 14A. Platform change-set constitution

A control-plane change request is not equivalent to applied runtime truth.

Material platform changes require explicit semantics such as:

`REQUESTED → APPROVED → APPLYING → APPLIED/FAILED → OBSERVED/RECONCILED`

or the canonical equivalent.

Approval, application and observed readback may have different authorities. A UI or database request record cannot claim completion before the authoritative target readback proves the effective state.

## 14. Control Panel model

Control Panel is a governed composition plane.

For each section/action define:

`section → displayed fact → canonical owner → command owner → authorization → object scope → idempotency/version → persistence → audit → readback`

No section may:

- author WLT money outside WLT;
- author Identity truth outside Identity;
- turn provider health config into health fact;
- bypass Workforce/DSH ownership;
- mutate by client-selected trusted context alone.

## 15. Client model

Client-visible success must follow canonical committed readback where server truth is required.

Specific high-risk classes:

- checkout/payment;
- subscriptions/commercial programs;
- privacy/consent/account rights;
- support;
- refunds;
- order status.

Financial mutation intent must survive crash/relaunch/retry through durable idempotency identity rather than component-memory-only state.

## 16. Failure/recovery constitution

Every critical journey challenges:

- missing dependency;
- timeout;
- unknown result;
- duplicate/replay;
- payload-divergent idempotency retry;
- stale version;
- concurrent transition;
- service restart;
- offline/reconnect;
- partial provider callback;
- outbox/job retry;
- DLQ/manual recovery where applicable;
- old/new data coexistence during migration;
- compensation/reconciliation;
- unauthorized/wrong-scope/wrong-ID attempts.

Operational success may not silently hide required financial failure.

## 17. Security/trust constitution

Mandatory principles:

- trusted context is server-derived;
- object/business scope checked server-side;
- IDOR negative tests for all scoped entities;
- role/surface separation;
- secrets never treated as product config or telemetry;
- sensitive financial/provider data redacted by surface;
- actor/correlation provenance for governed writes;
- maker/checker/separation of duties for protected finance/platform actions where required;
- app/session state cannot impersonate another actor.

## 18. Policy versus invariant versus config

Never mix:

### Invariant

Cannot be changed without changing the product constitution.

Example:

`WLT owns authoritative financial truth.`

### Versioned policy

Governed business rule that can evolve.

Example:

`minimumCaptainCollateral = X effective from version V`.

### Runtime configuration

Technical deployment/runtime value.

Example:

`API base URL`.

### Operator choice

Allowed bounded selection under policy.

Example:

Operations selects a penalty policy.

No mutable operator field may silently redefine an invariant.

## 19. Canonical repository architecture rules

Final repository tree is derived from canonical ownership, not from preserving old folder names.

Every target directory must define:

- purpose;
- owner;
- allowed contents;
- forbidden contents;
- dependency direction;
- public boundary;
- generated versus handwritten source;
- tests;
- migration/cutover relation.

No `legacy`, `old`, `final2`, `backup`, `temp`, `compat` container may become a permanent substitute for cleanup.

Git is history.

## 20. Traceability chain

Every material capability should be traceable through:

`Product outcome → Decision → Rule/Invariant → Journey → State transition → Owner → Contract/API → Domain logic → DB transaction → Event/side effect → Canonical readback → Surface → Test → Runtime verification`

Reverse trace from a material file should answer why it exists, who owns it, what capability it serves, who consumes it and how it is verified.

## 21. Blueprint completion rule

This blueprint is preparation-complete when:

- every material capability has an owner;
- every material journey is inventoried;
- every critical state/handoff is defined;
- no known material product/architecture decision remains non-derivable and unresolved;
- target ownership and dependency direction are coherent;
- target repository structure can be designed without inventing product semantics;
- implementation agents can execute without choosing competing sources of truth.

It does not require pre-specifying every helper function or cosmetic implementation detail.
