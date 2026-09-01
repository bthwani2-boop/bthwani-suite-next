# Three-Session Parallel Execution Model

## Decision

**Yes — use three concurrent execution sessions.**  
**No — do not let three sessions write directly and independently to remote `ocr`.**

The fastest safe model is:

```text
ONE COORDINATOR / INTEGRATION AUTHORITY
            │
   ┌────────┼────────┐
   │        │        │
Session A Session B Session C
worktree   worktree   worktree
branch A   branch B   branch C
   │        │        │
   └──── verified closure units ────┘
            │
      ONE integration lane
            │
           ocr
```

Each session may use many read-only/sub-agents internally. Material write authority remains partitioned.

---

# 1. Why three sessions are better than one giant session

A single very long agent window causes:

- context dilution;
- repeated rediscovery;
- slower UI/tool interaction;
- a growing stale root queue;
- greater chance of mixing unrelated write cones;
- poor collision visibility.

Three focused sessions reduce those costs **if** they do not share mutable authority.

The correct unit of parallelism is not “one app per agent” by default. It is **one proven root / canonical owner / collision-safe write cone**.

---

# 2. Coordinator responsibilities

Only one coordinator owns:

- live remote `ocr` HEAD;
- current Root Graph and severity order;
- collision map;
- root assignment;
- canonical integration order;
- evidence invalidation;
- commit/push/re-pin protocol;
- preemption when a higher causal root appears;
- final merge to master.

Before assigning a root the coordinator records:

```text
Root ID
Pinned parent SHA
Canonical owner
Write paths
Read-only affected paths
Known consumers
Migration/data impact
Expected deletion set
Verification set
Collision set
```

---

# 3. Session A — Backend / Data / Canonical Mutable Truth

## Primary ownership

```text
services/dsh/backend/**
services/dsh/database/**
services/wlt/backend/**
services/wlt/database/**
selected core/*/backend/**
selected core/*/database/**
```

## Initial roots

### A1 — Cart receipt/data atomicity closure

- receipt schema/nullability/backfill;
- all mutation verbs;
- replay/concurrency/crash proof;
- remove obsolete receipt compatibility after zero consumers.

### A2 — DSH seed/clean-install truth

- reproduce exact current failures;
- fix domain/schema/seed root;
- fresh + supported upgrade.

### A3 — Serviceability canonical authority backend/data

- policy/service-area model;
- fail-closed unknown semantics;
- remove Cart-owned geography policy after consumers migrate.

### A4 — WLT financial truth

- DB/mutation/reconciliation/provider/unknown-outcome/operator isolation;
- DSH reference-only convergence.

### A5 — Core owner backend failures

Only after fresh exact reproduction. Do not infer Workforce/Platform-Control defects from expired logs.

## Forbidden for Session A

- inventing UI copy/UX behavior;
- manual frontend type repairs;
- changing shared design-system primitives except via explicit coordinated handoff;
- relabeling capability/surface readiness without evidence.

---

# 4. Session B — Contracts / Architecture / Shared / Infra / Filesystem

## Primary ownership

```text
services/dsh/contracts/**
services/wlt/contracts/**
core/*/contracts/**
**/clients/generated/**     # only regenerated from canonical contract
shared/data-runtime/**
shared/ui-kit/**
shared/control-panel/**
infra/**
tools/plan/**
repository path/naming cleanup
```

## Initial roots

### B1 — Dispatch contract collapse

- make governed runtime DTO canonical;
- correct nullability/source identity/exception schemas;
- regenerate;
- remove frontend repair DTO authority with Session C handoff.

### B2 — Contract uniqueness repository-wide

- path+method uniqueness;
- operationId uniqueness;
- no active mirror fragments;
- manual adapter cannot own same operation as generated parent.

### B3 — Shared UI ownership collapse

- ui-kit generic primitives only;
- shared/control-panel CP-specific composition only;
- eliminate duplicate wrappers/primitives;
- remove file-wide type suppressions and dead API.

### B4 — Shared data-runtime boundary

- adapter-only role;
- no auth/finance/order/dispatch policy copied inside shared runtime.

### B5 — Infra cleanup

- canonical compose/runtime topology;
- classify `local`, data-plane, simulator, observability, env files;
- delete stale roadmap/config residues;
- no provider/business truth in infra prose.

### B6 — Filesystem/name cleanup

- `history/legacy/old/tmp/backup/v2/...` classification;
- move/merge/rename/delete only with consumer proof.

## Forbidden for Session B

- directly changing backend business semantics merely to fit a contract;
- generating a contract from wrong runtime behavior without owner agreement;
- creating generic `common/utils` dumping grounds;
- deleting migrations that are required by supported upgrade.

---

# 5. Session C — Product Surfaces / Journeys / UX / Accessibility

## Primary ownership

```text
services/dsh/frontend/app-client/**
services/dsh/frontend/app-partner/**
services/dsh/frontend/app-captain/**
services/dsh/frontend/app-field/**
services/dsh/frontend/control-panel/**
apps/*/runtime/** where runtime-shell behavior is material
```

Shared files are read-only unless Session B explicitly hands ownership over.

## Initial roots

### C1 — Client Profile lifecycle/preferences/consent

- remove fabricated 404 ready state;
- canonical locale/currency domain;
- complete/withdraw consent confirmation;
- implement or remove invisible currency capability.

### C2 — Checkout/address/maps journey

After Session A/B provide canonical serviceability/contracts:

- real address CRUD;
- map search/reverse geocode;
- serviceability state;
- checkout selection/readback;
- provider/error/offline paths.

### C3 — Dispatch consumers

After B1 canonical generated DTO is ready:

- migrate Captain/Partner/Client/Control Panel;
- delete manual DTO repair imports;
- server-projected allowed actions, no client legality owner.

### C4 — Support/Notifications/Dispatch experience closure

- actor-specific full journeys;
- errors, retries, readback, audit/deep-link behavior.

### C5 — All five surface evidence

- navigation;
- actor/permission scope;
- loading/empty/error/forbidden/offline;
- Arabic RTL + supported English LTR;
- focus/screen reader/keyboard/touch/responsive/reduced motion;
- real device/browser evidence.

## Forbidden for Session C

- defining a new business transition table;
- adding a frontend “canonical mapping” for a backend vocabulary mismatch;
- creating local fake success/default truth for missing/error state;
- manually expanding generated DTOs/enums.

---

# 6. Collision matrix

| Root | A | B | C | Integration owner |
|---|---:|---:|---:|---|
| Cart atomicity | WRITE | read contract | read/migrate after | A |
| Serviceability | WRITE backend/data | WRITE contract | WRITE consumer after handoff | A then B then C |
| WLT | WRITE backend/data | WRITE contract/shared boundary | WRITE read-only surfaces | A |
| Dispatch contract | read runtime | WRITE | WRITE after generation | B |
| Client Profile | read backend/domain | contract if required | WRITE | C unless backend validation required, then A→C |
| shared ui-kit/control-panel | read | WRITE | consumer migration only | B |
| core owner closure | WRITE backend/data | WRITE contract if required | consumer only | A |
| infra/filesystem | read | WRITE | read | B |

A row with several writers is **sequential handoff**, not simultaneous editing of the same file/authority.

---

# 7. Worktree/branch protocol

Recommended local structure:

```text
C:\bthwani-suite-next                 # coordinator/integration worktree
C:\bthwani-suite-next-session-a       # tmp/ocr-a-<root>
C:\bthwani-suite-next-session-b       # tmp/ocr-b-<root>
C:\bthwani-suite-next-session-c       # tmp/ocr-c-<root>
```

For each root wave:

```powershell
git fetch origin
$Ocr = (git rev-parse origin/ocr).Trim()

# create/reset temporary root branches from the exact pinned SHA
git worktree add C:\bthwani-suite-next-session-a -b tmp/ocr-a-R0 $Ocr
git worktree add C:\bthwani-suite-next-session-b -b tmp/ocr-b-R3 $Ocr
git worktree add C:\bthwani-suite-next-session-c -b tmp/ocr-c-R5 $Ocr
```

Do not keep permanent tmp branches after integration.

---

# 8. Per-session mandatory prompt header

Every session should receive the same repository/authority contract plus its narrow write lease:

```text
REPOSITORY: bthwani2-boop/bthwani-suite-next
BASE INTEGRATION BRANCH: ocr
PINNED_PARENT_SHA: <exact>
SESSION: A|B|C
ROOT: <root id>
WRITE_LEASE: <paths>
READ_ONLY_AFFECTED_CONE: <paths>
COMPLETION_LEVEL: LEVEL_4 for this closure unit

Use live tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
and routed live modules only.

You may inspect the full affected cone, but you may mutate only WRITE_LEASE.
If the root requires a file owned by another lease, stop that mutation,
report a handoff requirement, and continue all non-conflicting work.
```

---

# 9. Root executor completion contract

A session cannot say “done” until it returns:

```text
Pinned parent SHA
Final root commit SHA
Actual Source-of-Defect
Actual Source-of-Fix
Canonical owner/writer
Files changed
Migrations/backfills
Consumers migrated
Files/paths deleted
Negative-space searches performed
Targeted verification
Known invalidated evidence
Known remaining root children
Handoff requirements
```

No prose-only confidence statement substitutes for this.

---

# 10. Integration protocol

For each completed root:

1. Coordinator fetches the session commit.
2. Confirms remote `ocr` still equals the expected pinned integration parent or resolves intervening changes.
3. Inspects diff for write-lease violations.
4. Runs the smallest sufficient targeted proof.
5. Integrates the root commit into `ocr`.
6. Pushes.
7. Verifies remote HEAD exactly.
8. Re-pins all sessions or invalidates stale lanes.
9. Rebuilds Root Graph.
10. Only then opens the next root wave.

Do not batch unrelated unverified session commits merely to reduce commit count.

---

# 11. When a session must be preempted

Immediately stop descendant mutation if new evidence proves:

- a higher canonical owner than assumed;
- another active writer that changes migration design;
- contract/runtime mismatch that invalidates frontend work;
- a data migration requirement absent from the root plan;
- another concurrent session has already changed the same canonical owner;
- remote `ocr` moved with a materially overlapping change.

Read-only research can continue.

---

# 12. Recommended throughput

Best practical configuration:

```text
1 coordinator
+ 3 material write sessions maximum
+ 1–3 read-only sub-agents per session as useful
+ targeted verifier after each root
```

More material writers usually increase collision/re-diagnosis cost faster than they improve throughput in this repository because the highest roots cross contracts, DB, shared boundaries and multiple surfaces.

The goal is not maximum agent count. It is **maximum useful safe parallelism**.
