# Development Runtime

DOCUMENT_CLASS: HUMAN_DEVELOPMENT_GUIDE
CURRENT_RUNTIME_AUTHORITY: live scripts, package.json, infra/docker and environment configuration

## Runtime modes

### Daily development

Run the surface/service actively being changed locally. Keep heavy infrastructure off unless required. Managed development services may be used for stateful dependencies when they preserve the same semantic contracts.

### Focused integration

Run only the infrastructure required by the current capability, such as WLT plus its financial simulator, or a service plus an object-storage/email test adapter.

### Full integration

Use repository runtime orchestration for migrations, smoke/integration/journey checks, provider-adapter conformance and reproducibility.

```powershell
pnpm runtime:full:up
pnpm runtime:full:smoke
pnpm runtime:full:down
```

`FULL_INTEGRATION != DAILY_DEV`.

## Current declared local endpoints

The current checked runtime profile declares:

| Surface/service | Local port |
|---|---:|
| Control Panel | 13000 |
| Local dev session broker | 18100 |
| app-client Metro | 18101 |
| app-partner Metro | 18102 |
| app-captain Metro | 18103 |
| app-field Metro | 18104 |
| DSH API | 18080 |
| Identity API | 18082 |
| WLT API | 18083 |
| Workforce API | 18086 |
| Providers API profile — inherited current implementation, not canonical target | 18087 |
| Platform Control API | 18088 |

A current runtime profile may still contain inherited/temporary services while refoundation is active. A port/profile existing in executable source proves current runtime state only; it does not grant canonical domain ownership.

## Database

The durable development engine is PostgreSQL/PostGIS. Managed PostgreSQL may be used for daily development; Docker PostgreSQL remains a reproducible local/integration path.

External development databases use synthetic/test data only. Never copy production customer/financial/identity data into a general development service.

## Docker

Docker is reproducible infrastructure, not Product authority and not a mandatory all-day development runtime. Start only the profiles needed by the current task.

Useful root commands include:

```powershell
pnpm runtime:up
pnpm runtime:status
pnpm runtime:smoke
pnpm runtime:migrate
pnpm runtime:down
```

Exact profile composition remains owned by repository scripts/configuration.

## Failure semantics

A mock/simulator may emulate an external dependency but must still exercise BThwani authorization, state machines, idempotency, accounting and readback. Fake success paths that bypass the real domain are invalid evidence.
