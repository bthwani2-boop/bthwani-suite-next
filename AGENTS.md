# BThwani Agents

## Command Safety Policy

All agents must strictly adhere to the [Command Safety Policy](.agents/COMMAND_SAFETY_POLICY.md).

## Shared skills root

All agents must use shared project skills from:

    .agents/skills

Also refer to [BThwani Harness Patterns](.agents/BTHWANI_HARNESS_PATTERNS.md) for architectural and routing context.

## Graphify

Shared skill:

    .agents/skills/graphify/SKILL.md

Graphify is a tool, not an agent.

Use Graphify before deep repository analysis to reduce token waste and improve codebase understanding.

Do not create duplicate Graphify skills under .claude/skills or .gemini/skills.

## ⚡ Smart Execution Model

Match effort to task nature. Never over-engineer or under-deliver.

| Tier | When | Action |
|---|---|---|
| **Instant** | Single file, typo, rename, comment, explain | Execute directly, 0 skills |
| **Focused** | Feature within one module/service | 1 task skill only |
| **Standard** | Multi-file or cross-layer | authority + 1 task skill |
| **Full** | Finance, security, secrets, agent files | authority + router + task skill + evidence gate |

Default: smallest action, fastest response, precise output.

<!-- lean-ctx -->
## lean-ctx

lean-ctx is active — the MCP tools replace native equivalents.
Full rules: LEAN-CTX.md (open on demand — do not auto-load).
<!-- /lean-ctx -->
