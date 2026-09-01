# Live Root Graph and Causally Complete Closure Units

**Starting evidence pin:** `ocr@4aa1f00decc9ed2ac5c724b7cc316e0247fe8a0d`  
**Authority:** live orchestrator revision 24.  
**Rule:** this queue is re-ranked after every material mutation; a proven causal parent preempts descendants.

---

# A. Current Root Queue — descending severity

## R0 — P0 — Cart atomic idempotency design exists, but receipt/data migration is incomplete

### Current truth

The branch introduced a materially better Cart mutation boundary: transaction, advisory idempotency lock, request fingerprint, mutation effect, receipt and commit are brought together in `services/dsh/backend/internal/cart/mutation.go`.

However exact-candidate backend verification on the current SHA exposes a live contract/data mismatch when loading a receipt: `result_version` can be `NULL` while the Go record scans it into a non-null integer. This means the new architecture is **implemented but not causally closed** across existing data/schema/reader semantics.

### Actual Source-of-Defect

Cart receipt persistence contract/migration/backfill/nullability and every reader that assumes the new receipt shape is complete.

### Actual Source-of-Fix

`services/dsh/database/migrations/**` + Cart receipt repository/transaction code + any seed/fixture/upgrade path that can create or retain pre-cutover receipt rows.

### Complete affected cone

- all Cart mutation verbs;
- `dsh_cart_mutation_receipts` schema/data;
- fresh install and supported upgrade;
- legacy/post-hoc receipts if still present;
- frontend offline queue/readback/retry semantics;
- checkout consumers relying on cart version/state;
- tests/fixtures/seeds/diagnostics around mutation receipts.

### Closure treatment

1. Define one canonical receipt row invariant: operation, fingerprint, result identity/version/deletion/result payload and correlation metadata with exact nullability.
2. Inventory all historical receipt-producing paths and migrations.
3. Backfill/reconcile old rows or deliberately model nullable fields where an operation semantically has no version; do not simply coerce NULL to zero unless zero is canonical truth.
4. Prove a supported upgrade from the oldest supported pre-cutover schema/data state.
5. Prove two simultaneous same-key requests cannot both execute the business effect.
6. Prove same key + same payload replays canonical result.
7. Prove same key + different fingerprint fails closed.
8. Prove crash/connection loss before commit leaves neither effect nor receipt.
9. Prove commit makes both effect and receipt durable.
10. Simplify frontend unknown-outcome compensation only after canonical receipt/readback is proven.
11. Delete post-hoc/best-effort receipt paths, compatibility queries, dead receipt columns/readers and tests after zero-consumer proof.

### CLOSED requires

Fresh install + supported upgrade + concurrency/replay/crash tests + all cart verbs + zero old receipt writers/readers.

---

## R0.1 — P0 — DSH seed/clean-install database truth is not closed

Current exact-candidate status reports seed-local and clean-install proof failures. Some job logs have expired, therefore the exact root must be reproduced rather than guessed.

### Treatment

- Re-run exact owner DB verification on the current re-pinned SHA.
- For every mismatch, establish domain enum/state/constraint truth before modifying schema or seed.
- Apply closure chain:

```text
canonical domain state
→ DB constraint
→ migration
→ seed/fixture
→ backend writer
→ API contract
→ generated consumer
→ fresh install
→ supported upgrade
→ persisted readback
```

Never weaken a DB invariant only to make the test green.

---

## R1 — P0 — Serviceability/Geography policy is misowned and currently fail-open

### Proven current behavior

`services/dsh/backend/internal/cart/cart.go` still:

- normalizes cities/neighborhood aliases locally;
- contains a fixed `35km` delivery threshold;
- treats `calculatedDistance == nil` as `isWithinDistance == true`;
- combines city/zone/distance policy inside Cart.

At the same time the DSH capability map declares `dsh.policies` service-area/geofence/coordinate resolution as `runtimeBound:false` and `FIX_REQUIRED`.

### Root

There is no fully bound canonical Serviceability/Coverage authority. Cart has become a shadow policy owner.

### Source-of-Fix

Canonical DSH policy/service-area owner and its data/contracts/runtime boundary, not the Cart screen/controller.

### Target semantic contract

Input:

```text
storeId
client/service address or coordinates
fulfillmentMode
current service-area policy/version
```

Output:

```text
eligible: true|false|unknown
reasonCode
serviceAreaId/code
policyVersion
evaluatedAt
availableModes
requiredEvidenceMissing[]
```

Law:

```text
UNKNOWN != ELIGIBLE
```

Pickup is evaluated separately because customer pickup need not satisfy delivery coverage.

### Migration/Cutover

- one canonical city/service-area vocabulary;
- migrate store/service-area references;
- migrate Client checkout/address, Store Discovery, Partner, Field, Control Panel and Cart consumers;
- remove all local city alias tables and hardcoded distance thresholds from Cart and any other consumer;
- remove duplicated coordinate→zone implementations;
- make provider/map failures explicit unavailable/unknown states, not eligible defaults.

### CLOSED requires

Boundary tests for missing client coordinate, missing store coordinate, missing policy, exact boundary, outside boundary, wrong city, pickup, provider timeout, stale policy and policy-version transition.

---

## R2 — P0 — WLT financial production truth remains explicitly incomplete

### Proven current manifest truth

`services/wlt/service.manifest.ts` declares:

- `closureState: FIX_REQUIRED`;
- database readiness false;
- runtime evidence needed;
- local/staging production mutation evidence incomplete;
- production mutations not ready and provider mutation fail-closed.

This is the correct fail-closed posture, but it means release closure is open.

### Canonical ownership law

WLT remains the **only mutable financial truth writer** for wallets, payment sessions, refunds, settlements, payout decisions, commissions, COD reservations/finalization, ledger and reconciliation.

DSH/apps/control-panel may keep identifiers/status references/read-only projections only.

### Closure units

1. WLT DB fresh install and supported upgrade.
2. Payment-session idempotency and unknown-result recovery.
3. Provider adapter + authenticated webhook/inquiry/reconciliation semantics.
4. Refund lifecycle.
5. Settlement/payout/commission/COD lifecycle.
6. Ledger invariants and signed money/currency semantics.
7. Operator-context isolation.
8. DSH reference-only convergence/reconciliation.
9. Production provider gating/secrets/configuration.
10. Exact runtime journey evidence.

### Cleanup after cutover

- delete placeholder production adapters without unique value;
- delete duplicate WLT DTO/enums copied into DSH/shared code;
- delete pass-through adapters after generated/typed canonical boundary migration;
- delete obsolete simulator compatibility paths when they are not required by dev/test truth;
- remove tracked historical WLT architecture documents once useful rationale is captured in canonical governance/live code.

---

## R3 — P0/P1 — Dispatch wire/domain contract authority is still split

### Proven current code

`services/dsh/frontend/shared/dispatch/dispatch.types.ts` still repairs generated types by:

- intersecting `DshDispatchAssignment` with manually added operational fields;
- adding exception reason enum values manually;
- `Omit<>`-redefining generated exception shapes;
- forcing `orderId: string` where special-request semantics can require another source identity;
- defining governed request/candidate/decision DTOs manually.

This means:

```text
runtime DTO
!= generated DTO
!= frontend repaired DTO
```

### Source-of-Fix

Canonical DSH OpenAPI/domain contract + serializer/router conformance.

### Closure

- define one governed assignment schema containing actual required fields and nullability;
- model source identity explicitly (`order` vs `special_request`) rather than lying through `orderId`;
- model proof/policy-next-action fields actually emitted by runtime;
- separate generic delivery exceptions from handoff-specific exceptions if semantics differ;
- generate clients/types;
- migrate Captain/Partner/Client/Control Panel consumers;
- delete wire-level intersections, `Omit<>` repairs, manually copied enum members and hand-written request/response DTOs;
- retain only pure presentation maps/labels that cannot affect legality or wire shape.

### CLOSED requires

Path+method+operation uniqueness, schema↔serializer parity, generated zero-diff regeneration and no manual wire repair in frontend.

---

## R4 — P0/P1 — Checkout / Address / Maps / Serviceability runtime binding is incomplete

Current capability metadata explicitly marks Client Checkout extension `runtimeBound:false`, `FIX_REQUIRED` for:

- address book;
- governed map search;
- reverse geocoding;
- serviceability address;
- checkout address.

### Closure journey

```text
authenticated client
→ address list/create/update/delete/default
→ map search/reverse geocode
→ canonical coordinate/service-area result
→ serviceability evaluation
→ checkout address selection
→ persisted checkout/order snapshot/readback
```

### Negative cases

- provider unavailable;
- malformed/ambiguous location;
- out-of-area;
- missing canonical address evidence;
- address deleted during checkout;
- service-area policy changes;
- offline/retry/unknown mutation result.

No client-only fake serviceability/location success is allowed.

---

## R5 — P1 — Client Profile creates fabricated business truth and has incomplete preference/consent semantics

### Proven exact behavior

`MyProfileScreen.tsx`:

- initializes locale to `ar`;
- initializes currency to `SAR`;
- on profile `404`, synthesizes a `ready` profile with `ar`, `SAR`, false consents, version 0 and blank timestamps;
- casts backend locale to `"ar" | "en"` instead of enforcing a canonical contract;
- carries currency through save comparisons but provides no corresponding currency control;
- explicitly comments that withdrawal confirmation is required, then turns consent off immediately.

### Root

Missing lifecycle/default/domain truth has leaked into presentation code.

### Closure choices

Canonical server lifecycle must be one of:

```text
A) authenticated client always receives server-provisioned profile
```

or

```text
B) GET returns explicit PROFILE_MISSING
   → explicit onboarding/create command
   → canonical readback
```

Never `404 → plausible ready object`.

### Locale/currency

- define one supported locale value domain across DB/API/UI;
- define one supported currency truth owned by financial/product governance;
- remove UI defaults that contradict canonical market currency;
- validate at backend and DB boundary;
- migrate invalid historical values;
- if user-changeable currency is not part of active product, remove the half-wired UI state/write path rather than carrying an invisible capability.

### Consent

Withdrawal requires explicit accessible confirmation before mutation, cancel/back behavior, readback, conflict/retry handling and correct RTL/screen-reader focus.

---

## R6 — P1 — Active Support / Notifications / Dispatch journeys still advertise incomplete experience

Capability metadata remains a material source of truth about closure:

- Support: `experience-fix-required`, `FIX_REQUIRED`;
- Dispatch: `experience-fix-required`, `FIX_REQUIRED`;
- Notifications: `experience-fix-required` while closure state says `IMPLEMENTED_MULTI_SURFACE`.

The Notifications metadata itself is semantically ambiguous and must not be manually relabeled green.

### Treatment

For each capability prove:

```text
owner
contract
runtime binding
authorization/object scope
mutation idempotency
readback
failure state
retry/recovery
multi-surface delivery
localized UX
audit/event trail where material
```

Then make status **derived/evidence-bound** or remove contradictory manual fields.

Support's former backend stub has been replaced in recent work, but that is implementation closure only; operator/client/partner/captain journey evidence remains required.

---

## R7 — P1 — All five DSH surfaces remain `fix-required`

Current exact `DSH_SURFACE_MAP` marks:

```text
app-client
app-partner
app-captain
app-field
control-panel
```

all as `fix-required`.

### Surface promotion matrix

Every surface must prove on the same exact candidate:

- correct actor identity/session;
- navigation only to supported capabilities;
- authorization and object/tenant/operator scope;
- real network boundary;
- canonical persisted write/readback where applicable;
- loading/empty/error/forbidden/unavailable/offline states distinct;
- retry and unknown outcome recovery;
- no fabricated local success;
- RTL Arabic and LTR English where supported;
- keyboard/screen-reader/touch/focus/responsive/reduced-motion evidence appropriate to platform;
- cross-surface handoff continuity.

Do not change `fix-required` to `runtime-verified` manually. Promote only from exact evidence.

---

## R8 — P1 — Shared control-panel UI ownership/type/i18n is not clean

### Proven current issues

`shared/ui-kit/src/web/control-panel.tsx` contains:

- file-wide `no-explicit-any` disable;
- many `as any`;
- `@ts-ignore` for hover style;
- `onToggleCollapse` public prop that implementation ignores;
- visible English literals `vs last period`, `Reject`, `Approve`, `No pending decisions`.

At the same time `shared/control-panel/src/components` contains a broad `Cp*` component set, including another Button/Badge/common-label layer.

### Root question

The repository must explicitly distinguish:

```text
ui-kit = generic reusable visual primitives/tokens/components
shared/control-panel = control-panel-specific composition/presentation
```

### Closure

- fix primitive typing at the real `Box/Surface/hoverStyle` type boundary;
- remove suppression rather than replacing `any` with another cast;
- either implement collapse behavior/accessibility or delete public prop and all consumers;
- centralize translatable copy or require typed copy from caller;
- inventory each `Cp*` wrapper: `DERIVED_REQUIRED` only if it adds true control-panel semantics; otherwise migrate to ui-kit primitive and delete wrapper;
- forbid duplicate generic Button/Badge/EmptyState/Filter/etc. authorities across both packages.

---

## R9 — P1 — Core services are legitimate sovereign owners, but exact closure is not proven

Do **not** delete or fold `core/` into DSH.

Current topology is semantically valid:

- Identity: backend/clients/contracts/database/tests;
- Workforce: backend/contracts/database;
- Providers: backend/contracts/database/manifest;
- Platform-Control: backend/contracts/database/manifest.

Current manifests still state:

- Providers: foundation evidence required;
- Platform-Control: verification required.

Current remote status also shows Workforce/Platform-Control backend verification failures, but detailed logs were unavailable during this audit. Reproduce exact owner tests before claiming a defect or closure.

### Required negative-space audit

Search all services/shared/apps for duplicated:

- roles/permission vocabularies;
- workforce activation/profile state;
- provider credentials/config writes;
- platform variable/feature flag/rollout writers.

Any non-owner writer is removed or converted to typed/read-only reference.

---

## R10 — P1/P2 — Infrastructure folder contains stale planning authority and must become executable-only

### Proven stale residue

`infra/FUTURE_RUNTIME_CAPABILITIES.md` mixes `future`, `rejected`, `fallback`, and `active` statements and contains internal contradictions such as runtime smoke being active while the execution order says to add it later. No live reference was found in repository search.

It is removed in this plan commit.

### Remaining infra audit

Classify every path under:

```text
infra/docker
infra/data-plane
infra/local
```

as one of:

```text
CANONICAL_RUNTIME
DERIVED_PROFILE
LOCAL_DEV_REQUIRED
TEST_SIMULATOR_REQUIRED
DELETE_REQUIRED
```

`infra/docker/compose.runtime.yml` remains the documented canonical runtime composition. No second full runtime compose may emerge unless the canonical policy is changed deliberately.

---

## R11 — P1/P2 — Repository-wide stale/history/legacy/compatibility residue must be eliminated

This is a systemic cleanup root, not blind grep deletion.

### Mandatory path-name inventory

Search tracked paths/content for:

```text
legacy
old
obsolete
deprecated
superseded
backup
copy
tmp
temp
history
archive
v1/v2/v3 migration readers
compat
fallback
mirror
shadow
prototype
experimental
TODO/FIXME/HACK
```

Each hit receives exactly one disposition:

```text
CANONICAL
DERIVED_REQUIRED
BOUNDED_MIGRATION
DELETE_REQUIRED
FALSE_POSITIVE_WITH_REASON
```

### Important exception

Historical **database migrations** required for fresh install or supported upgrade are executable product history and must not be deleted merely because they are old/versioned.

### Immediate safe cleanup in this commit

- superseded `tools/plan/2026-08-31-LEVEL4-REPOSITORY-DEEP-AUDIT-OCR.md` removed after extracting material content;
- `infra/FUTURE_RUNTIME_CAPABILITIES.md` removed as stale planning residue;
- tracked WLT historical architecture document + historical pointer/README removed because Git history already preserves provenance and live governance/code are the explicit current authority.

---

## R12 — P1 — Capability/readiness/status metadata can become a parallel manual truth

The repository contains static status/readiness/closure fields. These are useful only when they are evidence-safe.

### Rule

No source file may become a manually editable alternative to runtime/product truth by saying `ready`, `verified`, `closed` or equivalent without exact evidence provenance.

### Target

Where practical, derive status from explicit requirements/evidence; otherwise require:

```text
evidenceSha
evidenceKind
evaluatedAt
requiredCells
openCells
```

and default fail-closed when stale or missing.

---

# B. Former roots materially treated since the previous audit

These are **not automatically CLOSED Level-4**; they are `IMPLEMENTATION_TREATED / REVALIDATE` unless explicitly proven below.

| Former root | Current disposition | Required revalidation |
|---|---|---|
| Cart post-hoc idempotency | **architecture treated; data migration still OPEN as R0** | receipt schema/upgrade/concurrency/replay |
| Duplicate Catalog OpenAPI fragment | implementation treated; fragment deleted | path+operation uniqueness, generated parity |
| Catalog legacy commercial truth | cutover/migration introduced | zero legacy writers/readers/columns/fixtures |
| Frontend `orders.state-machine.ts` shadow authority | file deleted | no other raw transition/legality owner in frontend |
| Frontend `partner.journey.ts` shadow lifecycle | file deleted | no other parallel partner lifecycle tables |
| Governed partner support stub | implementation replaced | full support journey and negative paths |
| Support retry data in generic durable storage | sensitive-storage treatment added | old-key purge and no generic sensitive residue |
| Workforce duplicate geography authority | removal treatment added | table/API/writer/consumer zero legacy proof |
| SLA policy duplication | governed policy treatment added | no mirrored constants/owners remain |
| Push unknown-outcome window | provider-attempt treatment added | duplicate/retry/provider-result reconciliation |
| Cross-service WLT adapters | centralized/migrated in recent commits | no copied DTO/enums/financial writers remain |
| Captain GPS client-only enforcement | **confirmed server-side integrity implementation now exists** | contract + exact device journey only |

---

# C. Roots explicitly NOT proven open from old reports

Do not resurrect these without current evidence:

- old CodeQL finding against local workforce payload logging;
- old catalog fragment path debt that was deleted;
- old partner journey state-machine file that was deleted;
- old governed support handler stub that was replaced;
- old client-only GPS enforcement finding; current backend now validates accuracy, freshness, future skew, ordering, frequency and impossible speed.

The closure campaign must remain live-evidence-driven, not backlog-driven.
