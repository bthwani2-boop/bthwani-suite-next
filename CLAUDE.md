# Claude Code Adapter

Use `governance/GOVERNANCE.md` as the unified repository governance entry point. `AGENTS.md` is the thin coding-agent adapter and `governance/authority/authority-precedence.json` resolves authority conflicts.

Read `governance/product/PRD.md` and only the applicable general policy/Product Truth for the task. Read `.agents/INDEX.md` only when skill/tool routing is not obvious, then load only the selected `.agents/skills/.../SKILL.md` or `.agents/tools/<tool>.md`.

When the current authorized task selects Claude + Google delegation, Claude is the orchestrator and verifier. Use `tools/scripts/invoke-claude-antigravity-implementer.mjs` with one bounded work unit, explicit allowed/forbidden paths, acceptance criteria, verification commands, and an explicit Gemini model from `agy models`. Antigravity CLI (`agy`) is implementation-only; it may not commit, push, merge, approve, release, expand scope, or modify the agent/governance control plane. Do not coordinate that work unit with Codex. The shared relay permits only one active delegated Antigravity implementation at a time and uses the local authenticated Antigravity subscription session rather than API keys.

Planning artifacts live under `plans/`; do not treat them as policy or evidence. Do not preload the full governance, skill, tool, diagnostics, plans, or history trees. This adapter creates no policy, product truth, or approval.
