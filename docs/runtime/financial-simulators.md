# WLT Financial Simulators

The financial simulator stack is dev-only and WLT-owned. WireMock simulates provider APIs, Mailpit captures local email flows, and Valkey is optional for cache, retry, or idempotency work.

DSH, frontend apps, and shared UI surfaces must not call financial providers directly. They consume WLT contracts only. Production provider URLs and secrets are not allowed in frontend code or runtime examples.

Use the stack only when provider behavior must be tested:

```powershell
pnpm run runtime:financial-simulators
pnpm run runtime:mail
pnpm run runtime:cache
pnpm run runtime:dev-financial
pnpm run runtime:wlt:provider:smoke
```

Add new provider scenarios as WireMock mappings under `infra/docker/financial-simulators/wiremock/mappings`. Keep failure scenarios explicit: timeout, duplicate transaction, declined authorization, unavailable provider, refund failure, reversal required, and rate limiting.

`runtime:all` remains lightweight and does not start financial simulators, mail, cache, exposure, or proxy services.
