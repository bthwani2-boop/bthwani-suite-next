# Claude Code Instructions

This adapter is thin. `AGENTS.md` is the governing instruction source.

Before any task, apply, in order: `AGENTS.md`, `.agents/INDEX.md`, `.agents/AUTHORITY_BOUNDARY.md`, `.agents/COMMAND_SAFETY_POLICY.md`.

Do not duplicate global policy here. If this file conflicts with `AGENTS.md`, `AGENTS.md` wins.

All agent commands must respect the [Command Safety Policy](.agents/COMMAND_SAFETY_POLICY.md).

Use shared project skills from:

    .agents/skills

Also refer to [BThwani Harness Patterns](.agents/BTHWANI_HARNESS_PATTERNS.md).

For Graphify, read and follow:

    .agents/skills/graphify/SKILL.md

Graphify is a tool, not an agent.

Do not create or use:

    .claude/skills/graphify

When repository understanding is needed, use Graphify first, then verify with actual files and Git evidence.
