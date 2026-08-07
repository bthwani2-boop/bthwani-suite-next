# BThwani Governance

This directory contains repository governance only. It must not become a storage area for reusable prompts, execution plans, diagnostics, operational runbooks, transient evidence, or historical task state.

## Authority model

Conflict resolution starts at `governance/authority/authority-precedence.json`. `AGENTS.md` governs agent execution behavior. `governance/GOVERNANCE.md` is the human-readable governance index. Machine-readable registries, schemas and policy contracts are authoritative only for the domains explicitly registered by the authority map.

## Directory contract

| Path | Purpose | Authority class |
| --- | --- | --- |
| `authority/` | precedence, branch/write policy, sole-owner exception and approval boundaries | machine-readable canonical |
| `policies/` | six durable human-readable core policies plus explicitly registered machine policy/enforcement files | canonical/adapter exactly as registered |
| `contracts/` | shared machine vocabularies and schemas | machine-readable canonical |
| `product/` | platform model, Product Truth schemas/contracts and registered product decisions | mixed, exactly as registered |
| `domains/` | narrowly scoped canonical domain decisions; never a second general-policy layer | active canonical within unique authority domains |
| `agents/` | agent roles and approval-domain contracts | machine-readable canonical |
| `skills/` | skill lifecycle, dependencies and routing | machine-readable canonical |
| `guards/` | guard registry, assurance, sets, schemas and binding registries | machine-readable canonical |
| `github/` | GitHub enforcement contracts and explicitly labeled observed snapshots | canonical/derived exactly as registered |
| `tools/` | tool inventory/routing metadata only | derived support |
| `operational_journey_protocol_package/` | reusable journey/SDLC support retained while consumers still depend on its paths | derived support only |

## Policies boundary

The six core human-readable policies are only:

- `product.md`
- `contracts.md`
- `security.md`
- `data.md`
- `runtime.md`
- `release.md`

Two machine files are intentionally retained beside them because existing enforcement consumes these paths:

- `repository-retention-policy.json` — registered machine-readable repository-retention/hygiene policy contract;
- `governance.rego` — registered OPA/Conftest enforcement adapter; it enforces higher contracts and creates no policy of its own.

Their classification comes from the authority registry, not from their directory location.

## Content that belongs outside governance

- reusable prompts/command templates → `tools/prompting/`;
- task/journey plans → `tools/plans/` or `tools/diagnose-implementing/`;
- diagnostics/status reports → `tools/diagnostics/` or CI artifacts;
- operational procedures/runbooks → `docs/runbooks/`;
- logs/screenshots/generated evidence → CI/artifact storage;
- historical superseded state → Git history by default.

## Invariants

1. One authority map: `governance/authority/authority-precedence.json`.
2. One durable policy owner per authority domain.
3. One machine contract per concept; projections and derived support may not become parallel authority.
4. Every guard used by canonical Foundation/Journey/Governance sets has a registry entry, execution route and bounded assurance statement.
5. Static evidence never proves runtime, security, finance, release, production or final closure by implication.
6. Derived support must identify itself as derived and may not claim final/non-bypassable/canonical authority.
7. Branch-specific SHA, workflow-run IDs and observed GitHub state are evidence/state, not durable policy.
8. `tools/plans/smsm-dsh-wlt-journeys/` remains planning/support material and is not governance authority.
9. A Markdown document claiming `Status: ACTIVE_CANONICAL` must be explicitly registered as such in the authority map.

## Change rule

When reorganizing governance, preserve meaning before removing duplication: determine the canonical owner, migrate references and machine consumers, verify the replacement, then retire the old path. Git history is the default archive; do not create archive folders merely to preserve superseded files.
