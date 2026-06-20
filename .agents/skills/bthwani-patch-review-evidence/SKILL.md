---
name: bthwani-patch-review-evidence
version: 2026.06.19-clean
summary: Review changes using Git evidence instead of agent claims.
---

# bthwani-patch-review-evidence

## Invoke when

- user uploads a patch, diff, handoff ZIP, or terminal output
- Copilot, Codex, Claude, Gemini, script, or another tool made edits
- a result is claimed as complete

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

- status
- diff stat
- name-status
- diff check
- staged diff when staged files exist
- untracked file list
- verification output

## Failure decision

- no patch/evidence -> `NEEDS_EVIDENCE`
- forbidden scope changed -> `REVERT_REQUIRED`
- verification failed -> `FIX_REQUIRED`
- UI evidence missing -> `NEEDS_VISUAL_EVIDENCE`

## Notes

No extra notes.
