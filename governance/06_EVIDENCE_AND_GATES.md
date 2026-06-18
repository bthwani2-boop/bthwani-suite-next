# 06 — Evidence and Gates

Status: CANONICAL

## No claim without evidence

Forbidden without evidence: PASS, READY, CLOSED, FINAL, 100%, DONE, LOCKED.

## Evidence root

```text
tools/registry/runs/{SESSION_ID}
```

## Minimum evidence

- summary.txt or SUMMARY.md
- evidence.json
- commands.log
- git-status.txt
- diff-check.txt
- _HANDOFF.zip when possible

## Slice closure

A slice cannot close without contract evidence, runtime evidence when behavior exists, typecheck/test evidence when code exists, visual evidence when UI changes, and no preview/demo/mock runtime data.

## Acceptance condition

Accepted only when all closure claims are backed by evidence under `tools/registry/runs`.