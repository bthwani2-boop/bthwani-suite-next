
# Graphify Tool Policy

## Purpose

Graphify provides an application-code relationship graph for unresolved ownership,
dependency, duplication, dead-code, or broad architecture questions.

## Use when

- direct scoped inspection cannot resolve a cross-file relationship;
- a risky move, delete, merge, or refactor needs application-code impact guidance;
- DSH/WLT or multi-surface relationships remain unclear.

## Do not use when

- the target and dependency chain are already clear;
- a direct search or affected check is sufficient;
- governance, CI, infrastructure, OpenAPI YAML, runtime state, or production behavior is the claim.

## Coverage

The governed graph is `APPLICATION_CODE_GRAPH`, not a complete repository graph.
`.graphifyignore` intentionally excludes non-code and generated material.

Graphify owns no approval or repository authority. Its output is advisory navigation. Confirm every material claim against pinned files
and task-specific checks. A graph must not be treated as current unless its source commit
is known or the graph is rebuilt for the pinned workspace.

## Commands

```powershell
pnpm graphify:verify
pnpm graphify:code
pnpm graphify:full
graphify query "<question>"
graphify path "<source>" "<target>"
graphify explain "<node>"
```

Use rebuild commands only when the relationship question justifies their cost.
