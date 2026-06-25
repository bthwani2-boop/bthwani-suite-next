# Gemini CLI Instructions

All agent commands must respect the [Command Safety Policy](.agents/COMMAND_SAFETY_POLICY.md).

Use shared project skills from:

    .agents/skills

Also refer to [BThwani Harness Patterns](.agents/BTHWANI_HARNESS_PATTERNS.md).

For Graphify, read and follow:

    .agents/skills/graphify/SKILL.md

Graphify is a tool, not an agent.

Do not create or use:

    .gemini/skills/graphify

When repository understanding is needed, use Graphify first, then verify with actual files and Git evidence.

## ⚡ Smart Execution Model

Match effort to task nature. Never over-engineer or under-deliver.

| Tier | When | Action |
|---|---|---|
| **Instant** | Single file, typo, rename, comment, explain | Execute directly, 0 skills |
| **Focused** | Feature within one module/service | 1 task skill only |
| **Standard** | Multi-file or cross-layer | authority + 1 task skill |
| **Full** | Finance, security, secrets, agent files | authority + router + task skill + evidence gate |

Default: smallest action, fastest response, precise output.
