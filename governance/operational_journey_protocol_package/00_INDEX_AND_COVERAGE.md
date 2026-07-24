# 00 — Operational Journey Protocol Package Index

Status: DERIVED_SUPPORT
Authority: `governance/authority/authority-precedence.json`

## Purpose

Provide reusable operational matrices, execution sequencing, verification guidance, and SDLC support for broad multi-surface journeys.

This package is not self-contained authority. It must be interpreted under:

1. `governance/authority/authority-precedence.json`
2. `AGENTS.md`
3. applicable active canonical governance
4. applicable Product Truth, security, finance, and SDLC owner contracts

No file in this package may override a higher authority, live service manifest, current OpenAPI contract, database migration, route, bound surface, test, or same-commit runtime evidence.

## Package contents

| Path | Purpose |
|---|---|
| `00_INDEX_AND_COVERAGE.md` | Package routing and authority boundary. |
| `01_COMMAND_INPUTS_RESULTS.md` | Input and result guidance. |
| `02_REMOTE_REF_SOURCE_GIT_GATES.md` | Remote ref and Git evidence guidance. |
| `03_SCOPE_TOPOLOGY_OWNERSHIP_DONOR.md` | Scope, topology, ownership, and donor boundaries. |
| `04_MATRICES_PROJECT_SURFACE_CONTROL_BINDING.md` | Project, surface, control-panel, and binding matrices. |
| `05_MATRICES_BACKEND_DATABASE_API_SECURITY.md` | Backend, database, API, security, and visibility matrices. |
| `06_ORGANIZATION_PERFORMANCE_CLEANUP_SEQUENCE.md` | Organization, sequence, cleanup, and performance guidance. |
| `07_VERIFICATION_RUNTIME_CI_PR.md` | Verification, runtime, CI, and review guidance. |
| `08_IMPLEMENTATION_ANTIGRAVITY_REPORT.md` | Implementation and concise reporting guidance. |
| `09_ACCEPTANCE_QUICK_COMMAND_CLOSE.md` | Acceptance and closure guidance. |
| `10_EXECUTION_PLAN_NO_SKIP_GATE.md` | Execution-plan no-skip support. |
| `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md` | Code-first multi-surface support. |
| `12_SLICE_BY_SLICE_JOURNEY_SEQUENCING.md` | Multi-journey selection and vertical-slice-by-slice closure sequencing. |
| `sdlc/` | Derived stage-gate schemas, profiles, templates, and validators. |
| `annexes/` | Conditional annexes that apply only through the authority registry. |
| `LEGACY_SOURCE_TRACE.md` | Historical source trace only. |

## Known vocabulary drift

`governance/contracts/decision-vocabulary.json` is the canonical result vocabulary (`PASS`, `FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `READY_FOR_REVIEW`, `OUT_OF_SCOPE_FOR_THIS_JOURNEY`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `PROTOCOL_VIOLATION`, `CLOSED_WITH_EVIDENCE`). Files `01_COMMAND_INPUTS_RESULTS.md`, `02_REMOTE_REF_SOURCE_GIT_GATES.md`, `07_VERIFICATION_RUNTIME_CI_PR.md`, `08_IMPLEMENTATION_ANTIGRAVITY_REPORT.md`, and `09_ACCEPTANCE_QUICK_COMMAND_CLOSE.md` still use an earlier result vocabulary (`ANALYSIS_PASS`, `IMPLEMENTATION_PASS`, `DO_NOT_MERGE`, `MERGE_READY`, `BLOCKED_NEEDS_EVIDENCE`) that predates the current canonical contract. `BLOCKED_NEEDS_EVIDENCE` is a deprecated alias of `NEEDS_EVIDENCE`; `ANALYSIS_PASS`, `IMPLEMENTATION_PASS`, `DO_NOT_MERGE`, and `MERGE_READY` are not registered in the canonical file at all. Until those five files are rewritten, any output produced under them must still be mapped to the canonical vocabulary before it is reported as a final decision — the older terms are internal package shorthand, not the governing contract. `12_SLICE_BY_SLICE_JOURNEY_SEQUENCING.md` uses the canonical vocabulary directly.

## Use rule

Open only the files relevant to the task. Do not load the full package by default.

For a governed implementation journey:

```text
Pin remote repository, branch, and commit
→ resolve Product Truth when applicable
→ resolve owner boundaries and risk
→ select relevant matrices
→ implement in dependency order
→ run targeted guards and evidence scopes
→ apply formal SDLC stages when required
→ map the result through the canonical decision vocabulary
```

## Product Truth integration

A user-visible, role-sensitive, cross-surface, commercial, or workflow capability must have a Product Truth contract before implementation readiness. This package may help enumerate surfaces and bindings, but it cannot approve the problem model or product acceptance.

Product authority is owned by:

```text
governance/product/PRODUCT_TRUTH_POLICY.md
```

## Decision integration

All package result labels are aliases or supporting descriptions only. The canonical vocabulary is:

```text
governance/contracts/decision-vocabulary.json
```

A package matrix or document may not issue `CLOSED_WITH_EVIDENCE` by itself.

## Historical-source rule

Historical source files and traces may be used to discover intent, but they are never current implementation truth. Branch names, dates, phase claims, local paths, old readiness states, and historical pass labels must not be copied into active evidence without current verification.

## SaaS boundary

The SaaS readiness annex is conditional and does not authorize SaaS implementation or commercial activation. SaaS remains outside the current execution scope unless explicitly authorized in a separate task.

## Verification rule

- Validators verify only; they do not mutate source or stage state.
- Evidence must belong to the same immutable commit as the claim.
- Static checks cannot imply runtime, visual, QA, security, release, production, or final closure.
- Independent approvals remain owned by their formal authorities.
- Generated diagnostics and command logs are not committed by default.

## Acceptance condition

Accepted only when this package is treated as derived support, higher authority is explicit, Product Truth and formal authorities cannot be bypassed, historical claims cannot override live state, and every result maps to the canonical decision vocabulary.
