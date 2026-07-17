# BThwani Agent Routing Index

## ⚡ Execution Model — Proportional to Task Nature

The default project execution model is **CODE_BASED_LEAN** as canonicalized in [LEAN_CODE_BASED_CHECK.md](../governance/LEAN_CODE_BASED_CHECK.md). The agent must **match effort to task complexity** in accordance with the [Automated Execution Policy](./AUTOMATED_EXECUTION_POLICY.md).

### Execution & Automation Rules:
* **LeanCTX as Context Layer**: LeanCTX is the default context and diagnostics layer when active. Agents must use `ctx_*` tools before native equivalents.
* **Mandatory Automation**: All levels must use the smallest sufficient automation/checks. Scattered manual file-by-file chasing is strictly banned.
* **Proportional Scaling**: Tiny tasks require small automated checks (no large/unnecessary scripts). High-risk or complex tasks require a full FAAV cycle and Close Loops.
* **Complex Decision**: Complex tasks require consciously choosing the correct automation shape (e.g. single script or modular multi-script).

### Tier 1 — Instant / Minimal Validation (no skills, small targeted check post-modification)
Trivial tasks. Execute immediately and respond.
- Single-file edit, rename, typo, small fix, comment, formatting
- Reading or explaining code/files
- Safe read-only commands (`git status`, `git log`, `git diff`)
- Minimal validation post-modification (no new scripts needed, but must run a lightweight validation check)

### Tier 2 — Focused (1 skill max)
Normal feature work within a single service or module.
- Component changes, UI tweaks, adding a function/hook
- Refactoring within clear boundaries
- Load only the one task-specific skill needed. Skip authority + router unless ambiguous.

### Tier 3 — Standard (2 skills max)
Work that crosses module or layer boundaries.
- Multi-file feature, API + frontend binding, screen routing
- Load: `bthwani-current-workspace-authority` + one task skill

### Tier 4 — Escalated Evidence (3 skills, evidence gate)
High-risk or cross-service work.
- Finance (WLT/DSH money), security, secrets, auth, agent/skill files
- Multi-service journey, Docker, CI, dependency changes
- Load: authority + `bthwani-evidence-gate-router` + task skill
- Evidence gate is not default. Use it only for high-risk work, final closure, PR readiness, release readiness, or explicit user request.

## Universal Router Link

Before selecting a skill, apply the Universal Task Router in `AGENTS.md`.

Routing order: identify task mode, identify risk level, select at most the required skills, select the smallest sufficient verification, escalate only when the task mode requires it.

Mandatory escalations:
- `DSH_WLT` → `bthwani-dsh-wlt-finance-boundary` + `graphify` when ownership or dependency impact is broad.
- `API_CONTRACT` → `bthwani-api-runtime-binding` + `bthwani-guard-command-router`.
- `AGENT_SYSTEM` → `bthwani-agent-skill-integrity`.
- `REFACTOR_CLEANUP` → `bthwani-clean-code-guard` + `graphify`.
- `SECURITY_PRIVACY` → `bthwani-security-secrets-privacy`.
- `RUNTIME` → `bthwani-docker-journey-runtime` only when runtime behavior is changed or claimed.

Do not load skills merely because they exist. Load only what the task mode requires.

---

## Skill Catalog (load only what the task needs)

### Tooling and evidence
- Graph/ownership/context unclear → `graphify`
- Need guard selection → `bthwani-guard-command-router`
- Review local diff/patch (Escalation-only / PR review) → `bthwani-patch-review-evidence`
- Create evidence packs only when explicitly requested. (Explicit-request-only) → `bthwani-agent-handoff-evidence-pack`
- Updating or auditing agent files → `bthwani-agent-skill-integrity`
- Explicit subagents, two or more independent work units, model/cost routing, or hierarchical delegation → `bthwani-cost-aware-subagent-orchestrator`
- Do not invoke the orchestrator for tiny single-scope tasks when delegation overhead exceeds execution cost.

### Safety and quality
- Duplication/dead code/refactor risk → `bthwani-clean-code-guard`
- Secrets/privacy/config risk → `bthwani-security-secrets-privacy`
- Final closure judge. (Final-only / Closure phase) → `bthwani-final-journey-closure-judge`

### Repository foundation
- Foundation/governance/toolchain baseline → `bthwani-foundation-execution`
- Donor or realtest extraction → `bthwani-legacy-extraction`
- External agent donor reference, agent inspiration, or agency-agents review (Use only when user asks to design/improve agents/skills or internal agent design is blocked. Do not load by default) → `external-agent-donor-reference`
- Matrix-driven closure or coverage → `bthwani-machine-readable-matrix-governor`

### Full-stack and runtime
- Service journey → `bthwani-service-fullstack-journey`
- API/client/runtime binding → `bthwani-api-runtime-binding`
- Docker/data-plane/runtime smoke → `bthwani-docker-journey-runtime`
- Runtime env/provider/service slots → `bthwani-platform-runtime-config`

### UI and finance
- UI kit/design system (Visual evidence is escalation-only) → `bthwani-ui-kit-design-lock`
- Route/state/screen binding (Visual evidence is escalation-only) → `bthwani-screen-flow-binding`
- DSH/WLT money boundary → `bthwani-dsh-wlt-finance-boundary`
- Premium UI execution/design system alignment (Visual evidence is escalation-only) → `bthwani-premium-visual-design-surgeon`



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
