# GitHub CI operating model

This document describes the canonical control plane. It does not override `AGENTS.md`, `governance/GOVERNANCE.md`, or `governance/policies/delivery.md`.

## Canonical lifecycle

GitHub live state is authoritative for every remote candidate. The relevant identity is `repository + open PR + head ref/SHA + base ref/SHA`. A previous commit, synthetic merge SHA, or previous workflow run is never a substitute for the current candidate.

```text
DEVELOP LOCALLY
  -> nearest targeted verification
  -> fix
  -> continue

WHEN REMOTE EVIDENCE HAS VALUE
  -> pnpm ci:check
  -> exact live Base-to-Head affected verification
  -> collect and fix every current red root

WHEN READY TO MERGE
  -> pnpm ci:close
  -> exact live candidate
  -> Full CI preflight
  -> heavy analyzers only after Full CI passes
  -> exact Final Closure status
  -> merge
```

Normal commits, pushes, PR synchronization, PR opening, reopening, and `ready_for_review` do not start remote verification automatically. There are no polling, label, `workflow_run`, `repository_dispatch`, queue, or hidden state-machine replacements.

## User interface

The only remote user commands are:

```text
pnpm ci:check
pnpm ci:close
```

Both commands resolve the repository, current branch, live HEAD, open PR, and live base through GitHub before dispatching a workflow with exact identity. `ci:check` accepts no user routing flags. `ci:close` requires exactly one open, non-draft PR and accepts no analyzer or runtime options.

## Affected verification

`ci:check` uses the exact Git diff from the live PR base to the current PR head. The Router only identifies affected owners/modules: Node/frontend, DSH, WLT, Identity, Workforce, Platform, Providers, Contracts, Database, Infrastructure, CI control plane, and Dependencies. It does not infer verification from business words in filenames and it does not read previous workflow history.

A changed backend always runs the corresponding backend verification. A Node-only change does not run unrelated backends. Contract, database, infrastructure, dependency, and CI-control-plane changes run their applicable material checks. A successful Router with a skipped applicable worker is not a successful candidate.

## Final Closure

Final Closure is `workflow_dispatch` only. It first resolves and checks out the exact live PR candidate and derives applicability from one Git-native `git diff --name-only BASE HEAD` result. It does not use the GitHub PR files endpoint with a 100-file limit.

The order is fail-closed and intentional:

```text
RESOLVE EXACT LIVE CANDIDATE
  -> FULL CI PREFLIGHT
  -> if red: stop; no heavy analyzer starts
  -> if green: Sonar, CodeQL, Semgrep, Security, Dependency, Lockfile, and Docker checks in parallel when applicable
  -> aggregate all results
  -> publish BThwani / Final Closure on the exact HEAD
```

A new commit produces a different exact SHA, so previous evidence cannot satisfy current-head merge protection. The status names remain `BThwani CI / PR result` and `BThwani / Final Closure`.

OpenCodeReview is context/delegation preparation only. It is not a semantic review and is not part of the required Final Closure gate. `master-sonar.yml` remains a separate post-merge default-branch analysis authority when its dashboard/trend purpose is required.

## Verification discipline

A failed remote run is handled by collecting all available red results, normalizing and correlating them, identifying executable root causes, applying root-correct fixes, cleaning the affected cone, and rerunning the smallest authoritative verification. A green result is not accepted across candidates, PRs, or SHAs. Before any closure or merge claim, the live candidate and current branch protection requirements must be resolved again.

## Platform enforcement

Tracked files cannot prove live GitHub branch protection. The canonical integration branch must remain protected in GitHub live configuration with pull-request-required merging and the two exact-candidate statuses above as required checks. The repository configuration should be read back after any settings mutation; this change does not silently alter protection settings.
