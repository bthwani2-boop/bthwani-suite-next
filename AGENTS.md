# BThwani Agents

`AGENTS.md` is a thin coding-agent adapter. Human developers and AI agents use the same governance entry point: `governance/GOVERNANCE.md`.

## Authority

Resolve each task in this order:

1. current authorized task instruction;
2. `governance/authority/authority-precedence.json`;
3. `governance/GOVERNANCE.md`;
4. `governance/product/PRD.md` and the applicable general policy;
5. applicable Product Truth and machine contracts;
6. exact pinned implementation/runtime evidence.

Decision vocabulary: `governance/contracts/decision-vocabulary.json`.
Skill registry: `governance/skills/skills-registry.json`.
Agent registry: `governance/agents/agent-registry.json`.
Conditional tool registry: `governance/tools/agent-tool-registry.json`.

## Execution

Use `CODE_BASED_LEAN`:

- pin the exact repository, user-named branch/ref, and remote SHA;
- inspect the smallest complete affected vertical path;
- identify the authoritative truth/write owner;
- fix root cause at that owner;
- migrate every affected consumer/readback;
- remove obsolete or parallel behavior when safe;
- run the smallest sufficient affected verification and expand only by proven risk;
- re-verify after the final relevant write;
- report only what the exact candidate proves.

Do not preload the full governance tree, Product Truth catalog, skill set, tool set, plans, or guard suite. “Deep”, “complete”, and “100%” raise the evidence standard; they do not justify unrelated scans or unsupported claims.

## Remote repository safety

Re-resolve the user-named branch before every logical write batch and after the final write. Reconcile unexpected branch movement. Never substitute another branch, force/reset newer work, or perform merge/release/deploy without current-task authority.

## Full-stack multi-surface work

For product behavior read `governance/product/PRD.md` plus the applicable `governance/product/contracts/*.product-truth.json` when registered. Trace:

`surface → shared controller/adapter → generated contract → backend/domain → persistence/events/integration → canonical readback → every affected required surface`

A local UI success is not closure when persisted or cross-surface truth is required.

## Security and finance

Use `governance/policies/security.md` whenever authentication, authorization, sessions, trusted context, PII, secrets, provider credentials, isolation, or privileged access is affected.

WLT remains the sole authoritative financial-truth owner. DSH and surfaces use only bounded WLT-backed operations/projections permitted by current contracts.

## Evidence and decisions

Use `governance/policies/delivery.md`. Evidence is candidate-bound and scope-specific. Static success never implies runtime, visual, QA, security, finance, isolation, CI, release, production, or final-closure success.

An execution agent cannot impersonate the repository owner or self-grant protected approval.

## Plans, skills, and tools

Planning artifacts live only under `plans/`. `.agents/INDEX.md` is the only derived routing index. Load it only when routing is not obvious. Skills live under `.agents/skills/`; conditional tool policies live under `.agents/tools/`.

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

Tools and adapters own no product truth or approval.

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

<!-- Mappings for agent-governance-gate: Command Safety Policy , Smart Execution Model -->
