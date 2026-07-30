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
