# Focus — Code Architecture, Organization, UI Implementation and Structural Quality

## 1. Purpose

Execution lens for implementation architecture, repository structure, modules/packages/files, shared code, UI/component implementation, naming, dependencies, duplication and cleanup.

Durable policy authority is **not this focus module**. Apply:

- `governance/policies/engineering.md`;
- `governance/policies/architecture-and-fullstack.md`;
- `governance/policies/frontend-and-client.md`;
- `governance/policies/standards-and-quality.md`;
- `governance/product/EXPERIENCE-AND-DESIGN.md` when user experience/design is material.

Product/System semantics remain owned by `governance/product/**` and are reconciled through `focus/governance-product-design.md`.

## 2. Execution lens

Within the selected material cone, use governance to prove the actual owner/layer/responsibility, dependency direction, real consumers and complete vertical path. Do not infer architecture from directories or minimize the root to the first file containing a symptom.

Inspect as materially applicable:

`semantic duplication | wrong owner/layer | dependency inversion | shared/common junk ownership | pass-through wrappers | generated forks | stale aliases | dead/legacy paths | dependency/package residue | mobile/client lifecycle | resource leaks | design-system forks | incomplete move/split/merge`.

## 3. Treatment

Treat the highest actual Source-of-Fix, migrate all affected callers/consumers/generated outputs and perform the canonical cutover. A move/rename/helper extraction without corrected ownership and cleanup is zero root progress.

Do not add wrappers, abstractions, packages or dependencies merely to make the local diff look cleaner; apply the standards adequacy gate in governance.

## 4. UI/client implementation

When UI is material, verify its implementation against Product Truth, durable experience policy and frontend/client policy: state/readback ownership, loading/empty/error/recovery, accessibility, RTL/localization, platform adaptation, resource lifecycle and server-side authorization boundary.

Visual polish does not substitute for correct journey/state/authority behavior.

## 5. Structural finishing

Before closure, inspect affected negative space for ownerless/misplaced artifacts, duplicated authority, stale imports/exports, pass-through indirection, obsolete dependencies, generated forks, legacy compatibility and unfinished migration. Known material residue tied to the root remains open under `04`.
