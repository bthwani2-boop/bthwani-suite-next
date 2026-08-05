---
name: open-code-review-delegate
version: 2026.08.05-v1
summary: Use OpenCodeReview for deterministic file and rule selection while an existing subscription-based host agent performs a bounded advisory review.
---

# open-code-review-delegate

## Purpose

Provide a project-governed delegation workflow for OpenCodeReview (`ocr`). OCR owns deterministic diff selection, exclusions, and rule resolution; Codex, Claude Code, Gemini CLI, or another approved host agent performs the reasoning with its existing subscription. The skill is advisory and does not create an approval authority.

Use the project rule file at `.opencodereview/rule.json` unless the user explicitly supplies a narrower reviewed rule file.

## Invoke when

- A bounded code review is requested and the `ocr` CLI is available.
- The user wants to reuse a subscription-based coding agent without configuring a separate LLM API key for OCR.
- Review scope needs deterministic file selection, explicit exclusions, test inclusion, or project-specific DSH/WLT, contract, migration, frontend, security, or governance rules.
- A workspace, commit, or branch range must be reviewed before implementation or before an independent review request.

## Do not invoke when

- No code review is requested.
- The `ocr` CLI is unavailable and installation is outside the requested scope.
- A formal product, finance, governance, CI, QA, security, release, risk-acceptance, or final-closure approval is required; route to the owning authority instead.
- The same agent authored or coordinated a protected change and the result is being presented as independent approval.
- The user explicitly requests OCR-managed API mode instead of delegation mode.

## Read before

- `AGENTS.md`
- `.agents/COMMAND_SAFETY_POLICY.md` before any write or destructive action
- `.opencodereview/rule.json`
- The smallest applicable owner skill for the reviewed risk domain

## Prerequisites

- Git 2.41 or later.
- OpenCodeReview CLI pinned to the approved project baseline:

```powershell
npm install -g @alibaba-group/open-code-review@1.8.8
ocr --version
```

Delegation mode requires no OCR model provider, no OCR model configuration, and no separate API key. Do not run `ocr config provider`, `ocr config model`, or `ocr llm test` for this workflow.

## Workflow

### 1. Pin scope

For remote work, resolve the exact user-named branch and immutable SHA before claims or writes. For local work, preserve the active workspace and report staged, unstaged, and untracked state.

### 2. Preview deterministically

Workspace review:

```powershell
ocr delegate preview --rule .opencodereview/rule.json
```

Single commit:

```powershell
ocr delegate preview --commit <sha> --rule .opencodereview/rule.json
```

Branch range:

```powershell
ocr delegate preview --from <base-ref> --to <head-ref> --rule .opencodereview/rule.json
```

Do not substitute `--commit HEAD` when the requested subject is the current dirty workspace. Do not review a massive branch range by default when a smaller commit or capability scope is sufficient.

### 3. Resolve rules

Pass reviewable paths from the preview output to:

```powershell
ocr delegate rule --rule .opencodereview/rule.json <path1> <path2> ...
```

Batch paths when the change set is large. Preserve the exact rule group applied to each file.

### 4. Inspect diffs and context

Use Git according to preview mode:

- Workspace tracked file: `git diff HEAD -- <path>`
- Workspace untracked file: read the complete file
- Commit: `git show <sha> -- <path>`
- Range: `git diff <merge-base>..<head-ref> -- <path>`

Read only the smallest additional context needed to validate a finding. A changed line may be reported only when the surrounding implementation, contract, data flow, or call site supports the claim.

### 5. Review

Prioritize:

- correctness, invariants, error handling, concurrency, idempotency, and data-loss risk;
- authentication, authorization, privacy, secrets, and sensitive logs;
- DSH operational truth versus WLT financial truth and all handoff contracts;
- OpenAPI authority, generated-client provenance, route and consumer binding;
- forward-only migrations, transaction boundaries, compatibility, and manifest registration;
- cross-surface route, state, controller, and capability binding;
- tests that prove the changed behavior, including negative and failure paths;
- governance integrity, authority separation, and non-mutating CI behavior when those paths change.

Report only findings grounded in the reviewed revision. Discard style-only noise and likely false positives.

### 6. Report before fixing

Default to read-only review. Each finding must include:

```text
severity:
category:
path:
line_or_range:
evidence:
impact:
recommended_fix:
confidence:
```

Use `Critical`, `High`, or `Medium` for actionable findings. Include `Low` only when the user explicitly requests minor observations.

### 7. Fix only by explicit instruction

Do not edit, delete, commit, push, open or merge a pull request, or change repository state merely because the upstream OCR skill mentions optional fixes. Writes require an explicit current user instruction and the normal repository authority, branch, safety, and verification rules.

## Authority boundary

This skill owns no product, architecture, finance, governance, CI, QA, security, release, risk, or closure approval. OCR and the host agent are tools. Their findings are advisory evidence and never replace registered guards, tests, runtime proof, human authority, or independent review requirements.

The skill must not:

- self-approve work authored, executed, or coordinated by the same agent;
- claim complete repository coverage from a filtered preview;
- treat a static pass as runtime, security, finance, release, or production proof;
- expose API keys or place secrets in tracked files;
- let CI mutate, commit, push, merge, or rewrite source;
- silently omit tests when `.opencodereview/rule.json` includes them.

## Required checks

1. `ocr --version` reports the approved baseline or a deliberately reviewed replacement.
2. Preview mode matches the requested subject: workspace, commit, or range.
3. Included and excluded files are recorded, with test files included where applicable.
4. `.opencodereview/rule.json` resolves for representative DSH, WLT, contract, migration, frontend, test, governance, and workflow paths.
5. Findings cite the exact revision, path, and line or range.
6. Applicable registered guards and focused tests remain separate evidence.
7. Any subsequent write is performed by an explicitly authorized executor and independently reviewed when required.

## Required output

```text
repository_mode:
repository:
target_branch_or_workspace:
resolved_commit_sha:
ocr_version:
preview_mode:
rule_file:
reviewable_files:
excluded_files:
findings_by_severity:
checks:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `READY_FOR_REVIEW`.
