# CI/CD Governance — Required Status Checks

Update GitHub Branch Protection / Ruleset for `master` with these **exact job names**.

## Current `ci.yml` (still active during transition)

| Job ID | Display Name | Required |
|---|---|---|
| `node-gates` | `Node / PNPM gates` | ✅ Yes |
| `wlt-go` | `WLT Go backend` | ✅ Yes |
| `wlt-go-db` | `WLT Go DB integration` | ✅ Yes |
| `dsh-go` | `DSH Go backend` | ✅ Yes |
| `dsh-go-db` | `DSH Go DB integration` | ✅ Yes |
| `identity-go` | `Identity Go backend` | ✅ Yes |
| `docker-runtime-smoke` | `Docker runtime smoke` | ✅ Yes |

---

## New Workflows — Required Checks per PR

### `ci-pr-fast.yml` — runs on every PR to `master`

| Job ID | Display Name | Required |
|---|---|---|
| `lockfile-check` | `Lockfile integrity` | ✅ Yes |
| `node-fast-gate` | `Node fast gate (lint / typecheck / test / affected)` | ✅ Yes |
| `guards-fast` | `Guards (contracts + boundary + policy)` | ✅ Yes |

### `ci-governance.yml` — runs on every PR to `master`

| Job ID | Display Name | Required |
|---|---|---|
| `governance-check` | `Repository governance checks` | ✅ Yes |

### `security.yml` — runs on every PR to `master`

| Job ID | Display Name | Required |
|---|---|---|
| `dependency-review` | `Dependency review (PR only)` | ✅ Yes |
| `workflow-permissions-audit` | `Workflow permissions audit` | ✅ Yes |

### `ci-db.yml` — runs on PRs touching `services/**/database/**`

| Job ID | Display Name | Required |
|---|---|---|
| `migration-static-guards` | `Migration static guards` | ✅ Yes (when triggered) |
| `wlt-db-gate` | `WLT DB gate (migrations + seed idempotency + Go tests)` | ✅ Yes (when triggered) |
| `dsh-db-gate` | `DSH DB gate (migrations + seed idempotency + Go tests)` | ✅ Yes (when triggered) |

### `ci-contracts.yml` — runs on PRs touching `contracts/**`

| Job ID | Display Name | Required |
|---|---|---|
| `contracts-lint` | `Contracts lint (bthwani contracts-foundation)` | ✅ Yes (when triggered) |
| `spectral-lint` | `OpenAPI Spectral lint` | ✅ Yes (when triggered) |
| `openapi-client-drift` | `Generated client drift check` | ✅ Yes (when triggered) |

---

## New Workflows — NOT Required on PR (push/nightly/manual only)

| Workflow | Trigger | Notes |
|---|---|---|
| `ci-full.yml` | push to `master`, `workflow_dispatch` | Full baseline after merge |
| `ci-runtime.yml` | push to `master` (paths filter), nightly, `workflow_dispatch` | Docker smoke |
| `mobile-preflight.yml` | `workflow_dispatch` only | Needs `EXPO_TOKEN` secret |
| `release-preflight.yml` | `workflow_dispatch` only | Pre-release readiness |
| `dependabot-triage.yml` | Dependabot PRs only | Auto-labels |

---

## GitHub Ruleset Settings (master)

```
Branch: master
Protection:
  ✅ Require a pull request before merging
  ✅ Require status checks to pass
  ✅ Require branches to be up to date before merging
  ✅ Require code owner review (CODEOWNERS)
  ✅ Restrict direct pushes

Required checks (add these by EXACT name):
  - "Lockfile integrity"
  - "Node fast gate (lint / typecheck / test / affected)"
  - "Guards (contracts + boundary + policy)"
  - "Repository governance checks"
  - "Dependency review (PR only)"
  - "Workflow permissions audit"
```

> **Note**: For path-filtered workflows (ci-db, ci-contracts), GitHub will show them as skipped when
> paths don't match. Skipped checks still count as passing in GitHub rulesets.
> Add them as required only if you want to enforce them universally.

---

## Secrets to Add in GitHub Settings

| Secret Name | Used By | Notes |
|---|---|---|
| `EXPO_TOKEN` | `mobile-preflight.yml` | Optional — EAS preflight skips if missing |
