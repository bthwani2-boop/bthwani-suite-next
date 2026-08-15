# Diagnose / Implementing — Index

Status: DERIVED_SUPPORT / NAVIGATION_ONLY

هذا الملف فهرس فقط ولا يملك قواعد مستقلة. السلطة المنهجية: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` ثم الوحدات `01–06` والعقود المشار إليها منه.

## Public commands

```text
new-package.mjs         → governed new package + machine-registry bootstrap
new-sequence.mjs        → governed JIT sequence creation after machine gates
validate-package.mjs    → V2 structural validation + canonical machine gates
migrate-package-v3.mjs  → explicit-resume-only migration of a legacy package to OPEN V3 machine state
```

`*-core.mjs` تنفيذ داخلي محفوظ حرفيًا للـV2 checks؛ لا يستخدم كنقطة دخول عادية.

## Layout

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
└── NNN-<sequence>.md

plans/diagnose-implementing/_machine/<TASK_NAME>/
├── operational-root.json
├── lower-layer-observations.json
└── root-cause-landscape.json
```

## Canonical executable gates

```text
tools/guards/orchestrator/orchestrator-integrity-gate.mjs
tools/guards/orchestrator/task-isolation-gate.mjs
tools/guards/orchestrator/root-anchor-gate.mjs
tools/guards/orchestrator/operational-root-gate.mjs
tools/guards/orchestrator/root-cause-priority-gate.mjs
tools/guards/orchestrator/frontier-derivation-gate.mjs
```

Files named `*-gate.mjs` in this directory are compatibility entries only and contain no duplicate gate logic.

Machine summary synchronization: `tools/orchestrator/sync-machine-summary.mjs`.

Legacy migration never resumes work or trusts prior frontier/priority; it only creates missing V3 machine metadata/registries as `OPEN`. Explicit resume must then re-establish isolation, latest-head/root reconciliation, operational coverage and all canonical gates.
