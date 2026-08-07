# GitHub and CI Operations

This document is an operational guide. It does not override `governance/GOVERNANCE.md`, `governance/policies/delivery.md`, or the machine contracts under `governance/github/`.

## Sources of truth

- Workflow inventory and lifecycle: `governance/github/workflow-registry.json`.
- Desired `master` protection configuration: `governance/github/master-protection.ruleset.json`.
- Last recorded enforcement observation: `governance/github/repository-enforcement.json`.
- Direct-work write rules: `governance/authority/direct-work-branch-execution-policy.json`.
- Required evidence/approval semantics: `governance/policies/delivery.md` and `governance/contracts/sdlc/`.

A desired ruleset file does not prove GitHub is enforcing it. An observed snapshot is not permanently current. Claims about live protection, required checks, same-commit CI, or independent review require current GitHub readback.

## Repository flow

Use the exact user-named target branch/ref and current remote SHA. The current task and direct-work policy decide whether work is written directly, committed/pushed, or routed through a PR. Do not invent a mandatory branch/PR workflow from this guide.

For every write batch:

1. resolve the current target SHA;
2. reconcile unexpected branch movement;
3. write only the authorized logical change;
4. never force/reset newer work;
5. re-resolve after the final write.

`master` is the protected release target by policy intent. Whether that protection is currently enforced must be verified live before relying on it.

## CI

CI is read-only with respect to tracked source and must evaluate the exact candidate it claims to prove. Use `governance/github/workflow-registry.json` rather than a hardcoded historical workflow list in documentation.

Rules:

- run affected verification plus risk-based expansion;
- full verification is controlled by `governance/github/full-verification-policy.json` and current impact;
- skipped jobs are acceptable only when routing proves non-applicability;
- cancelled, superseded, or older-SHA runs are not PASS for the current candidate;
- a workflow result proves only its declared evidence scope;
- required-check names and GitHub enforcement are verified from current configuration, not copied from an old document.

## Reviews and approvals

`CODEOWNERS` routes review requests but does not itself prove independent approval. Logical approval domains are defined by `governance/agents/agent-registry.json`, `governance/authority/single-owner-mode.json`, and `governance/contracts/sdlc/roles-and-authority.yaml`.

An execution agent cannot self-grant protected approvals. `CLOSED_WITH_EVIDENCE` requires all applicable candidate-bound evidence scopes and required approvals under the canonical decision vocabulary.

## Current enforcement status

Do not duplicate the current snapshot here. Read `governance/github/repository-enforcement.json` and, for any consequential claim, verify GitHub live. If desired and observed states differ, report the drift explicitly instead of treating the repository file as enforcement.

## Change procedure

When changing workflows, rulesets, CODEOWNERS, or CI routing:

1. update the authoritative machine contract/configuration;
2. update executable consumers/guards in the same logical change;
3. run applicable workflow-policy/static validation;
4. verify live GitHub state when the change concerns enforcement;
5. record only candidate-bound evidence.
