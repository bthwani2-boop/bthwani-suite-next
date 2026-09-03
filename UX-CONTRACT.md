# UX Contract

Status: DERIVED_EXECUTION_MAP

Primary durable UX/Product/Design truth inputs: `governance/product/EXPERIENCE-AND-DESIGN.md`, `governance/product/PRD.md`, and applicable `governance/product/CAPABILITIES.md`.

This file is a **tool-facing/current implementation map** retained because UI verification tooling uses its capability mapping. It is not a durable Product/System authority and does not certify the truth of the governance inputs it references. On branch `h`, material semantics are reconciled under the canonical orchestrator from current human intent, required Product/System truth, live data/contracts/runtime evidence and applicable durable governance inputs. Contradictions are findings; they are not resolved by a blanket "governance wins" rule.

## Product context

Current durable evidence supports Arabic/RTL-first presentation with English/LTR support. The current web accessibility target represented by the experience inputs is WCAG 2.2 AA. Both statements remain subject to the orchestrator's truth-reconciliation and live implementation verification rather than self-certification by this map.

## Business-context inputs and executable evidence

| Scope | Durable truth input | Executable/current evidence |
|---|---|---|
| Platform/surfaces/actors | `governance/product/PRD.md` | live surface/runtime implementation |
| Capability semantics | `governance/product/CAPABILITIES.md` | current service/API/data contracts and persisted behavior |
| Experience/design | `governance/product/EXPERIENCE-AND-DESIGN.md` | `shared/ui-kit/**` + rendered surfaces |
| Identity/permissions | Capability governance + security inputs | current Identity/service contracts/runtime |
| Finance | `governance/product/FINANCIAL-MODEL.md` + PRD inputs | current WLT contracts/runtime/data |

No row grants automatic authority to a document or current path. Material conflicts must be reconciled at the proven canonical owner.

## Visual implementation map

- Current shared token/theme implementation: `shared/ui-kit/src/tokens`, `shared/ui-kit/src/foundation.ts`, `shared/ui-kit/src/theme`.
- Current public adapters: `shared/ui-kit/src/index.ts`, `shared/ui-kit/src/web.ts`, `shared/ui-kit/src/mobile.tsx`.
- Current control-panel chrome mapping: `apps/control-panel/runtime/src/styles/cp-css-vars.ts`.
- Tool-facing design adapter: `DESIGN.md`.

These paths are current evidence, not preservation constraints; Stage A may rehome/refound them if a higher canonical owner or topology is proven.

## Current UI map

| Capability | Current implementation owner | Semantic input | Allowed current variants | Evidence |
|---|---|---|---|---|
| Table Selection | `shared/ui-kit/src/components/DataTable` | capability governance + experience input | page/all-results only when reconciled capability semantics permit | component + keyboard/browser/runtime as applicable |
| Select/Listbox | native web `select` for accepted current fields | experience input + capability governance | native until an authored shared owner is proven necessary | keyboard/browser selection evidence |
| Date | native web date/time input for accepted current fields | domain date contract + experience input | native until a typed authored owner is proven necessary | locale/keyboard/browser evidence |
| Form | surface controller/schema + shared field primitives | reconciled capability governance + service validation contract | create/edit according to capability | validation/submit/readback/recovery evidence |
| Scrollbar | shared web root baseline | experience/accessibility input | bounded local geometry exceptions | computed style + keyboard/scroll evidence |
| Toast/feedback | mounted surface state/live-region owner | reconciled state semantics + experience input | success/warning/info/error when truthful | live-region + failure-path evidence |
| CRUD | capability controller + canonical readback | reconciled write/readback semantics | return/stay per capability | full-flow runtime readback |

## Component behavior map

Interactive owners must expose materially applicable focus/pressed/selected/disabled/busy/error/recovery states. Current implementation-specific geometry/token details belong in their executable owner, not here as durable governance.

## Dataset navigation

Current admin data owners declare selection scope, sort, page/page-size and loading/empty/no-results/partial/forbidden/error. URL state is used only when the capability makes state shareable; sensitive/transient values remain local. Mutations require reconciled capability semantics, canonical write authority and readback.

## Flow map

| Operation | Client responsibility | Required outcome |
|---|---|---|
| Create/Edit | preserve safe input, busy/validation/conflict recovery | committed canonical readback |
| Delete | explicit governed confirmation, pessimistic/unknown handling | contract-defined canonical readback |
| Search/Filter | controller-owned debounce/cancel where needed | truthful results/no-results/error |
| Bulk action | explicit selected scope + partial/unknown handling | per-item/batch readback |
| Upload/Job | progress/retry without fabricated completion | owner-backed progress/result |
| Cancel/Back | navigation/draft policy only | no fabricated mutation |

## Navigation, overlays, validation and async

`governance/product/EXPERIENCE-AND-DESIGN.md` and `governance/policies/frontend-and-client.md` are durable inputs, not automatic execution authority. Server/domain contracts and runtime behavior must prove authorization, authoritative validation and persisted outcomes where material. UX compensation must not hide a broken higher domain/data/contract root.

## Migration status

Migration/current-work status is evidence, not governance. Exact live `h`, material diffs, reachability and current static/runtime checks determine implementation state. No parallel migration registry is maintained here.

## Verification map

Current evidence mechanisms include `pnpm guard:ui-kit-boundary`, `pnpm visual:ui-kit:contract`, `pnpm guard:icon-contract`, targeted typechecks, and rendered/browser/device checks when the claim requires them. Commands may evolve without changing required Product meaning.

CRUD or persisted-state closure requires canonical runtime readback; source/static UI success alone is insufficient. This file cannot emit a Stage-A pass, root closure or repository completion claim.
