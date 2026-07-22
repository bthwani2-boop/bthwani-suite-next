# CI/CD Governance — Focused Contextual Workflow

Status: ACTIVE

The repository uses one canonical GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

Its stable required-check contract is:

```text
BThwani CI result
```

## Operating model

- Feature work is performed on `lianbassam` or a focused successor branch.
- Open a draft pull request to `master` early.
- Every push to that pull request triggers one contextual workflow run.
- A newer push cancels the older run for the same pull request.
- Direct pushes to feature branches do not start a duplicate workflow.
- Pushes to `master` run post-merge contextual verification.
- Full-project and runtime verification are explicit `workflow_dispatch` choices; they are not the default.

## Contextual routing

The workflow first classifies changed paths, then runs only relevant jobs:

- policy and workflow guards for governance, workflow, security, or infrastructure changes;
- contract, frontend, and journey checks only when those scopes change;
- DSH, WLT, Identity, Workforce, Platform, or Providers Go tests only when their owners change;
- runtime smoke only when explicitly requested.

Unrelated jobs are skipped and accepted by the single final result.

## Queue and duplication controls

The workflow has one top-level concurrency group:

```yaml
concurrency:
  group: contextual-ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

Job-level concurrency groups are forbidden. Temporary workflows, one-time remediation workflows, and duplicate result jobs are forbidden by `guard:guard-registry`.

## Repository Ruleset requirement

GitHub repository settings must be verified independently. The intended `master` ruleset is:

```text
Require a pull request before merging: enabled
Require status checks to pass: enabled
Require branch to be up to date: enabled when operationally appropriate
Require conversation resolution: enabled
Dismiss stale approvals: enabled
Restrict direct pushes: enabled
Required check:
  - BThwani CI result
```

Do not configure retired result names as required checks. They were duplicate wrappers around the same contextual result and caused misleading `0/5` displays.

## Diagnostics

Do not commit `tmp-*` workflows. Use the failing job log from the canonical workflow. When deeper evidence is necessary, run `workflow_dispatch` with `mode=full` or `runtime_proof=true` on an immutable SHA.

## Separation of duties

`CODEOWNERS` routes ownership but does not prove independent QA, security, or release approval when only one GitHub identity exists. Formal approval evidence remains `NEEDS_EVIDENCE` until separate authorized identities or teams and corresponding rules are configured and read back.
