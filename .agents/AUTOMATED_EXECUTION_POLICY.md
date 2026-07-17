# Automated Execution and Governance Policy

Status: OWNER_CONTRACT
Authority: `governance/authority/authority-precedence.json`

## Purpose

Define the smallest deterministic execution loop that preserves repository safety, branch truth, product intent, authority separation, and evidence integrity without generating diagnostic clutter or forcing full-repository work for focused tasks.

## Core model

```text
PIN REF
→ CLASSIFY TASK AND RISK
→ RESOLVE PRODUCT / DOMAIN OWNERSHIP
→ INSPECT THE SMALLEST SUFFICIENT SURFACE
→ APPLY THE SMALLEST SAFE CHANGE
→ RUN TARGETED VERIFICATION
→ RE-PIN REF
→ ISSUE A SCOPED DECISION
```

## Mandatory invariants

1. Repository, branch, and immutable commit are pinned before any repository claim or write.
2. Remote-only tasks read, write, and verify the explicitly named remote branch only.
3. Product-visible or role-sensitive changes require Product Truth before implementation readiness.
4. Existing code, contracts, guards, and scripts are reused before creating new abstractions or dependencies.
5. Verification scope is proportional to the actual risk and affected surface.
6. A validator verifies only; it must not mutate source files, commit, push, merge, or rewrite branch history.
7. `static`, `product`, `runtime`, `visual`, `qa`, `security`, `finance`, `isolation`, `governance`, `ci`, `release`, and `production` claims require their own evidence whenever applicable.
8. High-risk work cannot be finally self-approved by its executor; governance and CI approvals must also remain separate when both apply.
9. Generated outputs, caches, diagnostics, logs, screenshots, and evidence packs remain untracked unless an active canonical policy explicitly requires a durable artifact.
10. Every result maps through `governance/contracts/decision-vocabulary.json`; SaaS readiness and activation values are states, not decisions.

## Tool selection

Use the smallest sufficient tool in this order:

1. Direct scoped repository read.
2. Existing focused search, package script, or guard.
3. Small idempotent script for a repeated narrow pattern.
4. Graphify only when ownership, routing, dependency, duplication, or dead-code relationships are unclear.
5. Nx affected only when workspace impact needs computation.
6. Runtime commands only when runtime behavior is changed or claimed.

LeanCTX is optional. Use it when active and genuinely smaller or clearer than native tools. It is never a mandatory first step and never replaces authoritative repository files, guards, tests, or runtime proof.

## Task sizing

| Size | Typical scope | Required execution |
|---|---|---|
| Tiny | isolated wording or one-line safe fix | direct edit and diff check |
| Focused | one module or one owner boundary | targeted inspection and one relevant check |
| Pattern | repeated narrow change | one idempotent script or batch edit plus targeted guard |
| Cross-layer | product, API, backend, data, surface | owner contracts, ordered implementation, targeted cross-layer checks |
| High risk | finance, auth, privacy, tenant isolation, governance, CI, SaaS activation, migration, release | formal stage routing and independent approvals |

User phrases such as “deep”, “100%”, or “everything” increase the expected accuracy, not the repository scan radius by themselves. Scope expands only when dependency, ownership, risk, or acceptance evidence proves that expansion is required.

## Write rules

- Use explicit allowed paths.
- Serialize writes that share contracts, generated consumers, migrations, or the same file.
- Never overwrite concurrent remote movement blindly.
- Never force-push or reset merely to simplify reconciliation.
- Multi-file manual editing is allowed when each file has distinct semantics; a script is required only when the same mechanical transformation repeats and automation is safer.
- Do not create a script solely to satisfy a process phrase.

## Verification rules

- Run verification after the final relevant write.
- Prefer semantic validators over string-presence checks.
- Continue independent checks when practical so one failure does not hide unrelated failures.
- Aggregate failures at the end of a gate.
- Do not convert a required failure into a warning without an explicit canonical policy and expiry condition.
- Maximum retry for the same unchanged assertion is two. A third identical attempt is prohibited.
- A failing check produces `FIX_REQUIRED`, `NEEDS_EVIDENCE`, or `BLOCKED_EXTERNAL`; it does not authorize unrelated cleanup or rollback.

## Evidence rules

No persistent logs are required by default. Console exit status, concise summaries, the immutable commit SHA, and existing CI check results are sufficient for normal repository work.

Durable evidence is required only when a formal SDLC stage, release, production verification, regulatory requirement, SaaS activation, or explicit user request requires it. Durable evidence must be minimal, structured, current, tied to one commit, and excluded from source-control when policy says it is transient.

A pass in one scope never upgrades another scope. `CLOSED_WITH_EVIDENCE` requires all applicable scopes, required approvals, evidence-backed stage exclusions, no open blocker, and proven GitHub enforcement for protected high-risk closure.

## CI rules

- CI uses read-only repository permissions unless a narrowly scoped platform function requires otherwise.
- Verification workflows must not commit or push source changes.
- Workflow dispatch does not relax gate semantics.
- Governance workflows must trigger when `AGENTS.md`, `GEMINI.md`, `.agents/**`, `governance/**`, relevant guards, package scripts, or workflow files change.
- Security and main CI must include the active integration branches they are expected to verify.
- Action and tool versions must be immutable or explicitly version-locked; `latest` is forbidden in required verification paths.
- Governance-contract and CI-workflow checks must both execute when their domains change; configured jobs do not prove successful same-commit execution.

## Forbidden behavior

- Full-repository scans without a proven need.
- Scattered repeated commands when one focused command is sufficient.
- Blanket “fix all workspace occurrences” outside the task’s verified ownership boundary.
- Self-modifying GitHub Actions.
- CI commits, direct pushes, or branch rewriting.
- Treating seed, fixture, preview, local-memory, fallback, or client-supplied tenant data as runtime, isolation, financial, or commercial proof.
- Claiming `CLOSED_WITH_EVIDENCE` from code-only, schema-only, configuration-only, or documentation-only checks.
- Committing `.diagnostics/**`, `tools/registry/runs/**`, build outputs, caches, or temporary evidence.
- Mixing unrelated dependency upgrades with implementation or governance changes.

## Acceptance condition

Accepted only when execution is branch-pinned, scope-bounded, product-aware, authority-separated, verification-only in CI, aligned with complete evidence scopes, fail-closed for SaaS and tenant claims, free of mandatory tool contradictions, and capable of producing one canonical scoped decision without tracked diagnostic noise.
