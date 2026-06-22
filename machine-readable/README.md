# machine-readable

Execution governance package for `bthwani-suite-next` Topics/Slices.

## Purpose

This directory is a compact, authoritative, AI-readable governance layer for all Topic/Slice execution in this repository. It does NOT replace the code, tests, or evidence packs — it navigates them, defines their standards, and tracks execution state.

**This package is the source of governance, not the source of truth.** The live code and evidence files always win.

## Canonical Files (10)

| File | Purpose |
| ---- | ------- |
| `governance.json` | Topic definition, Full-Stack Multi-Surface model, real experience closure standard, closure states, CI policy, ownership rules |
| `repositories.json` | New repo, donor repo, branch policy, source-of-truth hierarchy, donor extraction decisions |
| `architecture-map.json` | Services, apps, packages, ports, Docker, shared brains, control-panel sections with slice mapping |
| `topic-registry.json` | Per-Topic: full-stack definition, surfaces, control-panel sections, states, real experience requirements, blockers, status |
| `surface-ownership-map.json` | Each surface: ownership rules, allowed/forbidden imports, API policy, state policy, financial policy, required guards |
| `dsh-wlt-boundary.json` | DSH vs WLT financial boundary, allowed references, forbidden mutations, guards, violation register |
| `verification-gates.json` | All gates with commands, blocking status, current results, CI policy, v2 evidence standard |
| `evidence-index.json` | Evidence paths, statuses, supports_claims, contradictions resolved, stale files retired |
| `execution-status.json` | Per-Topic execution status, blockers, next allowed actions, evidence quality notes |
| `README.md` | This file |

## Guard-Required Supporting Files (DO NOT DELETE OR RENAME)

These files are read directly by active guard scripts and must remain in place. They are documented in `governance.json#additional_file_justification`.

| File | Guard(s) |
| ---- | -------- |
| `control-panel-design/control_panel_design_gate.json` | `control-panel-design-gate.mjs`, `app-shell-control-panel-contract-gate.mjs` |
| `control-panel-design/control_panel_section_archetypes.json` | same |
| `control-panel-design/control_panel_service_ownership_matrix.json` | same |
| `control-panel-design/control_panel_design_skeleton_reference.json` | same |
| `control-panel-design/control_panel_app_shell_audit.json` | `app-shell-control-panel-contract-gate.mjs` |
| `dsh-wlt/dsh_001_cross_surface_dependency_map.json` | `dsh-service-activation.mjs`, `dsh-001-cross-surface-dependency-map.mjs` |

## Trust Order

1. **GitHub Remote + Live Code + Evidence** — highest authority
2. **Guards + Tests + Runtime Evidence** — execution proof
3. **These machine-readable files** — governance layer
4. **General docs (README, governance md)** — human reference

Any conflict between these files and the live code or evidence means these files need updating — the code wins.

## Topic-Based Full-Stack Multi-Surface Model

Every DSH slice is a **Topic** — a full-stack operational unit that closes simultaneously across:

- Backend handler (Go)
- Database migration + seeds
- OpenAPI contract
- Generated typed client
- Frontend shared brain (all business logic here)
- All required surface UIs (UI-only, no logic in surfaces)
- All required control-panel sections (named explicitly)
- Guards + tests + runtime evidence
- Visual evidence per surface per required state

A Topic is NOT a single screen, a UI component, or a technical wiring proof.

## Real Experience Closure Standard (v2 — effective 2026-06-22)

Every required surface must show all required states with visual evidence:

**Required surfaces:** states explicitly declared by the Topic. Authenticated surfaces normally require loading, success, empty, error, and permission_denied. Public read surfaces use service_unavailable/offline instead of a fabricated permission state.
**Read-only surfaces:** loading, success, error

What does NOT count as closure:
- Success-only screenshots
- Context-only surfaces without error/loading evidence
- Unit tests alone (tests + screenshots both required)
- Mock/demo/preview data in screenshots
- Technical wiring without rendered UI

## Shared Brain Rule

All business logic, controllers, view-models, and state machines live in:
- **DSH:** `services/dsh/frontend/shared/`
- **WLT-for-DSH:** `services/wlt/frontend/dsh/shared/`

Surfaces in `services/<service>/frontend/<surface>/` are UI-only. Any business logic in a surface = OWNERSHIP_VIOLATION = FIX_REQUIRED.

## DSH/WLT Boundary

WLT is the sole owner of financial truth:
- `services/wlt/` owns: wallet, payment, refund, settlement, commission, COD, ledger, reconciliation
- `services/dsh/` may only display: paymentSessionId, paymentStatus, financialReference, settlementStatus (read-only labels)
- Financial mutation outside `services/wlt/` = DO_NOT_MERGE

## Current Execution State

**Machine-readable result:** `MACHINE_READABLE_FIX_REQUIRED`

The retired CSV matrices are no longer guard dependencies. Matrix v3 compatibility and the performance baseline validate canonical JSON. DSH-001 remains `FIX_REQUIRED`: all five surfaces are required, only 5 of 25 state screenshots currently match the evidence contract, and authenticated store-domain actions are not implemented.

| Topic | Status | Notes |
| ----- | ------ | ----- |
| DSH-000 | RUNTIME_VERIFIED | Foundation gates all pass |
| WLT-000 | RUNTIME_VERIFIED | Reference endpoints only — no mutations |
| DSH-001 | FIX_REQUIRED | TECHNICAL_WIRING_VERIFIED; REAL_EXPERIENCE_CLOSURE_v2 failed because required per-surface visual states are missing. |
| DSH-002 | PARTIAL | app-client verified. control-panel NOT_STARTED — needs approval. |
| DSH-003 to DSH-010 | NOT_STARTED | See topic-registry.json for dependencies |

**Next approved action:** STOP — DSH-001 real experience rework is required before DSH-002 or DSH-003.

## Contradiction Policy

If any JSON file conflicts with actual code or evidence:
1. Trust the code/evidence.
2. Update the JSON to reflect reality.
3. Document the fix in `evidence-index.json#contradictions_resolved`.

## Last Forensic Audit

Date: 2026-06-22
Branch: starting-implementing-slices
Head at audit: d422caf7c6bec356305ff375863965e25295f202 (implementation baseline; refresh after verification)
New repo local: C:\bthwani-suite-next
Donor repo local: C:\bthwani-suite (READ ONLY, branch: realtest)
Standard applied: REAL_EXPERIENCE_CLOSURE_v2
