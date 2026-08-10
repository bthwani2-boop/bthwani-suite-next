# GitHub and CI Operations

This document is operational guidance. It does not override `governance/GOVERNANCE.md`, `governance/policies/delivery.md`, or the machine contracts under `governance/github/` and `governance/contracts/`.

## Sources of truth

- Workflow inventory and lifecycle: `governance/github/workflow-registry.json`.
- Desired `master` protection configuration: `governance/github/master-protection.ruleset.json`.
- Full-verification routing: `governance/contracts/full-verification-policy.json`.
- Direct-work write rules: `governance/authority/direct-work-branch-execution-policy.json`.
- Required evidence/approval semantics: `governance/policies/delivery.md` and `governance/contracts/sdlc/`.
- Actual branch protection, rulesets, required checks, workflow outcomes, reviews, and approval freshness: query GitHub live for the exact target branch and candidate SHA.

A desired ruleset file does not prove GitHub is enforcing it. No tracked snapshot is current repository-platform truth. Claims about live protection, required checks, same-commit CI, or independent review require current GitHub readback.

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
- full verification is controlled by `governance/contracts/full-verification-policy.json` and current impact;
- skipped jobs are acceptable only when routing proves non-applicability;
- cancelled, superseded, or older-SHA runs are not PASS for the current candidate;
- a workflow result proves only its declared evidence scope;
- required-check names and GitHub enforcement are verified from current GitHub state, not copied from an old document.

## Reviews and approvals

`CODEOWNERS` routes review requests but does not itself prove independent approval. Logical approval domains are defined by `governance/agents/agent-registry.json`, `governance/authority/single-owner-mode.json`, and `governance/contracts/sdlc/roles-and-authority.yaml`.

An execution agent cannot self-grant protected approvals. `CLOSED_WITH_EVIDENCE` requires all applicable candidate-bound evidence scopes and required approvals under the canonical decision vocabulary.

## Current enforcement status

Never persist a “current enforcement” snapshot in governance and treat it as live truth. For a consequential claim, resolve the exact branch/candidate and read GitHub directly. If desired repository configuration differs from live enforcement, report the drift explicitly and keep the desired configuration file as intent only.

## Change procedure

When changing workflows, rulesets, CODEOWNERS, or CI routing:

1. update the authoritative machine contract/configuration;
2. update executable consumers/guards in the same logical change;
3. run applicable workflow-policy/static validation;
4. verify live GitHub state when the change concerns enforcement;
5. record only candidate-bound evidence outside durable governance unless a canonical machine contract explicitly requires persistence.
