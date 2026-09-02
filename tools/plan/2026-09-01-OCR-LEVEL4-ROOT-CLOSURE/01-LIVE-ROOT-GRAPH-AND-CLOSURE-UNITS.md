# LIVE ROOT GRAPH AND CLOSURE UNITS — `g`

## 0. Purpose

This file is the dynamic execution map for the dedicated radical-cleanup/restructure branch `g`.

It is not a static backlog. Every root status must be revalidated against the current exact remote `g` SHA before mutation.

Allowed states:

- `STILL_PROVEN_OPEN`
- `FIXED_REVALIDATION_REQUIRED`
- `SUPERSEDED`
- `FALSE_POSITIVE`
- `UNKNOWN_REQUIRES_PROOF`
- `CLOSED_EXACT_SHA`

No root may be called closed from historical evidence alone.

## 1. Root-classification law

A symptom is promoted to a root only when its causal source is proven. CI job names, scanner findings, compiler errors, and UI symptoms are evidence inputs, not root identities.

A local defect must be escalated to `POTENTIAL_STRUCTURAL_ROOT` when the same responsibility shows multiple indicators such as:

- duplicate owners/writers;
- repeated local fixes;
- manual DTO/contract repairs;
- manual mappings or mirrors;
- multiple wrappers/adapters;
- parallel directories or APIs;
- conflicting defaults/config sources;
- legacy compatibility dominating the implementation;
- duplicated state machines/policies/validation;
- unclear responsibility or widespread import indirection.

If structural root is proven:

`STOP PATCHING DESCENDANTS → DEFINE MINIMUM CANONICAL TARGET → RESTRUCTURE ROOT → MIGRATE ALL CONSUMERS → CUT OVER → DELETE DEFECTIVE STRUCTURE`.

## 2. Live reclassification at audit pin `a86f546…`

### G-R0 — Exact-candidate evidence / DSH clean-install and backend red diagnosis

**State:** `UNKNOWN_REQUIRES_PROOF`

Known evidence:

- exact-candidate workflow evidence for `a86f546…` was not discovered through the available commit-run query;
- PR/merge-context run `33574719348` is useful but non-authoritative for exact-candidate closure;
- runtime smoke passed in that run;
- WLT database safety passed in that run;
- DSH DB integration/clean-install, several backend jobs, and evidence aggregation were red.

Required diagnosis:

1. obtain exact-HEAD or reproducible equivalent evidence;
2. classify each red as source defect, environment/evidence defect, or superseded failure;
3. if DSH clean-install/bootstrap is defective, identify the highest schema/seed/migration root and close it as one data/bootstrap closure unit;
4. do not weaken gates or reinterpret failure as success.

Closure proof:

`exact candidate evidence + clean install/readiness + affected backends + evidence aggregation + negative-space no hidden bypass`.

### G-R1 — Cart mutation receipt invariant

**State:** `FIXED_REVALIDATION_REQUIRED`

Evidence:

- commit `a86f546d9d4c5fa7fbcd0e27d7c7fbe92b2ff74e` explicitly closes the cart mutation receipt invariant.

Required revalidation:

- schema nullability and runtime scan semantics agree;
- mutation receipt persistence/readback is atomic;
- all cart mutation writers/readers use the same invariant;
- no legacy receipt path remains;
- clean-install schema contains the same constraint.

Do not reopen as a coding root unless fresh evidence contradicts the fix.

### G-R2 — Serviceability / geo canonical authority

**State:** `STILL_PROVEN_OPEN`

Live source inspection at the audit pin still shows serviceability semantics embedded in cart/runtime code rather than proven as one canonical geo/serviceability authority. The affected cone must be re-inventoried before mutation.

Root objective:

`ONE serviceability meaning → ONE canonical owner/writer/policy → derived consumers only`.

Required treatment:

- inventory city vocabulary/aliases, distance thresholds, eligibility decisions, missing-location semantics, delivery-zone/store coverage, admin/config writers, API contracts, and all app consumers;
- choose canonical source;
- migrate every decision path;
- remove hardcoded/local shadow policies and duplicate mappings;
- prove UNKNOWN/MISSING cannot silently become ELIGIBLE;
- delete superseded serviceability code/config.

### G-R3 — WLT financial production truth

**State:** `UNKNOWN_REQUIRES_PROOF`

Prior planning material marked WLT production truth incomplete; the merge-context run later showed WLT database safety passing. Neither fact is enough to declare the full financial cone open or closed.

Revalidate:

- canonical ledger/balance writer;
- transaction idempotency;
- mutation atomicity;
- persisted readback;
- DB readiness/clean install;
- reconciliation;
- generated/contracts;
- runtime surfaces.

If one canonical financial root is already healthy, mark prior findings `SUPERSEDED` rather than reimplementing them.

### G-R4 — Dispatch canonical contract collapse

**State:** `UNKNOWN_REQUIRES_PROOF`

Historical evidence indicated frontend repair of generated dispatch types. Revalidate on exact `g` before mutation.

If still present:

`runtime semantics → canonical contract → regenerate → migrate all consumers → delete Omit/intersection/manual enum/DTO repair layers`.

Closure requires zero manual authority over generated wire semantics.

### G-R5 — Checkout / address / maps runtime binding

**State:** `UNKNOWN_REQUIRES_PROOF`

Revalidate product/runtime truth, not metadata labels.

Affected cone includes:

- address persistence/readback;
- selected address identity;
- map coordinates/geocoding;
- serviceability integration;
- checkout quote/order mutation;
- missing/invalid address behavior;
- permissions/offline/retry/recovery;
- deep-link/navigation state;
- all relevant surfaces.

If multiple address/map/serviceability models exist, escalate to structural root and consolidate.

### G-R6 — Client profile / locale / currency / consent truth

**State:** `UNKNOWN_REQUIRES_PROOF`

Historical findings must be freshly checked before mutation. Explicitly search for:

- fabricated ready profile on missing/error states;
- hardcoded locale/currency defaults representing business truth;
- unsafe casts around locale/currency;
- mutation state not reflected in UI/readback;
- consent withdrawal without required confirmation/audit semantics;
- multiple profile owners or duplicated preference models.

Close only from canonical persisted/readback truth.

### G-R7 — Support / notifications / dispatch journeys

**State:** `PARTIAL_FIX_REVALIDATION_REQUIRED`

Support direct-conversation serialization was changed by commit `d2f6ac31075c7638bbe93ff72c7f920d570ed7e8`.

Do not treat that as full support closure. Revalidate:

- support conversation identity/idempotency;
- message persistence/readback;
- authorization;
- duplicate conversation prevention;
- notifications delivery/read state;
- dispatch handoffs/status recovery;
- offline/error/retry/unknown outcome;
- cross-role journeys.

Any surviving duplicate conversation writer/state machine is a structural root.

### G-R8 — Five-surface exact journey / UX closure

**State:** `UNKNOWN_REQUIRES_PROOF`

Revalidate all material journeys across client, partner, captain, field, and control panel against live runtime.

Required journey-state coverage:

`entry → loading → success → missing/empty → error → retry → offline/degraded → auth/permission → conflict/concurrency → mutation → unknown-outcome recovery → persisted readback → navigation/deep-link → cross-role handoff → accessibility → RTL/LTR → recovery`.

Do not use metadata `ready`/`implemented` as proof.

### G-R9 — Shared UI / shared runtime ownership and duplication

**State:** `UNKNOWN_REQUIRES_PROOF`

Revalidate:

- `shared/ui-kit/**` contains only generic UI/design-system responsibility;
- `shared/control-panel/**` contains only control-panel-specific composition;
- `shared/data-runtime/**` contains runtime/query/storage/connectivity primitives, not business truth;
- duplicated wrappers/components/formatters/mappings are consolidated or deleted;
- type suppressions/casts do not conceal ownership/contract defects;
- hardcoded business text/state is not duplicated across surfaces.

If a shared layer merely wraps a true owner with no material value, migrate consumers and delete it.

### G-R10 — Core ownership/runtime truth

**State:** `UNKNOWN_REQUIRES_PROOF`

Do not delete `core/**` by name. Prove each subtree's sovereign cross-domain responsibility and runtime reachability.

For each core package:

`owner → writers → readers → runtime binding → consumers → unique responsibility → disposition`.

Anything without unique responsibility must be moved/merged/deleted after consumer migration.

### G-R11 — Infra / topology / configuration canonicalization

**State:** `STILL_PROVEN_CAMPAIGN_ROOT`

This is a structural campaign root, not a single file bug.

Audit:

- executable runtime/config vs historical documentation;
- duplicated env/config truth;
- obsolete compose/workflow/script paths;
- dead service definitions;
- stale topology assumptions;
- local vs CI divergence;
- ports/health/readiness/seed/bootstrap ownership;
- generated/runtime config mirrors.

End state:

`one executable topology per supported environment + no historical/shadow runtime authority`.

### G-R12 — Repository-wide filesystem / semantic duplication / residue elimination

**State:** `STILL_PROVEN_CAMPAIGN_ROOT`

This is mandatory because `g` is the dedicated cleanup/restructure branch.

It covers every artifact class:

`line/symbol/file/directory/package/schema/contract/generated/config/test/fixture/mock/script/dependency/documentation-with-runtime-authority`.

Search and disposition:

- dead/unreachable;
- stale/obsolete/superseded;
- legacy/history/archive/backup/copy/tmp/temp/prototype/experimental;
- duplicate mutable writers;
- semantic duplicates;
- manual mirrors/keep-in-sync layers;
- wrappers without unique responsibility;
- unused exports/routes/config/dependencies;
- misplaced files/folders;
- ambiguous owner;
- compatibility without bounded removal.

Every material hit must be `KEEP_PROVEN`, `REHOME`, `MERGE`, `SPLIT`, `REWRITE`, `REGENERATE`, `DELETE`, or `BOUNDED_RETIREMENT`.

### G-R13 — Fresh adversarial re-audit

**State:** `BLOCKED_BY_OPEN_ROOTS`

After the root queue first becomes empty, perform a fresh broad audit independent of historical findings.

A new material finding reopens the graph immediately.

### G-R14 — Exact final `g` candidate qualification

**State:** `BLOCKED_BY_G-R13`

Pin one exact `g` SHA and qualify product, code, data, contracts, runtime, structure, security, UX, negative-space, and cleanup on that exact candidate.

### G-R15 — `g → master` integration/requalification

**State:** `OUTSIDE_ACTIVE_CLEANUP_CAMPAIGN`

Only after `G_LEVEL4_CANDIDATE_READY`.

Integration is a separate boundary. Resulting master SHA must be separately requalified.

## 3. Closure-unit declaration template

Before material mutation declare:

```text
ROOT_ID=
PINNED_REMOTE_G_SHA=
SEVERITY=
CURRENT_DEFECT=
STRUCTURAL_ROOT?=YES|NO|UNKNOWN
ACTUAL_SOURCE_OF_DEFECT=
ACTUAL_SOURCE_OF_FIX=
TARGET_CANONICAL_RESPONSIBILITY=
CANONICAL_OWNER=
CANONICAL_WRITER=
AFFECTED_CONE=
WRITER_INVENTORY=
READER_CONSUMER_INVENTORY=
DATA_INVENTORY=
CONTRACT_GENERATED_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
OLD_AUTHORITY_TO_DELETE=
FILES_DIRS_PACKAGES_TO_DELETE_OR_REHOME=
NEGATIVE_SPACE_SEARCH=
TARGETED_VERIFICATION=
EVIDENCE_INVALIDATION=
REMOTE_HEAD_CONCURRENCY_RISK=
REOPEN_CONDITIONS=
```

This declaration is not an approval gate. Once the root is proven, execute immediately.

## 4. Root closure record

A root may be recorded `CLOSED_EXACT_SHA` only with:

```text
ROOT_ID=
CLOSED_ON_G_SHA=
CANONICAL_OWNER_PROOF=
CANONICAL_WRITER_PROOF=
MIGRATED_CONSUMERS=
MIGRATED_DATA=
CONTRACT_GENERATED_PARITY=
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS=0
OLD_ROUTES=0
OLD_CONFIG_REFS=0
OLD_RUNTIME_REACHABILITY=0
SUPERSEDED_FILES_DELETED=
SUPERSEDED_DIRS_DELETED=
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
TARGETED_VERIFICATION=PASS
NEGATIVE_SPACE=PASS
PERSISTED_READBACK=PASS_OR_NA
EVIDENCE_DEBT=0
```

Any failed field keeps the root open.
