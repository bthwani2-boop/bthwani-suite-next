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

`ci.yml` owns branch/PR identity resolution. On a development push it queries the exact `head -> default-branch` PR set. Zero matching PRs leaves the push as plain branch-development evidence with no PR creation; one is bound to that PR and the duplicate push run is suppressed because the GitHub `pull_request` event owns verification; more than one is a fail-closed `PR_IDENTITY_CONFLICT`. PR creation itself stays human-owned.

The canonical PR identity is `repository + PR_NUMBER + head ref/SHA + base ref/SHA`. A different PR, old SHA, same workflow name, or synthetic merge SHA is never current-candidate evidence.

## Execution readiness versus closure readiness

Tool health is not execution readiness. Broken CI/scanners/runtimes are evidence and normally enter root-cause treatment. Only a proven diagnosis blocker prevents execution.

Closure is stricter. A full PR closure run is an explicit `workflow_dispatch` of `ci.yml` with the exact PR/head/base identity, `mode=full`, and `runtime_proof=true`.

The `BThwani / PR Closure Evidence` job re-resolves the PR, runs full internal CI/runtime, dispatches the remote analyzers on the same branch, correlates every new run to the exact HEAD SHA, reads back CodeQL/Sonar state scoped to the candidate branch ref, requires a write-authorized exact-head `BTHWANI_SEMANTIC_REVIEW:v1` comment attestation, re-resolves the PR again, and publishes one stable commit status.

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

`master-sonar.yml` is the sole post-merge Sonar authority. All PR analyzers are reusable workers invoked by the fast gate or Final Closure; no workflow-run read-back or polling path is required.

## Semantic review attestation

OpenCodeReview preparation is not semantic review. Before full PR closure can pass, the exact current head must be attested by a GitHub issue comment on the closure PR that is all of the following:

- authored by a repository collaborator with `write`, `maintain`, or `admin` permission;
- bound to the exact candidate by containing its full head SHA;
- containing all required attestation markers:

```text
BTHWANI_SEMANTIC_REVIEW:v1
verdict=PASS
```

The comment body should summarize the material scope reviewed and any finding dispositions. The attestation channel is an issue comment because GitHub forbids APPROVED reviews on self-authored PRs; solo-maintenance authority policy deliberately does not require author independence. A new commit supersedes the attestation. A comment missing any marker, anchored to a stale head, or from an account without write authority is not closure evidence.

## Canonical CI request interface

`pnpm ci:request` is the single human-facing interface. It resolves the repository default branch, current local HEAD, and any matching open PR through GitHub before dispatching the default-branch `ci.yml` definition.

```text
pnpm ci:request --affected
pnpm ci:request --full
pnpm ci:request --runtime
pnpm ci:request --journey partner-onboarding
```

Every request carries the exact candidate SHA and, when a PR exists, the exact PR number and base SHA. No issue marker, label lifecycle, synthetic branch, arbitrary shell command, `workflow_run` read-back, or polling loop is part of the interface. Final closure is started by `ready_for_review` or by the explicit PR-number dispatch on `final-closure.yml`.

## Platform enforcement

Tracked files cannot prove live GitHub Rulesets. The canonical integration branch should be protected in GitHub live configuration with PR-required merging, blocked force-push/deletion, and `BThwani / Final Closure` as the stable required closure status once that ruleset is configured and read back successfully.

## Verification discipline

Before every material write, re-resolve the target ref/PR and exact SHA. Before every closure/merge claim, re-resolve again. Never force a moved ref. Cancelled, stale, cross-PR, cross-SHA, incomplete, or skipped-without-non-applicability evidence is not PASS.
