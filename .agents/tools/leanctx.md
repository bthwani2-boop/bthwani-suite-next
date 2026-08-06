# LeanCTX Tool Policy

## Purpose

LeanCTX reduces repeated reads and oversized tool output without becoming a repository authority.

## Project defaults

- The active MCP surface is the LeanCTX lazy core, applied with `lean-ctx tools lean` by `tools/scripts/repair-leanctx-local.ps1`.
- Do not persist `tool_profile = "lean"` in `.lean-ctx.toml`; LeanCTX 3.9 uses `lean-ctx tools lean` for the lazy-core surface, while TOML profile tiers are `minimal`, `standard`, and `power`.
- `shadow_mode = false` keeps LeanCTX conditional; native tools are not forcibly intercepted.
- `cache_policy = "safe"` allows reuse only when the source has not materially changed.
- Automatic capture, wake-up context, journaling, cloud contribution, and proxy behavior remain disabled unless separately approved.

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
