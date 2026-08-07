# BThwani Governance

This directory contains repository governance only. It must not become a storage area for prompts, execution plans, diagnostics, runbooks, generated evidence, or historical task state.

## Authority model

Conflict resolution starts at `governance/authority/authority-precedence.json`. `AGENTS.md` governs agent execution behavior. `governance/GOVERNANCE.md` is the human-readable governance index. Machine-readable registries and schemas are authoritative only for their registered domains.

## Directory contract

| Path | Purpose | Authority class |
| --- | --- | --- |
| `authority/` | precedence, write/branch rules, sole-owner exception and approval boundaries | machine-readable canonical |
| `policies/` | durable repository/product/contracts/security/data/runtime/release policy only | active canonical |
| `contracts/` | shared machine vocabularies and schemas | machine-readable canonical |
| `product/` | platform model, product-truth schema and capability contracts | canonical model + derived capability instances as registered |
| `agents/` | agent roles and approval-domain contracts | machine-readable canonical |
| `skills/` | skill lifecycle, dependencies and routing | machine-readable canonical |
| `guards/` | guard registry, assurance, sets, schemas and binding registries | machine-readable canonical |
| `github/` | desired GitHub enforcement contracts plus explicitly labeled observed snapshots | canonical/derived according to the authority registry |
| `tools/` | tool inventory/routing metadata only | derived support |
| `operational_journey_protocol_package/` | reusable journey/SDLC support while migration to a cleaner support location remains incomplete | derived support only |

## Forbidden content in governance

The following belong outside `governance/` unless a higher registered authority explicitly requires otherwise:

- reusable prompts and command templates → `tools/prompting/`;
- task plans and journey execution plans → `tools/plans/` or `tools/diagnose-implementing/`;
- diagnostic reports and execution-status reports → `tools/diagnostics/` or CI artifacts;
- operational runbooks → `docs/runbooks/`;
- transient evidence, workflow results, screenshots and logs → CI/artifact storage, not governance authority;
- historical superseded state → Git history by default.

## Invariants

1. One authority map: `governance/authority/authority-precedence.json`.
2. One durable policy owner per authority domain.
3. One machine contract per concept; generated or derived projections may not create parallel authority.
4. Every executable guard has a registered contract and a bounded assurance statement.
5. Static evidence never proves runtime, security, finance, release, production or final closure by implication.
6. Derived support must state that it is derived and may not call itself final, governing, canonical or non-bypassable authority.
7. Branch-specific SHA, workflow-run IDs and current observed GitHub state are evidence/state, never durable policy.
8. `tools/plans/smsm-dsh-wlt-journeys/` remains a plan/support package and is not governance authority.

## Change rule

When reorganizing governance, preserve meaning before removing duplication: determine the canonical owner, migrate references and machine consumers, verify the replacement, then retire the old path. Git history is the default archive; do not create archive folders merely to preserve superseded files.
