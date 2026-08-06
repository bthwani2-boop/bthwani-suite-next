# LeanCTX Tool Policy

## Purpose

LeanCTX reduces repeated reads and oversized tool output without becoming a repository authority.

## Project defaults

- **Tool profile:** `lean` lazy core, selected through `lean-ctx tools lean` rather than persisted as `tool_profile` in project TOML.
- **Agent integration mode:** `hybrid` for Claude Code, Codex, Gemini, Antigravity, and Qoder so native tools remain available while reads/searches and noisy shell output can use LeanCTX.
- `shadow_mode = false` and harden/Replace mode are forbidden as project defaults.
- `cache_policy = "safe"` permits reuse only when source content remains materially unchanged.
- automatic capture, wake-up context, journaling, cloud contribution, and proxy behavior remain disabled unless separately approved.
- repository adapters must not set `trust=true`. LeanCTX may maintain its generated user-level Gemini integration contract, while the repository `.gemini/settings.json` remains non-trusting and therefore governs this workspace safely.

## Use when

- the same files or symbols are being reread;
- shell, search, test, or log output is materially noisy;
- a compact structural view preserves the evidence needed by the task;
- a specialized LeanCTX tool earns its cost and is loaded on demand through `ctx_call`.

## Do not use when

- a small native read or search is already cheaper;
- exact raw output is required for a failure, security, finance, migration, contract, or release claim;
- compression could omit the line or state needed to verify a finding.

Use `raw=true`, LeanCTX bypass mode, or the smallest native equivalent for exact evidence.

Compressed context is navigation, not proof. Expand to exact source or raw output before making a material finding. LeanCTX owns no approval and must not alter the required final report.
