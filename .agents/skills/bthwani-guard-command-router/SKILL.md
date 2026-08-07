---
name: bthwani-guard-command-router
version: 2026.08.08-v2
summary: Resolve required verification to registered guards, canonical guard sets, exact commands, and declared assurance boundaries.
---

# bthwani-guard-command-router

## Purpose

Map a requested claim to the smallest sufficient registered guard set and exact repository commands without inventing scripts or upgrading scoped evidence into runtime or final closure.

## Invoke when

- A task, skill, workflow, or SDLC stage references guards.
- Package scripts, guard registry entries, guard sets, assurance classes, and source files must be reconciled.
- A verification command is missing, ambiguous, duplicated, or appears to swallow failure.

## Do not invoke when

- No repository guard, check, or verification route is involved.
- The task asks only for an explanation with no repository claim.

## Read before

- `governance/guards/guard-registry.json`
- `governance/guards/guard-assurance.json`
- `governance/guards/guard-sets.json`
- `package.json`
- applicable workflow files

## Authority boundary

This skill owns guard selection and command resolution only. It cannot grant approval owned by governance, CI, QA, security, release, product, finance, production, or the final closure judge. The presence of a guard file or a guard-set membership is not execution evidence.

## Routing rules

1. Select guards only from the canonical guard registry and registered guard sets.
2. Resolve every executable guard to its package command or explicitly registered executable source.
3. Read its assurance class before describing what a pass proves.
4. Use targeted sets by default; full sets require explicit scope or evidence-driven escalation.
5. A fail-level guard command must propagate nonzero exit status.
6. Warn-level diagnostics may report findings but must not be represented as passed fail-level gates.
7. Runtime claims require runtime evidence in addition to static guards.
8. A guard that lacks a declared assurance boundary must be treated as `NEEDS_EVIDENCE` for any claim beyond its direct output until the contract is repaired.

## Forbidden

- Inventing script or guard names.
- Running every guard by default.
- Using a deprecated alias or retired guard.
- Treating a static/configuration/regression guard as runtime or closure proof.
- Accepting a fail-level command that catches or suppresses failure.
- Treating `tools/guards/` implementation files as governance authority.

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
