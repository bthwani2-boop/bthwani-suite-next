# Canonical Repository Topology Target

## 1. Top-level taxonomy

The final top-level structure must classify material code by real responsibility, not inherited importance labels.

Canonical target:

```text
bthwani-suite-next/
├── apps/
│   ├── app-client/
│   ├── app-partner/
│   ├── app-captain/
│   ├── app-field/
│   └── control-panel/
│
├── services/
│   ├── dsh/
│   ├── wlt/
│   ├── identity/
│   ├── workforce/
│   └── platform-control/
│
├── packages/
│   ├── design-system/
│   └── <only-proven-cohesive-reusable-technical-packages>/
│
├── contracts/
│   ├── protocol/
│   ├── catalog/
│   └── tests/
│
├── infra/
│   ├── local/
│   └── deployment/     # only when real deployment/IaC responsibility exists
│
└── tools/
```

This is a semantic classification target, not permission to create empty placeholder directories.

## 2. Losing top-level ownership classes

`core/` and `shared/` are not canonical ownership classes.

```text
core/identity          → services/identity
core/workforce         → services/workforce
core/platform-control  → services/platform-control
core/providers         → decompose according to targets/providers-and-integrations.md

shared/ui-kit          → salvage/refound into packages/design-system
shared/control-panel   → decompose to design-system, app host, or service capability owners
shared/data-runtime    → decompose by proven technical responsibility; do not rename as one generic package
shared/resilience      → replace/refound/absorb according to proven consumers and reliability needs
```

After full consumer cutover:

```text
core/   = ABSENT
shared/ = ABSENT
```

No aliases, compatibility directories, path reexports, workspace entries, Go `replace` directives, Docker paths, scripts, or CI filters may preserve those roots internally.

## 3. Deployable apps are direct workspace roots

When `apps/<app>/` contains only a `runtime/` child and that child is the actual Expo/Next workspace, `runtime` is a pass-through parent and must be removed.

Target:

```text
apps/app-client/
apps/app-partner/
apps/app-captain/
apps/app-field/
apps/control-panel/
```

Each deployable root directly owns its package manifest/build/runtime files.

Expected workspace pattern after cutover:

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
  - "contracts"
```

Only retain a deeper runtime directory if future evidence proves the app root owns another independent sibling responsibility with a real lifecycle. A single-child wrapper is not a boundary.

Package names should identify the deployable, not the removed wrapper:

```text
@bthwani/app-client
@bthwani/app-partner
@bthwani/app-captain
@bthwani/app-field
@bthwani/control-panel
```

## 4. Service topology

A service is a bounded context with independent business/system authority, not merely a folder of shared functions.

Where materially applicable, prefer this conceptual shape:

```text
services/<service>/
├── backend/
│   ├── cmd/
│   └── internal/
│       ├── runtime/
│       ├── transport/
│       ├── integrations/
│       └── <semantic-capabilities>/
├── contracts/
├── clients/
├── frontend/          # only when the service owns reusable UI/presentation
├── database/
└── tests/testing/     # only where the responsibility is real
```

Do not mechanically manufacture every directory for every service.

`cmd/*` must stay thin process startup. `transport` must not become a business mega-domain. `integrations` translate external/peer boundaries and do not own remote domain truth.

## 5. Package topology

`packages/` is for reusable technical code only.

A package is admitted only when all are proven:

```text
MULTIPLE_REAL_CONSUMERS_OR_STRONG_INDEPENDENT_REUSE_REASON
ONE_COHESIVE_TECHNICAL_RESPONSIBILITY
NO_BUSINESS_TRUTH_AUTHORITY
NO_DEPLOYABLE_APP_OWNERSHIP
NO_SERVICE_STORAGE_AUTHORITY
STABLE_PUBLIC_API
CLEAR_DEPENDENCY_DIRECTION
```

`packages/` must not become the renamed `shared/` dumping ground.

Generic names such as `common`, `shared`, `core`, `client-runtime`, `query-runtime`, `platform`, `utils`, or `helpers` require heightened proof and are forbidden when they hide multiple responsibilities.

## 6. Contracts topology

Service business contracts remain with their service.

Root `contracts/` owns only genuinely cross-service wire/protocol primitives, generated discovery/catalog outputs, and their verification tooling. It does not own business operations or become a gateway runtime.

See `targets/contracts-and-protocols.md`.

## 7. Infrastructure topology

`infra/` owns environment/deployment composition only.

It may own local compose, local data-plane provisioning, observability tooling, and real deployment/IaC wiring. It must not own business fixtures, service schemas, app config contracts, provider business semantics, or secret values.

See `targets/infra-and-runtime.md`.

## 8. Naming law

Canonical names describe stable responsibility.

Presumed noncanonical as domain/package owners unless positively proven:

```text
core
shared
common
misc
legacy
old
new
final
v2/v3 without protocol/version meaning
home-discovery
account
settings
dashboard
workspace
hub
governance
truth
closure
finance
operations
administration
boundary
client-*
partner-*
captain-*
field-*
```

Actor, page, route, mechanism, lifecycle phase, or implementation technology must not masquerade as a business owner.

## 9. Topology exit gate

Repository topology cannot pass structural qualification while any known instance remains of:

```text
TOP_LEVEL_core_ROOT
TOP_LEVEL_shared_ROOT
PASS_THROUGH_apps/*/runtime_LAYER_WITHOUT_UNIQUE_ROLE
GENERIC_PROVIDER_GOD_SERVICE
BUSINESS_TRUTH_IN_packages
BUSINESS_CONTRACT_AUTHORITY_IN_ROOT_contracts
BUSINESS_FIXTURES_OR_APP_CONFIG_OWNED_BY_infra
OLD_WORKSPACE_PATHS
OLD_PACKAGE_NAMES
OLD_GO_REPLACE_PATHS
OLD_DOCKER_PATHS
OLD_TSCONFIG/NX/CI_PATHS
INTERNAL_ALIASES_PRESERVING_LOSING_TOPOLOGY
```

Move/rename alone does not satisfy this gate. Required value must be re-owned, all consumers cut over, and losers deleted.