# Diagnose/Implementing package framework

This framework creates an evidence-backed diagnosis and execution package under `tools/diagnose-implementing/<task-name>/`.

## Operating model

Diagnosis is repository-wide and deep. Execution planning is limited to the named surface and every topic, context, component, service, contract, data path, control-panel area, and inbound or outbound journey proven to be related.

The package must be executable without rediscovering scope, selecting architecture, guessing paths, inventing tests, or deciding closure criteria.

## Generated package

```text
<task-name>/
├─ START-HERE.md
├─ MANIFEST.json
├─ GLOBAL-DIAGNOSIS.md
├─ COVERAGE.json
├─ EXECUTION-ORDER.json
├─ units/
│  └─ U001-<unit-name>/
│     ├─ DIAGNOSIS.md
│     ├─ EXECUTION.json
│     ├─ VERIFICATION.json
│     └─ RESULT.json
└─ CLOSURE.md
```

## Single-owner information model

Each fact has exactly one authoritative package location:

- identity, repository, branch, SHA, objective, primary surface: `MANIFEST.json`;
- repository-wide diagnosis and cross-domain conclusions: `GLOBAL-DIAGNOSIS.md`;
- what was assessed and why it is related or excluded: `COVERAGE.json`;
- unit dependency order and progress: `EXECUTION-ORDER.json`;
- unit-specific cause and evidence: `units/<ID>/DIAGNOSIS.md`;
- exact executable tasks: `units/<ID>/EXECUTION.json`;
- required checks and proof boundaries: `units/<ID>/VERIFICATION.json`;
- actual implementation results: `units/<ID>/RESULT.json`;
- final package closure: `CLOSURE.md`.

Root files may reference unit IDs but must not copy complete unit tasks or verification definitions. Unit files must not repeat repository-wide diagnosis.

## Coverage model

`COVERAGE.json` is the only structured coverage source. The generator seeds compact entries for:

- the repository as a whole;
- `control-panel`, `app-client`, `app-partner`, `app-captain`, and `app-field`;
- every current top-level DSH and WLT control-panel section;
- DSH shared frontend, backend, database, and related WLT domains;
- contracts and clients, events/jobs/integrations, identity/authorization/security, tests/quality, runtime/observability, CI/tooling/automation, and governance/ownership.

The diagnosis must assess every seeded entry from all relevant directions. It may remain summarized at repository, domain, surface, or section level when no relationship or material defect is found. It must expand to exact paths, symbols, features, actions, readers, writers, states, and journeys when an entry is related to execution or contains a material defect.

Allowed assessments:

```text
UNASSESSED
RELATED
NOT_RELATED_WITH_EVIDENCE
DEFECT_OUTSIDE_EXECUTION_SCOPE
EXTERNAL_DEPENDENCY
```

A related entry must link evidence and at least one execution unit. An excluded entry must contain evidence, an exclusion reason, and a reopen trigger. Silence is invalid.

## Execution units

Create exactly one unit for each non-overlapping executable concern. One unit may reference multiple topics, contexts, and journeys; do not duplicate the same concern into separate topic, context, and journey trees.

Every unit must be self-contained and identify:

- its root cause and correct truth owner;
- all affected surfaces and journeys;
- exact paths and symbols;
- exact ordered changes and forbidden changes;
- measurable acceptance criteria;
- verification commands and proof limits;
- rollback and logical commit boundary.

Only one unit may be `IN_PROGRESS`. A unit cannot start until every dependency is `DONE` and every blocking prerequisite is satisfied.

## Creation

```powershell
node tools/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --sha <40-character-sha> `
  --surface <surface-or-section> `
  --objective "<measurable objective>"
```

Create a proven unit:

```powershell
node tools/diagnose-implementing/new-unit.mjs `
  tools/diagnose-implementing/<task-name> `
  --id U001 `
  --name <unit-name> `
  --kind JOURNEY `
  --depends-on ""
```

Allowed unit kinds: `TOPIC`, `CONTEXT`, `JOURNEY`, `FOUNDATION`, `MIGRATION`, `CLEANUP`, `VERIFICATION`.

## Validation

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name>
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict --closure
```

Readiness is calculated from the files. There are no editable gate counters.

Strict validation rejects:

- an unassessed repository area, required surface, or current control-panel section;
- a related entry without evidence and unit links;
- an exclusion without evidence, reason, and reopen trigger;
- a missing, duplicate, or cyclic unit dependency;
- overlapping units claiming the same `executionConcern`;
- vague tasks, missing paths/symbols, target state, acceptance, verification, rollback, or commit boundary;
- verification references that do not exist;
- unresolved template markers, invalid JSON, secret-like content, or inconsistent IDs;
- a plan that is not complete and ready.

Closure mode additionally requires all units to be `DONE`, all required checks to pass on recorded SHAs, no blocker or deviation left unresolved, and a final closure decision.

## Safety

The package is a disposable derived-support artifact. Runtime, builds, CI, migrations, governance, and operations must not depend on it. Never store credentials, secrets, private keys, production data, raw database dumps, personal data, or sensitive screenshots.
