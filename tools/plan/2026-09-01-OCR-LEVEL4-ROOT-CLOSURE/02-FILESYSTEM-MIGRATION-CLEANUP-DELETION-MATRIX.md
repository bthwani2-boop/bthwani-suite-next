# Filesystem, Migration, Cleanup and Deletion Matrix

**Goal:** make repository structure, file placement, naming, ownership and compatibility residue consistent with one canonical Product/System truth. Cleanup is part of closure, not post-closure polish.

---

# 1. Classification model

Every material tracked file/directory encountered during this campaign MUST receive one disposition:

```text
CANONICAL_OWNER
DERIVED_REQUIRED
RUNTIME_SHELL_REQUIRED
BOUNDED_MIGRATION
TEST_FIXTURE_REQUIRED
GENERATED_OUTPUT
MOVE_REQUIRED
MERGE_REQUIRED
RENAME_REQUIRED
DELETE_REQUIRED
FALSE_POSITIVE_WITH_REASON
```

No `UNKNOWN` is permitted at final fixed point for a material path.

For any `DELETE_REQUIRED` item, deletion occurs only after:

```text
zero imports
+ zero runtime routes
+ zero writers
+ zero readers
+ zero config references
+ zero generated references
+ zero tests/fixtures that still require the old truth
+ zero supported-upgrade dependency
```

Once those conditions are true, keeping the file “just in case” is forbidden.

---

# 2. Repository root responsibility matrix

## `core/`

### KEEP as sovereign services

Current top-level services are legitimate and should remain distinct:

```text
core/identity
core/workforce
core/providers
core/platform-control
```

### Required normalization

Each service should converge on a predictable internal layout where material:

```text
backend/
contracts/
database/
clients/            # only when generated/typed consumers exist
service.manifest.ts # only when it is evidence-safe, not manual green truth
tests/              # owner tests, when not colocated by language convention
package.json
tsconfig.json       # when TS surface exists
```

Do not add empty folders to force symmetry.

### Delete/move conditions

- DSH-specific business policy inside `core/*` → move to DSH owner unless it is a cross-platform core invariant.
- financial mutable truth inside any `core/*` → move/cut over to WLT.
- provider credentials outside `core/providers` → migrate/delete non-owner writer.
- workforce geography/service-area mutable truth → delete/migrate to DSH service-area authority.
- duplicated role/permission vocabularies copied into services → generated/neutral boundary or read-only adapter, then delete copies.

---

# 3. `shared/` — strongest anti-duplication rules

Current roots:

```text
shared/data-runtime
shared/ui-kit
shared/control-panel
```

These packages are useful **only if each owns a unique layer**.

## 3.1 `shared/data-runtime`

### Allowed responsibilities

- query/cache clients and providers;
- connectivity adapters;
- durable/sensitive storage adapters;
- installation identity;
- mutation identity scope/replay identity infrastructure;
- transport/runtime utilities that know nothing about business semantics.

### Forbidden

- order state machine;
- dispatch transition legality;
- financial status/amount semantics;
- role authorization decisions copied from Identity/Workforce;
- serviceability/geography policy;
- domain DTO mirror used as contract authority.

### Required audit

For every file under `src/`, ask:

```text
Can this file be used unchanged by more than one domain without knowing domain meaning?
```

If no, move it to its domain owner unless there is a stronger proven shared abstraction.

## 3.2 `shared/ui-kit`

### Canonical responsibility

- visual primitives;
- tokens/foundation;
- generic accessible components;
- platform-neutral visual behavior.

### Current cleanup root

`src/web/control-panel.tsx` currently acts as a large control-panel-specific component owner while `shared/control-panel` also owns control-panel components. That overlap must be collapsed.

### Required action

Inventory every export in `shared/ui-kit/src/web/control-panel.tsx` and every `shared/control-panel/src/components/Cp*` component:

| Component kind | Final owner |
|---|---|
| Generic Button/Badge/Surface/Text/EmptyState primitive | `shared/ui-kit` |
| Control-panel navigation/shell/composition semantics | `shared/control-panel` |
| Domain-specific Finance/HR/Catalog behavior | domain/control-panel feature owner under service frontend |
| Thin wrapper with no semantic/accessibility/styling value | delete after consumer migration |

Remove duplicate generic components instead of creating a third “common” layer.

### Naming

Avoid `WebControlPanel*` inside `ui-kit` if the component is genuinely control-panel-specific. Move/rename into `shared/control-panel`. Conversely, keep genuinely generic primitives in `ui-kit` with generic names.

## 3.3 `shared/control-panel`

### Allowed

- control-panel shell/layout/navigation composition;
- reusable CP-specific presentation patterns;
- no DSH/WLT mutable truth;
- no generic design-system duplication.

### Audit the `Cp*` prefix

A prefix alone does not prove ownership. For each file (Button, Badge, AmountDisplay, FilterBar, DetailPanel, labels, etc.):

1. Does it encode CP-specific semantics?
2. Does ui-kit already provide the primitive?
3. Is the wrapper only prop renaming/style forwarding?
4. Does it embed user-visible copy that should come from localization/domain caller?
5. Does it enforce accessibility that belongs in the generic primitive instead?

If it adds no unique CP semantic value, migrate consumers and delete it.

---

# 4. `infra/` — executable infrastructure only

Current canonical policy says `infra/docker/compose.runtime.yml` is the canonical Docker runtime file.

## Keep only material runtime/configuration artifacts

Expected classes:

```text
infra/docker/compose.runtime.yml       CANONICAL_RUNTIME
compose.dev-bootstrap.yml              DERIVED/DEV_REQUIRED if still consumed
compose.financial-simulators.yml       TEST/DEV_REQUIRED if WLT simulators consume it
compose.observability.yml              DERIVED_REQUIRED only if actively used
runtime-readiness.contract.json        DERIVED/CANONICAL contract per owner proof
infra/docker/env/**                    runtime env templates only
infra/data-plane/**                    active data-plane config only
infra/local/**                         local developer runtime only
```

## Removed immediately

`infra/FUTURE_RUNTIME_CAPABILITIES.md` is removed in this change because it mixes active/future/rejected/fallback roadmap decisions, contains contradictory statements, and has no live code reference. Roadmap ideas belong in current product planning/issue tracking, not executable infrastructure authority.

## Required negative-space checks

Search for:

- alternate full compose files;
- duplicate service port/env defaults;
- provider config duplicated in frontend;
- production secrets/URLs in local config;
- stale environment aliases;
- runtime scripts that bypass canonical compose;
- optional observability/simulator files accidentally required for base runtime.

---

# 5. `services/dsh/`

## Canonical domains must not own each other’s policy

Examples currently requiring treatment:

- Cart currently owns serviceability aliases/distance policy → move to DSH policy/service-area authority.
- Dispatch frontend repairs generated contract → fix canonical contract and delete repair types.
- Checkout address/maps runtime binding incomplete → bind through canonical policy/provider boundary.

## Contracts

Final law:

```text
ONE path+method
→ ONE operationId
→ ONE semantic contract owner
→ ONE runtime binding
→ generated/typed consumers
```

Forbidden final state:

- active contract fragment mirroring parent contract;
- manual frontend enum additions for wire values;
- `Omit<>` / intersections used to patch generated wire DTO drift;
- duplicated schema files defining the same operation semantics.

## Database

Do not delete historical migrations required by supported upgrade/fresh install.

Delete only:

- migrations proven never released/required **if** repository policy explicitly allows squash/rewrite before baseline; otherwise leave historical migration chain;
- runtime compatibility tables/columns only through forward drop migration after zero consumers;
- stale seed/fixture data that represents superseded truth.

## Frontend

Delete after migration:

- local business state machines that duplicate backend legality;
- local policy tables/mappings whose canonical equivalent is server-owned;
- generated-contract repair types;
- fake/default product truth on missing/error;
- duplicate retry/unknown-outcome heuristics made obsolete by server receipts.

---

# 6. `services/wlt/`

## Keep

```text
backend/
contracts/
database/
docker/             # only WLT-specific runtime material that is not duplicated by infra root
service.manifest.ts  # if converted/remains evidence-safe
```

## Historical docs removed now

The repository previously tracked:

- `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md`;
- `services/wlt/history/README.md`;
- `services/wlt/history/2026-08-13-WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md` (~68 KB).

Those documents explicitly said they were not current authority and no live reference to the filename was found. Git history already preserves provenance. They are deleted in this cleanup commit to prevent a second architecture narrative living beside governance/live code.

If material rationale is later discovered only in historical Git content, copy the **current valid invariant** into canonical governance/product truth; do not restore the historical file as authority.

## WLT-specific duplication search

Repository-wide search for:

```text
wallet balance writer
payment confirmation
refund finalization
settlement posting
ledger mutation
payout decision
commission finalization
financial operator context ownership
```

Any mutable implementation outside WLT is a root defect unless it is an explicitly bounded migration tool.

---

# 7. `apps/`

## Runtime-shell law

`apps/app-client`, `app-partner`, `app-captain`, `app-field`, `control-panel` runtime packages may own:

- Expo/Next boot;
- environment binding;
- navigation host;
- native/web deployment shell;
- platform-specific app metadata.

They may not own:

- order/dispatch/financial state machines;
- serviceability policy;
- canonical defaults that differ from server truth;
- duplicate contracts;
- mutable domain data stores independent of service owners.

If an app runtime has domain logic, move it to the relevant `services/*/frontend` owner and delete the runtime copy.

---

# 8. `tools/plan/` lifecycle

## New rule for this campaign

Only the active execution package should remain in `tools/plan/`.

Superseded audit snapshots are deleted after extracting material content. Git history is sufficient provenance.

Each plan package must state:

- exact starting SHA;
- orchestrator revision;
- `NOT CANONICAL AUTHORITY` warning;
- invalidation rule when HEAD moves;
- closure/removal condition.

On Level-4 closure, either delete the package or move only durable lessons into canonical governance. Do not accumulate dated “final” plans indefinitely.

---

# 9. Naming and path quality gate

The following names require explicit justification because they tend to hide ownership:

```text
common
shared        # below already-shared roots
helpers
utils
misc
legacy
old
history
archive
temp/tmp
backup
copy
new
final
v2/v3
experimental
prototype
```

For each such path:

- if it has one clear responsibility, rename to that responsibility;
- if it mixes responsibilities, split by owner;
- if it is migration-only, encode the migration purpose/removal condition;
- if obsolete, delete it.

Avoid names such as `final-final`, branch/date-specific architecture authorities, or “next” inside internal domain folders unless they are externally required product identities.

---

# 10. Source-line cleanliness rules

A file is not considered clean merely because it compiles.

Repository-wide finishing audit must classify and eliminate unjustified:

```text
@ts-ignore
@ts-expect-error
eslint-disable
nolint
any / unknown-as coercion used to bypass a broken boundary
panic/TODO placeholders in required production behavior
catch-and-ignore for material mutation/readback
console.error-only state handling
magic policy numbers
hard-coded translated copy in reusable components
manual enum/string mirrors
raw status branching that controls business legality
unbounded fallback/default behavior
```

Suppressions may remain only with a narrow, documented technical reason and an owner/removal condition; no file-wide suppression in canonical shared owners.

---

# 11. Compatibility/migration ledger required for every bounded old path

For every compatibility reader/writer/storage key/route/env alias/schema projection:

```text
Compatibility ID:
Canonical replacement:
Old writer(s):
Old reader(s):
Data inventory count:
Backfill/migration:
Reconciliation proof:
Cutover commit:
Zero-consumer proof:
Removal commit:
```

If any field is unknown, the compatibility path is not closed.

---

# 12. Deletion order

Never delete first and hope tests reveal dependencies.

Correct sequence:

```text
inventory
→ canonical owner implemented
→ data/backfill
→ dual-read only if strictly bounded and proven necessary
→ consumer migration
→ canonical readback
→ old writes disabled
→ zero old reads/writes/imports/routes
→ delete old code/config/contracts/tests/fixtures/storage readers
→ forward-drop old DB structures if applicable
→ negative-space search
```

The desired final repository is not the smallest possible repository. It is the smallest repository that contains **all and only** the material canonical implementation, derived runtime/UI layers, supported migrations, and proof required for the active product.
