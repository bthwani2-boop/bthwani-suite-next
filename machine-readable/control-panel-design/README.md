# Control Panel Design Contracts

Machine-readable contracts for the control panel design system.

## Why this directory exists

These contracts serve as the single source of truth for how the control panel is architected before any DSH or WLT slices are implemented. They prevent:
- Design drift between slices (each slice inventing its own shell)
- Local design systems forming inside services
- Direct Tamagui usage outside ui-kit
- Financial mutations leaking into DSH
- Mobile shell being created prematurely

## Files

| File | Purpose |
| --- | --- |
| `control_panel_app_shell_audit.json` | Classification of every file in shared/app-shell/src — decision, action, risk |
| `control_panel_design_skeleton_reference.json` | Shell areas, responsibilities, forbidden patterns, required states |
| `control_panel_section_archetypes.json` | Maps each section to its permitted archetype frames |
| `control_panel_service_ownership_matrix.json` | Service ownership and boundary invariants |
| `control_panel_design_gate.json` | Gate specification for the design guard |

## How to use before implementing DSH control-panel slices

1. Read `control_panel_section_archetypes.json` to find which frame to use for each section.
2. Read `control_panel_service_ownership_matrix.json` to understand what your service owns vs what the shell owns.
3. Import frames from `@bthwani/app-shell` — do not build your own shell.
4. Use `@bthwani/ui-kit` public exports for all visual components.
5. Run `pnpm run guard:app-shell-control-panel` before committing.

## Why mobile shell is out of scope now

`shared/app-shell/src/mobile` does **not exist** and must **not be created** in the current phase.

Mobile surfaces (app-client, app-partner, app-captain, app-field) each have their own independent navigation and layout. No proven shared pattern or duplication exists yet that justifies an abstracted mobile shell.

Mobile shell will be created only when:
- A separate task named `MOBILE_APP_SHELL_ALIGNMENT` is approved
- Evidence of real duplication across 2+ mobile surfaces is documented

## Why ui-kit must not be inflated

`shared/ui-kit` already exports: Screen, Header, Toolbar, FilterBar, Card, DataTable, StateView, LoadingState, EmptyState, ErrorState, PermissionState, OfflineState, ActionBar, Badge, Chip, Tabs, Dialog, Sheet, Surface, Text, Button, IconButton, AppHeader, BottomNavBar.

These cover all current needs. New ui-kit components are only added when:
1. A genuine gap is identified that cannot be composed from existing components
2. The gap is a generic visual primitive (not control-panel specific)
3. The addition is exported from the public index
4. Typecheck passes

## Guard

Run with:

```
pnpm run guard:app-shell-control-panel
```

Or equivalently:

```
pnpm run control-panel:design-gate
```
