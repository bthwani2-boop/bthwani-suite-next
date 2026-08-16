# HOLD REPROOF MATRIX — 2026-08-16

Status: `SYSTEM-WIDE ACCOUNTING / NOT CLOSURE EVIDENCE`

Evidence baseline for current implementation findings: `b@1c31adb1e8d1443e59ca49e4b75051c2f897a334`.

This matrix exists to prevent any previously discovered cone from disappearing merely because a later diagnosis focuses on another subsystem. A cone is closed only when its full writer/reader/consumer/runtime surface is proven on one final candidate SHA.

## Status vocabulary

- `PROVEN_CURRENT_DEFECT` — current branch proves a material defect/root.
- `PARTIAL_CUTOVER` — current branch has meaningful canonical work, but remaining writers/consumers are material.
- `HOLD_FULL_INVENTORY` — representative evidence exists but exhaustive proof is not complete.
- `HOLD_RUNTIME_REACHABILITY` — code exists; production/runtime reachability still requires proof.
- `EXTERNAL_POLICY_REQUIRED` — mechanism can be diagnosed, but exact policy value comes from legal/business authority not present in code.
- `POSITIVE_PATTERN` — correct local pattern to preserve and reuse; not equivalent to whole-cone closure.

---

| Cone | Current classification | Current re-proof | What remains mandatory before closure |
|---|---|---|---|
| Identity sessions | `PROVEN_CURRENT_DEFECT` | DSH `IsSessionValid` protocol does not match Identity `serviceOnly`; push sends when verification errors | full session caller inventory, revoke/compromise propagation, all surfaces/devices, cross-service contract tests |
| Identity RBAC | `HOLD_FULL_INVENTORY` | DSH has Identity-owned role/permission client and deny-by-default comments | prove every RBAC writer, session permission derivation, role request/approval application, cache/version invalidation, no JSON/local authority |
| Operator/Object authorization | `PROVEN_CURRENT_DEFECT` | Checkout operator list/get primitives omit OperatorContext scope | enumerate every control-panel/admin/operator route and prove `permission + trusted context + object scope + state precondition` |
| Workforce financial fields | `PROVEN_CURRENT_DEFECT` | Workforce reads/writes financial guarantee amount/currency/status/reference; incidents carry proposed penalty money | forward migration + WLT cutover + delete DB/API/TS/UI/tests; prove zero non-WLT monetary writers |
| Workforce readiness | `HOLD_FULL_INVENTORY` | accreditation/availability model exists | map person lifecycle, accreditation, suspension, absence, work windows, documents, exact DSH consumers |
| Workforce geography | `HOLD_FULL_INVENTORY` | `ServiceZoneID` remains in availability notices | prove whether it is DSH reference or parallel authority; resolve IDs/FKs/API naming and all consumers |
| Captain Eligibility | `PROVEN_CURRENT_DEFECT` | availability middleware is non-authoritative/fail-open for candidates and successful assignment/accept | construct one eligibility composition and use same decision in candidate/capacity/assign/reassign/offer/accept; negative outage proof |
| Primary affiliation / Partner membership | `HOLD_FULL_INVENTORY` | prior D23 model exists; not re-proven exhaustively in current DB/API | unique constraints, transfer lifecycle, partner/store/branch scope, captain UI modes, multi-membership behavior |
| Captain/store courier identifiers | `HOLD_FULL_INVENTORY` | prior actor/member/store/branch confusion retained as target; no exhaustive current consumer proof yet | typed IDs through DB/OpenAPI/Go/TS/UI; prove no membership passed as actor, no store ID as branch |
| StoreBranch | `HOLD_FULL_INVENTORY` | binding decision requires real entity | prove current branch entity/schema/API/migrations and remove pseudo-branch IDs from every surface |
| Geography | `HOLD_FULL_INVENTORY` | ServiceArea/Capacity paths exist; Workforce retains ServiceZone vocabulary | full City -> OperationalZone -> ServiceArea/geofence writer/read graph; store creation; address resolution; dispatch/capacity/SLA; no city/service-area semantic substitution |
| Store creation geography | `HOLD_FULL_INVENTORY` | previous diagnosis reported city/service-area seeding; not yet re-proven on pinned file in this pass | exact current Store/Branch create writers and migration data correction proof |
| Serviceability | `HOLD_FULL_INVENTORY` | governed cart serviceability and operational policy exist | prove geographic base check uses canonical geofence/service area only and no same-city/distance fallback authority; all client/order consumers |
| Capacity | `HOLD_FULL_INVENTORY` | newer capacity policies/forecast routes coexist with old `NOT_IMPLEMENTED` capacity route | eligible captain set parity with assignment, exact service area, stale old route removal |
| Platform ChangeSets | `PROVEN_CURRENT_DEFECT` | Apply returns `APPLIED` before target payload/effect | actual target command, idempotency, readback, unknown/failure/reconcile states, audit cardinality |
| Platform provider state | `PROVEN_CURRENT_DEFECT` | operator writes ACTIVE/DEGRADED/MAINTENANCE/UNKNOWN same field that carries health semantics | split desired config/maintenance from observed health; probe ownership/readback and UI cutover |
| Media readiness | `PROVEN_CURRENT_DEFECT` | readiness invokes connection/EnsureBucket and unconfigured provider is ready | bootstrap/readiness split, required-vs-optional capability policy, ACL/download/retention/redaction |
| Media ACL/privacy | `HOLD_FULL_INVENTORY` | not closed by readiness inspection | every asset class visibility, signed URL/token expiry, partner/workforce docs, PoD, incident evidence, orphan/deleted target cleanup |
| Cart price authority | `PARTIAL_CUTOVER` | Upsert/Validate use normalized assortment/master product/current price server-side | full option/variant pricing, promotions, quote consistency and all consumers |
| Cart financial availability | `PROVEN_CURRENT_DEFECT` | fee DB error -> zero; WLT unavailable/error -> nil quote | typed financial unavailability and readiness blocking, frontend explicit failure state |
| Cart concurrency/OCC | `HOLD_FULL_INVENTORY` | Upsert locks cart row; single-cart create uses advisory lock | Remove/Clear/mode/note/all mutations, mandatory expected version policy, concurrent integration tests |
| Checkout intent choice | `PROVEN_CURRENT_DEFECT` | missing payment -> COD; missing fulfillment -> BTHWANI delivery | explicit server eligibility and no silent selection when >1 valid option |
| Checkout operator isolation | `PROVEN_CURRENT_DEFECT` | operator list/get primitives omit OperatorContext in SQL | all operator checkout routes including reconcile; cross-context negative tests |
| Checkout financial durability | `POSITIVE_PATTERN + HOLD` | cancellation enqueues WLT expire-session durably | prove every create/confirm/unknown/reconcile transition and outbox worker restart/idempotency |
| Payment choices | `PARTIAL_CUTOVER` | shared controller now exposes cod/wallet/mixed only | mixed/wallet numeric eligibility, no frontend authority, all five surfaces and OpenAPI/generated parity |
| Official external wallets | `PARTIAL_CUTOVER` | absent as order checkout option in inspected shared controller; subscription still accepts/defaults official_wallet | repository-wide exact-ref inventory of checkout/order/payment consumer paths; preserve top-up rail semantics only where decided |
| PaymentAllocation | `HOLD_FULL_INVENTORY` | binding D12 exists; not exhaustively re-proven in current WLT/DSH DB in this pass | persisted numeric allocation, all COD exposure/custody/refund/settlement consumers, mixed invariants |
| WLT pricing | `PARTIAL_CUTOVER` | DSH Cart calls WLT quote; DSH still sends operational fee evidence and ignores WLT errors | prove WLT arithmetic/policy ownership, coupon/promotion/special-request/subscription paths, immutable quote lineage |
| WLT ledger/wallet | `HOLD_FULL_INVENTORY` | not reclassified from service name alone | every ledger writer, balance/position projection, transaction isolation, idempotency, reversal, reconciliation |
| Captain collateral | `PROVEN_CURRENT_DEFECT OUTSIDE WLT + HOLD WLT` | Workforce remains live money writer | prove WLT restricted position, minimum policy, excess release, setoff, offboarding and zero Workforce money authority |
| COD exposure | `HOLD_FULL_INVENTORY` | D04/D08/D09 binding model retained | reserve/release lifecycle from canonical cash leg, assignment/accept gate, stale/timeout/reassign/cancel behavior |
| Cash custody | `HOLD_FULL_INVENTORY` | model decided but full current writers not inventoried here | collected evidence, open custody, settlement deadline, shortage/reconciliation, store-delivery counterparty |
| Penalties | `PROVEN_CURRENT_DEFECT OUTSIDE WLT + HOLD WLT` | Workforce incident contains caller-authored proposed amount/currency | WLT penalty policy derivation, debt/receivable, setoff/appeal/reversal and zero caller-authored amount |
| Coupons/promotions | `HOLD_FULL_INVENTORY` | prior diagnosis found DSH monetary derivation; not accepted as current proof without exact-ref re-open | current calculator writers, funding split, WLT derivation, stacking/version/budget/refund behavior |
| Special Requests | `PROVEN_CURRENT_DEFECT` | dev OperatorContext fallback + DSH editable money fields | governed quote, acceptance/expiry, dispatch/assignment, all stages, cancel/financial compensation, remove dev fallback |
| Subscription | `PROVEN_CURRENT_DEFECT / DECISION RECONCILED` | missing method -> official_wallet; accepts wallet/mixed/official_wallet | apply reconciled tender policy, no default, WLT session lifecycle, renewal/cancel/compensation/reconcile |
| Loyalty | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | product semantics raised in prior diagnosis; current complete balance/redemption graph not re-proven | points writers, expiry, earning, redeem, refund, anti-abuse; WLT owns monetary redemption effect only under chosen non-cash model |
| Payout | `HOLD_FULL_INVENTORY` | WLT contains payout/provider packages; no blanket correctness claim | intent immutability, destination verification/version, maker-checker, provider unknown result/inquiry, retry/reconcile |
| Refund/reversal | `HOLD_FULL_INVENTORY` | D21/D22 binding; Checkout cancellation uses durable expire pattern, not refund proof | original funding lineage, cash leg rule, idempotency, same-rail support, settlement/promotion/inventory effects |
| Partner/store settlement | `HOLD_FULL_INVENTORY` | D14/D18 decisions retained | store counterparty, delivery fee/economics, partner contract version, COD custody readback, WLT settlement writers |
| Store courier payroll | `HOLD_FULL_INVENTORY` | D16/D17 binding: store responsibility | prove no WLT/BTHWANI liability writer, UI labels and configuration cannot imply platform payroll |
| Catalog master truth | `PARTIAL_CUTOVER` | cart validation uses MasterProduct approval + StoreAssortment publication | full master writers/import/proposal/approval/retire, all old local catalog routes and data cutover |
| Catalog approval queue | `HOLD_FULL_INVENTORY` | prior three-state divergence remains target | re-prove current queue stage writers/consumers and ensure queue is workflow projection only |
| Catalog legacy/unified routes | `PROVEN_CURRENT STRUCTURAL` | server still contains explicit stale `NOT_IMPLEMENTED` routes in adjacent capabilities; catalog-specific old route inventory remains open | exact route/OpenAPI/generated/frontend inventory and deletion after cutover |
| Inventory authority | `PARTIAL_CUTOVER` | normalized inventory participates in cart availability | complete inventory table writers and branch/store granularity decision implementation |
| Inventory reservation | `HOLD_FULL_INVENTORY HIGH RISK` | `reserved_quantity` is consumed by cart validation | prove reserve -> commit/release/TTL/restart/cancel/return/concurrency/reconcile; column existence is not lifecycle proof |
| Negative inventory | `HOLD_FULL_INVENTORY` | accepted invariant direction | DB constraints + adjustment workflow + concurrency proof |
| Returns workflow | `PROVEN_CURRENT_DEFECT` | action marked executed without state transition; order-level single-return conflict behavior | multiple partial episodes per decision, quantity guards, logistics, receive/disposition, WLT refund, restock, promotion/settlement |
| Order state vocabulary | `HOLD_FULL_INVENTORY` | prior drift retained, not blanket-proven current | canonical lifecycle and mappings across Order/Dispatch/Pickup/Return/Support/client/partner/captain |
| Client cancellation | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | current checkout cancellation not same as order cancellation | prove order states, fees/refund/inventory/dispatch compensation and client/support surface parity |
| Store->captain handoff | `HOLD_FULL_INVENTORY` | route exists | exact state/preconditions/OTP/proof/actor provenance, partner vs BTHWANI behavior |
| Customer self-pickup | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | `ModePickup` exists | distinguish customer pickup from store/captain handoff end-to-end, UI/order/payment/readiness |
| Support/Rescue | `HOLD_FULL_INVENTORY` | prior false-completion diagnosis remains un-reproven in exact current file during this pass | all actions, actual command effect, manual evidenced resolution type, finance/order/dispatch readback |
| Delivery exceptions/incidents | `HOLD_FULL_INVENTORY` | multiple incident classes exist; Workforce proposed money is proven wrong | class boundaries, correlation, discipline vs support vs financial discrepancy, WLT effects only via policy IDs |
| Ratings eligibility | `PARTIAL_CUTOVER` | client order rating requires delivered order and owner; 48h edit window implemented | target/public semantics, abuse, return/cancellation effect, cross-surface exposure |
| Ratings moderation | `PROVEN_CURRENT_DEFECT` | public/general summary uses active status, not approved moderation | approved/publication gate and historical admin view |
| Notifications outbox | `PARTIAL_CUTOVER + PROVEN_SESSION_DEFECT` | durable push retry worker exists; session verifier fails open | all producers, topic classification, consent/preference gate, DLQ/retry/readback, endpoint lifecycle |
| OTP notifications | `HOLD_FULL_INVENTORY` | prior direct path may be a legitimate secret-handling exception | exact current implementation, no plaintext secret in generic outbox, delivery/replay/security proof |
| Consent | `PROVEN_CURRENT_DEFECT` | booleans only; no policy/source/revocation provenance; audit exec ignored | append-only decision model, policy version, surface/source/time, mandatory vs marketing classification |
| Marketing targeting | `HOLD_FULL_INVENTORY` | prior client-derived audience/fallback findings not re-proven exact-ref here | server-derived audience, approved content, fallback semantics, canonical deny |
| Home discovery/search | `HOLD_FULL_INVENTORY` | public routes exist | canonical eligibility before ranking/cache, stale deny safety, filters actually implemented, no hardcoded category authority |
| Reels/public content | `HOLD_FULL_INVENTORY` | routes/assets exist | moderation, publication, expiry, target deletion/suspension, media retention and audience |
| Contact proxy | `HOLD_FULL_INVENTORY` | captain route exists | assignment authorization, PII masking, logs, expiry, abuse/rate limits |
| Partner lifecycle | `HOLD_FULL_INVENTORY` | prior Partner/Store conflation retained as target | organization vs Store vs Branch state graph, suspend/readiness, derived visibility, all writers/audits |
| Store visibility | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | public store/storefront/catalog endpoints exist | one canonical composite gate across list/get/home/search/catalog; parent deny wins without rewriting child publication |
| Multi-store audit | `HOLD_FULL_INVENTORY` | prior effect/audit cardinality mismatch not re-opened exact-ref in this pass | every bulk/multi-store mutation and corresponding audit rows |
| Partner Fleet | `HOLD_FULL_INVENTORY` | team/fleet/captain connection routes exist | primary affiliation, membership/scopes, invite redemption, actor resolution, multi-store/branch scopes, transfer |
| Partner invite stale API | `PROVEN_CURRENT_DEFECT` | legacy `/dsh/partner/invites*` routes are `NOT_IMPLEMENTED` while other team/fleet invite mechanisms exist | canonicalize and delete stale contract/route/clients |
| Field app/domain | `HOLD_FULL_INVENTORY` | field create/verification/media routes and readiness gate exist | every visit/status/assignment/evidence/location transition, suspected Scan/RETURNING drift, no approval/financial authority |
| Field GPS | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | prior server-side canonical store-GPS pattern should be preserved | exact current thresholds/policy ownership, version/default/override, replay/offline evidence |
| app-client | `HOLD_FULL_INVENTORY` | payment controller partial proof only | every screen/CTA/controller/API/cache/deep link/offline/persistence/empty/error/retry path |
| app-partner | `HOLD_FULL_INVENTORY` | server team/fleet/store routes exist | all Store/Branch/Catalog/Order/Handoff/Fleet/Cash/Settlement/Support/Permissions bindings |
| app-captain | `HOLD_FULL_INVENTORY` | dispatch routes and payment/wallet shared paths exist | modes, assignment, accept/decline, PoD, exception, cash custody, wallet/collateral, offline/reconnect, display identity |
| app-field surface | `HOLD_FULL_INVENTORY` | backend gates exist | all UI bindings and offline evidence; no control-panel authority leakage |
| control-panel | `HOLD_FULL_INVENTORY HIGH RISK` | permission-protected routes exist but Checkout object-scope defect and ChangeSet false success proven | every sensitive action × permission × scope × state × reason × SoD × audit × readback |
| Shared frontend brain | `HOLD_FULL_INVENTORY` | payment controller contains eligibility logic/env feature flag | classify every shared module; remove authoritative business decisions and duplicate domain state |
| OpenAPI | `HOLD_FULL_INVENTORY` | stale live routes prove contract risk | all live route -> operation -> schema -> generated client -> adapter -> surface parity |
| Generated clients | `HOLD_FULL_INVENTORY` | not presumed correct from OpenAPI presence | generation drift, local DTO duplicates, zero manual incompatible bindings |
| Database | `HOLD_FULL_INVENTORY` | representative tables prove duplicate monetary truth and normalized cart truth | every table/column owner/writer/reader/FK/check/index/projection/retention classification |
| Migrations | `HOLD_FULL_INVENTORY` | forward-only rule binding | fresh install, current upgrade, supported historical upgrade, backfill correctness, mixed-version cutover, rollback/forward-fix |
| Jobs/outbox | `HOLD_FULL_INVENTORY` | Push worker + checkout finance outbox representative evidence | every job, lease, retry, max-attempt, DLQ, unknown result, restart, ordering, dedupe, reconciliation |
| Runtime config | `PROVEN_CURRENT_DEFECT + HOLD_REACHABILITY` | Special Requests default dev OperatorContext live in service code | all env/secret/default/mock/fallback paths and production reachability; startup validation |
| Health/readiness | `PROVEN_CURRENT_DEFECT` | Media readiness mutates/provisions and treats unconfigured as ready | all services/dependencies, liveness/readiness/capability health semantics |
| Provider integrations | `PROVEN_CURRENT_DEFECT + HOLD` | DSH provider desired/observed state conflated | WLT financial rails separately: config, credentials, health, webhook verification, unknown-result/reconcile |
| Observability | `HOLD_FULL_INVENTORY` | no closure claim | correlation IDs, metrics/traces/logs, financial alerts, queue backlog, privacy/PII, stale/missing dashboard semantics |
| Analytics | `HOLD_FULL_INVENTORY` | prior freshness/missing-vs-zero diagnosis retained as target | every metric source/window/timezone/currency/freshness/completeness and UI labels |
| Privacy/PII | `HOLD_FULL_INVENTORY` | consent gap proven | phone/address/GPS/docs/bank destination/support/incident/device data in DB/log/events/telemetry, access + redaction + retention |
| Retention | `EXTERNAL_POLICY_REQUIRED + HOLD MECHANISM` | exact durations intentionally not invented | mechanism supports separate classes; Legal/Product supplies durations; deletion/anonymization jobs and evidence |
| Account deletion | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | model direction accepted | Identity/client deletion, anonymization, retained financial/legal facts, cross-service purge/revoke |
| Feature flags | `HOLD_FULL_INVENTORY / DECISION RECONCILED` | server-authoritative direction accepted | every capability flag writer/read path; frontend env cannot enable forbidden capability |
| CI/guards | `HOLD_FULL_INVENTORY` | package requires architecture guards | forbidden money writers, duplicate truth, IDs, OpenAPI/generated drift, direct UI authority, fallbacks, migrations, security |
| Actor provenance | `OPEN / FAILED PRIOR VERIFICATION` | D34 explicitly says previous attempt failed before full consumer/OpenAPI/final proof | re-run from current branch, all event writers/readers/surfaces, no historical fabrication |
| Governance/Product Truth | `HOLD_RECONCILIATION` | package is diagnosis only; current decision register is narrower than system-wide hold set | after runtime/product decisions close, reconcile machine Product Truth; no premature doc authority overwrite |
| Physical cleanup | `OPEN` | stale NOT_IMPLEMENTED routes and Workforce money fields prove residue | line/type/route/table/column/client/test/script/config/file/folder/docs zero-reference deletion proof |

---

# Root-first execution frontier derived from the matrix

This is ordering, not permission to call the system closed:

1. **F0 — Evidence repin and exhaustive inventories**
   - exact `b` head;
   - writer/reader/consumer/API/DB/state inventory;
   - branch movement/foreign delta classification.

2. **F1 — Trust, tenant, object-scope authority**
   - Identity internal protocol;
   - OperatorContext propagation;
   - object-scoped authorization;
   - remove dev context defaults.

3. **F2 — False-completion state machines**
   - ChangeSets;
   - Returns;
   - Support/Rescue;
   - every `applied/executed/completed/resolved` state with authoritative readback.

4. **F3 — Canonical Captain Eligibility**
   - Workforce readiness/availability;
   - fleet/membership;
   - service area;
   - DSH presence/capacity/conflicts;
   - WLT financial eligibility;
   - fail-closed writes.

5. **F4 — Financial authority cutover**
   - Workforce guarantee/penalty removal;
   - Special Request quotes;
   - coupons/promotions;
   - canonical PaymentAllocation/COD/custody/settlement/refund;
   - subscription/loyalty product semantics.

6. **F5 — Geography + identifiers + Partner/Store/Branch model**
   - City/Zone/ServiceArea;
   - StoreBranch;
   - actor/member/store/branch semantic IDs;
   - Partner Fleet scopes.

7. **F6 — Catalog/Inventory/Cart/Checkout**
   - preserve normalized current price/assortment path;
   - close reservation lifecycle;
   - fail-closed quote/fee dependencies;
   - explicit option selection.

8. **F7 — Order/Handoff/Return/Support state vocabulary**
   - one lifecycle contract;
   - explicit compensations and actual outcomes.

9. **F8 — Providers/Media/Notifications/Consent/Privacy**
   - desired vs observed state;
   - bootstrap vs readiness;
   - consent provenance;
   - delivery/retry/ACL/retention.

10. **F9 — Five-surface cutover**
    - app-client;
    - app-partner;
    - app-captain;
    - app-field;
    - control-panel;
    - shared modules/generated clients.

11. **F10 — DB/OpenAPI/Migrations/Runtime/Observability/CI**
    - full parity and architecture guards.

12. **F11 — Physical zero-residue cleanup + adversarial final proof**
    - no stale route/DTO/schema/writer/fallback;
    - latest target-branch reconciliation;
    - exact final candidate SHA;
    - fresh install + upgrade + runtime + negative/security/concurrency proof.

# Closure law

The matrix may be replaced by `CLOSED` only when every row is one of:

- `CLOSED_WITH_EVIDENCE` on the same final candidate SHA;
- `NOT_APPLICABLE_WITH_PROOF`;
- explicit external blocker with owner, exact dependency and unblock condition.

`HOLD`, `TODO`, `NOT_IMPLEMENTED`, `best effort`, `fallback`, undocumented duplicate writer, or false-success state prevents final closure.
