---
name: bthwani-clean-code-guard
version: 2026.06.19-clean
summary: Prevent duplication, dead code, broad refactors, and shallow fixes.
---

# bthwani-clean-code-guard

## Invoke when

- the task asks to clean, refactor, improve, consolidate, or fix quality
- duplicated patterns or dead files are suspected
- a tool proposes a broad rewrite

## Read before

`AGENTS.md`, `governance/08_CLEANUP_AND_DEPRECATION.md`, relevant owners, Graphify when relationships are unclear

## Execution contract

Find the root cause, decide whether to keep, refactor, merge, retire, move to owner, or block. For risky changes, prove references before deletion or movement.

## Forbidden

- no blind global replace
- no broad formatting as a side effect
- no delete/move without reference proof
- no local workaround when owner-level fix is required

## Required evidence

- changed file list
- reference/import/route evidence for deletes or moves
- targeted verification
- rollback note for high-risk cleanup

## Failure decision

- unknown references -> `NEEDS_EVIDENCE`
- unexpected broad diff -> `REVERT_REQUIRED`
- partial cleanup with broken imports -> `FIX_REQUIRED`

## Notes

No extra notes.
