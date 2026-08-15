# Diagnose / Implementing — Index

Status: DERIVED_SUPPORT / NAVIGATION_ONLY

هذا الملف فهرس فقط ولا يملك قواعد مستقلة. السلطة المنهجية: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` ثم الوحدات `01–06` والعقود المشار إليها منه.

## Public commands

```text
new-package.mjs       → governed package + machine-registry bootstrap
new-sequence.mjs      → governed JIT sequence creation after machine gates
validate-package.mjs  → V2 structural validation + canonical machine gates
```

`*-core.mjs` تنفيذ داخلي محفوظ للـV2 checks؛ لا يستخدم كنقطة دخول عادية.

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
tools/guards/orchestrator/task-isolation-gate.mjs
tools/guards/orchestrator/root-anchor-gate.mjs
tools/guards/orchestrator/operational-root-gate.mjs
tools/guards/orchestrator/root-cause-priority-gate.mjs
tools/guards/orchestrator/frontier-derivation-gate.mjs
```

Files named `*-gate.mjs` in this directory are compatibility entries only and contain no duplicate gate logic.

Machine summary synchronization: `tools/orchestrator/sync-machine-summary.mjs`.
