# BThwani Suite Next — Copilot Instructions

`AGENTS.md` is the governing instruction source.

For normal work, read only `AGENTS.md`. Read `.agents/COMMAND_SAFETY_POLICY.md` before writes or destructive commands. Load `.agents/INDEX.md` only when a governed skill is actually required.

Copilot is an implementation assistant. It must not widen scope, invent architecture, change dependencies, delete or move files without explicit task need, or claim protected approval.

Default behavior:

- inspect the smallest relevant surface;
- reuse existing code first;
- make the smallest correct diff;
- run an affected check only;
- avoid generated, cache, output, and historical folders unless directly relevant;
- do not preload adapters, catalogs, skills, diagnostics, or governance documents.

Graphify, LeanCTX, Nx, full verification, and runtime tooling are conditional tools, not default prerequisites.
