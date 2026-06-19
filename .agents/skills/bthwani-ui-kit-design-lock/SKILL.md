---
name: bthwani-ui-kit-design-lock
description: Enforce shared UI kit authority, RTL correctness, and BThwani visual identity.
---

# bthwani-ui-kit-design-lock

## Use when

- UI-kit, visual design, screens, shared components, Tamagui, tokens, or RTL layout is involved.

## Procedure

1. Reusable design belongs in `shared/ui-kit` and public `@bthwani/ui-kit` exports.
2. Tamagui stays inside `shared/ui-kit` only.
3. Screens consume public UI kit components.
4. Enforce deepBlue `#0A2F5C`, orange `#FF500D`, white `#FFFFFF` through tokens.
5. Cover loading/empty/error/success/offline/disabled states when affected.

## Evidence / checks

Run targeted typecheck and UI-kit guards: no direct Tamagui, no local design system, no raw hex outside UI-kit, no UI-kit deep imports. UI changes need screenshots or `NEEDS_VISUAL_EVIDENCE`.

## Forbidden

- Local reusable design systems in apps/services.
- Direct Tamagui imports outside UI-kit.
- Random visual constants in screens.

## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.
