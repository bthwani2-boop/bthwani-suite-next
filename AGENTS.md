# BThwani Agents

## Authority

`AGENTS.md` is the default repository instruction entry point. Resolve conflicts through:

1. `governance/authority/authority-precedence.json`
2. active canonical governance and machine-readable contracts
3. the smallest applicable governed skill
4. thin tool adapters

Decision vocabulary: `governance/contracts/decision-vocabulary.json`.
Skill registry: `governance/skills/skills-registry.json`.
Agent registry: `governance/agents/agent-registry.json`.

## Default execution model

Use `CODE_BASED_LEAN`:

- inspect the smallest complete surface that can reveal the root cause;
- make the smallest safe change that closes the requested scope;
- verify only the affected behavior and actual risk;
- expand scope only when ownership, dependencies, product impact, or safety evidence requires it.

Words such as "deep", "complete", or "100%" increase accuracy requirements. They do not authorize an automatic full-repository scan.

## Repository truth

For local work, use the active local branch unless the user names another target.

For GitHub or remote work:

- resolve the exact repository and user-named branch;
- pin its current commit SHA before claims or writes;
- use that ref only, never the default branch as a substitute;
- re-resolve before each write batch and after the final push;
- stop and reconcile safely if the target branch moves;
- never force-push, reset, or overwrite newer work merely to simplify execution.

Use `bthwani-current-workspace-authority` only when repository or ref truth is involved.

## Scope rules

Agents must:

- identify the owner of truth, allowed paths, forbidden paths, consumers, contracts, data, and tests actually affected;
- reuse existing code, scripts, and focused guards before adding files or dependencies;
- keep generated diagnostics, logs, screenshots, evidence packs, and temporary task state untracked by default;
- run verification after the final relevant write;
- report only what current evidence proves.

Agents must not:

- read every skill, governance file, journey, or registry by default;
- run full Graphify, full Nx graph, full typecheck, full build, full test, full guard suites, or integrated runtime without proven need;
- create scripts or reports merely to satisfy process wording;
- treat fixtures, seeds, previews, fallbacks, or in-memory data as production or commercial proof;
- let CI mutate, commit, push, merge, or rewrite source;
- archive removed material when Git history already preserves it.

## Task modes

Choose one primary mode. Add only the owner skill required by real risk.

| Mode | Default verification |
| --- | --- |
| `TEXT_ONLY` | direct review and diff check |
| `CODE_ONLY` | one targeted type, lint, test, or guard check |
| `PRODUCT_MODEL` | product problem, actors, states, surfaces, exclusions, and acceptance |
| `UI_CODE` | affected route, state, controller, or package check |
| `UI_VISUAL` | code check; visual proof only when explicitly required |
| `API_CONTRACT` | affected contract, route, generated client, and consumer binding |
| `RUNTIME` | targeted startup or smoke proof |
| `DSH_WLT` | paired financial-boundary checks and independent financial evidence |
| `SECURITY_PRIVACY` | targeted auth, isolation, secrets, or privacy verification |
| `AGENT_SYSTEM` | affected agent, registry, governance, or workflow guards |
| `DEPENDENCY_CI` | affected lockfile, package, workflow, or policy checks |
| `REFACTOR_CLEANUP` | reference impact proof plus affected checks |

## Tool ladder

Use tools in this order:

1. direct scoped file inspection;
2. focused search or an existing package command;
3. one registered targeted guard;
4. a small idempotent helper for a proven repeated pattern;
5. Nx affected when workspace impact must be computed;
6. Graphify only when ownership, dependency, duplication, or dead-code relationships remain unclear;
7. runtime tooling only when runtime behavior changes or is claimed.

LeanCTX and Graphify are optional tools, not mandatory first steps and not authorities.

## Authorities and protected work

The logical authorities remain separate:

- `SDLC_PROGRAM_AUTHORITY` owns formal stage state;
- product management and product acceptance own product model and readiness;
- `GOVERNANCE_CONTRACT_AUTHORITY` owns governance-contract approval;
- `CI_WORKFLOW_AUTHORITY` owns CI-workflow approval;
- the independent reviewer owns protected implementation review;
- `FINANCIAL_CONTROL_AUTHORITY` owns finance approval;
- security, QA, release, and production authorities own their evidence domains;
- `RISK_ACCEPTANCE_AUTHORITY` alone may accept documented residual risk.

The repository's sole owner may fulfill eligible human roles under `governance/authority/single-owner-mode.json`, but an execution agent cannot impersonate the owner, approve unseen work, waive failures, or self-grant protected approval.

Formal routing and independent evidence are required for authentication, authorization, sessions, PII, secrets, isolation, finance, migrations, production data, critical vulnerabilities, governance, CI, release, deployment, and final closure.

## Evidence and decisions

Use targeted evidence proportional to the claim. Static success does not prove runtime, visual, security, finance, isolation, release, or production behavior.

Canonical outcomes include `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, `READY_FOR_REVIEW`, and `PROTOCOL_VIOLATION`.

`CLOSED_WITH_EVIDENCE` requires every applicable same-commit scope: `static`, `product`, `runtime`, `visual`, `qa`, `security`, `finance`, `isolation`, `governance`, `ci`, `release`, and `production`, plus all applicable approvals and no unresolved blocker.

## Final response

Report:

```text
repository_mode:
repository:
target_branch:
resolved_commit_sha:
mode:
changed_paths:
checks:
decision:
remaining_risks:
```

Do not overclaim.

<!-- Mappings for agent-governance-gate: Command Safety Policy , Smart Execution Model -->
