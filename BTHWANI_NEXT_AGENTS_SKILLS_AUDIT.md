# BThwani Suite Next — Agents and Skills Audit

Date: 2026-06-19
Target: `C:\bthwani-suite-next`
Repository: `bthwani2-boop/bthwani-suite-next`
Default branch: `master`

## Decision

Do not copy the `realtest` agent tree wholesale. Add a compact canonical agent system for the new repo.

## Why

`bthwani-suite-next` currently contains only placeholder skill directories under `.agents/skills`. The donor `realtest` contains a full agent system, but it is too broad for the new repository and contains old-root assumptions, generic Nx skill dumps, and `npx` launcher references. The correct action is a controlled extraction: preserve the useful principles, rewrite for `bthwani-suite-next`, reduce skills to a compact operational set, and keep Graphify as a tool-only context layer.

## Installed file groups

1. Root entry files: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.
2. Tool configs: `.codex/config.toml`, `.codex/hooks.json`, `.gemini/settings.json`, `.claude/settings.json`, `opencode.json`, `.github/copilot-instructions.md`.
3. Shared agent docs: `.agents/README.md`, `.agents/INDEX.md`, `.agents/AUTHORITY_BOUNDARY.md`, `.agents/EVIDENCE_GATE_ROUTER.md`, `.agents/GRAPHIFY.md`, `.agents/SKILL_CATALOG.md`, `.agents/UPDATE_POLICY.md`, `.agents/RESTORE_DECISION.md`.
4. Thin adapters for Claude, Codex, Gemini, Copilot, Cursor, OpenCode.
5. Compact skill set: 14 practical skills.

## Key constraints enforced

- `C:\bthwani-suite-next` is the active target root.
- GitHub write remains blocked unless the user explicitly asks.
- `pnpm` is the launcher; `npx` is forbidden.
- No full-repo checks by default.
- No broad donor copy.
- No Graphify leadership.
- Evidence gates are risk-based and minimal.

## Next local step

Run `CHECK_BTHWANI_NEXT_AGENTS.ps1` first. If the report is acceptable, run `APPLY_BTHWANI_NEXT_AGENTS.ps1`, then review the produced git diff and evidence bundle.
