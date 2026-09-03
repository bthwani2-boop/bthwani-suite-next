# BThwani Durable Capability Catalog

ARTIFACT_CLASS: DURABLE_PRODUCT_CAPABILITY_GOVERNANCE
SEMANTIC_OWNER: governance/product/CAPABILITIES.md
EXECUTION_AUTHORITY: NONE
CLOSURE_AUTHORITY: NONE
IMPLEMENTATION_STATE_AUTHORITY: NONE

## Purpose

This file owns stable capability-level Product/System meaning: outcome, actors, canonical owner boundaries, business invariants, forbidden outcomes and acceptance expectations.

It deliberately excludes current route names, operation IDs, database table names, screen/component filenames and generated-client inventories. Those are implementation state and must be derived from executable source.

```text
CAPABILITY_MEANING != IMPLEMENTATION_INVENTORY
```

Cross-capability financial rules are owned by `FINANCIAL-MODEL.md`; cross-surface UX rules are owned by `EXPERIENCE-AND-DESIGN.md`.

## Catalog

### ADMINISTRATION_ROLES_APPROVALS_AUDIT — الإدارة والأدوار والاعتمادات والتدقيق

**Required outcome.** Administration role and approval changes are surface-scoped, independently approved, version-fenced, auditable and reversible without moving Identity, Workforce, partner lifecycle or credential truth into DSH Administration.

**Primary actors.** operator-role-maker, operator-role-checker, operator-auditor, role-beneficiary.

**Canonical ownership.** DSH administration workflow; Identity owns authentication; Workforce owns workforce truth; DSH owns partner lifecycle.

**Material deployable surfaces.** control-panel.

**Business invariants**
- DSH Administration owns its role-definition/approval/audit workflow but not Identity authentication truth, Workforce profile/credential truth, or partner lifecycle truth.
- Approved means the canonical downstream mutation succeeded, canonical owner readback proved the resulting truth, and administration finalization committed.
- Pending execution states are non-applied and must not be consumed as effective RBAC truth.
- Rejected requests have no executable canonical mutation intent.
- A failed-terminal request is immutable; recovery supersedes it and creates exactly one fresh pending request against current canonical version.
- Rollback appends an independently approved inverse decision and never deletes the source decision or audit trail.

**Forbidden/negative invariants**
- No direct role creation/assignment/revocation without governed approval.
- No maker, beneficiary, or disallowed previous checker approves the affected decision.
- No broad identity role label bypasses exact administration operation permission.
- No approval queue is readable through unrelated generic permission.
- No failed-terminal request is replayed, reset, edited, or replaced more than once.
- No phone, document, session, secret, partner review note, captain license number or equivalent sensitive sovereign data becomes administration truth.
- No partner activation/captain credential projection or mutation is owned by Administration.
- No audit history is deleted or rewritten through ordinary application paths.

**Acceptance expectations**
- Role definitions persist normalized operation permissions and explicit surface scope with control-panel mandatory for administration capability.
- Role definition and staff role changes use maker-checker approval with canonical role-version conflict protection.
- A failed-terminal request is recovered only by one atomic supersede-and-replace operation followed by fresh independent approval.
- Approved assignment or revocation decisions are reversed only through a separate independently approved inverse request.
- Audit writes avoid raw reason/review-note sensitive values, audit readback is redacted, and ordinary update/delete of audit history is rejected.
- Approval queues require their exact checker permissions and cannot be listed through a generic administration-read permission alone.
- The administration permission boundary has no broad operator-role bypass and does not propagate unnecessary PII.
- Partner lifecycle and captain credential/workforce reads and mutations remain at their sovereign owners; administration delegates to those owner surfaces/contracts rather than maintaining local truth.

**Named failure classes:** direct_unapproved_role_mutation, maker_self_approval, beneficiary_self_approval, rollback_checker_not_independent, broad_role_bypass, failed_terminal_intent_replayed_or_edited, duplicate_replacement_request, audit_history_mutated, sensitive_data_in_audit_or_diagnostics, parallel_partner_or_workforce_truth.

### CAPTAIN_DISPATCH — إسناد الكابتن والتوزيع

**Required outcome.** Each eligible ready order has at most one active concurrency-safe DSH dispatch offer/assignment, with truthful captain decision and customer/operator readback.

**Primary actors.** operator, captain, client, system.

**Canonical ownership.** DSH operational dispatch; Workforce eligibility; WLT financial effects.

**Material deployable surfaces.** control-panel, app-captain, app-client.

**Business invariants**
- DSH owns dispatch offer, assignment and reassignment operational truth.
- Eligibility combines current order readiness, service area, captain accreditation/availability and capacity required by the active model.
- One order has at most one active assignment and one captain cannot exceed governed capacity under concurrency.
- Offer expiry and captain rejection are durable dispatch decisions with canonical readback.
- WLT remains the owner of any financial consequence associated with assignment/delivery.

**Forbidden/negative invariants**
- No assignment is created from captainId alone without the governed scope/identity required by current contracts.
- No frontend computes final eligibility or capacity authority.
- No acceptance occurs after offer expiry.
- No two active assignments exist for one order.
- No concurrent dispatch exceeds captain capacity.
- No cross-context assignment read/write is permitted.
- No non-atomic reassignment leaves zero or two live assignment truths.
- No customer/captain surface uses hardcoded or fabricated order/address/financial truth.
- No DSH dispatch path mutates WLT balance, commission or settlement truth.

**Acceptance expectations**
- An offer is created only for a BThwani-delivery order that is ready_for_pickup and service-area eligible.
- Only an eligible available captain with required service-area affiliation and remaining capacity is offered the order.
- Offer creation and reassignment are protected by idempotency plus transactional/concurrency controls.
- The captain receives the governed order/zone/distance/priority/reason/response-window data required for the decision.
- Only the authenticated captain can accept or reject that captain's live offer, and rejection records a reason.
- An expired offer cannot be accepted and returns the order to its governed ready-for-dispatch state when applicable.
- Cancellation/reassignment is forbidden after pickup execution begins.
- The operator sees active assignment, eligible alternatives and real decision history.
- The client sees only customer-safe tracking consequences, not internal eligibility/capacity/operations decisions.

**Named failure classes:** offer_for_ineligible_order, ineligible_captain_offered, duplicate_active_assignment, captain_capacity_exceeded, expired_offer_accepted, cross_captain_action, cross_context_assignment_read, non_atomic_reassignment, reassignment_after_pickup, frontend_or_local_dispatch_truth, dsh_financial_truth.

### IDENTITY_ACTIVATION_SESSIONS

**Required outcome.** One Identity actor and session source serves every required surface with governed provisioning, exact idempotency, trusted context, and durable readback.

**Primary actors.** customer, partner, captain, field, operator, workforce-service.

**Canonical ownership.** Identity.

**Material deployable surfaces.** app-client, app-partner, app-captain, app-field, control-panel.

**Business invariants**
- Identity exclusively owns actor accounts, canonical identifiers, authentication state, and sessions.
- Workforce supplies professional intent but never writes Identity persistence directly.
- Internal callers authenticate as a service and cannot become the source of operator context.
- Every actor provisioning and session mutation has durable owner readback.

**Forbidden/negative invariants**
- No browser or mobile client calls internal actor administration routes.
- No idempotent provisioning retry expands roles or permissions.
- No actor identifier or header supplied by a client grants object access.
- No mock, fixture, local storage value, or Markdown declaration becomes production Identity truth.
- No execution agent grants product, QA, security, release, or production approval.

**Acceptance expectations**
- Health remains liveness-only and readiness fails closed for configuration, database, migration, relation, and clock failures.
- An exact canonical phone, username, role, and trusted operator-context provisioning retry returns one durable actor.
- A retry that changes any provisioning fingerprint field fails without role or permission expansion.
- Internal search and direct read are stable, paginated, service-authenticated, and operator-context isolated.
- Activation is typed, surface-bound, short-lived, single-use, attempt-limited, and never logged in raw form.
- Refresh rotates atomically, reuse is rejected, and logout or deactivation revokes applicable sessions.
- Every required surface exposes explicit loading, expired, forbidden, blocked, unavailable, and recovery states.

**Named failure classes:** duplicate_actor, provisioning_fingerprint_mutation, client_context_override, cross_context_read, stale_migration_ready, activation_replay, refresh_reuse, secret_or_pii_leak, parallel_identity_truth.

### MAPS_SERVICE_AREA_ADDRESS_PRIVACY — الخرائط ومناطق الخدمة وخصوصية العناوين

**Required outcome.** Clients and operators use one DSH-governed service-area/address truth backed by normalized provider data, valid geometry and a deterministic privacy lifecycle.

**Primary actors.** authenticated_client, authorized_operator, privacy_worker.

**Canonical ownership.** DSH service-area/address/privacy truth; maps are an external integration adapter.

**Material deployable surfaces.** app-client, control-panel.

**Business invariants**
- External map resolution is normalized at the provider boundary; DSH owns service-area/geofence and client-address operational truth.
- Address privacy retention/anonymization/audit is governed by DSH-owned policy/state for this capability.
- A client address is serviceable only when canonical coordinates resolve to an active applicable service area.
- Privacy audit/read models intentionally exclude raw client/address PII.

**Forbidden/negative invariants**
- No client surface calls a map provider directly as canonical Product/System truth.
- No malformed/incomplete provider result becomes operational truth.
- No client-supplied service-area identifier is trusted without active geofence resolution.
- No active address write succeeds without required coordinates.
- No invalid polygon topology reaches service-area truth.
- No privacy-policy mutation bypasses version/idempotency checks.
- No anonymization retry creates a second run result.
- No raw client ID, recipient name, phone, address text, instructions or coordinates appear in privacy audit responses.
- No cross-actor address PII access is permitted.
- No runtime mock/fallback establishes map, address, service-area or privacy truth.

**Acceptance expectations**
- Search input and provider results are normalized and malformed/incomplete results fail closed.
- Reverse geocoding validates coordinates/results before DSH service-area resolution.
- Provider health distinguishes unavailable, not-configured and uncertain-result states instead of treating configuration as health.
- Service areas expose governed polygon coordinates/bounds/state/priority/version needed by authorized operations.
- Service-area writes are versioned, idempotent, audited and reject zero-area, duplicate-edge and self-intersecting polygons through authoritative application/data invariants.
- Client address create/update requires coordinates resolving to the supplied/expected active canonical geofence.
- Deleted-address PII follows a versioned retention policy with observable due-work status.
- Due anonymization uses one stable run identity and is retry-safe/concurrency-safe.
- Privacy audit/readback structurally excludes raw client and address PII.

**Named failure classes:** direct_provider_client_truth, malformed_provider_result_accepted, client_selected_service_area_without_resolution, address_without_coordinates, invalid_polygon_persisted, privacy_policy_without_version_or_idempotency, duplicate_anonymization_result, raw_address_pii_in_privacy_audit, cross_actor_address_access, runtime_mock_or_fallback_truth.

### ORDER_CREATION — إنشاء الطلب وحقيقة الطلب

**Required outcome.** One eligible checkout intent yields one canonical DSH order with durable accepted snapshots, authorized multi-surface readback and WLT-owned financial projection semantics.

**Primary actors.** client, partner, operator, system.

**Canonical ownership.** DSH operational order truth; WLT financial truth.

**Material deployable surfaces.** app-client, app-partner, control-panel.

**Business invariants**
- DSH owns order operational truth; WLT owns financial truth.
- A canonical eligible checkout/idempotency scope yields at most one order.
- Accepted commercial/address/item snapshots required by the contract remain stable after creation unless a later explicit legal transition governs a change.
- All required surfaces consume one authorized DSH order truth and bounded WLT-backed financial projection.
- Required operational event/outbox state follows the same transactional consistency guarantees as order creation.

**Forbidden/negative invariants**
- No order is created from an invalid/ineligible checkout intent.
- No duplicate order is created for one canonical checkout/idempotency scope.
- No accepted snapshot is silently re-derived from live catalog/address state.
- No frontend derives allowed business actions solely from a local status label.
- No surface exposes full address PII to an actor that does not operationally require it.
- No DSH/frontend path performs debit, refund, settlement or balance mutation as order-creation truth.

**Acceptance expectations**
- One checkout intent/canonical idempotency scope creates at most one order even under concurrent retry.
- The created order carries the governed identifiers/versioning required for subsequent concurrency-safe transitions.
- Order items, prices, currency, address and fulfillment snapshots required by the contract are fixed at creation and are not re-derived from live catalog state.
- Client, partner and operator readbacks expose the same operational truth with actor-appropriate redaction.
- Payment state is a read-only WLT-owned projection and DSH performs no authoritative financial mutation for order creation.
- Required operational event/outbox effects are persisted with the order under the required transactional discipline and remain retry/reconciliation safe.
- Affected surfaces expose truthful loading/empty/offline/forbidden/conflict/partial/error/retry states without mock/local truth.
- Every read/write is scoped by trusted context plus actor/object authorization and produces attributable correlation/audit evidence where required.

**Named failure classes:** ineligible_checkout_created, duplicate_order_for_checkout, snapshot_repriced_or_rebound, frontend_status_authority, cross_scope_order_access, address_pii_overexposed, dsh_financial_mutation, success_without_canonical_readback.

### PARTNER_FLEET_CONNECTION

**Required outcome.** Partner, captain, and operator surfaces observe one versioned DSH fleet truth while code material remains secret and every lifecycle mutation is scoped, audited, notified, and recoverable.

**Primary actors.** partner-operator, captain, control-panel-operator.

**Canonical ownership.** DSH partner-fleet operational truth; Identity authenticates actors.

**Material deployable surfaces.** app-partner, app-captain, control-panel.

**Business invariants**
- DSH owns partner fleet membership truth.
- Identity authenticates actors while DSH authorizes store and team scope.
- Every surface reads the same persisted membership and connection lifecycle.
- Every mutation is versioned, trusted-scope checked, audited, and notified.
- Captain identity uniqueness is scoped to one store so governed multi-store membership remains possible.
- Fleet lifecycle audit facts remain durable even when a transition does not change team-member status.

**Forbidden/negative invariants**
- no plaintext code persistence
- no code hash exposure
- no cross-partner/store trusted-scope access
- no cross-captain membership access
- no duplicate captain membership inside one store
- no inactive-store binding
- no expired or revoked code reuse
- no unaudited lifecycle transition
- no stale overwrite
- no operator mutation through the readback surface

**Acceptance expectations**
- Only an authenticated partner for the owned store can issue list or revoke a code.
- Partner surfaces visibly render pending redeemed revoked and expired connection states.
- Only an authenticated captain can redeem a valid pending code or disconnect an owned membership.
- A captain may hold memberships in multiple stores but cannot hold duplicate memberships inside one store.
- Plaintext codes are returned once and never persisted.
- Expired codes become durably expired, create an audit action and partner notification, and cannot be redeemed.
- Inactive stores and ineligible courier records fail closed.
- Optimistic versions protect revoke redeem and disconnect transitions.
- Disconnect suspends the member, records the governed lifecycle event, revokes the redeemed connection, and notifies both actors.
- Control-panel readback is redacted and requires current operator/partner read authorization.
- OpenAPI responses are typed and do not expose code hashes or plaintext outside issuance.

**Named failure classes:** cross-store partner access, cross-captain membership access, plaintext or hash leakage, expired or revoked code redemption, inactive-store binding, duplicate captain membership inside one store, unaudited lifecycle transition, missing lifecycle notification, stale overwrite, local surface fleet truth.

### PARTNER_ONBOARDING_STORE_PUBLICATION

**Required outcome.** A partner can be onboarded from field draft to a client-visible first store through one traceable trusted-context-aware state model, while Partner/Store business ownership is explicit and WLT exclusively owns raw payout details.

**Primary actors.** field-agent, partner-owner, control-operator, client.

**Canonical ownership.** DSH partner/store operational truth; WLT payout-destination truth; Identity trusted context.

**Material deployable surfaces.** app-client, app-partner, app-field, control-panel.

**Business invariants**
- Every partner/onboarding child record belongs to the trusted platform/operator context and explicit Partner/Store business scope required by the current model.
- One partner may own multiple stores, but one store has at most one onboarding owner unless an explicit transfer model says otherwise.
- Control-panel approval is distinct from field evidence capture.
- WLT is the sole owner of raw payout destination data.
- Client visibility is a store publication outcome, not merely a partner status label.
- Every material transition records the actor, trusted context, business scope, correlation, retry and audit data required by current contracts.

**Forbidden/negative invariants**
- Client-controlled input cannot select trusted platform/operator context.
- Missing required trusted context cannot silently fall back inside partner handlers.
- One Partner/Store scope cannot enumerate, read, link, mutate or infer another unauthorized business scope.
- A field agent cannot approve their own evidence where separation is required.
- A partner cannot bypass store publication gates.
- A store cannot be reassigned by the generic link operation.
- DSH cannot persist raw payout account data after binding a WLT reference.
- A stale version cannot mutate partner state.
- A reused idempotency key cannot represent a different payload.
- A store failing any applicable publication gate cannot appear to clients.

**Acceptance expectations**
- Platform/operator context is derived only from trusted Identity/server-side context; browser headers, query parameters and request bodies cannot select or override it.
- Requests requiring trusted context fail closed when it is absent and do not reach partner persistence.
- Partner lists, details, documents, visits, stores, assignments/scopes, transitions and audit records are read or mutated only within trusted context plus object/business authorization.
- Cross-scope partner/store identifiers do not disclose ownership details.
- Field agents can create, resume, save and submit only assigned or authorized onboarding drafts.
- Submission is blocked until current legal, first-store and WLT payout-reference prerequisites are complete.
- Required documents and evidence satisfy the current independent review policy before activation.
- Client publication requires every applicable partner, store, catalog, marketing and serviceability gate.
- A store already owned by one partner cannot be linked to another through the generic onboarding link operation.
- Identical transition and payout retries replay the original result; payload changes under the same idempotency identity are rejected.
- DSH persists and returns only WLT payout references or masked compatibility values allowed by the current contract.
- Partner and control-panel surfaces read back committed activation and readiness state.

**Named failure classes:** trusted context selected from client-controlled input, missing trusted context accepted, cross-scope record disclosure/mutation, raw payout data stored or returned by DSH, store ownership silently changed, publication without all applicable gates, approval without required evidence, payload-divergent retry accepted, surface reports success before committed readback.

### PLATFORM_CHANGE_SETS

**Required outcome.** Every platform configuration mutation follows one contract-bound, maker-checker, auditable, conflict-safe lifecycle with explicit rollback evidence.

**Primary actors.** platform_operator, platform_approver, projection_reader.

**Canonical ownership.** Platform Control.

**Material deployable surfaces.** control-panel.

**Business invariants**
- A change set has one proposer and an independent approver.
- Apply uses the validated revision and precondition snapshot.
- Rollback records a mandatory reason and restores only governed non-sensitive state.
- Every transition is persisted and auditable.

**Forbidden/negative invariants**
- No actor approves or rejects its own change set.
- No stale or conflicting change set is applied.
- No secret or credential value is stored in a change set.
- No existing sensitive target value is snapshotted.
- No rollback occurs without a reason.

**Acceptance expectations**
- The OpenAPI contract is the canonical source for generated client types.
- Maker-checker separation prevents self-approval and self-rejection.
- Validation and apply reject stale or conflicting target revisions.
- Sensitive and confidential values never enter snapshots or proposed values.
- Rollback requires a reason and produces auditable readback.

**Named failure classes:** manual_generated_type_drift, self_approval_allowed, stale_change_applied, sensitive_value_persisted, rollback_without_reason, runtime_readback_missing.

### PLATFORM_SOVEREIGN_CONTROL_PLANE

**Required outcome.** One persistent control plane provides truthful reads, separated duties, audited changes, health-gated progressive delivery, readback, and safe rollback.

**Primary actors.** platform-governor, platform-operator, platform-approver, platform-applier, platform-rollout-manager, platform-auditor, customer, partner, captain, field-agent.

**Canonical ownership.** Platform Control; domain and WLT truths remain at their owners.

**Material deployable surfaces.** control-panel.

**Business invariants**
- Platform-Control owns the sovereign platform control plane.
- Domain administration may project role workflows but cannot become a second platform policy authority.
- WLT owns financial truth.
- Displayed state comes from live owners.
- Supported platform-control operations are governed and reversible.

**Forbidden/negative invariants**
- no mobile controls
- no fake local truth
- no self approval
- no rollout role overlap
- no transaction bypass
- no rollback without baseline and revision
- no advance without passing gate
- no routine or financial ownership

**Acceptance expectations**
- Permissions and surface scope are enforced.
- All displayed resources use live owner APIs.
- Operator, approver, applier, and rollout manager are separated.
- Change and rollout state machines persist readback.
- Health and revision gates block unsafe progress.
- Every transition is audited.
- Routine and financial operations stay outside Platform.

**Named failure classes:** static truth, unauthorized data, role overlap, nontransactional mutation, stale overwrite, health gate bypass, enabled rollout baseline, missing audit, false health.

### REPRESENTATIVE_WALLETS_REFERENCE_FINANCE

**Required outcome.** Every representative sees an authenticated operator-context-bound WLT-owned wallet and permission-scoped ledger view through DSH, while operators can inspect supported wallets and matching ledgers only inside their Identity operator context without any DSH or frontend balance mutation path.

**Primary actors.** client, partner, captain, field, operator.

**Canonical ownership.** WLT financial truth; DSH application facade; Identity trust context.

**Material deployable surfaces.** app-client, app-partner, app-captain, app-field, control-panel.

**Business invariants**
- WLT is the sole owner of wallet and ledger truth.
- DSH is an authenticated and authorized application facade only.
- Identity resolves actor and operator context trust.
- Every self-service wallet read is scoped to the resolved actor.
- Ledger history is append-only financial evidence.

**Forbidden/negative invariants**
- No DSH table or handler mutates representative wallet balances.
- No frontend calls internal WLT financial routes directly.
- No user-facing surface supplies an arbitrary self-service actor id or operator context id.
- No operator lookup crosses the Identity operator-context boundary.
- No settlement summary is labeled as a wallet balance.
- No read permission authorizes a money-moving action.

**Acceptance expectations**
- WLT accepts only supported wallet actor types.
- DSH derives self-service actor identity and operator context from the authenticated session and never from client-controlled input.
- Client partner captain and field have canonical own-wallet and own-ledger routes.
- Control-panel lookup requires finance.read and uses Identity-resolved operator context.
- WLT repositories scope by operator context before actor type and actor id.
- Cross-context wallet and ledger reads fail closed without disclosure.
- Balances are rendered from WLT without local derivation.
- No DSH or frontend route writes wallet balances or appends ledger truth for this journey.
- Human-facing surfaces represent loading empty partial forbidden offline error and retry states.

**Named failure classes:** cross_context_read, cross_actor_read, unsupported_actor, hardcoded_actor, direct_wlt_browser_call, local_balance_derivation, wallet_mutation_in_dsh, missing_permission, missing_context, stale_financial_display.

### SETTLEMENTS_COMMISSIONS

**Required outcome.** Every settlement and commission is deterministically calculated by WLT from durable evidence and a retained policy version, every adjustment has a reason and balanced financial effect, and every required surface reads only canonical scoped references.

**Primary actors.** partner, captain, field, finance_operator, dsh_service, wlt_service.

**Canonical ownership.** WLT financial truth; DSH provides operational evidence.

**Material deployable surfaces.** app-partner, app-captain, app-field, control-panel.

**Business invariants**
- WLT exclusively owns settlement commission wallet ledger refund and adjustment truth.
- DSH exclusively owns operational completion cancellation order store visit and representative evidence.
- Every financial mutation carries service authentication correlation and idempotency.
- Every visible success is read back from WLT or a governed DSH application projection backed by WLT.
- Every policy change and adjustment is append-only auditable.

**Forbidden/negative invariants**
- No DSH or frontend code calculates authoritative settlement fees or commission amounts.
- No caller supplied monetary value becomes commission truth.
- No completed refund remains in the payable settlement basis when policy requires its exclusion.
- No cancelled or unverified source is settled.
- No idempotency key represents different inputs.
- No wallet balance violates current financial invariants.
- No actor reads another actor financial detail.

**Acceptance expectations**
- DSH sends operational identities and immutable evidence only; it never sends an authoritative fee, settlement amount or commission amount.
- WLT verifies operational evidence and its own refund truth before calculation.
- A deterministic idempotency key cannot create duplicate financial effects for the same evidence.
- Every settlement and commission retains the exact policy version used for calculation.
- Every commission amount is calculated by the applicable WLT policy and is never accepted from an untrusted caller.
- Lifecycle transitions enforce legal source states and balanced wallet or ledger effects.
- Every deduction or adjustment is reasoned, operator-attributed and auditable.
- Partner captain and field reads are actor-scoped and mutation-free.
- No runtime mock fixture local financial calculation or duplicate financial truth owner remains.

**Named failure classes:** caller supplied amount, unverified evidence, cancelled source settled, completed refund ignored, duplicate settlement, duplicate commission, missing policy, stale policy ambiguity, reasonless adjustment, negative wallet bucket, cross-actor financial read, unbalanced ledger, frontend-only success.

### SPECIAL_REQUESTS

**Required outcome.** Each Awnak or SHEIN request has one versioned DSH lifecycle, governed information rounds, WLT-owned payment truth when quoted, one DSH dispatch linkage, and proof/exception readback on every affected surface.

**Primary actors.** client, operator, captain.

**Canonical ownership.** DSH operational truth; WLT financial truth.

**Material deployable surfaces.** app-client, control-panel, app-captain.

**Business invariants**
- DSH owns special-request, assignment, delivery-proof and operational-exception truth.
- WLT owns payment truth.
- Every operator mutation requiring optimistic concurrency uses the current expectedVersion contract.
- Every successful write is followed by canonical readback.
- customer_information and customer_approval are separate stages with separate client actions.
- SHEIN cannot dispatch before its governed prerequisites are complete.
- Partner settlement is not created without a canonical partner-settlement source.

**Forbidden/negative invariants**
- No client can read or mutate another client request.
- No surface can calculate or persist authoritative financial truth.
- No local array, mock or fallback can represent runtime request, evidence or exception truth.
- No operator can bypass the workflow-stage model or use rejectionReason for missing information.
- No captain can receive a request before governed dispatch prerequisites are satisfied.
- No second special-request exception subsystem may exist outside DSH operational truth.

**Acceptance expectations**
- Client creation is idempotent and validates required SHEIN or Awnak data through governed fields.
- Operator can request missing information with expectedVersion and the client can answer the pending exchange.
- Quote approval is available only at customer_approval and unavailable at customer_information.
- Client can list, refresh, approve an eligible quote, refuse a prepared quote through the governed cancellation mutation, and cancel an eligible owned request.
- Operational rejection remains operator-owned and does not create a second financial truth.
- SHEIN dispatch is rejected before ready_for_delivery with structured blocking reasons.
- Captain assignment, proof and delivery exception truth remain within DSH operational ownership.
- WLT remains the only financial truth owner and DSH exposes only governed WLT payment readback.
- Every mutation is followed by canonical owner readback.

**Named failure classes:** frontend-only success, stale version overwrite, cross-client read, information question stored as rejection reason, quote approval during customer_information, premature dispatch, missing WLT handoff or readback, local surface business state, duplicate exception truth, runtime mock truth.

### STORE_CAPTAIN_HANDOFF — العهدة الثنائية من المتجر إلى الكابتن

**Required outcome.** Custody moves from the owning store to the assigned captain only after the governed dual-confirmation handoff completes, with one DSH exception/readback truth across affected surfaces.

**Primary actors.** partner, captain, operator, system.

**Canonical ownership.** DSH custody/assignment/exception truth; WLT financial truth.

**Material deployable surfaces.** app-partner, app-captain, control-panel, app-client.

**Business invariants**
- DSH owns custody lifecycle, assignment relationship and operational handoff exceptions; WLT owns any financial truth.
- One active assignment has at most one executable handoff attempt for the governed order/store/captain scope.
- Pickup requires the canonical dual-confirmation prerequisites and absence of a blocking unresolved exception.
- Handoff mutation retries preserve one canonical identity and reject materially different payload under that identity.
- All affected surfaces read the same DSH handoff/exception state after refresh/restart.

**Forbidden/negative invariants**
- No pickup before dual handoff completion.
- No pickup while a blocking exception is open.
- No local surface block remains after DSH proves resolution.
- No store actor outside the owning store confirms handoff.
- No conflicting payload reuses the same retry/correlation identity.
- No superseded handoff remains executable after replacement assignment.
- No surface stores independent custody/exception truth or uses demo/fallback operational data.
- No DSH handoff path creates financial truth parallel to WLT.

**Acceptance expectations**
- Captain arrival creates/reads a handoff attempt bound to the current active assignment, order, store and captain.
- Only the owning-store partner scope confirms package handoff and the actor/time/version are retained.
- DSH does not allow picked_up before store confirmation plus the captain side of the dual confirmation.
- Successful arrival/partner-confirm/pickup retries are idempotent and return current canonical truth.
- An exception retry replays only when retry identity and governed payload are consistent; payload drift under the same identity is rejected.
- A prior handoff attempt becomes non-executable/superseded when a replacement assignment requires it; no competing pickup path remains.
- Partner/captain can report handoff_shortage or handoff_mismatch with attributable reporter/correlation identity.
- A blocking open exception prevents governed confirmation/pickup until authorized resolution.
- After canonical exception resolution, readback removes the block and continuation does not depend on local state.
- Partner/captain surfaces expose exception actions only when the active handoff is executable.
- Exception state survives refresh/restart because it comes from DSH.
- Control-panel reads the same DSH delivery-exception owner instead of a second subsystem.
- Client tracking never reports pickup before actual canonical handoff completion.
- DSH performs no debit/refund/ledger mutation because of handoff exception state.

**Named failure classes:** pickup_before_dual_confirmation, pickup_during_blocking_exception, local_block_stale_after_resolution, cross_store_confirmation, payload_drift_retry, competing_executable_handoff_after_reassignment, exception_lost_after_refresh, surface_local_handoff_truth, mock_or_fallback_operational_truth, dsh_financial_mutation.

### SUPPORT_INCIDENTS_ORDER_RESCUE

**Required outcome.** Every support, incident and order rescue action produces one authorized DSH effect and an immediate governed readback without local operational truth.

**Primary actors.** client, partner, captain, operator.

**Canonical ownership.** DSH support/incident/rescue operational truth; WLT financial truth.

**Material deployable surfaces.** app-client, app-partner, app-captain, control-panel.

**Business invariants**
- DSH owns support, incident and order-rescue operational truth.
- One active rescue case exists per order under the current state model.
- Every mutation preserves idempotency and correlation identity where required.
- All transitions produce canonical readback and an audit event where required.
- Internal support notes are visible only to authorized operators.
- WLT remains the sole owner of financial truth.

**Forbidden/negative invariants**
- No actor can read another actor support ticket.
- No closed rescue case reopens unless the state machine explicitly defines a legal transition.
- No incident or rescue transition silently overwrites stale state.
- No production mock or local array represents support, incident or rescue truth.
- No DSH rescue action mutates WLT ledger, balance, refund or settlement truth.

**Acceptance expectations**
- Actor support access is owner scoped and internal notes do not leak.
- Support message attachments and read receipts follow the current contract.
- Incident mutations require idempotency context and valid expected-state transitions.
- Order rescue cases are linked to a real order and reject duplicate active cases.
- Resolution and closure require governed operator evidence.
- Incident and rescue audit events are append-only and readable by authorized operators.
- WLT access from rescue is visibility-only and cannot mutate financial truth.

**Named failure classes:** local-only rescue state, cross-actor support leakage, duplicate active rescue case, invalid status transition, missing audit event, DSH financial mutation.

### WLT_MONEY_MOVEMENT_SETTLEMENT

**Required outcome.** Every money movement and stakeholder financial view is derived from trusted operational events and approved WLT policy, attributable to one WLT-owned wallet and ledger truth and, where external money moves, to one authoritative provider or governed manual-settlement evidence chain through reconciliation and close.

**Primary actors.** client, captain, partner, field, finance-operator, system.

**Canonical ownership.** WLT financial truth; DSH application facade; Identity trust context.

**Material deployable surfaces.** app-client, app-captain, app-partner, app-field, control-panel.

**Business invariants**
- WLT is the sole internal financial truth owner and every value-changing movement is represented by the canonical double-entry ledger.
- Authoritative monetary values are system-derived from trusted events and versioned policy; human actions express governed intent or evidence, not accounting arithmetic.
- Official external wallets move external money but do not own internal BThwani balances, liabilities or settlement state.
- There is one internal wallet per actor and one canonical payout engine for partner, captain and field.
- Payout destination data is read-only on beneficiary surfaces and controlled as WLT-owned Finance master data.
- Order payment composition and COD exposure are server-owned financial facts.
- The current production Cash-Out model is governed manual external official-wallet settlement; automated payout requires a separately approved capability.
- Unknown or conflicting external outcomes remain reconcilable until authoritative evidence resolves them.

**Forbidden/negative invariants**
- No DSH or frontend component writes WLT balances or ledger truth.
- No beneficiary surface mutates official-wallet destination master data.
- No client or finance surface directly supplies an authoritative earning commission fee balance hold payable settlement total or full-payout amount.
- No provider name determines the internal ledger account or stakeholder entitlement.
- No screenshot spreadsheet or unverified file row creates financial success.
- No unverified or silently changed destination receives payout.
- No frozen batch or approved payout snapshot is edited in place.
- No second provider is invoked for the same ambiguous external mutation before reconciliation.
- No legacy COD custody/remit path and captain-wallet debit path both account for the same order value.
- No daily financial close hides unresolved blocking exposure or mismatched control totals.

**Acceptance expectations**
- WLT remains the sole writer of wallet balances, ledger transactions, payments, refunds, commissions, payouts, settlements and reconciliation truth.
- Authoritative monetary values are derived server-side from trusted events, canonical state and versioned policy; no beneficiary or finance UI directly overrides them.
- Each actor has one canonical internal WLT wallet; held pending earned settled and withdrawal-eligibility values are states or projections, not parallel wallets.
- Cash-In credits an internal wallet only after authoritative provider evidence is verified and normalized.
- Mock or sandbox provider behavior cannot be selected as a production fallback.
- Every applicable order has one server-owned payment allocation that conserves the governed order total and prevents duplicate delivery-fee treatment.
- Captain COD authorization is order-specific, atomic and idempotent; cancellation releases once and finalization debits once.
- The current captain-funded COD path cannot simultaneously create a second remittance liability for the same order value; any alternate custody model requires a separately approved Product/financial governance decision.
- Customer withdrawal and cash-out of externally funded principal remain disabled unless a separately approved product, legal and financial policy enables them.
- Partner, captain and field payouts use one WLT-owned payout engine with stakeholder-specific eligibility expressed as policy rather than separate ledgers.
- Beneficiary surfaces expose payout destination information read-only and cannot create, update, deactivate, replace or select destination master data.
- Official-wallet destination master data is WLT-owned, versioned, encrypted and masked; only an independently verified active version is eligible for payout.
- Beneficiary payout intent contains only amount mode, optional specified amount, and idempotency context; WLT resolves beneficiary, eligible funds and current verified destination transactionally.
- Approved payout facts and frozen settlement batches are immutable; later destination changes cannot rewrite them.
- The current production Cash-Out model is governed manual external official-wallet settlement; automated payout requires a separately approved capability.
- Manual external execution records required reference and evidence and cannot expose a bare mark-paid transition.
- Final completion requires agreement between approved payout, frozen batch row, execution evidence and authoritative external statement; mismatch creates a blocking reconciliation exception.
- Financial separation of duties is enforced server-side according to active policy.
- Legitimate adjustments are typed governed WLT events with reason, evidence and authorization; there is no direct balance edit or generic monetary override.
- Blocking finance exceptions, missing required evidence, control-total mismatch or unresolved material reconciliation exposure prevent affected completion.
- Refund routing follows the authoritative original money source unless an explicit product policy states otherwise.
- An ambiguous external mutation result is reconciled before any new provider or route attempt can move the same money again.
- External official-wallet account balances are treasury control facts and never a second internal wallet ledger.

**Named failure classes:** parallel_financial_truth, direct_balance_mutation, manual_authoritative_financial_value, beneficiary_destination_mutation, beneficiary_selected_destination, client_asserted_success, client_computed_full_payout_amount, payment_allocation_mismatch, delivery_fee_double_count, cod_overcommit, cod_double_effect, unverified_destination, approved_snapshot_mutation, frozen_batch_mutation, bare_mark_paid, duplicate_external_reference, ambiguous_result_retried_elsewhere, unreconciled_completion, spreadsheet_as_truth, self_approval_bypass, blocking_exception_ignored, mock_in_production, source_unaware_refund, financial_close_with_unresolved_exposure.

### ZONES_SLA_CAPACITY_DELIVERY_MODES

**Required outcome.** Every affected surface receives one versioned DSH operational decision that combines active zone, SLA, capacity pause and pressure, fulfillment mode and service-area truth, with explicit effects for cart, checkout, order and dispatch.

**Primary actors.** operator, client, partner, captain.

**Canonical ownership.** DSH operational policy/serviceability truth.

**Material deployable surfaces.** control-panel, app-client, app-partner, app-captain.

**Business invariants**
- DSH owns operational policy and serviceability decisions.
- Service-area geofences remain the spatial boundary truth where the current model uses them.
- Every affected workflow consumes the same canonical policy decision/version.
- Policy history is append-only and rollback creates a new version.

**Forbidden/negative invariants**
- No frontend derives serviceability from local constants.
- No disabled or paused path creates checkout or dispatch success.
- No stale expected version overwrites newer policy.
- No DSH policy mutation writes WLT financial truth.

**Acceptance expectations**
- Assignment SLA is represented alongside preparation and delivery SLA where required by the current model.
- Capacity supports explicit pause and resume with a reason and version guard.
- BThwani delivery, partner delivery and client pickup are independently governed per applicable zone/policy scope.
- Evaluation fails closed for inactive zones, paused capacity, disabled modes and exhausted pressure thresholds according to current policy.
- The decision returns explicit cart, checkout, order and dispatch effects.
- Every mutation is authorized, idempotent, correlated, versioned and audited.
- Audit snapshots can rollback only the same reversible aggregate through a new governed revision.
- The control panel exposes loading, empty, success, conflict, forbidden and recovery states.
- Affected client, partner and captain integrations consume the canonical decision rather than local truth.
- Operational policy does not create WLT balance or ledger mutation.

**Named failure classes:** local serviceability truth, dispatch during pause, checkout after denial, disabled fulfillment mode, stale update, cross-aggregate rollback, DSH financial mutation.

## Capability-change law

A new capability or material capability change must prove a stable responsibility, canonical owner, affected actors/surfaces, legal state/mutation/readback semantics, authorization, failure/recovery behavior and acceptance expectations.

```text
ACTOR != CAPABILITY_OWNER
ROUTE != CAPABILITY_OWNER
SCREEN != CAPABILITY_OWNER
IMPLEMENTATION_MECHANISM != DOMAIN
```
