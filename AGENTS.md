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

## Delegated implementation

Two mutually exclusive external implementation backends are registered. The current authorized task selects exactly one backend and one orchestrator route for each bounded work unit.

OpenCode/NVIDIA routes:

- `Codex orchestrator → OpenCode/NVIDIA implementer → Codex verification`.
- `Claude orchestrator → OpenCode/NVIDIA implementer → Claude verification`.
- Codex uses `tools/scripts/invoke-opencode-implementer.mjs --orchestrator codex`; Claude uses `tools/scripts/invoke-claude-opencode-implementer.mjs`.
- Approved workers are fixed by the relay: `bthwani-agent-6` / Nemotron Ultra, `bthwani-agent-7` / GLM-5.2, and `bthwani-agent-8` / Nemotron Super.
- The relay pins exact branch/HEAD, requires bounded read/write/forbidden paths, rejects dirty overlap with declared scope, preserves unrelated dirty work, enforces one active delegation, and validates post-run changed paths.
- OpenCode runs with a default-deny runtime policy and `--pure`; the worker has path-scoped read/list/edit only. Shell, git, web, task, skill, LSP, external-directory, interactive, commit, push, merge, release, approval, and scope expansion are denied.
- The selected orchestrator owns diagnosis, scope, the brief, complete diff review, branch/head re-pinning, developer verification, rework, commit, and push.

Antigravity/Gemini routes remain available only when a current authorized task explicitly selects them:

- `Codex orchestrator → Antigravity CLI (agy) implementer using a Gemini model → Codex verification`.
- `Claude orchestrator → Antigravity CLI (agy) implementer using a Gemini model → Claude verification`.
- Codex uses `tools/scripts/invoke-antigravity-implementer.mjs --orchestrator codex`; Claude uses `tools/scripts/invoke-claude-antigravity-implementer.mjs`.
- Antigravity remains implementation-only and uses the locally authenticated Antigravity subscription session.

Exactly one delegated implementation route may own a work unit. Codex and Claude must not share or concurrently coordinate the same delegated work unit. Neither backend owns product truth, formal approval, protected independent review, release, production, or closure authority.

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
8. OpenCodeReview for a bounded diff, commit, or range;
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
