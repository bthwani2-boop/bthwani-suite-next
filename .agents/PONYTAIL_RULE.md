
# BThwani Ponytail / YAGNI Rule

Use this rule in coding tasks.

## Ladder before writing code

1. Does this need to exist?
2. Does it already exist in the codebase?
3. Does the standard library solve it?
4. Does the platform solve it?
5. Does an installed dependency solve it?
6. Can the change be one small edit?
7. Only then write the minimum working code.

## Project constraints

- Prefer reuse and safe deletion over new files.
- Do not create preview, demo, mock, or fallback runtime paths as production truth.
- Do not add dependencies without proven need.
- Do not use legacy ports `8080`-`8084` or `3000`.
- Use DSH API `58080`, mobile ports `18101`-`18104`, and control-panel `13000`.
- Use Graphify only when direct inspection leaves broad ownership or relationship questions unresolved.
- Use Nx affected only when workspace impact must be computed.
- Keep financial mutation under WLT ownership.
- Never scan generated, cache, diagnostic, or output directories unless the task targets them.

Small diffs in the wrong owner path are still wrong. Trace the real flow first.
