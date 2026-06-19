# 11 — Interface Blueprints

Status: CANONICAL
Stage: PHASE-9A_CURRENT_PHASE_INTERFACE_CONTRACTS

## Purpose

Phase 9A defines interface ownership contracts before product slices. It does not create runtime shells, page templates, navigation runtime, auth-session runtime, or repeated screen blueprint files.

The remaining Phase 9 work is activated incrementally:

```text
9A Interface Contracts
9B Service Activation Manifest
9C Mobile Interface Runtime
9D Auth Session Runtime
9E Navigation and Stack
9F Control Panel Interface
9G Webapp and Website
9H Reserved Service Activation
```

## Ownership Model

- `apps/*` are runtime shells only.
- `shared/app-shell` is contracts-only in Phase 9A.
- `shared/ui-kit` owns reusable design tokens, themes, components, and visual patterns.
- `services/<service>/frontend/<surface>` owns service-specific screens and flows.
- the donor repository is reference and evidence only.

## Canonical Services

dsh, wlt, knz, arb, amn, esf, mrf, snd, kwd.

## Current Phase Services

dsh, wlt.

`CURRENT_PHASE` describes the Phase 9A planning boundary. It does not declare a service runtime-active or a product slice closed.

## Reserved Services

knz, arb, amn, esf, mrf, snd, kwd.

Reserved means known and planned, not rejected and not forgotten.

## Canonical Surfaces

app-client, app-partner, app-captain, app-field, control-panel, webapp, website.

## Current Phase Surfaces

app-client, app-partner, app-captain, app-field, control-panel.

## Reserved Surfaces

webapp, website.

## Current Phase Service-Surface Map

dsh:

- app-client
- app-partner
- app-captain
- app-field
- control-panel

wlt:

- app-client
- control-panel

## Screen Placement Rule

Service screens must be placed only under:

```text
services/<service>/frontend/<surface>
```

Forbidden locations:

- `shared/app-shell`
- `shared/ui-kit`
- `core`
- `apps/*/runtime` when the file contains service logic

## Repeated Blueprint Files Are Forbidden

Do not create `SCREEN_BLUEPRINT.md` under every surface.

Screen and slice planning must be expressed through:

- `services/<service>/service.manifest.ts` only when the service enters an active slice
- `tools/registry/runs/<SESSION>/slice-scope.md` during execution when needed

## Reserved Interface Artifacts Register

The following artifacts are reserved names and must not be created in Phase 9A:

- `governance/12_CONTROL_PANEL_SECTION_BLUEPRINTS.md`
- `shared/app-shell/mobile/MobileAppShell.tsx`
- `shared/app-shell/mobile/MobileTabShell.tsx`
- `shared/app-shell/mobile/MobileStackShell.tsx`
- `shared/app-shell/mobile/MobileScreenFrame.tsx`
- `shared/app-shell/control-panel/ControlPanelShell.tsx`
- `shared/app-shell/control-panel/ControlPanelSectionLayout.tsx`
- `shared/app-shell/control-panel/ControlPanelPageFrame.tsx`
- `shared/app-shell/control-panel/ControlPanelDataPage.tsx`
- `shared/app-shell/control-panel/ControlPanelDetailPage.tsx`
- `shared/app-shell/navigation/`
- `shared/app-shell/rtl/`
- `shared/app-shell/locale/`
- `shared/app-shell/auth-session/`
- `webapp` and `website` current-phase activation
- reserved service current-phase activation

Creating any reserved artifact requires an activation gate.

## Activation Gate For Reserved Artifacts

Before creating any reserved artifact, the implementing agent must provide:

1. artifact name
2. active slice name
3. service owner
4. surface owner and consumers
5. reason the artifact is needed now
6. why existing ui-kit, app runtime, or service-local code is insufficient
7. exact files to be created
8. forbidden responsibilities check
9. typecheck command
10. foundation or slice gate command
11. evidence path

Any reserved artifact created without this gate is invalid.

## Phase 9 Activation Roadmap

### 9B — Service Activation Manifest

Open with the first real service slice, expected to be `DSH-001 Store Discovery`. Create only the active service manifest and scope it to the active slice. Before slice closure, satisfy service activation requirements through `services/<service>/service.manifest.ts` and slice evidence. Do not create `SERVICE_BLUEPRINT.md` unless a later activation gate explicitly approves it, and resolve any older governance or guard requirement before activating the slice. Do not create manifests for inactive services.

### 9C — Mobile Interface Runtime

Open only for a real mobile screen that proves a platform-level runtime need not met by ui-kit, app runtime, or service-local code. A single consumer does not justify shared ownership by itself. The artifact must contain no service logic, API access, or direct Tamagui use.

### 9D — Auth Session Runtime

Open only after the identity contract, auth-session client, actor identity model, and runtime binding exist. Fake actor identifiers, environment fallbacks, and demo sessions are forbidden.

### 9E — Navigation and Stack

A service-local flow remains under its owning service. Move navigation infrastructure to app-shell only when multiple consumers or a platform runtime responsibility prove that it is genuinely shared.

### 9F — Control Panel Interface

Open with the first real control-panel slice. Governance document 12, shell layouts, and page templates remain reserved until the activation gate passes.

A page template may be created only when a real page has:

- API contract
- permissions
- loading state
- empty state
- error state
- runtime evidence
- visual evidence when applicable

### 9G — Webapp and Website

`webapp` and `website` remain reserved until an approved `WEBAPP-001` or `WEBSITE-001` slice updates the current-phase contracts.

### 9H — Reserved Service Activation

Activate one reserved service at a time through an approved service slice. Add only that service and its approved surfaces to current-phase contracts, then create only the artifacts required by that slice.

## Control Panel Reserved Taxonomy

These names are reserved taxonomy only, not routes and not files in Phase 9A:

- dashboard
- operations
- support
- finance
- catalogs
- partners
- marketing
- system-platform
- administration
- hr

## Reserved Control Panel Page Template Names

These names are reserved only and must not be created in Phase 9A:

- ControlPanelOverviewPage
- ControlPanelDataTablePage
- ControlPanelQueuePage
- ControlPanelDetailPage
- ControlPanelEditorPage
- ControlPanelReviewPage
- ControlPanelMetricsPage
- ControlPanelTimelinePage
- ControlPanelSettingsPage

## Acceptance condition

This file is accepted only when:

- Phase 9A creates contracts only
- no TSX runtime file is added under `shared/app-shell`
- no control-panel template is added
- no navigation, auth-session, rtl, or locale runtime folder is added
- no repeated `SCREEN_BLUEPRINT.md` file is added
- no `service.manifest.ts` is created without an active slice
- current phase services remain dsh and wlt only
- reserved services do not enter current phase maps
- reserved surfaces do not enter current phase maps
- `shared/ui-kit` is not modified by Phase 9A
- app-shell typecheck passes
- foundation gate passes
