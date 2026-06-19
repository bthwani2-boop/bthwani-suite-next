---
name: bthwani-screen-flow-binding
description: Bind screens, routes, navigation, states, typed clients, and service ownership.
---

# bthwani-screen-flow-binding

## Use when

- A screen, route, navigation entry, app slot, or visible flow is added/changed.

## Procedure

1. Identify surface: app-client, app-partner, app-captain, app-field, control-panel, webapp, website.
2. Map screen to service capability and route/slot registry.
3. Bind to typed client/provider, not direct fetch.
4. Preserve RTL/back behavior and state coverage.
5. Avoid app-shell business logic.

## Evidence / checks

Evidence: route path, screen path, service owner, state coverage, targeted typecheck, and screenshots for visible changes.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.
