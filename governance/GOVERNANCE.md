# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

This file is the human-readable governance entry point for product meaning, engineering ownership, security boundaries, and delivery expectations. Governance guides engineering decisions; it is **not** a machine execution framework.

Do not create a parallel governance layer for a tool, agent, guard, workflow, feature, journey, surface, or team.

## Read order

Read only what is materially applicable:

1. current authorized task instruction and exact repository/ref;
2. this file;
3. `governance/product/PRD.md` and applicable Product Truth;
4. applicable Engineering/Security/Delivery policy;
5. actual contracts, code, migrations, configuration, tests, live platform state, and runtime evidence.

Do not preload the whole governance tree, every skill, every check, or every plan.

## Governance is not an enforcement runtime

There is intentionally no:

- governance guard registry;
- guard-assurance registry;
- governance-validation workflow;
- workflow registry used as executable truth;
- SDLC G0-G10 state machine;
- artifact-manifest gate bureaucracy;
- governance OPA/Rego control plane;
- machine validator whose purpose is to approve governance text.

Governance correctness is maintained through clear ownership and direct review of the relevant source. Engineering verification remains attached to executable code, contracts, data, runtime, security, and executable CI.

## Product and engineering truth

- `governance/product/PRD.md` owns platform-wide product requirements and ownership boundaries.
- `governance/product/platform-model.yaml` is the compact machine-readable platform model when a machine consumer genuinely needs one.
- Capability Product Truth under `governance/product/contracts/` is canonical only inside its declared capability and must not conflict with the PRD.
- `governance/policies/engineering.md` covers architecture, ownership, contracts, data, runtime, performance, quality, and cleanup.
- `governance/policies/security.md` covers authentication, authorization, trusted context, secrets, privacy, isolation, and security requirements.
- `governance/policies/delivery.md` contains delivery guidance only; it must not create a parallel CI/SDLC engine.

## Executable verification boundary

Guards and GitHub Actions may verify only executable engineering truth such as:

- source integrity and repository hygiene;
- architecture/import boundaries;
- API/OpenAPI/contracts/generated clients;
- migrations and data ownership;
- runtime/configuration;
- frontend bindings and accessibility;
- security/secrets/dependencies;
- executable CI workflow syntax, security, pinning, and behavior.

A guard or workflow must not exist merely to validate governance prose, agent instructions, prompt packages, approval metadata, guard catalogs, workflow catalogs, stage manifests, or evidence bookkeeping.

If a check does not add unique assurance for executable behavior or a material engineering invariant, remove it rather than wrapping it in another registry or meta-check.

## Universal execution model

Use `CODE_BASED_LEAN`:

1. pin exact repository/ref/SHA;
2. define the material product/operational outcome;
3. resolve the authoritative implementation/write owner;
4. trace the smallest complete affected vertical path;
5. diagnose the highest proven root cause;
6. change the authoritative owner first;
7. migrate affected consumers/readbacks;
8. delete obsolete or parallel behavior when safe;
9. run the smallest sufficient affected verification;
10. expand only by proven risk or a materially broader closure claim;
11. rerun invalidated evidence after later writes;
12. report only what the exact candidate proves.

“Deep”, “complete”, and “100%” raise the evidence standard. They do not authorize unrelated scans, every tool, every guard, or every workflow.

## Truth model

- **Product truth:** what a capability must do, its actors, states, invariants, and cross-surface meaning.
- **Implementation truth:** exact pinned source, contracts, configuration, migrations, and tests.
- **Runtime truth:** actual candidate-bound runtime/readback behavior.
- **Repository-platform truth:** live GitHub/platform state for the exact branch and candidate when the claim depends on it.

A plan, prompt, fixture, snapshot, generated report, or historical result cannot substitute for implementation/runtime/platform truth.

## Full-stack multi-surface rule

When an action writes state consumed elsewhere, follow the complete affected path:

`UI/action → shared controller/adapter → generated contract/client → backend/domain → database/events/integration → canonical readback → affected surfaces`

Do not call a local UI change complete when persisted or cross-surface truth is part of the outcome.

## One-source rules

- one authoritative owner per durable fact;
- one canonical write path per state transition;
- one API contract provenance path;
- one migration history per service;
- one Product Truth identity per capability;
- no runtime-facing mock/fallback truth presented as real state;
- no machine governance control plane parallel to the actual code/runtime system.

## Repository safety

Resolve the exact user-named branch and current remote SHA. Re-resolve before material write batches and before final closure. Reconcile concurrent branch movement rather than overwriting it. Never infer branch-specific truth from a default-branch search index alone.

## Evidence and closure

Evidence is candidate-bound and claim-specific. Static checks do not imply runtime success. Runtime smoke does not imply financial reconciliation. CI configuration does not imply an actual successful run.

Select only evidence scopes materially required by the affected change and requested claim. Run one broad/full verification only when closure risk, verification-authority changes, or the requested scope justifies it.

`CLOSED_WITH_EVIDENCE` means the exact candidate has no known unresolved material finding in the affected scope and the evidence required for the claimed outcome is present. Missing required evidence remains `NEEDS_EVIDENCE`; do not manufacture a pass.

## Agents and tools

Agent and tool routing is support, not authority:

- `AGENTS.md`
- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`
- `governance/skills/skills-registry.json`
- `governance/tools/agent-tool-registry.json`

Load only the smallest relevant route. Tools and adapters own no Product Truth or approval.

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual command package and is read-only unless the current human instruction explicitly authorizes package maintenance.
