---
name: bthwani-evidence-gate-router
version: 2026.06.19-clean
summary: Choose the smallest sufficient verification gate for the task.
---

# bthwani-evidence-gate-router

## Invoke when

- any task asks for PASS, closure, readiness, verification, or review
- an agent is unsure which checks to run
- a task risks over-running heavy commands

## Read before

`AGENTS.md`, `.agents/EVIDENCE_GATE_ROUTER.md`, relevant `package.json` scripts

## Execution contract

Classify the task as LOW, MEDIUM, UI, API, RUNTIME, HIGH, or CRITICAL. Select only the evidence required for that classification. Escalate only when file ownership or runtime behavior requires it.

## Forbidden

- do not run broad verification for text-only changes
- do not claim closure from a tool summary
- do not skip visual evidence for UI behavior

## Required evidence

- selected gate
- commands used
- pass/fail output
- explicit missing evidence when incomplete

## Failure decision

- insufficient evidence -> `NEEDS_EVIDENCE`
- visual evidence missing -> `NEEDS_VISUAL_EVIDENCE`
- failed gate -> `FIX_REQUIRED`

## Notes

No extra notes.
