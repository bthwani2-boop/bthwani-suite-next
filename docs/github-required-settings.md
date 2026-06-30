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
  - **Status checks required**:
    - `CI / Node / PNPM gates`
    - `CI / Docker runtime smoke`
    - `CI / DSH Go backend`
    - `CI / DSH Go DB integration`
    - `CI / WLT Go backend`
    - `CI / WLT Go DB integration`
    - `CI / Identity Go backend`
    - `CodeQL`
- **Block force pushes**: Enabled.

## 2. Push Protection & Secret Scanning

- **Secret Scanning**: Enabled.
- **Push Protection**: Enabled (blocks commits containing secrets, credentials, or forbidden file patterns).

## 3. Metadata and Workflow Security

- **Restrict workflow modification**: Enabled.
- **Security review**: Required before deleting or disabling workflows (e.g., CodeQL).
