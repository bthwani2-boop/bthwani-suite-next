# BThwani Agents

`AGENTS.md` is a thin execution adapter for coding agents. It does not define a separate governance model. Humans and agents follow the same entry point: `governance/GOVERNANCE.md`.

## Authority

Resolve authority in this order:

1. current authorized task instruction;
2. `governance/authority/authority-precedence.json`;
3. `governance/GOVERNANCE.md`;
4. `governance/product/PRD.md` and the applicable general policy;
5. applicable Product Truth and machine contracts;
6. current pinned implementation/runtime evidence.

Decision vocabulary: `governance/contracts/decision-vocabulary.json`.
Skill registry: `governance/skills/skills-registry.json`.
Agent registry: `governance/agents/agent-registry.json`.
Conditional tool registry: `governance/tools/agent-tool-registry.json`.

## Implementation truth

For what code currently does, use the exact pinned branch/commit, current contracts/source/configuration/migrations/tests, then targeted runtime evidence when runtime behavior is claimed.

## Authority truth

For who owns product semantics, policy, data, financial truth, contracts, trusted context, approval, or evidence, use the authority registry and unified governance/PRD/policies. Implementation can prove conformity but cannot create higher authority.

## Execution model

Use `CODE_BASED_LEAN`:

- inspect the smallest complete affected vertical path;
- identify the authoritative truth/write owner;
- fix root cause at that owner;
- migrate all affected consumers/readbacks;
- remove obsolete/parallel behavior when safe;
- run the smallest sufficient affected verification and expand only by proven risk;
- re-verify after the final relevant write;
- report only what the exact candidate proves.

Do not read every governance file, Product Truth, skill, registry, or tool by default. Do not run full Graphify, full Nx, full build/test/guard/runtime suites without proven need.

## Repository truth

For GitHub/remote work:

- resolve the exact repository and user-named branch;
- pin its current remote SHA;
- re-resolve before a logical write batch and after the final write;
- reconcile unexpected branch movement safely;
- never force-push, hard-reset newer work, substitute the default branch, auto-create a task branch, merge, release, or deploy without current-task authority.

## Product/full-stack rule

For any product change, read `governance/product/PRD.md` plus the applicable `governance/product/contracts/*.product-truth.json` when registered. Trace the complete affected path across UI, shared code, generated contracts, backend/domain, persistence/events/integrations and every required consumer surface. A UI success without canonical persisted readback is not full-stack closure.

## Security/finance rule

Load `governance/policies/security.md` whenever authentication, authorization, sessions, trusted context, PII, secrets, provider credentials, isolation, or privileged service access is affected.

WLT remains the sole authoritative financial-truth owner. DSH/surfaces may use only the bounded WLT-backed access/projections defined by current contracts.

## Evidence

Use `governance/policies/delivery.md`. Static success does not imply runtime, visual, QA, security, finance, isolation, CI, release or production success. `CLOSED_WITH_EVIDENCE` requires all applicable same-commit scopes and required approvals.

An execution agent cannot impersonate the repository owner or self-grant protected approval.

## Tools and skills

Skills and tools are conditional implementation aids, not separate policy layers. Load the smallest applicable skill/tool only when the task/risk requires it. Tool output is advisory unless a registered contract defines stronger assurance.

Tool ladder:

1. direct scoped inspection;
2. focused search/existing command;
3. one targeted registered guard;
4. a small idempotent helper for proven repetition;
5. Nx affected when workspace impact must be computed;
6. LeanCTX when it materially reduces repeated reads/noise;
7. Graphify only when ownership/dependency/duplication remains unresolved;
8. OpenCodeReview for a bounded diff/commit/range;
9. runtime tooling only for runtime-changing/runtime-claimed work.

## Final response

Report:

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

<!-- lean-ctx -->
## lean-ctx

lean-ctx is active — the MCP tools replace native equivalents.
Full rules: LEAN-CTX.md (open on demand — do not auto-load).
<!-- /lean-ctx -->
