# BThwani Agent Routing Index

Use this file to select the smallest relevant skill set.

## Always-on

- `bthwani-current-workspace-authority`
- `bthwani-evidence-gate-router`

## Tooling and evidence

- Graph/ownership/context unclear → `graphify`
- Need guard selection → `bthwani-guard-command-router`
- Review local diff/patch → `bthwani-patch-review-evidence`
- Need registry evidence pack → `bthwani-agent-handoff-evidence-pack`
- Updating or auditing agent files → `bthwani-agent-skill-integrity`

## Safety and quality

- Duplication/dead code/refactor risk → `bthwani-clean-code-guard`
- Secrets/privacy/config risk → `bthwani-security-secrets-privacy`

## Repository foundation

- Foundation/governance/toolchain baseline → `bthwani-foundation-execution`
- Donor or realtest extraction → `bthwani-legacy-extraction`
- Matrix-driven closure or coverage → `bthwani-machine-readable-matrix-governor`

## Full-stack and runtime

- Service slice → `bthwani-service-fullstack-slice`
- API/client/runtime binding → `bthwani-api-runtime-binding`
- Docker/data-plane/runtime smoke → `bthwani-docker-slice-runtime`
- Runtime env/provider/service slots → `bthwani-platform-runtime-config`

## UI and finance

- UI kit/design system → `bthwani-ui-kit-design-lock`
- Screen/route/state/visual binding → `bthwani-screen-flow-binding`
- DSH/WLT money boundary → `bthwani-dsh-wlt-finance-boundary`

## Selection rule

Use at most three skills for normal work:

1. workspace authority
2. evidence router
3. one task-specific skill

Add more only when the task crosses boundaries.

<!-- BTHWANI_NX_SKILLS_START -->
## Nx workspace support

Use these skills only for Nx-specific tasks. BThwani project rules override generic Nx examples.

Active:
- 
x-workspace — inspect Nx workspace, projects, targets, and graph.
- 
x-run-tasks — run 
x run, un-many, ffected, filters, and task debugging.
- 
x-import — controlled import/migration from donor or external repos.
- 
x-plugins — evaluate and add Nx plugins only when required.
- 
x-generate — use generators only after dry-run and pattern check.

Deferred:
- monitor-ci — preserved under .agents/skills-deferred/monitor-ci; activate only after CI/Nx Cloud is intentionally configured.

Rules:
- Do not open Nx skills for normal feature work unless Nx routing, project graph, targets, generators, imports, plugins, or CI are involved.
- Do not let generic Nx examples override BThwani ownership, WLT finance rules, Graphify routing, or live-code closure rules.
<!-- BTHWANI_NX_SKILLS_END -->

