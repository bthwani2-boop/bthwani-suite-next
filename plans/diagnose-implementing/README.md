# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

This framework creates evidence-backed diagnosis/execution packages under `plans/diagnose-implementing/<task-name>/`. It is planning support only and cannot create policy, Product Truth, implementation truth, approval, or final closure.

## Operating model

Start from the named task/surface/journey and expand only through proven ownership, dependency, product, security, financial, data, runtime, or cross-surface impact. The package must make execution possible without rediscovering scope, guessing owners/paths, inventing tests, or creating a parallel truth model.

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

## Information ownership inside a package

- identity/repository/branch/SHA/objective/primary surface → `MANIFEST.json`;
- repository/cross-domain diagnosis → `GLOBAL-DIAGNOSIS.md`;
- assessed scope and inclusion/exclusion evidence → `COVERAGE.json`;
- dependency order/progress → `EXECUTION-ORDER.json`;
- unit root cause/evidence → `units/<ID>/DIAGNOSIS.md`;
- exact tasks/paths/symbols/target state → `units/<ID>/EXECUTION.json`;
- required checks/proof limits → `units/<ID>/VERIFICATION.json`;
- actual results → `units/<ID>/RESULT.json`;
- package-level final summary → `CLOSURE.md`.

Do not duplicate complete unit tasks/checks into root files.

## Coverage

`COVERAGE.json` is the only structured coverage ledger. Allowed assessments:

```text
UNASSESSED
RELATED
NOT_RELATED_WITH_EVIDENCE
DEFECT_OUTSIDE_EXECUTION_SCOPE
EXTERNAL_DEPENDENCY
```

A related entry links evidence and at least one execution unit. An exclusion records evidence, reason, and reopen trigger. Silence is invalid.

## Execution units

Create exactly one unit per non-overlapping executable concern. A unit identifies root cause/truth owner, affected paths/symbols/surfaces/journeys, ordered changes, forbidden changes, measurable acceptance, verification, rollback, and logical commit boundary.

Only one writable unit may be `IN_PROGRESS`. A unit starts only after dependencies are `DONE` and blocking prerequisites are satisfied.

Allowed kinds:

```text
TOPIC | CONTEXT | JOURNEY | FOUNDATION | MIGRATION | CLEANUP | VERIFICATION
```

## Create a package

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --sha <40-character-sha> `
  --surface <surface-or-section> `
  --objective "<measurable objective>"
```

## Create a unit

```powershell
node plans/diagnose-implementing/new-unit.mjs `
  plans/diagnose-implementing/<task-name> `
  --id U001 `
  --name <unit-name> `
  --kind JOURNEY `
  --depends-on ""
```

## Validate

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name>
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict --closure
```

`--closure` requires strict validation. Do not invent unsupported flags.

Strict validation rejects unassessed required coverage, unsupported exclusions, missing/cyclic dependencies, overlapping execution concerns, vague tasks, missing targets/paths/symbols/checks/rollback, nonexistent verification references, unresolved template markers, invalid JSON, secret-like content, or an incomplete plan.

Closure additionally requires all units/results/checks to satisfy the validator's current schema and decision requirements.

## Planning sources

`plans/smsm-dsh-wlt-journeys/` may be used as derived journey discovery/support. It is not Product Truth or implementation evidence and must be reconciled with `governance/product/PRD.md`, applicable Product Truth, current contracts/source/migrations/tests, and runtime evidence where claimed.

## Safety

Runtime, builds, CI, migrations, governance, and operations must never depend on a generated package. Do not store credentials, secrets, private keys, production data, raw dumps, PII, or sensitive screenshots here. Git history is the archive for retired packages unless a current task explicitly requires a retained planning artifact.
