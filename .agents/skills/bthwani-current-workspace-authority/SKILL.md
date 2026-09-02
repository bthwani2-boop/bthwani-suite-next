---
name: bthwani-current-workspace-authority
version: 2026.07.17-v2
summary: Emit repository/ref pinning evidence for the canonical orchestrator before repository claims or writes.
---

# bthwani-current-workspace-authority

## Purpose

Provide immutable repository/ref facts to the canonical orchestrator before diagnosis, analysis, execution, or verification. This is a bounded adapter and never creates a second repository authority or closure decision.

## Invoke when

- A task mentions GitHub, repository, branch, pull request, commit, remote state, current implementation, donor material, or a local workspace.
- Any task may write, delete, move, merge, or verify repository files.
- A prior diagnosis must be reused after the branch or commit may have changed.

## Do not invoke when

- The request has no repository state, code, configuration, or artifact claim.

## Read before

- `governance/GOVERNANCE.md`
- `governance/policies/delivery.md`
- `AGENTS.md`

## Authority boundary

This adapter reports repository/ref resolution only. The canonical orchestrator owns scope, root ranking, implementation, verification, integration, and closure; this adapter cannot override those decisions.

## Resolution modes

### Remote-only evidence mode

Use when the user names GitHub, a remote branch, or explicitly requires remote analysis/execution.

1. Resolve `repository_full_name` exactly.
2. Resolve the explicitly named remote branch exactly.
3. Resolve its current commit SHA from the remote repository.
4. Read every source file using that branch or immutable SHA.
5. Write only to that branch when the current task authorizes writes.
6. Re-resolve the branch before each logical write batch and after the final write.
7. Never substitute `master`, the default branch, another feature branch, a local branch, or a prior remembered SHA.

```text
REPOSITORY_MODE = REMOTE_ONLY
TARGET_REMOTE_BRANCH = explicit user branch
RESOLVED_COMMIT_SHA = remote branch head
```

### Local evidence mode

Use only when the user explicitly requests local execution or supplies a local workspace as the source of truth.

1. Resolve the repository root from Git.
2. Resolve the active local branch and upstream.
3. Resolve `HEAD` and working-tree status.
4. Do not switch branches automatically.
5. Do not claim remote truth until the upstream ref is fetched and compared.

```text
REPOSITORY_MODE = LOCAL
TARGET_LOCAL_BRANCH = active branch
RESOLVED_COMMIT_SHA = local HEAD
```

## Adapter evidence

Return or retain internally:

- repository full name or local root;
- repository mode;
- exact target branch;
- resolved commit SHA;
- ref provenance;
- allowed write paths;
- excluded paths;
- pre-write and post-write branch-head checks;
- whether concurrent branch movement was detected.
- the adapter reports facts and limitations only; the orchestrator decides whether they are sufficient.

## Concurrency rule

If the remote branch moves unexpectedly during a write batch, stop further writes, re-read the affected files from the new head, and reconcile the movement before continuing. Never force-update the branch to erase concurrent work.

## Forbidden behavior

- Assuming branch state from memory.
- Treating repository default metadata as the execution branch.
- Reading one branch and writing another.
- Using a prior branch diagnosis as proof for the current branch without re-validation.
- Treating local files, diagnostics, artifacts, or another PR as current remote truth.
- Switching, rebasing, resetting, or force-moving a branch unless explicitly required and independently justified.
- Claiming branch verification without an immutable commit SHA.

## Output to the canonical orchestrator

```text
repository_mode:
repository:
target_branch:
resolved_commit_sha:
ref_provenance:
allowed_paths:
concurrent_movement:
observations:
```

The adapter does not emit `PASS`, `FIX_REQUIRED`, closure, approval, or protocol decisions. Any sufficiency or stop-state decision belongs to the canonical orchestrator.
