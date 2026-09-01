# OCR Level-4 Root-Correct Closure — Execution Index

**Repository:** `bthwani2-boop/bthwani-suite-next`<br>
**Branch:** `ocr`<br>
**Audited exact starting HEAD:** `4aa1f00decc9ed2ac5c724b7cc316e0247fe8a0d`<br>
**Execution-mode reconfiguration parent:** `b889d75fbf502e524b0b04289722a6c798933a72`<br>
**Orchestrator package revision:** `24`<br>
**Created:** 2026-09-01<br>
**Execution mode:** `SINGLE_SESSION_DIRECT_ON_OCR` — exactly one material execution session, directly on `ocr`; no Session A/B/C split, no temporary execution worktrees/branches, and no parallel material mutation lanes.<br>
**Completion target:** `LEVEL_4` repository/product fixed point on `ocr`; integration into `master` and requalification of the resulting exact `master` SHA is a separate post-qualification boundary.

> This package is an execution snapshot and closure workset, **not a parallel canonical authority**. The single execution session MUST begin from the live `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`, load the live `01–05` and material focus modules, resolve the current remote `ocr` HEAD, and invalidate/re-rank any item here that no longer matches live truth.

## 1. Why this package exists

The previous `tools/plan/2026-08-31-LEVEL4-REPOSITORY-DEEP-AUDIT-OCR.md` was useful as an audit snapshot, but the branch moved materially after it. Keeping an obsolete audit alongside a new plan would itself create stale execution truth. Its still-useful principles/findings have therefore been distilled here and the superseded file is removed in the same cleanup commit.

This package is designed for the requested end state:

```text
ONE PRODUCT/SYSTEM MEANING
→ ONE CANONICAL OWNER PER MATERIAL TRUTH
→ ONE CANONICAL WRITER PER MUTABLE TRUTH
→ DERIVED/READ-ONLY CONSUMERS ONLY
→ NO SHADOW/MIRROR/PARALLEL AUTHORITY
→ COMPLETE MIGRATION/BACKFILL/RECONCILIATION
→ COMPLETE CUTOVER
→ DELETE SUPERSEDED FILES/PATHS/CONTRACTS/WRITERS/READERS
→ EXACT-CANDIDATE VERIFICATION
→ FRESH ADVERSARIAL RE-AUDIT
→ FIXED POINT
```

`GREEN != CLOSED`. A working build, a passing scanner, or a successful smoke test cannot override an open product/code root.

## 2. Current live verdict at the audited starting SHA

`ocr@4aa1f00d...` is **not Level-4 closed** and is not yet a safe final baseline for `master`.

Material reasons proven on the exact candidate include:

- the newly introduced Cart atomic-idempotency design exists, but exact-candidate backend verification exposes an incomplete receipt data/nullability migration;
- Cart still owns serviceability geography policy and treats missing distance evidence as eligible;
- `dsh.client.checkout` and `dsh.policies` remain `runtimeBound:false` / `FIX_REQUIRED`;
- Support and Dispatch capabilities remain `FIX_REQUIRED`; Notifications still declares experience work required;
- all five DSH surfaces remain `fix-required`;
- WLT itself declares `FIX_REQUIRED`, database readiness false, and production mutations not ready;
- Dispatch frontend still repairs generated wire/domain types manually;
- Client Profile still fabricates a profile on 404, carries `SAR` local defaults, and skips required marketing-consent withdrawal confirmation;
- shared UI still contains file-wide `any` suppression, `@ts-ignore`, hard-coded English copy, and a dead public callback contract;
- Providers and Platform-Control explicitly require current runtime/release evidence;
- exact-candidate DSH seed and clean-install proof are red and must be root-diagnosed without weakening constraints.

At the same time, several former roots have been materially treated and must **not** be reopened from stale reports without evidence. See `01-LIVE-ROOT-GRAPH-AND-CLOSURE-UNITS.md`.

## 3. Repository topology law

The current high-level topology is intentional and should not be flattened for aesthetics:

```text
core/
  identity/
  workforce/
  providers/
  platform-control/

services/
  dsh/
  wlt/

shared/
  data-runtime/
  ui-kit/
  control-panel/

apps/
  app-client/
  app-partner/
  app-captain/
  app-field/
  control-panel/

infra/
  docker/
  data-plane/
  local/
```

Required ownership direction:

- `core/identity`: identity/session/authentication authority and generated client boundary.
- `core/workforce`: workforce profiles/activation/employment authority; **not** geography owner.
- `core/providers`: provider configuration/credentials/health authority; not financial truth.
- `core/platform-control`: platform runtime/change/rollout/control authority.
- `services/dsh`: delivery/shopping product truth and operational orchestration, but no financial writer authority.
- `services/wlt`: only financial mutable truth owner.
- `shared/data-runtime`: runtime/query/connectivity/storage/mutation-identity adapters only; no copied domain policy.
- `shared/ui-kit`: reusable visual primitives/tokens/components, not control-panel business semantics.
- `shared/control-panel`: reusable control-panel presentation/composition only; no duplicate generic UI design system and no domain writer.
- `apps/*/runtime`: deployment/runtime/composition shells only; no canonical business policy.
- `infra/`: executable infrastructure/runtime configuration only; no stale roadmap authority.

Any file violating those responsibilities is a move/merge/delete candidate.

## 4. Files in this execution package

1. **`00-EXECUTION-INDEX.md`** — authority, current verdict, topology law, campaign rules.
2. **`01-LIVE-ROOT-GRAPH-AND-CLOSURE-UNITS.md`** — ranked current Root Graph, actual Source-of-Fix, affected cones, deletion conditions, and previously treated roots.
3. **`02-FILESYSTEM-MIGRATION-CLEANUP-DELETION-MATRIX.md`** — strict file/folder/naming/compatibility cleanup system for `core/shared/infra/services/apps/tools`.
4. **`03-SINGLE-SESSION-DIRECT-OCR-EXECUTION.md`** — one-session direct-on-`ocr` execution contract, exact-HEAD lock, serial root protocol, and per-root closure checkpoint.
5. **`04-VERIFICATION-MERGE-FIXED-POINT.md`** — closure proof, negative-space audit, exact-SHA evidence, merge-to-master qualification.
6. **`05-ORCHESTRATOR-GOVERNANCE-HARDENING.md`** — proposed orchestrator/governance additions that prevent recurrence of parallel truth and stale residue; multi-agent mutation rules are explicitly non-active for this single-session campaign.

## 5. Non-negotiable execution laws

For every material root:

```text
Prove actual defect
→ prove highest executable causal root
→ prove canonical owner/writer
→ inventory ALL writers/readers/consumers/contracts/data/config/runtime paths
→ treat source-of-fix
→ migrate/backfill/reconcile
→ regenerate bindings where applicable
→ cut over all consumers
→ prove zero old consumers
→ delete superseded authority/residue
→ targeted verification
→ negative-space re-audit
→ commit/push
→ verify remote HEAD
→ re-pin exact SHA
→ ingest new evidence
→ re-rank
```

Forbidden final states:

- dual write;
- old and new state machines both reachable;
- manual frontend repair of generated wire contracts;
- error/missing/unknown converted to plausible success/empty/default truth;
- `legacy`, `history`, `old`, `tmp`, `backup`, `v2/v3` runtime residue with no bounded migration purpose;
- stale config kept “just in case”;
- file-wide lint/type suppression used as closure;
- tests weakened to match incorrect behavior;
- database constraints weakened for green checks;
- readiness/status flags manually promoted without exact-candidate evidence;
- cleanup deferred after cutover.

## 6. SHIP or REMOVE

For every active capability or surface feature, choose exactly one:

```text
SHIP = complete owner + contract + runtime + data + journey + failure/recovery + UX + evidence
```

or

```text
REMOVE = remove from active product/capability/navigation/contract/runtime truth,
         delete reachable implementation/config/tests/docs,
         prove zero consumers.
```

There is no final state `ACTIVE_BUT_INCOMPLETE`.

## 7. Current highest execution order

Initial order only; re-rank whenever new evidence changes causality:

```text
R0  Cart receipt/data atomicity closure + DB seed/clean-install truth
R1  Canonical Serviceability/Geo authority
R2  WLT financial production truth
R3  Dispatch canonical contract collapse
R4  Checkout/address/maps runtime binding
R5  Client Profile/locale/currency/consent truth
R6  Support/Notifications/Dispatch journey completion
R7  Five-surface exact journey/UX closure
R8  Shared UI ownership/type/i18n cleanup
R9  Core service runtime/ownership closure
R10 Infra/topology/filesystem cleanup
R11 Repository-wide stale/legacy/history/compatibility residue elimination
R12 Fresh broad adversarial re-audit
R13 Exact final candidate qualification
R14 Integrate into master and requalify resulting exact master SHA
```

The single execution session processes this queue **serially by proven causal priority**, not by preassigned subsystem lanes. A root may cross backend, database, contracts, generated clients, shared packages, apps, core and infra in one causally complete Closure Unit.

## 8. What “100%” means here

This campaign must not claim a mathematical promise that no undiscovered bug can ever exist. The defensible closure target is stronger and auditable:

```text
ZERO KNOWN MATERIAL OPEN ROOTS
ZERO UNKNOWN REQUIRED MATERIAL CELLS
ZERO PARALLEL/SHADOW AUTHORITIES
ZERO DUPLICATE MUTABLE WRITERS
ZERO UNMIGRATED MATERIAL CONSUMERS
ZERO REACHABLE SUPERSEDED PATHS
ZERO UNBOUNDED COMPATIBILITY RESIDUE
ZERO KNOWN MATERIAL UX/RTL/A11Y JOURNEY GAPS
ZERO REQUIRED STALE EVIDENCE
ALL REQUIRED PROOF BOUND TO ONE EXACT FINAL SHA
```

Only after the fresh hostile re-audit fails to discover another material root can the candidate be called evidence-bounded Level-4 closed.
