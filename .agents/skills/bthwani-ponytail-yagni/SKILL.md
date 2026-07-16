---
name: bthwani-ponytail-yagni
version: 2026.06.26
summary: Portable Ponytail-style YAGNI guard adapted for BThwani agents.
---

# BThwani Ponytail / YAGNI Skill

## Purpose

Use before adding code, files, dependencies, services, abstractions, screens, routes, or broad refactors.

## Required ladder

1. Does this need to exist?
2. Is it already implemented in this repo?
3. Can an existing helper/service/client/hook/screen be reused?
4. Can stdlib/platform/native capability solve it?
5. Can an installed dependency solve it?
6. Can this be one small edit?
7. Only then add the minimum working implementation.

## BThwani rules

- Use Graphify before deep or cross-surface analysis.
- Use Nx affected checks when possible.
- Do not create duplicate Graphify skills.
- Do not create preview/demo/mock runtime paths.
- Do not add dependencies without proof.
- Do not mutate financial state outside WLT ownership.
- Do not use old ports: 8080, 8081, 8082, 8083, 8084, 3000.
- Use current ports: 58080, 18101, 18102, 18103, 18104, 13000.
- Prefer smallest correct diff.
- Prefer deleting dead code over adding wrappers.
- Prefer fixing shared root cause over patching one caller.

## Forbidden scan paths

- node_modules
- .pnpm-store
- .next
- .expo
- dist
- build
- coverage
- graphify-out
- .yagni-out
- .nx
- .cache
- .gocache*
- .gomodcache*
- tools/registry/runs

## Evidence required

For non-trivial changes, leave evidence:

- changed files
- diff stat
- checks run
- reason no existing code was reused
- reason any new file/dependency was necessary

## Failure states

- FIX_REQUIRED: duplicate implementation, broad diff, or unproven new code.
- NEEDS_EVIDENCE: ownership or references unclear.
- REVERT_REQUIRED: unrelated formatting/refactor happened.
