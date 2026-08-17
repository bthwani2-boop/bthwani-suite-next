# Focus — Code, Architecture, Repository Organization and UI/UX Implementation

## 1. Purpose

Use this module when the starting lens includes `CODE`, `STRUCTURE`, `DESIGN` or `ALL`. It diagnoses implementation quality as part of system meaning, not as isolated style cleanup.

## 2. Architecture and ownership

Inspect:

- domain/capability boundaries and canonical owners;
- public/private module boundaries;
- dependency direction and cross-domain leakage;
- duplicated or parallel implementations;
- shared code placement versus feature/domain ownership;
- surface-local business logic that should be canonical/shared;
- unbound backend/frontend code;
- circular or confused architectural ownership;
- adapters/controllers/repositories with mixed responsibilities;
- implementation that contradicts product/data/contract ownership.

Fix the parent ownership/design cause before mass-moving leaf files.

## 3. Repository structure

For every materially affected folder/module establish, as needed:

`owner | responsibility | allowed contents | forbidden contents | public boundary | incoming dependencies | outgoing dependencies | generated artifacts | tests | runtime relation`.

Derive directories from ownership/capability boundaries rather than forcing product meaning to fit an arbitrary tree.

## 4. File placement and contextual naming

Every material file should have:

- identifiable responsibility;
- identifiable domain/context;
- identifiable canonical owner;
- justified location;
- a name that is not ambiguous in its path/context.

Treat names such as `new`, `old`, `temp`, `final`, `copy`, `backup`, `misc`, and context-poor `helpers`, `utils`, `common`, `shared`, `data`, `types` as review signals, not automatic failures. Rename when ambiguity/ownership actually harms correctness or maintainability.

Do not enforce arbitrary line-count thresholds. Split when a file mixes independent responsibilities, authorities or lifecycles, not merely because it is long.

## 5. Dependency/references before move/delete

Trace materially relevant:

`imports | exports | routes | navigation/mounting | registries/manifests | API/generated clients | DB/data | runtime/config | tests | guards/CI | package/workspace scripts | governance references`.

A move/rename/delete is complete only after rewiring and verification.

## 6. Duplication, dead and stale code

Look for:

- duplicated business rules/state/status mappings;
- duplicate API adapters/contracts/types;
- obsolete compatibility or fallback paths;
- dead screens/routes/features;
- orphan modules/files/directories;
- stale config/scripts/dependencies;
- generated artifacts in the wrong ownership boundary;
- historical implementations still reachable.

Static “unused” output is evidence, not deletion authority. Prove references/runtime relevance first.

## 7. Frontend/backend binding

For affected user/operator actions trace the vertical slice to real backend/data effect and back to canonical readback.

Reject as final state:

- UI-only feature with fake/local success;
- backend-only feature missing a required surface;
- direct raw API mapping that duplicates canonical logic;
- divergent status/error/permission interpretations across surfaces;
- local surface state machine that creates parallel truth.

## 8. Design and UI/UX correctness

Design is not decoration. Diagnose:

- information architecture and navigation;
- actor goal clarity and action availability;
- loading/empty/error/denied/disabled/retry/offline/recovery states;
- feedback after mutations and later readback;
- cross-surface consistency without forcing identical layouts;
- responsive/mobile ergonomics;
- Arabic/RTL behavior where applicable;
- accessibility and interaction semantics;
- design-system/component consistency;
- visual/product value preservation during restructuring.

A design issue must trace to actual implementation and operational effect when treated.

## 9. Content conservation during reconstruction

Never destroy proven product/design behavior merely to obtain a “clean” structure.

For moves/rebuilds:

`inventory proven value → identify target owner/structure → migrate value/behavior → migrate consumers → compare operational/visual behavior → remove old path only after proof`.

## 10. Performance

Review performance when material to the affected path: duplicate calls, expensive render transforms, oversized data loading, inappropriate eager imports, repeated mapping/formatting, inefficient queries, missing pagination/caching semantics, or architectural duplication.

Do not perform speculative micro-optimization that distracts from higher roots.

## 11. Closure for this focus

This focus is not closed merely because code compiles or folders look cleaner. Required material outcomes include correct ownership, correct bindings, no unjustified parallel implementation, preserved intended behavior/design, cleaned stale paths, and verification through the affected runtime/consumers.