# APP-PARTNER — Deep Root Audit, Root Graph & Final Remediation Ledger

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target anchor:** `app-partner` / تطبيق الشريك
- **Audit source HEAD:** `c5948f14ccd7615019de7efe336e1d2884a94bda`
- **Audit source tree:** `9a4ccd983de7661f6b6c3ec529689228de973cba`
- **Audit date:** `2026-08-29`
- **Orchestrator revision:** `20`
- **Canonical PR at audit source:** `#334` (`f` -> `master`), `OPEN`, `DRAFT`
- **ACTIVE_WORKSET:** `NOT_DECLARED`
- **Collision Gate:** `NOT_PROVEN`
- **CLOSED:** **NO**

> This file is a task-local diagnosis/execution ledger only. `PLAN != AUTHORITY`, `GREEN != CLOSED`, and historical text/PR bodies/old checks never override live code, contracts, data, runtime or exact-candidate repository evidence. Every execution loop MUST re-pin branch/PR/HEAD before mutation. This refresh supersedes the stale ledger that still described `6b768065...` and roots already changed by `c5948f14...`.

---

## 0. Governing law

Exclusive entrypoint:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

Current package law:

`ONE PROJECT FRAME -> ONE CANONICAL TRUTH PER MATERIAL CONCEPT -> HIGHEST PROVEN EXECUTABLE ROOT FIRST -> ACTUAL SOURCE-OF-DEFECT -> COMPLETE AFFECTED-CONE MIGRATION/CUTOVER/CLEANUP -> EXACT-CANDIDATE EVIDENCE -> ZERO PARALLEL/SHADOW AUTHORITY -> ZERO KNOWN MATERIAL RESIDUE.`

Normal loop:

`PIN LIVE HEAD/PR -> INGEST CONCURRENT DELTA -> AUDIT/DIAGNOSE -> ROOT GRAPH -> RANK -> SOURCE-OF-FIX -> MUTATE -> MIGRATE/CUT OVER -> RECONCILE -> DELETE/CLEAN -> VERIFY -> NEGATIVE-SPACE -> RE-AUDIT -> RE-RANK -> REPEAT -> EXACT FINAL CANDIDATE -> CLOSURE GATES.`

Forbidden:

- Patch / Workaround / Fallback / Half-Migration.
- A second writer/read model that can redefine canonical truth.
- “Success” based on HTTP/mutation response when persisted canonical readback is required.
- Keeping obsolete compatibility routes/types/controllers “for later”.
- Treating this plan, capability maps, tests or CI green as semantic closure authority.

---

# 1. SELECTED CLOSURE OBJECTIVE

**Close the complete material cone of `app-partner` root-correctly by converging Partner identity/store scope, Central Catalog contracts and normalized commercial truth, catalog mutations/readback/replay semantics, partner lifecycle/store publication, orders/support/team/notifications/analytics, runtime/router/Product/UX/A11y/RTL and the materially shared Control Panel/Field/Client/Captain/WLT handoffs onto one canonical owner/write path per concept; migrate every affected reader/writer/consumer, delete every superseded contract/path/state/type/writer and loop on the latest HEAD until one Exact Final Candidate has zero known material root, gap, shadow truth or residue.**

`app-partner` is an Audit/Execution Anchor, never an independent system authority.

---

# 2. Audit corrections caused by `c5948f14...`

The commit `c5948f14ccd7615019de7efe336e1d2884a94bda` materially changed the Partner Catalog and surface binding. The previous ledger is therefore invalid where it still claimed the following roots were open:

1. **Team `scopeId -> storeId` conflation:** implementation cutover is now observed. `useDshPartnerSurfaceModel()` passes `selectedStoreScope.storeId` through `verifiedStoreId` to the Team model/controller. Keep exact negative verification where `scopeId != storeId`; do not re-implement the old fix.
2. **Store role-context not gating operational mount:** implementation gate is now observed. Store-context loading is folded into `isLoadingScopes`, failures flow through `scopesError`, and `DshPartnerSurface` fail-closes before operational rendering. Keep revoked/denied/stale exact verification; do not retain the old root as PROVEN OPEN.
3. **Missing canonical Inventory/Price reads and `/prices/schedule` shadow route:** substantially treated. Shared Catalog now has Inventory GET/PUT and Price GET/POST on `/prices`; Inventory and Price modals perform canonical readback.
4. **Legacy Partner Product Overrides / Price Schedule UI ownership:** superseded surfaces were removed/replaced by canonical controls.
5. **ProductMedia/Reels/ProductEdit stale-store issues from the previous audit:** the specific old forms were materially strengthened with scoped guards. Remaining mutation-verification gaps are reclassified below rather than preserving stale findings.

The old Notifications, multi-command Hub navigation, Hub-local appearance and stale Hub store-status roots also remain **implementation-cutover-observed**, not current implementation roots. They stay in exact-candidate/negative-space verification.

---

# 3. Live Material Cone

```text
apps/app-partner/runtime/**
  -> IdentitySessionGate(role=partner, surface=app-partner)
  -> app-level persisted appearance + mobile providers + router
  -> services/dsh/frontend/app-partner/**
     -> selected/validated store scope
     -> partner self / activation / readiness
     -> Hub / settings / notifications / analytics / commercial
     -> store profile / settings / coverage / courier configuration
     -> Catalog:
        taxonomy -> master products -> assortment metadata
        -> normalized Inventory
        -> normalized Price schedules
        -> pause/resume
        -> product proposals
        -> media/assets
        -> reels/marketing review
     -> orders / acceptance / preparation / issues / conversation / dispatch handoff
     -> support
     -> team / store permissions
     -> WLT finance bridge
  -> services/dsh/frontend/shared/partner/**
  -> services/dsh/frontend/shared/catalog/**
  -> shared notifications/support/order/operations clients
  -> services/dsh/contracts/**
     -> contracts/dsh.openapi.yaml
     -> paths/catalog.paths.yaml
     -> dsh.catalog.openapi.yaml
     -> dsh.catalog-proposal-readback.openapi.yaml
     -> contract-registry.ts
  -> services/dsh/backend/internal/http/**
  -> services/dsh/backend/internal/centralcatalog/**
  -> other materially implicated DSH order/store/support domains
  -> PostgreSQL normalized catalog/order/store truth
  -> Identity actor/session/store-access authority
  -> Control Panel operator/governance writers
  -> Field readiness/catalog proposal writers where same truth is shared
  -> Client storefront/catalog projection when publication/commercial truth changes
  -> Captain/dispatch consumer when partner order handoff truth changes
  -> WLT financial authority through governed server-side bridge
```

No unrelated surface/service enters the execution cone without a shared authority, persisted truth, contract, transition or material handoff.

---

# 4. Canonical authority map

| Material concept | Canonical owner/write authority | Derived/non-authoritative consumers |
|---|---|---|
| Actor/session/partner access | Identity + governed DSH authorization/store-access boundary | runtime/screens |
| Operational store | Partner scopes resolving `scopeId` to canonical `storeId`, then validated store-role context | surface/router |
| Partner lifecycle/readiness | DSH lifecycle truth + governed operator/field writers | Partner Hub/onboarding |
| Store settings/coverage/publication | DSH store contracts/backend | Partner + Client projections |
| Taxonomy/master products | Central Catalog | Partner read-only taxonomy/product presentation |
| Assortment metadata | `UpsertStoreAssortmentWithRuntimeTruth`/atomic facade for metadata + creation bootstrap | Partner/Field/Operator UI |
| Inventory | `dsh_store_assortment_inventory` + `UpsertAssortmentInventoryWithRuntimeTruthAtomic` | legacy `available/stock_status` compatibility projection |
| Price schedules | `dsh_store_assortment_prices` + canonical price creator/list authority | legacy `unit_price/currency` compatibility projection |
| Client commercial catalog | `GetPurchasableClientCatalog` / normalized runtime truth | app-client/storefront |
| Temporary assortment pause | Central Catalog pause state + readback API | Partner/Field/Operator controls |
| Product proposals | `dsh_product_proposals` + governed transition/readback | Partner/Field/Control Panel |
| Notifications | shared notifications controller + DSH API | Hub/settings presentation |
| Appearance | app runtime persisted preference -> UI-kit provider | Hub editor |
| Orders | DSH order state machine | Partner workboard + Client/Captain consumers |
| Support | DSH support backend/shared controller | Partner support UI |
| Team/store membership | DSH store/team permission authority | Partner team UI |
| Finance | WLT | governed DSH/WLT bridge + Partner UI |

---

# 5. ROOT GRAPH — current highest roots

## R0 — CRITICAL — PROVEN — Central Catalog contract authority/coverage is internally inconsistent

### Evidence

`services/dsh/contracts/paths/catalog.paths.yaml` is the path-item source composed by the main DSH OpenAPI and currently defines canonical Partner Inventory and Price resources, including:

- `GET/PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}/inventory`
- `GET/POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/prices`

The live backend implements the same resources and reads/writes normalized inventory/price truth.

At the same time `services/dsh/contracts/dsh.catalog.openapi.yaml` is registered as an **active executable Central Catalog contract fragment**, declares that it mirrors runtime, and claims adapter ownership for `frontend/shared/catalog/central-catalog.api.ts`, but currently contains no Inventory/Price paths.

`contract-registry.ts` simultaneously registers:

- `dsh-main` as the primary generated contract;
- `dsh-catalog` as an active standalone manual-typed-adapter contract owning the Central Catalog adapter;
- `dsh-catalog-proposal-readback` as another active fragment which currently has `paths: {}` solely to avoid duplicate-operation ownership after its former paths moved into `dsh.catalog.openapi.yaml`.

This is a contract/governance split: active artifacts claim overlapping parent/adapter/runtime responsibilities while their operation coverage is not congruent.

### Actual Source-of-Fix

`services/dsh/contracts` ownership topology + `contract-registry.ts` + composition/scope-binding guards. **Not** a screen-level copy of missing paths.

### Required root treatment

1. Define one canonical semantic owner for Central Catalog path operations.
2. Make child/fragment contracts genuinely subordinate/derived/verification-only; they must not independently redefine or incompletely mirror the same runtime surface.
3. Reconcile `dsh.catalog.openapi.yaml` scope/role with `catalog.paths.yaml` and the parent DSH contract.
4. Remove or reclassify `dsh.catalog-proposal-readback.openapi.yaml` if an active empty executable fragment has no independent path authority.
5. Reconcile adapter ownership in `contract-registry.ts` so `central-catalog.api.ts` has one governed contract owner.
6. Remove duplicated/stale path definitions instead of maintaining two manually synchronized copies.
7. Run `contracts:redocly`, `guard:contract-registry-drift`, `guard:contract-scope-binding`, `guard:api-binding`, `guard:backend-api-binding`, `guard:openapi-bundle-provenance` and generated-client provenance where applicable.

### Closure condition

`ONE OPERATION -> ONE CANONICAL CONTRACT OWNER -> one runtime binding -> one governed adapter/binding relationship`, with zero active empty/stale/parallel contract authority.

---

## R1 — HIGH — PROVEN — Partner Catalog mutation closure semantics remain fragmented

Strong current paths now exist:

- Main Catalog scoped mutations: mutation -> canonical `loadData()` -> explicit readback verify.
- Inventory: canonical GET -> exact OCC version -> PUT -> GET -> field/version reconciliation.
- Price: canonical list GET -> POST -> list GET -> exact created row/value/time reconciliation.

But sibling Partner Catalog writers still use weaker semantics:

### R1.1 Product pause/resume

`ProductControlsScreen.tsx`:

- loads product/assortment/pause state without the same mounted/request-sequence/resource-scope discipline used by stronger Catalog screens;
- `pause`/`resume` directly trusts mutation-returned assortment/pause and calls success callback;
- canonical pause read authority already exists (`fetchPartnerAssortmentPauses` / backend `ListAssortmentPauseStates`).

**Treatment:** scope every load/mutation by actor/session + storeId + productId + sequence/mounted epoch; mutation success requires exact canonical pause+assortment readback for the same resource/version/state.

### R1.2 Product proposal creation

`ProductEditScreen.tsx` has stale-store guarding now, but after `createPartnerProductProposal()` it still treats the mutation response as final success.

A dedicated governed readback adapter already exists: `product-proposal-readback.api.ts -> fetchPartnerProductProposals(storeId, ...)`.

**Treatment:** POST -> canonical proposal-list/detail readback -> prove same proposal ID/store/status/version/material fields -> only then success/onSaved. Preserve store/session scope across the whole operation.

### R1.3 Media/assets

`ProductMediaScreen` now rejects stale store/product loads, but upload/unlink completion delegates to a reload that can fail internally without proving the exact asset appeared/disappeared.

**Treatment:** after mutation, read the canonical asset/link set and prove the exact asset identity/link state; failure to prove remains failure/unknown outcome, not success.

### R1.4 Reels

`PartnerReelsManagementSection` now scopes requests better, but submit clears local form and then calls a loader whose failure is handled internally; it does not prove that the submitted reel appears in canonical review/list truth.

**Treatment:** durable/scoped submit -> canonical list/readback -> exact reel identity/status reconciliation -> only then clear success state. No local submitted-reel truth.

### R1.5 Inventory/Price operation-scope hardening

The new modals have exact value readback, but the complete operation must remain bound to the store/product scope captured at mutation start. A retargeted mounted component must not commit a result from an older store/product.

**Treatment:** explicit operation scope key/epoch + mutation serialization + reject stale completion before state commit/onSaved.

### Root rule

Do not solve this by inventing a second Catalog state owner. Reuse/factor a small scoped-async/reconciliation primitive only if it remains subordinate to existing domain APIs and removes repeated race/error semantics.

---

## R2 — HIGH — PROOF REQUIRED BEFORE TREATMENT — replay/idempotency for create-style Catalog commands

Potentially non-idempotent Partner operations include:

- Price schedule `POST` creating a normalized row.
- Product proposal `POST` creating a new proposal.
- Reel upload/submit creation path.
- Media upload intent/link creation where retry can duplicate durable entities.

A client-side busy flag is **not** replay safety. Before closure, prove for each operation:

`request identity / idempotency key / unique semantic key / transaction behavior / retry after unknown outcome / duplicate response semantics / canonical readback`.

If durable replay identity is missing, fix it at the API/backend Source-of-Fix and propagate through contract/client; do not debounce or suppress retries in UI as a workaround.

Status: `ROOT_PROOF_REQUIRED` — not yet allowed to be silently marked N/A.

---

## R3 — MEDIUM/HIGH — CLEANUP ROOT — compatibility/dead authorities must be deleted or explicitly subordinated

### Known cleanup candidates

1. Historical `centralcatalog.UpsertStoreAssortment` still exists and directly writes legacy commercial columns. Current governed HTTP mutation uses `UpsertStoreAssortmentAtomic`, which routes to normalized runtime truth. Before closure, perform exact-branch negative-space proof of callers; if no required caller remains, **delete the obsolete writer**, not merely stop calling it.
2. `dsh_store_assortments.unit_price/currency/available/stock_status` may remain only as transactionally maintained compatibility projections while any proven consumer still requires them. Every reader must be classified. Unused projection writes/reads become deletion/migration work.
3. Active empty/stale contract fragments/registry entries discovered under R0 cannot remain as semantic placeholders after ownership converges.
4. Deleted Partner routes/screens (`overrides`, old PriceSchedule UI, old stale Hub interfaces) must have zero imports/navigation aliases/deep-link residues.
5. No `/prices/schedule` Partner route residue may remain.

`KNOWN OBSOLETE + prerequisites satisfied -> DELETE_REQUIRED`.

---

## R4 — VERIFY, NOT REIMPLEMENT — historical roots whose implementation cutover is observed

| Historical root | Current classification at audit source |
|---|---|
| Hub-local notification preference truth | `IMPLEMENTATION_CUTOVER_OBSERVED / EXACT_CANDIDATE_PROOF_OPEN` |
| Notification mutation without readback | `IMPLEMENTATION_TREATED / FAILURE+SESSION TESTS REQUIRED` |
| One Hub press -> multiple navigation commands | `IMPLEMENTATION_CUTOVER_OBSERVED / NEGATIVE_SPACE_REQUIRED` |
| Hub-local appearance state | `IMPLEMENTATION_CUTOVER_OBSERVED / COLD-START+FAILURE TEST REQUIRED` |
| stale Hub `storeOpen/listingEnabled` contract | `IMPLEMENTATION_CLEANUP_OBSERVED / NEGATIVE_SPACE_REQUIRED` |
| Partner self/readiness stale responses | `IMPLEMENTATION_TREATED / REVERIFY` |
| Store runtime stale responses | `IMPLEMENTATION_TREATED / REVERIFY` |
| Orders readback/idempotency client semantics | `IMPLEMENTATION_TREATED / EXACT JOURNEY REVERIFY` |
| Support durable attempt/readback | `IMPLEMENTATION_TREATED / EXACT JOURNEY REVERIFY` |
| Team `scopeId/storeId` conflation | `IMPLEMENTATION_CUTOVER_OBSERVED IN c5948f14 / EXACT TEST REQUIRED` |
| Store role-context mount gate | `IMPLEMENTATION_GATE_OBSERVED IN c5948f14 / NEGATIVE TEST REQUIRED` |
| Commercial-summary stale store | `IMPLEMENTATION_TREATED / REVERIFY` |

Do not resurrect old code simply because the historical ledger listed it as pending.

---

# 6. Full journey / capability ledger

| ID | Journey/capability | Live disposition | Exact closure requirement |
|---|---|---|---|
| J1 | Identity/session/store scope | `IMPLEMENTATION_GATE_OBSERVED / VERIFY` | zero/one/multiple scopes; `scopeId != storeId`; role-context success/denied/revoked/unavailable; stale response; logout/store switch fail closed |
| J2 | Activation/readiness/operator/field | `VERIFY_COMPLETELY` | one lifecycle truth; operator/field write -> Partner exact readback; no local readiness machine |
| J3 | Store settings/coverage/publication/serviceability | `VERIFY_COMPLETELY` | canonical Partner readback + downstream Client visibility/serviceability reconciliation; stale-store protection |
| J4 | Catalog/taxonomy/assortment/inventory/pricing/pause/proposals/media/reels | **`OPEN — R0/R1/R2/R3`** | one contract owner, normalized commercial authority, scoped exact readback, replay safety, cleanup, downstream Client proof |
| J5 | Orders/acceptance/preparation/issues/dispatch | `VERIFY_COMPLETELY` | legal transitions, OCC/idempotency, readback, unknown-outcome recovery, Partner->Captain/Client handoff where material |
| J6 | Support/conversation/escalation | `VERIFY_COMPLETELY` | durable attempt identity until exact ticket/message evidence; session isolation; deterministic route |
| J7 | Team/permissions | `IMPLEMENTATION_CUTOVER_OBSERVED / VERIFY` | real `storeId`, actor/store authorization, invite/member mutation readback, denied/revoked negative cases |
| J8 | Analytics/commercial/marketing | `VERIFY_COMPLETELY` | governed real data only; no hardcoded KPI/stale store truth; Reels marketing state reconciles |
| J9 | WLT finance | `VERIFY_COMPLETELY` | WLT remains sole balance/settlement authority; DSH/Partner never becomes ledger truth |
| Q1 | Product/UX/Design/A11y/RTL | `OPEN UNTIL FULL JOURNEY PROOF` | UI semantics match real writers; async states accessible; RTL/logical layout; appearance/direction from shared providers |

No row can remain `UNKNOWN_MATERIAL` at closure.

---

# 7. Cross-surface material dispositions

| Surface/service | Why material | Required disposition |
|---|---|---|
| Control Panel | operator lifecycle/catalog/governance writer | verify changes reconcile into Partner truth; no competing catalog contract/writer |
| app-field | readiness + proposal/catalog writer for same partner truth | verify proposal/readiness boundaries where changed; otherwise `VERIFIED_UNCHANGED` |
| app-client | storefront is downstream consumer of Partner publication/normalized price/inventory | must prove `GetPurchasableClientCatalog`/storefront reads normalized truth and respects publication/serviceability |
| app-captain | downstream only for Partner order ready/handoff/dispatch | verify when J5 changes handoff truth; otherwise `N/A_PROVEN` |
| Identity | actor/session/store-access authority | verify Partner cannot manufacture/store-scope access locally |
| WLT | financial authority | verify bridge only; no local balance/settlement ledger |

---

# 8. Product / UX / Design / Accessibility / RTL closure law

1. A UI control may claim success only after its canonical persisted/read model truth is proven where the operation contract requires reconciliation.
2. Loading/error/offline/forbidden/not-found/conflict/revoked/unknown-outcome are first-class states; no static successful default.
3. Store/product switch invalidates every in-flight read/write belonging to the old resource scope.
4. A mutation whose outcome is unknown must preserve/reuse its durable attempt identity where replay semantics require it.
5. Commercial controls must map exactly to normalized Price/Inventory authority; metadata controls must not imply commercial ownership.
6. Destructive/reject/retire/withdraw operations require governed reason/confirmation semantics where the domain requires them.
7. Accessible role/name/state/busy/disabled/error must be programmatically exposed; failures cannot be color-only.
8. Shared UI-kit owns tokens/theme/direction; Partner runtime owns only persisted app preference. No per-screen appearance/direction authority.
9. RTL uses logical start/end; local language never changes canonical IDs or backend state.
10. Money/order/product identifiers remain semantically correct in RTL and locale formatting.

---

# 9. Execution Closure Units — strict root order

## CU-1 — Central Catalog Contract Authority Convergence — **HIGHEST / EXECUTE FIRST**

1. Re-pin current HEAD/PR and inspect any delta since audit source.
2. Inventory every active Catalog contract/fragment/registry entry and every operation it claims.
3. Select exactly one canonical semantic owner for Catalog path operations; make fragments subordinate/derived/verification-only rather than independent mirrors.
4. Reconcile/remove the active empty proposal-readback fragment if it has no unique contract responsibility.
5. Reconcile `dsh.catalog.openapi.yaml`, `catalog.paths.yaml`, `dsh.openapi.yaml` and `contract-registry.ts` so adapter/runtime ownership is non-overlapping and complete.
6. Delete stale duplicate operation definitions/metadata.
7. Run contract composition/lint/registry/scope/API/backend/provenance gates.
8. Negative-space search for duplicate Catalog operationIds/paths/adapter owners.
9. Commit as one causally coherent contract-authority checkpoint.

**CU-1 CLOSED only when contract ownership is singular and complete, not merely when YAML files lint.**

## CU-2 — Partner Catalog Scoped Mutation + Exact Reconciliation

After CU-1 is re-pinned:

1. `ProductControlsScreen`: scope loads/writes; pause/resume -> canonical pause+assortment readback -> exact version/state proof.
2. `ProductEditScreen`: proposal creation -> governed proposal readback -> exact ID/store/status/version proof.
3. `ProductMediaScreen`: upload/unlink -> exact asset/link readback proof; no swallowed verification failure.
4. `PartnerReelsManagementSection`: submit -> canonical list/readback -> exact submitted reel/status proof before success/form reset.
5. Inventory/Price modals: capture operation scope key and reject stale completion after store/product retarget.
6. Centralize only generic scoped-operation mechanics if it eliminates duplication; keep domain truth in canonical APIs.
7. Add behavioral tests for stale request, readback failure, write failure, unmount, store/product switch and concurrent press.
8. Delete superseded local success/state mechanisms.

## CU-3 — Create-command Replay/Idempotency Closure

For Price/Proposal/Reel/Media create paths:

1. Trace exact HTTP handler -> domain mutation -> DB constraints/transaction -> response/readback.
2. Classify each operation `INHERENTLY_IDEMPOTENT | IDEMPOTENCY_KEY_REQUIRED | UNIQUE_SEMANTIC_KEY | COMPENSATED | UNSAFE`.
3. Add durable request identity at backend/contract Source-of-Fix where required.
4. Propagate to shared client; persist/reuse attempt identity until canonical outcome is known.
5. Prove retry after timeout/connection drop cannot produce a second business effect.
6. Test same-key/same-payload replay, same-key/different-payload conflict, concurrent duplicate command, post-commit response loss and readback recovery.

## CU-4 — Compatibility/Legacy Deletion

1. Prove callers/readers of historical `UpsertStoreAssortment` and legacy commercial projection fields.
2. Delete obsolete direct commercial writer if no canonical caller requires it.
3. Migrate/delete remaining legacy projection readers where feasible; retain only explicitly subordinate compatibility projection needed by proven consumer.
4. Delete old Partner screen/route/deep-link aliases and `/prices/schedule` residue.
5. Delete stale/empty contract artifacts made unnecessary by CU-1.
6. Search repository negative space after deletion.

## CU-5 — Remaining Partner Journeys + Cross-Surface Handoffs

Re-audit and treat newly proven roots in this order:

`Identity/store scope -> activation/readiness -> store publication/serviceability -> orders/dispatch -> support -> team -> analytics/commercial/marketing -> WLT`.

Only materially shared Client/Field/Captain/Control Panel nodes join the mutation cone.

## CU-6 — Exact Final Candidate / Fixed Point

1. Pin one final SHA after all code/contract/cleanup checkpoints.
2. Run all invalidated targeted tests plus repository closure set.
3. Run runtime/E2E journeys and cross-surface readback on the same candidate.
4. Negative-space/adversarial audit.
5. Re-read reviews/checks/statuses bound to the exact PR head.
6. Deep re-audit entire Partner material cone.
7. If any material new root/residue appears -> reopen ranking and continue; no cosmetic CLOSED.

---

# 10. Mandatory verification matrix

## Partner runtime/frontend

- `apps/app-partner/runtime`: typecheck, lint, app tests, runtime contract tests, build/export as applicable.
- Hub authority/navigation/store tests.
- Team test where `scopeId != storeId`.
- Store-scope tests: zero/one/multiple + role-context denied/revoked/service failure + stale response.
- Catalog tests: contract route authority, Inventory exact OCC/readback, Price exact readback, pause/resume readback, proposal readback, media/reels exact reconciliation, stale store/product switching.
- Orders/support runtime and authority tests.
- Appearance persistence/readback/cold-start/failure behavior.
- Notifications mutation/readback/session invalidation.

## Contracts/API

- `contracts:redocly`
- OpenAPI compose/materialize for DSH.
- `guard:contract-registry-drift`
- `guard:contract-scope-binding`
- `guard:api-binding`
- `guard:backend-api-binding`
- `guard:generated-client-provenance`
- `guard:openapi-bundle-provenance`
- frontend feature/runtime binding guards.

## Backend/data

- affected Go build/tests.
- Central Catalog Postgres tests for normalized Inventory/Price runtime truth and client projection.
- pause/proposal/media/reel readback + replay tests.
- authorization negative cases for wrong partner/store/product/resource.
- OCC/conflict/concurrency/idempotency/unknown-outcome recovery.
- DB contract/migration guards if persistence/schema changes.

## Repository/runtime

- `guard:source-integrity`
- `guard:fullstack-boundary`
- `guard:aggregate-ownership`
- `guard:runtime-config`
- `guard:no-broken-imports`
- applicable security/dependency/container guards selected by live CI context.
- `ci:check` during iteration as appropriate.
- `ci:close` / Final Closure only against the exact final candidate and current PR identity.

## Runtime/E2E required evidence

- valid Partner role/surface required; invalid/revoked fails closed.
- correct store chosen for zero/one/multiple scopes.
- lifecycle/readiness reconciles with Control Panel/Field writer truth.
- store publication/settings/coverage/serviceability reconcile into Client visibility.
- Catalog metadata, normalized price, normalized inventory, pause, proposal, media and reel operations reconcile after write.
- retry/unknown-outcome does not duplicate create effects.
- Client storefront receives normalized commercial truth only.
- illegal order transitions rejected; legal Partner preparation/ready/handoff visible to materially affected Captain/Client consumers.
- Support ticket/message attempts remain durable until canonical readback.
- WLT remains financial authority.
- no material unrelated regression inside the affected cone.

---

# 11. Mandatory negative-space / deletion search

Before closure search current exact candidate for, at minimum:

- `/prices/schedule`
- deleted old price schedule / product override screens/routes/imports
- editable legacy `unitPrice/available/stockStatus` controls pretending to be canonical commercial writers
- direct callers of historical `UpsertStoreAssortment`
- legacy commercial projection reads outside explicitly classified compatibility consumers
- duplicate Catalog operationIds/path owners across active contracts
- empty active contract fragments with no unique responsibility
- multiple adapter-owner registrations for the same Central Catalog boundary
- Hub-local notification preference state/direct notification mutation
- `useAppPartnerAppearance` or duplicate Partner appearance storage
- multi-command Hub navigation aliases
- stale `storeOpen/listingEnabled` Hub prop authority
- guessed/default store IDs
- Team APIs receiving `scopeId` in place of store aggregate ID
- raw screen-level HTTP bypassing governed shared clients
- local financial balance/settlement truth
- duplicate activation/readiness state machines
- fallback routes masking missing required canonical routes
- mutation-success messages emitted before required canonical readback.

Every hit is classified `CANONICAL | DERIVED_ONLY | MIGRATE | DELETE_REQUIRED | N/A_PROVEN`. `UNCLASSIFIED = 0` at closure.

---

# 12. Closure Gates

`CLOSED` is forbidden until all are true simultaneously on one exact SHA:

1. **Scope:** complete Partner Material Cone disposition; `UNKNOWN_MATERIAL=0`.
2. **Root:** zero known higher executable root.
3. **Authority:** one canonical owner/writer per concept; no shadow/parallel contract or state authority.
4. **Migration:** every affected writer/reader/consumer/handoff cut over.
5. **Cleanup:** every superseded path/type/writer/contract/file deleted or `N/A_PROVEN`.
6. **Contract:** parent/fragments/registry/adapter/runtime are consistent.
7. **Data:** normalized truth, OCC, reconciliation and migrations proven where applicable.
8. **Security:** actor/role/store/resource authorization fails closed.
9. **Journey:** complete Partner journeys and material cross-surface handoffs pass.
10. **Product/UX/A11y/RTL:** semantics/states/accessibility/RTL/appearance correct.
11. **Quality:** applicable typecheck/lint/test/build/guards/CI green on exact candidate.
12. **Negative-Space:** no known stale/duplicate/orphan/dead material residue.
13. **Governance Reconciliation:** registry/capability/governance records reflect implementation truth and do not substitute for it.
14. **Collision:** all material concurrent delta reconciled; `ACTIVE_WORKSET` collision status proven.
15. **Fixed Point:** final deep adversarial re-audit discovers no new material root/gap.

---

# 13. Executable ledger — current state

| ID | Root / closure unit | Status at audit source | Completion condition |
|---|---|---|---|
| P0 | Re-pin HEAD/PR/ACTIVE_WORKSET before each write | `REQUIRED EVERY LOOP` | live delta reconciled; no blind overwrite |
| R0 / CU-1 | Catalog contract authority convergence | **`CRITICAL OPEN / PROVEN`** | one canonical Catalog contract owner; active fragments/registry non-overlapping and complete |
| R1 / CU-2 | Catalog scoped mutation + exact readback | **`HIGH OPEN / PROVEN`** | pause/proposal/media/reels/inventory/price all fail closed on stale/readback failure |
| R2 / CU-3 | Create-command replay/idempotency | **`PROOF REQUIRED`** | every create-style command has proven retry/unknown-outcome semantics; root-treated where missing |
| R3 / CU-4 | legacy writer/contract/route cleanup | **`OPEN CLEANUP`** | zero obsolete writer/path/contract/screen residue |
| J1 | Identity/session/store scope | `IMPLEMENTATION GATE OBSERVED / VERIFY` | exact positive+negative+stale cases pass |
| J2 | activation/readiness/operator/field | `VERIFY / REDIAGNOSE` | one lifecycle truth across writers/readback |
| J3 | store publication/settings/serviceability | `VERIFY / REDIAGNOSE` | Partner/operator/client truth reconciles |
| J4 | Catalog complete journey | **`BLOCKED BY R0-R3`** | all Catalog authorities/writers/readers/replay/cleanup/downstream proof complete |
| J5 | orders/preparation/issues/dispatch | `VERIFY / REDIAGNOSE` | legal state machine + idempotency + readback + handoff |
| J6 | support/conversation/escalation | `VERIFY / REDIAGNOSE` | durable attempts + exact readback/session isolation |
| J7 | team/permissions | `IMPLEMENTATION CUTOVER OBSERVED / VERIFY` | real storeId + auth/readback negative proof |
| J8 | analytics/commercial/marketing | `VERIFY / REDIAGNOSE` | governed real data; no stale/hardcoded truth |
| J9 | WLT finance | `VERIFY / REDIAGNOSE` | WLT sole financial authority end-to-end |
| Q1 | Product/UX/Design/A11y/RTL | `VERIFY / REDIAGNOSE` | all material states/interactions satisfy closure law |
| C1 | full cleanup/deletion/negative space | `BLOCKED BY ACTIVE ROOTS` | zero known superseded material residue |
| V1 | exact candidate verification | `NOT YET CANDIDATE` | all applicable checks/journeys bound to one SHA |
| F1 | fixed-point re-audit | `BLOCKED BY V1` | zero new material finding/root |
| CLOSE | objective closed | **`FORBIDDEN NOW`** | all Closure Gates true simultaneously |

---

# 14. Current conclusion

`c5948f14...` is a material improvement, but it is **not** a Fixed Point and must not be treated as final closure. The earlier plan overstated roots that have since been fixed and understated deeper ownership/reconciliation defects.

The current highest proven root is **Central Catalog contract authority/coverage divergence**, followed by **fragmented Partner Catalog scoped mutation/readback semantics**. Create-style replay/idempotency remains a mandatory proof branch, and compatibility/dead authorities require deletion rather than indefinite coexistence.

Historical Partner notification/navigation/appearance/team/store-context defects are no longer valid reasons to reapply old fixes; they are exact-candidate verification/negative-space obligations.

**Current state:**

`ROOT REMEDIATION = OPEN`

`CATALOG CONTRACT AUTHORITY = OPEN`

`CATALOG MUTATION RECONCILIATION = OPEN`

`REPLAY/IDEMPOTENCY = PROOF REQUIRED`

`CLEANUP/DELETION = OPEN`

`EXACT FINAL CANDIDATE = NOT REACHED`

`FIXED POINT = NOT REACHED`

`CLOSED = NO`
