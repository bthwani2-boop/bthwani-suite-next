# BThwani Skill Catalog

Version: 2026.07.17-v1

## Active skills

- `bthwani-universal-task-router` — Classify any task into mode, risk, tools, agent pattern, and allowed closure result before execution.
- `bthwani-current-workspace-authority` — Confirm current repo, branch, target paths, and donor boundary before edits.
- `bthwani-evidence-gate-router` — Classify the task and choose the smallest sufficient verification gate (defaults to CODE_BASED_LEAN).
- `bthwani-guard-command-router` — Map required checks to existing package scripts or guard files without inventing commands.
- `graphify` — Use project-scoped Graphify as a context tool for relationship and ownership questions.
- `bthwani-patch-review-evidence` — Review local or uploaded changes using Git evidence. (PR/final-review only)
- `bthwani-clean-code-guard` — Prevent duplication, dead code, broad refactors, and superficial fixes.
- `bthwani-security-secrets-privacy` — Block secrets, sensitive logs, unsafe config, and privacy leaks.
- `bthwani-agent-handoff-evidence-pack` — Create or review evidence packs under tools/registry/runs. (Explicit-request-only)
- `bthwani-agent-skill-integrity` — Validate agent files, catalog sync, skill structure, and adapter thinness.
- `bthwani-cost-aware-subagent-orchestrator` — Coordinate hierarchical subagents using least-cost capable execution, bounded context, non-overlapping work units, and independent high-risk review.
- `bthwani-foundation-execution` — Execute foundation journey work against governance, package metadata, and guard baseline.
- `bthwani-legacy-extraction` — Extract from donor/realtest only after conflict review and rewrite for next.
- `external-agent-donor-reference` — Use approved external agent repositories as read-only inspiration only; never clone, install, execute, auto-sync, or copy wholesale.
- `bthwani-machine-readable-matrix-governor` — Use CSV matrices as planning input only; closure evidence only in final gate.
- `bthwani-service-fullstack-journey` — Close service slices across contract, backend, client, UI, and runtime. (Code-based implementation by default, full evidence only in final/high-risk).
- `bthwani-api-runtime-binding` — Protect OpenAPI -> generated client -> adapter -> screen/runtime binding.
- `bthwani-docker-journey-runtime` — Verify Docker/data-plane/runtime smoke only for runtime-relevant tasks.
- `bthwani-platform-runtime-config` — Control environment, provider, service slot, URL, and runtime configuration boundaries.
- `bthwani-ui-kit-design-lock` — Enforce shared/ui-kit ownership and Brand Lock (Visual evidence is escalation-only).
- `bthwani-screen-flow-binding` — Bind routes/screens/view-models/states/client contracts (Visual evidence is escalation-only).
- `bthwani-dsh-wlt-finance-boundary` — Protect WLT financial truth and DSH/WLT integration boundaries.
- `bthwani-frontend-design-excellence` — Enforce premium, modern, dynamic, mobile-first, RTL-correct, and visually stunning frontend design quality.
- `bthwani-premium-visual-design-surgeon` — Perform deep visual dissection and premium UI implementation (Visual evidence is escalation-only).
- `bthwani-final-journey-closure-judge` — Judge if a journey is fully closed and ready by verifying multi-dimensional evidence. (Final-only)
- `nx-workspace` — Inspect Nx workspace, projects, targets, and graph.
- `nx-run-tasks` — Run `nx run`, `run-many`, `affected`, filters, and task debugging.
- `nx-import` — Controlled import/migration from donor or external repos.
- `nx-plugins` — Evaluate and add Nx plugins only when required.
- `nx-generate` — Use generators only after dry-run and pattern check.

## Catalog rule

Every folder under `.agents/skills/*` must contain exactly one `SKILL.md` and must appear in this catalog.

Every skill must remain task-specific. Global rules belong in `AGENTS.md`, `.agents/AUTHORITY_BOUNDARY.md`, and `.agents/EVIDENCE_GATE_ROUTER.md`.
