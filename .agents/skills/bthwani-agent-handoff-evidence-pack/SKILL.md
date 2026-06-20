---
name: bthwani-agent-handoff-evidence-pack
version: 2026.06.19-clean
summary: Create or review evidence packs under tools/registry/runs.
---

# bthwani-agent-handoff-evidence-pack

## Invoke when

- a task needs reviewable evidence
- a script changes agent files
- a larger slice needs handoff ZIP
- the user needs a compact upload artifact

## Read before

`AGENTS.md`, `governance/06_EVIDENCE_AND_GATES.md`, current run folder

## Execution contract

Create a session folder under `tools/registry/runs/{SESSION_ID}` with summary, command log, Git status, diff check, and `_HANDOFF.zip` when practical.

## Forbidden

- do not store secrets in evidence
- do not overwrite unrelated runs
- do not claim the evidence proves more than it contains

## Required evidence

- `summary.txt` or `SUMMARY.md`
- `evidence.json` when practical
- `git-status.txt`
- `diff-check.txt`
- `_HANDOFF.zip` when practical

## Failure decision

- missing handoff for review-heavy task -> `NEEDS_EVIDENCE`
- evidence contains secrets -> `BLOCKED_SECURITY_RISK`
- command failed -> `FIX_REQUIRED`

## Notes

No extra notes.
