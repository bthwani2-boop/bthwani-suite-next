---
version: alpha
name: BThwani Unified Surface UI
description: A governed Arabic-first commerce and operations interface with warm surfaces, navy structure, and orange action signals.
colors:
  primary: "#0A2F5C"
  action: "#FF500D"
  background: "#FFFCF8"
  surface: "#FFFFFF"
  text: "#0A2F5C"
typography:
  sans:
    fontFamily: "var(--font-arabic), system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
rounded:
  DEFAULT: "0.5rem"
  sm: "0.25rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  round: "999px"
spacing:
  unit: "4px"
  page-padding: "16px"
  section-gap: "24px"
  page-max: "1120px"
components:
  button:
    backgroundColor: "colors.action"
    textColor: "colors.surface"
    typography: "typography.sans"
    rounded: "rounded.md"
    padding: "spacing.page-padding"
  input:
    backgroundColor: "colors.surface"
    textColor: "colors.text"
    typography: "typography.sans"
    rounded: "rounded.md"
    padding: "spacing.page-padding"
  card:
    backgroundColor: "colors.surface"
    textColor: "colors.text"
    rounded: "rounded.lg"
    padding: "spacing.page-padding"
  dialog:
    backgroundColor: "colors.background"
    textColor: "colors.text"
    rounded: "rounded.lg"
    padding: "spacing.page-padding"
  table:
    backgroundColor: "colors.surface"
    textColor: "colors.text"
    rounded: "rounded.md"
    padding: "spacing.page-padding"
  state:
    backgroundColor: "colors.background"
    textColor: "colors.text"
    rounded: "rounded.md"
    padding: "spacing.page-padding"
---

# BThwani Unified Surface UI

Status: DERIVED_DESIGN_ADAPTER

Primary durable design/experience truth input: `governance/product/EXPERIENCE-AND-DESIGN.md`.

This file is a compact tool/design-system adapter and current runtime mapping. It does not independently certify Product, brand, UX, ownership or canonical architecture. On branch `h`, durable design meaning is reconciled with current explicit human intent, Product/System truth, live implementation/runtime evidence and the canonical orchestrator rather than accepted solely because a governance file states it.

## Runtime ownership

- Cross-surface runtime token/theme implementation: `shared/ui-kit/src/tokens`, `shared/ui-kit/src/foundation.ts`, `shared/ui-kit/src/theme`.
- Public platform adapters: `shared/ui-kit/src/index.ts`, `shared/ui-kit/src/web.ts`, `shared/ui-kit/src/mobile.tsx`.
- Control-panel chrome variables are derived composition, not a second foundation.

These paths describe the current implementation and must themselves survive the orchestrator's ownership/topology challenge; this adapter does not grant them preservation rights.

## Current visual mapping

The current implementation expresses the warm-surface/navy-structure/orange-action language represented above. Arabic is the primary reading lane, while Latin/mono roles support identifiers and technical values. Material changes to this mapping require evidence that the resulting design meaning and runtime implementation remain consistent; this file is updated as a derivative, not used as a second mutable design authority.

## Component implementation expectations

Shared controls implement materially applicable interaction states, visible focus, accessibility semantics, RTL/LTR adaptation, reduced motion and truthful loading/error/recovery presentation. UI components may format and present canonical state but cannot fabricate business, financial, authorization or service-health truth.

Reusable visual decisions belong under the proven canonical design-system owner. A surface-local value/component is valid only when it is genuinely local or a platform/task adaptation rather than a competing shared foundation.

## Tool boundary

Verification commands, exact source paths and current component ownership are implementation evidence and may evolve. `UX-CONTRACT.md` is a derived tool-facing map. Neither adapter may override the `h` orchestrator, self-certify governance semantics, or substitute documentation for rendered/device/runtime proof when those claims are material.
