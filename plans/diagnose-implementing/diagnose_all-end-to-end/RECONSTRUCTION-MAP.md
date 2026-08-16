# Reconstruction Map — Content-Preserving Canonical Cutover

## 1. Objective

Transform the inherited branch into the canonical target system without:

- rebuilding correct environment/tooling from zero;
- losing working UI/design/assets;
- copying legacy architecture into a new tree;
- patching symptoms;
- leaving old and new truth alive in parallel.

The method is:

`PRESERVE VALUE → FIX CONTEXT/OWNERSHIP → MIGRATE CONSUMERS → VERIFY → DELETE SUPERSEDED PATH`

## 2. Foundation preservation baseline

Before structural reconstruction, inventory and classify every foundational element that is expensive or risky to recreate:

- pnpm workspace/package management;
- lockfile;
- TypeScript config and build graph;
- Expo configuration;
- EAS remote-build configuration;
- Android native project/config;
- iOS native project/config where applicable;
- Metro;
- mobile runtime launchers/scripts;
- Next.js/control-panel runtime;
- Go modules/build/test setup;
- PostgreSQL migrations/runners/seeds;
- Docker/Compose/local runtime;
- environment schemas and non-secret config;
- mandated development ports;
- generated client pipeline;
- CI/GitHub Actions;
- security/static-analysis tooling;
- Graphify/tooling;
- maps/provider integration foundations;
- assets/fonts/icons/images;
- localization/RTL foundations;
- observability/logging/metrics foundations;
- test infrastructure/fixtures.

Each receives one disposition:

`PRESERVE | HARDEN | RESTRUCTURE | REPLACE`

Default is `PRESERVE WHEN PROVEN CORRECT`.

No foundation is deleted/rebuilt because a cleaner architecture is aesthetically attractive.

## 3. Universal inherited-item disposition

Every inherited material item receives exactly one current disposition:

- `KEEP` — correct and correctly placed;
- `HARDEN` — correct owner/context but insufficient guards/verification;
- `MOVE` — correct content, wrong location/owner context;
- `RENAME` — correct concept with misleading/noncanonical naming;
- `MERGE` — multiple pieces represent one canonical concern;
- `SPLIT` — one container mixes multiple responsibilities/owners;
- `REFACTOR` — correct concept, weak implementation;
- `MIGRATE` — data/content/consumers must move to canonical owner;
- `REGENERATE` — derived artifact must be recreated from canonical source;
- `REWRITE` — required concept, implementation not safely salvageable;
- `REPLACE` — superseded concept/path;
- `DELETE` — proven dead, stale, duplicate, obsolete or forbidden.

`KEEP BECAUSE IT EXISTS` is forbidden.

## 4. Content Conservation Ledger

Before deleting or splitting any material source file/container, account for valuable content.

Required record:

### Source

- path;
- owner today;
- owner target;
- consumers;
- routes/imports/exports;
- data/contracts;
- visual/UX content;
- business rules;
- assets;
- tests;
- runtime/config role.

### Content disposition

Example:

- Visual layout → `MOVE/PRESERVE`
- Typography/spacing → `PRESERVE`
- Assets/icons → `PRESERVE`
- Correct domain rule → `MOVE TO OWNER`
- API call → `REBIND`
- Local authoritative money → `DELETE/REPLACE WITH WLT READBACK`
- Duplicated state → `DELETE`
- Useful test → `MIGRATE/UPDATE`
- Dead route → `DELETE`

### Source deletion gate

`SOURCE_DELETE_ALLOWED = YES` only when:

- all valuable content is accounted;
- target content exists;
- all consumers are migrated;
- contracts/data references are migrated;
- visual parity is proven when preservation is required;
- target verification passes;
- no canonical source still references the old container.

## 5. Visual and UX preservation

Default rule:

`VALID VISUAL/UX VALUE IS PRESERVED UNLESS THE TARGET JOURNEY REQUIRES A PRODUCT CHANGE.`

A screen can keep its design while its internals are reconstructed:

`old screen`
→ preserve layout/interaction/assets
→ split controller/state
→ bind canonical contract
→ remove local business/financial truth
→ move to canonical feature context
→ verify visual/runtime parity
→ delete old container

Do not redesign merely because a file is moved.

Dead design is deleted only after proving:

- no canonical journey needs it;
- no route/deep link reaches it;
- no consumer depends on it;
- it is not the only carrier of a required asset/interaction.

## 6. Target repository tree design

Do not start by moving folders.

Derive structure in this order:

1. product outcomes;
2. canonical domain owners;
3. capability boundaries;
4. public contracts;
5. data ownership;
6. shared/runtime boundaries;
7. surface composition;
8. target directories/files.

For each target directory define:

- canonical owner;
- responsibility;
- allowed contents;
- forbidden contents;
- incoming dependencies;
- outgoing dependencies;
- public API;
- generated artifacts;
- tests;
- migration source/target mapping.

### Structural rules

- domain code lives with its owner;
- shared code must be genuinely multi-consumer and not a hidden second owner;
- frontend components do not own business/financial truth;
- generated clients have one canonical generation source;
- migrations remain service-owned and forward-only;
- no duplicate config/source-of-truth under different surfaces;
- no permanent `legacy`, `old`, `backup`, `temp`, `v2`, `final2` tree.

## 7. Reconstruction work unit

A work unit is:

`ROOT CAUSE × JOURNEY CLUSTER × COMPLETE VERTICAL SLICE`

Not:

- one bug;
- one file;
- one app;
- one service folder;
- one failing test.

For each selected root:

### A. Re-pin and deep-diagnose Just-In-Time

On current `b` HEAD:

- validate root still exists;
- identify operational parent;
- identify highest causal root;
- inventory writers/readers/consumers;
- inventory contracts/data/runtime paths;
- test competing hypotheses;
- update blast radius;
- re-rank affected cone if evidence changes.

### B. Define target cutover

Specify:

- canonical owner;
- target states/invariants;
- target contracts;
- target data;
- target file/context;
- migration;
- consumers;
- old paths to remove;
- verification.

### C. Build canonical owner first

Implement the authoritative path before adapting leaves.

### D. Migrate every consumer

Migrate:

- backend callers;
- frontend bindings;
- generated clients;
- DB writers/readers;
- events/jobs;
- analytics/audit;
- control-panel actions;
- mobile surfaces;
- tests;
- config;
- runtime.

### E. Remove superseded truth

Delete old:

- writable fields;
- endpoints;
- DTOs;
- local calculation;
- old route;
- duplicate state;
- fallback;
- compatibility adapter;
- dead tests;
- stale docs/config;
- obsolete files/folders.

### F. Verify entire slice

Only then may the root become locally closed.

## 8. No leaf patching rule

If:

`UI symptom ← API mismatch ← ownership defect`

the treatment starts at ownership, not UI.

A workaround is forbidden when it:

- preserves a known wrong owner;
- creates a second source;
- masks a schema mismatch;
- converts unknown result to success;
- locally reimplements eligibility/money;
- adds compatibility instead of migrating consumers.

## 9. Data/DB reconstruction

Never delete/recreate valuable data blindly.

For every changed entity/table/column:

`CURRENT MODEL → TARGET MODEL → DATA MAPPING → FORWARD MIGRATION → BACKFILL/UNKNOWN POLICY → CONSTRAINTS → READBACK → CONSUMER CUTOVER → OLD STRUCTURE REMOVAL`

Allowed outcomes:

- KEEP;
- ALTER;
- SPLIT;
- MERGE;
- MIGRATE;
- DEPRECATE THEN DROP;
- DROP after proof.

Applied migrations are immutable history.

If historical truth cannot be proven, preserve `unknown` rather than fabricate it.

## 10. Contract/API reconstruction

For each changed semantic:

1. canonical owner rule;
2. source schema/OpenAPI/event contract;
3. server implementation;
4. generated client;
5. all consumers;
6. negative authorization/identifier tests;
7. old contract removal.

Never maintain two active contracts solely to avoid migrating current consumers unless a real versioned external compatibility obligation is proven.

## 11. Financial reconstruction

Financial changes must use the WLT owner first.

Typical cutover:

`operational evidence`
→ WLT policy/financial decision
→ ledger/financial state
→ durable event/readback
→ DSH bounded projection/reference
→ surface rendering

Forbidden:

- caller-authored authoritative amount;
- frontend authoritative balance/settlement;
- Workforce monetary gate;
- DSH local financial eligibility;
- payment-method label as numeric truth;
- ignored required WLT call.

## 12. Identifier reconstruction

For each ambiguous ID:

- identify real entity;
- add explicit type/name;
- resolve at owner boundary;
- add DB FK/constraint where appropriate;
- update contract;
- update events/audit;
- update generated clients;
- update UI state names;
- negative-test wrong identifier class;
- remove old ambiguous field.

Canonical StoreBranch is treated as a true entity migration, not a rename of Store ID.

## 13. Distributed mutation reconstruction

When an operational transition requires a financial or other critical cross-service obligation:

- do not commit irreversible local success and ignore downstream failure;
- persist obligation/state;
- correlate/idempotently dispatch;
- expose explicit pending/unknown state;
- retry safely;
- reconcile;
- compensate if policy requires;
- preserve operator visibility;
- prove duplicate/restart behavior.

## 14. Runtime-preserving restructuring

After every structural wave, re-prove affected foundation only:

- build/typecheck/unit for affected graph;
- generated contract sync;
- DB migration check;
- targeted runtime;
- affected app smoke;
- native/EAS only when native/config changes;
- provider integration only when affected.

Avoid blind full-suite reruns after every small change.

Run the full closure matrix only at the appropriate candidate gate.

## 15. Execution waves

The exact order is derived from the root graph, not fixed by this document.

Current prepared frontier begins with:

### Wave 1 — Canonical ownership/boundaries

- authority registry;
- Blueprint alignment;
- owner/write-path boundaries;
- dependency direction.

### Wave 2 — Financial semantics and identifiers

Likely high-leverage roots:

- payment/tender/exposure/custody/settlement;
- explicit identifiers/StoreBranch;
- captain eligibility.

### Subsequent waves

Derived by dependency/risk:

- partner store delivery;
- durable distributed obligations;
- Field provisioning/readiness;
- catalog/publication;
- Client commercial/account journeys;
- Control Panel owner cutovers;
- repository physical restructuring;
- governance finalization;
- lower roots such as actor provenance.

A stronger root discovered later reorders only its affected cone.

## 16. Local closure gate per root

A root is not locally closed until all applicable dimensions pass:

- logic;
- journeys;
- state machine;
- owner;
- frontend;
- backend;
- contract;
- DB;
- migration;
- event/job/provider;
- authorization;
- security/isolation;
- finance;
- failure/recovery;
- concurrency/idempotency;
- cross-surface readback;
- runtime;
- cleanup;
- old-path removal;
- traceability.

## 17. System final closure gate

Final candidate requires:

- zero known material unresolved decisions;
- zero known unaccounted findings;
- zero duplicate durable truth owners;
- zero unjustified fallback authority;
- zero reachable superseded path;
- zero unclassified material consumer/dependency;
- zero financial writer outside authorized owner;
- zero ambiguous authority-boundary identifier;
- zero ignored required distributed obligation;
- zero dead/duplicate material residue after cleanup;
- migrations/contracts/generated clients synchronized;
- current candidate-bound tests/runtime evidence;
- security/privacy/finance negative evidence;
- final negative-space/adversarial review.

Any source write after candidate verification creates a new candidate and invalidates affected evidence.

## 18. Branch discipline for the current user constraint

Current preparation and any later explicitly authorized task execution occur on existing branch `b`.

No new branch/worktree is created by this package.

For current V5 PREPARE validation, `A` remains the integration/reference branch and `b` is the isolated task branch.

No merge to `A` is authorized by this package.

If the project later decides that `b` itself becomes the canonical integration truth, that promotion is a separate governed cutover decision and must reconcile the orchestrator isolation model rather than silently redefining it.

## 19. Foreign-delta reconciliation during reconstruction

Branch movement is input, not instruction.

Before every material root mutation and before root closure:

1. resolve current `b` HEAD;
2. compare against the last reconciled task candidate;
3. classify changed paths/semantics as:
   - `UNRELATED`;
   - `RELATED_NON_BLOCKING`;
   - `UPSTREAM_OR_ROOT_CHANGING`;
   - `SEMANTIC_OVERLAP`;
   - `DIRECT_CONFLICT`;
   - `AUTHORITY_OR_TRUTH_CHANGE`;
4. preserve unrelated work;
5. attach related work to the correct root;
6. invalidate only the affected evidence cone;
7. re-rank only if new evidence changes causal priority;
8. never overwrite concurrent work merely to restore an older plan.

The concurrent finance delta observed during this PREPARE pass is exactly such input: it changes checkout allocation, COD reservation release and financial outbox/reconciliation paths. It must be revalidated when the finance root executes; its recency does not make finance automatically priority one.

## 20. Mandatory negative-space reconstruction census

Before the whole-system target is considered prepared for execution, and again before final closure, explicitly census at least:

- Inventory reserve/release/TTL/returns/reconciliation;
- Return/refund/restock partial and duplicate paths;
- Notification producers/consent/device lifecycle/retry;
- Media bootstrap/readiness/ACL/retention/orphans;
- Ratings moderation/public aggregation;
- Consent/privacy/account-deletion provenance;
- Search/cache canonical-deny invalidation;
- Provider desired config versus observed health;
- Platform change request versus applied/observed state;
- all Control Panel hidden routes/actions;
- all app-client visible actions/deep links;
- all app-partner Store/Branch/Fleet/Finance paths;
- all app-captain assignment/proof/COD/offline/mode paths;
- all app-field visit/readiness/scope/evidence/onboarding paths;
- all DB tables/columns/writers/FKs/checks;
- all events/outbox/jobs/retries/DLQs;
- fresh and supported upgrade migrations;
- runtime env/secrets/fallback/readiness;
- observability and PII-safe audit;
- CI architecture/contract/security/runtime guards.

An item is not silently dropped because it did not appear in a previous package. It must be traced, excluded with proof, or assigned to an execution root.
