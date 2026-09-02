# WLT Financial Simulators

The financial simulator stack is dev-only and WLT-owned. WireMock simulates provider APIs, Mailpit captures local email flows, and Valkey is optional for cache, retry, or idempotency work.

DSH, frontend apps, and shared UI surfaces must not call financial providers directly. They consume WLT contracts only. Production provider URLs and secrets are not allowed in frontend code or runtime examples.

Use the current registered commands when provider behavior must be tested:

```powershell
pnpm run runtime:financial-simulators
pnpm run runtime:mail
pnpm run runtime:cache
pnpm run runtime:financial-simulators
pnpm run runtime:wlt:provider:smoke
```

Add new provider scenarios as WireMock mappings under `infra/docker/financial-simulators/wiremock/mappings`. Keep failure scenarios explicit: timeout, duplicate transaction, declined authorization, unavailable provider, refund failure, reversal required, and rate limiting.

`runtime:core` is the focused DSH/media path and does not imply financial-provider simulation. `runtime:full` explicitly includes the governed full development profile. Verify both names in the current `package.json` before operational use; this document is not a command registry.
