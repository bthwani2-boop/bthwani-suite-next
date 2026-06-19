# Evidence Gate Router

Goal: choose the smallest sufficient verification gate.

## Gate levels

### LOW — documentation or agent text only

Required:

```powershell
git --no-pager status --short
git --no-pager diff --check
```

### MEDIUM — source code, package code, or config

Required:

```powershell
git --no-pager status --short
git --no-pager diff --stat
git --no-pager diff --name-status
git --no-pager diff --check
```

Add targeted package check when the touched package has a script.

### UI — screen, route, component, visual behavior

Required:

- MEDIUM gate
- UI kit boundary guard when relevant
- screenshot or `NEEDS_VISUAL_EVIDENCE`
- loading/empty/error/success/offline/disabled state notes when affected

### API — OpenAPI, client, adapter, backend binding

Required:

- MEDIUM gate
- contract lint when affected
- generated client evidence when generated output changes
- no raw screen fetch
- runtime proof when behavior is claimed

### RUNTIME — Docker, data-plane, services, live-like smoke

Required:

- MEDIUM gate
- relevant Docker/runtime scripts from `package.json`
- logs or smoke output
- no memory repository/live-like shortcut

### HIGH — move/delete/refactor/boundary/public API

Required:

- pre-change snapshot
- explicit touched-path list
- rollback note
- patch review
- targeted verification
- evidence pack when useful

### CRITICAL — remote writes, branch mutation, force operations

Default: `BLOCKED` unless the user explicitly requests the operation.

## Decision output

Every review must end with one of:

`PASS`, `PASS_WITH_WARNINGS`, `FIX_REQUIRED`, `BLOCKED`, `READY_FOR_PR`, `REVERT_REQUIRED`, `NEEDS_EVIDENCE`, `NEEDS_VISUAL_EVIDENCE`, `NO_ACTION_REQUIRED`.
