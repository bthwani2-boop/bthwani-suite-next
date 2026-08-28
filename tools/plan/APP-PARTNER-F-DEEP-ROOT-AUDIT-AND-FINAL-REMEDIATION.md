# APP-PARTNER — Deep Root Audit & Final Remediation Ledger

> **Repository:** `bthwani2-boop/bthwani-suite-next`  
> **Branch:** `f`  
> **Target anchor:** `app-partner` / تطبيق الشريك  
> **Audit baseline commit:** `36e63b046f4165bb7e8b968f7c270a550bb10c81`  
> **Baseline tree:** `358f760470438ac9d6d633b82585131a33c53463`  
> **Audit date:** `2026-08-29`  
> **ACTIVE_WORKSET:** `NOT_DECLARED`  
> **Open PRs targeting `f` at audit time:** none discovered  
> **CLOSED:** **NO**

---

## 0. Authority, validity, and non-authoritative plan law

This file is a **task-local audit/execution ledger only**. It is not a product, runtime, contract, data, architecture, or closure authority and must never become a Parallel/Shadow Truth.

The exclusive orchestration entrypoint for this work is:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

The audit loaded the current package chain on branch `f`:

- `00-ORCHESTRATOR.md`
- `01-SCOPE-AUTHORITY-RULES.md`
- `02-DIAGNOSE-ROOT-CAUSE.md`
- `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md`
- `04-VERIFY-REDIAGNOSE-CLOSE.md`
- `05-OBJECTIVES-PLAYBOOK.md`
- `focus/code-architecture-organization.md`
- `focus/governance-product-design.md`
- `focus/data-contracts-runtime-security-quality.md`

Observed orchestrator package revision: **20**.

### Validity rule

Every execution loop must first compare current `f` HEAD with the audit baseline above. If HEAD changed, the delta must be inspected and this ledger re-derived before any mutation. `ACTIVE_WORKSET=NOT_DECLARED` means collision safety is **not proven** merely because GitHub has no open PR targeting `f`; local sessions, worktrees, direct branch writers, or other agents may still exist.

---

# 1. Selected Closure Objective

**Close the complete material cone of `app-partner` root-correctly from canonical runtime/router through Identity, DSH partner/store/catalog/orders/support/notifications/analytics/onboarding, Control Panel operator writers, contracts/backend/data and WLT handoffs; eliminate every proven local/parallel/dead authority, migrate every affected consumer to the actual Source-of-Fix, perform full cutover/reconciliation/cleanup/deletion, then re-audit in loops until one Exact Final Candidate satisfies all orchestrator Closure Gates with zero known material gaps.**

This objective is app-centric, not app-local. `app-partner` is an **Audit/Execution Anchor**, never an independent authority.

---

# 2. Deep-audit method

The audit applied this order:

`PIN HEAD -> LOAD ORCHESTRATOR -> DISCOVER PHYSICAL TOPOLOGY -> INVENTORY APP CAPABILITIES -> TRACE OWNERS/WRITERS/READERS/CONSUMERS -> TRACE CONTRACT/API/AUTH/RUNTIME HANDOFFS -> BUILD ROOT GRAPH -> TEST SUSPECTED FINDINGS AGAINST UPSTREAM TRUTH -> RANK PROVEN ROOTS -> DEFINE CUTOVER/CLEANUP/VERIFICATION -> RECHECK HEAD`

A screen-level symptom is not accepted as a root. A finding enters the executable queue only when its current owner/consumer path and a safer higher source-of-fix can be demonstrated.

---

# 3. Physical topology and ownership truth

## 3.1 Runtime/launcher ownership

`apps/app-partner` is **not** the sovereign feature implementation tree. At the pinned baseline it contains the runtime application under:

- `apps/app-partner/runtime/start.ps1`
- `apps/app-partner/runtime/package.json`
- `apps/app-partner/runtime/app/**`
- `apps/app-partner/runtime/src/App.tsx`
- `apps/app-partner/runtime/src/navigation/PartnerRouteScreen.tsx`
- `apps/app-partner/runtime/src/platform/dsh-capabilities.tsx`
- runtime wiring/router/order/support tests

Root `package.json` launches the partner runtime through the governed runtime wrapper. The runtime owns application composition/native bindings/router integration/session gating; it must not absorb DSH business truth that belongs upstream.

## 3.2 DSH partner feature ownership

The actual partner feature surface is exported by `@bthwani/dsh` and physically lives under:

`services/dsh/frontend/app-partner/**`

Material areas discovered include:

- account / entry / onboarding / hub / settings / support / promotions / analytics
- catalog / inventory / product edit / media / overrides / reels / pricing
- orders / acceptance / preparation / dispatch / issue queue / conversation / fulfillment
- store profile / courier governance / delivery pricing / store scope
- team management
- ratings / field-rating gate
- WLT finance bridge/screens
- route renderer / navigation contracts / surface model

## 3.3 Shared partner brain

`services/dsh/frontend/shared/partner/index.ts` explicitly identifies itself as the **Partner Onboarding & Store Publication — shared brain public barrel** and requires surfaces to consume the public barrel/capability entrypoints rather than implementation modules.

Material shared authorities include partner activation/readiness/status, scopes, store ownership/governed stores, store settings/coverage/courier settings, team, catalog, onboarding, field progress, analytics, commercial summary, registry/workspace and governed partner APIs.

## 3.4 Contract/API authority

`services/dsh/contracts/paths/partner.paths.yaml` is explicitly marked **Source of truth** and is composed into the DSH OpenAPI root. It defines material partner operations including, among others:

- partner store settings read/write
- courier settings
- coverage zones
- partner orders and order lifecycle transitions
- field onboarding/operator collaboration paths
- partner finance settlement proxy paths
- operator partner/policy/governance paths

`services/dsh/frontend/shared/partner/partner.api.ts` is the governed frontend HTTP boundary; raw screen-level fetch/axios is not the intended authority.

## 3.5 Identity/auth boundary

`services/dsh/backend/internal/auth/partner_actor.go` proves Identity owns executable partner actor identity/access and activation handoffs through internal service-authenticated calls, including:

- partner actor provisioning
- per-store executable access replacement/revocation
- partner activation issuance
- operator context, service token, idempotency/correlation propagation

DSH must not invent a second partner identity/access authority inside the mobile surface.

## 3.6 Control Panel writer/reader boundary

`services/dsh/frontend/control-panel/partners/PartnerGovernanceWorkspaceScreen.tsx` consumes shared partner controllers and explicitly fail-closes instead of substituting local data when DSH Runtime is unavailable. Its workspaces cover onboarding, activation, documents, readiness, catalog exceptions, performance, promotion eligibility, service levels, contracts and deactivation.

Therefore operator decisions that materially change partner/store lifecycle remain in the governed operator/control-plane path; `app-partner` consumes the resulting truth within its permitted self-service boundary.

## 3.7 WLT boundary

Partner finance is a material consumer/handoff, not a DSH-owned financial ledger. The partner contract exposes governed DSH finance proxy reads while WLT service authentication remains server-side. The partner UI already uses the WLT/DSH bridge and must preserve WLT as the financial source of truth.

## 3.8 UI foundation / RTL / appearance boundary

`shared/ui-kit/src/providers.tsx` owns shared UI direction/theme/appearance provider primitives, including `BThwaniAppearanceProvider`, appearance token resolution, `DirectionProvider`, RTL derivation, language synchronization and `UiKitProvider`.

The target app may own persisted **user preference** at the runtime/app boundary, but must not create disconnected per-screen appearance truths.

---

# 4. Material Cone

The currently proven cone is:

```text
root package command
  -> apps/app-partner/runtime/start.ps1
  -> Expo runtime + Router
  -> IdentitySessionGate(role=partner, surface=app-partner)
  -> PartnerFieldRatingGate
  -> DshPartnerSurface
     -> canonical store-scope selection
     -> partner activation/readiness
     -> DshPartnerRouteRenderer
        -> account/hub/settings/support/analytics/promotions
        -> catalog/inventory/products/media/pricing
        -> orders/preparation/issues/conversation/dispatch
        -> store/courier/coverage/settings
        -> team
        -> WLT finance
  -> shared DSH controllers/public partner API
  -> DSH OpenAPI contracts
  -> DSH backend authorization/domain persistence/outbox boundaries
  -> Identity partner actor/store-access boundary where applicable
  -> WLT server-side financial authority where applicable
  -> Control Panel operator writers/readers where lifecycle/governance applies
  -> other material consumers: app-client / app-field / app-captain only when the same canonical store/catalog/order/readiness/dispatch truth is affected
```

### Scope exclusion law

No unrelated app/service is admitted merely because it exists in the monorepo. Cross-surface work is included only when a target-app root shares the same canonical authority, transition, contract, persisted truth, or handoff.

---

# 5. Root graph

## Root G1 — identity/session/store scope

```text
Identity actor + role + surface permission
  -> runtime IdentitySessionGate
  -> shared partner scopes
  -> selected canonical store
  -> store-scoped partner features
```

Any role/store-access defect must be fixed at Identity/access or shared scope resolution, not hidden in a route/screen fallback.

## Root G2 — partner/store lifecycle

```text
operator/shared partner lifecycle writers
  -> DSH contract/backend truth
  -> activation/readiness/store settings/coverage readback
  -> Partner Hub / onboarding / catalog / visibility
```

## Root G3 — orders

```text
DSH order state machine + contracts
  -> shared partner order runtime/commands
  -> app-partner order workboard/journey
  -> dispatch/captain/client consumers where materially affected
```

The partner order workboard is a consumer. It must not become an alternate order-state machine.

## Root G4 — notifications

```text
DSH notification preferences API
  -> shared notifications API/controller
  -> app-partner settings presentation
```

This graph currently contains a proven bypass; see R1.

## Root G5 — appearance

```text
app/runtime persisted user preference
  -> BThwaniAppearanceProvider / UI-kit tokens
  -> all app-partner consumers
```

The Hub currently creates a local node below this intended root; see R3.

## Root G6 — finance

```text
WLT financial truth
  -> governed server-side DSH/WLT handoff/proxy
  -> partner finance consumer
```

No mobile-side balance/settlement authority is permitted.

---

# 6. Positive canonical boundaries to preserve

The audit found several patterns that must **not** be destroyed while fixing local gaps:

1. `IdentitySessionGate` requires both partner role and partner surface before the DSH surface is mounted.
2. `DshPartnerSurface` uses shared canonical store-scope selection and fail-closed states for absent/multiple/invalid scopes.
3. `PartnerHubScreen` reads real partner self-status/readiness and real store settings/coverage instead of manufacturing successful store state.
4. Store settings parsing rejects malformed contract payloads rather than silently accepting defaults.
5. WLT finance crosses a governed bridge/proxy rather than copying financial authority into DSH mobile state.
6. Control Panel partner governance consumes shared controllers and explicitly refuses local substitute data when runtime truth is unavailable.
7. `partner.paths.yaml` provides a canonical OpenAPI contract boundary.
8. Shared UI kit owns RTL/direction/appearance tokens/providers rather than every screen defining its own design foundation.

---

# 7. Proven root-ranked findings

## R1 — HIGH — PROVEN — Partner notification preferences have a parallel UI truth

### Evidence

`services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx`:

- creates `failClosedNotificationPreferences` with every preference `false`;
- initializes independent `notificationPreferences` screen state from that object;
- optimistically mutates that local state;
- dynamically imports and calls `updateNotificationPreferences` directly;
- rolls back only the last local value on mutation failure;
- does **not** load canonical current preferences before presenting them;
- does **not** perform canonical post-write readback/reconciliation.

But `services/dsh/frontend/shared/notifications/notifications.api.ts` already provides canonical fetch/update functions, and `services/dsh/frontend/shared/notifications/use-notifications-controller.tsx` already owns the correct lifecycle: load current server truth, update, then re-fetch/reconcile.

`services/dsh/capability-map.ts` also classifies `dsh.notifications` as `experience-fix-required` / `FIX_REQUIRED` and lists `app-partner` among its material surfaces.

### Root cause

The Hub bypasses the shared notification state/controller authority and has become a second preference truth.

### Actual Source-of-Fix

`services/dsh/frontend/shared/notifications/**` controller authority + Hub consumer wiring.

### Required root treatment

- Bind Partner Hub settings to `useNotificationsController()` (or the current canonical equivalent if HEAD changes).
- Load/display server truth; no all-false screen-owned initial truth masquerading as current preference state.
- Use controller mutation/readback semantics.
- Preserve loading/error/offline/unauthenticated fail-closed states explicitly.
- Remove the Hub-local notification preference authority and direct dynamic mutation path after cutover.
- Add tests proving initial readback, successful mutation reconciliation, failure behavior, and remount consistency.

### Forbidden treatment

Do not keep the local state and merely add an initial fetch. That would retain dual ownership.

---

## R2 — HIGH — PROVEN — One Hub action can emit multiple navigation commands

### Evidence

In `PartnerHubScreen.tsx`:

- `openOrderAlerts()` calls both `onOpenOperationalFlow("order-alerts")` **and** `onOpenBell()`.
- `openOperationsDirectory()` calls `onOpenOperationalFlow("order-issue-queue")`, `onOpenSupportDirectory()`, **and** `onOpenSupportScreen("order-issue-queue")`.

`PartnerHubSettingsPanel.tsx` binds these functions to single user presses. The callbacks are wired by the route/surface layer to actual navigation intents.

### Root cause

The Hub action model describes one conceptual intent with multiple independent navigation outputs. Navigation authority becomes order-dependent and can push/replace more than one destination from one press.

### Actual Source-of-Fix

Partner Hub navigation/action model and canonical route mapping, not Expo runtime patches.

### Required root treatment

- Define exactly one canonical destination/intent for each Hub row/action.
- Resolve semantic aliases in one navigation mapping layer before route execution.
- Make one user action emit exactly one navigation command.
- Remove superseded callbacks/aliases once all consumers are migrated.
- Add route-level tests asserting **exactly one** navigation command and the exact final destination per action.

### Forbidden treatment

Do not debounce, delay, swallow, or race navigation calls in Expo Router. That masks the upstream command fanout.

---

## R3 — MEDIUM — PROVEN — Appearance preference is transient Hub-local state

### Evidence

`PartnerHubScreen.tsx` defines:

```ts
function useAppPartnerAppearance() {
  const [mode, setMode] = React.useState<BThwaniAppearanceMode>("lightPremium");
  return { hydrated: true, mode, setMode };
}
```

This is screen-local, starts from `lightPremium` on mount, claims `hydrated: true` without hydrating a persisted preference, and is disconnected from the app/root appearance provider authority.

`shared/ui-kit/src/providers.tsx` already owns `BThwaniAppearanceProvider`, appearance token resolution and shared theme synchronization primitives.

### Root cause

A global/user-level app preference is implemented as ephemeral state inside one feature screen.

### Actual Source-of-Fix

`apps/app-partner/runtime` application preference/persistence boundary feeding the existing UI-kit appearance provider; the Hub should be a consumer/editor of that authority.

### Required root treatment

- Establish one app-partner appearance preference owner at runtime/app composition level.
- Persist/hydrate the user choice using the governed native storage mechanism already used by the runtime stack.
- Feed the resolved mode into `BThwaniAppearanceProvider`/shared UI-kit tokens.
- Make Hub settings read/write that single authority.
- Delete `useAppPartnerAppearance` after every target-app consumer is cut over.
- Test cold start, remount, navigation away/back and mode propagation.

### Forbidden treatment

Do not add a second AsyncStorage/SecureStore copy inside the Hub while keeping local mode ownership.

---

## R4 — LOW/MEDIUM — PROVEN CLEANUP — Dead/stale Hub interface inputs remain after canonical store readback moved inside the Hub

### Audit correction

An earlier shallow read observed `DshPartnerRouteRenderer` passing `storeOpen={false}` and `listingEnabled={false}` to the Hub and initially treated that as a possible false operational state. Deeper inspection **invalidated that diagnosis**.

`PartnerHubScreen.tsx` independently fetches canonical store settings and coverage, parses `storeOpen`/`listingEnabled`, and derives the operational/client visibility state from that runtime truth. The incoming hardcoded values are not the displayed truth.

### Proven remaining problem

The stale/dead interface shape still suggests an ownership path that no longer exists and can mislead future consumers or be accidentally reactivated.

### Actual Source-of-Fix

Partner Hub surface prop contract / route-renderer wiring.

### Required treatment

- Prove the props have no real consumers across the pinned branch.
- Remove dead `storeOpen` / `listingEnabled` inputs from the Hub surface contract and route wiring if fully superseded.
- Preserve the canonical store-settings readback path.
- Run typecheck/binding/consumer tests to prove no hidden consumer depended on the stale contract.

### Forbidden treatment

Do **not** change the hardcoded values to `true` or synthesize values in the renderer; that would recreate a shadow store truth.

---

# 8. Governance/closure signal — not itself a code root

`services/dsh/capability-map.ts` marks multiple materially related capabilities as runtime-bound but still `FIX_REQUIRED`, including stores, catalog, orders, field readiness, support, analytics and notifications. This is not permission to mass-edit unrelated capability code, and it is not proof that every capability contains a target-app defect. It is a **closure gate signal**: no `CLOSED` claim for this objective is valid until every target-app-related capability is re-evaluated against its actual current roots and the capability map/governance is reconciled only after implementation truth is proven.

---

# 9. Capability-by-capability audit/execution matrix

| Capability | Target-app materiality | Canonical owner/root | Current audit state | Required execution/verification |
|---|---|---|---|---|
| Runtime launch/native bindings | Direct | `apps/app-partner/runtime` | mapped | verify launcher, native permissions, env/runtime binding, build |
| Identity/session | Direct | core Identity + runtime gate | positive boundary observed | role/surface/session/store-access negative tests |
| Store scope | Direct | shared partner store-scope authority | positive boundary observed | zero/one/multiple store tests; no implicit guessed store |
| Activation/readiness | Direct | DSH shared partner + backend/operator lifecycle | mapped | full readback, forbidden/not-found/incomplete/active transitions |
| Store settings/coverage | Direct | DSH contracts/backend/shared partner API | positive readback observed | GET/PATCH/readback, malformed payload, serviceability/visibility |
| Catalog/inventory/media | Direct | DSH catalog contracts/backend/shared partner | mapped | taxonomy/product/assortment/media/proposal/approval journeys |
| Orders/preparation/issues | Direct | DSH order state machine/contracts/shared runtime | mapped | every allowed/forbidden transition, idempotency, conflict/readback |
| Support/incidents | Direct | DSH support capability | mapped | ticket/message/escalation routes and exactly-one navigation |
| Notifications | Direct | shared notification controller + DSH API | **R1 PROVEN** | canonical cutover + deletion + readback tests |
| Navigation | Direct | partner nav model + Expo Router adapter | **R2 PROVEN** | one action => one canonical route |
| Appearance | Direct | runtime preference -> UI-kit provider | **R3 PROVEN** | app-level persistence/provider cutover |
| Team/store permissions | Direct | shared partner + Identity/store access where applicable | mapped | actor/store authorization and negative-space tests |
| Analytics/commercial | Direct | DSH analytics/commercial roots | mapped | real-data/error/empty states; no hardcoded KPI truth |
| Partner finance | Direct | WLT truth via governed DSH/WLT bridge | positive boundary observed | auth proxy, settlement readback, no client financial ledger |
| Control Panel governance | Upstream writer/consumer | shared partner + DSH operator contracts | material | lifecycle changes must reconcile into partner readback |
| Field readiness | Upstream writer/consumer | field/DSH readiness lifecycle | material when partner onboarding/readiness changes | verify cross-surface read-after-write |
| Client visibility/catalog | Downstream consumer | DSH store/catalog publication truth | material when store/catalog visibility changes | verify partner change -> canonical publication -> client readback |
| Captain/dispatch | Conditional downstream | DSH dispatch authority | only if partner order readiness/handoff changes | prove pickup/readiness handoff; otherwise N/A_PROVEN |

---

# 10. Product / UX / Design / Accessibility / RTL closure requirements

These are not cosmetic post-processing. They are part of target-app correctness.

## Product/state truth

- Every displayed operational state must be derived from the current canonical readback or be explicitly marked pending/loading/error/offline.
- No successful state from static defaults when runtime truth is unavailable.
- Every mutation must expose pending, success/readback, conflict and failure semantics appropriate to the contract.
- Store/catalog/order/activation/finance state must never be guessed from route context.

## UX/navigation

- Exactly one user intent must map to exactly one navigation command.
- Back behavior and deep-link/router behavior must converge on the same route authority.
- Destructive/reject/disable operations require explicit reasons/confirmation where the governing contract requires them.
- Offline/retry must not replay non-idempotent writes unsafely.

## Design system

- Keep colors, spacing, typography, surfaces, icons and appearance modes on shared UI-kit tokens/providers.
- Remove screen-local design authorities when a shared provider already owns the concept.
- Loading/empty/error/offline/disabled/forbidden/not-found states must be first-class, not hidden behind generic placeholders.

## Accessibility

- Interactive rows/buttons must have stable accessible roles/names/states.
- Selected/expanded/disabled/busy/error states must be programmatically exposed.
- Dynamic mutation/readback failures must be announced, not only colored.
- Touch targets, focus order and modal/sheet focus containment must be verified on native targets.

## RTL/localization

- Preserve `DirectionProvider`/shared RTL authority.
- Use logical start/end semantics; no ad-hoc left/right assumptions in target-app changes.
- Arabic and English route labels/content must not alter canonical IDs or backend state.
- Numeric/financial/order identifiers must remain semantically correct inside RTL layouts.

---

# 11. Root-correct execution order

The order below is dependency-aware. A higher newly proven root preempts lower work.

## Wave A — Re-pin and collision gate

1. Re-read `00-ORCHESTRATOR.md` and package revision from current HEAD.
2. Pin exact current `f` commit.
3. Enumerate/receive `ACTIVE_WORKSET`; until then treat it as `NOT_DECLARED`.
4. Compare with this baseline and inspect every changed file in the target material cone.
5. Stop any mutation that would collide with an active writer or invalidate a root assumption.

## Wave B — Canonical state cutovers

1. **R1 notifications:** migrate Hub to shared notifications controller/readback.
2. Delete Hub-owned preference authority/direct mutation path.
3. **R3 appearance:** establish runtime-level persisted appearance authority, connect UI-kit provider, migrate Hub consumer, delete local hook.

## Wave C — Navigation authority

1. **R2:** normalize each settings/Hub action to one semantic route intent.
2. Migrate all callback consumers.
3. Delete aliases/fanout paths only after no consumers remain.

## Wave D — Dead interface cleanup

1. **R4:** prove stale store-status inputs are unused.
2. Remove them from prop/type/renderer contracts.
3. Do not alter canonical store readback.

## Wave E — Full target-app material journeys

Re-audit and execute only the roots exposed by tests/runtime evidence across:

- activation/readiness/store scope
- store publication/visibility/serviceability
- catalog/inventory/media/pricing
- order acceptance -> preparing -> ready -> handoff
- issue/support/conversation
- team/permissions
- promotions/marketing material to partner
- analytics/commercial summary
- WLT finance readbacks
- field-readiness and control-panel lifecycle handoffs
- client/captain downstream only when materially affected

## Wave F — Reconciliation, cleanup and deletion

For every changed root:

`OLD WRITERS -> NEW CANONICAL WRITER -> MIGRATE READERS -> MIGRATE CONSUMERS -> READBACK/RECONCILE -> REMOVE OLD ROUTE/STATE/TYPE/CONFIG -> DELETE DEAD CODE -> SEARCH NEGATIVE SPACE`

No “cleanup later”.

---

# 12. Verification matrix

Run the narrowest meaningful checks during each loop, then the complete closure set for the Exact Final Candidate.

## Targeted frontend/runtime

- app-partner runtime typecheck
- app-partner runtime lint
- app-partner runtime tests
- DSH frontend/partner typecheck and tests
- router authority tests
- runtime wiring tests
- notifications readback/mutation tests
- appearance persistence/remount tests
- exact-one-navigation tests
- orders/support/store-scope tests

## Contract/API gates when touched

- DSH OpenAPI compose/generate/verify
- contract registry drift guard
- generated-client provenance guard
- contract scope binding guard
- API/backend API binding guards
- frontend feature binding guard

## Backend/data gates when touched

- Go build/test for affected DSH packages
- authorization negative tests
- idempotency/concurrency/conflict tests
- DB contract tests
- migration manifest drift guard when schema changes
- migrate from clean database and upgrade path where material
- outbox/read-model reconciliation when a changed journey uses them

## Repository/runtime guards

At minimum re-evaluate and run the applicable root commands exposed by root `package.json`, including:

- `guard:source-integrity`
- `guard:fullstack-boundary`
- `guard:aggregate-ownership`
- `guard:runtime-config`
- `guard:no-broken-imports`
- `guard:contract-registry-drift`
- `guard:migration-manifest-drift`
- `guard:generated-client-provenance`
- `guard:contract-scope-binding`
- `guard:api-binding`
- `guard:backend-api-binding`
- `guard:frontend-feature-binding`
- runtime frontend binding check
- `ci:check` during iteration as appropriate
- `ci:close` only on the exact final candidate per current orchestrator/CI contract

## Runtime/E2E evidence

The final candidate must prove, on the exact SHA being closed:

- partner can authenticate only with valid partner role/surface;
- scope selection behaves correctly for zero/one/multiple stores;
- activation/readiness states reconcile with Control Panel/field writers;
- notification preferences survive remount/restart and match server readback;
- appearance survives restart and propagates consistently;
- each Hub action navigates once to the correct route;
- store settings/coverage/visibility use live canonical truth;
- catalog changes reconcile through approval/publication boundaries;
- order lifecycle rejects illegal transitions and exposes conflicts;
- WLT finance stays server-authoritative;
- no unrelated surface regression in the material downstream cone.

---

# 13. Negative-space search required before deletion/closure

Search the exact candidate branch for all superseded concepts, not only imports from edited files:

- `failClosedNotificationPreferences`
- Hub-local `notificationPreferences` ownership
- direct Hub `updateNotificationPreferences` dynamic import
- `useAppPartnerAppearance`
- duplicated partner appearance preference storage
- multi-callback navigation aliases for order alerts/operations directory
- stale Hub `storeOpen` / `listingEnabled` prop contract
- raw screen-level DSH HTTP for capabilities with shared controllers
- guessed/default store IDs
- local financial balance/settlement truth
- duplicate partner activation/readiness state machines
- fallback routes masking missing required route IDs

Every residue must be classified `CANONICAL`, `MIGRATE`, `DELETE_REQUIRED`, or `N/A_PROVEN` with evidence.

---

# 14. Loop protocol to Fixed Point

Repeat until no material root remains:

```text
AUDIT current exact SHA
 -> discover new/remaining material findings
 -> rank by highest Proven Executable Root
 -> select Source-of-Fix
 -> implement complete migration/cutover
 -> reconcile/readback
 -> cleanup/delete superseded truth
 -> run targeted verification
 -> inspect failures as evidence, not noise
 -> re-audit entire affected cone + negative space
 -> re-rank
 -> repeat
```

A green local unit test does not end the loop if a higher cross-surface root remains. A failing check must be traced to its highest material common root rather than patched check-by-check.

---

# 15. Exact Final Candidate Closure Gates

`CLOSED` is forbidden until **all** gates below are simultaneously true on one exact commit SHA:

1. **Scope Gate:** entire target-app Material Cone and newly exposed material dependencies are inventoried.
2. **Root Gate:** zero known higher executable root remains behind any implemented symptom fix.
3. **Authority Gate:** one canonical owner/truth per concept; zero parallel/shadow authority introduced or retained.
4. **Migration Gate:** all material writers/readers/consumers/handoffs have completed cutover.
5. **Cleanup Gate:** all superseded paths/config/state/types/files are deleted or explicitly `N/A_PROVEN`.
6. **Contract Gate:** contracts/generated clients/runtime bindings are mutually consistent.
7. **Data Gate:** schema/migrations/reconciliation/readback are complete wherever persistence changed.
8. **Security Gate:** authn/authz/store-scope/tenant/permission negative cases fail closed.
9. **Journey Gate:** complete partner journeys and material cross-surface handoffs pass.
10. **Product/UX/A11y/RTL Gate:** no material state, navigation, accessibility, RTL or appearance defect remains in scope.
11. **Quality Gate:** applicable typecheck/lint/test/build/guards/CI are green on the exact candidate.
12. **Negative-Space Gate:** repository search proves no known stale/duplicate/orphan/dead material residue.
13. **Governance Reconciliation Gate:** capability/governance records reflect implementation truth and do not substitute for it.
14. **Collision Gate:** candidate includes/reconciles every material concurrent change; no active writer invalidates proof.
15. **Fixed-Point Gate:** one final deep re-audit discovers no new known material root/gap.

---

# 16. Executable ledger

| ID | Root / task | Status now | Completion condition |
|---|---|---|---|
| P0 | Re-pin orchestrator + branch + ACTIVE_WORKSET before mutation | `REQUIRED` | current SHA/workset proven collision-safe |
| R1 | Notifications canonical-controller cutover | `PROVEN / PENDING EXECUTION` | server readback is sole preference truth; old Hub authority deleted |
| R2 | Single-intent Hub navigation | `PROVEN / PENDING EXECUTION` | every press emits exactly one canonical navigation command |
| R3 | Runtime-level persisted appearance authority | `PROVEN / PENDING EXECUTION` | one persisted app-level mode feeds UI-kit; Hub local hook deleted |
| R4 | Dead Hub store-status interface cleanup | `PROVEN CLEANUP / PENDING` | stale inputs removed after consumer proof; live store readback preserved |
| J1 | Identity/session/store-scope journey | `VERIFY/REDIAGNOSE` | all positive + negative states pass exact candidate |
| J2 | Activation/readiness/operator/field handoff | `VERIFY/REDIAGNOSE` | cross-surface write/readback lifecycle is consistent |
| J3 | Store publication/settings/serviceability | `VERIFY/REDIAGNOSE` | partner/operator/client truths reconcile |
| J4 | Catalog/inventory/media/pricing | `VERIFY/REDIAGNOSE` | partner writes/approvals/publication have one truth |
| J5 | Orders/preparation/issues/dispatch handoff | `VERIFY/REDIAGNOSE` | full legal state machine + downstream handoffs proven |
| J6 | Support/conversation/escalation | `VERIFY/REDIAGNOSE` | real backend truth + deterministic routing |
| J7 | Team/permissions | `VERIFY/REDIAGNOSE` | actor/store permissions fail closed and reconcile with Identity |
| J8 | Analytics/commercial/marketing | `VERIFY/REDIAGNOSE` | real governed data; no hardcoded/shadow KPI truth |
| J9 | WLT finance | `VERIFY/REDIAGNOSE` | WLT remains financial authority end-to-end |
| Q1 | Product/UX/Design/A11y/RTL | `VERIFY/REDIAGNOSE` | all material states/interactions satisfy closure requirements |
| C1 | Full migration/reconciliation/cleanup/deletion | `BLOCKED BY ROOT EXECUTION` | zero superseded material residue |
| V1 | Exact candidate full verification/CI | `BLOCKED BY EXECUTION` | all applicable gates green on one SHA |
| F1 | Fixed-point re-audit | `BLOCKED BY V1` | zero newly discovered material root/gap |
| CLOSE | Declare objective closed | **`FORBIDDEN NOW`** | all 15 Closure Gates true simultaneously |

---

# 17. Current audit conclusion

The target application already has several strong canonical boundaries, but it is **not eligible for closure** at this baseline. At minimum, three material root defects and one proven cleanup debt are present:

1. notification preferences bypass the existing canonical shared controller and maintain parallel screen truth;
2. single Hub actions can emit multiple navigation commands;
3. appearance is an ephemeral Hub-local preference instead of one persisted app-level authority feeding the shared provider;
4. stale store-status interface inputs remain after canonical store readback moved inside the Hub.

The audit also proves that fixes must not be confined to visual screens: the material cone crosses runtime/router, shared partner state, DSH contracts/backend, Identity, operator governance, field/client/captain consumers when their shared truth is affected, and WLT where financial truth is involved.

**This file records the audit and executable closure contract. It does not constitute implementation, verification, or `CLOSED`.**
