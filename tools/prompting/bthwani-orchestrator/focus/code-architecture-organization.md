# Focus — Code, Architecture, Repository Organization and UI/UX Implementation

## 1. Purpose

Use this module when the starting lens includes `CODE`, `STRUCTURE`, `DESIGN` or `ALL`. Diagnose implementation quality as part of system meaning, not as isolated style cleanup.

## 2. Architecture and ownership

Inspect materially applicable:

- domain/capability boundaries and canonical owners;
- public/private module boundaries;
- dependency direction and cross-domain leakage;
- duplicated/parallel implementations;
- shared code placement versus feature/domain ownership;
- surface-local business logic that should be canonical/shared;
- unbound backend/frontend code;
- circular/confused ownership;
- controllers/adapters/repositories with mixed responsibilities;
- implementation contradicting product/data/contract ownership.

Fix parent ownership/design causes before mass-moving leaf files.

## 3. Repository structure

For every materially affected folder/module establish as needed:

`owner | responsibility | allowed contents | forbidden contents | public boundary | incoming dependencies | outgoing dependencies | generated artifacts | tests | runtime relation`.

Derive directories from ownership/capability boundaries rather than forcing product meaning into an arbitrary historical tree.

## 4. File placement and contextual naming

Every material file should have:

- identifiable responsibility;
- identifiable domain/context;
- identifiable canonical owner;
- justified location;
- a name that is not ambiguous in path/context.

Names such as `new`, `old`, `temp`, `final`, `copy`, `backup`, `misc`, or context-poor `helpers`, `utils`, `common`, `shared`, `data`, `types` are review signals, not automatic failures.

Do not enforce arbitrary line-count thresholds. Split when a file mixes independent responsibilities, authorities or lifecycles, not merely because it is long.

## 5. Shared-frontend classification

For materially affected shared frontend modules, identify whether they are:

`transport adapter | generated-client wrapper | controller | view-model | state mapper | presentation policy | domain type | state machine | runtime binding`.

Detect and remove unjustified:

`duplicate DTOs | duplicated state/status maps | business rules in presentation code | direct raw transport bypass | local authoritative state machine | shadow financial/business truth`.

Shared does not mean ownerless. A shared module must still have a clear semantic owner and allowed responsibility.

## 6. Dependency/reference proof before move/delete

Trace materially relevant:

`imports | exports | re-exports | callers/callees | routes | navigation/mounting | registries/manifests | API/generated clients | DB/data | runtime/config | tests/CI | package/workspace scripts | governance references`.

Project CI/scripts may be inspected only because they are project consumers/references. They are not an orchestrator execution or validation mechanism.

A move/rename/delete is complete only after rewiring, zero-old-reference/reachability reasoning and affected verification.

## 7. Duplication, dead and stale code

Look for:

- duplicated business rules/state/status mappings;
- duplicate API adapters/contracts/types;
- obsolete compatibility/fallback paths;
- dead screens/routes/features;
- orphan modules/files/directories;
- stale configs/scripts/dependencies;
- generated artifacts in the wrong ownership boundary;
- historical implementations still reachable;
- aliases or re-exports that preserve obsolete authority;
- duplicate write paths or readers that can diverge.

Static unused/orphan output is evidence, not deletion authority. Prove references/runtime relevance first.

## 8. Frontend/backend binding

For affected user/operator actions trace the full vertical slice to real backend/data effect and back to canonical readback.

Reject as final state:

- UI-only feature with fake/local success;
- backend-only feature missing a required surface;
- direct raw API mapping duplicating canonical logic;
- contract change with stale generated/manual consumers;
- divergent status/error/permission interpretations across surfaces;
- local surface state machine creating parallel truth;
- mutation that never refreshes/readbacks canonical state.

## 9. Design and UI/UX correctness

Design is not decoration. Diagnose:

- information architecture/navigation;
- actor goal clarity/action availability;
- state/authority reflected correctly;
- loading/empty/error/denied/disabled/retry/offline/recovery;
- feedback after mutation and later readback;
- handoff/responsibility clarity;
- cross-surface semantic consistency without forcing identical layouts;
- responsive/mobile ergonomics;
- Arabic/RTL behavior where applicable;
- accessibility and interaction semantics;
- design-system/component consistency;
- preservation of correct visual/product value through restructuring.

A UI/design issue must trace to actual implementation and operational effect when treated.

## 10. Mobile-specific lens

When relevant inspect:

`native permissions | deep links | push | maps/location | SecureStore/session | offline/reconnect | build/OTA/EAS/env/runtime transport | physical-device vs emulator proof limits`.

Do not infer production/device correctness from web/static behavior alone.

## 11. Control-panel lens

When relevant inspect:

`route authorization | object authorization | trusted scope | server/client boundary | search isolation | bulk operations | audit/session/error/readback | responsive/RTL/localization/accessibility`.

Visibility/hiding of controls never replaces backend authorization.

## 12. Content conservation during reconstruction

Never destroy proven product/design behavior merely to obtain a cleaner tree.

Use:

`inventory proven value → identify canonical owner/structure → migrate value/behavior → migrate consumers → compare operational/visual behavior → remove old path only after proof`.

## 13. Performance

Review performance only when material to the affected path: duplicate calls, expensive render transforms, oversized data loading, inappropriate eager imports, repeated mapping/formatting, inefficient queries, missing pagination/caching semantics or architectural duplication.

Do not perform speculative micro-optimization while a higher root remains unresolved.

## 14. Closure for this focus

This focus is not closed because code compiles or folders look cleaner. Material closure requires correct ownership/bindings, one justified source of truth, preserved intended behavior/design, removed stale/reachable duplicate paths, correct naming/context/reference integrity and verification through the affected consumers/runtime.