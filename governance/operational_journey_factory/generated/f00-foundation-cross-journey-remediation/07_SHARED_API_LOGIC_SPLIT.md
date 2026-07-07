# 07 Shared API Logic Split

status: `VERIFIED`

## File Type Role Boundaries

To prevent mixing transport, domain logic, and view-model states, the codebase enforces a strict suffix pattern naming policy:

| File Suffix | Responsibilities | Banned Actions |
|---|---|---|
| `*.transport.ts` | Isolates direct HTTP/RPC network transport calls. | No local domain rules, calculations, or UI state. |
| `*.adapter.ts` | Translates external API structures to internal domain models. | No networking, no React hooks, no UI rendering. |
| `*.controller.ts` | Handles UI component state, React hooks, and page triggers. | No raw fetch calls, no database SQL. |
| `*.view-model.ts` | Represents pure UI display models. | No side effects, no API bindings. |
| `*.policy.ts` | Evaluates business rules, limits, SLA, and permissions. | No UI state, no direct transport. |
| `*.types.ts` | Contains type declarations, schemas, and contract interfaces. | No runtime execution code. |

## Remediation Check

- [x] All active shared frontend files under `services/dsh/frontend/shared/` conform to the isolated file-suffix design pattern.
- [x] No `fetch` or `process.env` commands are directly exposed inside shared domain controllers.
