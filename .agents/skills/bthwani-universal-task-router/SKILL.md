---
name: bthwani-universal-task-router
version: 2026.07.17-v3
summary: Classify repository tasks by canonical mode, risk, authority, skills, tools, scope, and permissible evidence claims.
---

# bthwani-universal-task-router

## Purpose

Own initial task classification so repository work uses the correct authority, smallest sufficient governed skill set, allowed paths, and verification route.

## Invoke when

- A repository task may read, modify, delete, move, verify, or close code, configuration, governance, agents, skills, guards, workflows, or runtime.
- The task crosses layers, services, surfaces, authorities, or evidence scopes.
- Risk, ownership, or the strongest permissible claim is unclear.

## Do not invoke when

- The request is unrelated to the repository.
- A trivial text-only edit has explicit scope, no policy impact, and no implementation claim.

## Authority boundary

This skill owns task-mode and risk routing only. It cannot override repository/ref authority, product scope, architecture, finance ownership, governance, CI, QA, security, release, risk acceptance, or final closure.

## Task modes

- `TEXT_ONLY`
- `CODE_ONLY`
- `PRODUCT_MODEL`
- `API_CONTRACT`
- `UI_CODE`
- `UI_VISUAL`
- `RUNTIME`
- `DSH_WLT`
- `SECURITY_PRIVACY`
- `AGENT_SYSTEM`
- `DEPENDENCY_CI`
- `REFACTOR_CLEANUP`
- `SDLC_FORMAL`

## Routing contract

For each task determine:

1. repository mode, branch, and immutable SHA;
2. canonical task mode and risk floor;
3. owning authorities and allowed paths;
4. active or conditional governed skills required;
5. retired skills and tools that must not be treated as authorities;
6. smallest sufficient tools and checks;
7. whether Product Truth, SDLC, independent approval, runtime, visual, governance, or CI evidence applies;
8. the strongest result the available evidence may support.

Graphify and Nx are conditional tools selected by the tool ladder. They are not owner skills or formal authorities.

## Forbidden

- Using the noncanonical task mode `PRODUCT_CAPABILITY`; use `PRODUCT_MODEL`.
- Loading every skill or guard by default.
- Routing work to a `legacy` or `retired` skill.
- Letting an adapter, tool, or specialist self-assign formal approval.
- Expanding scope from a local defect to the full workspace without proving a shared pattern and authority.
- Claiming readiness or closure beyond the selected evidence scopes.

## Required output

```text
repository_mode:
target_branch:
resolved_commit_sha:
task_mode:
risk_level:
owning_authorities:
allowed_paths:
excluded_paths:
skills_to_load:
skills_forbidden:
tools_to_use:
verification:
allowed_final_result:
remaining_risk:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
