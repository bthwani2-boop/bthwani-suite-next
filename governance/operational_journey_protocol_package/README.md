# Operational Journey Protocol Support Package

Status: DERIVED_SUPPORT
Authority: `governance/authority/authority-precedence.json`

This package provides reusable execution matrices, sequencing guidance, validation support and SDLC support for operational journeys. It is **not** a self-contained, final, canonical or non-bypassable authority.

## Authority boundary

Interpret every file in this package under, in order of applicable precedence:

1. current-task instruction and authorization;
2. `governance/authority/authority-precedence.json`;
3. `AGENTS.md`;
4. applicable active canonical governance and machine-readable contracts;
5. current implementation and same-commit runtime evidence for claims about what actually exists or runs.

No file here may create product policy, ownership, approval, release authority or final closure on its own.

## Contents

- `00_INDEX_AND_COVERAGE.md` — package routing, classification and coverage.
- `01_COMMAND_INPUTS_RESULTS.md` — command/result support.
- `02_REMOTE_REF_SOURCE_GIT_GATES.md` — remote-ref and Git evidence support.
- `03_SCOPE_TOPOLOGY_OWNERSHIP_DONOR.md` — scope/topology/ownership guidance.
- `04_MATRICES_PROJECT_SURFACE_CONTROL_BINDING.md` — project/surface/control binding matrices.
- `05_MATRICES_BACKEND_DATABASE_API_SECURITY.md` — backend/database/API/security matrices.
- `06_ORGANIZATION_PERFORMANCE_CLEANUP_SEQUENCE.md` — organization, performance and cleanup guidance.
- `07_VERIFICATION_RUNTIME_CI_PR.md` — verification/runtime/CI/review guidance.
- `08_IMPLEMENTATION_ANTIGRAVITY_REPORT.md` — implementation/reporting guidance.
- `09_ACCEPTANCE_QUICK_COMMAND_CLOSE.md` — acceptance/closure support.
- `10_EXECUTION_PLAN_NO_SKIP_GATE.md` — no-skip execution planning support.
- `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md` — code-first multi-surface support.
- `12_SLICE_BY_SLICE_JOURNEY_SEQUENCING.md` — vertical-slice sequencing support.
- `sdlc/` — derived SDLC schemas/profiles/templates/validators pending consolidation with canonical release governance.
- `annexes/` — conditional support/annex material whose applicability is controlled by higher authority.

The separate SMSM DSH/WLT journey plan now lives at `tools/plans/smsm-dsh-wlt-journeys/` and remains derived planning material.

## Usage rule

Open only files materially relevant to the current task. Do not load or run the entire package by default. Any older result vocabulary must be mapped to `governance/contracts/decision-vocabulary.json` before being reported as a final decision.

## Verification rule

- validators verify only; they do not repair source or grant approvals;
- evidence must match the immutable commit claimed;
- static checks cannot imply runtime, visual, QA, security, finance, release, production or final closure;
- templates, plans, matrices and historical traces are not evidence that implementation exists;
- `CLOSED_WITH_EVIDENCE` remains controlled by the canonical decision contract and applicable approval authorities.
