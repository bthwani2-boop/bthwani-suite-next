---
name: bthwani-agent-handoff-evidence-pack
version: 2026.06.19-clean
summary: Create or review evidence packs under tools/registry/runs.
---

# bthwani-agent-handoff-evidence-pack

## Invoke when

- user explicitly asks for evidence pack / handoff artifact
- final PR/merge/release review needs a portable proof bundle
- high-risk change requires reviewable artifacts

## Read before

`AGENTS.md`, `governance/06_EVIDENCE_AND_GATES.md`, current run folder

## Execution contract

Create a session folder under `tools/registry/runs/{SESSION_ID}` with summary, command log, Git status, diff check, and `_HANDOFF.zip` when practical.
Do not invoke for normal implementation.
Do not create tools/registry/runs output by default.

## Forbidden

- do not store secrets in evidence
- do not overwrite unrelated runs
- do not claim the evidence proves more than it contains

## Required evidence

Required only when this skill is explicitly invoked.

## Failure decision

- missing handoff for review-heavy task -> `NEEDS_EVIDENCE`
- evidence contains secrets -> `BLOCKED_SECURITY_RISK`
- command failed -> `FIX_REQUIRED`

## Notes

No extra notes.
