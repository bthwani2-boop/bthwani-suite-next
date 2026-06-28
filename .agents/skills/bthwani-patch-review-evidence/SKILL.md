---
name: bthwani-patch-review-evidence
version: 2026.06.19-clean
summary: Review changes using Git evidence instead of agent claims.
---

# bthwani-patch-review-evidence

## Invoke when

- when reviewing a supplied patch/diff or when final review is explicitly requested.
- Do not invoke automatically after every agent edit.

## Read before

`AGENTS.md`, `.agents/EVIDENCE_GATE_ROUTER.md`, changed files, staged and unstaged diff evidence

## Execution contract

Check changed file list, scope compliance, unexpected additions/deletions, staged changes, untracked files, diff safety, whitespace, and required verification output.

## Forbidden

- do not trust the tool summary alone
- do not ignore untracked files
- do not ignore staged changes
- do not approve UI changes without visual evidence

## Required evidence

For normal patch review, inspect changed code directly.
Require evidence files only when final closure/PR/release review requires them.

## Failure decision

- no patch/evidence -> `NEEDS_EVIDENCE`
- forbidden scope changed -> `REVERT_REQUIRED`
- verification failed -> `FIX_REQUIRED`
- UI evidence missing -> `NEEDS_VISUAL_EVIDENCE`

## Notes

No extra notes.
