# Antigravity Implementer Tool Policy

## Purpose

`antigravity-implementer` is the governed external implementation relay for two mutually exclusive routes:

- `Codex orchestrator -> Antigravity CLI (agy) implementer with a Gemini model -> Codex verification`.
- `Claude orchestrator -> Antigravity CLI (agy) implementer with a Gemini model -> Claude verification`.

Exactly one orchestrator owns a work unit. The routes never share a work unit and never run delegated Antigravity implementations concurrently. The relay owns no repository authority, product truth, approval, verification decision, commit, push, merge, release, or closure decision.

## Use when

- the current task explicitly selects Codex + Google or Claude + Google delegated implementation;
- the selected orchestrator pins repository, branch, and candidate head;
- one bounded work unit has explicit allowed write prefixes, forbidden paths, acceptance criteria, and verification commands;
- the working tree is clean;
- no delegated Antigravity implementation is active;
- an explicit Gemini model returned by `agy models` is selected.

## Do not use when

- the task is analysis-only, text-only, or small enough for direct execution;
- write scope is repository-wide, ambiguous, or not attributable to one work unit;
- the worktree is dirty or branch movement has not been reconciled;
- another delegated implementation is active;
- the work unit belongs to the other orchestrator route;
- Antigravity would need to commit, push, merge, release, approve, or expand scope;
- formal or independent approval is being requested.

## Execution contract

1. Exactly one orchestrator owns each work unit: Codex or Claude.
2. Antigravity CLI (`agy`) is implementation-only and must use the explicitly supplied Gemini model.
3. Codex invokes `tools/scripts/invoke-antigravity-implementer.mjs --orchestrator codex`. Claude invokes `tools/scripts/invoke-claude-antigravity-implementer.mjs`.
4. Authentication is the local Antigravity CLI session backed by the user's subscription. The relay accepts no API-key argument and does not inject API credentials.
5. The relay verifies `agy --version` and `agy models` before dispatch.
6. Start from a clean Git working tree and require at least one repository-relative `--allow-write` prefix. Repository-root write scope is forbidden.
7. The relay creates a temporary workspace `.agents/hooks.json` only for the duration of the run and refuses to overwrite an existing hook file.
8. The Antigravity `PreToolUse` hook matches every tool. It allows only repository-scoped `view_file`, `list_dir`, `grep_search`, `find_by_name`, `write_to_file`, `replace_file_content`, and `multi_replace_file_content`. Shell, web, browser, permission, task, schedule, media, MCP, interactive-question, and subagent tools are denied by default.
9. Writes are limited to declared prefixes and cannot touch `.git`, governance, adapters, agent control files, or delegation scripts. Symlink traversal is denied.
10. The relay launches headless print mode with structured JSON and `--mode=accept-edits`; the hook remains the fail-closed write boundary.
11. After exit, the relay verifies hook integrity/removal, unchanged branch and HEAD, changed-path scope, and `git diff --check`.
12. Antigravity output is telemetry only. The selected orchestrator must inspect the complete diff, re-pin the branch/head, run required project gates, and decide rework or developer PASS.
13. Neither Codex nor Claude may substitute for protected independent review or a formal approval authority.

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

Antigravity must stop and report insufficient scope instead of expanding it.

## Invocation

Codex route:

```text
node tools/scripts/invoke-antigravity-implementer.mjs \
  --orchestrator codex \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --allow-write <repo-relative-prefix> \
  --model "<Gemini model from agy models>" \
  [--allow-write <another-prefix>] \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Claude route:

```text
node tools/scripts/invoke-claude-antigravity-implementer.mjs \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --allow-write <repo-relative-prefix> \
  --model "<Gemini model from agy models>" \
  [--allow-write <another-prefix>] \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Use `--diagnostic-only` with either entry point to verify the native `agy` installation plus authenticated `agy models` access without dispatching work.

## Evidence boundary

The relay proves only its measured execution envelope: CLI/auth probe, clean pre-run tree, pinned local branch/head, single-run lock, temporary hook integrity, Antigravity process outcome, post-run Git-visible changed paths, unchanged HEAD, scope classification, `git diff --check`, and captured structured output.

It does not prove functional correctness, test success, runtime behavior, security, finance, QA, CI, release readiness, production readiness, or final closure.
