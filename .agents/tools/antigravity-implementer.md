# Antigravity Implementer Tool Policy

## Purpose

`antigravity-implementer` is the bounded external implementation relay for exactly one orchestrator-owned work unit:

- `Codex -> Antigravity CLI (agy/Gemini) -> Codex verification`, or
- `Claude -> Antigravity CLI (agy/Gemini) -> Claude verification`.

The relay owns no Product Truth, approval, commit, push, merge, release, verification, or closure decision.

## Use when

- the current task explicitly benefits from bounded Antigravity implementation;
- the orchestrator pins repository, branch, and exact HEAD;
- read/write prefixes, forbidden paths, acceptance criteria, and orchestrator verification are explicit;
- the declared read/write cone has no pre-existing working-tree changes;
- no other delegated Antigravity work unit is active;
- an explicit Gemini model is selected.

Do not use delegation for analysis-only work, trivial edits, ambiguous/repository-wide write scope, dirty overlapping scope, concurrent delegated writers, or any work that requires the implementer to commit/push/merge/release/approve/expand scope.

## Execution contract

1. Exactly one orchestrator owns each work unit.
2. Antigravity is implementation-only; the orchestrator owns diagnosis, reconciliation, diff review, verification and final decisions.
3. Codex invokes `tools/scripts/invoke-antigravity-implementer.mjs --orchestrator codex`; Claude invokes `tools/scripts/invoke-claude-antigravity-implementer.mjs`.
4. Authentication is the user's local Antigravity CLI session. The relay accepts no API key.
5. Normal execution resolves the native `agy` executable and verifies its version, then dispatches once. It does not run `agy models` before every work unit; invalid authentication/model selection fails closed through the actual `agy` execution. `--diagnostic-only` performs the explicit `agy models` authentication/availability probe.
6. Repository-root write scope is forbidden. Every write prefix and forbidden prefix is repository-relative and symlink-safe.
7. The relay creates `.agents/hooks.json` only for the duration of the run and refuses to overwrite an existing hook configuration.
8. Read-only Antigravity tools (`view_file`, `list_dir`, `grep_search`, `find_by_name`) do not spawn a hook process on every call. The work-unit prompt still bounds their intended read cone. Every non-read tool call is intercepted by the PreToolUse hook: only declared file-write tools inside allowed write prefixes are accepted; shell, web, browser, MCP, permission, task, schedule, media, interaction, subagent, and unknown/future non-read tools fail closed.
9. Writes cannot touch `.git`, governance, agent/adaptor control files, delegation scripts, explicit forbidden prefixes, or paths outside declared write scope. Symlink traversal is denied.
10. The relay runs headless JSON output with `--mode=accept-edits`; the hook remains the mutation boundary.
11. Before dispatch, branch/HEAD and overlapping dirty scope are verified. After exit, the relay verifies hook integrity/removal, unchanged branch/HEAD, Git-visible changed paths, write-scope classification, and `git diff --check` for the allowed write cone.
12. Antigravity output is telemetry only. The orchestrator must inspect the complete diff and run the project checks that add unique assurance for the affected code cone.

## Brief

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

If the bounded cone is insufficient, Antigravity stops and reports the missing scope instead of expanding it.

## Invocation

Codex:

```text
node tools/scripts/invoke-antigravity-implementer.mjs \
  --orchestrator codex \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --expected-head <40-char-sha> \
  --allow-read <repo-relative-prefix> \
  --allow-write <repo-relative-prefix> \
  --model <gemini-model> \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Claude:

```text
node tools/scripts/invoke-claude-antigravity-implementer.mjs \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --expected-head <40-char-sha> \
  --allow-read <repo-relative-prefix> \
  --allow-write <repo-relative-prefix> \
  --model <gemini-model> \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Use `--diagnostic-only` only when the explicit CLI/auth/model inventory probe is needed.

## Evidence boundary

The relay proves only its execution envelope: CLI presence/version, pinned local branch/HEAD, bounded write enforcement, single-run lock, temporary hook integrity, process outcome, Git-visible changed-path classification, `git diff --check`, and captured structured output.

It does not prove functional correctness, tests, runtime behavior, security, finance, QA, CI, release readiness, production readiness, or final closure.
