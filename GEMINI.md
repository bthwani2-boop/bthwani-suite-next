# Gemini repository adapter

`AGENTS.md` is the canonical repository authority. This file only adapts Gemini to that authority and cannot override it.

For repository work:

1. Pin the exact repository, user-named branch, and immutable commit SHA.
2. Inspect the smallest directly relevant files first.
3. Use Graphify only when ownership, cross-file relationships, dependency paths, or broad architecture remain unclear after direct inspection.
4. Treat `graphify-out/` as generated application-code navigation, not complete repository, governance, CI, infrastructure, or runtime proof.
5. Use LeanCTX only when it materially reduces context noise. It must not suppress required evidence, checks, risks, or decision boundaries.
6. Use the smallest sufficient change and verification scope. Do not claim evidence outside what was actually inspected or executed.

## Graphify

When Graphify is justified and `graphify-out/graph.json` exists, prefer scoped commands such as `graphify query`, `graphify path`, and `graphify explain`. Rebuild the application-code graph with:

```powershell
graphify extract . --code-only --force
```

Generated Graphify output remains ignored and non-authoritative.
