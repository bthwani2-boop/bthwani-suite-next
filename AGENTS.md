# BThwani Agents

## Prime directive

Default execution mode is `CODE_BASED_LEAN`: use the smallest sufficient context, smallest safe change, and smallest relevant verification that can prove the requested claim.

Accuracy does not mean scanning everything. Scope expands only when product impact, ownership, dependency, risk, or acceptance evidence proves that expansion is required.

## Authority order

Resolve every conflict through:

```text
governance/authority/authority-precedence.json
```

The repository decision vocabulary is:

```text
governance/contracts/decision-vocabulary.json
```

Product-visible, role-sensitive, cross-surface, commercial, or workflow changes are governed by:

```text
governance/product/PRODUCT_TRUTH_POLICY.md
```

SaaS readiness and tenant-governance state are encoded in:

```text
governance/saas/saas-governance.json
governance/saas/saas-governance.schema.json
```

Adapters, skills, protocol templates, matrices, diagnostics, historical phase files, and generated artifacts may not override those sources.

## Repository truth

Use direct files from the explicitly resolved repository ref.

For GitHub or remote tasks:

- pin the exact remote repository;
- pin the exact user-named remote branch;
- resolve its current commit SHA;
- read, write, and verify that branch only;
- re-resolve the branch after writes and before the final decision;
- never substitute the default branch, another branch, local files, memory, stale diagnostics, or a prior PR.

Use `bthwani-current-workspace-authority` whenever a repository claim or write is involved.

## Product before implementation

Before implementing a new or materially changed user-visible or operational capability:

1. state the problem and evidence state;
2. identify actors and role boundaries;
3. enumerate required and explicitly excluded surfaces;
4. define states, actions, forbidden actions, and negative invariants;
5. define outcome and acceptance criteria;
6. obtain product-manager approval of the model;
7. obtain product-owner approval of functional readiness.

Engineering may challenge assumptions and contribute to discovery, but it cannot self-approve product acceptance for its own implementation.

## Default execution rules

Agents must:

- inspect only relevant files, contracts, imports, routes, manifests, and owner policies;
- reuse existing code and guards before adding abstractions, files, scripts, or dependencies;
- define explicit allowed and forbidden paths;
- serialize writes that share files, contracts, generated clients, migrations, or dependent outputs;
- run verification after the final relevant write;
- report only the evidence scope actually proven;
- stop or re-pin when the remote branch moves unexpectedly.

Agents must not:

- create evidence packs, command logs, screenshot sets, closure reports, or generated diagnostics by default;
- run full Graphify, full Nx graph, full test, full build, or full guard suites without a proven need;
- use CI to mutate source, commit, push, merge, or rewrite branches;
- treat seed, fixture, preview, fallback, or in-memory data as runtime, revenue, subscriber, tenant-isolation, or commercial proof;
- claim final closure from static checks alone.

## Task router

Choose one primary mode and add only the owner skills required by the actual risk.

| Mode | Use when | Default verification |
|---|---|---|
| `TEXT_ONLY` | wording or documentation with no behavioral claim | diff check |
| `CODE_ONLY` | bounded static code change | one targeted check |
| `PRODUCT_MODEL` | actor, problem, surface, role, outcome, or acceptance changes | Product Truth gate |
| `UI_CODE` | route, screen, state, controller, or component changes | targeted type or binding check |
| `UI_VISUAL` | visual parity or screenshots explicitly required | code check plus visual evidence |
| `API_CONTRACT` | OpenAPI, route, generated client, or consumer binding | contract and binding checks |
| `RUNTIME` | startup, Docker, ports, environment, provider, or runtime behavior | targeted runtime smoke |
| `DSH_WLT` | money, payment, ledger, settlement, payout, commission, checkout, or financial handoff | paired boundary checks and independent financial review |
| `SECURITY_PRIVACY` | auth, RBAC, sessions, secrets, PII, isolation, or sensitive configuration | targeted security verification |
| `AGENT_SYSTEM` | AGENTS, `.agents`, governance registries, skills, guards, gates, or Actions | governance and workflow gates |
| `DEPENDENCY_CI` | package, lockfile, workflow, CI, release, or toolchain changes | targeted CI and policy checks |
| `REFACTOR_CLEANUP` | move, merge, delete, deduplicate, or retire code | impact proof and affected checks |

If mixed, route by the highest actual risk, not by the strongest wording in the request.

## Tool ladder

Use the smallest sufficient tool:

1. Direct scoped repository inspection.
2. Existing focused search, package script, or guard.
3. Small idempotent script for a repeated narrow pattern.
4. LeanCTX only when active and more efficient than native tools.
5. Graphify only when ownership, routing, dependency, duplication, or dead-code relationships are unclear.
6. Nx affected only when workspace impact needs calculation.
7. Runtime commands only when runtime behavior is changed or claimed.

Graphify is a tool, not an agent. LeanCTX is optional, not a mandatory first step.

## Agent and skill model

- `MASTER_ADVISORY_SUPERVISOR` coordinates broad work, remains read/plan/verify only, and does not replace formal authorities.
- `SDLC_PROGRAM_AUTHORITY` owns stage state, transition legality, and evidence-backed exclusions.
- `PRODUCT_MANAGER_AUTHORITY` owns the problem, outcome, scope, exclusions, and product-model approval.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional readiness and product acceptance and must be distinct from the product manager.
- `UX_JOURNEY_AUTHORITY` owns journey clarity and accessibility intent when human-facing flows change.
- `ARCHITECTURE_AUTHORITY` owns boundaries, contracts, data flow, and dependency direction.
- `GOVERNANCE_CONTRACT_AUTHORITY` and `CI_WORKFLOW_AUTHORITY` are separate approving authorities with separate owner skills and identities.
- `FINANCIAL_CONTROL_AUTHORITY` owns independent WLT financial truth and handoff approval.
- `INDEPENDENT_QUALITY_AUTHORITY`, `APPLICATION_SECURITY_AUTHORITY`, and `RELEASE_AUTHORITY` own their formal approvals.
- `RISK_ACCEPTANCE_AUTHORITY` alone may accept documented residual risk and cannot be the change author.
- Engineering implements and performs developer verification; the independent reviewer owns G4 implementation verification.
- An executor, coordinator, adapter, or tool may not finally approve its own protected work.

Use `governance/agents/agent-registry.json` and `governance/skills/skills-registry.json` as machine-readable role and skill contracts.

## Evidence and decisions

Every result must map through the canonical vocabulary.

Typical scoped aliases:

- `CODE_CHECK_PASS` → `PASS` with static evidence.
- `RUNTIME_SMOKE_PASS` → `PASS` with runtime evidence.
- `UI_VISUAL_PASS` → `PASS` with visual evidence.
- `READY_FOR_PR` is deprecated; use `READY_FOR_REVIEW`.

Use `FIX_REQUIRED` when in-scope acceptance fails, `NEEDS_EVIDENCE` when the implementation claim lacks current evidence, `BLOCKED_EXTERNAL` for truly external blockers, and `PROTOCOL_VIOLATION` for authority, scope, safety, or evidence breaches.

`CLOSED_WITH_EVIDENCE` requires every applicable same-commit evidence scope: `static`, `product`, `runtime`, `visual`, `qa`, `security`, `finance`, `isolation`, `governance`, `ci`, `release`, and `production`. It also requires every required independent approval, evidence-backed stage exclusion, no open blocker, and proven GitHub enforcement for protected high-risk closure. It cannot be issued by an implementation skill or inferred from documentation, configuration, schemas, guard names, or prior workflow runs.

SaaS readiness modes and commercial activation states are not decisions. `SAAS_ACTIVE` cannot be declared until its machine-readable activation evidence is fully proven and the applicable SDLC journey reaches `CLOSED_WITH_EVIDENCE`.

## High-risk escalation

Formal SDLC routing and independent review are required for:

- authentication, authorization, RBAC, and sessions;
- PII, secrets, privacy, tenant context, and cross-tenant access;
- payments, WLT, ledger, settlement, payout, reconciliation, and commission;
- migrations and production data;
- governance contracts, CI workflows, infrastructure, release, rollback, and signing;
- critical or high vulnerabilities;
- SaaS activation, billing, metering, subscriptions, white-labeling, and custom domains;
- final release or production closure.

## Final response contract

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

Do not overclaim. State blocked or unproven dimensions explicitly.

<!-- Mappings for agent-governance-gate: Command Safety Policy , Smart Execution Model -->
