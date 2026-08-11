# Gemini Implementer Tool Policy

## Purpose

`gemini-implementer` is the governed external implementation relay for the repository's default delegated route:

`Codex orchestrator -> Gemini CLI implementer -> Codex verification`.

It owns no repository authority, product truth, approval, verification decision, commit, push, merge, release, or closure decision.

## Use when

- the current task explicitly uses delegated implementation;
- Codex has already pinned the repository, branch, and candidate head;
- one bounded work unit has explicit allowed write prefixes, forbidden paths, acceptance criteria, and verification commands;
- the working tree is clean before dispatch;
- no other delegated implementer is active in the same working tree.

## Do not use when

- the task is analysis-only, text-only, or small enough for direct execution;
- the write scope is repository-wide, ambiguous, or not attributable to one work unit;
- the working tree is dirty or the branch moved without reconciliation;
- another delegated implementation is active;
- Gemini would need to commit, push, merge, release, approve, or expand scope;
- independent or formal approval is being requested.

## Execution contract

1. Codex remains the orchestrator. Gemini is implementation-only.
2. Dispatch exactly one work unit at a time. Parallel Gemini runs are forbidden for this route.
3. Start from a clean Git working tree so every Git-visible mutation is attributable to the run.
4. Require at least one repository-relative `--allow-write` prefix. Repository-root write scope is forbidden.
5. Optional `--forbid-write` prefixes narrow the allowed scope further.
6. The relay launches Gemini CLI headlessly with structured JSON output, `auto_edit`, extensions disabled, Agent Skills disabled, and no allowed MCP server.
7. A system-level `BeforeTool` hook allows only bounded repository file reads and `write_file`/`replace` inside the declared write scope. Shell, web, MCP, skill activation, interactive questions, and unknown tools are denied.
8. The relay rejects a changed Git HEAD, a branch mismatch, an out-of-scope changed path, or `git diff --check` failure.
9. Gemini's response and usage statistics are implementation telemetry only. They are not evidence that tests, runtime behavior, or acceptance passed.
10. Codex must inspect the complete diff, re-pin the branch/head, run the required project gates, and decide whether rework is required.
11. If protected independent review is required, Codex cannot substitute for `bthwani-independent-implementation-reviewer` or any formal approval authority.

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
verification_for_codex:
expected_report:
```

Gemini must stop and report an insufficient-scope condition instead of expanding the write scope.

## Invocation

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

Use `--diagnostic-only` to verify that the Gemini CLI is installed without dispatching work.

## Evidence boundary

The relay proves only its measured execution envelope: pre-run clean tree, pinned local branch/head, Gemini process outcome, hook enforcement, post-run Git-visible changed paths, unchanged HEAD, scope classification, `git diff --check`, and captured Gemini JSON/usage data.

It does not prove functional correctness, test success, runtime behavior, security, finance, QA, CI, release readiness, production readiness, or final closure.
