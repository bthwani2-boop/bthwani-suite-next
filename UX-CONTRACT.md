# UX Contract

Status: DERIVED_EXECUTION_MAP

Durable UX/Product/Design authority: `governance/product/EXPERIENCE-AND-DESIGN.md`, `governance/product/PRD.md`, and applicable `governance/product/contracts/*.product-truth.json`.

This file is a **tool-facing/current implementation map**, retained because `premium-ui.json` and UI verification use its capability mapping. `canonicalMap` in that tool configuration means the canonical map for that tool's implementation checks; it does **not** make this file a competing durable Product/System governance authority. If durable semantics conflict, governance wins and this map must be updated.

## Product context

Audience and product jobs come from the durable authorities above. Current supported presentation is Arabic/RTL-first with English/LTR support. Current web accessibility target is WCAG 2.2 AA as owned by the durable experience policy.

## Business-context sources

| Scope | Durable authority | Executable/derived authority |
|---|---|---|
| Platform/surfaces/actors | `governance/product/PRD.md` | live surface/runtime implementation |
| Capability semantics | `governance/product/contracts/*.product-truth.json` | current service/API/data contracts |
| Experience/design | `governance/product/EXPERIENCE-AND-DESIGN.md` | `shared/ui-kit/**` + rendered surfaces |
| Identity/permissions | Product Truth + security policy | current Identity/service contracts/runtime |
| Finance | WLT Product Truth + PRD | current WLT contracts/runtime |

## Visual implementation map

- Runtime shared token/theme owner: `shared/ui-kit/src/tokens`, `shared/ui-kit/src/foundation.ts`, `shared/ui-kit/src/theme`.
- Public adapters: `shared/ui-kit/src/index.ts`, `shared/ui-kit/src/web.ts`, `shared/ui-kit/src/mobile.tsx`.
- Control-panel chrome mapping: `apps/control-panel/runtime/src/styles/cp-css-vars.ts`.
- Tool-facing design adapter: `DESIGN.md`.

## Canonical UI Map

| Capability | Current implementation owner | Durable semantic source | Allowed current variants | Evidence |
|---|---|---|---|---|
| Table Selection | `shared/ui-kit/src/components/DataTable` | capability Product Truth + experience policy | page/all-results only when capability permits | component + keyboard/browser/runtime as applicable |
| Select/Listbox | native web `select` for accepted current fields | experience policy + capability Product Truth | native until an authored shared owner is proven necessary | keyboard/browser selection evidence |
| Date | native web date/time input for accepted current fields | domain date contract + experience policy | native until a typed authored owner is proven necessary | locale/keyboard/browser evidence |
| Form | surface controller/schema + shared field primitives | Product Truth + service validation contract | create/edit according to capability | validation/submit/readback/recovery evidence |
| Scrollbar | shared web root baseline | experience/accessibility policy | bounded local geometry exceptions | computed style + keyboard/scroll evidence |
| Toast/feedback | mounted surface state/live-region owner | Product Truth state + experience policy | success/warning/info/error when truthful | live-region + failure-path evidence |
| CRUD | capability controller + canonical readback | Product Truth write/readback semantics | return/stay per capability | full-flow runtime readback |

## Component behavior map

Interactive owners must expose applicable focus/pressed/selected/disabled/busy/error/recovery states according to the durable experience policy. Current implementation-specific geometry/token details belong in `shared/ui-kit/**`, not here as durable governance.

## Dataset navigation

Current admin data owners declare selection scope, sort, page/page-size and loading/empty/no-results/partial/forbidden/error. URL state is used only when the capability makes state shareable; sensitive/transient values remain local. Mutations require capability-defined confirmation/readback/focus outcome.

## Flow ledger

| Operation | Client responsibility | Canonical outcome |
|---|---|---|
| Create/Edit | preserve safe input, busy/validation/conflict recovery | committed canonical readback |
| Delete | explicit governed confirmation, pessimistic/unknown handling | contract-defined readback |
| Search/Filter | controller-owned debounce/cancel where needed | truthful results/no-results/error |
| Bulk action | explicit selected scope + partial/unknown handling | per-item/batch readback |
| Upload/Job | progress/retry without fabricated completion | owner-backed progress/result |
| Cancel/Back | navigation/draft policy only | no fabricated mutation |

## Navigation, overlays, validation, and async

Implementation follows `governance/product/EXPERIENCE-AND-DESIGN.md` and `governance/policies/frontend-and-client.md`. Product Truth owns destructive-action level, legal state/action semantics and readback. Server/domain contracts own authorization and authoritative validation.

## Migration status

Migration/current-work status is evidence, not governance. The exact candidate diff and current static/runtime checks are the source for current implementation state. No parallel migration registry is maintained here.

## Verification map

Current tool commands include `pnpm guard:ui-kit-boundary`, `pnpm visual:ui-kit:contract`, `pnpm guard:icon-contract`, targeted package typechecks and the premium audit configured by `premium-ui.json` when applicable. Commands are executable evidence mechanisms and may evolve without changing durable UX semantics.

Use browser/device/locale/theme/accessibility/runtime evidence only when material to the affected claim. CRUD or persisted-state closure requires canonical runtime readback; static UI success alone is insufficient.
