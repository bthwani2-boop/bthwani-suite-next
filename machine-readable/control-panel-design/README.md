# Control Panel Design Contracts

Machine-readable contracts for the control panel design system.

## Files

| File | Purpose |
| --- | --- |
| `control_panel_design_skeleton_reference.json` | Shell areas, responsibilities, forbidden patterns, required states |
| `control_panel_section_archetypes.json` | Maps each section to its permitted archetype frames |
| `control_panel_service_ownership_matrix.json` | Service ownership and boundary invariants |
| `control_panel_design_gate.json` | Gate specification for the design guard |

## Guard

The guard at `tools/guards/control-panel-design-gate.mjs` enforces these contracts.

Run with:

```
node tools/guards/control-panel-design-gate.mjs
```

Or via:

```
pnpm run guard:control-panel-design
```

## Key rules

- All control panel screens must use archetypes from `shared/app-shell/src/control-panel/archetypes/`
- No Tamagui direct imports outside `shared/ui-kit`
- No `fetch()` or `axios` inside control panel screens or runtime
- No raw hex colors outside `shared/ui-kit`
- No local design system inside services or apps
- Finance section is READ-ONLY — no mutations outside `services/wlt`
- Ports 8080, 8081, 8082, 8083, 8084, 3000 are forbidden
