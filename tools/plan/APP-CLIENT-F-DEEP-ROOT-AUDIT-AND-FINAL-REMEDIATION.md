# APP-CLIENT / branch `f` — Deep Root Audit & Final Root-Correct Remediation Ledger

> **STATUS: OPEN — NOT CLOSED**
>
> This file is an execution/closure ledger and evidence index only. It is not a product, runtime, contract, data, design, or governance authority. Canonical truth remains in the actual source-of-fix paths identified below. Documentation records the fix; it must never substitute for the fix.

## 0. Execution identity

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Canonical trunk:** `master`
- **Open PR at audit baseline:** Draft PR `#334`, `f -> master`
- **Target app / audit-execution anchor:** تطبيق العميل (`app-client`)
- **Governing entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Observed orchestrator package revision:** `20`
- **Audit baseline HEAD:** `36e63b046f4165bb7e8b968f7c270a550bb10c81`
- **Audit baseline PR base SHA:** `1c41f0a5d6b94faecf2d01e8e38012ce9912a7bf`
- **Date:** `2026-08-29` (Asia/Aden)
- **ACTIVE_WORKSET:** not supplied by the caller. GitHub proves the branch/PR identity but cannot prove absence of direct concurrent sessions/worktrees. The explicitly requested unique audit-ledger write is allowed. Product/runtime mutation remains subject to the Orchestrator collision gate and must re-resolve the live HEAD and concurrent delta immediately before each mutation wave.
- **Current closure state:** `OPEN / AUDIT_COMPLETE_FOR_INITIAL_ROOT_RANKING / PRODUCT_MUTATION_NOT_YET_AUTHORIZED_AS_PARALLEL_SAFE`

## 1. Selected closure objective

**SELECTED CLOSURE OBJECTIVE:** Close the Client app’s complete material customer-commerce cone root-correctly from Identity/session and mobile runtime through discovery/store truth, cart/checkout, order lifecycle/tracking/pickup/support, notifications/deep links, profile/addresses, subscriptions/benefits and WLT projections, eliminating every durability/identity loss path, cross-layer authority inversion, fail-open route/action contract, shadow mutation identity, stale/bypass path and unverified cross-surface handoff, while preserving canonical backend/data/WLT authority and proving Product/UX/Design/Accessibility/RTL behavior on the exact final candidate.

## 2. Governing execution law

`app-client` is an **Audit/Execution Anchor**, not an independent authority. The only valid loop is:

`AUDIT -> INSPECT -> DIAGNOSE -> ANALYZE -> HIGHEST PROVEN EXECUTABLE ROOT -> CANONICAL TARGET -> ROOT-CORRECT EXECUTION -> MIGRATION/CUTOVER -> CLEANUP/DELETION -> VERIFY -> RE-AUDIT -> RE-RANK -> REPEAT -> FIXED POINT -> EXACT FINAL CANDIDATE`.

Forbidden throughout this scope:

- Patch / workaround / fallback that hides a violated invariant.
- Half migration or indefinite dual read/write.
- Parallel/shadow truth.
- UI-only treatment for data/auth/runtime/backend roots.
- Treating local mobile state as canonical server truth.
- Silent deletion of unresolved user business intent.
- Reusing mutation identity across actors/installations/entities.
- Shared DSH code importing upward from an app runtime implementation.
- A valid-looking business fallback for an unknown route/action.
- Marker-only tests being accepted as proof of mobile/runtime behavior.
- Declaring `CLOSED` because screens render or tests are green while material roots, consumers, deletions, migration, negative-space, or exact-candidate evidence remain open.

## 3. Material cone and authority map

| Material concept | Canonical authority / Source of Truth | Client responsibility |
|---|---|---|
| Actor identity, role, surface, session | Identity | Authenticate as `client`, consume server-derived actor identity, protect credentials locally. |
| Installation identity / durable mutation scope | `@bthwani/data-runtime` | Persist correctness-critical client intent with actor + installation + entity scoping. |
| Native mobile capabilities | Runtime adapters configured through governed capability contracts | Configure Expo/native implementations; shared DSH code must not import app runtime internals. |
| Store/catalog/discovery truth | DSH catalog/store/home-discovery backend + governed content/operator inputs | Search, filter, display, navigate; never own a second catalog/store master. |
| Cart truth | DSH cart backend | Submit actor-scoped intents, preserve unresolved offline commands durably, reconcile to server truth. |
| Serviceability/checkout | DSH governed serviceability + checkout OCC | Carry exact cart/address/version context; fail closed on conflict/policy unavailability. |
| Order truth | DSH canonical order-truth lifecycle | Submit idempotent create intent and read back canonical order state. |
| Delivery/dispatch/pickup/proof | DSH dispatch/pickup authorities | Read client projection, present valid client actions only, never mutate Captain/Partner/operator authority. |
| Support/chat | DSH governed support/order collaboration | Submit customer intents through actor-scoped routes and present canonical readback. |
| Notifications | DSH notification config/delivery truth + mobile notification runtime | Register endpoint, render actor notifications, route action URLs deterministically. |
| Client profile/addresses/consents | DSH client profile/address authority + Identity where applicable | Edit only governed client-owned fields; use location as input, not master truth. |
| Subscription/benefits | DSH marketing/subscription lifecycle + WLT payment truth | Persist mutation identity across ambiguous outcomes; recover, read back, and present states. |
| Wallet/payment/refund ledger | WLT | Read governed client projection and submit only allowed intents; never calculate/persist parallel financial truth. |
| Query/cache state | Data Runtime cache authority | Best-effort read cache only; cache loss must never equal business-intent loss. |
| Design/visual/accessibility/RTL | UI Kit/design authority + product contracts | Compose semantic screens/states with RTL/a11y/safe-area/font-scaling proof. |

Any implementation contradicting this table is a root violation, not a local feature exception.

## 4. Material cone inventory

### 4.1 Runtime / composition shell

Primary runtime:

- `apps/app-client/runtime/src/App.tsx`
- `apps/app-client/runtime/src/index.ts`
- `apps/app-client/runtime/src/navigation/ClientRouteScreen.tsx`
- `apps/app-client/runtime/src/platform/dsh-capabilities.tsx`
- `apps/app-client/runtime/src/platform/client-platform-actions.ts`
- `apps/app-client/runtime/src/media/ClientRemoteImage.tsx`
- `apps/app-client/runtime/app/**`
- `apps/app-client/runtime/app.config.ts`
- `apps/app-client/runtime/tests/**`

The runtime is a composition/native-adapter shell. It configures Identity, SecureStore-backed session/device fingerprinting, query providers, native capabilities, push registration, Expo Router, maps/video/location/media and other device integrations. It must not become a second DSH product/domain owner.

### 4.2 Client DSH surface

Material client surface:

- `services/dsh/frontend/app-client/DshClientSurface.tsx`
- `services/dsh/frontend/app-client/client-navigation.ts`
- `services/dsh/frontend/app-client/account/**`
- `services/dsh/frontend/app-client/cart/**`
- `services/dsh/frontend/app-client/checkout/**`
- `services/dsh/frontend/app-client/finance/**`
- `services/dsh/frontend/app-client/home-discovery/**`
- `services/dsh/frontend/app-client/notifications/**`
- `services/dsh/frontend/app-client/orders/**`
- `services/dsh/frontend/app-client/ratings/**`
- `services/dsh/frontend/app-client/shell/**`
- `services/dsh/frontend/app-client/store/**`
- `services/dsh/frontend/app-client/support/**`

Observed route/capability areas include home, stores/store detail, cart, checkout, orders/order detail, pickup, chat, live tracking/proof, notifications, special requests (including SHEIN/Awnak), wallet, profile/commercial profile/addresses/identity/benefits/preferences, support and support tickets.

### 4.3 Shared DSH client-consumed authorities

Material shared modules include at minimum:

- `frontend/shared/_kernel/**`
- `frontend/shared/mobile-capabilities.ts`
- `frontend/shared/cart/**`
- `frontend/shared/checkout/**`
- `frontend/shared/order-truth/**`
- `frontend/shared/orders/**`
- `frontend/shared/pickup/**`
- `frontend/shared/dispatch/**` client projections
- `frontend/shared/notifications/**`
- `frontend/shared/home-discovery/**`
- `frontend/shared/client-profile/**`
- `frontend/shared/marketing/**`
- `frontend/shared/special-requests/**`
- `frontend/shared/shein/**`
- `frontend/shared/awnak/**`
- support/chat/media modules reached by client journeys.

`shared` is not automatically canonical merely because of its name; ownership is resolved by semantic responsibility and actual writers/readers/consumers.

### 4.4 Cross-service / backend / data / contract cone

Material backend areas include the authenticated client boundaries and downstream lifecycle owners for:

- auth/client surface enforcement;
- cart and serviceability;
- checkout and order creation;
- order lifecycle/cancellation/returns;
- pickup;
- dispatch live tracking and delivery proof client projection;
- notifications and notification configuration;
- client profile/addresses/privacy boundaries;
- home discovery/catalog/store availability;
- special requests;
- support/chat;
- subscriptions/benefits;
- WLT payment/refund/wallet projections.

Material contracts and migrations include the corresponding `services/dsh/contracts/**`, `services/dsh/database/**`, Identity contracts/data where client session is affected, and WLT contracts/data where financial truth is consumed.

### 4.5 Cross-surface consumers/handoffs

The client cone materially touches other surfaces only at real handoffs:

- **Partner:** order acceptance/preparation/partner-delivery projections consumed by client order truth.
- **Captain:** dispatch/location/proof projections consumed by client tracking and proof screens.
- **Control Panel:** operational order intervention, dispatch/proof review, notification configuration, catalog/home content governance, support and relevant policy/config writers.
- **WLT:** payment/refund/wallet/benefit financial truth.

No unrelated Partner/Captain/Field/Control-Panel functionality is in scope.

## 5. Root graph

```text
Identity actor/session + app-client surface gate
        |
        +--> Data Runtime installation identity / durable mutation scope
        |
        +--> app-client runtime native capability configuration
        |        |
        |        +--> DSH mobile capability contracts
        |
        v
DshClientSurface / Expo route bridge
        |
        +--> Home discovery -> Store/catalog truth -> Store detail
        |
        +--> Cart controller -> governed HTTP -> authenticated client cart
        |       |                                |
        |       +--> offline mutation identity   +--> OCC/idempotency/data
        |       +--> serviceability              |
        |                                        v
        +--> Checkout -> canonical checkout -> Order Truth create/readback
        |                                        |
        |                                        +--> Partner preparation
        |                                        +--> Pickup
        |                                        +--> Dispatch/Captain tracking/proof
        |                                        +--> cancellations/returns
        |                                        +--> WLT payment/refund
        |
        +--> Notifications -> in-app action / push deep link -> Client route contract
        |
        +--> Profile/addresses -> governed client-owned data/location inputs
        |
        +--> Benefits/subscriptions -> durable mutation attempt -> DSH/WLT payment truth
        |
        +--> Wallet -> WLT read/request projection
        |
        +--> Support/chat -> governed client collaboration
```

The current highest proven root cluster is **fragmented correctness-critical mobile mutation lifecycle ownership**: some client mutations use the canonical durable actor/installation-scoped model, while Cart bypasses it entirely and subscription recovery state is destructively coupled to session termination.

## 6. Proven canonical boundaries to preserve

### P-CAN-01 — Runtime Identity ownership is correctly separated

`apps/app-client/runtime/src/App.tsx` configures the Identity session and a stable installation/device fingerprint using secure mobile storage, then gates DSH client UI by `requiredRole="client"` / `requiredSurface="app-client"`. Client product code does not mint actor authority locally.

**Preserve:** server-derived actor identity, SecureStore-backed credentials/fingerprint, and surface/role gating.

### P-CAN-02 — A native capability injection boundary already exists

`services/dsh/frontend/shared/mobile-capabilities.ts` defines configurable adapters/renderers for secure randomness, location, image/document pickers, maps, video, notifications and linking. `apps/app-client/runtime/src/platform/dsh-capabilities.tsx` supplies Expo/native implementations.

**Preserve and extend rather than bypass:** runtime implements native capabilities; DSH consumes contracts.

### P-CAN-03 — Order creation already demonstrates correct durable mutation identity + canonical readback

`order-truth-create-attempt.ts` scopes an attempt by actor + durable installation + checkout intent and stores the idempotency/correlation identity through the durable mutation registry. `use-order-truth-controller.ts` does not accept the mutation response as final truth; it reads the created order back through the actor-scoped endpoint and clears the attempt only after a matching canonical readback.

**Preserve and reuse this pattern for other correctness-critical client mutations.**

### P-CAN-04 — Checkout carries explicit OCC/version truth

The client checkout carries `expectedCartVersion`, the backend validates governed serviceability/current cart version, and order creation uses idempotency/correlation context. Do not weaken OCC to make an offline path easier.

### P-CAN-05 — WLT ownership is separated at the client wallet boundary

`WltClientWalletPanel` is a client projection over WLT-owned balance/ledger truth. It does not calculate a second balance or turn DSH client UI into a financial master.

### P-CAN-06 — Push endpoint lifecycle is actor/session aware

Mobile push registration is activated only for authenticated native sessions, deactivates the registered endpoint on session end/unmount, handles token rotation, and routes push taps through the mobile notification runtime.

### P-CAN-07 — Existing UI contains useful accessibility/RTL primitives

Examples include tab roles/selected state in the bottom navigation, RTL row direction, semantic UI-kit surfaces and explicit accessible order labels. These are positive boundaries to preserve; runtime/device verification is still required before closure.

## 7. Root-ranked material findings

### R1 — CRITICAL / PROVEN: correctness-critical client mutation durability is fragmented and Cart can lose, mis-scope or falsely acknowledge offline intent

#### Evidence

`services/dsh/frontend/shared/cart/cart-sync.queue.ts`:

- persists the queue directly with global `localStorage` key `dsh_cart_sync_queue`;
- creates `deviceId` from `localStorage` and `sessionId` from `sessionStorage`;
- catches storage failures and returns an empty queue / `unknown-device` / `unknown-session`;
- explicitly swallows queue write errors, stating that offline capabilities are simply lost;
- has no actor id, installation id or entity scope in the queue identity.

`use-cart-controller.tsx`:

- actively uses this queue for add/remove/update/clear network failures;
- attempts auto-sync through browser `window`/`navigator` online semantics rather than the existing mobile connectivity authority;
- deletes any queued command that fails with an error other than network/version conflict, with no canonical readback or quarantine;
- returns `true` for several offline-pending remove/update/clear operations even though the server has not committed them, while add returns `false`, creating inconsistent acceptance semantics;
- exposes `clearOfflineQueue` without proving server resolution of each outstanding intent.

`apps/app-client/runtime/tests/client-cart-runtime.execution.test.mjs` manually installs a fake `globalThis.localStorage`, so the test verifies a browser-like harness instead of the real React Native durability path. The test therefore masks the native-runtime failure mode.

The repository already owns the correct contract in `@bthwani/data-runtime`:

- `BthwaniDurableStore` is explicitly designated for `DURABLE_OFFLINE_COMMAND`, `UNKNOWN_REMOTE_OUTCOME`, mutation identity and recovery quarantine;
- durable writes/removals fail closed;
- `getBthwaniInstallationId()` survives restart and session lifecycle;
- mutation scope is `actor + installation + entity` and rejects actor/installation/entity mismatch.

The DSH cart backend derives `actor.ID` from the authenticated client session. An unscoped local queue replayed after an actor change therefore risks executing old local intent under the current authenticated actor unless the client fences it.

#### Root

Cart created a parallel mobile mutation-lifecycle subsystem outside the repository’s canonical durability and mutation-identity authorities. Authentication/session lifecycle, installation identity, offline command durability, connectivity and remote outcome reconciliation are not owned coherently.

#### Canonical treatment

1. Replace direct `localStorage`/`sessionStorage` Cart durability with the canonical `@bthwani/data-runtime` durable store.
2. Scope every persisted Cart command by authenticated actor id + durable installation id + cart/store/entity identity.
3. Reuse the canonical durable mutation-attempt registry/pattern where applicable; do not create another persistence abstraction.
4. Replace Cart-specific `getDeviceId/getSessionId` shadow identity with canonical installation/mutation identity semantics required by the governed HTTP contract.
5. Define explicit local operation states: `pending_local`, `submitted_unknown`, `committed`, `conflict`, `permanent_failure`, `quarantined`, `discarded_by_governed_decision`.
6. A storage failure before a network mutation must fail closed; never send a correctness-critical mutation whose retry identity could not be persisted.
7. Use the governed mobile connectivity adapter/NetInfo path; do not depend on browser online events in React Native.
8. On ambiguous network outcome, reconcile by canonical server receipt/readback/idempotency evidence before replay/removal. If the backend lacks sufficient readback, extend the canonical server contract rather than guessing locally.
9. Never delete a non-network error silently. Classify terminal/retryable/conflict/unknown and surface or quarantine it.
10. Make UI return semantics distinguish “server committed” from “queued locally”. Do not return success for uncommitted server state.
11. Remove or govern `clearOfflineQueue`; unresolved business intent may be purged only after proven resolution or an explicit, auditable discard decision.
12. Add process-death, app-restart, network-loss-after-send, logout/re-login, actor-switch, storage-failure and duplicate-retry tests.

#### Migration / cutover

- Inventory existing persisted web Cart queue entries before changing the key/format.
- Legacy queue entries have no actor/install scope and must **never** be rebound automatically to the currently logged-in actor. Fence/quarantine them as unattributed legacy intent or require explicit safe re-entry; do not replay them.
- Native installations must be tested for the current effective behavior; do not assume an empty queue proves absence of user intent.
- Cut over all Cart readers/writers/sync/retry paths atomically to the durable scoped model.

#### DELETE_REQUIRED

After cutover and proof, delete:

- direct Cart `localStorage`/`sessionStorage` persistence;
- Cart-local `getDeviceId()` / `getSessionId()` shadow identity;
- silent storage-error swallowing that fabricates an empty queue;
- generic-error queue deletion without terminal proof;
- browser-only online-listener ownership from the mobile Cart controller;
- any old queue format/key consumer once migration/quarantine is complete.

#### Closure proof

- Killing/restarting the app after local acceptance cannot lose an unresolved command.
- Logout/token expiry cannot erase unresolved intent.
- A different actor on the same installation cannot view/replay the previous actor’s commands.
- Same actor after re-auth can recover/reconcile its own commands.
- Storage failure prevents unsafe mutation submission.
- Unknown remote outcome cannot cause duplicate mutation or false success.
- Every terminal queue deletion has canonical evidence or explicit governed discard evidence.

---

### R2 — CRITICAL/HIGH / PROVEN: subscription recovery identity is durable but is destructively erased on session termination

#### Evidence

`subscription-mutation-attempt.ts` correctly persists purchase/activate/renew/cancel attempts through `bthwaniDurableStorage`, namespaced by actor + installation + operation + subject.

`subscription-lifecycle.api.ts` normally clears attempts only after a terminal/accepted lifecycle response and contains explicit recovery for the latest purchase attempt.

However `use-subscription-lifecycle-controller.tsx` registers:

`registerIdentityBeforeSessionEndHook(() => clearSubscriptionMutationAttempts(actorId))`

which deletes every durable mutation attempt for that actor/install when the Identity session ends.

#### Root

Authentication-secret lifecycle and unresolved financial/business mutation lifecycle are coupled. Session termination is being treated as proof that durable subscription intent is safe to delete, which it is not.

#### Canonical treatment

1. Remove session-end bulk deletion of unresolved subscription mutation attempts.
2. Session end may clear credentials/cache/push endpoint state, but not unresolved durable business intent.
3. Preserve actor-scoped attempts across logout/token expiry/process death.
4. On the same actor’s re-authentication, resume canonical recovery/readback.
5. On a different actor, keep previous attempts inaccessible and non-executable.
6. Clear only after terminal canonical response/readback, supersession proven by server truth, retention expiration under an explicit policy, or an auditable governed discard.
7. Add tests for logout/token revocation after request transmission but before response, and for app restart before payment activation/readback.

#### DELETE_REQUIRED

Delete the session-end `clearSubscriptionMutationAttempts(actorId)` behavior as a generic lifecycle hook once recovery ownership is corrected. Retain targeted terminal cleanup only.

#### Closure proof

An unknown-result subscription purchase/renew/activate/cancel cannot lose its idempotency/correlation identity merely because the session ended.

---

### R3 — HIGH / PROVEN: DSH shared/package code imports upward from the app runtime, creating inverted platform ownership and a conceptual dependency cycle

#### Evidence

`@bthwani/app-client-runtime` depends on `@bthwani/dsh`.

Yet DSH client code imports runtime implementation files directly:

- `DshClientSurface.tsx` -> `apps/app-client/runtime/src/platform/client-platform-actions` for external URLs/haptics.
- `orders/OrdersListScreen.tsx` -> the same runtime file for document sharing.
- `home-discovery/HomeDiscoveryShell.tsx` -> runtime `ClientRemoteImage` and `createClientEphemeralId`.

The runtime already configures a governed `@bthwani/dsh/mobile-capabilities` boundary for native implementations. The current direct imports bypass that architecture.

`client-operational-experience-contract.test.mjs` further institutionalizes the wrong dependency by asserting these runtime implementation markers from DSH client files.

#### Root

Native/platform/media capability ownership is split between the reusable DSH package and its consuming app runtime. Tests freeze the bypass rather than enforce the intended dependency direction.

#### Canonical treatment

1. Establish the minimal correct owner for each missing capability: haptic selection, safe external URL open, secure ephemeral ids, sharing and remote image rendering/caching.
2. Prefer the existing DSH mobile-capability injection boundary for DSH-specific native capabilities; use UI-kit only where the capability is truly generic visual infrastructure.
3. Runtime files may implement/configure adapters; DSH product/surface code consumes only the canonical contract.
4. Migrate every DSH consumer before deleting runtime imports.
5. Replace marker tests that require `services/** -> apps/**` imports with negative dependency-boundary tests that forbid them.
6. Add an architecture guard: `services/**` must not import from `apps/**` except an explicitly governed build-only case proven N/A here.

#### DELETE_REQUIRED

After cutover delete all `services/dsh/** -> apps/app-client/runtime/**` imports and any client-runtime helper that becomes orphaned or moves to the canonical capability owner.

#### Closure proof

- `@bthwani/app-client-runtime -> @bthwani/dsh` remains one-way.
- No DSH service source reaches upward into app runtime source.
- Native behavior remains functional on Android/iOS through configured adapters.
- Tests fail if the inverted dependency is reintroduced.

---

### R4 — HIGH / PROVEN: Client route/action contracts fail open into valid-looking but semantically wrong behavior

#### Evidence A — route renderer fallback

`client-navigation.ts` defines a discriminated `DshClientRoute` union and an exhaustive `dshClientRouteToPath` mapping.

But `DshClientSurface.tsx` contains business fallbacks:

- `routeTab(...)` ends in `default -> "profile"`;
- the primary route renderer ends with `case "profile": default:` and renders `MySpaceScreen`.

A new/unhandled route can therefore become a plausible Profile screen instead of surfacing route-contract drift.

#### Evidence B — notification action dispatcher

`dshClientRouteFromActionUrl()` only decodes a subset: order/pickup/chat/orders, special requests and notifications.

The full Client route contract also includes stores/store, wallet, cart, profile subroutes, support/support-ticket and others.

`ActorNotificationsPanel` normally supports a safe URL opener when no custom callback is supplied. `NotificationCenterScreen` supplies `onOpenActionUrl`, and `DshClientSurface` then routes only through the partial client decoder. Unknown/unhandled action URLs become a no-op rather than an explicit unsupported action or safe external navigation.

`DshNotification.actionUrl` is a general string and platform notification configuration exposes a `deepLinkPattern`; the consumer must therefore define a deterministic accepted contract rather than silently ignoring drift.

#### Root

There is no single fail-closed route/action decoding boundary shared by Expo routing, in-app notifications and DSH surface rendering. Business fallbacks hide contract drift.

#### Canonical treatment

1. Make every `DshClientRoute` consumer compile-time exhaustive; use `assertNever`/equivalent rather than valid-business defaults.
2. Create one canonical route/action decoder policy for supported internal client destinations.
3. Mechanically validate Expo Router files/parameter bridges against the client route contract.
4. Route notification internal actions through that canonical decoder.
5. Preserve explicitly allowed HTTPS/external actions through the governed safe opener; reject unsafe schemes.
6. Unknown/malformed internal actions must produce an explicit diagnostic/unsupported state, never Profile/Home or silent no-op.
7. Add positive tests for every route kind and negative tests for unknown, malformed and unsupported actions.
8. Ensure marking a notification read and opening its action have explicit independent semantics; action failure must be observable if the user tapped expecting navigation.

#### DELETE_REQUIRED

Delete Profile/default business fallbacks, duplicate action parsers that become superseded, and any silent no-op path used as compatibility behavior.

#### Closure proof

Adding a new route/action kind must fail compilation/tests until path conversion, Expo bridge, renderer and notification/deep-link handling are explicitly supplied or proven N/A.

---

### R5 — HIGH / PROVEN VERIFICATION ROOT: current tests encode implementation markers and browser shims that can certify the wrong architecture/runtime

#### Evidence

- `client-cart-runtime.execution.test.mjs` injects a fake `localStorage`, allowing a queue implementation that is not valid mobile durability to pass.
- `client-operational-experience-contract.test.mjs` uses source-marker assertions and explicitly expects DSH code to use runtime platform helpers, preserving R3.
- Multiple marker tests prove file strings/presence, not process-death/session-switch/unknown-outcome/native adapter behavior.

Static contract tests remain useful, but they cannot be the final proof for the roots above.

#### Canonical treatment

1. Keep fast structural tests only for real invariants.
2. Add behavioral unit tests over the canonical durable storage and mutation registry with failure injection.
3. Add native/mobile runtime tests for process death/restart, connectivity transitions, actor switch and permission/capability failure.
4. Add route/deep-link parity tests and negative unknown-route tests.
5. Add dependency-direction guard tests.
6. On exact candidate, run typecheck/lint/tests/runtime/export plus relevant backend/contracts/database and journey checks selected by live CI routing.

#### Closure proof

A test suite cannot pass while reintroducing browser-only Cart durability, cross-actor queue replay, session-end attempt loss, `services -> apps` imports or route business fallbacks.

## 8. Current branch delta relevant to app-client

At the audit baseline, `f` is ahead of `master` and the open Draft PR contains material backend changes in areas consumed by the Client surface, including Identity/DSH auth boundaries, order lifecycle/cancellation/returns, dispatch/delivery proof/live tracking, pickup and related contracts/data. The app-client frontend itself is not the primary source of those branch deltas.

Therefore **“no direct app-client diff” is not proof of “client unaffected.”** Final closure must verify the Client readers/actions against the live backend contracts and states on the exact candidate.

Required cross-surface compatibility proof includes at minimum:

- client authentication/surface gate;
- cart/serviceability/checkout OCC;
- order collection/detail/create/cancel/return states;
- pickup session;
- dispatch live tracking/proof projection;
- support/chat;
- notification action targets;
- payment/refund/wallet projections;
- partner/captain/operator state changes visible to the client.

## 9. Product / UX / Design / Accessibility / RTL audit ledger

Code inspection shows meaningful existing support for Arabic, RTL and accessibility, but code inspection alone is not device proof. Closure requires all materially reachable client states to be exercised on the final candidate.

### 9.1 Required screen/journey matrix

Verify at minimum:

- Home/discovery/search/filter/banner/promo/reels.
- Stores list/detail/categories/product selection.
- Cart: empty, loaded, offline pending, conflict, permission denied, generic error, serviceability blocked.
- Checkout: address/serviceability, cart-version conflict, payment transitions, order creation/readback.
- Orders: empty/list/detail, active states, pickup, partner delivery, bThwani delivery, live tracking, proof, terminal/refund states.
- Notifications: empty/error/unread/read/action navigation/push tap/cold-start deep link.
- Special requests: index, SHEIN, Awnak, validation, submit/readback states.
- Profile: My Space, commercial profile, addresses/location, identity, benefits/subscriptions, preferences.
- Wallet: loading/empty/error/ledger and governed actions if exposed.
- Support: order-linked support, ticket detail/create/error/readback.

### 9.2 State coverage required per material screen

Where applicable prove:

`loading | empty | success | partial/stale | offline | forbidden | conflict | validation error | server error | retrying | submitting | unknown outcome | terminal success`.

### 9.3 Accessibility/RTL/device proof

For Android and any supported iOS/web target, verify:

- true RTL layout, logical start/end spacing, no double reversal;
- Arabic/English mixed identifiers use safe bidi isolation;
- font scaling and long Arabic copy do not truncate critical actions;
- touch targets remain operable;
- screen-reader labels/roles/states for navigation, cart actions, order actions, modals, maps and media;
- keyboard/focus/modal behavior where a keyboard is used;
- safe-area behavior and bottom-navigation overlap;
- contrast and disabled/busy/error semantics;
- location/camera/gallery/document/notification denied states;
- process background/foreground and deep-link cold/warm starts.

Any defect discovered here joins the same root-ranking loop; do not create a cosmetic patch list detached from its canonical owner.

## 10. Initial execution order / closure units

### Closure Unit 1 — Client durable mutation lifecycle convergence

**Highest current root.** Treat R1 + R2 as one canonical durability/lifecycle wave where shared source-of-fix overlaps:

- Data Runtime durable storage/mutation scope;
- Cart queue/controller/API semantics;
- subscription attempt lifecycle;
- Identity session-end boundary;
- connectivity/recovery/readback;
- tests and legacy queue migration.

Do not begin with Cart screen cosmetics.

### Closure Unit 2 — Native capability/dependency-direction cutover

Treat R3 end-to-end:

- capability owner selection;
- adapter contract extension where necessary;
- consumer migration;
- test migration;
- deletion of all DSH -> app-runtime source imports;
- dependency guard.

### Closure Unit 3 — Client route/deep-link/notification fail-closed contract

Treat R4 end-to-end:

- route union/renderer/tab mapping;
- Expo file bridge;
- notification center actions;
- push action URLs;
- safe external URL policy;
- negative-space tests.

### Closure Unit 4 — Exact-candidate cross-surface and UX closure

After roots are cut over:

- re-audit all material Client journeys/readers against the current backend/data/contracts/WLT state;
- execute Android/native UX/a11y/RTL/state-matrix proof;
- run exact-candidate CI/security/quality/runtime/journey evidence;
- delete all newly exposed stale/duplicate/bypass residue;
- re-rank until fixed point.

## 11. Concurrency / mutation gate

The caller did not replace the `ACTIVE_WORKSET` placeholder with a real snapshot. Existing plan files on `f` prove other app audits have occurred, but they do not prove whether those sessions are currently mutating the branch.

Per the Orchestrator:

- read-only audit may continue;
- this unique plan-file write is explicitly authorized by the human instruction;
- **product mutation must re-resolve live HEAD + PR + foreign delta + known active work immediately before write**;
- if overlap with active Field/Captain/other work is material, serialize or split only at a proven independent closure-unit boundary;
- never claim `PARALLEL_SAFE` from absence of evidence.

This is a mutation-safety gate, not a reason to downgrade or forget the roots above.

## 12. Verification and closure gates

`CLOSED` is forbidden until all applicable gates pass on the exact final candidate:

### Root closure

- R1–R5 are `FIXED_VERIFIED` or replaced by a higher proven root that is itself closed.
- No unresolved `UNKNOWN MATERIAL` node remains in the Client cone.
- No symptom-only or wrapper-only treatment remains.

### Authority / migration / cleanup

- one owner per material concept;
- all writers/readers/consumers migrated;
- no unscoped Cart queue/shadow device-session identity;
- no unresolved subscription attempt deletion on session end;
- no `services/dsh/** -> apps/app-client/runtime/**` dependency;
- no fail-open business route/action fallback;
- no obsolete compatibility path, dead helper or stale test expectation;
- all `DELETE_REQUIRED` work completed in the same root closure wave.

### Data / auth / security / finance

- actor isolation and installation scoping proven;
- no cross-actor replay/read;
- idempotency/unknown-outcome behavior proven;
- secrets/session cleanup remains correct without deleting business intent;
- WLT remains the financial authority;
- PII/location/address access remains actor-scoped.

### Runtime / Product / UX

- Android native runtime proof for storage/connectivity/deep links/push/location/media.
- all material states/journeys verified including negative-space and failure states.
- accessibility/RTL/device layout proof complete.

### Exact candidate

- live branch/PR/head SHA re-resolved immediately before final evidence;
- required CI/runtime/journey/backend/contracts/database/security checks pass on that exact SHA;
- any newer commit invalidates previous closure evidence and requires re-verification;
- final adversarial/negative-space re-audit returns no material finding.

## 13. Current status and next executable root

**STATUS: OPEN — NOT CLOSED.**

**Highest proven executable root:** `R1 — Client durable mutation lifecycle convergence`, clustered with the overlapping subscription session-lifecycle defect in `R2`.

**Immediate source-of-fix direction:** canonical `@bthwani/data-runtime` durability/mutation-scope authority + DSH Cart/subscription lifecycle consumers, not app-client screen patches.

**Current blocker before product mutation:** resolve the live `ACTIVE_WORKSET`/collision state and re-pin the exact live `f` HEAD. Once that gate is satisfied, execute Closure Unit 1 immediately, verify, re-audit/re-rank, then continue until fixed point.
