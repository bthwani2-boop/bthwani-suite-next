# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

This is the single governance entry point for every human developer, AI coding agent, reviewer, and automation process. There is no separate “human governance” and “AI governance”. Everyone follows the same product, engineering, security, delivery, authority, and evidence rules.

Governance exists to make execution simpler: identify the outcome, authoritative owner, affected full-stack path, legal constraints, required verification, and evidence-backed decision without creating parallel process documents.

## Read and execute in this order

For any development task:

1. **Current task instruction** — establish requested repository/ref, outcome, limits, and authorized actions.
2. **This file** — establish the common execution model and where each truth lives.
3. **`governance/product/PRD.md`** — understand the platform, actors, surfaces, domain ownership, and universal product requirements.
4. **Applicable general policy only**:
   - `governance/policies/engineering.md`
   - `governance/policies/security.md` when security/privacy/trust is affected
   - `governance/policies/delivery.md` for repository execution, evidence, CI, release, or production claims.
5. **Capability Product Truth** under `governance/product/contracts/` when the task affects a registered capability.
6. **Machine contracts/registries** only when their decision, schema, agent/skill/tool, guard, workflow, branch, or approval data is needed.
7. **Pinned implementation truth** — current contracts, source, configuration, migrations, tests, and runtime evidence on the exact candidate.

Do not read the entire governance tree, every Product Truth, every skill, or every guard by default.

## Governance structure

Human-readable durable governance is intentionally small:

```text
governance/
├─ GOVERNANCE.md                 # one entry point
├─ product/
│  ├─ PRD.md                     # platform-wide product requirements
│  ├─ platform-model.yaml        # machine-readable platform model
│  ├─ product-truth*.schema.json
│  └─ contracts/                 # capability Product Truth instances
└─ policies/
   ├─ engineering.md             # architecture/contracts/data/runtime/quality
   ├─ security.md                # security/privacy/trust
   ├─ delivery.md                # execution/evidence/CI/release/production
   ├─ repository-retention-policy.json
   └─ governance.rego            # enforcement adapter, not independent policy
```

The existing machine registries remain executable support while their consumers are consolidated. They are not additional human policy layers. New topic-specific governance directories or decision Markdown files are forbidden.

`governance/operational_journey_protocol_package/` remains derived support only. Its protected `smsm-dsh-wlt-journeys` content is not modified by this restructuring and does not outrank this governance, the PRD, policies, Product Truth, or current implementation/runtime evidence.

## What belongs where

### PRD

Stable platform/product model, actors, surfaces, domain ownership, universal product behavior, and capability-contract requirements.

### Product Truth contracts

Capability-specific actors, surfaces, states, transitions, ownership, acceptance and negative invariants. A new feature/capability extends Product Truth; it does not create a new governance policy/decision file.

### Engineering policy

Architecture, service ownership, contracts/generated clients, database/migrations, concurrency/idempotency, events/jobs, frontend/shared code, runtime/configuration, providers, testing, observability, performance, cleanup.

### Security policy

Authentication, authorization, trusted context, object/business isolation, sessions, credentials, secrets, privacy/PII, service/provider security and security evidence.

### Delivery policy

Branch/repository safety, lifecycle, verification, CI, evidence, decisions, approvals, release, deployment, rollback, production verification and retention.

### Machine registries

Structured metadata required by validators/routers. They encode the same rules; they must not invent contradictory policy.

### Outside governance

Prompts, plans, runbooks, diagnostics, journey work packages, generated evidence, logs, screenshots, tool outputs and historical snapshots belong outside governance unless a machine contract explicitly requires the artifact.

## Registered machine, adapter, and support paths

These paths are registered for executable validation or bounded support; they are not extra human-readable policy layers:

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
- `.agents/skills/**`
- `.agents/tools/**`
- `.agents/AUTHORITY_BOUNDARY.md`
- `.agents/EVIDENCE_GATE_ROUTER.md`
- `.agents/INDEX.md`
- `.agents/SKILL_CATALOG.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `LEAN-CTX.md`
- `opencode.json`
- `governance/policies/governance.rego`
- `governance/operational_journey_protocol_package/**`

The path list above is an index, not a second definition of the rules inside those contracts.

## Universal execution model

Use `CODE_BASED_LEAN`:

1. pin repository/ref/SHA;
2. define the product outcome and affected actor(s);
3. identify the authoritative truth/write owner;
4. trace the smallest complete affected vertical path;
5. diagnose the root cause and conflicting/duplicate truth;
6. change the authoritative owner first;
7. migrate every affected consumer/readback;
8. remove obsolete/parallel behavior when safe;
9. run the smallest sufficient verification and expand by proven risk;
10. re-run affected evidence after the final relevant edit;
11. report only what the exact candidate proves.

Words such as “deep”, “complete”, or “100%” increase the evidence standard; they do not justify unrelated repository scans, tool suites, files, or unsupported completeness claims.

## Truth model

### Authority truth

Who owns policy, product semantics, data, financial facts, API boundaries, approval or evidence is resolved by:

1. current authorized task instruction;
2. `governance/authority/authority-precedence.json`;
3. this governance + PRD + applicable policy;
4. registered machine contracts;
5. current Product Truth for the capability;
6. implementation evidence only as conformity proof.

### Implementation truth

What the repository currently does is resolved by the exact pinned commit, current source/contracts/configuration/migrations/tests, then focused runtime evidence when runtime behavior is claimed.

A file cannot grant itself ownership that conflicts with higher authority. Code cannot silently create a new platform model, financial owner, authorization context, contract owner, or governance layer.

## Full-stack multi-surface rule

A task is not “frontend only” when the user action writes state later consumed by another surface. Follow the complete affected path:

`UI/action → shared controller/adapter → generated contract → backend/domain → database/events/integration → canonical readback → all required affected surfaces`

A surface may be excluded only by current Product Truth or proven non-applicability.

## One-source rules

- one platform/context model;
- one owner per durable fact;
- one canonical write path per state transition;
- one API contract provenance path;
- one database migration history per service;
- one Product Truth record per capability identity;
- one decision vocabulary;
- one guard registry/source for executable assurance metadata;
- no local/mock/fixture/fallback runtime truth;
- no topic-specific governance files that duplicate general policy or Product Truth.

## Repository safety

Remote work always resolves the exact user-named branch and current SHA. Never substitute another branch, force/reset newer work, or overwrite concurrent movement. Re-resolve before a write batch and after the final write. Git history is the default archive.

## Evidence and closure

Use `governance/contracts/decision-vocabulary.json`. Evidence is candidate-bound and scope-specific. `CLOSED_WITH_EVIDENCE` requires every applicable same-commit evidence scope and protected approval with no fail/blocked/pending class remaining.

Implementation agents cannot self-approve protected domains or fabricate unavailable runtime/CI/release/production proof.

## Governance change rule

A governance change is valid only when it reduces ambiguity and preserves executable consumers. Do not solve governance problems by adding another layer. Prefer, in order:

1. correct an existing general policy;
2. correct the PRD/platform model;
3. correct/create a capability Product Truth contract;
4. correct a machine registry/schema/guard;
5. add a new governance file only when none of the above can own the rule without mixing unrelated concerns.

New general policy categories require an explicit authority update and a demonstrated gap that cannot be represented by the three policy domains.
