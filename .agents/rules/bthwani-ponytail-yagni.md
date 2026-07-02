# BThwani Ponytail / YAGNI Rule

Use this rule in every coding task.

Core ladder before writing code:

1. Does this need to exist at all?
2. Does this already exist in this codebase?
3. Does the standard library already solve it?
4. Does the platform already solve it?
5. Does an already-installed dependency solve it?
6. Can the change be one line or one small edit?
7. Only then write the minimum working code.

BThwani-specific constraints:

- Prefer reuse over new files.
- Prefer deletion over addition when safe.
- Do not create preview/demo/mock runtime paths.
- Do not add dependencies unless proven necessary.
- Do not use old new-repo-forbidden ports: 8080, 8081, 8082, 8083, 8084, 3000.
- Use current BThwani ports only: DSH API 58080, app-client 18101, app-partner 18102, app-captain 18103, app-field 18104, control-panel 13000.
- Use Graphify before broad codebase changes.
- Use Nx affected checks for focused changes.
- Use WLT ownership for financial mutation.
- Never scan generated/cache/output folders.

Forbidden scan paths:

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

Small diff is not enough if it is in the wrong place. Trace the real flow first.
