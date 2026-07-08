# Verification Matrix

Tracks verified execution and checks.

| Phase | Check | Command / File | Status |
| --- | --- | --- | --- |
| 1 | DB Seeds Convergence | `apply-central-catalog-seed.ps1` | `RUNTIME_NOT_STARTED_BY_USER` — no live DB in this environment; new `dsh-033` migration file created, not yet applied/verified against a running Postgres |
| 2 | Backend Unit Tests | `go test ./... -count=1` (services/dsh/backend) | `PASS` (all 20 tested packages, including `internal/cart` after the master-product-linkage rewrite) |
| 3 | Backend Compile | `go build ./...` + `go vet ./...` | `PASS` |
| 4 | Client Generation | `pnpm -w run openapi:generate` | `PASS` (dsh/wlt/identity all regenerated; `DshCartItem`/`DshUpsertCartItemRequest` updated to `masterProductId`/`storeAssortmentId`) |
| 5 | Frontend Compile | `pnpm -w run typecheck` | `PASS` — 0 TypeScript errors across all workspaces (`app-client`, `app-field`, `app-partner`, `app-captain`, `control-panel`, `services/dsh`, `shared/ui-kit`, contracts) |
| 6 | App-field legacy product flow | `rg "fieldCreatePartnerProduct\|fieldUpdatePartnerProduct\|fieldListPartnerProducts\|useFieldPartnerProductsController\|priceReference" services/dsh/frontend/app-field` | `PASS` — zero matches; screen now consumes `fetchFieldTaxonomy`/`fetchFieldMasterProducts`/`upsertFieldStoreAssortment`/`createFieldProductProposal` |
| 7 | Legacy catalog compat isolation | `rg` for `CatalogCategory\|CatalogProduct\|PartnerCatalog\|CatalogState` imports from `catalog.types` | `PASS` — moved to `legacy-catalog-compat.types.ts`/`legacy-catalog-compat.api.ts` with banner comments; 4 app-client consumers repointed |
| 8 | Cart master-product linkage | `internal/cart.UpsertItem` resolves via `dsh_store_assortments`+`dsh_master_products`; `DshCartItem`/`DshUpsertCartItemRequest` carry `masterProductId`/`storeAssortmentId` | `PASS` at code level; DB-integration test (`cart_db_test.go`, opt-in via `DSH_REQUIRE_DB_TESTS=true`) updated to seed master-product/assortment rows — not run against a live DB this pass |
| 9 | Control-panel inline styles | `rg "style=\{\{" services/dsh/frontend/control-panel/catalogs` | `PASS` — 182 → 6 occurrences, all genuinely dynamic per-item values with an explanatory comment |
| 10 | Dead control-panel UI | `CategoryControlRoom` wired into taxonomy tab; `CatalogWorkspaceDrawers.tsx` deleted | `PASS` |
| 11 | DAM UI completion | Upload form (`uploadAndLinkAsset`), entity-image-link form (`putEntityImage`), archive action, client-derived "missing image" badge | `PASS` at code level; not exercised against a running backend/object store this pass |
| 12 | Granular catalog permissions | `requireCatalogPermission` additive check against `identity.Permissions`, 9 named actions, operator role unchanged | `PASS` at code level; requires an identity DB row to actually grant a non-operator a scoped permission — not exercised this pass (no live identity DB) |
| 13 | Pipeline/policy smoke (partner→client-visible walkthrough, barcode/image/manual_request rejections) | Manual smoke sequence in `10_EXECUTION_PLAN_NO_SKIP_GATE.md` | `RUNTIME_NOT_STARTED_BY_USER` — needs a running backend + seeded DB |

No phase above claims 100%/CLOSED status based on documentation alone; phases 1, 8 (DB half), 11 (runtime half), 12 (runtime half), and 13 require a live database/backend that was not started in this session.
