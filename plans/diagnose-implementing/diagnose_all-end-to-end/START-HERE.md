# START HERE — Whole-System Canonical Reconstruction on `b`

## 1. Purpose

This directory is the continuing preparation root for the whole BThwani reconstruction effort.

The active strategy is:

`BLUEPRINT → EXACT-COPY BASELINE → ROOT-FIRST CONTENT-PRESERVING RECONSTRUCTION → ZERO-RESIDUE CUTOVER → EXACT-CANDIDATE CLOSURE`

The goal is not to patch the current system and not to rewrite from zero. The goal is to preserve proven value, environment, design, assets, data, contracts and working implementation while replacing wrong ownership, structure, context, flows and parallel truth at the highest proven root.

## 2. Current branch contract

- Repository: `bthwani2-boop/bthwani-suite-next`
- Integration/reference branch for V5 preparation: `A`
- Exact preparation task branch: `b`
- `A` pinned at package rebaseline: `a719d018f7bac118c55c0dec02a7dfa33f10d454`
- `b` reconciled preparation head before this package write: `1c31adb1e8d1443e59ca49e4b75051c2f897a334`
- Current mode: `PREPARE_ONLY`
- No new branch or worktree is created by this package.
- No merge/integration is authorized by PREPARE_ONLY.
- Product/runtime mutations are forbidden in PREPARE_ONLY except a proven diagnostic blocker. Package/document writes are the only intended mutations here.

`b` is already an isolated descendant of the pinned `A` baseline. During preparation it advanced through related finance implementation work after the initial `official_wallet` checkout rejection. That foreign delta is treated as evidence/input, not as proof of closure or as permission to reorder work by recency; its affected finance assumptions must be revalidated when that root reaches execution.

## 3. Canonical orchestration authority

Executable orchestration semantics come only from current V5:

1. `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
2. `plans/diagnose-implementing/PACKAGE.template.md`
3. `plans/diagnose-implementing/orchestrator.mjs`
4. `tools/guards/governance-schema-gate.mjs`

The following remain useful techniques or historical evidence, not competing executable authority:

- `tools/prompting/01-diagnose-plan-package.md`
- `tools/prompting/02-execute-verify-close.md`
- `tools/prompting/03-end-to-end-fail-closed.md`
- `tools/prompting/04-journey-multisurface-operational-diagnosis.md`
- `tools/prompting/BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md`
- every older diagnose/implementation package listed in `SOURCE-MANIFEST.md`

Product/runtime/data truth must still be proven from current authorized Product Truth and current candidate code/contracts/DB/runtime.

## 4. Whole-system scope

The semantic root is the entire platform, including at minimum:

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`
- Identity
- Workforce
- DSH commerce/store/catalog/order/dispatch/delivery/support
- WLT wallet/ledger/payment/COD/collateral/custody/debt/penalty/settlement/payout/refund/reconciliation
- Platform Control
- Providers
- Media and directly governed shared capabilities
- APIs/contracts/generated clients
- DB schemas/migrations/data ownership
- events/outbox/jobs/webhooks/providers
- auth/permissions/isolation/audit/privacy
- Expo/EAS/native/Metro
- Next.js
- Go
- PostgreSQL
- Docker/runtime/env/config
- CI/security/observability
- repository structure/naming/dependencies/tests/tooling/governance
- every directly affected writer, reader, consumer, handoff and cross-surface readback

No surface or service is considered an independent product island.

## 5. What the diagnosis established

The previous `diagnose_all-end-to-end` package is valuable but its merged active meaning was mainly finance/delivery/captain/partner-store-delivery. It must not be mistaken for whole-system completion.

Current live `b` evidence also proves at least:

- Workforce still carries writable BTHWANI-captain financial guarantee fields and caller-proposed penalty amount even though WLT is the financial owner.
- Partner delivery still derives `branchId` from `storeId` and passes `storeCourierId` directly to Workforce readiness, proving identifier/branch semantic debt.
- `b` has begun the correct three-checkout-choice direction by rejecting `official_wallet` as checkout tender, but this single fix does not prove consumer/schema/UI/generated cleanup.

Historical surface packages additionally expose reusable, revalidation-required gaps around Captain runtime/eligibility, Client commercial/account journeys, Partner selected-store semantics, Field provisioning/readiness duplication, Control Panel multi-owner boundaries and final runtime/cleanup evidence.

See `DIAGNOSIS.md`, `ATTACHMENT-DEEP-DIAGNOSIS.md` and `BLUEPRINT-TRACEABILITY.md`.

## 6. Active read order

Read and obey in this order:

1. `PACKAGE.md` — V5 machine-checkable facts, operational coverage, root graph, ledger, frontier and evidence.
2. `DIAGNOSIS.md` — current whole-system diagnosis and root landscape.
3. `ATTACHMENT-DEEP-DIAGNOSIS.md` — reconciled material findings/negative-space obligations from the supplied discussion and prior diagnosis.
4. `BLUEPRINT-TRACEABILITY.md` — maps blueprint concepts into canonical owners, contracts and required proof.
5. `CANONICAL-SYSTEM-BLUEPRINT.md` — target human-readable system truth and implementation contract.
6. `RECONSTRUCTION-MAP.md` — foundation preservation, target repository rules, content conservation and current→target cutover method.
7. `MASTER-RECONSTRUCTION-COMMAND.md` — one operator command for this PREPARE pass and the later explicit EXECUTE switch.
8. `DECISIONS.md` — reconciled binding product decisions; implementation must not reopen them for convenience.
9. `COVERAGE.md`, `IMPLEMENTATION-AUDIT.md`, `CLEANUP.md`, `RECONCILIATION.md`, `SOURCE-MANIFEST.md` — retained supporting evidence/provenance until unique material content is fully accounted; they do not override `PACKAGE.md` or current V5.

## 7. Reconstruction doctrine

For every inherited item:

`KEEP | HARDEN | MOVE | RENAME | MERGE | SPLIT | REFACTOR | MIGRATE | REGENERATE | REWRITE | REPLACE | DELETE`

No item survives because it already exists.

No item is deleted merely because a static tool calls it dead.

The rule is:

`PRESERVE PROVEN VALUE; REPLACE WRONG CONTEXT; MIGRATE ALL CONSUMERS; VERIFY; THEN DELETE THE SUPERSEDED CONTAINER.`

For UI/design, visual and UX value is preserved by default when still correct. File placement, state ownership, API binding, business logic, auth, failure handling and data ownership may be rebuilt underneath it.

## 8. Preparation method

Do not deep-audit every file upfront.

Preparation sequence:

1. whole-system operational root;
2. product outcomes and actors;
3. authority/responsibility and canonical owner map;
4. complete journey inventory;
5. states/transitions/handoffs/invariants;
6. negative-space and adversarial pass;
7. root-cause and dependency graph;
8. canonical system blueprint;
9. target repository/architecture rules;
10. foundation preservation inventory;
11. content-conservation/deletion rules;
12. ranked execution frontier;
13. verification and cleanup plan.

Deep technical diagnosis is then Just-In-Time for the current highest-ranked root on the current `b` HEAD.

## 9. Execution unit after mode change

The unit is never “one file”, “one screen”, “one app” or “one bug”.

It is:

`ROOT CAUSE × JOURNEY CLUSTER × COMPLETE VERTICAL SLICE`

A root treatment follows:

`operational meaning → canonical owner → states/rules → contracts/data → backend → events/jobs → all consumers → all surfaces → migration/readback → legacy removal → runtime/E2E/adversarial verification`

No leaf patch is allowed while a higher known root can invalidate it.

## 10. PREPARE_ONLY completion gate

This package may be called PREPARED only when current V5 can derive the prepare state and the package has:

- whole-system coverage accounted;
- no known material actor/surface/domain/journey silently omitted;
- canonical owner landscape accounted;
- all current material findings attached to a root or excluded with proof;
- root ranking and dependencies valid;
- true non-derivable decisions resolved or explicitly blocking;
- Blueprint sufficient to prevent implementation agents from inventing product/architecture decisions;
- target repository architecture rules defined;
- foundation preservation rules defined;
- content-conservation and deletion gates defined;
- verification defined before implementation;
- every frontier work item `PREPARED`.

PREPARED is not DONE, runtime PASS or product closure.

## 11. Final closure doctrine

Later execution may claim final closure only on one exact candidate after:

- canonical owner cutovers are complete;
- all writers/readers/consumers are migrated;
- all required migrations/contracts/generated clients are synchronized;
- no reachable old authoritative path remains;
- no fallback/workaround/compatibility source remains without proven requirement;
- no dead or duplicate material residue remains;
- failure/recovery/concurrency/idempotency/security/finance/privacy paths pass;
- all affected surfaces show canonical readback;
- runtime and real integration evidence pass where required;
- final adversarial/negative-space review finds no known material open item.

The objective is evidence-bound finality, not an unsupported claim that future bugs are mathematically impossible.
