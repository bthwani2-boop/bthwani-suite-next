---
name: bthwani-evidence-gate-router
version: 2026.06.19-clean
summary: Choose the smallest sufficient verification gate for the task.
---

# bthwani-evidence-gate-router

## Invoke when

- user asks for closure/readiness/verification level
- task is high-risk
- agent is unsure whether escalation is required

## Read before

`AGENTS.md`, `.agents/EVIDENCE_GATE_ROUTER.md`, relevant `package.json` scripts

## Execution contract

Prefer CODE_BASED_LEAN. Select the smallest useful code-based check. Escalate only when risk requires it.

## Forbidden

- do not run broad verification for text-only changes
- do not claim closure from a tool summary
- do not skip visual evidence for UI behavior

## Required output

- selected mode: CODE_BASED_LEAN or ESCALATED
- targeted check if used
- remaining risk

Evidence files are required only when escalation applies.

## Failure decision

- insufficient evidence -> `NEEDS_EVIDENCE`
- visual evidence missing -> `NEEDS_VISUAL_EVIDENCE`
- failed gate -> `FIX_REQUIRED`

## Notes

No extra notes.
