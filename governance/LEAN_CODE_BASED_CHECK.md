# Lean Code-Based Check

Status: ACTIVE_CANONICAL

Default project execution uses code-based checks.

`Lean = direct scoped repository inspection + smallest sufficient automation and evidence.`

## CODE_BASED_LEAN default

The default execution model is live-code first, scope-bounded, and token-efficient. No optional tool is a mandatory first step.

### Core rules

- **Direct scoped inspection first**: inspect only the relevant contracts, code paths, imports, routes, manifests, registries, and owner policies.
- **Smallest safe diff**: implement the smallest correct change that satisfies the declared acceptance conditions.
- **Smallest sufficient automation**: use existing targeted guards or package scripts when they materially prove the claim. Manual inspection remains valid for bounded facts; repetitive changes require safe automation.
- **No screenshots by default**: normal UI code changes do not require visual artifacts unless visual acceptance is explicitly applicable.
- **No handoff/evidence packs by default**: do not generate evidence archives, command logs, or duplicated reports unless required by escalation or explicit request.
- **No full checks by default**: do not run full workspace typecheck, test, build, Nx graph, Graphify, or all-guard suites without a proven scope need.
- **Optional tools remain optional**: LeanCTX, Graphify, Nx, and diagnostic tools are selected only when they are the smallest sufficient option.

## Escalation rules

Additional evidence is required when applicable to:

- Product Truth or product acceptance;
- WLT/finance, security, authentication, privacy, or secrets;
- database migrations or production data;
- destructive operations or broad refactoring;
- public API/OpenAPI changes;
- runtime, Docker, provider, or persistence behavior;
- governance, agents, skills, guards, stage gates, or CI workflows;
- independent QA, release, rollback, deployment, or production verification;
- final `CLOSED_WITH_EVIDENCE` decisions;
- explicit user requests.

Evidence must remain tied to the same immutable commit and must not be created merely to simulate completeness.

## Token-drain exclusions

Unless the task explicitly owns one of these paths, targeted tools and scans exclude:

### Directories

- `.git/`
- `node_modules/`
- `.pnpm-store/`
- `.next/`
- `.expo/`
- `.turbo/`
- `.nx/`
- `.cache/`
- `dist/`, `build/`, `out/`, and `coverage/`
- `tmp/`, `temp/`, and `logs/`
- `graphify-out/`
- `tools/registry/runs/`
- `evidence/` and `**/evidence/`
- `**/screenshots/`, `**/recordings/`, and `**/visual-evidence/`
- `**/generated/` and `**/__generated__/`
- `android/` and `ios/`, except for applicable native work

### Files

- media and binary files;
- archives;
- source maps and minified bundles;
- lockfiles except for dependency, toolchain, or reproducibility work.

An exclusion is a default scope rule, not permission to ignore an affected owner path.

## Document and ignore policy

- Committed documentation uses repository-relative links.
- Machine-local file URLs and hard-coded developer roots are forbidden.
- Ignore configurations and guard exclusions must align with this policy without hiding applicable owner files.

## Acceptance condition

Accepted only when direct scoped inspection is the default, optional tools remain optional, full checks require explicit justification, evidence matches the declared risk and same commit, and no excluded path is ignored when it is actually affected.
