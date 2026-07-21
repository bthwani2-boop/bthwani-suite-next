# 01 — Repository Boundaries

Status: ACTIVE_CANONICAL

## Purpose

Define repository ownership without depending on a developer-specific filesystem root or donor workspace.

## Canonical repository rule

The current resolved remote repository and target branch are the implementation authority for repository work. Machine-local paths, previous repositories, archives, exports, and copied workspaces are references only unless explicitly registered as the current repository.

## Rules

- Use repository-relative paths in committed code, configuration, governance, scripts, and evidence.
- Do not create runtime, build, import, package, or deployment dependencies on a donor or previous repository.
- Do not copy folders blindly from a donor source.
- Inspect and classify each donor-derived item before adopting it.
- Rebuild donor behavior to the current contracts, ownership, security, UI, data, and runtime architecture.
- Current state is determined from the resolved remote commit, not local memory or an unpinned workspace.

## Donor disposition labels

These labels classify reference material; they are not lifecycle or closure decisions:

- `ADOPT_AS_IS`
- `ADOPT_AFTER_REWRITE`
- `DESIGN_REFERENCE_ONLY`
- `DOMAIN_REFERENCE_ONLY`
- `API_REFERENCE_ONLY`
- `REJECT_NOISE`
- `REJECT_DEMO_PREVIEW`
- `REJECT_DUPLICATE`
- `REJECT_BROKEN`
- `OUT_OF_SCOPE_FOR_THIS_JOURNEY`

Any result decision still maps through `governance/contracts/decision-vocabulary.json`.

## Acceptance condition

Accepted only when active repository files use repository-relative ownership, no runtime or toolchain dependency points to an external donor workspace, donor-derived changes are traceable in the live diff or applicable migration record, and current-state claims are pinned to the target remote commit.
