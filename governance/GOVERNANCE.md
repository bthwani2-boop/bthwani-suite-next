# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

This is the single governance entry point for every human developer, AI coding agent, reviewer, and automation process. There is no separate human or agent governance model. Everyone follows the same Product, Engineering, Security, Delivery, authority, and evidence rules.

Governance exists to make execution simple and deterministic: identify the requested outcome, authoritative owner, affected full-stack path, constraints, required verification, and evidence-backed decision without creating parallel process documents.

## Read and execute in this order

For any development task:

1. Current authorized task instruction: repository/ref, objective, limits, and allowed actions.
2. `governance/GOVERNANCE.md`: common execution and truth model.
3. `governance/product/PRD.md`: platform, actors, surfaces, ownership, and universal product requirements.
4. Only the applicable general policy:
   - `governance/policies/engineering.md` — architecture, contracts, data, runtime, quality;
   - `governance/policies/security.md` — auth, privacy, secrets, trusted context, isolation;
   - `governance/policies/delivery.md` — repository execution, evidence, CI, release, production.
5. Applicable capability Product Truth under `governance/product/contracts/`.
6. Machine registries/contracts only when their structured data is needed.
7. Exact pinned implementation truth: current contracts, source, configuration, migrations, tests, and focused runtime evidence when claimed.

Do not preload the whole governance tree, Product Truth catalog, skill set, tool set, plans, or guard suite.

## Human-readable governance structure

```text
governance/
├─ GOVERNANCE.md
├─ product/
│  ├─ PRD.md
│  ├─ platform-model.yaml
│  ├─ product-truth.schema.json
│  ├─ product-truth.compatibility.schema.json
│  └─ contracts/
└─ policies/
   ├─ engineering.md
   ├─ security.md
   ├─ delivery.md
   ├─ repository-retention-policy.json
   └─ governance.rego
```

The machine registries under `authority/`, `contracts/`, `agents/`, `skills/`, `guards/`, `github/`, and `tools/` are executable support for the same governance. They are not additional human policy layers.

New topic-specific governance directories, decision Markdown files, journey governance files, feature policies, or per-surface governance documents are forbidden. A feature-specific rule belongs in Product Truth, a service/API/data contract, or implementation.

## Product and plans

`governance/product/PRD.md` owns durable platform-wide product requirements. `governance/product/contracts/*.product-truth.json` owns capability-specific actors, required/excluded surfaces, states, transitions, ownership, acceptance, and negative invariants.

Planning/support artifacts live outside governance under `plans/`:

- `plans/diagnose-implementing/` — disposable diagnosis/execution package framework and generated packages;
- `plans/smsm-dsh-wlt-journeys/` — derived journey planning/discovery support.

These plans never outrank Product Truth, contracts, implementation, runtime evidence, or protected approvals.

`governance/operational_journey_protocol_package/` remains legacy derived support only while current validators/consumers still depend on it. It is not a second governance authority and must not absorb feature-specific planning content.

## What belongs where

### PRD

Platform product model, actors, surfaces, ownership, universal full-stack behavior, and minimum capability contract.

### Product Truth

One record per capability identity. Capability-specific states, actors, surfaces, invariants, owner boundaries, and acceptance.

### Engineering

Architecture, service ownership, API/generated-client provenance, PostgreSQL/migrations, concurrency/idempotency, events/jobs, frontend/shared code, runtime/configuration, providers, tests, observability, performance, cleanup.

### Security

Authentication, authorization, object/business scope, trusted context, sessions, secrets, privacy/PII, service/provider security, and security evidence.

### Delivery

Branch safety, implementation lifecycle, verification, CI, decisions, approvals, release, deployment, rollback, production verification, and repository retention.

### `.agents/`

Only execution routing/support:

- `.agents/INDEX.md` — derived routing index;
- `.agents/skills/` — registered skills;
- `.agents/tools/` — conditional tool policies.

`.agents/` must not contain a second authority boundary, safety policy, evidence policy, update policy, decision log, or skill catalog that duplicates registries/governance.

### Outside governance

Prompts, plans, runbooks, diagnostics, generated evidence, logs, screenshots, tool outputs, temporary task state, and historical snapshots.

## Registered machine/support paths

The following are registered structured or adapter/support paths; their classification is controlled by `governance/authority/authority-precedence.json`:

- `governance/authority/authority-precedence.json`
- `governance/authority/authority-precedence.schema.json`
- `governance/authority/direct-work-branch-execution-policy.json`
- `governance/authority/direct-work-branch-execution-policy.schema.json`
- `governance/authority/single-owner-mode.json`
- `governance/authority/single-owner-mode.schema.json`
- `governance/contracts/**`
- `governance/agents/**`
- `governance/skills/**`
- `governance/guards/**`
- `governance/github/workflow-registry.json`
- `governance/github/full-verification-policy.json`
- `governance/github/master-protection.ruleset.json`
- `governance/github/repository-enforcement.json`
- `governance/tools/agent-tool-registry.json`
- `governance/product/platform-model.yaml`
- `governance/product/product-truth.schema.json`
- `governance/product/contracts/**`
- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `LEAN-CTX.md`
- `opencode.json`
- `governance/policies/governance.rego`
- `governance/operational_journey_protocol_package/**`

The list is an index, not a duplicate definition of those contracts.

## Universal execution model

Use `CODE_BASED_LEAN`:

1. pin repository/ref/SHA;
2. define product outcome and actors;
3. identify the authoritative truth/write owner;
4. trace the smallest complete affected vertical path;
5. diagnose root cause, duplicate truth, and dependency impact;
6. fix the authoritative owner first;
7. migrate every affected consumer/readback;
8. remove obsolete/parallel behavior when safe;
9. run the smallest sufficient verification and expand by proven risk;
10. re-run affected evidence after the final relevant edit;
11. report only what the exact candidate proves.

“Deep”, “complete”, or “100%” raises the evidence standard; it never authorizes unrelated repository scans, full tool suites, or unsupported completeness claims.

## Truth model

### Authority truth

Resolve who owns policy/product/data/contracts/approvals in this order:

1. current authorized task instruction;
2. `governance/authority/authority-precedence.json`;
3. this file + PRD + applicable policy;
4. registered machine contracts;
5. applicable Product Truth;
6. implementation evidence only as conformity proof.

### Implementation truth

Resolve what the repository currently does from the exact pinned commit, current contracts/source/configuration/migrations/tests, then focused runtime evidence when runtime behavior is claimed.

A file cannot grant itself ownership that conflicts with higher authority. Code cannot silently create a new platform model, financial owner, trusted context, contract owner, or governance layer.

## Full-stack multi-surface rule

A task is not surface-local when its state is written/read elsewhere. Trace:

`UI/action → shared controller/adapter → generated contract → backend/domain → database/events/integration → canonical readback → every required affected surface`

A surface is excluded only by Product Truth or proven non-applicability.

## One-source rules

- one platform/context model;
- one owner per durable fact;
- one canonical write path per transition;
- one API contract provenance path;
- one migration history per service;
- one Product Truth record per capability identity;
- one decision vocabulary;
- one guard registry/assurance source;
- one planning root: `plans/`;
- no local/mock/fixture/fallback runtime truth;
- no topic-specific governance files duplicating PRD/policy/Product Truth.

## Repository safety

Resolve the exact user-named branch and remote SHA. Re-resolve before each logical write batch and after the final write. Never substitute another branch, force/reset newer work, or overwrite concurrent movement. Git history is the default archive.

## Evidence and closure

Use `governance/contracts/decision-vocabulary.json`. Evidence is scope-specific and candidate-bound. `CLOSED_WITH_EVIDENCE` requires every applicable same-commit evidence scope and required protected approval with no fail, blocked, or pending class remaining.

Implementation agents cannot self-grant protected approval or fabricate unavailable runtime, CI, release, or production evidence.

## Governance change rule

A governance change must reduce ambiguity and preserve executable consumers. Prefer, in order:

1. correct an existing general policy;
2. correct PRD/platform model;
3. correct/create a capability Product Truth;
4. correct a machine registry/schema/guard;
5. add a new governance file only when none of those can own the rule without mixing unrelated concerns.

New general policy categories require explicit authority change and a demonstrated gap that cannot fit Engineering, Security, or Delivery.
