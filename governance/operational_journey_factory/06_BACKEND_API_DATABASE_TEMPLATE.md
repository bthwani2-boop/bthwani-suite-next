# Backend API Database Template

<!-- markdownlint-disable MD060 -->

Backend, API, database, generated clients, and frontend bindings must agree before a journey can start.

| Area | Required coverage |
|---|---|
| routes | HTTP routes, method, path, middleware, and owner |
| handlers | Handler path, request parsing, response mapping |
| validation | Input validation source and error behavior |
| services | Domain service ownership and transaction boundary |
| policies | Permission, visibility, and platform policy enforcement |
| repositories | Data access owner and query path |
| transactions | Commit, rollback, retry, and idempotency behavior |
| migrations | Migration file and ordering |
| tables | Database truth, table ownership, and related journey |
| constraints | Required constraints and failure behavior |
| indexes | Required indexes for the journey path |
| audit events | Audit source, payload class, and retention owner |
| error mapping | Backend error to API schema to frontend state |
| auth middleware | Actor and token enforcement |
| OpenAPI schemas | Request and response schema alignment |
| OpenAPI operationIds | Stable generated client operations |
| generated clients | Generated function and type evidence |
| drift checks | Contract, backend route, and generated client checks |
| alignment | DB/backend/API/frontend binding result |
