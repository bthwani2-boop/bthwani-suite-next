# LeanCTX Tool Policy

## Purpose

LeanCTX reduces repeated reads and oversized tool output without becoming a repository authority.

## Project defaults

- `tool_profile = "lean"` exposes the lazy core and keeps specialized tools available on demand.
- `shadow_mode = false` keeps LeanCTX conditional; native tools are not forcibly intercepted.
- `cache_policy = "safe"` allows reuse only when the source has not materially changed.
- automatic capture, wake-up context, journaling, cloud contribution, and proxy behavior remain disabled unless separately approved.

## Use when

- the same files or symbols are being reread;
- shell, search, test, or log output is materially noisy;
- a compact structural view preserves the evidence needed by the task;
- a specialized LeanCTX tool earns its cost and is loaded on demand.

## Do not use when

- a small native read or search is already cheaper;
- exact raw output is required for a failure, security, finance, migration, contract, or release claim;
- compression could omit the line or state needed to verify a finding.

Use `raw=true`, LeanCTX bypass mode, or the smallest native equivalent for exact evidence.

Compressed context is navigation, not proof. Expand to exact source or raw output before making a material finding. LeanCTX owns no approval and must not alter the required final report.
