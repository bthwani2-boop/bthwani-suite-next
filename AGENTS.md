# BThwani Agents

## Prime Directive

Default mode is `CODE_BASED_LEAN`.

Agents must deliver the most accurate result with the smallest sufficient context, smallest safe diff, and smallest relevant verification.

Do not scan, read, test, build, graph, or report beyond the task's actual affected surface.

## Source of Truth

Use direct repository files as the source of truth.

Open referenced policies, skills, guards, or governance files only when they directly affect the current task.

Required references, opened on demand only:

- `.agents/COMMAND_SAFETY_POLICY.md`
- `.agents/AUTOMATED_EXECUTION_POLICY.md`
- `governance/LEAN_CODE_BASED_CHECK.md`
- `.agents/rules/bthwani-ponytail-yagni.md`
- `.agents/skills`

## Default Execution Rules

Agents must:

- inspect only directly relevant files and imports
- reuse existing code before adding new abstractions, files, or dependencies
- implement the smallest safe diff
- avoid manual file-by-file chasing as the primary method
- run one targeted verification only when useful and available
- respond with changed paths, reason for change, targeted check result, and remaining risk

Agents must not create evidence packs, handoff ZIPs, command logs, screenshot sets, visual evidence packs, closure reports, repeated full verification, or CI-style proof by default.

Agents must not run Graphify, Nx graph, full typecheck, full test, full build, full guard suite, or local CI-style gates by default.

## Task Router

Select one primary mode:

| Mode | Use when | Default verification |
|---|---|---|
| `TEXT_ONLY` | docs, wording, prompts, agent wording | `git --no-pager diff --check` |
| `CODE_ONLY` | code logic, static bindings, contracts, type safety, no runtime claim | one targeted check |
| `RUNTIME` | startup, Docker, ports, env, runtime behavior | targeted runtime smoke |
| `UI_CODE` | UI routes, screens, state, components without visual proof | targeted typecheck/guard |
| `UI_VISUAL` | visual parity or screenshots explicitly requested | code check + requested visual proof |
| `API_CONTRACT` | OpenAPI, client generation, backend/frontend binding | contract/client targeted check |
| `DSH_WLT` | DSH/WLT boundary, finance, checkout, payment, commission, handoff | paired inspection + targeted guard |
| `SECURITY_PRIVACY` | secrets, auth, privacy, sensitive config/logs | targeted security check |
| `AGENT_SYSTEM` | AGENTS.md, .agents, skills, governance | diff check; skill integrity only if structure changed |
| `DEPENDENCY_CI` | package.json, lockfile, CI, toolchain | explicit approval + targeted verification |
| `REFACTOR_CLEANUP` | move/delete/merge/deduplicate/dead code | impact check + affected validation |

If mixed, choose the highest-risk mode only when the task truly crosses boundaries.

## Escalation

Escalate beyond lean mode only when the actual touched area requires it:

- WLT/finance/payment/commission/checkout/handoff
- security/auth/privacy/secrets
- data mutation or migrations
- runtime behavior or public contracts
- dependency upgrades or CI
- broad move/delete/refactor
- unclear ownership, dependency direction, routing, or duplication
- explicit PR/release/production closure

User wording like "deep", "100%", "everything", or "no gaps" does not by itself authorize full-repo scanning. Interpret it as "be accurate within the smallest relevant scope" unless the affected surface truly requires escalation.

## Tool Ladder

Use the smallest sufficient tool:

1. Direct repo file inspection.
2. Existing package script or guard.
3. Small targeted script only when repeated or pattern-based verification is needed.
4. LeanCTX only when active and useful for scoped context; never as a mandatory first step for simple tasks.
5. Graphify only when ownership, dependency, routing, dead-code, or duplication is unclear.
6. Nx affected only after changes or when workspace impact must be scoped.
7. Runtime commands only when runtime behavior is changed or claimed.

## LeanCTX

LeanCTX is optional scoped support, not mandatory default context.

When LeanCTX is active, use it only if it reduces context or clarifies dependency/ownership. If it adds overhead, use the smallest safe native equivalent.

Do not use LeanCTX to replace real execution scripts, guards, or runtime proof when those are required.

## Graphify

Graphify is a tool, not an agent.

Use Graphify only when ownership, dependency, routing, dead-code, duplication, or multi-surface impact is unclear.

Do not run Graphify for normal focused implementation.

Do not create duplicate Graphify skills under `.claude/skills` or `.gemini/skills`.

## Closure Vocabulary

Do not overclaim.

Allowed results:

- `CODE_CHECK_PASS`
- `CODE_CHECK_FAIL`
- `DSH_WLT_CODE_CLOSURE_PASS`
- `DSH_WLT_CODE_CLOSURE_FAIL`
- `RUNTIME_SMOKE_PASS`
- `RUNTIME_SMOKE_FAIL`
- `UI_VISUAL_PASS`
- `READY_FOR_PR`
- `BLOCKED_EXTERNAL`
- `PROTOCOL_VIOLATION`

Forbidden unless actually proven:

- `RUNTIME_VERIFIED` without runtime execution
- `IMPLEMENTATION_PASS` for code-only checks
- `100% runtime` without runtime proof
- `visual pass` without visual review when visual proof was required

## BThwani YAGNI

Before changing code:

- reuse existing code first
- avoid new abstractions
- avoid new dependencies
- prefer the smallest correct diff
- never scan generated/cache/output folders

## Final Response Format

Keep final responses short:

```text
Mode:
Changed paths:
Why:
Check:
Result:
Remaining risk:
```

For blocked work:

```text
Mode:
Blocked by:
Evidence:
Smallest next action:
```
