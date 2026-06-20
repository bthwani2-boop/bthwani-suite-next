---
name: bthwani-guard-command-router
version: 2026.06.19-clean
summary: Map required checks to actual repository scripts and guard files.
---

# bthwani-guard-command-router

## Invoke when

- a skill references a guard
- package scripts and guard files must be matched
- an agent is about to invent a command

## Read before

`package.json`, `tools/guards/guard-manifest.json`, `tools/guards/*`, `tools/scripts/*`

## Execution contract

Prefer existing scripts from `package.json`. If no script exists, verify the guard file exists before recommending a direct command. State the exact command and why it is required.

## Forbidden

- do not invent script names
- do not run every guard unless the task requires a broad gate
- do not use a guard file as proof unless it was executed or inspected for the requested claim

## Required evidence

- matched script or guard path
- command output or `NEEDS_EVIDENCE`
- affected owner paths

## Failure decision

- guard referenced but missing -> `FIX_REQUIRED`
- no canonical command -> `NEEDS_EVIDENCE`
- guard fails -> `FIX_REQUIRED`

## Notes

No extra notes.
