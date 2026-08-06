# Diagnosis and execution package — TASK_NAME

> Temporary derived-support artifact pinned to `REPOSITORY_NAME@TARGET_BRANCH` at `PINNED_START_SHA`. It cannot override canonical governance, contracts, live code, or the current remote state.

## 1. Objective and final decision

- **Objective:** TASK_OBJECTIVE
- **Mode:** REQUESTED_MODE
- **Decision:** `NEEDS_EVIDENCE`
- **Proven:** Record only claims linked to immutable evidence IDs in `LEDGER.jsonl`.
- **Not proven:** Record every unavailable or unresolved item explicitly; silence is prohibited.

## 2. Authority, boundaries, and baseline

Resolve applicable authority from `governance/authority/authority-precedence.json`, `AGENTS.md`, canonical contracts, and live code at the pinned SHA. Record every authority, conflict, inclusion, exclusion, protected path, and scope expansion as ledger records. An exclusion is valid only when linked to evidence proving no ownership, dependency, consumer, journey, data, security, financial, runtime, test, release, or operational impact.

## 3. Mandatory complete coverage

Naming one application, surface, section, page, feature, or journey identifies only the diagnosis entry point. It never limits the terminal scope. Trace the requested behavior through every owner, writer, reader, consumer, dependency, state transition, and affected journey until the operational chain is complete.

### 3.1 Control panel without omission

Inventory, inspect, and classify every discovered control-panel section and everything beneath it. The generator seeds the current repository inventory into `LEDGER.jsonl`; strict validation fails if a discovered section or route is absent or unclassified. The minimum known section set includes:

- `dashboard`
- `operations`
- `partners`
- `catalogs`
- `marketing`
- `support`
- `analytics`
- `hr`
- `administration`
- `platform`
- `login`
- every related `WLT` area, including `finance`
- every additional current or future section discovered from the repository, including hidden or unlinked routes

For every section, cover all applicable:

- root, nested, dynamic, loading, error, and API routes;
- pages, tabs, menus, cards, tables, links, dialogs, drawers, and contextual actions;
- forms, fields, validation, submission, search, sorting, filtering, pagination, import, export, upload, and download;
- individual and bulk actions; approval, rejection, suspension, activation, deactivation, creation, editing, deletion, archival, restoration, and retry;
- loading, empty, degraded, denied, invalid, conflict, duplicate, failure, recovery, and not-ready states;
- roles, permissions, scopes, route protection, hidden or disabled actions, alerts, notifications, and audit trails;
- real, mock, fallback, fixture, static, stale, duplicated, or unbound data;
- contracts, generated and handwritten clients, APIs, services, databases, events, jobs, tests, runtime, observability, documentation, and governance.

A top-level route or sidebar inspection never proves section completion. Every affected page or interactive source must have ledger coverage for its features, actions, reads, writes, permissions, success paths, failure paths, and cross-surface effects.

### 3.2 All product surfaces

Classify all required surfaces, whether affected or proven unaffected:

- `control-panel`
- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- every additional application, portal, service, provider, worker, or integration discovered during diagnosis

An affected surface must be expanded into its relevant routes, screens, tabs, features, actions, contracts, state readers, state writers, and tests. A surface may be marked unaffected only with evidence and a reopen trigger.

### 3.3 Cross-surface journeys

For each action or feature, reconstruct the complete journey:

1. actor and intent;
2. entry page, screen, button, event, or invocation;
3. authentication, authorization, role, permission, and scope checks;
4. request, contract, client, and validation boundary;
5. controller, service, use case, workflow, and state machine;
6. database reads, writes, transactions, migrations, and truth ownership;
7. events, outbox, jobs, hooks, webhooks, providers, retries, and idempotency;
8. state change and authoritative source;
9. every control-panel section that displays, controls, audits, or reports the state;
10. every other surface that must observe or act on the result;
11. success, denial, failure, conflict, duplicate, degradation, not-ready, rollback, recovery, and readback;
12. observability, auditability, operational response, and test evidence.

Example rule: diagnosing a customer click on an order must also inspect the relevant operations, partner, captain, field, support, analytics, and finance behavior, plus all contracts, services, data, permissions, events, and resulting states. The exact expansion is evidence-driven, but no connected consumer may remain silent or unclassified.

### 3.4 Automatic scope expansion

Expand the ledger whenever evidence reveals a writer, reader, consumer, inbound journey, outbound journey, control-panel controller, contract, service, table, event, permission, configuration, feature flag, financial effect, operational effect, security effect, duplicate truth, stale implementation, test, script, workflow, guard, or documentation dependency. Record the expansion before planning its change.

## 4. Ledger contract

`LEDGER.jsonl` is the only structured source of truth for package records. Use one JSON object per line and stable IDs. Do not duplicate full records in this document.

Supported record types:

- `authority`
- `scope`
- `evidence`
- `flow`
- `finding`
- `risk`
- `deletion_candidate`
- `work_item`
- `verification`
- `result`
- `blocker`
- `decision`

Required relationships:

```text
scope/flow claim
→ evidence
→ finding and root cause when a defect exists
→ truth owner and target state
→ atomic work item
→ measurable acceptance
→ verification command and result
→ same-commit decision
```

## 5. Diagnosis requirements

Every material finding must state:

```text
observable symptom
→ immediate technical cause
→ structural cause
→ incorrect or missing truth owner
→ affected surfaces, sections, features, journeys, and consumers
→ durable correction
→ obsolete or duplicate remnants to remove
→ verification that proves the correction and its limitations
```

Classify every inventory record as one of:

- `AFFECTED`
- `NOT_AFFECTED_WITH_EVIDENCE`
- `OBSOLETE_CANDIDATE`
- `DUPLICATE_CANDIDATE`
- `MIGRATION_REQUIRED`
- `EXTERNAL`
- `UNPROVEN`

`UNPROVEN` is valid during diagnosis but forbidden when the plan becomes ready.

## 6. Target state and execution plan

Define one owner for each truth, allowed dependency directions, authoritative contracts and persistence, expected journeys and state transitions, surface responsibilities, negative-state behavior, migration order, compatibility limits, security and financial boundaries, observability, rollback, and explicit removals.

Each `work_item` must be atomic and dependency ordered. It must name exact paths and symbols, intended changes, forbidden changes, affected surfaces and journeys, acceptance criteria, verification IDs, risk, rollback, and commit boundary. Only one work item may be `IN_PROGRESS` at a time. A later item cannot start while a fixable predecessor gate remains open.

## 7. Deletion and replacement safety

Never delete because an item looks old. Prove reference and consumer searches, replacement readiness, consumer migration, contract and data compatibility, workflow and documentation impact, targeted checks after removal, rollback through Git or migration reversal, and absence of package dependencies. Move consumers first, then remove the old source and every import, export, configuration, test, and document remnant.

## 8. Verification and closure

Use the smallest sufficient checks for each claim, but include every applicable static, type, lint, unit, integration, contract, migration, security, negative, runtime, smoke, visual, financial, isolation, release, and production scope. A build does not prove runtime, security, finance, isolation, migration, visual, or production behavior.

Strict validation must pass with all state gates at zero. It additionally recomputes repository-backed control-panel inventory and fails when any discovered section, route file, interactive source, required surface, evidence link, root cause, work item, acceptance criterion, verification, or cross-surface journey is missing or invalid.

## 9. Final delivery

Record and return:

- target branch and pinned baseline SHA;
- resulting commit SHA and latest remote SHA;
- diagnosed surfaces, control-panel sections, routes, pages, tabs, features, actions, flows, contracts, services, data stores, and tests;
- root causes and target truth owners;
- work-item order and phase gates;
- commands and actual results;
- every remaining blocker or unproven claim;
- explicit confirmation of whether operational files were changed;
- disposal proof after durable outputs are moved to their canonical owners.
