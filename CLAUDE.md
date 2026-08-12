# Claude Code Adapter

Use `governance/GOVERNANCE.md` as the unified repository governance entry point. `AGENTS.md` is the thin coding-agent adapter and `governance/authority/authority-precedence.json` resolves authority conflicts.

Read only the applicable Product Truth/policy and smallest sufficient skill/tool context.

When the current authorized task selects Claude + OpenCode/NVIDIA delegation, Claude is the orchestrator and verifier. Use `tools/scripts/invoke-claude-opencode-implementer.mjs` with one bounded work unit, an approved worker, exact branch/HEAD, explicit read/write/forbidden paths, acceptance criteria, and Claude-owned verification commands. The OpenCode worker is implementation-only and may not use shell/git/web/subagents, commit, push, merge, approve, release, expand scope, or mutate the agent/governance control plane. Claude owns complete diff review, re-pinning, developer verification, rework, commit, and push.

When the current authorized task explicitly selects Claude + Google delegation, use `tools/scripts/invoke-claude-antigravity-implementer.mjs` and the governed AGY/Gemini route instead. The two backends are mutually exclusive for a work unit.

Do not coordinate a delegated Claude work unit with Codex. Planning artifacts under `plans/` are not policy or evidence. This adapter creates no policy, product truth, or approval.
