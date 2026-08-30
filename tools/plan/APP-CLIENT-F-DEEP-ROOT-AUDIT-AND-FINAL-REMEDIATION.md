# APP-CLIENT / branch `f` — Root-Correct End-to-End Closure Ledger

> **STATUS: OPEN — NOT CLOSED**
>
> This file is an execution ledger, root graph, migration/cutover contract, deletion ledger, and verification index. It is **not** product/runtime/data/contract/design authority and it must never substitute for fixing the actual source-of-fix. `CLOSED` is forbidden until every material root below is either `CLOSED_WITH_EXACT_PROOF` or `N/A_PROVEN`, all migrations/cutovers/deletions are complete, negative space is clean, and exact-final-candidate closure gates pass.

---

## 0. Execution identity and live baseline

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Canonical trunk:** `master`
- **Target app / Audit-Execution Anchor:** `app-client`
- **Governing entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Observed Orchestrator package revision:** `20`
- **Re-audit live baseline:** `847ca44f18fd32eb54db0d422c29ebaec3e82f24`
- **PR:** Draft PR `#334`, `f -> master`
- **PR base at re-audit:** `1c41f0a5d6b94faecf2d01e8e38012ce9912a7bf`
- **Previous client-ledger creation commit:** `391f5e8aaa15276c29e5ff6b6d4cc7ab5f3fe5f3`
- **Delta since previous client-ledger creation:** `167` commits ahead at this re-audit baseline.
- **Date:** `2026-08-29` (`Asia/Aden`)
- **ACTIVE_WORKSET:** **NOT SUPPLIED**. GitHub can prove branch/PR state but cannot prove absence of direct concurrent sessions/worktrees. Therefore this unique ledger rewrite is authorized by the caller, while product/runtime/backend/data mutations must re-resolve the live HEAD, active concurrent work, collision set, and `PARALLEL_SAFE` status immediately before each mutation wave.
- **Current state:** `RE-AUDITED / ROOT-RANKED / EXECUTION-CONTRACT-REBUILT / MATERIAL_MUTATION_PENDING_CONCURRENCY_GATE`.

### 0.1 Why the previous ledger was invalidated

The previous ledger was not merely incomplete; its baseline became materially stale. Since its creation, branch `f` changed the Client runtime, Cart, Client Profile, Navigation, DSH backend, contracts, tests, Control Panel handoffs, and multiple shared mutation/lifecycle components. Several old findings were genuinely fixed, while deeper roots remained or appeared at different layers. Keeping the old ranking would itself create stale diagnostic truth.

This revision therefore **rebuilds the diagnosis from current source** rather than appending more findings to obsolete conclusions.

---

## 1. Selected closure objective

**SELECTED CLOSURE OBJECTIVE:** Close the complete `app-client` material customer-commerce cone root-correctly from Identity/session and native runtime through discovery/store capability truth, Cart/serviceability/checkout, Order Truth and delivery/pickup projections, notifications/deep links, profile/addresses/consents, support, ratings, special requests, benefits/subscriptions and WLT projections; eliminate every non-atomic command boundary, duplicated semantic authority, shadow/default product truth, lifecycle decision fork, unresolved-intent causal break, stale/compatibility/bypass path and unproven UX/A11y/RTL state; migrate every writer/reader/consumer/handoff to one canonical owner; delete superseded paths after cutover; then re-diagnose until Fixed Point and prove the exact final candidate under the latest Orchestrator closure gates.

---

## 2. Governing laws

The target app is an **anchor**, not an authority island. The only valid loop is:

`AUDIT -> INSPECT -> DIAGNOSE -> ROOT GRAPH -> HIGHEST PROVEN EXECUTABLE ROOT -> ACTUAL SOURCE-OF-FIX -> ROOT-CORRECT EXECUTION -> MIGRATION -> RECONCILIATION -> CUTOVER -> CLEANUP/DELETION -> VERIFY -> RE-AUDIT -> RE-RANK -> REPEAT -> FIXED POINT -> EXACT FINAL CANDIDATE`.

Hard prohibitions:

- No Patch / Workaround / Fallback used to hide a violated invariant.
- No Half Migration, indefinite dual read/write, shadow/parallel truth, or “keep both in sync” architecture.
- No UI fix for backend/data/contract roots.
- No documentation/test marker accepted as replacement for runtime proof.
- No command result called committed unless canonical authority can prove it after crash/retry/response loss.
- No unresolved predecessor may be bypassed by a causally dependent successor.
- No frontend-owned business mapping when the backend/contract can provide the normalized semantic truth.
- No local fabricated profile/state treated as server product truth.
- No raw lifecycle status list duplicated across surfaces as independent business decision authority.
- No dead/stale/compatibility path left “for later” inside the affected cone.
- No `CLOSED` on a moving, unbound, draft, stale, or unverified candidate.

---

## 3. Current Material Cone and authority map

| Material concept | Canonical owner / source of truth | `app-client` role |
|---|---|---|
| Actor identity, role, surface, session | Identity | Authenticate as `client`; consume server-derived identity; never mint actor authority locally. |
| Installation identity / durable mutation scope | `@bthwani/data-runtime` | Persist correctness-critical attempt identity scoped by actor + installation + entity. |
| Native mobile capabilities | App runtime implementation behind governed capability interfaces | Inject Expo/native implementations; DSH product code consumes interfaces only. |
| Connectivity / process lifecycle | Data Runtime + native runtime | Drive retries/recovery; never infer durable correctness from browser-only primitives. |
| Store/catalog/home discovery | DSH catalog/store/home-discovery authorities + governed operator inputs | Render canonical availability/capabilities; do not own a second business mapping. |
| Cart aggregate | DSH Cart domain/database | Submit commands and represent canonical state; local queue is intent/recovery state only. |
| Cart command identity/receipt | DSH transactional command boundary | Preserve stable retry identity and reconcile unknown results. |
| Serviceability / fulfillment capability | DSH policy/cart serviceability authority | Consume normalized allowed modes and quotes. |
| Checkout | DSH checkout/OCC | Carry exact cart/address/version context; fail closed on conflict/unavailable policy. |
| Order Truth | DSH order lifecycle | Consume one canonical lifecycle projection; no local state machine fork. |
| Partner preparation | Partner/DSH order authority | Read client projection only. |
| Pickup | DSH pickup authority | Execute only client-owned pickup actions. |
| Captain delivery/location/proof | DSH dispatch/proof authority | Read client tracking/proof projection only. |
| Support/chat | DSH governed support/collaboration | Submit client commands and read canonical ticket/thread state. |
| Notifications/push/deep links | DSH notification authority + native runtime | Register endpoint; route only contract-valid actions. |
| Client profile/preferences/consents | DSH Client Profile authority + platform policy | Edit governed fields; server owns valid domain values/default projection. |
| Client addresses | DSH Client Address authority | Capture governed location/address commands; no local address master. |
| Benefits/subscriptions | DSH commercial facade + WLT commercial/payment authority | Preserve command identity/recovery; consume canonical financial/lifecycle state. |
| Wallet/payment/refund | WLT | Read governed client projection / allowed commands only. |
| Rating | DSH ratings authority | Submit actor/order-scoped rating command; no duplicate eligibility truth. |
| Special requests | DSH special-request authority | Capture governed intent; consume operator/fulfillment lifecycle. |
| Product/UX/Design/A11y/RTL | Product/design/UI Kit + explicit journey contracts | Render all states semantically; prove actual-device behavior. |

Any contradiction to this table is a root violation requiring treatment at the owner, not a feature-specific exception.

---

## 4. Current Root Graph

```text
Identity actor/session + app-client surface gate
        |
        +--> Data Runtime: installation identity / durable storage / connectivity
        |
        +--> app-client native platform provider
        |        |
        |        +--> DSH capability interfaces
        |
        v
Client navigation / DshClientSurface
        |
        +--> Home Discovery
        |      +--> Store/catalog/content truth
        |      +--> fulfillment capability projection
        |
        +--> Cart
        |      +--> local durable command queue (non-authoritative)
        |      +--> governed HTTP command identity
        |      +--> DSH Cart aggregate + DB
        |      +--> command receipt/reconciliation
        |      +--> serviceability/OCC
        |
        +--> Checkout
        |      +--> canonical checkout snapshot
        |      +--> Order Truth create + readback
        |
        +--> Order Truth lifecycle
        |      +--> Partner preparation
        |      +--> Pickup
        |      +--> Captain dispatch/location/proof
        |      +--> cancellation/return
        |      +--> WLT payment/refund
        |
        +--> Notifications -> action contract -> route/deep link
        |
        +--> Profile / Preferences / Consents
        |      +--> platform locale/currency policy
        |
        +--> Addresses / Location
        |
        +--> Benefits / Subscriptions -> DSH/WLT commercial truth
        |
        +--> Wallet -> WLT
        |
        +--> Support / Chat -> Control Panel operator readback
        |
        +--> Ratings / Special Requests
```

### Highest proven root

The highest currently proven executable root is:

> **R1 — Cart lacks one atomic canonical command boundary across effect + idempotency receipt, while the client queue can continue causal successors after an unresolved predecessor.**

This root outranks Cart UI, retry messages, queue storage, or individual tests because it breaks correctness at the authority that owns the business effect.

---

## 5. Re-audit disposition of previous findings

| Previous finding | Current disposition | Action |
|---|---|---|
| Cart used raw `localStorage/sessionStorage` and unscoped queue | **SUPERSEDED / FRONTEND STORAGE ROOT FIXED** | Do not resurrect. Current queue uses governed durable actor/installation-scoped infrastructure. Deeper backend/causal root remains as R1. |
| DSH client surface imported upward from `apps/app-client/runtime` | **FIXED_PENDING_RUNTIME_PROOF** | Current `DshClientPlatformProvider` restores dependency direction. Preserve and prove; do not reintroduce upward imports. |
| Client route switch silently fell back to Profile/MySpace | **FIXED_PENDING_NEGATIVE-SPACE_PROOF** | Current route handling is materially stronger/exhaustive. Preserve. |
| Subscription durable attempts were destructively cleared on logout | **FIXED** | Current lifecycle no longer couples all durable recovery state to session termination. Preserve. |
| Native durable store might not be wired on React Native | **DISPROVEN** | Native Data Runtime provider configures native durable/cache/connectivity authority. No mutation authorized for this suspicion. |
| Client address update/delete retry identity regenerated | **DISPROVEN AS STATED** | Current API uses deterministic idempotency keys for these operations. Do not treat as open root absent new evidence. |

This ledger intentionally removes obsolete “red” findings instead of inflating scope with already-corrected defects.

---

## 6. Positive canonical boundaries that must be preserved

### P-CAN-01 — Identity/runtime separation

The client runtime composes Identity and app surface gating; product/domain code does not mint server actor authority. Preserve server-derived subject/role/surface truth.

### P-CAN-02 — Platform capability dependency direction

`services/dsh/frontend/app-client/client-platform-context.tsx` now defines the client-facing platform contract and the runtime injects native implementations. This is the correct direction. Extend this boundary if new native capability is needed; never import runtime implementation upward into DSH product code.

### P-CAN-03 — Data Runtime durable authority exists

The repository has explicit correctness-critical durable storage, installation identity, mutation scope, and native connectivity owners. New client durable command systems must reuse them instead of creating feature-local storage authorities.

### P-CAN-04 — Client Profile demonstrates correct transactional mutation receipt model

Client Profile backend performs command serialization/receipt lookup, fingerprint checks, business change, event/receipt persistence and commit within one DB transaction. This is an in-repo executable precedent for Cart command hardening.

### P-CAN-05 — Order creation demonstrates durable attempt + canonical readback

Order Truth creation persists retry identity and validates canonical actor-scoped readback before clearing attempt state. Preserve this recovery model.

### P-CAN-06 — WLT subscription activation is transactionally governed

WLT commercial activation uses transaction/locking and financial/business invariants. Do not weaken financial authority to accommodate client UI convenience.

### P-CAN-07 — Push and navigation hardening materially improved

Current client navigation/deep-link handling and native push registration are materially stronger than the old baseline. Preserve explicit malformed/unsupported handling and actor/session endpoint lifecycle.

---

# 7. Root-ranked current findings

## R1 — CRITICAL / PROVEN — Cart command effect and receipt are not one atomic canonical boundary; client causal replay is not fully fenced

### Evidence

Current `services/dsh/backend/internal/http/cart.go` uses the same fundamental shape for Cart mutations:

1. query an existing idempotency replay/receipt;
2. perform the business mutation;
3. only **after successful mutation**, call `recordCartIdempotency(...)`;
4. if receipt persistence fails, log the failure while the already-committed business mutation remains successful.

The helper itself is conceptually post-hoc: it claims the idempotency key after a successful mutation.

Therefore a crash, DB/receipt write failure, process termination, or response loss can create:

`business effect committed + no canonical replay receipt`.

A retry with the same client command identity can then re-enter command execution without a proven canonical terminal receipt.

Current client `use-cart-controller.tsx` is much stronger than the old implementation, but its queue can still continue processing later commands after some predecessor outcomes become `submitted_unknown` or certain `permanent_failure` states. For a single Cart aggregate, this can allow a causally later command to execute while the predecessor's canonical result is unresolved.

### Broken invariants

- Effect + command receipt must be atomic.
- Same actor/key/fingerprint must resolve to exactly one canonical result.
- Same key with a different fingerprint must fail closed.
- Unknown remote result must be reconciled before dependent successor execution.
- A local queue is not allowed to invent command order independently of canonical aggregate state.

### Actual Source-of-Fix

Primary:
- DSH Cart domain/transaction boundary and persistence.
- DSH HTTP Cart command handlers only as transport adapters.

Secondary consumers:
- `frontend/shared/cart/cart.api.ts`
- `cart-sync.queue.ts`
- `use-cart-controller.tsx`
- checkout consumers relying on Cart version/state.

### Canonical target

Create one serialized Cart command boundary for `add/update/remove/clear` where, in the **same transaction**:

1. authenticated actor + target aggregate are resolved;
2. actor/key command lock is acquired;
3. existing receipt is read under the lock;
4. request fingerprint is compared;
5. if exact replay -> return stored canonical result;
6. if same key/different fingerprint -> conflict;
7. business mutation is executed with OCC/version invariants;
8. canonical response/terminal receipt is persisted;
9. transaction commits;
10. only then may the transport return committed success.

Use the Client Profile transactional receipt pattern as an in-repo architectural precedent; do not add a second generic idempotency framework if the existing durable command mechanisms can be generalized cleanly.

### Migration / reconciliation

- Inventory existing Cart receipt rows and schema semantics.
- Determine whether post-hoc receipts can represent historical ambiguous effects.
- Introduce forward deterministic migration for the canonical transactional receipt shape if required.
- Reconcile any command states that cannot prove whether effect/receipt pairing is complete.
- Do not fabricate historical receipts merely to satisfy a constraint.
- Existing unresolved mobile queue items must be re-read against canonical Cart state before adopting the new terminal model.

### Client cutover

- Queue ordering becomes aggregate-causal, not “best effort continue”.
- A predecessor in `submitted_unknown`, unresolved conflict, or non-discardable permanent failure fences successors that depend on the same Cart aggregate/version chain.
- Reconciliation must classify `committed | conflict | retryable | terminal-rejected | quarantined` using canonical server evidence.
- Purge only after canonical terminal resolution.
- Cross-actor/install mismatch remains fail-closed.

### DELETE_REQUIRED

After successful cutover:

- Delete post-hoc `recordCartIdempotency` behavior that can fail independently after effect commit.
- Delete any duplicate pre-check/replay logic superseded by the transactional command owner.
- Delete client queue branches whose only purpose was compensating for missing canonical command receipts.
- Delete tests that encode the old non-atomic semantics.

### Closure proof

Mandatory failure-injection cases:

- crash before command claim;
- crash after claim before effect;
- effect attempt fails;
- effect succeeds but before receipt finalize;
- before commit;
- after commit before HTTP response;
- response lost and exact retry;
- same key + different fingerprint;
- actor switch with old queued command;
- process death/restart with unresolved predecessor;
- queued A then B where A is unknown: B must not execute until A resolves;
- OCC conflict and canonical Cart readback.

`R1 CLOSED` only when no Cart writer bypasses the transactional command owner and negative-space search proves the old post-hoc receipt path is gone.

---

## R2 — HIGH / PROVEN — Client Profile exposes shadow default state and has no canonical enforced currency-preference domain

### Evidence

Current `MyProfileScreen.tsx`, on profile `404`, creates an effective local `ClientProfile` with synthetic identity/state such as:

- local placeholder profile id;
- local default locale;
- local default currency preference (`SAR` on the audited code path);
- version/default consent/preference values.

That means “profile not provisioned” is converted into a plausible local profile object rather than an explicit canonical server projection/state.

Separately:

- `DshClientProfile.currencyPreference` is a free `string` in the shared frontend type;
- current Client Profile handler/domain trims and persists currency preference without proving an allowlist/enum/platform currency policy;
- no matching strongly typed `currencyPreference` contract authority was found in the DSH contract search performed during this audit;
- WLT commercial truth reviewed in-cone is governed around `YER`, demonstrating that finance has stronger currency semantics than Client Profile currently enforces.

### Broken invariants

- Defaults affecting product/commerce must be server/platform policy, not a screen-local fabricated profile.
- Durable preference values must belong to a bounded governed domain.
- Profile preference cannot become a second currency-policy authority beside WLT/commerce policy.
- “not provisioned” must remain an explicit state until canonical authority defines the effective defaults.

### Actual Source-of-Fix

- Product/platform currency/default policy owner.
- DSH Client Profile contract/domain/database.
- Client Profile read projection.
- `MyProfileScreen` as consumer only.

### Canonical target

- Define the supported/effective currency preference through one canonical contract/policy owner.
- Prefer server-provided effective profile/default projection over UI synthesis.
- Contract type is constrained (`enum`/governed reference), not arbitrary string.
- Backend validates before persistence.
- Database invariant/backfill is added if durable rows can contain unsupported values.
- Client renders the server policy; it does not invent fallback commercial truth.

### Migration / reconciliation

- Inventory existing persisted profile currency/locale values.
- Classify valid / unsupported / legacy / null.
- Backfill only from proven platform policy.
- Unsupported values require deterministic reconciliation, not silent coercion without audit evidence.
- Define behavior for genuinely absent profile records: canonical empty/default projection or explicit `not_initialized` state.

### DELETE_REQUIRED

- Delete `local-profile` synthetic business truth.
- Delete screen-local commercial currency default.
- Delete free-string persistence path after contract cutover.
- Delete any duplicate currency allowlists/defaults discovered during migration.

### Closure proof

- unsupported currency cannot be persisted through any Client Profile writer;
- missing profile receives one canonical server-defined state/default projection;
- WLT/checkout/order formatting consumes compatible currency semantics;
- existing data inventory is reconciled;
- no raw currency default remains in app-client product code outside pure display formatting of canonical values.

---

## R3 — HIGH / PROVEN — Store delivery mode -> fulfillment mode is duplicated semantic authority

### Evidence

Frontend `services/dsh/frontend/shared/store/store-discovery.formatters.ts` owns a decision table mapping store delivery modes to fulfillment modes and explicitly says it must stay in sync with the backend.

Backend Cart domain owns an equivalent mapping for the same business meaning.

Two files independently declaring themselves authoritative for the same semantic conversion is a direct parallel-truth design. “Must stay in sync” is evidence of the defect, not a governance solution.

### Broken invariants

- One business concept -> one canonical decision owner.
- Frontend display/filtering cannot independently reinterpret backend machine capability.
- Adding a delivery mode must not require manually editing multiple truth tables.

### Actual Source-of-Fix

DSH store/cart/serviceability contract projection.

### Canonical target

Backend/contract exposes normalized fulfillment capability directly per store/serviceability context. The frontend consumes the normalized machine value and may only format labels/presentation.

### Migration / cutover

- Extend/read the canonical store/discovery/serviceability contract with normalized fulfillment semantics if not already exposed in every required projection.
- Migrate Home discovery, Store detail, Cart, Checkout and any other client reader.
- Verify Partner/Control Panel writers still write only their own governed source fields, not client-derived normalized fields.

### DELETE_REQUIRED

- Delete frontend business mapping table.
- Delete “must stay in sync” comments/tests whose purpose is manual parity.
- Delete any second equivalent mapping found through semantic search.

### Closure proof

A newly introduced delivery capability must propagate by canonical contract without requiring a client business-rule table change.

---

## R4 — HIGH / PROVEN — Order lifecycle/presentation logic is split across canonical shared policy and client-local raw-status decision tables

### Evidence

Shared Order Truth experience code owns terminal classification (`isTerminalOrderTruth`) and shared order lifecycle metadata exists in `orders.state-machine.ts`.

Yet `DshClientSurface.tsx` independently determines the Home “active order” by another explicit status exclusion list.

`OrderTrackingScreen.tsx` and adjacent client order screens also contain raw-status tables/branches for tone, journey labels/steps and client-visible lifecycle interpretation.

Not every presentation mapping is a defect; the defect is when a screen-local raw status list answers a **business question** already owned by shared lifecycle policy, such as terminal/active phase/action eligibility.

### Broken invariants

- One lifecycle state must have one machine semantic classification.
- Polling, Home active-order visibility, Orders list, tracking progress, pickup/action eligibility and terminal behavior must consume compatible canonical selectors.
- A newly added state must not silently become terminal in one consumer and active in another.

### Actual Source-of-Fix

Shared Order Truth/lifecycle projection and selectors, backed by backend lifecycle contract.

### Canonical target

Provide/consume canonical selectors for at least:

- terminal vs active;
- lifecycle phase/journey step;
- client-visible status label key;
- action eligibility;
- owner/fulfillment implications;
- polling eligibility.

UI remains free to choose visual tone/layout, but not to recreate business-state semantics.

### Migration / cutover

Migrate:

- Home active order;
- Orders list;
- Order Tracking;
- Pickup entry;
- client preparation decision panel;
- delivery proof/tracking projections;
- support actions whose availability depends on order state;
- rating eligibility where status-dependent.

### DELETE_REQUIRED

- Delete duplicate terminal-state arrays/lists.
- Delete raw lifecycle classification branches that duplicate canonical business semantics.
- Keep purely visual mappings only when they consume canonical semantic categories, not raw domain statuses.

### Closure proof

Add a synthetic/new lifecycle state in contract tests: compilation/contract tests must force explicit canonical classification before any client surface can silently treat it as active/terminal/actionable.

---

## R5 — HIGH / PROVEN PRODUCT/CONSENT GAP — Marketing-consent withdrawal is knowingly incomplete

### Evidence

Current `MyProfileScreen.tsx` contains an explicit implementation compromise: the product behavior expects confirmation for withdrawal, but the current implementation immediately toggles instead of presenting the governed confirmation journey.

This is not cosmetic. Consent withdrawal is a state-changing user decision with Product/UX/A11y semantics.

### Broken invariants

- destructive/sensitive choice must match its product contract;
- cancel/no-confirm must produce zero mutation;
- confirmation must be accessible and deterministic;
- UI must not contain permanent “for now” behavior in a closure candidate.

### Canonical target

- Explicit confirmation surface with clear consequence text.
- Mutation occurs only after affirmative confirmation.
- Cancel/back dismisses without local/server mutation.
- Busy/error/success states are explicit.
- Focus enters confirmation, returns correctly on dismiss, supports screen reader and Android back behavior.

### DELETE_REQUIRED

- Delete the “for now” immediate-toggle compromise and stale comment.
- Delete any duplicate alternative withdrawal action after cutover.

### Closure proof

Real interaction test plus accessibility/device proof, not source-marker presence.

---

## R6 — HIGH / PROVEN VERIFICATION GAP — Static marker contracts are being used for behavior they cannot prove

### Evidence

`apps/app-client/runtime/tests/client-operational-experience-contract.test.mjs` contains extensive source-string/regex marker assertions. These are useful structural guards, but they cannot prove:

- mobile process death/restart;
- native durable storage behavior;
- offline -> reconnect causal replay;
- command crash windows;
- real push/deep-link navigation;
- runtime permissions/location/media behavior;
- modal focus/back semantics;
- font scaling/touch targets/screen-reader order;
- cross-service Cart -> Checkout -> Order -> Dispatch/WLT convergence.

The previous ledger over-weighted marker tests as evidence. That is prohibited in this revision.

### Canonical target

Keep marker tests only for static boundaries they can actually prove. Add/use executable proof at the level of the invariant:

- DB/integration tests for transactional command boundaries;
- state-machine/contract tests for semantic single-owner rules;
- native execution tests for storage/connectivity/restart;
- journey tests against real runtime/backends for core client flows;
- device/emulator accessibility and RTL proof for interaction states;
- exact-candidate CI/security evidence.

### DELETE_REQUIRED

Delete or narrow marker tests that assert behavior beyond their epistemic capability after stronger executable tests replace them. Do not delete useful static architectural guards.

---

# 8. Cross-root canonical invariants

The following must hold globally across the client cone after remediation:

1. **One command identity owner:** correctness-critical mutation retry identity is durable, actor/installation/entity scoped and server-recognized.
2. **One commit boundary:** committed means the business effect and canonical terminal command receipt are atomically durable.
3. **One causal order per aggregate:** unresolved predecessor blocks dependent successors.
4. **One lifecycle semantic owner:** screens consume selectors/projections; they do not rebuild the state machine.
5. **One fulfillment semantic owner:** normalized capability comes from canonical backend/contract projection.
6. **One profile/default policy owner:** missing profile and supported preference domains are server/platform-governed.
7. **One financial truth:** WLT remains owner of wallet/payment/refund/commercial monetary truth.
8. **One runtime dependency direction:** app runtime implements capabilities; domain/product code consumes interfaces.
9. **No stale fallback truth:** fallback may represent unavailable/empty/error UI, never fabricate business truth.
10. **No proof laundering:** docs/marker tests cannot convert untested runtime behavior into `CLOSED`.

---

# 9. Ordered Closure Units

Execution must re-rank after every unit. Do not blindly complete lower units if a new higher root appears.

## U1 — Cart transactional command + causal recovery closure

**Priority:** P0 / first executable root.

Scope:
- DSH Cart command owner;
- receipt schema/persistence;
- Cart HTTP adapters;
- client queue/reconciliation;
- Cart/Checkout consumers;
- DB/integration/restart proof.

Exit:
- R1 fully closed;
- post-hoc receipt path deleted;
- causal queue fenced;
- crash/replay proofs green.

## U2 — Client Profile/default/currency-domain closure

Scope:
- product/platform currency/default decision;
- DSH contract/backend/data;
- Client Profile shared types/API;
- Profile screens;
- WLT/commerce compatibility;
- existing data reconciliation.

Exit:
- no synthetic local profile truth;
- bounded currency semantics enforced end-to-end;
- no unsupported persisted values remain.

## U3 — Store delivery/fulfillment semantic authority convergence

Scope:
- store/discovery/serviceability contracts;
- backend normalized projection;
- all client consumers.

Exit:
- one mapping owner;
- frontend table deleted;
- negative-space search clean.

## U4 — Order lifecycle/presentation authority convergence

Scope:
- Order Truth/shared lifecycle selectors;
- Home/Orders/Tracking/Pickup/Proof/Support/Rating consumers.

Exit:
- business lifecycle decisions consume canonical selectors;
- duplicate raw-state business tables deleted.

## U5 — Consent + Product/UX/Design/A11y/RTL finishing

Scope:
- Profile consent confirmation root;
- journey-wide finishing matrix below;
- loading/empty/error/offline/conflict/partial/success/destructive states;
- device proof.

Exit:
- no known “for now”, inert, dead, misleading or inaccessible path remains in material client cone.

## U6 — Exact-candidate re-diagnosis and final closure

- Repeat semantic audit across all root concepts.
- Re-run negative-space searches.
- Rebuild Material Cone from final code, not this ledger.
- Prove all consumers/handoffs.
- Run exact candidate CI/security/runtime/journey/device evidence.
- Only latest Orchestrator gates can authorize `CLOSED`.

---

# 10. Migration / Cutover / Reconciliation Ledger

| Item | Required action | Cutover condition | Old path deletion condition |
|---|---|---|---|
| Cart post-hoc receipts | Migrate to transactional command receipt/response owner | all Cart writers/readers use new boundary | DB + retry/crash proofs + no bypass writers |
| Existing Cart queued intents | classify/reconcile against canonical Cart/receipt truth | each intent terminally classified | purge only terminally resolved records |
| Profile absent/default state | replace synthetic local profile with canonical projection/state | all profile readers consume canonical response | remove `local-profile` fallback |
| Profile currency values | inventory + validate/backfill by canonical policy | contract/backend/data/client agree | remove raw free-string/default authority |
| Delivery-mode mapping | expose normalized fulfillment semantic from backend/contract | Home/Store/Cart/Checkout migrated | remove frontend decision table |
| Order lifecycle selectors | centralize semantic projection | all material client consumers migrated | delete duplicate raw-status business tables |
| Consent withdrawal | governed confirmation interaction | executable UX/A11y proof | delete immediate-toggle compromise |
| Static behavior assertions | replace with correct proof level where needed | stronger executable evidence exists | narrow/delete misleading marker assertions |

No item may be marked migrated merely because both old and new paths exist. Dual operation is transition state only and must have an explicit deletion gate.

---

# 11. DELETE_REQUIRED ledger

The final candidate must not retain superseded structures merely because they are harmless at runtime.

Mandatory deletion targets once replacements are proven:

- Cart post-hoc receipt recording path and duplicate replay pre-checks superseded by atomic command owner.
- Cart queue recovery branches made obsolete by canonical receipt semantics.
- Synthetic Client Profile `local-profile` business object/default currency authority.
- Free-string Client Profile currency persistence contract if replaced by bounded canonical domain.
- Frontend store-delivery -> fulfillment business mapping and “keep in sync” mechanisms.
- Duplicate Order terminal/active raw-status decision lists.
- Other raw lifecycle business mappings superseded by canonical selectors.
- “for now” marketing-consent withdrawal implementation/comment.
- Marker-only behavior assertions that become redundant/misleading after executable proof is established.
- Any compatibility wrapper, dead export, stale test fixture, duplicate helper, or orphan path exposed by those deletions.

Deletion is part of completion, not optional cleanup.

---

# 12. Product / UX / Design / Accessibility / RTL journey matrix

Every row must be verified across relevant `loading | empty | success | offline | partial | forbidden | conflict | error | destructive-confirmation | recovery` states.

| Journey | Product/UX proof required | A11y/RTL/device proof |
|---|---|---|
| App bootstrap / session restore | no false logged-in/product success; deterministic auth recovery | focus after auth transitions; RTL shell; safe areas; font scale |
| Home / discovery / search | governed content, no stale business fallback, deterministic destination routing | search labels, list semantics, RTL ordering, dynamic text |
| Store detail | canonical capability/availability; no duplicate fulfillment interpretation | price/content reading order, touch targets, RTL rails/carousels |
| Cart | clear pending/committed/conflict/unknown semantics; no fabricated success | mutation busy states announced; conflict actions accessible |
| Checkout | OCC/version/serviceability errors understandable and recoverable | form labels/errors/focus; keyboard; RTL; font scale |
| Orders list | canonical active/terminal meaning | status announced semantically, not color-only |
| Order tracking | canonical phases, location/proof state, polling/offline clarity | screen-reader journey order; map alternatives; dynamic text |
| Pickup | action only when eligible; terminal/error recovery | PIN/code labels, focus, touch target, RTL |
| Order chat/support | send/retry/readback semantics; no lost message illusion | message order, input label, keyboard/focus |
| Notifications | action route valid or explicit unsupported state; read mutations consistent | item role/state; deep-link focus destination |
| Profile | canonical missing/default state; independent/atomic saves explicit | field labels/errors; focus after save; screen reader |
| Consent | explicit confirmation/cancel semantics | modal focus trap/return, Android back, screen reader text |
| Addresses/location | governed ownership/serviceability; permissions explicit | permission denial recovery, map alternative, RTL forms |
| Benefits/subscriptions | payment/pending/recovery state reflects WLT truth | busy/error/status announcements; no color-only state |
| Wallet | WLT-only truth; stale/error states explicit | currency/amount reading, ledger semantics |
| Ratings | eligibility from canonical order state | star/control semantics, selected state, labels |
| Special requests | durable submit/recovery and operator handoff | form labels, upload/document states, RTL |

Mandatory device proof for closure must include at least the supported Android runtime in RTL Arabic, large font scale, keyboard/open-form behavior, offline/reconnect, process restart, and screen-reader traversal for destructive/financial/order-critical journeys.

---

# 13. Verification matrix

## 13.1 Static/type/architecture

- Typecheck affected workspaces.
- Architecture/boundary guards.
- No app-runtime upward imports from DSH domain/product code.
- No duplicate fulfillment mapping.
- No duplicate terminal/active business-state lists.
- No unsupported profile currency free-string entry points.

## 13.2 Backend/database

- Cart command receipt transactional DB tests.
- Concurrency/replay/fingerprint conflict tests.
- OCC/version conflict tests.
- migration idempotency/restart tests.
- profile domain constraint/data reconciliation tests.
- cross-service WLT compatibility where currency/payment truth is touched.

## 13.3 Mobile durability/runtime

- durable queue survives restart/process death;
- actor switch cannot execute another actor's intent;
- offline -> reconnect uses same command identity;
- storage failure fails closed before network command;
- unknown result reconciles before successor;
- native connectivity drives recovery.

## 13.4 Journey integration

At minimum:

`Discovery -> Store -> Cart -> Checkout -> Order Truth -> Partner preparation -> Dispatch/Pickup -> Delivery/Proof -> WLT/refund -> Support/Rating`

Each cross-surface transition must prove writer -> persisted truth -> reader projection, not merely screen navigation.

## 13.5 Push/deep link

- cold start notification action;
- warm app action;
- malformed/unsupported action;
- actor/session unavailable;
- route parameter encoding/decoding;
- final focus destination.

## 13.6 Product/A11y/RTL

- real interaction tests for consent/destructive actions;
- Android RTL Arabic;
- large text;
- TalkBack/screen-reader traversal for critical journeys;
- touch targets and accessible names/states;
- no important status encoded only by color/icon.

## 13.7 Security/privacy

- actor-scoped Cart/Profile/Address/Support/Order reads and writes;
- no cross-actor durable state replay;
- no sensitive data in share/log/error surfaces;
- deep-link allowlist/validation;
- client cannot write WLT/operator/Partner/Captain authority.

---

# 14. Negative-space audit required after every execution loop

Search semantically, not only by exact symbol name, for:

- duplicate Cart writers or receipt tables;
- post-hoc command receipts;
- alternate idempotency stores;
- raw `localStorage/sessionStorage` on correctness-critical client mutation paths;
- duplicate currency defaults/allowlists;
- raw delivery/fulfillment conversion tables;
- raw order terminal/active arrays;
- fallback profile objects;
- business `default` route/action fallbacks;
- stale compatibility exports;
- dead feature-local wrappers;
- `TODO/FIXME/for now/temporary/legacy/compat/fallback` in material client cone;
- marker tests that claim runtime behavior;
- operator/control-panel or cross-surface writer bypasses for concepts remediated here.

Every hit is classified:

`CANONICAL | REQUIRED_ADAPTER | TRANSITION_ONLY_WITH_DELETION_GATE | DEAD/STALE/DELETE_REQUIRED | OUT_OF_SCOPE_PROVEN`.

Unknown is not equivalent to clean.

---

# 15. Re-diagnosis loop and root preemption

After each Closure Unit:

1. freeze the new live HEAD;
2. rebuild affected Material Cone;
3. compare actual changes with this root contract;
4. scan new writers/readers/consumers/handoffs;
5. re-run semantic duplicate search;
6. re-rank remaining roots by severity + upstreamness + blast radius;
7. if a higher root is exposed, preempt the next planned unit;
8. reconcile/delete superseded structures;
9. rerun proof at the invariant's actual layer;
10. continue until two consecutive complete re-audits expose no new material root and all known roots are terminally classified.

The ledger is updated to reflect reality after each loop. It must not force reality to match the original plan.

---

# 16. Exact Final Candidate closure gates

`CLOSED` is prohibited unless all are true on one exact final HEAD:

### Scope / authority
- Full app-client Material Cone re-derived from final code.
- Every material concept has one proven canonical owner.
- Every writer/reader/consumer/handoff is accounted for.
- No unresolved authority ambiguity.

### Root closure
- R1-R6 are `CLOSED_WITH_EXACT_PROOF` or `N/A_PROVEN` after re-diagnosis.
- No higher root remains known.
- No symptom-only treatment remains.

### Migration / cutover / cleanup
- Migrations complete and restart-safe.
- Existing data/intents reconciled.
- All consumers cut over.
- Old writers/paths disabled then deleted.
- DELETE_REQUIRED ledger empty.
- Negative-space audit clean.

### Runtime/journey
- Core Client journey proven end-to-end against canonical backend/services.
- Offline/process-death/retry/deep-link/push proof complete.
- Product/UX/A11y/RTL matrix complete for material critical states.

### Candidate binding
- Evidence is bound to the exact final SHA.
- Required CI/security/quality checks are green for that SHA.
- Required human review is bound to that SHA where governance requires it.
- Any newer commit invalidates candidate proof until rerun.

### Fixed Point
- Final deep re-audit finds no known material Root/Gap/Shadow/Parallel Truth/Dead Path/Unproven Handoff within the Client cone.
- A second confirmation pass does not expose a new material root.

Only then may status change from `OPEN — NOT CLOSED` to `CLOSED`.

---

# 17. Current execution handoff

## Highest next executable unit

`U1 — Cart transactional command + causal recovery closure`.

## Required pre-mutation gate

Because `ACTIVE_WORKSET` was not supplied, before U1 changes any product/backend/data file the executing coordinator must:

1. resolve latest `f` HEAD;
2. enumerate known concurrent branches/worktrees/sessions supplied by the caller/environment;
3. compare affected paths/concepts;
4. prove one integration authority;
5. classify the U1 write set `PARALLEL_SAFE` or serialize it;
6. then mutate the actual source-of-fix.

This is not permission to stop at planning; it is the concurrency gate that must immediately precede execution.

## Current closure declaration

**OPEN — NOT CLOSED.**

The previous audit's stale findings have been removed/reclassified; the current root graph and closure units above are the authoritative execution ledger for this audit baseline only. The implementation itself remains the only source of product truth, and this ledger must be revalidated on every moved HEAD.