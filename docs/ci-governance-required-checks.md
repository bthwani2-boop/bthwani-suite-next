# CI/CD Governance — Required Checks and External Settings

Status: ACTIVE SUPPORT DOCUMENT

This document mirrors the active workflow job names on remote branch `bassam`. It does not prove that repository Rulesets or branch protection are configured; those are GitHub-side settings and require an independent readback from repository settings.

## Active required workflow results

Use the final aggregator jobs as the stable required checks. Internal jobs remain independently visible for diagnosis but are not the Ruleset contract.

| Workflow | Job ID | Exact display name | Purpose |
|---|---|---|---|
| `.github/workflows/ci.yml` | `ci-result` | `CI result` | Requires governance, repository foundation, static binding/logic, generated-client drift, Node verification, and Go service verification. |
| `.github/workflows/governance-audit.yml` | `governance-result` | `Governance audit result` | Requires governance contracts, workflow security/policy analysis, and repository hygiene. |
| `.github/workflows/security.yml` | `security-result` | `Security result` | Requires every applicable dependency, Go, Node, OSS, secrets, and workflow-policy security job. |
| `.github/workflows/dsh-operational-closure-ci.yml` | `operational-result` | `DSH operational verification result` | Requires DSH/WLT/Workforce database tests, static cross-surface binding, and migration invariants when the workflow is triggered. |

## Branch coverage

Repository workflows must cover:

```text
push: bassam, master
pull_request: master
```

The active remote implementation branch is `bassam`. Verification evidence belongs to the exact commit SHA that triggered the run; results from another branch, an earlier SHA, or a temporary merge ref do not prove the current branch head.

## Workflow invariants enforced in code

`tools/guards/guard-registry-gate.mjs` enforces the following for critical workflows:

- explicit top-level permissions;
- no `contents: write` or `write-all`;
- no `pull_request_target`;
- no source commit, push, reset, merge, or formatting rewrite;
- no `@latest` installation;
- external Actions pinned to immutable 40-character commit SHAs;
- `actions/checkout` uses `persist-credentials: false`;
- no `continue-on-error: true` in critical workflows;
- active `bassam` coverage;
- an `if: always()` final aggregator;
- no one-time, duplicated operational-protocol, or stale fast-CI workflows.

## GitHub Ruleset settings — external requirement

The following configuration must be verified in GitHub repository settings before merge or release governance can be considered proven:

```text
Target branch: master
Require a pull request before merging: enabled
Require status checks to pass: enabled
Require branch to be up to date: enabled when operationally appropriate
Require conversation resolution: enabled
Dismiss stale approvals: enabled
Restrict direct pushes: enabled
Do not allow bypass for ordinary contributors: enabled
Required checks:
  - CI result
  - Governance audit result
  - Security result
  - DSH operational verification result (when made universally required)
```

A path-filtered workflow can remain absent for an unrelated change. Do not configure a path-filtered result as universally required unless the Ruleset supports the intended skipped/not-triggered behavior.

## Separation of duties

`CODEOWNERS` routes ownership but cannot create independent QA, security, release, or risk-acceptance authorities when only one GitHub identity exists. Formal SDLC approval evidence remains `NEEDS_EVIDENCE` until separate authorized identities or teams and required-review rules are configured and read back.

## Secrets

`EXPO_TOKEN` is optional and belongs only to intentionally invoked mobile/EAS workflows. Missing optional deployment secrets must not weaken static CI or security verification.
