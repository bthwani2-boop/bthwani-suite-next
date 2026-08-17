# Source Map — Orchestrator Consolidation Traceability

STATUS: MIGRATION_RECORD_ONLY
RUNTIME_AUTHORITY: NO

## 1. Purpose

This file records how materially valuable concepts from the existing command/prompt corpus and reviewed historical orchestration generations were consolidated into the protected 9-file orchestrator.

It does **not** make historical sources executable authority and is not required to be loaded during normal project execution.

The human explicitly required the legacy files under `tools/prompting/**` and `tools/commandn` to remain present for now. Their retention is intentional and must not be interpreted as parallel executable authority.

## 2. Disposition vocabulary

- `MIGRATED` — concept preserved in a canonical new owner.
- `MERGED` — duplicate/overlapping concepts collapsed into one canonical rule.
- `SUPERSEDED` — old mechanism replaced by a simpler/current mechanism while preserving the useful invariant.
- `REJECTED_DOMAIN_SPECIFIC` — historical project-state/detail not suitable as permanent orchestrator law.
- `REJECTED_OBSOLETE` — conflicts with current explicit human decisions or current execution model.
- `REJECTED_OVERCOMPLEX` — useful goal preserved but historical machinery intentionally not carried forward.

## 3. Current branch source corpus

| Source | Material concepts | Canonical destination | Disposition |
|---|---|---|---|
| `tools/prompting/01-diagnose-plan-package.md` | authority separation; exact ref/head; target as starting point; root/blast/consumer/dependency expansion; lean/risk-proportional diagnosis; competing hypotheses | `00`, `01`, `02`, `04` | MERGED |
| `tools/prompting/02-execute-verify-close.md` | live source-of-fix; root treatment; consumer reconciliation; exact candidate evidence; cleanup; closure | `03`, `04` | MERGED |
| `tools/prompting/03-end-to-end-fail-closed.md` | default-open/unproven-open; fail-closed closure; rebuild/refactor when root demands it; no docs-only closure | `00`, `03`, `04` | MERGED |
| `tools/prompting/04-journey-multisurface-operational-diagnosis.md` | Journey Matrix; forward/reverse/temporal/cross-layer/cross-surface/negative-space/counterfactual/adversarial diagnosis | `02` | MIGRATED |
| `tools/prompting/05-universal-deep-diagnose-prepare-execute-reconstruct.md` | universal diagnosis/reconstruction; preserve value; scope expansion; cleanup/cutover | `01`, `02`, `03` | MERGED |
| `tools/commandn` | semantic-first; bottom-up evidence; highest systemic root; code/runtime treatment; no patch/parallel truth; re-diagnose loop | `00`–`04` | MERGED |
| prior `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` blob `47a00c666a55ac427eab594ba9cc73ab648bd4b0` | semantic root, coverage, HOLD, competitive deepening, systemic leverage, exact candidate proof, cleanup | `00`–`04` | MERGED |
| prior V5 plan-package/CLI/task-branch machinery | `ONE_TASK_ONE_PACKAGE`, mandatory `plans/diagnose-implementing/**`, CLI-derived state, default Task Branch/Worktree | none as normal flow | REJECTED_OBSOLETE |

## 4. Historical branch concepts intentionally harvested

| Historical family/source | Harvested invariant | Destination | Disposition |
|---|---|---|---|
| `task/v5-commandn-system-root-de1f700b` — `RECONSTRUCTION-MAP.md` | preserve proven value; fix ownership/context; migrate consumers; verify; delete superseded path; semantic structure before file moves | `03`, `focus/code-architecture-organization.md` | MIGRATED |
| same V5 family — `COVERAGE.md` | missing material journey/surface/failure/evidence remains open | `02`, `04` | MIGRATED |
| same V5 family — `CLEANUP.md` | canonical cutover sequence; switch writers/readers; remove fallback/dual truth; zero-reference/runtime proof | `03`, `04` | MIGRATED |
| `task/orch/operational-first-v3-20260815` / related workspace family | Minimum Diagnostic Altitude; progressive narrowing; one owner rather than repeated rule text | `01`, `02` | MIGRATED |
| `task/workspace-e2e-20260815-0938` / root-e2e family | Just-In-Time execution frontier; avoid speculative future sequences | `02` | MIGRATED |
| `task/execution-speed-guard-cleanup` | smallest check that can prove the claim; risk-proportional escalation; static pass does not prove runtime/finance/security | `04` | MIGRATED |
| `task/smar/unified-engineering-system-hardening` | verification strength by risk; contradictory state → need evidence rather than guess | `02`, `04` | MERGED |
| `start` / `review` operational journey commands | explicit exclusion proof; surface must prove operational role; ambiguity becomes concrete missing evidence | `01`, `02` | MIGRATED |
| `working_treating,02` master command | “100%” as measurable coverage/evidence rather than wording | `02`, `04` | MIGRATED |
| `diagnostics/journy-factory-20260707-012609` | discover journey universe live; evidence escalation only for risk/claim that needs it | `01`, `02`, `04` | MIGRATED |
| `journey/*`, `verification/*`, `integration/*` protocol family | minimal sufficient evidence; affected-surface accounting; frontend+backend vertical slice; no docs-only closure | `02`, `03`, `04` | MERGED |
| `task/orchestrator-v5-final-hardening-20260815` | self-integrity concept: one orchestrator, no self-declared closure, adversarial final proof, protect against drift | `00`, `01`, `04` | MIGRATED |
| historical large registries/schemas/matrix systems | machine-heavy state models, duplicated lifecycle enums, numerous evidence IDs/guards | invariant retained only where useful | REJECTED_OVERCOMPLEX |
| historical fixed Journey IDs, finance-specific rows, hardcoded path/table/endpoint assumptions | project-state snapshots | live discovery instead | REJECTED_DOMAIN_SPECIFIC |
| historical absolute `NO machine-readable` rule | generation-specific constraint | none | REJECTED_OBSOLETE |
| historical rigid file line-count/naming templates | heuristic treated as universal law | semantic responsibility/naming rules | SUPERSEDED |

## 5. Current explicit human decisions incorporated

The current orchestrator also incorporates these explicit decisions:

- live End-to-End execution is the normal execution model;
- no default implementation/diagnosis package creation;
- no default writes to `plans/**`;
- preserve existing `tools/prompting/**` and `tools/commandn` until the human removes them manually;
- package is project-specific and may retain stable project vocabulary as discovery anchors;
- anchor meaning/ownership must still be verified live;
- package must remain reasonably sized: neither a mega-file nor a fragmented framework;
- package becomes read-only after this authorized maintenance invocation and future package changes require explicit current human authorization.

## 6. Anti-parallel-authority note

Until the human deletes legacy sources, their physical presence is **historical/source-corpus retention only**.

For new executions, the canonical entry is:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`.

Do not combine old prompts/commandn with the new orchestrator as co-equal instructions unless the human explicitly requests historical comparison.

## 7. Accounting statement

Within the reviewed command/orchestration corpus described above, all materially retained concepts identified during consolidation are assigned a canonical destination or an explicit rejection/supersession reason.

`UNACCOUNTED_REVIEWED_MATERIAL_CONCEPTS = 0`

This statement is intentionally limited to the reviewed orchestration/command corpus; it is not a claim that every historical product file in every branch was semantically audited.