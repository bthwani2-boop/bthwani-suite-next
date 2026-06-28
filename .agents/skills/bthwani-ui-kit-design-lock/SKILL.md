---
name: bthwani-ui-kit-design-lock
version: 2026.06.25-boundary-closure
summary: Enforce shared/ui-kit ownership, brand lock, and no local design systems.
---

# bthwani-ui-kit-design-lock

## Invoke when

- work touches UI components, tokens, themes, app screens, visual states, Tamagui usage, or reusable UI patterns
- a donor visual pattern is being rebuilt
- any file imports from `@bthwani/ui-kit`, `@bthwani/app-shell`, or `@bthwani/control-panel`

## Ownership model (post-boundary-closure 2026-06-25)

| What | Lives in |
| --- | --- |
| Tokens, theme, design components (Button, Card, Text, DataTable…) | `shared/ui-kit` — public API only |
| Tamagui provider + config | `shared/ui-kit` internals only |
| App shell (AppHeader, BottomNavBar) | `apps/app-client/runtime/src/shell/` |
| CP shell (ControlPanelShell, page frames, PaginationToolbar) | `apps/control-panel/runtime/src/shell/` via `@bthwani/control-panel/shell` |
| Cp* primitives (CpButton, CpTable, CpKpiCard…) | `apps/control-panel/runtime/src/components/` via `@bthwani/control-panel/components` |
| Auth runtime (useIdentitySession, loginIdentity…) | `@bthwani/core-identity` only |
| Domain screens (AuthLoginCard, StoreFront, StoreHero) | `services/dsh/frontend/` — not re-exported from ui-kit |
| `shared/app-shell` | Contracts only — no visual, no auth, no Tamagui |

## Read before

`governance/03_UI_KIT_AND_BRAND_LOCK.md`, `shared/ui-kit/src/index.ts`, relevant app/surface files

## Execution contract

`shared/ui-kit` exports only design-system primitives and tokens. Screens and shell components consume public exports from their respective owners. Validate brand colors, RTL, states, spacing, and no local reusable visual framework.

## Forbidden

- Tamagui imports outside `shared/ui-kit` internals
- Cp* in `shared/ui-kit` — run `no-cp-primitives-in-ui-kit` guard
- AppHeader / BottomNavBar imported from `@bthwani/ui-kit`
- AuthLoginCard / StoreFront / StoreHero imported from `@bthwani/ui-kit`
- Deep ui-kit imports (`@bthwani/ui-kit/...` or `shared/ui-kit/src/...`)
- Auth runtime symbols in `shared/app-shell`
- Local Button/Card/Header systems in apps or services
- Raw hex colors outside `shared/ui-kit`
- do not block UI closure or normal implementation for lack of screenshots or visual evidence unless final closure, release/store requirements, or explicit escalation rules apply
- do not require long output blocks for normal execution

## Required evidence

- changed UI paths
- ui-kit public export evidence (confirm symbols exist in `src/index.ts`)
- guard output: `pnpm --filter @bthwani/ui-kit lint` (or relevant code-based lint/guard command)
- visual evidence or `NEEDS_VISUAL_EVIDENCE` (only when final closure, release, or explicit escalation is requested)

## Failure decision

- Cp* found in ui-kit → `FIX_REQUIRED`
- local design system added → `FIX_REQUIRED`
- visual evidence missing (only when escalation/release/explicit request applies) -> `NEEDS_VISUAL_EVIDENCE`
- reusable pattern outside correct owner → `FIX_REQUIRED`
- auth runtime in app-shell → `FIX_REQUIRED`

## Notes

All operations and scans must obey the token-drain exclusions specified in [LEAN_CODE_BASED_CHECK.md](file:///c:/bthwani-suite-next/governance/LEAN_CODE_BASED_CHECK.md).
