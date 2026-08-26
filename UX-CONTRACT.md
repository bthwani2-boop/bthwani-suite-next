# UX Contract

## Product context

- **Audience:** Customer, partner, captain, field worker, and operator surfaces as defined by the product requirements.
- **Primary jobs:** Discovery and purchase; store/order operation; delivery execution; field readiness; governed platform administration.
- **Target market(s):** The active product context is maintained in `governance/product/PRD.md`.
- **Active locales:** Arabic and English; Arabic/RTL is the default for the control panel.
- **Language/content register and native-review policy:** Arabic user-facing copy is explicit and operational; technical identifiers may use the Latin lane. Product Truth owners review domain-specific copy.
- **Timezone/calendar policy:** Use the domain contract and runtime locale; do not infer financial or operational dates from the browser alone.
- **Accessibility target:** WCAG 2.2 AA, including keyboard focus, readable state, semantics, reduced motion, and mobile device constraints.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Product and surface ownership | `governance/product/PRD.md` | Product Truth | 2026-08-25 |
| Capability rules and acceptance | `governance/product/contracts/*.product-truth.json` | Product Truth contracts | 2026-08-25 |
| Identity and permission behavior | `governance/product/contracts/*identity*.product-truth.json` and current Identity contracts | Domain contract | 2026-08-25 |
| Data lifecycle and operational truth | `governance/product/contracts/*.product-truth.json` and DSH service contracts | Domain/API contract | 2026-08-25 |
| Billing and payment | WLT-owned contracts referenced by the active Product Truth | Financial domain contract | 2026-08-25 |

## Visual contract

- **Project `DESIGN.md`:** `DESIGN.md`
- **Token ownership model:** Existing runtime canonical tokens; this document records their product mapping and does not generate tokens.
- **Runtime design-system/token source:** `shared/ui-kit/src/tokens`, `shared/ui-kit/src/foundation.ts`, and `shared/ui-kit/src/theme`.
- **Mapping/export/adapters:** `shared/ui-kit/src/index.ts`, `shared/ui-kit/src/web.ts`, `shared/ui-kit/src/mobile.tsx`, and `apps/control-panel/runtime/src/styles/cp-css-vars.ts`.
- **Token drift gate:** `pnpm guard:ui-kit-boundary` and `pnpm visual:ui-kit:contract`.
- **Supported themes:** Light, dark, and high-contrast theme outputs; control-panel appearance modes are resolved by the shared appearance contract.
- **Design-context owner/review policy:** UI primitives own visual behavior; product/domain owners own truthful state and copy; changes are reviewed against the affected surface cone and exact runtime evidence.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | `shared/ui-kit/src/components/DataTable` | UI-kit component contract plus Product Truth selection scope | page / all-results only when the capability contract permits | component tests + keyboard/browser evidence |
| Select/Listbox | Native web `select` for accepted web fields; shared typed owner when introduced | `DESIGN.md` and surface Product Truth | native only until an authored owner is explicitly added | keyboard + browser popup/selection evidence |
| Date | Native web date/time input for accepted web fields | `DESIGN.md` and domain date contract | native only until a typed/authored owner is explicitly added | locale + keyboard + browser evidence |
| Form | Surface controller/schema with shared field primitives | Product Truth contract and generated API/domain validation | create / edit | `noValidate`, validation, submit/recovery tests |
| Scrollbar | Shared web root baseline; local panes only own geometry | `shared/ui-kit/src/web/root-layout.tsx` | geometry exceptions for bounded rails/workspaces | computed style + keyboard/scroll evidence |
| Toast | Inline/live-region state owners; no generic toast claim without a mounted owner | Surface runtime/controller state | success / warning / info / error | live-region behavior and failure-path evidence |
| CRUD | Capability controller and canonical readback | Product Truth write/readback contract | return / stay per capability | full-flow E2E with exact readback |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | semantic size and intent | tone/contrast change | 2px visible ring | pressed tone | unavailable with explanation where needed | stable geometry, duplicate-submit guard | inline/live-region state |
| Icon button | labeled, compact hit target | tone change | 2px visible ring | pressed tone | disabled with accessible name | stable icon box | inline/live-region state |
| Input | labeled, token field | border/tone change | visible ring and active border | n/a | unavailable only when truthful | pending owner preserves value | inline field error and summary when needed |
| Secret input | masked | same as input | visible ring | n/a | unavailable only when truthful | preserve value unless policy says otherwise | non-secret error text |
| Search | clearable and committed by surface policy | tone change | visible ring | n/a | unavailable only when truthful | debounce/cancel owned by controller | explicit no-results/error state |
| Textarea | bounded intentional resize | border/tone change | visible ring | n/a | unavailable only when truthful | preserve draft | inline error |
| Table/list | explicit loading/empty/error/partial states | row affordance | keyboard row/action focus | selected state | unavailable items explained | stable skeleton/state owner | actionable recovery |

## Dataset navigation

- **Admin tables:** `DataGrid`/`DataTable` owners with explicit selection scope, sort, page, and page size.
- **Exploratory lists:** Surface-specific lists may compose the shared primitives but cannot invent a second selection truth.
- **URL state:** Committed search/filter/sort/page state only when the capability contract makes it shareable; transient or sensitive values remain local.
- **Page size:** Capability default from the current controller/contract; do not silently change server pagination semantics in the UI.
- **Empty/no-results/error/loading treatment:** State owner must distinguish empty, no-results, loading, stale/partial, forbidden, unavailable, and error.
- **Back/scroll restoration:** Preserve route semantics and restore focus to the triggering control where the browser/runtime permits.
- **Selection scope:** Declared by the capability; bulk confirmation, post-action readback, and focus outcome are required for mutations.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create | Explicit capability action | Controller-owned busy state | Contract-defined return/stay | Canonical readback | Inline error + retry/preserve input | Return to trigger or first actionable error | Product Truth contract |
| Edit | Explicit capability action | Controller-owned busy state | Same surface unless contract says otherwise | Canonical readback | Conflict/error recovery | Preserve editor context | Product Truth contract |
| Delete | Explicit destructive confirmation | Pessimistic mutation | Contract-defined list/detail | Canonical readback | Unknown/error remains recoverable | Focus next logical item | Product Truth contract |
| Search | Commit/selection according to surface policy | Debounce/cancel if applicable | Same dataset surface | Results/no-results state | Retry/error state | Preserve search field focus | Surface controller |
| Bulk action | Selected-scope confirmation | Pessimistic batch state | Contract-defined result | Per-item/batch readback | Partial/unknown outcome explicit | Focus result summary | Product Truth contract |
| Upload/background job | Explicit upload or job start | Progress/state owner | Capability-defined detail or queue | Readback/progress evidence | Retry without fabricated success | Return to initiating control | Media/DSH contract |
| Cancel/back | Explicit navigation action | No fabricated mutation | Previous/defined route | No success claim | Preserve unsaved policy | Route focus | Surface navigation contract |

## Navigation and responsive behavior

- **Route document title policy:** Titles describe the current surface and capability; control panel metadata is in its runtime layout.
- **Route error / 403 page behavior:** Render truthful service/permission state and recovery; do not substitute local data.
- **Breadcrumb/tab/route-state policy:** Route and capability state remain canonical; tabs do not become hidden business state.
- **Sidebar/drawer/bottom-sheet transformation:** Web rail and mobile navigation are surface compositions over the shared primitives; direction is logical RTL/LTR.
- **Responsive table strategy:** Bound table scroll to the data region, preserve headers/actions, and provide a readable alternative when width is insufficient.
- **Truncation/full-value access:** Truncated identifiers retain accessible full-value access; secrets are never exposed by convenience UI.
- **Focus restoration and sticky-obstruction policy:** Sticky chrome cannot obscure the active target; restored focus is explicit for overlays and mutations.

## Overlays and feedback

- **Dialog primitive:** `shared/ui-kit/src/components/Dialog` and surface-approved web composition.
- **Destructive confirmation levels:** Product Truth defines the confirmation level; UI cannot weaken it.
- **Toast placement/duration/deduplication:** No generic toast owner is assumed. Use the mounted inline/live-region owner for the surface and deduplicate controller events.
- **Alert/banner scope and persistence:** Alerts explain the current scope and persist only when the contract requires it.
- **Tooltip delay/dismissal:** Use native labels or the shared owner; never hide required action meaning in a tooltip.
- **Unsaved-changes behavior:** Preserve or explicitly discard drafts according to the capability contract.
- **Layer/z-index contract:** Shared z-index roles own modal, drawer, popover, and toast ordering.

## Async and resilience

Mutations are pessimistic unless a Product Truth explicitly permits another model. Duplicate submission is blocked by the controller, retries preserve safe input and correlation, stale requests are cancelled or invalidated, session expiry re-authenticates through Identity, and unknown financial/provider outcomes remain unknown and reconcilable.

## Validation

Validation belongs to the capability schema/controller and the server contract. Web forms declare `noValidate`; errors are inline and summarized when needed, first-invalid focus is preserved, sensitive values are not echoed, and submit recovery does not fabricate success.

## Permission and clipboard

Permission UI follows the current authorization result: hide actions that are not applicable, disable only when an accessible reason is available, and render 403/forbidden state when the capability requires it. Clipboard actions expose truncated previews and never place secrets in a toast.

## Migration status

- **Migration ledger location:** Current affected-slice evidence is the exact candidate diff and the static/runtime checks listed below; no parallel governance registry is introduced.
- **Canonical primitives and owners:** `shared/ui-kit` cross-surface primitives; `cp-css-vars.ts` control-panel chrome composition.
- **Current risk-prioritized slice:** Control-panel legacy CSS alias retirement, shared web focus/scroll/reduced-motion baseline, and UTF-8 source normalization.
- **Legacy import/token enforcement:** `guard:ui-kit-boundary`, visual contract, icon contract, and source search for retired aliases.
- **Rollout/rollback and removal gates:** Remove a legacy path only after all consumers are migrated and exact-candidate static/runtime checks pass; no fallback alias is retained.

## Verification

- **Required static commands:** `pnpm guard:ui-kit-boundary`, `pnpm visual:ui-kit:contract`, `pnpm guard:icon-contract`, targeted package typechecks, and the premium audit configured by `premium-ui.json`.
- **Browser/device/locale/theme matrix:** Web control panel at desktop/narrow widths, Arabic RTL and English LTR, light/dark/high-contrast; native surfaces at supported phone widths and safe areas.
- **Accessibility checks:** Keyboard tab/focus-visible, labels/names, live-region states, reduced motion, and a running `A11Y_RUNTIME_URL` axe surface.
- **Native-language/domain review:** Arabic copy and domain state are reviewed against the Product Truth owner; numeric/technical mixed-script values retain their semantic lane.
- **Component-state/visual regression coverage:** Shared UI-kit visual contract plus rendered state matrix for loading, empty, error, forbidden, partial, busy, and recovery.
- **Canonical sibling flow:** The nearest existing surface owner is used as the comparison sibling; no local parallel pattern is accepted without an explicit contract row.
- **Project audit command/result:** `python .../audit_project.py . --mode strict --config premium-ui.json` on the exact candidate.
- **CRUD full-flow evidence:** Capability-specific runtime readback evidence is required; static success alone is not closure.
- **Failure-path evidence:** Service unavailable, unauthorized/forbidden, validation, conflict, timeout, and partial/unknown outcome paths must be exercised where applicable.
