---
name: bthwani-screen-flow-binding
version: 2026.06.19-clean
summary: Bind routes, screens, view-models, states, and visual evidence.
---

# bthwani-screen-flow-binding

## Invoke when

- screen, navigation, route, tab, flow, CTA, state, or app-surface behavior changes
- a user journey needs proof

## Read before

`governance/09_SLICE_OPERATING_MODEL.md`, screen matrices, app route files, ui-kit contracts, API binding skill when data-backed

## Execution contract

Prove route path, screen owner, service owner, data source, primary CTA, state coverage, RTL, and visual evidence. Bind screen behavior to service/client when needed.

## Forbidden

- no orphan screen
- no route without owner
- no screen-local fake data as closure
- no UI closure without screenshots when visible behavior changes

## Required evidence

- route path
- screen/component path
- service/client path when data-backed
- state coverage
- screenshot or visual evidence requirement

## Failure decision

- route missing -> `FIX_REQUIRED`
- data-backed screen without client binding -> `FIX_REQUIRED`
- screenshots missing -> `NEEDS_VISUAL_EVIDENCE`

## Notes

No extra notes.
