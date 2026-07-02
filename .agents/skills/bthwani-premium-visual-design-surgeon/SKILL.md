---
name: bthwani-premium-visual-design-surgeon
version: 2026.06.25-v1
summary: Perform deep visual dissection, premium 2026 UI execution, and design-system-safe implementation across BThwani DSH/WLT surfaces.
---

# bthwani-premium-visual-design-surgeon

## Purpose

Use this skill to turn any BThwani interface, screen, flow, section, component, or visual state into a premium, modern, RTL-correct, fast, cohesive, design-system-safe experience.

This skill is not a decoration pass. It is a visual surgery skill: it must dissect the current interface, identify visual and behavioral defects, decide the correct ownership, then implement the best available design within the current architecture without creating UI fragmentation.

The result must respect `@bthwani/ui-kit`, service shared ownership, and UI-only surface boundaries.

## Invoke when

Heavy visual surgery mode is not default.
Do not invoke for ordinary UI fixes.

Use only for:
- explicit premium redesign
- visual parity review
- multi-surface visual refactor
- final visual closure
- user-explicit design surgery request

Invoke this skill when the task includes any of the following:

- designing a new interface
- redesigning an existing screen
- extracting visual value from the donor repository
- improving visual hierarchy, density, spacing, typography, colors, cards, tables, filters, banners, carousels, empty states, loading states, or error states
- making a screen feel premium, luxury, modern, intelligent, or 2026-grade
- fixing fragmented UI implementation
- removing raw visual tokens or local design systems
- aligning DSH/WLT surfaces with the BThwani brand and `@bthwani/ui-kit`
- preparing UI work for journey closure

## Must read before execution

Do not read all listed files by default.
Read only the directly relevant files.
Open additional governance/skill/ui-kit/donor files only when needed by the current risk.

Read the relevant files before changing UI:

```text
AGENTS.md
.agents/SKILL_CATALOG.md
.agents/UPDATE_POLICY.md
.agents/skills/bthwani-ui-kit-design-lock/SKILL.md
.agents/skills/bthwani-screen-flow-binding/SKILL.md
.agents/skills/bthwani-legacy-extraction/SKILL.md
.agents/skills/graphify/SKILL.md
governance/11_INTERFACE_BLUEPRINTS.md
shared/ui-kit/evidence/VISUAL_PATTERN_MINING.md
shared/ui-kit/evidence/UI_KIT_EXTRACTION_LEDGER.md
```

When `source_mode` is `DONOR_EXTRACT` or `HYBRID`, also read the canonical donor DSH source path:

```text
C:\bthwani-suite\dsh
```

When the topic touches DSH/WLT finance or payment visibility, also read:

```text
.agents/skills/bthwani-dsh-wlt-finance-boundary/SKILL.md
```

## Repository and ownership boundaries

### DSH frontend brain

The sovereign shared brain for DSH frontend interface logic is:

```text
C:\bthwani-suite-next\services\dsh\frontend\shared
```

This path owns DSH frontend logic that is shared across surfaces, including:

- interface types
- view-models
- controllers
- state mapping
- permission mapping
- API-client adapters when applicable
- transforms
- loading, empty, error, success, blocked, disabled, retry, and offline logic
- DSH topic rules that are neutral across surfaces

### DSH UI-only surfaces

These paths are UI only:

```text
C:\bthwani-suite-next\services\dsh\frontend\control-panel
C:\bthwani-suite-next\services\dsh\frontend\app-partner
C:\bthwani-suite-next\services\dsh\frontend\app-field
C:\bthwani-suite-next\services\dsh\frontend\app-client
C:\bthwani-suite-next\services\dsh\frontend\app-captain
```

Surface paths may render role-specific UI and surface-specific layout, but must not own shared business logic, duplicated state machines, duplicated permission rules, or independent API behavior.

### WLT/DSH frontend brain

The sovereign shared brain for DSH-facing WLT interface logic is:

```text
C:\bthwani-suite-next\services\wlt\frontend\shared\dsh
```

This path owns DSH-facing WLT reference display logic, such as payment status presentation, wallet reference state, refund visibility, settlement reference status, commission reference display, COD reference display, ledger reference display, and financial metadata presentation.

WLT remains the only owner of financial truth. DSH may display WLT references, statuses, and metadata, but must not own financial mutations or financial truth.

## Donor DSH source path

The canonical read-only donor source for DSH visual/interface extraction is:

```text
C:\bthwani-suite\dsh
```

Use this path as the primary donor reference when `source_mode` is `DONOR_EXTRACT` or `HYBRID`, especially for DSH screens, flows, visual behavior, interaction patterns, banners, carousels, cards, tables, filters, states, and surface relationships.

This path is read-only. Do not copy its structure, ownership, stale files, preview/demo/mock truth, or architectural mistakes into the new repository. Extract only the proven visual and behavioral value, then rebuild it inside the correct new ownership:

```text
C:\bthwani-suite-next\services\dsh\frontend\shared
C:\bthwani-suite-next\services\dsh\frontend\control-panel
C:\bthwani-suite-next\services\dsh\frontend\app-partner
C:\bthwani-suite-next\services\dsh\frontend\app-field
C:\bthwani-suite-next\services\dsh\frontend\app-client
C:\bthwani-suite-next\services\dsh\frontend\app-captain
```

## Hard forbidden rules

Do not do any of the following:

- Do not create a local design system inside a surface.
- Do not duplicate reusable Button, Card, Header, Badge, Chip, Tabs, Table, StateView, FilterBar, ActionBar, or layout primitives outside `@bthwani/ui-kit`.
- Do not hardcode random colors, spacing, radius, typography, shadows, or motion values when ui-kit tokens exist.
- Do not use raw visual tokens as a substitute for the design system.
- Do not copy donor screens literally.
- Do not import donor structure, paths, architectural mistakes, stale files, demo data, preview data, or mock truth.
- Do not place shared DSH logic inside a UI-only surface.
- Do not place WLT financial truth inside DSH.
- Do not add visual polish that harms performance, accessibility, RTL correctness, or task completion.
- Do not declare a design closed from a screenshot alone.
- Do not declare premium quality without visual evidence and code verification.

## Required visual dissection

Before implementation, dissect the target interface across these layers:

### 1. Purpose and role clarity

Identify:

- user role
- surface
- business purpose
- primary action
- secondary actions
- expected user decision
- entry points
- exit points
- critical blockers
- success definition

Reject any UI that looks good but does not clarify what the user should do next.

### 2. Information architecture

Inspect:

- title hierarchy
- page or screen framing
- section order
- grouping logic
- card/table/list density
- KPI priority
- CTA priority
- filter/search placement
- empty/error/loading placement
- noisy or unrelated content

The interface must reveal priority instantly.

### 3. Visual hierarchy

Inspect:

- contrast levels
- typography scale
- color emphasis
- spacing rhythm
- icon weight
- surface depth
- primary vs secondary actions
- visual anchors
- scanning path
- Arabic reading flow

No equal-weight chaos. No scattered accents. No decorative clutter.

### 4. Layout rhythm

Inspect:

- safe areas
- gutters
- section spacing
- card spacing
- list row height
- table density
- touch target size
- scroll behavior
- responsive breakpoints
- overflow and clipping

The result must feel calm, spacious enough, and fast to scan.

### 5. Premium 2026 aesthetic layer

Use a restrained premium language:

- confident brand color usage
- refined surfaces
- subtle depth
- controlled gradients only when justified
- precise radius and shadow scale
- polished empty states
- intelligent skeleton loading
- calm micro-interactions
- high-quality status badges
- readable Arabic typography
- clear dark/light behavior if applicable

Premium means: clean, intentional, fast, trustworthy, and low-noise. It does not mean excessive glass, excessive blur, excessive animation, or decorative overload.

### 6. Interaction and motion

Inspect and implement where applicable:

- hover
- pressed
- focused
- disabled
- selected
- expanded
- collapsed
- loading
- success
- failure
- retry
- offline
- permission-denied
- destructive confirmation
- optimistic feedback only when safe

Motion must explain continuity or state change. Decorative motion that slows the user is invalid.

### 7. RTL and Arabic quality

Verify:

- Arabic text aligns right by default.
- Icon-text groups are directionally correct.
- Chevrons and trailing actions are on the correct side.
- Number/currency/status mixed content is readable.
- Rows are not centered unless deliberately justified.
- Tables and filters are practical in RTL.
- Long Arabic labels do not clip or break layout.

### 8. Accessibility

Verify:

- contrast
- readable font size
- semantic labels
- focus visibility
- keyboard behavior on web
- touch target size on mobile
- disabled state clarity
- error explanation clarity
- non-color-only status communication

Accessibility failure is design failure.

### 9. Performance

Verify:

- no unnecessary heavy animations
- no oversized images/assets
- no unbounded lists without virtualization where needed
- no repeated expensive rendering
- no layout jank
- no uncontrolled scroll complexity
- no excessive shadows/blur on low-end devices
- no table or list density that harms usability

A premium UI must feel fast.

## Donor extraction contract

When using the donor repository:

1. Treat the donor as visual and behavioral evidence only.
2. Extract the useful experience, not the old architecture.
3. Preserve what is valuable:
   - flow
   - order
   - layout intent
   - interaction idea
   - banner/carousel/filter/table/card behavior
   - state coverage
   - operational density where useful
4. Reject:
   - dead code
   - stale files
   - preview/demo/mock as runtime truth
   - incorrect ownership
   - noisy visual duplication
   - old path structure
   - direct copy-paste
   - DSH financial truth leakage
5. Rebuild inside the current repository structure only.

Use this decision vocabulary for donor material:

```text
REFERENCE_ONLY
ADAPT_NORMALIZE
REWRITE_FROM_SPEC
MOVE_TO_UI_KIT
MOVE_TO_DSH_SHARED
MOVE_TO_WLT_DSH_SHARED
KEEP_SURFACE_LOCAL
REJECT_DONOR_PATTERN
FIX_REQUIRED
```

## Implementation contract

During implementation:

1. Start from GitHub Remote and current branch state.
2. Confirm target surface and owning service.
3. Run Graphify when ownership, dependency, or duplication is unclear.
4. Inspect existing `@bthwani/ui-kit` exports before creating any component.
5. Use `@bthwani/ui-kit` for reusable tokens, primitives, and patterns.
6. Put shared DSH interface logic in `services\dsh\frontend\shared`.
7. Put DSH-facing WLT reference presentation logic in `services\wlt\frontend\shared\dsh`.
8. Keep each surface UI-only.
9. Add local UI only when it is truly surface-specific and not reusable.
10. Keep the code small, direct, typed, and maintainable.
11. Do not broaden the journey beyond the current topic.
12. Remove or merge duplicate visual implementations when proven safe.

## Required checks

For normal UI implementation:
- run the targeted package typecheck/lint only when available and useful

Do not run all of:
graphify, foundation gate, journey gate, full typecheck, full lint, full test, full build, affected checks, and multiple guards by default.

Use those only when final visual closure or high-risk ownership change requires them.

When DSH/WLT finance boundaries are touched:

```powershell
pnpm run guard:no-financial-mutation-outside-wlt
```

Do not invent commands. If a command is missing, report `COMMAND_NOT_AVAILABLE` and use the closest existing package script or guard after inspecting `package.json`.

## Required visual evidence

Visual evidence/screenshots are required only for explicit visual request, final visual closure, visual parity approval, or release/store visual requirements.
Normal UI work uses code-based validation. Do not block normal implementation because screenshots are absent.
Do not require long output blocks for normal execution.

## Closure checklist

A design journey may close only when all applicable items pass:

- target interface is reachable
- owner path is correct
- DSH shared logic is not duplicated in surfaces
- WLT financial truth does not leak into DSH
- `@bthwani/ui-kit` is respected
- no local design system was introduced
- no raw token drift exists
- no donor code was copied blindly
- all required states are covered
- RTL is correct
- accessibility is acceptable
- performance is not degraded
- screenshots or visual evidence exist (only when escalation, final visual closure, or explicit user request applies)
- checks pass or blockers are explicitly proven
- evidence does not contradict code or guard output

All operations and scans must obey the token-drain exclusions specified in [LEAN_CODE_BASED_CHECK.md](../../../governance/LEAN_CODE_BASED_CHECK.md).

## Failure decisions

Use these exact decisions:

```text
DESIGN_CLOSED
DESIGN_FIX_REQUIRED
NEEDS_VISUAL_EVIDENCE (only when escalation/release/explicit request applies)
BLOCKED_BY_OWNERSHIP
BLOCKED_BY_UI_KIT_VIOLATION
BLOCKED_BY_DSH_WLT_BOUNDARY
BLOCKED_BY_RUNTIME
```

## Output contract

Use this full output template only for explicit design surgery, final visual closure, visual parity approval, or release/store visual review:

```text
skill: bthwani-premium-visual-design-surgeon
topic:
source_mode: DONOR_EXTRACT | NEW_DESIGN | HYBRID
target_service:
target_surfaces:
decision: DESIGN_CLOSED | DESIGN_FIX_REQUIRED | NEEDS_VISUAL_EVIDENCE | BLOCKED_BY_OWNERSHIP | BLOCKED_BY_UI_KIT_VIOLATION | BLOCKED_BY_DSH_WLT_BOUNDARY | BLOCKED_BY_RUNTIME

visual_diagnosis:
- purpose:
- hierarchy:
- layout:
- states:
- rtl:
- accessibility:
- performance:
- premium_2026_quality:

ownership_decisions:
- ui_kit:
- dsh_shared:
- wlt_dsh_shared:
- surface_local:

donor_extraction:
- used:
- rejected:
- reason:

files_changed:
- 

verification:
- command:
- result:

remaining_blockers:
- path:
  problem:
  root_cause:
  required_action:
  verification_command:
```

For normal UI work, output only changed paths, code-based checks used (if any), and remaining risk.

## Quality bar

The final interface must be premium, but not noisy; luxurious, but not heavy; modern, but not trendy in a way that breaks longevity; intelligent, but not complex; visually rich, but governed by `@bthwani/ui-kit`; surface-specific where necessary, but not fragmented; and always closed by evidence, not claims.
