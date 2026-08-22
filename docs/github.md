# GitHub and CI Operations

This document records the executable control plane. It does not override `AGENTS.md`, governance, or Product/System Truth.

## Canonical remote model

All governed analysis and verification runs remotely. A workstation, ChatGPT, Codex, Antigravity, or another IDE may **control and read** remote authorities, but must not become a scanner/CI authority.

```text
ChatGPT / Codex / IDE / gh
  -> exact ref + SHA request
  -> .github/workflows/remote-command.yml
  -> canonical GitHub-hosted / cloud authority
  -> candidate-bound logs + artifacts + findings
  -> .github/workflows/remote-analysis-evidence.yml
  -> normalized evidence for root-cause review
```

Do not create a second workflow registry or local scanner path. Executable authority is the live repository implementation plus live GitHub/cloud state on the exact candidate SHA.

## Execution authorities

- Contextual verification owner: `.github/workflows/ci.yml`.
- Reusable CI: `ci-node-diagnostics.yml`, `ci-node-verification.yml`, `ci-backends.yml`, `ci-runtime.yml`.
- Deep SAST: `.github/workflows/codeql.yml`.
- Fast/custom SAST: `.github/workflows/semgrep.yml`.
- Quality/coverage: `.github/workflows/sonarqube.yml`.
- Secrets, dependency/security/config/workflow/shell/docker/yaml checks: `.github/workflows/security-remote.yml`.
- Dependency delta admission: `.github/workflows/dependency-review.yml`.
- Frozen lockfile determinism: `.github/workflows/lockfile-integrity.yml`.
- Deep semantic review: `.github/workflows/open-code-review.yml` using trusted-base `.opencodereview/rule.json`.
- Dependency automation: `.github/dependabot.yml`; remote state/read-back: `.github/workflows/dependabot-audit.yml`.
- CodeQL metadata audit/repair: `.github/workflows/codeql-hygiene.yml`; repair is default-branch-only.
- Thin full-suite coordinator: `.github/workflows/remote-toolchain.yml`; it dispatches authorities and contains no scanner logic.
- Exact-SHA read-back: `.github/workflows/remote-analysis-evidence.yml`.
- Authenticated agent/IDE ingress: `.github/workflows/remote-command.yml`.

## Remote-only law

The repository control path must not require local CodeQL databases, local `semgrep scan/ci`, local OpenCodeReview execution, local SonarQube/Sonar Scanner, or local Gitleaks/OSV/Trivy/actionlint/zizmor/pinact/ShellCheck/Hadolint/yamllint execution.

GitHub-hosted runners may install pinned scanner binaries as part of their canonical workflow. That is remote execution, not workstation execution.

SonarQube IDE/Codex access remains the hosted read-only MCP/API surface. Semgrep/OpenCodeReview and the remaining authorities are controlled through the exact-SHA GitHub ingress unless an official read-only cloud surface is explicitly proven and governed later.

## Agent / IDE control

`tools/scripts/request-remote-toolchain.ps1` is a control client only. It resolves the live branch SHA, creates the strict `[remote-command]` request, and may wait for the canonical GitHub result. It never executes scanners locally.

Examples:

```powershell
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command toolchain-full -TargetRef c
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command codeql-full -TargetRef c
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command semgrep-full -TargetRef c
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command opencodereview -TargetRef c
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command security-full -TargetRef c
pwsh -File tools/scripts/request-remote-toolchain.ps1 -Command gitleaks -TargetRef c
```

The existing `ocr:*` package commands are compatibility controls only; their wrapper dispatches remote OpenCodeReview and does not install or run `ocr` on the workstation.

## Remote command contract

The issue title is exactly:

```text
[remote-command]
```

The body is strict JSON and must pin the live target SHA:

```json
{
  "schema_version": 2,
  "command": "toolchain-full",
  "target_ref": "c",
  "expected_sha": "<40-character live SHA>"
}
```

Optional fields are `base_ref`, `journey`, and `model`. Unsupported fields/commands fail closed. `codeql-hygiene-repair` is restricted to the live default branch.

Available command families are contextual CI/runtime, CodeQL, SonarQube, Semgrep, OpenCodeReview, Remote Security as a whole or each contained tool, Dependency Review, Lockfile Integrity, Dependabot audit, CodeQL hygiene audit/repair, full toolchain coordination, and exact-SHA evidence read-back.

## Automatic execution

Automatic events remain responsibility-specific:

- CodeQL, SonarQube, Remote Security, Semgrep, and contextual CI run on repository changes according to their workflow triggers.
- OpenCodeReview runs automatically on PR candidate updates.
- Dependency Review remains PR-delta-owned and also supports explicit exact-base/head diagnosis.
- Lockfile Integrity runs automatically only when dependency manifests/lockfiles are affected and supports explicit remote verification.
- Dependabot performs scheduled dependency maintenance; Dependabot State Audit performs scheduled/read-on-demand evidence collection.
- CodeQL Metadata Hygiene repairs only after canonical successful default-branch CodeQL; any branch may request non-mutating audit.
- `remote-toolchain.yml` is explicit deep/full verification, not a replacement for automatic routing.

## Deep evidence and closure

A green workflow is not sufficient evidence by itself. `remote-analysis-evidence.yml` binds evidence to the exact live candidate and collects, as applicable:

- workflow/run/job/step identities and conclusions;
- raw GitHub Actions logs;
- all candidate-bound artifacts produced by selected authorities;
- CodeQL analyses/alerts;
- SonarQube analysis, quality gate, issues, hotspots, and measures;
- Semgrep JSON;
- Gitleaks JSON and Remote Security logs;
- OpenCodeReview JSON/provenance;
- Dependabot alerts/PR state;
- normalized findings across available tools.

Normalization is not root-cause determination. Multiple tool findings may represent one causal root. The orchestrator must validate/falsify, correlate, deduplicate symptoms, prove the highest material roots, fix the actual owner, and rerun only invalidated evidence.

Transient logs/reports/evidence remain GitHub artifacts; do not commit them as Product/System Truth.

## Safety invariants

Before every material write or closure claim:

1. resolve the exact user-named branch and live SHA;
2. reconcile unexpected branch movement;
3. preserve one execution authority per responsibility;
4. never replace a remote failure with a local scanner result;
5. never suppress/ignore a material finding merely to obtain green;
6. bind verification to the final candidate;
7. treat cancelled, superseded, stale, differently-scoped, or missing evidence as not PASS;
8. read live branch protection/rulesets/checks/reviews from GitHub rather than inferring them from tracked files.
