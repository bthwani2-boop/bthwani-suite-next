# Cleanup Ledger

Tracks any removed or deprecated logic.

- Legacy `DecideProposal` kept as deprecated wrapper around `TransitionProposal` to prevent API contract breakages; now also permission-gated via `requireCatalogPermission` (see 05_POLICY_AND_PERMISSIONS_GATE.md).

## 2026-07-08/09 remediation pass (fixing gaps found after a prior false CLOSED claim)

Removed (verified zero remaining references via repo-wide `rg` before deletion):
- `services/dsh/frontend/shared/partner/use-field-partner-products-controller.tsx` — legacy field trial-products controller.
- `fieldListPartnerProducts`, `fieldCreatePartnerProduct`, `fieldUpdatePartnerProduct` (`partner.api.ts`) and `DshFieldPartnerProduct`/`DshFieldPartnerProductInput` (`partner.types.ts`) — called backend routes (`/dsh/field/partners/{partnerId}/products*`) that no longer exist in `server.go`; the screen was silently 404ing in production.
- `services/dsh/frontend/control-panel/catalogs/drawers/CatalogWorkspaceDrawers.tsx` (625 lines) — 12 "workspace" components, none wired to any real API, none reachable from any rendered screen (not exported from `index.ts`). Fully simulated fake UI; deleted rather than fixed since there was nothing real to fix.

Renamed/isolated (not deleted — still load-bearing for app-client):
- `catalog.types.ts` / `catalog.api.ts` → split. `CatalogCategory`, `CatalogProduct`, `PartnerCatalog`, `CatalogState`, `fetchPublishedCatalog`, `fetchPartnerCatalog` moved to new `legacy-catalog-compat.types.ts` / `legacy-catalog-compat.api.ts`, banner-commented `LEGACY COMPATIBILITY ONLY — not sovereign catalog truth`. `catalog.types.ts`/`catalog.api.ts` now hold only the store-catalog-submission workflow types (`CatalogMedia`, `MediaUploadIntent`, `CatalogSubmission`, `CatalogSubmissionState`) which are a separate concern, not central-catalog-sourced.

Adapted (dead code brought back to life with a different shape, not reimplemented from scratch):
- `products/CategoryControlRoom.tsx` — was orphaned (no importer anywhere) but had real category/node CRUD handlers. Rewired its prop shape to `createCatalogDomain`/`updateCatalogDomain`/`createCatalogNode`/`updateCatalogNode` and wired into `CatalogDashboardScreen.tsx`'s taxonomy tab (previously read-only). Hard-delete UI replaced with hide/show (`isActive` toggle) since no delete endpoint exists for domains/nodes at the API layer — documented as an intentional scope adaptation.

Schema change:
- `services/dsh/database/migrations/dsh-033_cart_master_product_linkage.sql` — added `master_product_id`/`store_assortment_id` to `dsh_cart_items`. `internal/cart.UpsertItem` previously validated against the legacy `internal/catalog.GetProduct` (`dsh_catalog_products` table) — this meant adding any central-catalog-sourced product to cart already 404'd (`ErrInvalid`) before this fix, since central catalog products never had rows in that legacy table. `UpsertItem` now resolves against `dsh_store_assortments` joined to `dsh_master_products`, which is the actual sovereign path.

No cross-cutting docs were edited to claim closure before the above landed; 13/14 below are updated only after this ledger and a passing `go build`/`go test`/`pnpm -w run typecheck`/`pnpm -w run openapi:generate`.
