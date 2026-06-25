# BThwani Agent Routing Index

## ⚡ Execution Model — Proportional to Task Nature

The agent must **match effort to task complexity**. No more, no less.

### Tier 1 — Instant (0 skills, 0 checks)
Trivial tasks. Execute immediately and respond.
- Single-file edit, rename, typo, small fix, comment, formatting
- Reading or explaining code/files
- Safe read-only commands (`git status`, `git log`, `git diff`)

### Tier 2 — Focused (1 skill max)
Normal feature work within a single service or module.
- Component changes, UI tweaks, adding a function/hook
- Refactoring within clear boundaries
- Load only the one task-specific skill needed. Skip authority + router unless ambiguous.

### Tier 3 — Standard (2 skills max)
Work that crosses module or layer boundaries.
- Multi-file feature, API + frontend binding, screen routing
- Load: `bthwani-current-workspace-authority` + one task skill

### Tier 4 — Full Evidence (3 skills, evidence gate)
High-risk or cross-service work.
- Finance (WLT/DSH money), security, secrets, auth, agent/skill files
- Multi-service slice, Docker, CI, dependency changes
- Load: authority + `bthwani-evidence-gate-router` + task skill
- Evidence gate and closure check required before commit

---

## Skill Catalog (load only what the task needs)

### Tooling and evidence
- Graph/ownership/context unclear → `graphify`
- Need guard selection → `bthwani-guard-command-router`
- Review local diff/patch → `bthwani-patch-review-evidence`
- Need registry evidence pack → `bthwani-agent-handoff-evidence-pack`
- Updating or auditing agent files → `bthwani-agent-skill-integrity`

### Safety and quality
- Duplication/dead code/refactor risk → `bthwani-clean-code-guard`
- Secrets/privacy/config risk → `bthwani-security-secrets-privacy`
- Task closure/dimension evidence check → `bthwani-final-slice-closure-judge`

### Repository foundation
- Foundation/governance/toolchain baseline → `bthwani-foundation-execution`
- Donor or realtest extraction → `bthwani-legacy-extraction`
- Matrix-driven closure or coverage → `bthwani-machine-readable-matrix-governor`

### Full-stack and runtime
- Service slice → `bthwani-service-fullstack-slice`
- API/client/runtime binding → `bthwani-api-runtime-binding`
- Docker/data-plane/runtime smoke → `bthwani-docker-slice-runtime`
- Runtime env/provider/service slots → `bthwani-platform-runtime-config`

### UI and finance
- UI kit/design system → `bthwani-ui-kit-design-lock`
- Screen/route/state/visual binding → `bthwani-screen-flow-binding`
- DSH/WLT money boundary → `bthwani-dsh-wlt-finance-boundary`
- Premium 2026 visual surgery / donor extraction / RTL / design closure → `bthwani-premium-visual-design-surgeon`



<!-- BTHWANI_NX_SKILLS_START -->
## Nx workspace support

Use these skills only for Nx-specific tasks. BThwani project rules override generic Nx examples.

Active:
- `nx-workspace` — inspect Nx workspace, projects, targets, and graph.
- `nx-run-tasks` — run `nx run`, `run-many`, `affected`, filters, and task debugging.
- `nx-import` — controlled import/migration from donor or external repos.
- `nx-plugins` — evaluate and add Nx plugins only when required.
- `nx-generate` — use generators only after dry-run and pattern check.

Deferred:
- `monitor-ci` — activate only after CI/Nx Cloud is intentionally configured.

Rules:
- Do not open Nx skills for normal feature work unless Nx routing, project graph, targets, generators, imports, plugins, or CI are involved.
- Do not let generic Nx examples override BThwani ownership, WLT finance rules, Graphify routing, or live-code closure rules.
<!-- BTHWANI_NX_SKILLS_END -->
