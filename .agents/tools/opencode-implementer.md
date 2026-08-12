# OpenCode/NVIDIA Implementer Tool Policy

## Purpose

`opencode-implementer` is the governed external implementation relay for two mutually exclusive routes:

- `Codex orchestrator -> OpenCode -> approved NVIDIA worker -> Codex verification`.
- `Claude orchestrator -> OpenCode -> approved NVIDIA worker -> Claude verification`.

Exactly one orchestrator owns each work unit. The implementer owns bounded file edits only. It owns no repository authority, product truth, approval, verification decision, commit, push, merge, release, or closure decision.

Approved workers are fixed by the relay:

- `bthwani-agent-6` -> `nvidia/nvidia/nemotron-3-ultra-550b-a55b`
- `bthwani-agent-7` -> `nvidia/z-ai/glm-5.2`
- `bthwani-agent-8` -> `nvidia/nvidia/nemotron-3-super-120b-a12b`

## Use when

- the current task explicitly selects Codex or Claude with OpenCode/NVIDIA delegated implementation;
- the selected orchestrator pins repository, branch, and exact candidate HEAD;
- one bounded work unit has explicit read/write prefixes, forbidden paths, acceptance criteria, and orchestrator-owned verification commands;
- pre-existing dirty paths do not overlap the declared read/write scope;
- no other OpenCode implementation delegation is active.

## Do not use when

- delegation is not explicit;
- the work unit has repository-wide or ambiguous write scope;
- declared read/write scope overlaps pre-existing dirty work;
- another delegated OpenCode implementation is active;
- the worker would need shell, git, web, subagents, external-directory access, formal approval, release authority, or scope expansion;
- the requested write scope overlaps governance, adapters, agent control files, `.git`, or the relay itself.

## Execution contract

1. Exactly one orchestrator owns each work unit: Codex or Claude.
2. The worker/model mapping is hard-coded; callers cannot override the model.
3. The relay requires explicit `--expected-branch` and exact 40-character `--expected-head`.
4. Unrelated pre-existing dirty work is preserved and fingerprinted; dirty paths overlapping declared read/write scope fail closed.
5. Allowed write scope may not overlap protected control-plane or explicit forbidden paths.
6. OpenCode is launched with `--pure`, disabling external plugins for the run.
7. Runtime inline configuration restricts the provider to NVIDIA, disables sharing, snapshotting, formatter/LSP execution, and sets a default-deny permission policy.
8. The selected worker receives only path-scoped `read`, `list`, and `edit`. Shell, git, web, task, skill, LSP, external-directory, todo, interactive-question, and doom-loop recovery tools are hard-denied.
9. The resolved OpenCode configuration is probed before dispatch and must preserve the selected worker/model and hard-denied permissions.
10. Only one delegation may run at a time through the repository-private lock.
11. The relay enforces unchanged branch and HEAD after the worker exits.
12. Pre-existing unrelated dirty paths must remain byte-identical.
13. New Git-visible changes must remain entirely inside declared write prefixes and outside every forbidden path.
14. `git diff --check` must pass.
15. OpenCode output is execution telemetry only. The selected orchestrator must inspect the complete diff, re-pin branch/head, run required verification, and own rework, commit, and push.
16. Neither Codex nor Claude may substitute for protected independent review or a formal approval authority.

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

The worker must stop and report insufficient scope instead of expanding it.

## Invocation

Codex route:

```text
node tools/scripts/invoke-opencode-implementer.mjs \
  --orchestrator codex \
  --worker bthwani-agent-8 \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --expected-head <40-char-sha> \
  --allow-read <repo-relative-prefix> \
  --allow-write <repo-relative-prefix> \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Claude route:

```text
node tools/scripts/invoke-claude-opencode-implementer.mjs \
  --worker bthwani-agent-8 \
  --work-unit <id> \
  --brief <brief-file> \
  --expected-branch <branch> \
  --expected-head <40-char-sha> \
  --allow-read <repo-relative-prefix> \
  --allow-write <repo-relative-prefix> \
  [--forbid-write <repo-relative-prefix>] \
  [--timeout 45m]
```

Use `--diagnostic-only` with either entry point to verify OpenCode, NVIDIA authentication, and the approved worker models without dispatching work.

## Authority boundary

The relay and OpenCode worker are implementation tools only. They own no approval, acceptance, release, risk, finance, governance, security, QA, CI, production, or closure authority.

## Required output

The relay returns the selected orchestrator, worker/model binding, pinned branch/HEAD, Git-visible changed paths, preserved pre-existing dirty paths, and the explicit verification boundary. A successful relay exit is not functional or final closure.
