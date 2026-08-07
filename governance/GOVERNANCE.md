# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

This is the single governance entry point for every human developer, AI coding agent, reviewer, and automation process. There is one product model, one authority hierarchy, one execution model, and one evidence vocabulary. Do not create parallel governance for a tool, agent, feature, journey, surface, or team.

## Read order

For any task, read only what is applicable and in this order:

1. current authorized task instruction and exact repository/ref;
2. `governance/authority/authority-precedence.json`;
3. this file;
4. `governance/product/PRD.md`;
5. applicable `governance/policies/engineering.md`, `governance/policies/security.md`, and/or `governance/policies/delivery.md`;
6. applicable capability Product Truth under `governance/product/contracts/`;
7. required machine contracts/registries;
8. exact pinned implementation, migrations, tests, and runtime evidence for the claim.

Do not preload the whole governance tree, every Product Truth, every skill, every guard, or every plan.

## Governance structure

Durable human-readable governance is intentionally small:

```text
governance/
├─ GOVERNANCE.md
├─ product/
│  ├─ PRD.md
│  ├─ platform-model.yaml
│  ├─ product-truth*.schema.json
│  └─ contracts/
├─ policies/
│  ├─ engineering.md
│  ├─ security.md
│  ├─ delivery.md
│  ├─ repository-retention-policy.json
│  └─ governance.rego
├─ authority/
├─ contracts/
│  └─ sdlc/
├─ agents/
├─ skills/
├─ guards/
├─ github/
└─ tools/
```

No topic-specific governance directory or decision Markdown is permitted. Capability rules belong in the PRD, general policies, Product Truth, service contracts, and implementation ownership—not a new governance file.

## Product governance

`governance/product/PRD.md` owns platform-wide product requirements and ownership boundaries. `governance/product/platform-model.yaml` is its machine-readable platform model. Capability Product Truth under `governance/product/contracts/` is conditionally canonical only inside its declared capability and must conform to the PRD and general policies.

## General policies

- `governance/policies/engineering.md`: architecture, services, frontend/shared ownership, contracts/generated clients, data/migrations, concurrency/idempotency, events/jobs, runtime/configuration, providers, observability, performance, quality, cleanup.
- `governance/policies/security.md`: authentication, authorization, trusted context, object/business isolation, sessions, credentials, secrets, privacy/PII, provider/service security, security evidence.
- `governance/policies/delivery.md`: repository writes, lifecycle, verification, CI, evidence, decisions, approvals, release, deployment, rollback, production verification.

`governance/policies/repository-retention-policy.json` is the machine retention contract. `governance/policies/governance.rego` is an enforcement adapter, not an additional policy source.

## Machine contracts and registries

Machine-readable contracts encode the same governance for validation/routing and may not invent conflicting policy. Registered paths include:

- `governance/authority/authority-precedence.json`
- `governance/authority/authority-precedence.schema.json`
- `governance/authority/direct-work-branch-execution-policy.json`
- `governance/authority/direct-work-branch-execution-policy.schema.json`
- `governance/authority/single-owner-mode.json`
- `governance/authority/single-owner-mode.schema.json`
- `governance/contracts/**`
- `governance/contracts/sdlc/**`
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

`governance/github/master-protection.ruleset.json` describes desired configuration. `governance/github/repository-enforcement.json` is an observed snapshot. Neither proves current live GitHub enforcement without live readback.

## Agent and tool adapters

Humans and agents use the same governance. Agent-specific files only route execution:

- `AGENTS.md`
- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`
- `CLAUDE.md`
- `GEMINI.md`
- `LEAN-CTX.md`
- `opencode.json`

Skills own only their registered execution scope. Tools and adapters own no Product Truth, approval, or repository truth.

## Plans and derived support

Planning/support material lives outside governance:

- `plans/diagnose-implementing/`
- `plans/smsm-dsh-wlt-journeys/`
- `tools/prompting/`
- `docs/runbooks/`

These are derived support. They may assist discovery, execution, or reporting but cannot create policy, Product Truth, approval, or implementation/runtime truth. The former `governance/operational_journey_protocol_package/` is retired; its durable SDLC contracts now live under `governance/contracts/sdlc/`, and its non-authoritative guidance was superseded by the unified governance, prompts, and plan frameworks. Git history is the archive.

## Universal execution model

Use `CODE_BASED_LEAN`:

1. pin exact repository/ref/SHA;
2. define product outcome and actor(s);
3. resolve authoritative truth/write ownership;
4. trace the smallest complete affected vertical path;
5. diagnose root cause and competing truth;
6. change the authoritative owner first;
7. migrate every affected consumer/readback;
8. remove obsolete/parallel behavior when safe;
9. run the smallest sufficient verification and expand by proven risk;
10. invalidate and rerun evidence after any later relevant change;
11. report only what the exact candidate proves.

“Deep”, “complete”, and “100%” raise the evidence standard. They do not authorize unrelated scans, all tools/skills, or unsupported completeness claims.

## Truth model

- **Authority truth:** who owns policy, product semantics, writes, approvals, and evidence rules.
- **Product truth:** what a capability must do and its legal states/invariants.
- **Implementation truth:** exact pinned source, contracts, configuration, migrations, and tests.
- **Runtime truth:** actual candidate-bound runtime/readback evidence.

Code cannot silently create a new platform model, financial owner, authorization context, contract owner, or governance layer. A plan, prompt, fixture, or historical report cannot prove implementation/runtime truth.

## Full-stack multi-surface rule

A task is not “frontend only” when its action writes state consumed elsewhere. Follow:

`UI/action → shared controller/adapter → generated contract/client → backend/domain → database/events/integration → canonical readback → every required affected surface`

A surface may be excluded only by Product Truth or proven non-applicability.

## One-source rules

- one platform/context model;
- one authoritative owner per durable fact;
- one canonical write path per state transition;
- one API contract provenance path;
- one migration history per service;
- one Product Truth identity per capability;
- one canonical decision vocabulary;
- one guard registry/assurance/set model;
- one planning root: `plans/`;
- no runtime-facing local/mock/fallback truth;
- no topic-specific governance files.

## Repository safety

Resolve the exact user-named branch and current remote SHA. Re-resolve before a write batch and after the final write. Never substitute another branch, force/reset newer work, or overwrite concurrent movement. Current task authorization controls direct writes, commits, pushes, PRs, merges, releases, and deployments; a generic document must not invent a different workflow.

## Evidence and closure

Use `governance/contracts/decision-vocabulary.json`. Evidence is candidate-bound and scope-specific. Static, product, runtime, visual, QA, security, finance, isolation, governance, CI, release, and production evidence are distinct when applicable.

Canonical SDLC lifecycle, roles, gates, evidence manifests, impact schemas, and templates live under `governance/contracts/sdlc/`. `CLOSED_WITH_EVIDENCE` requires every applicable same-candidate evidence scope and required protected approval, with no unresolved fail/blocked/pending class.

Implementation agents cannot fabricate unavailable evidence or self-grant protected approvals.

## Governance change rule

A governance change is valid only when it reduces ambiguity and preserves executable consumers. Prefer:

1. correct an existing general policy;
2. correct the PRD/platform model;
3. correct/create capability Product Truth;
4. correct an existing machine contract/registry/guard;
5. add a new governance file only when none of the above can own the rule without mixing unrelated concerns.

New general policy categories require an explicit authority change and proof that the rule cannot fit Engineering, Security, or Delivery.
