# Cleanup / Cutover / Final Closure Plan

Cleanup is part of the root treatment. A new canonical path plus old reachable paths is not closure.

## 1. Financial authority cleanup

After WLT policy/canonical cutover:

- remove Workforce monetary guarantee fields as live authority:
  - `financialGuaranteeMinorUnits`
  - `financialGuaranteeCurrency`
  - `financialGuaranteeStatus`
  - writable financial guarantee reference semantics when used as proof;
- remove these fields from request DTOs, patch APIs, OpenAPI, shared/generated clients, control-panel forms and tests;
- migrate any historical values to explicitly archival evidence only if retention is required;
- remove any readiness check that interprets Workforce financial fields as financial truth;
- remove operator/manual amount authority from Workforce provider incidents;
- remove caller-provided authoritative penalty amount from WLT penalty boundary after policy-derived replacement lands;
- search all `minorUnits`, `amount`, `balance`, `guarantee`, `penalty`, `commission`, `fee`, `earning`, `settlement`, `refund` writers outside WLT and disposition every match.

## 2. Captain collateral / wallet cleanup

- retain one captain WLT wallet;
- no separate active “guarantee wallet” source;
- replace generic dispatch minimum/COD threshold semantics with explicit versioned policy fields matching final D17 decision;
- settlement eligibility derives from canonical wallet ledger and protected requirements;
- delete any client-side/top-level calculation of withdrawable/collateral status;
- remove stale docs/comments that describe a second wallet or manual guarantee status.

## 3. COD cleanup

### BTHWANI captain

- reservation amount must bind to WLT-owned canonical PaymentAllocation/order reference;
- no trusted caller amount/currency where WLT can derive it;
- reservation create/release/finalize transitions must be idempotent and concurrency-safe;
- accepted delivery cannot discard WLT error;
- use durable handoff/reconciliation for distributed completion;
- remove/retire legacy collection/remittance routes from the BTHWANI collateral-backed path when they represent the same economic amount;
- update names/comments from ambiguous `funded-wallet order` language to explicit `collateral-backed COD`/chosen canonical terminology;
- prove cancellation, reassignment, timeout, failed delivery, duplicate proof and retry all resolve the reservation exactly once.

### Partner/store delivery

- do not use BTHWANI captain collateral/reservation semantics;
- store/partner COD financial responsibility must have an explicit WLT path;
- partner proceeds/platform fees/optional courier earning must all derive from the same PaymentAllocation and delivered-order evidence;
- no duplicate COD liability across store, courier and platform.

## 4. Checkout/payment cleanup

- inventory `official_wallet` as checkout payment method across Go, SQL, OpenAPI, TS, apps, tests and docs;
- if no authorized direct-order external-wallet product exists, remove it from checkout enums and migrations/validation going forward;
- preserve official wallet only as Cash-In/top-up rail;
- introduce/complete canonical PaymentAllocation;
- remove alternate allocation calculations in clients or DSH/WLT adapters;
- verify COD/WALLET/MIXED across BTHWANI and partner fulfillment;
- bind refund to original allocation/funding lineage.

## 5. Eligibility cleanup

Build one server-side semantic composition and retire duplicate eligibility branches.

Required inputs:

- trusted actor/operator context;
- order fulfillment/store/service area;
- DSH fleet affiliation/membership;
- Workforce provider active/readiness/accreditation/scopes/absence;
- DSH dispatch presence/current capacity;
- WLT general financial readiness;
- WLT order-specific COD reservation where cash exists.

Then remove:

- DSH duplicate mutable general accreditation authority;
- service-area candidate logic that merely echoes requested area;
- capacity metrics that count unscoped captains;
- stale local financial projections that can grant writes;
- UI-side eligibility calculations;
- multiple helper functions with divergent “eligible” definitions;
- compatibility fallbacks that bypass unavailable Workforce/WLT.

## 6. Fleet and partner courier identity cleanup

- enforce primary `BTHWANI XOR PARTNER` affiliation;
- make transfer explicit;
- resolve partner membership -> captain actor before Workforce calls;
- rename ambiguous identifiers:
  - `storeCourierId` -> explicit `captainMembershipId` or equivalent when membership is meant;
  - `captainActorId` when actor identity is meant;
- update DB columns/FKs, OpenAPI, Go structs, TypeScript types, events, audit and tests;
- add wrong-store, suspended-membership, wrong-affiliation and ID substitution negatives;
- remove deprecated aliases after controlled migration; do not retain permanent dual semantics.

## 7. Accreditation / availability cleanup

- Workforce remains general accreditation owner;
- delete DSH general accreditation writer/field after migration unless a distinct dispatch certification is explicitly introduced later;
- Workforce suspension/absence remains authoritative;
- DSH presence is limited to dispatch-local online/offline/available/busy semantics;
- remove duplicated `suspended`/availability meanings that can conflict;
- update dashboards/capacity to compose these sources rather than copy them.

## 8. Penalty cleanup

Target:

```text
WLT PenaltyPolicyVersion
  <- sovereign Platform control-plane configuration
Operations Incident
  -> penaltyPolicyVersionId
WLT
  -> derive amount
  -> canonical ledger debit/credit
  -> immutable penalty record
```

Remove:

- Workforce `ProposedPenaltyMinorUnits` and currency as operator authority;
- generic amount entry in operations penalty application;
- WLT `PostInput.AmountMinorUnits` as authoritative caller input;
- any fallback default penalty amounts;
- policy lookup without version pinning;
- direct/manual balance correction as a penalty workaround.

Reversal must remain compensating ledger truth; original transaction is immutable.

## 9. Partner-app surface cleanup/build-out

Partner app store-delivery surface must be clear and purpose-built, not a copied captain app.

Expected capability groups:

- Delivery configuration/mode;
- Store courier/team membership;
- Courier status/readiness summary;
- Assigned tasks / active delivery;
- pickup/depart/arrive/proof/completion;
- exceptions/reassignment;
- store delivery finance/readback;
- compensation policy only if D18 enables platform-managed per-delivery earnings;
- optional store-collateral UI only if D19 enables platform-managed enforcement.

Remove any BTHWANI-only fields from partner courier UI and any unsupported finance controls.

## 10. WLT legacy finance reproof and cleanup

Historical package claims are search seeds, not current truth.

Reprove all current writers/readers for:

- canonical ledger transactions/lines/accounts;
- legacy ledger tables;
- wallet balance projections;
- daily finance close;
- settlement control totals;
- promotion funding;
- subscription/onboarding commercial fees;
- pricing/fees;
- payout hold/release/completion;
- COD records/reservations;
- penalties;
- earnings/commissions;
- refunds.

For each legacy path:

```text
discover -> prove duplicate/obsolete -> migrate if necessary -> remove -> repair refs -> verify no runtime consumer
```

Never delete solely from static “unused” output.

## 11. Data/migration requirements

- do not rewrite old migration history to fake a clean past;
- add forward migrations that establish final schema/invariants;
- preserve historical monetary records with explicit provenance where required;
- never synthesize unknown historical financial facts;
- backfill only when derivable from canonical immutable evidence;
- mark irrecoverable historical ambiguity explicitly and isolate it from current authority;
- test fresh database and upgraded database;
- test migration idempotency/manifest ordering where applicable;
- prove no old column remains writable/reachable after cutover.

## 12. Contracts/generated artifacts

For every changed boundary:

- OpenAPI schemas;
- Go DTO/domain types;
- TypeScript shared types;
- generated clients;
- frontend adapters/hooks;
- events/outbox payloads;
- database constraints/indexes;
- Product Truth/governance docs;
- integration tests.

No generated stale artifact may preserve the old semantic.

## 13. Line-level noise cleanup

Final review must remove proven:

- dead branches;
- stale comments describing removed behavior;
- unused imports/types/functions;
- duplicate helpers;
- compatibility aliases beyond migration window;
- TODO/FIXME/HACK for the treated root;
- debug logging/temp flags;
- hard-coded fallback monetary values;
- ignored errors on material finance paths;
- magic role/status strings where canonical typed constants/contracts exist;
- copied client calculations.

## 14. File-level cleanup

Inventory and disposition files that become:

- obsolete financial adapters;
- legacy COD handlers;
- old eligibility services;
- duplicate shared frontend finance modules;
- stale contract files;
- superseded tests;
- temporary scripts/workflows;
- abandoned migration helpers;
- old diagnosis executables presented as current authority.

Files with historical/audit value are retained only under explicit historical classification, not in active executable authority paths.

## 15. Folder-level cleanup

After file cleanup:

- remove empty directories;
- merge duplicate module folders;
- relocate misplaced finance code into WLT ownership;
- relocate workforce-only operational code out of finance modules;
- ensure partner delivery operational code stays DSH-owned while monetary policy/effects stay WLT-owned;
- prevent parallel `shared` modules from becoming independent truth.

## 16. Verification matrix

### Static/contract

- Go tests for WLT/DSH/Workforce affected packages;
- TypeScript typecheck;
- OpenAPI validation/generated-client sync;
- database migration/constraint checks;
- governance schema gate.

### Runtime/data

- fresh DB migration;
- upgrade DB migration;
- captain top-up readback;
- opening/minimum policy readback;
- COD reserve concurrency;
- Mixed cash-only reserve;
- cancellation release;
- successful delivery final debit;
- WLT outage/timeout during completion;
- retry/readback/reconciliation;
- settlement request above/below safe excess;
- penalty policy application/reversal;
- partner wallet payment/COD/Mixed;
- salaried partner courier no earning;
- partner membership->actor readiness;
- wrong store/affiliation/area negatives;
- refund by funding lineage.

### Cross-surface

- app-client;
- app-captain;
- app-partner;
- control-panel Platform/Operations/Finance sections.

## 17. Final adversarial closure conditions

Closure is forbidden unless exact final candidate proves:

- zero authoritative monetary writer outside WLT;
- zero parallel wallet/ledger source of truth;
- zero caller-entered penalty amount authority;
- zero Workforce financial guarantee authority;
- zero fourth checkout payment semantic unless separately authorized;
- zero unbound COD reservation amount;
- zero silently ignored finance completion error;
- zero duplicate BTHWANI COD liability/remittance for same amount;
- zero wrong-area candidate/assignment;
- zero dual BTHWANI/PARTNER primary affiliation;
- zero ambiguous membership/actor ID;
- zero duplicate accreditation authority;
- zero stale projection granting critical write;
- zero salaried courier duplicate earning;
- zero client-calculated financial truth;
- zero reachable fallback/workaround/legacy authority;
- zero unaccounted material decision/finding/consumer/dependency/scope delta;
- zero stale line/file/folder artifacts within the treated cone.
