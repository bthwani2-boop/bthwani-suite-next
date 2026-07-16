---
name: bthwani-foundation-execution
version: 2026.06.19-clean
summary: Execute foundation journey work against governance and guard baseline.
---

# bthwani-foundation-execution

## Invoke when

- work touches repository skeleton, governance, toolchain, package metadata, basic guards, or foundation journey evidence
- current stage is foundation closure

## Read before

`README.md`, `package.json`, `governance/00_DECISION_INDEX.md`, `governance/09_JOURNEY_OPERATING_MODEL.md`, `governance/10_TOOLCHAIN_VERSION_LOCK.md`

## Execution contract

Map the requested work to a foundation journey, verify canonical owner, avoid expanding into service implementation unless the journey requires it, and run the relevant foundation gate.

## Forbidden

- do not claim product runtime from foundation-only files
- do not introduce service behavior without a journey
- do not alter locked toolchain versions casually

## Required evidence

- touched foundation paths
- package metadata evidence if changed
- foundation gate output when relevant
- Git diff checks

## Failure decision

- journey not declared -> `BLOCKED_NEEDS_BLUEPRINT`
- toolchain drift -> `FIX_REQUIRED`
- foundation gate missing when required -> `NEEDS_EVIDENCE`

## Notes

No extra notes.
