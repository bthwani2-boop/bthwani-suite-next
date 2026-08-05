# Gemini CLI Instructions

Status: ADAPTER

Apply authority in this order:

1. `governance/authority/authority-precedence.json`
2. `AGENTS.md`
3. one applicable governed skill from `.agents/skills`

This adapter may not create policy, widen scope, or add mandatory tools. All writes and destructive commands must follow `.agents/COMMAND_SAFETY_POLICY.md`.

For repository tasks, pin the exact repository, user-named branch, and current commit SHA. Never substitute the default branch, stale diagnostics, prior work, or another ref.

Use direct scoped inspection first. Load `.agents/INDEX.md` only when a skill must be selected. Graphify, LeanCTX, Nx, full verification, and runtime tooling are conditional and must be justified by the actual dependency or evidence need.

Use the smallest sufficient change and check. Do not claim evidence outside the scope actually verified.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
