# BThwani Skill Catalog

Version: 2026.06.24-v1

## Active skills

- `bthwani-current-workspace-authority` — Confirm current repo, branch, target paths, and donor boundary before edits.
- `bthwani-evidence-gate-router` — Classify the task and choose the smallest sufficient verification gate.
- `bthwani-guard-command-router` — Map required checks to existing package scripts or guard files without inventing commands.
- `graphify` — Use project-scoped Graphify as a context tool for relationship and ownership questions.
- `bthwani-patch-review-evidence` — Review local or uploaded changes using Git evidence, not tool claims.
- `bthwani-clean-code-guard` — Prevent duplication, dead code, broad refactors, and superficial fixes.
- `bthwani-security-secrets-privacy` — Block secrets, sensitive logs, unsafe config, and privacy leaks.
- `bthwani-agent-handoff-evidence-pack` — Create or review evidence packs under tools/registry/runs.
- `bthwani-agent-skill-integrity` — Validate agent files, catalog sync, skill structure, and adapter thinness.
- `bthwani-foundation-execution` — Execute foundation slice work against governance, package metadata, and guard baseline.
- `bthwani-legacy-extraction` — Extract from donor/realtest only after conflict review and rewrite for next.
- `bthwani-machine-readable-matrix-governor` — Use machine-readable CSV matrices as planning and closure evidence inputs.
- `bthwani-service-fullstack-slice` — Close service slices across contract, backend, client, UI, runtime, and evidence.
- `bthwani-api-runtime-binding` — Protect OpenAPI -> generated client -> adapter -> screen/runtime binding.
- `bthwani-docker-slice-runtime` — Verify Docker/data-plane/runtime smoke only for runtime-relevant tasks.
- `bthwani-platform-runtime-config` — Control environment, provider, service slot, URL, and runtime configuration boundaries.
- `bthwani-ui-kit-design-lock` — Enforce shared/ui-kit ownership, brand lock, and no local design systems.
- `bthwani-screen-flow-binding` — Bind routes/screens/view-models/states/visual evidence for UI flows.
- `bthwani-dsh-wlt-finance-boundary` — Protect WLT financial truth and DSH/WLT integration boundaries.
- `bthwani-frontend-design-excellence` — Enforce premium, modern, dynamic, mobile-first, RTL-correct, and visually stunning frontend design quality.
- `bthwani-premium-visual-design-surgeon` — Perform deep visual dissection and premium 2026 UI execution while enforcing ui-kit, DSH shared brain, WLT/DSH boundary, RTL, performance, and visual evidence.
- `bthwani-final-slice-closure-judge` — Judge if a slice is fully closed and ready by verifying multi-dimensional evidence.
- `nx-workspace` — Inspect Nx workspace, projects, targets, and graph.
- `nx-run-tasks` — Run `nx run`, `run-many`, `affected`, filters, and task debugging.
- `nx-import` — Controlled import/migration from donor or external repos.
- `nx-plugins` — Evaluate and add Nx plugins only when required.
- `nx-generate` — Use generators only after dry-run and pattern check.

## Catalog rule

Every folder under `.agents/skills/*` must contain exactly one `SKILL.md` and must appear in this catalog.

Every skill must remain task-specific. Global rules belong in `AGENTS.md`, `.agents/AUTHORITY_BOUNDARY.md`, and `.agents/EVIDENCE_GATE_ROUTER.md`.
