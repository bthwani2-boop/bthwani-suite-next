# APP-PARTNER — Live Deep Root Audit & Final Remediation Ledger

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target anchor:** `app-partner` / تطبيق الشريك
- **Live audit HEAD:** `6b768065d914d439fb64a7ce665f67f90393a442`
- **Live audit tree:** `c93fe5c711c3c75b43b5bd828d149f08b1d3b107`
- **Audit date:** `2026-08-29`
- **Orchestrator revision:** `20`
- **Canonical PR:** `#334` (`f` -> `master`) — live identity must be re-pinned before every closure claim
- **ACTIVE_WORKSET:** `NOT_DECLARED`
- **Collision Gate:** `NOT_PROVEN`
- **CLOSED:** **NO**

> This file supersedes the historical baseline/status ledger that previously started from `36e63b0...`. It is a task-local diagnosis/execution aid only. `PLAN != AUTHORITY`, `GREEN != CLOSED`, and this file must never become Product/System truth, runtime truth, or a shadow closure authority.

---

## 0. Governing law

Exclusive entrypoint:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

Observed package law on the live branch:

`ONE PROJECT FRAME -> ONE CANONICAL TRUTH PER MATERIAL CONCEPT -> HIGHEST PROVEN EXECUTABLE ROOT FIRST -> ACTUAL SOURCE-OF-DEFECT -> FULL AFFECTED-CONE MIGRATION/CUTOVER/CLEANUP -> EXACT-CANDIDATE EVIDENCE -> ZERO PARALLEL/SHADOW AUTHORITY -> ZERO KNOWN MATERIAL RESIDUE.`

Execution loop:

`PIN LIVE HEAD -> AUDIT -> ROOT GRAPH -> RANK -> SOURCE-OF-FIX -> MUTATE -> MIGRATE/CUT OVER -> DELETE/CLEAN -> VERIFY -> RE-AUDIT -> RE-RANK -> REPEAT -> EXACT FINAL CANDIDATE -> CLOSURE GATES.`

No Patch / Workaround / Fallback / Half-Migration is acceptable.

---

# 1. SELECTED CLOSURE OBJECTIVE

**Close the complete material cone of `app-partner` by eliminating every proven authority split, contract/runtime divergence, stale-context write/read path and legacy compatibility writer exposed through the Partner product journeys; converge Identity/store scope, DSH catalog/store/orders/support/team/notifications/commercial truth, Control Panel/Field/Client/Captain handoffs, WLT finance, runtime/router, Product/UX/A11y/RTL and exact-candidate evidence onto their actual canonical owners; migrate every affected writer/reader/consumer, delete superseded paths and semantic lies, and loop until no material root or residue remains.**

`app-partner` is an Audit/Execution Anchor only, never an independent source of truth.

---

# 2. Live Material Cone

```text
apps/app-partner/runtime/**
  -> IdentitySessionGate(partner + app-partner)
  -> app-level appearance/runtime/router
  -> services/dsh/frontend/app-partner/**
     -> store scope / partner self / readiness
     -> Hub / settings / notifications
     -> catalog / assortment / inventory / pricing / proposals / media / reels
     -> orders / preparation / issue / handoff / conversation
     -> support
     -> team / permissions
     -> analytics / commercial / marketing
     -> WLT finance bridge
  -> services/dsh/frontend/shared/partner/**
  -> services/dsh/frontend/shared/catalog/**
  -> shared notifications / support / operations / store clients
  -> services/dsh/contracts/** / OpenAPI / generated bindings
  -> services/dsh/backend/internal/http/**
  -> services/dsh/backend/internal/centralcatalog/** + store/order/support domains
  -> PostgreSQL normalized truth / migrations / read models
  -> Identity actor/session/store-access authority
  -> Control Panel operator lifecycle/governance writers
  -> Field readiness writers when materially shared
  -> Client storefront/catalog consumers when publication/commercial truth changes
  -> Captain/dispatch consumers when order/handoff truth changes
  -> WLT financial authority through governed server-side bridge
```

Unrelated applications/services remain out of scope unless they consume/write the same material truth.

---

# 3. Canonical authority map

| Concept | Canonical owner / writer | Non-authoritative consumers/projections |
|---|---|---|
| identity/session/partner access | Identity + governed DSH auth/store access | app runtime / screens |
| selected operational store | shared Partner scope model resolving `scopeId` -> `storeId` | surface/routes |
| partner lifecycle/readiness | DSH backend + operator/field governed writers | Partner Hub/onboarding |
| store settings/coverage | DSH backend/contracts | Partner UI / Client projection |
| assortment metadata | Central Catalog assortment metadata writer | Partner/Field/Operator UI |
| price | `dsh_store_assortment_prices` normalized writer | `dsh_store_assortments.unit_price/currency` compatibility projection only |
| inventory | `dsh_store_assortment_inventory` normalized writer | `available/stock_status` compatibility projection only |
| client commercial catalog | runtime projection derived from normalized price+inventory | app-client/storefront |
| notifications | shared notifications controller + DSH API | Hub settings |
| appearance | app runtime persisted preference -> UI-kit provider | Hub editor |
| orders | DSH order state machine | Partner workboard, Client/Captain consumers |
| support | DSH support backend/shared controller | Partner support UI |
| team | DSH team/store permission authority | Partner team UI |
| finance | WLT | DSH/WLT bridge + Partner UI |

---

# 4. Root Graph — live root ranking

## R0 — CRITICAL — PROVEN — Partner Catalog commercial truth is only half-migrated end-to-end

### Proven canonical backend truth

`centralcatalog.UpsertStoreAssortmentAtomic` is explicitly a compatibility/OCC entry point that delegates to `UpsertStoreAssortmentWithRuntimeTruth`, the sole runtime-truth writer.

The runtime-truth layer explicitly states:

- normalized `dsh_store_assortment_inventory` is inventory truth;
- normalized `dsh_store_assortment_prices` is price truth;
- `dsh_store_assortments.unit_price/currency/available/stock_status` are compatibility projections only;
- metadata edits must not overwrite normalized commercial truth;
- dedicated Inventory and Price endpoints own subsequent commercial changes;
- client/storefront projection derives commercial truth from normalized rows.

Backend Partner routes already expose:

- `GET .../assortment/{masterProductId}/inventory`
- `PUT .../assortment/{masterProductId}/inventory`
- `GET .../assortment/{masterProductId}/prices`
- `POST .../assortment/{masterProductId}/prices`

### Proven half-migration / authority divergence

1. `services/dsh/contracts/paths/partner.paths.yaml` does not yet describe the live Inventory/Pricing read/write resource set.
2. `services/dsh/frontend/shared/catalog/central-catalog.api.ts`:
   - has no canonical Inventory GET;
   - has no Price list/read;
   - still writes Price via the shadow path `/prices/schedule` instead of canonical `/prices`.
3. `InventoryConfigurationModal.tsx`:
   - starts from local/manual values;
   - exposes a manually supplied version instead of hydrating canonical inventory version;
   - writes without guaranteed current OCC version;
   - treats mutation response as state with no exact canonical GET readback.
4. `PriceScheduleModal.tsx`:
   - has no canonical current schedules read;
   - writes then treats mutation response as success;
   - has no exact post-write readback.
5. `PartnerCatalogManagementScreen.tsx` still exposes **Edit Price** and **Toggle Availability** through `upsertPartnerStoreAssortmentOCC` — a metadata compatibility path whose backend intentionally ignores commercial payload changes after normalized truth exists.
6. Its verification compares the returned/projected `saved` result to the next assortment read, not the user-entered requested commercial value. Therefore the UI can report a successful save while the requested price/availability was intentionally not changed by the backend.
7. `ProductOverridesScreen.tsx` still presents legacy `unitPrice`, `available`, `stockStatus` as editable local overrides even though those fields are no longer authoritative commercial writers after normalized truth exists.
8. `ProductEditScreen.tsx` tells users to edit prices/availability through the legacy overrides surface, reinforcing a superseded Product/UX contract.

### Actual Source-of-Fix

Central Catalog normalized commercial model + canonical Partner OpenAPI resource contract + shared catalog client + all Partner commercial editors/consumers.

### Required complete treatment

- Make OpenAPI match the live normalized Inventory/Price resource contract.
- Generate/verify all bindings and remove route drift.
- Add shared canonical Inventory GET and Price list GET.
- Cut Price writes from `/prices/schedule` to `/prices`; delete all `/prices/schedule` Partner residues.
- Inventory editor becomes `GET -> exact version -> PUT(expectedVersion) -> GET -> exact reconcile`.
- Price editor becomes `GET/list -> POST -> GET/list -> exact created row/value/version/effective-time reconcile`.
- Remove user-editable commercial controls from metadata compatibility writers for existing assortments.
- Keep assortment metadata writer only for true metadata: note/custom image/publication and creation bootstrap where contract explicitly requires it.
- Route price changes exclusively through canonical pricing controls and inventory/availability exclusively through canonical Inventory controls.
- Remove stale Product copy instructing users to use legacy override price/availability paths.
- Prove downstream Client/storefront uses normalized runtime truth only.
- Delete superseded semantic fields/actions/routes from Partner UI where they imply commercial write authority.

### Forbidden

No screen-level mirroring of price/inventory, no second local version store, no compatibility-write fallback, no keeping `/prices/schedule` as alias, no success based solely on mutation response.

---

## R1 — HIGH — PROVEN — Team path conflates `scopeId` with `storeId`

`DshPartnerOperationalScope` explicitly contains both `scopeId` and `storeId`.

`useDshPartnerSurfaceModel()` passes `selectedStoreScopeId` into Team controller. The controller renames/treats that value as `activeStoreId` and sends it directly to `fetchPartnerStoreTeam`, invite and member-action APIs.

### Root cause

Operational scope identity and store aggregate identity are distinct concepts but are collapsed at the surface/shared-controller boundary.

### Required treatment

- Change Team controller contract to receive canonical `storeId` explicitly.
- Pass `selectedStoreScope.storeId`, never `scopeId`.
- Remove `selectedStoreScopeId` naming/aliases from Team data API boundary.
- Add contract tests where `scopeId != storeId` and prove all reads/writes target the real store.
- Re-audit every Partner feature for the same `scopeId`/`storeId` conflation.

---

## R2 — HIGH — PROVEN — Store role-context verification is not an operational mount gate

`useStoreScopeModel()` validates the selected store through `fetchStoreRoleContext(storeId)` and can produce permission-denied/service-unavailable/error states. However `DshPartnerSurface` gates operational mounting primarily on `selectedStoreScope`; once a scope is selected, the surface can continue into operational consumers even while store-context validation is loading/failed.

### Required treatment

- Model store selection and store-context authorization/readiness as one explicit state machine.
- `selected scope != operationally authorized store` until role-context succeeds with `actorRole=partner` and matching store.
- Gate all store-scoped operational routes/readers/writers on the validated context.
- Clear/reconcile stale context immediately on scope change/failure.
- Add zero/one/multiple scopes + denied/revoked/service-unavailable/stale-response tests.

No client-side gate replaces backend authorization; this fixes the frontend fail-closed contract while backend remains sovereign.

---

## R3 — HIGH — PROVEN — Catalog scope isolation is inconsistent across sub-surfaces

The main catalog screen has actor/store request sequencing, but several child surfaces do not:

- `ProductMediaScreen`: a response for old `storeId/productId` can set assets/state after props change; upload/unlink completion can also invoke stale readback.
- `PartnerReelsManagementSection`: old-store fetch/upload completion can set list/form state under a newly selected store.
- `ProductEditScreen`: `handleCreateProposal` uses `storeId` but omits it from the callback dependency list, permitting stale-store submission after prop change.

### Required treatment

Introduce one consistent scoped-operation pattern across Partner Catalog:

`actor/session + storeId + productId/resourceId + request sequence + mounted state + mutation serialization + canonical readback`.

Do not create per-screen shadow domain truth; factor a shared scoped async primitive/controller only if it removes repeated race logic without becoming a competing domain owner.

---

## R4 — MEDIUM/HIGH — PROVEN — Product/UX contract still describes superseded commercial ownership

Current screens/copy label legacy metadata controls as immediate controls for "السعر، التوفر، المخزون" even though normalized endpoints own those concepts. This creates an executable semantic lie: users are instructed toward a path that cannot be the canonical writer.

Treatment is part of R0 cutover, not cosmetic cleanup.

---

# 5. Reclassified historical roots

The previous plan incorrectly left these as pending. Live code shows their old root form has already been treated; they remain exact-candidate verification items, not current implementation roots:

| Historical root | Live classification |
|---|---|
| notification Hub-local preference truth | `IMPLEMENTATION_CUTOVER_OBSERVED / EXACT_HEAD_PROOF_OPEN` — Hub consumes shared controller; controller requires readback and rejects stale requests |
| multi-command Hub navigation | `IMPLEMENTATION_CUTOVER_OBSERVED / REVERIFY_NEGATIVE_SPACE` |
| Hub-local appearance | `IMPLEMENTATION_CUTOVER_OBSERVED / EXACT_HEAD_PROOF_OPEN` — runtime persisted provider with durable readback |
| stale Hub storeOpen/listingEnabled inputs | `IMPLEMENTATION_CLEANUP_OBSERVED / REVERIFY_NEGATIVE_SPACE` |
| Partner self/readiness stale response | `REVERIFY CURRENT HEAD` |
| Orders mutation/readback/idempotency fixes | `REVERIFY CURRENT HEAD` |
| Support durable attempt/readback fixes | `REVERIFY CURRENT HEAD` |
| Team readback sequencing | `PARTIALLY STRONG BUT INVALIDATED BY R1 SCOPE/STORE IDENTITY BUG` |
| Commercial summary stale-store fix | `REVERIFY CURRENT HEAD` |

Historical commits/tests are context only; no old evidence closes the current SHA.

---

# 6. Journey ledger — full target-app cone

| ID | Journey / capability | Current live disposition | Closure requirement |
|---|---|---|---|
| J1 | Identity/session/store scope | **OPEN — R1/R2** | correct scopeId->storeId mapping; validated partner store context gates operational surface; revoked/denied/stale fail closed |
| J2 | Activation/readiness/operator/field | `RE-AUDIT/VERIFY` | one lifecycle truth; operator/field write -> Partner exact readback; no local readiness state machine |
| J3 | Store settings/coverage/publication/serviceability | `RE-AUDIT/VERIFY` | Partner/operator/client projection reconcile; stale store responses rejected |
| J4 | Catalog/inventory/pricing/media/reels/proposals | **CRITICAL OPEN — R0/R3/R4** | normalized commercial authority + contract/client/UI cutover + scope isolation + downstream client proof |
| J5 | Orders/preparation/issues/dispatch | `RE-AUDIT/VERIFY` | legal state machine, OCC/idempotency, readback, handoff to Captain/Client where material |
| J6 | Support/conversation/escalation | `RE-AUDIT/VERIFY` | durable attempts until canonical evidence; session/store isolation; deterministic route |
| J7 | Team/permissions | **OPEN — R1** | store aggregate identity correct; permission negative tests and exact readback |
| J8 | Analytics/commercial/marketing | `RE-AUDIT/VERIFY` | governed data only; no stale-store/hardcoded KPI truth; reels marketing review consistent |
| J9 | WLT finance | `RE-AUDIT/VERIFY` | WLT remains sole financial authority; no Partner ledger/balance truth |
| Q1 | Product/UX/Design/A11y/RTL | **OPEN — R0/R4 + full audit** | UI semantics match real authorities; all states accessible; shared RTL/theme tokens only |

---

# 7. Product / UX / Accessibility / RTL gates

- No UI control may claim to mutate a concept if the invoked canonical writer cannot mutate that concept.
- Success means exact canonical post-write reconciliation, not HTTP success or returned mutation object.
- Loading/error/conflict/offline/revoked/forbidden/not-found states are first-class.
- Store switch must invalidate every in-flight store/product operation.
- Every destructive or irreversible action requires governed confirmation/reason semantics where applicable.
- Accessibility: interactive controls expose role/name/selected/disabled/busy/error state; async failures are announced, not merely colored.
- RTL: logical start/end only; no new left/right assumptions; canonical IDs never localize.
- Appearance/direction remain owned by runtime/UI-kit providers.

---

# 8. Execution closure units — highest root first

## CU-1 — Catalog Commercial Authority Convergence — **SELECTED FIRST**

1. Re-pin HEAD + PR + current file SHAs.
2. Update Partner OpenAPI for canonical Inventory/Prices GET/PUT/POST resources.
3. Update shared catalog API; delete `/prices/schedule` shadow path.
4. Inventory modal canonical hydrate/OCC/readback; remove manual version authority.
5. Price modal canonical list/readback.
6. Remove price/availability edit semantics from existing-assortment metadata writers in:
   - `PartnerCatalogManagementScreen`
   - `ProductOverridesScreen`
   - ProductEdit explanatory copy/navigation.
7. Keep/add explicit canonical actions that open Inventory/Pricing controls instead of compatibility writes.
8. Reconcile downstream Client/storefront runtime projection.
9. Negative-space search and delete all superseded paths/labels/functions.
10. Contract/frontend/backend tests and exact readback tests.
11. Re-audit CU-1 to fixed point before next root.

## CU-2 — Store/Scope Identity and Authorization Gate

- Fix Team `scopeId`/`storeId` conflation.
- Make validated partner store context an explicit operational gate.
- Audit all Partner consumers for same ID conflation.
- Negative auth/store-switch/revocation tests.

## CU-3 — Catalog Scoped Async Isolation

- Media/Reels/Product proposal requests/mutations bound to current actor/store/product scope.
- Exact post-mutation readback.
- No stale response can write after context change/unmount.

## CU-4+ — Re-rank after each closure checkpoint

Re-audit J2/J3/J5/J6/J8/J9 and select the next highest proven root. Do not predeclare them closed.

---

# 9. Migration / cleanup / deletion matrix

| Superseded / dangerous construct | Required disposition |
|---|---|
| Partner `/prices/schedule` route | `DELETE_REQUIRED` after canonical `/prices` client cutover |
| manual Inventory version field/state as authority | `DELETE_REQUIRED` |
| Inventory/Price mutation-response-as-truth | `DELETE_REQUIRED` |
| existing-assortment price edits via `upsertPartnerStoreAssortmentOCC` | `DELETE_REQUIRED` |
| existing-assortment availability/stock edits via metadata writer | `DELETE_REQUIRED` |
| ProductOverrides commercial writer controls | migrate to canonical Inventory/Pricing or delete |
| Product copy directing price/stock changes to overrides | `DELETE_REQUIRED/REWRITE_TO_CANONICAL_FLOW` |
| Team controller `selectedStoreScopeId` interpreted as store ID | `DELETE_REQUIRED` contract shape |
| unscoped Media/Reels async loaders | migrate to scoped sequencing |
| stale historical R1-R4 pending statuses in this plan | deleted by this replacement |

No cleanup is deferred.

---

# 10. Negative-space audit before closure

Search exact final candidate for at least:

- `/prices/schedule`
- `editPrice` paths that call assortment metadata writer for existing items
- availability/stock toggles that call assortment metadata writer
- manual Inventory `version` input/state
- Price/Inventory success based only on mutation response
- `selectedStoreScopeId` passed where a `storeId` is required
- `scopeId` renamed to `activeStoreId`
- unsequenced store/product async updates in Partner Catalog
- `failClosedNotificationPreferences`
- Hub-local notification preference state/direct mutation
- `useAppPartnerAppearance`
- duplicate appearance storage
- old multi-callback Hub navigation aliases
- stale Hub `storeOpen`/`listingEnabled` inputs
- guessed/default store IDs
- raw screen-level DSH HTTP bypasses where shared clients own the capability
- local financial ledger/balance truth
- duplicate activation/readiness state machines
- legacy commercial columns treated as live price/inventory authority

Each residue: `CANONICAL | SUBORDINATE_PROJECTION | MIGRATE | DELETE_REQUIRED | N/A_PROVEN`.

---

# 11. Verification matrix

## Targeted per closure unit

- app-partner runtime typecheck/lint/tests
- DSH frontend relevant tests
- exact store/scope mapping contract tests
- catalog scoped async race tests
- Inventory initial GET / OCC conflict / PUT / exact GET readback
- Price list / create / exact list readback
- metadata writer cannot change normalized commercial truth
- Partner UI contains no commercial compatibility writer for existing assortment
- client projection uses normalized price/inventory only
- authorization/cross-store negative tests

## Contract/backend/data when touched

- OpenAPI compose/generate/verify
- contract registry drift
- generated-client provenance
- contract scope/API/backend/frontend binding guards
- Go affected package tests
- PostgreSQL normalized truth/OCC/concurrency tests
- migration/data reconciliation checks if schema/backfill changes are exposed

## Repository closure

Applicable guards including source-integrity, fullstack-boundary, aggregate-ownership, runtime-config, broken-imports, contract/migration/generated-client/API/frontend binding, then `ci:check` and exact-candidate `ci:close` according to current repository contract.

---

# 12. Exact Final Candidate Closure Gates

`CLOSED` requires all simultaneously on one exact SHA:

1. Scope
2. Root
3. Authority
4. Migration
5. Cleanup/Deletion
6. Contract
7. Data
8. Security/Auth/Store isolation
9. Journeys/Handoffs
10. Product/UX/A11y/RTL
11. Quality/tests/build/CI
12. Negative Space
13. Governance Reconciliation
14. Collision
15. Fixed Point

`ACTIVE_WORKSET=NOT_DECLARED` means Gate 14 cannot currently be claimed solely from GitHub visibility.

---

# 13. Live executable ledger

| ID | Status | Completion condition |
|---|---|---|
| P0 | `PINNED @ 6b768065...` | re-pin before every material mutation/checkpoint |
| CU-1 / R0 | **OPEN / HIGHEST** | one normalized commercial truth from DB -> Backend -> OpenAPI -> client -> UI -> Client projection; all compatibility UI writers removed |
| CU-2 / R1 | **OPEN / PROVEN** | Team uses storeId, never scopeId; all same-concept consumers audited |
| CU-2 / R2 | **OPEN / PROVEN** | validated store role-context is required before operational mount |
| CU-3 / R3 | **OPEN / PROVEN** | Media/Reels/Product proposal stale-context races closed |
| R4 | **OPEN / PART OF CU-1** | Product copy/actions match canonical commercial authority |
| Historical notifications | `IMPLEMENTATION OBSERVED / VERIFY` | exact-head behavior + negative space |
| Historical appearance | `IMPLEMENTATION OBSERVED / VERIFY` | exact-head persistence/remount/failure proof |
| Historical navigation | `IMPLEMENTATION OBSERVED / VERIFY` | exact-one-route + negative space |
| J2/J3/J5/J6/J8/J9 | `RE-AUDIT/VERIFY` | no material root after current higher roots close |
| V1 | `BLOCKED` | exact final SHA all applicable evidence green |
| F1 | `BLOCKED` | final adversarial re-audit discovers no new material root |
| CLOSE | **FORBIDDEN** | all 15 gates true simultaneously |

---

# 14. Current verdict

The prior plan understated the live risk because it kept historical Partner Hub defects as pending while missing a newer, deeper Catalog authority split.

The highest current proven problem is **not** “missing a GET in two modals.” It is an incomplete commercial-model cutover: the backend has already made normalized Inventory/Prices authoritative, but OpenAPI, shared client, and several Partner UX/write surfaces still behave as if compatibility assortment fields were live commercial writers. In parallel, Team currently conflates scope identity with store identity, and multiple Catalog sub-surfaces are not scope-safe under store/product changes.

Therefore:

- **ROOT REMEDIATION: OPEN**
- **MULTIPLE/SHADOW SEMANTICS: PROVEN**
- **HALF-MIGRATION: PROVEN**
- **J4 CATALOG: CRITICAL OPEN**
- **J1/J7 STORE-SCOPE/TEAM: OPEN**
- **PRODUCT/UX CONTRACT: OPEN**
- **EXACT FINAL CANDIDATE: NOT PROVEN**
- **FIXED POINT: NOT REACHED**
- **CLOSED: NO**

The next execution step is CU-1 immediately; this file is not a substitute for that implementation.