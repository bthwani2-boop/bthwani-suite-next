# Deep Diagnosis — Governance, Tools, Skills, Agents and Guards

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: abbas
pinned_start_sha: af1344c605983c2864d6a6f0a138c162446c69ae
mode: REMOTE_ONLY
diagnosis_status: COMPLETE
plan_status: READY_FOR_REVIEW
implementation_status: NOT_STARTED
```

## Executive determination

The repository has a substantial control plane: explicit authority precedence, machine-readable agent/skill/guard registries, owner skills, host adapters, tool wrappers, guard implementations, command routing and reusable CI workflows. It is directionally sound but not closed. Nine material findings remain: five P0 and four P1. The central pattern is parallel lifecycle/activation truth without one registry-to-command-to-CI proof chain.

## Scope and boundaries

Included: `AGENTS.md`, platform adapters, `.agents/**`, host configuration, `governance/{authority,agents,skills,guards,tools,github}/**`, `tools/{guards,toolchain,scripts}/**`, `package.json`, and relevant workflows. DSH/WLT operational source, apps, databases, contracts and runtime flows are excluded from this diagnosis-only stage. No operational file may be edited.

## Quantified inventory

- 40 classified inventory groups; 0 unclassified.
- 46 sanitized evidence records.
- 9 findings, 9 atomic work items, 9 verification items.
- 6 dependency-ordered phases.
- 2 deletion candidates: `.agents/skills/graphify` and `.agents/skills/open-code-review-delegate`.
- 1 remaining unproven domain: target-workstation execution of the three AI tool wrappers.

## Findings

| ID | Sev | Finding | Planned task |
| --- | --- | --- | --- |
| FND-0001 | P0 | LeanCTX is both conditional and globally active | TASK-0001 |
| FND-0002 | P1 | Platform adapter registration is incomplete/asymmetrical | TASK-0002 |
| FND-0003 | P0 | Tool truth is split across AI and operational catalogs | TASK-0003 |
| FND-0004 | P0 | Registered agent/tool guards are not unified in default local/CI aggregates | TASK-0006 |
| FND-0005 | P0 | Pinned commit has no current CI status/run evidence | TASK-0007 |
| FND-0006 | P0 | Master ruleset is disabled and bound to stale required-check contexts | TASK-0008 |
| FND-0007 | P1 | Retired tool-as-skill directories remain live | TASK-0004 |
| FND-0008 | P1 | AI tool activation is declared but not proven on target host | TASK-0005 |
| FND-0009 | P1 | No end-to-end registry-to-runtime proof chain exists | TASK-0009 |

## Live GitHub enforcement

The default branch is `master`. Ruleset `18292744` (`master-protection`) targets `refs/heads/master` but is disabled. It contains nine legacy required contexts, while `.github/workflows/ci.yml` exposes the fail-closed aggregate `BThwani CI result` and the derived repository enforcement contract identifies that aggregate as the intended sole required check. Enabling the stale ruleset unchanged is prohibited.

## Target architecture

1. One canonical authority registry for precedence and classification.
2. Complete agent adapter registration with generated host projections.
3. One writable tool model with scoped generated projections.
4. Owner skills separated from advisory tool policies.
5. One fail-closed agent-system guard aggregate used locally and in CI.
6. Same-commit CI evidence for affected governance/tooling commits.
7. Reconciled and active master ruleset.
8. End-to-end closure proof before package disposal.

## Phase order

`PHASE-00` diagnosis → `PHASE-01` authority/adapters/tools → `PHASE-02` namespace/runtime evidence → `PHASE-03` guards/CI → `PHASE-04` master enforcement → `PHASE-05` closure/disposal.

## Decision

`FIX_REQUIRED`. Planning is ready for review; implementation is not authorized by this package. Execute only one eligible work item at a time and rerun checks after the last write on the same commit.
