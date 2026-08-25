# GitHub and CI Operations

This document is operational guidance. It does not override `AGENTS.md`, `governance/GOVERNANCE.md`, or `governance/policies/delivery.md`.

## Canonical lifecycle

Source branch creation is human-only. Source-branch names never define CI semantics.

For every existing development branch, GitHub live state is authoritative:

```text
human creates branch
-> first material push
-> exactly one open Draft PR to the repository default branch
-> same PR persists for the whole branch lifecycle
-> PR_NUMBER stays stable while HEAD_SHA advances
-> old-SHA evidence is superseded
-> exact final HEAD is verified
-> merge to canonical trunk
-> retire/delete source branch
```

`ci.yml` owns branch/PR identity resolution. On a development push it queries the exact `head -> default-branch` PR set. Zero matching PRs causes creation of one Draft PR; one is reused; more than one is a fail-closed `PR_IDENTITY_CONFLICT`. The duplicate push run is then suppressed because the GitHub `pull_request` event owns verification.

The canonical PR identity is `repository + PR_NUMBER + head ref/SHA + base ref/SHA`. A different PR, old SHA, same workflow name, or synthetic merge SHA is never current-candidate evidence.

## Execution readiness versus closure readiness

Tool health is not execution readiness. Broken CI/scanners/runtimes are evidence and normally enter root-cause treatment. Only a proven diagnosis blocker prevents execution.

Closure is stricter. A full PR closure run is an explicit `workflow_dispatch` of `ci.yml` with the exact PR/head/base identity, `mode=full`, and `runtime_proof=true`.

The `BThwani / PR Closure Evidence` job re-resolves the PR, runs full internal CI/runtime, dispatches the remote analyzers on the same branch, correlates every new run to the exact HEAD SHA, reads back CodeQL/Sonar state, requires an independent write-authorized exact-head `APPROVED` semantic review attestation, re-resolves the PR again, and publishes one stable commit status.

A successful tool run is not cross-SHA or cross-PR evidence. A new commit invalidates affected evidence.

## Remote analysis authorities

Canonical analysis is remote-owned:

- CodeQL -> GitHub Code Scanning;
- SonarQube -> SonarQube Cloud from GitHub-hosted runners;
- Semgrep -> GitHub-hosted runner with complete raw finding/error artifact;
- Remote Security -> GitHub-hosted gitleaks/OSV/Trivy/workflow/shell/container analyzers;
- Dependency Review -> exact base/head dependency delta;
- OpenCodeReview -> deterministic context preparation only; semantic reasoning is external host-agent evidence;
- Docker/lockfile checks -> exact PR head, never the synthetic `github.sha` merge candidate.

Local scanner execution is not a closure authority. Local `gh`/Sonar clients may be read/control surfaces only.

Semgrep does not translate unknown severities into success. Every raw result and engine error is counted. A non-empty result set is an execution finding that must be diagnosed/dispositioned before closure.

`remote-analysis-evidence.yml` remains default-branch/post-merge read-back. It is not PR closure authority.

## Semantic review attestation

OpenCodeReview preparation is not semantic review. Before full PR closure can pass, the exact current head must have a GitHub PR review anchored to that commit that is all of the following:

- `APPROVED`;
- submitted by a reviewer other than the PR author;
- submitted by a repository collaborator with `write`, `maintain`, or `admin` permission;
- contains both required attestation markers:

```text
BTHWANI_SEMANTIC_REVIEW:v1
verdict=PASS
```

The review body should summarize the material scope reviewed and any finding dispositions. A new commit supersedes the attestation. A self-review, comment-only review, stale-head review, or review from an account without write authority is not closure evidence.

## Remote command ingress

`remote-command.yml` accepts schema v2 only. It is a control ingress, not a scanner.

Example PR closure request:

```json
{
  "schema_version": 2,
  "request_id": "closure-20260824-001",
  "command": "pr-closure",
  "target_kind": "pull_request",
  "target_ref": "",
  "pr_number": 284,
  "expected_head_sha": "<40-char current PR head>",
  "expected_base_sha": "<40-char current PR base>"
}
```

For `target_kind=pull_request`, the workflow reads the PR directly and validates exact head/base SHA. For `target_kind=branch`, it validates the named existing branch directly. No branch is created by remote command ingress.

Supported intents are bounded: contextual CI, full/runtime/journey verification, PR closure, CodeQL, CodeQL hygiene, SonarQube, Remote Security, Semgrep, lockfile integrity, and default-branch evidence read-back. Arbitrary shell execution is forbidden.

## Platform enforcement

Tracked files cannot prove live GitHub Rulesets. The canonical integration branch should be protected in GitHub live configuration with PR-required merging, blocked force-push/deletion, and `BThwani / PR Closure Evidence` as the stable required closure status once that ruleset is configured and read back successfully.

## Verification discipline

Before every material write, re-resolve the target ref/PR and exact SHA. Before every closure/merge claim, re-resolve again. Never force a moved ref. Cancelled, stale, cross-PR, cross-SHA, incomplete, or skipped-without-non-applicability evidence is not PASS.
