# 08 Backend API Database Binding

status: `VERIFIED`

## API Contract and Schema Alignment

- **DSH OpenAPI Contract**: [dsh.openapi.yaml](file:///services/dsh/contracts/dsh.openapi.yaml)
  - Generated Client Path: [dsh-api.ts](file:///services/dsh/clients/generated/dsh-api.ts)
  - Validation: OpenAPI-TypeScript compiler binds DSH operations directly.
- **WLT OpenAPI Contract**: [wlt.openapi.yaml](file:///services/wlt/contracts/wlt.openapi.yaml)
  - Generated Client Path: [wlt-api.ts](file:///services/wlt/clients/generated/wlt-api.ts)
- **Identity OpenAPI Contract**: [auth.openapi.yaml](file:///core/identity/contracts/auth.openapi.yaml)
  - Generated Client Path: [identity-api.ts](file:///core/identity/clients/generated/identity-api.ts)

## Database Migrations and Status

All database migrations applied during the runtime smoke tests:
- **WLT Backend Service**: Postgres migrations (001 sessions, 002 accounts, 003 transactions, 004 logs, 005 audit, 006 ledger, 007 default currency yer, 008 payment session handoff controls, 009 dsh notify outbox) ran and seeded correctly.
- **Identity Backend Service**: Postgres migrations (001 sessions) ran and completed successfully.
- **DSH Backend Service**: Service migrations and seed states executed cleanly.

## Handlers and OperationIds Binding

- All API routes and handlers map 1-to-1 with the OpenAPI spec `operationIds`.
- The frontend references generated type-safe clients exclusively. Direct manual HTTP fetch URLs are banned.
