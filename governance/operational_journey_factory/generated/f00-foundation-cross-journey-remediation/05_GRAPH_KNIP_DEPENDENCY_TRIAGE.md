# 05 Graph, Knip, and Dependency Triage

status: `TRIAGED`

This document captures the dependency analysis derived from Knip, Madge, and Graphify tools.

## Graphify Analysis

- **Nodes**: 7999
- **Edges**: 15378
- **Communities**: 598
- **Html Export**: [bthwani-suite-next-callflow.html](file:///C:/bthwani-suite-next/graphify-out/bthwani-suite-next-callflow.html)
- **Triage Result**: DSH and WLT frontends and backends are structurally clean. Multi-surface dependency pathways follow the canonical monorepo architecture.

## Madge Analysis

- **Circular Dependencies in DSH Backend**: 0 found (`√ No circular dependency found!`)
- **Circular Dependencies in WLT Backend**: 0 found (`√ No circular dependency found!`)

## Knip Analysis

Knip identified several potential dead exports/types:
1. Double exports of default/named in `shared/ui-kit/src/tamagui-config.d.ts` and `shared/ui-kit/src/components/Icon/Icon.d.ts`.
2. Unused types `DshOperationalHeatmap` in `geo.heatmap.types.ts`.
3. Unused classes/types `DshMediaApiClient` in `dsh-media-api.client.ts`.

## Dependency Triage Rules

- Knip does not decide deletion on its own.
- Graphify does not decide completion on its own.
- Every candidate file/export must go through the File Decision Matrix before removal to avoid breaking runtime reflection, dynamic loading, or tests.
