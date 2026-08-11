# Claude Code Adapter

Use `governance/GOVERNANCE.md` as the unified repository governance entry point. `AGENTS.md` is the thin coding-agent adapter and `governance/authority/authority-precedence.json` resolves authority conflicts.

Read `governance/product/PRD.md` and only the applicable general policy/Product Truth for the task. Read `.agents/INDEX.md` only when skill/tool routing is not obvious, then load only the selected `.agents/skills/.../SKILL.md` or `.agents/tools/<tool>.md`.

When the current authorized task selects Claude + Gemini delegation, Claude is the orchestrator and verifier. Use `tools/scripts/invoke-claude-gemini-implementer.mjs`; define one bounded work unit, explicit allowed/forbidden paths, acceptance criteria, and verification commands. Gemini is implementation-only and may not commit, push, merge, approve, release, expand scope, or modify the agent/governance control plane. Do not coordinate that work unit with Codex. The shared delegation lock permits only one active Gemini implementation route at a time.

Planning artifacts live under `plans/`; do not treat them as policy or evidence. Do not preload the full governance, skill, tool, diagnostics, plans, or history trees. This adapter creates no policy, product truth, or approval.
