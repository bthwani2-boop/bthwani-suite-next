# GitHub Repository Settings & Ruleset Documentation

To protect the `master` branch and prevent contaminated merges or leaks, the following settings must be configured on GitHub (under **Settings > Rulesets** or **Settings > Branches**):

## 1. Branch Protection Ruleset for `master`

- **Target branches**: Include default branch (`master`).
- **Restrict deletions**: Enabled.
- **Restrict push**: Enabled (block direct push, require Pull Request).
- **Require a pull request before merging**: Enabled.
  - **Required approvals**: `1` (or more based on team settings).
  - **Dismiss stale pull request approvals when new commits are pushed**: Enabled.
  - **Require review from Code Owners**: Enabled (using `CODEOWNERS` file).
- **Require status checks to pass before merging**: Enabled.
  - **Require branches to be up to date before merging**: Enabled.
  - **Require conversation resolution before merging**: Enabled.
  - **Status checks required**: (see Section 5 for exact names)
- **Block force pushes**: Enabled.
- **Block branch deletion**: Enabled.

## 2. Push Protection & Secret Scanning

- **Secret Scanning**: Enabled.
- **Push Protection**: Enabled (blocks commits containing secrets, credentials, or forbidden file patterns).

## 3. Metadata and Workflow Security

- **Restrict workflow modification**: Enabled.
- **Security review**: Required before deleting or disabling workflows (e.g., CodeQL).

## 4. Rulesets — Exact Names

Configure in **Settings > Rules > Rulesets**:

| Ruleset Name | Target | Enforcement |
|---|---|---|
| `master-protection` | `master` branch | Active |

Rules enabled in `master-protection`:
- Restrict creations: OFF
- Restrict updates: ON (require PR)
- Restrict deletions: ON
- Require linear history: Optional
- Require deployments to succeed: OFF (no environments configured yet)
- Require signed commits: Optional
- Require a pull request before merging: ON (1 approval, dismiss stale, require CODEOWNERS)
- Require status checks to pass: ON (branches up to date)
- Block force pushes: ON

## 5. Required Checks — Exact Names

These must match the **exact job names** as reported by GitHub Actions:

```
CI / Node / PNPM gates
CI / Docker runtime smoke
CI / DSH Go backend
CI / DSH Go DB integration
CI / WLT Go backend
CI / WLT Go DB integration
CI / Identity Go backend
CodeQL / Analyze (go)
CodeQL / Analyze (javascript-typescript)
```

> **Note**: Use `CodeQL / Analyze (go)` and `CodeQL / Analyze (javascript-typescript)` explicitly — not the ambiguous `CodeQL` label.

## 6. Project Setup

Create project: **BThwani Suite Next — Execution Control**

Views:
| View Name | Filter |
|---|---|
| Board | Backlog / Ready / In Progress / PR Open / Review / Blocked / Done |
| Table | All Issues and PRs |
| Roadmap | Milestones |
| Security | `type:security OR area:ci` |
| Runtime | `area:runtime OR gate:runtime-smoke` |

Custom Fields:
| Field | Type | Options |
|---|---|---|
| Priority | Single select | P0, P1, P2, P3 |
| Domain | Single select | DSH, WLT, Identity, GitHub, Runtime |
| Surface | Single select | app-client, app-partner, app-captain, app-field, control-panel, backend, shared |
| Risk | Single select | Low, Medium, High, P0 |
| Gate | Single select | CI, CodeQL, Runtime, DB, Manual |
| Branch | Text | — |
| PR | Text | — |
| Status | Status | Todo, In Progress, Done |

## 7. Labels

Create the following labels in **Issues > Labels**:

### Priority
`P0` · `P1` · `P2` · `P3`

### Domain
`domain:dsh` · `domain:wlt` · `domain:identity` · `domain:github`

### Surface
`surface:app-client` · `surface:app-partner` · `surface:app-captain` · `surface:app-field` · `surface:control-panel`

### Area
`area:backend` · `area:frontend` · `area:database` · `area:runtime` · `area:ci` · `area:guards` · `area:security` · `area:codespaces`

### Type
`type:bug` · `type:feature` · `type:refactor` · `type:decision` · `type:security`

### Gate
`gate:ci-required` · `gate:codeql-required` · `gate:runtime-smoke`

### Status
`status:blocked` · `status:ready-for-pr`

### Other
`dependencies`

## 8. Milestones

Create in **Issues > Milestones**:

| Milestone | Description |
|---|---|
| M0 — GitHub Operating System Setup | Configure GitHub as an operating system (Codespaces, rulesets, labels, project) |
| M1 — Master Baseline Strict Gate | Prove CI + CodeQL on exact master SHA |
| M2 — Catalog Live Trial | First clean feature from verified master |
| M3 — Runtime / Docker / Codespaces Gate | Runtime smoke and Codespaces validation |
| M4 — DSH/WLT Boundary Closure | Finance/auth boundary enforcement |
| M5 — Dependency Security Cleanup | Resolve Dependabot PRs, normalize deps |

## 9. Secret Scanning & Push Protection

Enable in **Settings > Security & analysis**:
- **Secret scanning**: ON
- **Push protection**: ON (prevents commits with detected secrets from being pushed)
- **Secret scanning alerts**: Sent to security contacts
- **Validity check**: ON (checks if detected secrets are still active)

## 10. Codespaces Machine Policy

Configure in **Settings > Codespaces**:
- **Machine types allowed**: Limit to `2-core` minimum (prevents accidental 16-core usage)
- **Secrets**: Add `GITHUB_TOKEN` (auto), `POSTGRES_DSN`, `WLT_SECRET`, `DSH_SECRET` via **Settings > Codespaces > Secrets**
- **Prebuilds**: Enable prebuild on `master` branch (reduces Codespace startup time)
- **Idle timeout**: 30 minutes (default)

## 11. Branch Naming Policy

Enforce these branch prefixes via ruleset or team convention:

| Prefix | Purpose |
|---|---|
| `feature/` | Product feature work |
| `fix/` | Bug fixes |
| `chore/` | Governance, tooling, CI changes |
| `journey/` | Atomic service journeys |
| `hotfix/` | Emergency production fixes |
| `dependabot/` | Automated dependency updates (auto-managed) |

No direct commits to `master`. All work via PR.

## 12. Dependabot Policy

- All Dependabot PRs must have labels: `dependencies`, `gate:ci-required`
- No Dependabot PR is merged until `master` CI is green on the PR head
- `open-pull-requests-limit: 5` per ecosystem to prevent noise
- Superseded Dependabot PRs must be closed before opening new ones for the same package
- PRs are grouped by `production-dependencies` and `development-dependencies` (npm only)
- Commit message prefix: `chore(deps)` for all ecosystems
