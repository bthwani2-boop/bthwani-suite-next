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
