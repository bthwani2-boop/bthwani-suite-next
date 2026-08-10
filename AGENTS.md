# BThwani Agents

`AGENTS.md` is a thin coding-agent adapter. Human developers and AI agents use the same authority and execution model in `governance/GOVERNANCE.md`.

## Authority

Resolve each task in this order:

1. current authorized task instruction;
2. `governance/authority/authority-precedence.json`;
3. `governance/GOVERNANCE.md`;
4. `governance/product/PRD.md` and applicable Engineering/Security/Delivery policy;
5. applicable capability Product Truth and machine contracts;
6. exact pinned implementation and runtime evidence.

Registries:

- decisions: `governance/contracts/decision-vocabulary.json`
- agents: `governance/agents/agent-registry.json`
- skills: `governance/skills/skills-registry.json`
- tools: `governance/tools/agent-tool-registry.json`
- guards: `governance/guards/guard-registry.json`
- workflows: `governance/github/workflow-registry.json`

## Truth boundaries

**Authority truth** determines who owns policy, product semantics, writes, approvals, and evidence rules.

**Product truth** determines capability behavior, actors, states, surfaces, invariants, and acceptance.

**Implementation truth** is the exact pinned source, contracts, configuration, migrations, and tests.

**Runtime truth** is actual candidate-bound runtime/readback evidence. No other truth class may be inferred from a plan, prompt, report, fixture, or historical result.

## Execution

Use `CODE_BASED_LEAN`:

- pin the exact repository, user-named branch/ref, and remote SHA;
- inspect the smallest complete affected vertical path;
- identify the authoritative truth/write owner;
- fix root cause at that owner;
- migrate every affected consumer/readback;
- remove obsolete or parallel behavior when safe;
- run the smallest sufficient affected verification and expand only by proven risk;
- re-run invalidated evidence after the final relevant write;
- report only what the exact candidate proves.

“Deep”, “complete”, and “100%” raise the evidence standard; they do not justify unrelated scans, every tool, or unsupported completeness claims.

## Repository safety

Re-resolve the user-named branch before every logical write batch and after the final write. Reconcile unexpected branch movement. Never substitute another branch, force/reset newer work, or merge/release/deploy without current-task authority.

## Full-stack multi-surface

For product behavior read `governance/product/PRD.md` plus the applicable `governance/product/contracts/*.product-truth.json`. Trace the full affected path:

`surface → shared controller/adapter → generated contract/client → backend/domain → persistence/events/integration → canonical readback → every affected required surface`

A local UI success is not closure when persisted or cross-surface truth is required.

## Security and finance

Use `governance/policies/security.md` whenever authentication, authorization, sessions, trusted context, PII, secrets, provider credentials, isolation, or privileged access is affected.

WLT remains the authoritative financial-truth owner. DSH and surfaces may use only bounded WLT-backed operations/projections permitted by current contracts.

## Evidence and approvals

Use `governance/policies/delivery.md`, `governance/contracts/sdlc/`, and `governance/contracts/decision-vocabulary.json`. Evidence is candidate-bound and scope-specific. Static success never implies runtime, visual, QA, security, finance, isolation, CI, release, production, or final closure.

Logical approval authorities remain separated by the agent registry. An execution agent cannot impersonate the owner or self-grant a protected approval.

## Plans, skills, and tools

Planning artifacts live only under `plans/`. `.agents/INDEX.md` is the only derived routing index. Skills live under `.agents/skills/`; conditional tool policies live under `.agents/tools/`.

Tool ladder:

1. direct scoped inspection;
2. focused search or existing command;
3. one targeted registered guard;
4. small idempotent helper for proven repetition;
5. Nx affected when workspace impact must be computed;
6. LeanCTX only when it materially reduces repeated reads/noise;
7. Graphify only when ownership/dependency/duplication remains unresolved;
8. OpenCodeReview for a bounded diff/commit/range;
9. runtime tooling only for runtime-changing or runtime-claimed work.

Tools and adapters own no Product Truth or approval.

## Final response

```text
repository:
target_branch:
resolved_commit_sha:
changed_paths:
checks_and_evidence:
decision:
remaining_risks_or_missing_evidence:
```

Do not overclaim.
