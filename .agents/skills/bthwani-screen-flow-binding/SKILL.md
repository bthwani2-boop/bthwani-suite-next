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
- do not block UI closure or normal implementation for lack of screenshots or visual evidence unless final closure, release/store requirements, or explicit escalation rules apply
- do not require long output blocks for normal execution

## Required evidence

- route path
- screen/component path
- service/client path when data-backed
- state coverage
- screenshot or visual evidence requirement (only when final closure, release, or explicit escalation is requested)

## Failure decision

- route missing -> `FIX_REQUIRED`
- data-backed screen without client binding -> `FIX_REQUIRED`
- screenshots missing (only when escalation/release/explicit request applies) -> `NEEDS_VISUAL_EVIDENCE`

## Notes

All operations and scans must obey the token-drain exclusions specified in [LEAN_CODE_BASED_CHECK.md](file:///c:/bthwani-suite-next/governance/LEAN_CODE_BASED_CHECK.md).
