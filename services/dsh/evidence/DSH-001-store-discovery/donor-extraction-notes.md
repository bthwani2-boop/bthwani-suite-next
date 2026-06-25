# Donor Extraction Notes Ã¢â‚¬â€ DSH-001

Source: `C:\bthwani-suite` branch `realtest` Ã¢â‚¬â€ read-only analysis.

## Accepted Patterns

| Donor Path | Accepted Idea | New Target | Reason |
|---|---|---|---|
| `dsh/backend/migrations/001_store_discovery.sql` | Table shape: id, name, status_tone (open/closed), rating, publish_stage, image_url, logo_url, created_at, updated_at | `services/dsh/database/migrations/dsh-001_store_discovery.sql` | Structural reference Ã¢â‚¬â€ redesigned with proper domain statuses and constraints |
| `dsh/backend/seed/003_store_discovery_seed.sql` | Seed IDs `store-1001`, `store-1002` as fixed local test anchors | `services/dsh/database/seeds/local/dsh-001_store_discovery.local.sql` | Same store IDs for API smoke consistency; all other field values are new |
| `dsh/domain/store_discovery.go` | Status domain split: open/closed Ã¢â€ â€™ richer status + serviceability | `services/dsh/domain/store-discovery/store-discovery.types.ts` | Donor had binary open/closed; new design has `status` (active/inactive/temporarily_closed/unavailable) + `serviceabilityStatus` (serviceable/limited/out_of_area/unavailable) |
| `dsh/domain/store_discovery.go` | `Pagination` struct: limit/offset/total | `services/dsh/contracts/dsh.openapi.yaml` DshPagination schema | Mandatory pagination pattern preserved |
| `dsh/frontend/shared/stores/stores.api.ts` | Typed client factory pattern with transport injection | `services/dsh/clients/store-discovery-client.ts` | Clean typed client; base URL from env; no direct fetch in screen |
| `dsh/frontend/shared/stores/stores.view-model.ts` | ViewModel separation from DTO | `services/dsh/frontend/shared/store/store-discovery.view-model.ts` | DTO Ã¢â€ â€™ ViewModel mapping prevents leaking API shape to UI |
| `dsh/frontend/app-client/parts/home/HomeStoreFeedSection.tsx` | Store card hierarchy: hero image, name, delivery info, rating badge | `services/dsh/frontend/app-client/store/StoreDiscoveryCard.tsx` | Visual hierarchy idea only; implemented via @bthwani/ui-kit Card/Surface/Text |
| `dsh/frontend/app-client/screens/HomeScreen.tsx` | Loading/empty/error state structure as distinct branches | `services/dsh/frontend/shared/store/store-discovery.states.ts` | States pattern retained; implementation uses ui-kit components only |
| `dsh/backend/cmd/dsh-api/main.go` | HTTP server pattern: health, readiness, domain routes | `services/dsh/backend/runtime/server.ts` | Pattern adapted to TypeScript Node.js http module |
| `dsh/frontend/shared/discovery/client-home.model.ts` | cityCode / serviceAreaCode as filter dimensions | `services/dsh/contracts/dsh.openapi.yaml` Ã¢â‚¬â€ filters on `GET /dsh/stores` | Correct filtering approach confirmed |

## Rejected Patterns

| Donor Path | Rejected Item | Reason |
|---|---|---|
| `dsh/backend/docker-compose.local.yml` | Entire file + container/port names | Forbidden: old compose format, donor container names (`bthwani-dsh-api-local`, `bthwani-dsh-postgres-local`) |
| `dsh/backend/Dockerfile.dsh-api` | Copy verbatim | Forbidden: targets Go binary; new runtime is TypeScript Node.js |
| `dsh/backend/internal/store/memory_repository.go` | In-memory repository pattern | Forbidden: `no-memory-repo-in-slice-runtime` guard; runtime must use Postgres |
| `dsh/frontend/shared/marketing/marketing.preview-state.ts` | Preview state data (68 KB) | Forbidden: `no-preview-demo-mock-runtime` guard; no preview/demo/mock |
| `dsh/frontend/app-client/parts/home/home-screen.styles.ts` | Local StyleSheet definitions | Forbidden: `no-local-design-system` guard; use @bthwani/ui-kit tokens only |
| `dsh/frontend/shared/checkout/` | Checkout/cart logic | Forbidden: out of scope for DSH-001 |
| `dsh/domain/category.go` | Category-related entities | Forbidden: out of scope for DSH-001 |
| `dsh/frontend/shared/marketing/` | Marketing/banner/promo logic | Forbidden: out of scope for DSH-001 |
| `dsh/frontend/control-panel/` | Control panel screens | Forbidden: out of scope for DSH-001 |
| `dsh/frontend/app-partner/`, `app-captain/`, `app-field/` | Non-app-client surfaces | Forbidden: out of scope for DSH-001 |
| Any donor `contact_number`, `opening_hours`, `catalog_summary` columns | Donor-specific columns not in new domain model | Rejected: not in new OpenAPI spec; adds domain complexity not needed for discovery |
