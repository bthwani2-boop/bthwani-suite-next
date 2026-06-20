# Graph Analysis Notes — DSH-001

## Relevant Existing Nodes

| Node | Path | Role |
|---|---|---|
| `dsh` | `services/dsh` | DSH service root; Nx project `dsh` |
| `dsh-service-manifest` | `services/dsh/service.manifest.ts` | Governs capability/surface/runtime state |
| `dsh-capability-map` | `services/dsh/capability-map.ts` | Defines `dsh.store.discovery` as planned |
| `dsh-surface-map` | `services/dsh/surface-map.ts` | Maps `app-client` to `dsh.store.discovery` |
| `dsh-openapi` | `services/dsh/contracts/dsh.openapi.yaml` | Current contract: health + readiness only |
| `app-client` | `apps/app-client/runtime` | Nx project `app-client`; Expo app |
| `app-shell` | `shared/app-shell` | Shell contracts; slot typing |
| `ui-kit` | `shared/ui-kit` | Design system: Card, EmptyState, ErrorState, LoadingState, Screen, Surface, Text |

## Relevant Import/Route/Runtime Links

- `apps/app-client/runtime/src/App.tsx` → bare shell (no routes yet); DSH screen slot is empty
- `shared/app-shell/src/service-slots.ts` → `ServiceSlotContract<"dsh","app-client">` resolves to `services/dsh/frontend/app-client`
- `shared/ui-kit/src/components/` → Card, EmptyState, ErrorState, LoadingState, Screen, Surface all available
- `infra/docker/compose.runtime.yml` → `postgres` service active; `dsh` profile slot reserved
- `infra/docker/runtime-profiles/dsh.runtime-profile.json` → `RESERVED_NOT_ACTIVE`, port 58080, db `dsh_runtime`
- `infra/data-plane/postgres/init/001_create_runtime_databases.sh` → `dsh_runtime` database created at runtime init

## Missing Links To Add

| Link | From | To | Why |
|---|---|---|---|
| OpenAPI paths | `services/dsh/contracts/dsh.openapi.yaml` | `GET /dsh/stores`, `GET /dsh/stores/{storeId}` | Contract gate for DSH-001 |
| Domain layer | `services/dsh/domain/store-discovery/` | `store-discovery.types.ts`, `.policy.ts`, `.errors.ts` | Business rules, no SQL or UI |
| DB migration | `services/dsh/database/migrations/` | `dsh-001_store_discovery.sql` | Table `dsh_stores` |
| DB seed | `services/dsh/database/seeds/local/` | `dsh-001_store_discovery.local.sql` | Local test data |
| Backend runtime | `services/dsh/backend/` | `server.ts`, `health.ts`, `readiness.ts`, `store-discovery.repository.ts`, `store-discovery.handlers.ts`, `store-discovery.routes.ts`, `Dockerfile` | Real Postgres runtime |
| Generated client | `services/dsh/clients/generated/dsh-api.ts` | openapi-typescript output | Typed contract |
| Client wrapper | `services/dsh/clients/store-discovery-client.ts` | Typed fetch wrapper | Used by frontend adapter |
| Frontend shared | `services/dsh/frontend/shared/store-discovery/` | API, types, view-model, states, formatters | Adapts DTO → ViewModel |
| App-client screens | `services/dsh/frontend/app-client/store-discovery/` | StoreDiscoveryScreen, Route, List, Card, EmptyState, ErrorState | UI surfaces |
| App registration | `apps/app-client/runtime/src/App.tsx` | Import and render `StoreDiscoveryScreen` | Connects screen to shell |
| Docker profile | `infra/docker/compose.runtime.yml` | `dsh-api` service under profile `dsh` | Activates DSH runtime |

## Dead/Forbidden Links To Avoid

- `services/dsh/frontend/app-partner`, `app-captain`, `app-field`, `control-panel` — out of scope for DSH-001
- Any import of WLT financial logic or mutation inside DSH
- Any direct `fetch` call inside screen components
- Any `InMemory` / `MemoryRepository` / `new Map()` in runtime files
- Any `preview`, `demo`, `mock`, `fixture` in runtime files (guard violation)
- Donor Docker terms: `bthwani-suite-local`, `bthwani-dsh-api-local`, `bthwani-dsh-postgres-local`
- Donor port 8082, 5433, etc. — new repo uses port 58080 / 55432
