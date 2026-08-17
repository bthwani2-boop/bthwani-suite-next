# Focus — Code, Architecture, Repository Organization and UI/UX

## 1. Purpose

Apply this module for `CODE`, `STRUCTURE`, `DESIGN` or `ALL`. Diagnose implementation quality as part of system meaning, not isolated style cleanup.

## 2. Architecture and ownership

Inspect materially applicable domain/capability boundaries, canonical owners, public/private module boundaries, dependency direction, cross-domain leakage, parallel implementations, shared-vs-feature placement, surface-local business logic, unbound frontend/backend code, circular/confused ownership and components with mixed responsibilities.

Fix parent ownership/design causes before mass-moving leaf files.

## 3. Repository structure

For affected folders/modules establish as needed:

`owner | responsibility | allowed contents | forbidden contents | public boundary | incoming dependencies | outgoing dependencies | generated artifacts | tests | runtime relation`.

Derive directories from ownership/capability boundaries rather than forcing meaning into an arbitrary historical tree.

## 4. Placement, naming and discoverability

Every material file should have identifiable responsibility, domain/context, canonical owner, justified location and non-ambiguous name.

`new | old | temp | final | copy | backup | misc | helpers | utils | common | shared | data | types` are review signals, not automatic failures.

Do not enforce arbitrary line-count thresholds. Split when responsibilities, authorities or lifecycles are genuinely independent.

A new engineer/agent should be able to locate the canonical implementation/contract/config/runtime path without choosing between multiple plausible legacy aliases or duplicate commands. Navigation ambiguity that can redirect maintenance to the wrong authority is a structural defect.

## 5. Shared-frontend classification

Classify affected shared frontend modules as:

`transport adapter | generated-client wrapper | controller | view-model | state mapper | presentation policy | domain type | state machine | runtime binding`.

Detect unjustified duplicate DTOs, status maps, business rules in presentation code, raw transport bypass, local authoritative state machines and shadow financial/business truth.

Shared does not mean ownerless.

## 6. Dependency/reference proof before move/delete

Trace materially relevant imports/exports/re-exports, callers/callees, routes/navigation, registries/manifests, API/generated clients, DB/data, runtime/config, tests/CI, workspace scripts and governance references.

A move/rename/delete is complete only after rewiring, zero-old-reference/reachability reasoning and affected verification.

## 7. Duplication, dead and stale code

Look for duplicated business rules/state mappings/API adapters/contracts/types, obsolete compatibility/fallback paths, dead screens/routes/features, orphan modules/directories, stale configs/scripts/dependencies, wrongly owned generated artifacts, reachable historical implementations, aliases preserving obsolete authority and duplicate write/read paths.

Static unused/orphan output is evidence, not deletion authority.

## 8. Frontend/backend binding

For affected actions trace full vertical effect to backend/data and canonical readback.

Reject final states with UI-only fake/local success, backend-only feature missing required surface, direct raw API logic duplicating canonical rules, contract change with stale consumers, divergent state/error/permission meaning, local surface state machine or mutation without canonical refresh/readback.

## 9. Design and UI/UX correctness

Diagnose information architecture/navigation, actor goal clarity, action availability, state/authority representation, loading/empty/error/denied/disabled/retry/offline/recovery, mutation feedback/readback, handoff clarity, cross-surface semantic consistency, responsive/mobile ergonomics, Arabic/RTL, accessibility, localization and design-system/component consistency.

Do not destroy proven product/design behavior merely to obtain a cleaner tree.

## 10. Mobile-specific lens

When relevant inspect native permissions, deep links, push, maps/location, SecureStore/session, offline/reconnect, build/OTA/EAS/env/runtime transport and physical-device vs emulator proof limits.

## 11. Control-panel lens

When relevant inspect route/object authorization, trusted scope, server/client boundary, search isolation, bulk operations, audit/session/error/readback, responsive/RTL/localization/accessibility.

Visibility never replaces backend authorization.

## 12. Content conservation

`inventory proven value → identify canonical owner/structure → migrate value/behavior → migrate consumers → compare operational/visual behavior → remove old path only after proof`.

## 13. Performance

Review product-code performance when material: duplicate calls, expensive render transforms, oversized loading, inappropriate eager imports, repeated mapping/formatting, inefficient queries and missing pagination/cache semantics.

Engineering control-path/toolchain performance is owned by `focus/data-contracts-runtime-security-quality.md`.

## 14. Closure for this focus

Compilation or a cleaner folder tree is insufficient. Material closure requires correct ownership/bindings, one justified source of truth, preserved intended behavior/design, removed stale reachable duplicates, correct naming/context/discoverability and verification through affected consumers/runtime.
