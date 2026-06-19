---
name: bthwani-ui-kit-design-lock
version: 2026.06.19-clean
summary: Enforce shared/ui-kit ownership, brand lock, and no local design systems.
---

# bthwani-ui-kit-design-lock

## Invoke when

- work touches UI components, tokens, themes, app screens, visual states, Tamagui usage, or reusable UI patterns
- a donor visual pattern is being rebuilt

## Read before

`governance/03_UI_KIT_AND_BRAND_LOCK.md`, `shared/ui-kit`, relevant app/surface files, machine-readable screen matrices when relevant

## Execution contract

Reusable UI belongs in `shared/ui-kit`. Screens consume public exports. Validate brand colors, RTL, states, spacing, and no local reusable visual framework.

## Forbidden

- no direct Tamagui outside approved ui-kit internals
- no local Button/Card/Header systems
- no random raw color drift
- no deep ui-kit imports
- no UI closure without visual evidence

## Required evidence

- changed UI paths
- ui-kit public export evidence
- visual evidence or `NEEDS_VISUAL_EVIDENCE`
- targeted guard output when applicable

## Failure decision

- local design system added -> `FIX_REQUIRED`
- visual evidence missing -> `NEEDS_VISUAL_EVIDENCE`
- reusable pattern outside ui-kit -> `FIX_REQUIRED`

## Notes

No extra notes.
