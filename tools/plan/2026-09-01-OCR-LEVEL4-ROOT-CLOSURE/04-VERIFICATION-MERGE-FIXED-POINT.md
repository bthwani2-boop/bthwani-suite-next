# Verification, Merge and Fixed-Point Closure

## 1. Closure principle

This campaign ends only on an **exact immutable candidate**. Passing CI is evidence, not the definition of closure.

For each closure unit:

```text
Targeted falsifying proof
→ Product/Code negative-space re-audit
→ commit
→ push
→ verify remote HEAD
→ re-pin exact SHA
→ ingest new evidence
→ rerun FAILED ∪ INVALIDATED_BY_FIX ∪ NEWLY_REQUIRED
→ re-diagnose/re-rank
```

After the root queue first appears empty, perform a fresh broad hostile audit. If it finds a material root, the fixed point is false and execution resumes.

---

# 2. Evidence classes

## Product/code evidence

- source and schema inspection;
- database fresh install and supported upgrade;
- generated contract parity;
- unit/integration/property tests;
- runtime bootstrap/smoke;
- real API/readback;
- real device/browser journeys;
- persistence/restart/retry/replay evidence;
- security findings that expose a product/code defect;
- profiler/performance evidence when material.

## Evidence that cannot independently prove closure

- check name only;
- a stale status from another SHA;
- a scanner with no semantic coverage of the root;
- a changed readiness flag;
- a test rewritten to match wrong behavior;
- screenshot of a happy path without persisted/readback proof;
- historical audit prose.

Every remote run used for final qualification must be tied to its actual immutable `head_sha`.

---

# 3. Verification matrix by root family

## Cart / data atomicity

Required:

- fresh schema;
- supported upgrade with pre-cutover receipt rows;
- receipt nullability/backfill proof;
- add/update/remove/clear/fulfillment mode mutations;
- same-key same-payload replay;
- same-key different-payload conflict;
- concurrent duplicate requests;
- crash/rollback before commit;
- canonical readback after ambiguous network outcome;
- zero legacy writers/readers after cutover.

## Serviceability / Geo

Required:

- no evidence → unknown/unavailable, not eligible;
- exact policy boundary;
- inside/outside geofence;
- wrong city/service area;
- missing client coordinate;
- missing store coordinate;
- pickup semantics;
- provider timeout/unavailable;
- policy version change;
- Client/Partner/Field/Control Panel consistent readback;
- negative search for local city aliases/35km policy outside canonical owner.

## WLT

Required:

- DB fresh + upgrade;
- ledger invariants;
- signed amount and currency semantics;
- idempotent payment/refund/settlement/COD/payout/commission mutations where active;
- duplicate provider callback;
- provider success + local unknown outcome;
- inquiry/reconciliation;
- restart/retry;
- operator-context isolation;
- DSH stores references only;
- production provider fail-closed until all required configuration/evidence exists.

## Contracts

Required:

```text
path+method uniqueness
operationId uniqueness
schema owner uniqueness
router/handler/serializer conformance
generated zero-diff regeneration
no frontend wire repair types
```

## Profile/Consent

Required:

- missing profile lifecycle explicitly represented;
- no fabricated defaults;
- supported locale/currency values only;
- invalid values rejected at API/DB;
- persisted invalid data reconciled;
- consent enable/withdraw confirmation/readback;
- conflict/retry;
- RTL/accessibility.

## Shared UI

Required:

- no file-wide type suppression in canonical shared owner;
- no unjustified `@ts-ignore`;
- public props are actually implemented or deleted;
- one localization/copy source per displayed semantic;
- no duplicate generic primitive authority across `ui-kit` and `shared/control-panel`;
- keyboard/focus/screen-reader/RTL/LTR rendered proof.

---

# 4. Five-surface final journey matrix

Every surface remains fail-closed until its matrix is complete.

## app-client

At minimum:

```text
login/session
location/address
serviceability
discovery/store/catalog
cart
checkout/payment/COD reference
order creation/readback
tracking/notifications
profile/preferences/consent
support
failure/offline/retry states
```

## app-partner

```text
login/activation/profile gate
store ownership
catalog/readiness
order accept/reject
preparation/ready
handoff/pickup/partner-delivery
notifications
support
financial references only
failure/conflict/retry
```

## app-captain

```text
login/activation/readiness
availability
assignment offer/accept/decline
location integrity
arrival/pickup
tracking
delivery proof/exception/return
COD/payout references
notifications/support
offline/restart/stale assignment
```

## app-field

```text
login/activation
partner/store onboarding/readiness
visit evidence/location/media
catalog/readiness operations
financial references only
notifications
offline queue migration/replay
conflict/forbidden/retry
```

## control-panel

```text
session/permission boundary
operations
partners/workforce
catalog
support
finance/WLT references and operations
platform control/providers
error/empty/forbidden/unavailable
RTL/LTR
keyboard/focus/screen-reader/responsive
```

---

# 5. Golden commercial journey

The exact candidate must prove one real cross-surface journey:

```text
Client auth
→ address/location
→ serviceability
→ discovery
→ store/catalog/availability
→ cart
→ pricing/checkout
→ WLT payment or governed COD handoff
→ order persisted
→ Partner receives/accepts/prepares/ready
→ Dispatch assignment
→ Captain accepts
→ arrival/pickup
→ tracking
→ delivery proof
→ delivered
→ WLT settlement/readback
→ notifications
→ Control Panel canonical readback
```

Where Field onboarding/readiness is a prerequisite for the selected store/captain, prove that prerequisite separately on the same candidate.

---

# 6. Negative journey corpus

The final campaign must include the material negative cases, not only the golden path:

```text
wrong role
wrong object/tenant/operator context
expired/revoked session
profile missing
serviceability unknown
out of area
map provider unavailable
stock conflict
cart stale version
cart duplicate request
payment failure
payment provider success + local unknown
payment duplicate callback
order duplicate request
partner reject
partner timeout
customer cancel before accept
customer cancel after accept
no captain
captain decline
captain timeout
captain race/duplicate accept
captain disconnect/restart
GPS inaccurate/stale/future/out-of-order/spoofed
pickup proof failure
delivery exception
return to store
refund pending/failed
settlement reconciliation mismatch
push provider failure/retry/dead-letter
support mutation duplicate/unknown result
service restart
network retry
stale state mutation
```

Each case must terminate in a canonical recoverable or terminal state; no silent partial success.

---

# 7. Fresh filesystem/negative-space audit before final closure

On the candidate believed complete, perform repository-wide searches and disposition all material hits for:

```text
legacy|obsolete|deprecated|superseded|old|history|archive|backup|tmp|temp
compat|fallback|mirror|shadow|duplicate
TODO|FIXME|HACK
@ts-ignore|@ts-expect-error|eslint-disable|nolint
as any|unknown as
single source of truth|canonical|source of truth
status maps|transition maps|allowed actions
SAR defaults and unsupported currency defaults
hard-coded serviceability/geography constants
manual generated-contract repair patterns (Omit/intersection/enum additions)
catch-and-ignore around material mutations
console.error-only read failures
```

For each hit: canonical, derived, bounded migration, false positive with reason, or delete. No material unclassified hit remains.

Also inventory all tracked directories whose name implies temporary/history/versioned authority.

---

# 8. Exact candidate qualification sequence

After all current roots are closed:

1. Resolve remote `ocr` HEAD and require clean source identity.
2. Run full repository discovery/topology checks.
3. Run full owner-specific type/lint/test/build checks.
4. Run DSH/WLT/core database fresh-install and supported-upgrade proof.
5. Regenerate all generated contracts/clients and require zero unexpected diff.
6. Run full runtime bootstrap/smoke.
7. Run relevant API property/contract checks.
8. Run five-surface rendered/device journey matrix.
9. Run golden + negative business journey corpus.
10. Run security analyzers and ingest only material product/code findings.
11. Run filesystem/parallel-truth negative-space audit.
12. Execute a **fresh broad adversarial Product+Code re-audit** without relying on the previous root queue.
13. If any material root appears, reopen execution.
14. Only when no material root/unknown/residue remains, mark `ocr` as release-baseline candidate.

---

# 9. Merge to master

The purpose of `ocr` is to eliminate the inherited master defects and become the new clean baseline.

Correct integration sequence:

```text
qualify exact final ocr SHA
→ integrate ocr into master according to repository policy
→ resolve resulting exact master SHA
→ if SHA changed, invalidate all evidence whose source identity changed
→ rerun required final qualification on exact master SHA
→ fresh negative-space check on master
→ freeze/tag baseline only after master proof
```

Do not claim the pre-merge `ocr` SHA proves a different merge commit unless provenance/invalidation rules explicitly allow reuse.

---

# 10. Final closure checklist

```text
[ ] exact candidate SHA pinned
[ ] root queue empty
[ ] fresh hostile re-audit found no material root
[ ] no unknown material topology cell
[ ] one canonical owner per material truth
[ ] one writer per mutable truth
[ ] no parallel/shadow contract or state machine
[ ] no manual wire-contract repair
[ ] no fabricated missing/error truth
[ ] no half migration or dual write
[ ] zero unmigrated material consumers
[ ] zero reachable superseded code/path/config/contract
[ ] zero unbounded compatibility residue
[ ] stale plan/history/roadmap artifacts removed
[ ] DSH DB fresh install PASS
[ ] DSH supported upgrade PASS
[ ] WLT DB/mutation/reconciliation truth PASS
[ ] Identity/Workforce/Providers/Platform-Control owner proof PASS
[ ] generated contract parity PASS
[ ] runtime bootstrap/smoke PASS
[ ] five surfaces exact journey proof PASS
[ ] Golden Journey PASS
[ ] material Negative Journeys PASS
[ ] RTL/i18n/A11y proof PASS
[ ] security findings dispositioned on exact SHA
[ ] merge to master completed
[ ] resulting exact master SHA requalified
```

Only then may the branch/product be described as evidence-bounded Level-4 closed and suitable as the new master baseline.
