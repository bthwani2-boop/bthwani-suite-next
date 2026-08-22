# GitHub and CI Operations

This document is operational guidance. It does not override `AGENTS.md`, `governance/GOVERNANCE.md`, or `governance/policies/delivery.md`.

## Live authority model

Do not maintain a second workflow, guard, agent, or SDLC registry as repository truth. The repository intentionally has no workflow registry. Executable authority is the current implementation plus live GitHub state on the exact candidate SHA.

The primary GitHub execution authorities are:

- contextual routing and aggregate CI result: `.github/workflows/ci.yml`;
- reusable Node diagnostics and verification: `.github/workflows/ci-node-diagnostics.yml` and `.github/workflows/ci-node-verification.yml`;
- reusable backend verification: `.github/workflows/ci-backends.yml`;
- reusable runtime proof: `.github/workflows/ci-runtime.yml`;
- canonical CodeQL scanner authority: `.github/workflows/codeql.yml`;
- API-only CodeQL metadata maintenance after successful canonical master analysis: `.github/workflows/codeql-hygiene.yml`;
- SonarQube Cloud scan: `.github/workflows/sonarqube.yml`;
- remote security scans: `.github/workflows/security-remote.yml`;
- dependency delta review: `.github/workflows/dependency-review.yml`;
- frozen lockfile verification: `.github/workflows/lockfile-integrity.yml`;
- exact-master remote CodeQL/Sonar read-back: `.github/workflows/remote-analysis-evidence.yml`;
- authenticated SHA-pinned command ingress: `.github/workflows/remote-command.yml`.

This list describes executable entry points; it is not a registry and must not be copied into another machine-authority layer.

Actual branch protection, rulesets, required checks, workflow outcomes, reviews, code-scanning state, and approval freshness must be read from GitHub live for the exact target branch and candidate SHA.

## Repository flow

Before every material write:

1. resolve the current user-named target ref and live SHA;
2. reconcile unexpected branch movement;
3. write only the authorized logical change;
4. never force/reset newer unrelated work;
5. re-resolve after the write and before any merge or closure claim.

`master` is the release target. A tracked file cannot prove that GitHub currently enforces a particular ruleset or required-check set.

## Remote analysis and security

Canonical static/security analysis is remote-owned:

- CodeQL executes through GitHub Code Scanning on GitHub-hosted runners;
- SonarQube analysis executes through SonarQube Cloud from GitHub-hosted runners;
- SonarQube hosted MCP/API is the remote read surface for IDEs and agents that have an appropriate credential;
- repository security gates execute on GitHub-hosted runners;
- local scanner execution is never a prerequisite for repository closure.

Local terminal clients are allowed as control/read surfaces. In particular, `gh` may dispatch and inspect GitHub Actions remotely, and the official `sonar` CLI may authenticate to and query SonarQube Cloud. This does not make the local machine an analysis authority. Local `sonar-scanner`, local CodeQL database creation/analysis, a local SonarQube server, or local replacements for the governed remote security workflows are not canonical closure paths.

`codeql-hygiene.yml` is metadata maintenance, not a second scanner authority. It may retire only analyses produced by obsolete `.github/workflows/codeql.yml` analysis keys, and only when the triggering successful CodeQL run is still the exact live `master` SHA. It never dismisses current findings and never deletes history from a still-canonical analysis key. Because it has `security-events: write`, it is deliberately API-only: it never checks out or executes repository source.

## Remote command ingress

`remote-command.yml` is a thin control ingress, not another CI implementation. It accepts only an allowlisted JSON envelope from a repository writer/maintainer/admin, verifies the exact branch SHA, dispatches an existing canonical workflow, correlates the resulting run, and reports the result back to the request issue.

The issue title is exactly:

```text
[remote-command]
```

The body is JSON:

```json
{
  "schema_version": 1,
  "command": "ci-full",
  "target_ref": "master",
  "expected_sha": "<40-character live SHA>"
}
```

Supported command intents are intentionally bounded to contextual CI, runtime proof, CodeQL, CodeQL metadata hygiene, SonarQube Cloud, remote security, lockfile integrity, and exact-master remote evidence read-back. No arbitrary shell command is accepted.

Dependency Review remains pull-request-bound because its meaningful authority is the dependency delta between PR base and head.

## Remote evidence

`remote-analysis-evidence.yml` is read-back only. It does not run a second CodeQL or Sonar scanner. After canonical master CI completes, it reads CodeQL and Sonar evidence for the exact live master SHA, emits a short-lived artifact, and publishes the `Remote Analysis Evidence` commit status whose target URL points to the exact evidence run.

The evidence collector accepts only canonical `push` evidence from `master` and correlates each required workflow by exact SHA, exact branch, event, workflow name, and workflow path. Manual terminal dispatch remains useful for diagnosis and explicit reruns, but it cannot impersonate canonical post-merge master evidence.

This status provides a stable bridge for connected GitHub clients:

```text
exact master SHA
  -> Remote Analysis Evidence status
  -> exact GitHub Actions run
  -> candidate-bound artifact/read-back
```

Logs, screenshots, reports, and evidence artifacts are candidate-bound operational evidence. Do not commit them as durable Product/System Truth.

## Verification and change procedure

When changing CI/security authority:

1. pin the exact source SHA;
2. inspect all callers, required checks, and live rulesets before changing ownership or check names;
3. migrate all consumers in the same logical change;
4. remove obsolete duplicate execution only after live protection dependencies are proven safe;
5. use local control/query clients only where they do not become scanner or security authorities;
6. let GitHub-hosted workflows provide canonical security/runtime evidence;
7. verify the exact final candidate and live GitHub result before merge or closure.

Skipped jobs are acceptable only when routing proves non-applicability. Cancelled, superseded, or older-SHA runs are not PASS for a current candidate.
