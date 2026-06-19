---
name: bthwani-current-workspace-authority
version: 2026.06.19-strict-branch-safe
summary: Confirm repository root, active branch, scope, and donor boundary before work starts.
---

# bthwani-current-workspace-authority

## Invoke when

- any task may edit files
- the task mentions branch, repo, donor, realtest, local path, GitHub, or current implementation state
- an agent may compare old and new repository material

## Read before

`AGENTS.md`, `.agents/AUTHORITY_BOUNDARY.md`

## Execution contract

Establish the active root as `C:\bthwani-suite-next`. Detect the branch locally with `git branch --show-current` and treat it as the only execution branch.

```text
ACTIVE_BRANCH = current local branch
TARGET_BRANCH = ACTIVE_BRANCH
DEFAULT_BRANCH = ACTIVE_BRANCH
```

If branch detection fails or returns detached state, stop with `BLOCKED_BRANCH_UNVERIFIED`. Do not assume remote branch metadata. Do not switch branches automatically.

## Forbidden

- do not assume branch state from memory
- do not use remote repository default metadata as execution branch
- do not switch branches unless the user explicitly orders it
- do not read donor material as current truth
- do not edit before scope and status are known

## Required evidence

- repository root
- `ACTIVE_BRANCH`
- commit SHA
- remote URLs
- Git status before edits
- exact allowed target paths

## Failure decision

- wrong root -> `BLOCKED`
- branch/current state not proven -> `BLOCKED_BRANCH_UNVERIFIED`
- unrelated local changes outside allowed scope -> `BLOCKED_SCOPE_EXPANSION`
- missing evidence -> `NEEDS_EVIDENCE`
