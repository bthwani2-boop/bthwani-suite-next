# machine-readable

Machine-readable source of truth for bthwani-suite-next Topics/Slices.

## Purpose

These files serve as a compact, authoritative, AI-readable summary of the execution
state, architecture contracts, governance rules, and evidence index for this repository.
They are NOT a substitute for the code, tests, or evidence pack — they are a
navigational layer on top of them.

## Files

| File | Purpose |
|------|---------|
| `governance.json` | Full-Stack Multi-Surface rules, Topic definition, closure conditions |
| `repositories.json` | New repo, donor repo, branch policy, source-of-truth hierarchy |
| `architecture-map.json` | Services, apps, packages, ports, Docker, shared brains, control-panel sections |
| `topic-registry.json` | Per-Topic/Slice: surfaces, backend, DB, API, gates, status |
| `surface-ownership-map.json` | Each surface: ownership, shared brain, allowed/forbidden patterns |
| `dsh-wlt-boundary.json` | DSH vs WLT ownership boundary, allowed references, guards |
| `verification-gates.json` | All gates, commands, blocking status, CI policy |
| `evidence-index.json` | Evidence paths, statuses, contradictions, last-verified sources |
| `execution-status.json` | Per-Topic execution status, blockers, next allowed actions |

## Guard-Required Files (DO NOT DELETE OR RENAME)

These files are read directly by active guard scripts and must remain in place:

| File | Guard(s) |
|------|---------|
| `slice_execution_master_matrix_v3.csv` | `guard-slice-master-matrix-v3.mjs`, `performance-runtime-baseline.mjs` |
| `slice_execution_master_matrix.csv` | `guard-slice-master-matrix-v2.mjs` |
| `control-panel-design/control_panel_design_gate.json` | `control-panel-design-gate.mjs`, `app-shell-control-panel-contract-gate.mjs` |
| `control-panel-design/control_panel_section_archetypes.json` | same |
| `control-panel-design/control_panel_service_ownership_matrix.json` | same |
| `control-panel-design/control_panel_design_skeleton_reference.json` | same |
| `dsh-wlt/dsh_001_cross_surface_dependency_map.json` | `dsh-service-activation.mjs`, `dsh-001-cross-surface-dependency-map.mjs` |

## Trust Order

1. **GitHub Remote + Live Code + Evidence** — highest authority
2. **Guards + Tests + Runtime Evidence** — execution proof
3. **These machine-readable files** — navigational summary
4. **General docs (README, governance md)** — human reference

Any conflict between these files and the live code or evidence means
these files need updating — the code wins.

## Contradiction Policy

If a field in any JSON file conflicts with the actual code, evidence, or git history:
1. Trust the code/evidence.
2. Update this file to reflect reality.
3. Document the fix in the relevant `evidence-index.json` entry.

## Last Forensic Audit

Date: 2026-06-22
Branch: starting-implementing-slices
Head at audit: a401420 (tip at time of analysis)
New repo local: C:\bthwani-suite-next
Donor repo local: C:\bthwani-suite (READ ONLY, branch: realtest)
