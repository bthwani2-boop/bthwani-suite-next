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

Job-level concurrency groups are forbidden. Unregistered temporary workflows, one-time remediation workflows, and duplicate result jobs are forbidden by `guard:guard-registry`.

## Workflow inventory registry

The full workflow inventory — which files may exist under `.github/workflows/`, their class, triggers, and permissions — is declared in `governance/github/workflow-registry.json` (schema: `governance/github/workflow-registry.schema.json`) and cross-checked by `guard:guard-registry` and `guard:required-command-integrity`. Three classes exist:

- `CORE` — the ten permanent workflows above; this set is additionally hard-coded as an immutable core inside both consuming guards, so removing or renaming a core workflow requires editing the guards themselves, not only the registry.
- `PRIVILEGED` — exactly `remediation-analysis.yml`; the only workflow permitted to mutate source, and only inside its own runner, never by pushing.
- `TEMPORARY` — a registered, time-boxed, task-scoped workflow (see the Progressive Remediation System's `task-*.yml` workflows and `governance/remediation/`). A `TEMPORARY` entry must declare `taskId`, `contractHash`, `parentBranch`, and an unexpired `expiresAt`; an expired or contract-incomplete entry fails `guard:workflow-temp-files`. A `TEMPORARY` workflow is still read-only, still permission-locked, and still forbidden from mutating source.

Adding a permanent `CORE`-adjacent task workflow (see the progressive remediation system) requires only a new file plus a registry entry — not an edit to either consuming guard, because the guards validate against the registry rather than a hard-coded list of every allowed file.

The first such registered `READ_ONLY_DIAGNOSTIC` workflow is `task-discovery.yml` (`.github/workflows/task-discovery.yml`), which runs the progressive remediation system's parallel discovery scripts under `tools/remediation/discovery/` and rejects the run if any tracked file changes. A second, `progressive-remediation.yml`, evaluates the orchestrator's phase decisions (`tools/remediation/orchestrator/`) for one task and is likewise read-only; it decides which `task-*.yml` verification workflows should run next but never dispatches or mutates anything itself.

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
