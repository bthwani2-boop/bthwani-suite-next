# Global diagnosis — TASK_NAME

Pinned baseline: `REPOSITORY_NAME@TARGET_BRANCH` at `PINNED_START_SHA`.

## 1. Diagnosis scope and method

Record the repository-wide investigation method and evidence strategy. Diagnosis must cover every seeded entry in `COVERAGE.json` from architectural, technical, logical, operational, security, data, contract, runtime, testing, and governance directions.

## 2. Repository architecture and truth ownership

Record current owners of policy, contracts, data, state, and execution. Identify parallel truths, forbidden dependency directions, handwritten authorities, duplicated state, and missing ownership.

## 3. All surfaces and control-panel sections

Summarize each product surface and every discovered DSH/WLT control-panel section. Expand exact pages, tabs, features, actions, permissions, readers, writers, and states only where related to execution or materially defective. Reference `coverageId` and immutable evidence references rather than copying coverage records.

## 4. Backend, contracts, data, events, and integrations

Summarize services, APIs, clients, schemas, databases, migrations, state machines, events, jobs, providers, retries, idempotency, and cross-service dependencies.

## 5. Cross-surface journeys

Identify all inbound and outbound journeys related to `PRIMARY_SURFACE`. Trace actor, entry, authorization, contract, service, persistence, events, state readers/writers, success, denial, failure, conflict, recovery, audit, and observability.

## 6. Defects and root causes

Record material defects discovered anywhere in the repository. Separate defects related to execution from defects outside the requested execution scope. Every related defect must map to one or more unit IDs through `COVERAGE.json`.

## 7. Execution boundary

State exactly why each included area is required for final closure and why each excluded area is not related. Do not duplicate unit tasks here.

## 8. Residual uncertainty

Record unavailable evidence, external dependencies, and unresolved questions. Silence is prohibited.
