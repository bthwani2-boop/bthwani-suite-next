# Gemini Implementer Tool Policy

## Purpose

`gemini-implementer` is the governed external implementation relay for two mutually exclusive delegated routes:

- `Codex orchestrator -> Gemini CLI implementer -> Codex verification`.
- `Claude orchestrator -> Gemini CLI implementer -> Claude verification`.

The current authorized task selects exactly one orchestrator for a work unit. The two routes must never execute the same work unit and must never run Gemini delegation concurrently in the repository. The shared relay lock enforces one active Gemini implementation at a time.

The relay owns no repository authority, product truth, approval, verification decision, commit, push, merge, release, or closure decision.

## Use when

- the current task explicitly selects Codex + Gemini or Claude + Gemini delegated implementation;
- the selected orchestrator has pinned the repository, branch, and candidate head;
- one bounded work unit has explicit allowed write prefixes, forbidden paths, acceptance criteria, and verification commands;
- the working tree is clean before dispatch;
- no other delegated Gemini implementation is active.

## Do not use when

- the task is analysis-only, text-only, or small enough for direct execution;
- the write scope is repository-wide, ambiguous, or not attributable to one work unit;
- the working tree is dirty or the branch moved without reconciliation;
- another delegated implementation is active;
- the work unit is already owned by the other orchestrator route;
- Gemini would need to commit, push, merge, release, approve, or expand scope;
- independent or formal approval is being requested.

## Execution contract

1. Exactly one orchestrator owns each delegated work unit: Codex or Claude.
2. Gemini is implementation-only. Dispatch exactly one Gemini work unit at a time.
3. Codex uses `tools/scripts/invoke-gemini-implementer.mjs`. Claude uses `tools/scripts/invoke-claude-gemini-implementer.mjs`, which reuses the same hardened relay and lock while binding the handoff back to Claude.
4. Start from a clean Git working tree so every Git-visible mutation is attributable to the run.
5. Require at least one repository-relative `--allow-write` prefix. Repository-root write scope is forbidden.
6. Optional `--forbid-write` prefixes narrow the allowed scope further.
7. The relay launches Gemini CLI headlessly with structured JSON output, `auto_edit`, extensions disabled, Agent Skills disabled, and no allowed MCP server.
8. A system-level `BeforeTool` hook allows only bounded repository file reads and `write_file`/`replace` inside the declared write scope. Shell, web, MCP, skill activation, interactive questions, and unknown tools are denied.
9. The relay rejects a changed Git HEAD, a branch mismatch, an out-of-scope changed path, or `git diff --check` failure.
10. Gemini's response and usage statistics are implementation telemetry only. They are not evidence that tests, runtime behavior, or acceptance passed.
11. The selected orchestrator must inspect the complete diff, re-pin the branch/head, run the required project gates, and decide whether rework is required.
12. Codex and Claude must not hand the same work unit to each other or jointly verify it. A new orchestrator requires a new, non-overlapping work unit or an explicit current-task reassignment before execution starts.
13. Protected independent review remains separate; neither orchestrator may substitute for `bthwani-independent-implementation-reviewer` or a formal approval authority.

## Brief requirements

The brief must be self-contained and include:

```text
work_unit_id:
objective:
root_cause_or_current_evidence:
allowed_read_paths:
allowed_write_paths:
forbidden_paths:
invariants:
required_changes:
acceptance:
verification_for_orchestrator:
expected_report:
```

Gemini must stop and report an insufficient-scope condition instead of expanding the write scope.

## Invocation

Codex route:

```text
node tools/scripts/invoke-gemini-implementer.mjs \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --allow-write <repo-relative-prefix> \
  [--allow-write <another-prefix>] \
  [--forbid-write <repo-relative-prefix>] \
  [--model <gemini-model>] \
  [--timeout 45m]
```

Claude route:

```text
node tools/scripts/invoke-claude-gemini-implementer.mjs \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --allow-write <repo-relative-prefix> \
  [--allow-write <another-prefix>] \
  [--forbid-write <repo-relative-prefix>] \
  [--model <gemini-model>] \
  [--timeout 45m]
```

Use `--diagnostic-only` with either entry point to verify that Gemini CLI is installed without dispatching work.

## Evidence boundary

The relay proves only its measured execution envelope: pre-run clean tree, pinned local branch/head, Gemini process outcome, hook enforcement, post-run Git-visible changed paths, unchanged HEAD, scope classification, `git diff --check`, and captured Gemini JSON/usage data.

It does not prove functional correctness, test success, runtime behavior, security, finance, QA, CI, release readiness, production readiness, or final closure.
