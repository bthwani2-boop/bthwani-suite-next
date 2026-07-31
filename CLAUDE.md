# Claude Code Instructions

`AGENTS.md` is the governing instruction source. This file is a compatibility adapter only.

For normal work, read `AGENTS.md`. Read `.agents/COMMAND_SAFETY_POLICY.md` before writes or destructive commands. Load `.agents/INDEX.md` only when a governed skill must be selected, then load the smallest applicable `SKILL.md`.

Use direct scoped repository inspection first. Do not preload every skill, governance document, adapter, diagnostic, or historical report.

Graphify, LeanCTX, Nx, runtime environments, and full verification suites are optional tools. Never use Graphify first by default; use it only when direct inspection cannot resolve ownership, dependencies, duplication, or dead code.

If this adapter conflicts with `AGENTS.md`, `AGENTS.md` wins.
