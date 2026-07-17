---
name: bthwani-guard-command-router
version: 2026.07.17-v1
summary: Resolve required verification to registered guards, canonical commands, and declared assurance boundaries.
---

# bthwani-guard-command-router

## Purpose

Map a requested claim to the smallest sufficient registered guard set and exact repository commands without inventing scripts or upgrading scoped evidence into runtime or final closure.

## Invoke when

- A task, skill, workflow, or SDLC stage references guards.
- Package scripts, guard registry entries, assurance classes, and source files must be reconciled.
- A verification command is missing, ambiguous, duplicated, or appears to swallow failure.

## Do not invoke when

- No repository guard, check, or verification route is involved.
- The task asks only for an explanation with no repository claim.

## Read before

- `governance/guards/guard-registry.json`
- `governance/guards/guard-assurance.json`
- `tools/guards/guard-manifest.json`
- `package.json`
- applicable workflow files

## Authority boundary

This skill owns guard selection and command resolution only. It cannot grant the approval owned by governance, CI, QA, security, release, product, or the final closure judge. The presence of a guard file is not execution evidence.

## Routing rules

1. Select guards only from the canonical guard registry.
2. Resolve every guard to its package script and source file.
3. Read its assurance class before describing what a pass proves.
4. Use targeted sets by default; full sets require explicit scope or escalation.
5. A fail-level guard command must propagate nonzero exit status.
6. Warn-level tools may report warnings but must not be represented as passed fail-level gates.
7. Runtime claims require runtime evidence in addition to static guards.

## Forbidden

- Inventing script or guard names.
- Running every guard by default.
- Using a deprecated alias or retired guard.
- Treating a static/configuration/regression guard as runtime or closure proof.
- Accepting a fail-level command that catches or suppresses failure.

## Required output

```text
resolved_commit_sha:
requested_claim:
selected_guard_ids:
commands:
assurance_classes:
executed_results:
missing_evidence:
decision:
remaining_gaps:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `PROTOCOL_VIOLATION`.
