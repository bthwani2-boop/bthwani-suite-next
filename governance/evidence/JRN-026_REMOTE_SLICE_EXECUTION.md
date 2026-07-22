# JRN-026 Remote Slice Execution

- `repository_mode`: `REMOTE_ONLY`
- `repository`: `bthwani2-boop/bthwani-suite-next`
- `target_branch`: `sambassam`
- `initial_head`: `83d877aa52a644786fc64d1da270087345c3884d`
- `journey`: `JRN-026 — القسائم وتسعير التوصيل وسياسات الولاء`
- `mode`: `fullstack unified multi-surface`
- `current_decision`: `READY_FOR_INDEPENDENT_REVIEW`
- `verification_workflow_blob`: `48765746599f5570b8e16874703cda43c71c7773`
- `verification_concurrency`: `event/ref serialized; cancel-in-progress=false`

## Executed code corrections

The partner delivery-pricing path contained two concrete closure gaps:

1. The shared controller required an existing pricing record even though the backend supports governed first creation through `expectedVersion=0`; the empty UI therefore had no executable action.
2. The pricing card existed but was not mounted in the current `DshPartnerStoreCourierScreen`, so the capability was unreachable on the partner surface.

The final implementation now:

- accepts a missing partner policy and creates it with `expectedVersion=0`;
- keeps operator creation blocked when an existing mode cannot be identified;
- exposes loading, empty-create, error, retry, success, and version-conflict recovery states;
- mounts the card in the partner store-courier screen;
- imports through `partner-delivery-pricing.public.ts`, not private implementation modules or the legacy operator projection;
- prevents the legacy partner hook from being exported by the broad partner barrel;
- permanently verifies DSH, WLT, TypeScript, bindings, Product Truth, and modular OpenAPI.

## Material execution commits

- `9b20f0cc0c0d328baf4f7fd68d083b2e4bba0d90` — allow governed partner pricing creation through version zero.
- `a98c9916d2bdccd928cb20bc49256ca526c779d8` — expose the empty-state creation form and remove the dead end.
- `df839e50cab60664c7d41445ab63c527fa9845c7` — mount partner pricing in the current store-courier screen.
- `fcecdbde7202eca05ad34d63e5a02a0d8af3a87a` / `bfe982ed718d24a3471eca6f598554ee57858d2b` — add focused JRN-026 and sovereign WLT boundary tests.
- `ba5ae7e2c18ea4e4a24f10f5f139c51804a10e86` — prove the partner pricing route mount.
- `90526f5d9f08ebc710fe2e2cb0b6dca18466f681` / `f681516e5399d711f8eb6e5af08a3e14e2c94f31` — add and consume the public partner-pricing capability entrypoint.
- `2860e8e189ad359ac388a3136f36c410acf1a701` — remove the legacy partner-pricing export from the broad barrel.
- `73d27913d3c65332432669dd4cedb58a4fc79118` — typecheck the focused public capability graph.
- `f32e4d987d4f2450a3c4b1bff70c08161eff660a` — enforce public-boundary and route-mount invariants.
- `c1baf428110af1ae21ba0ac930abb46469e07e04` / `c6c48a66160e2b995b9b3f20dd1c4cef791d9b17` — add and stabilize the permanent JRN-026 workflow.
- `688990aeb0d422612d8cf2580f89c542ea05a849` — add the JRN-026 Product Truth contract.

Intermediate import experiments were superseded by the explicit public capability entrypoint and are not the final architectural path.

## Sequential slice record

| Slice | Requirement | Execution evidence | Status |
|---|---|---|---|
| FS-01 | Product Truth and acceptance criteria | `governance/product/contracts/JRN-026_COUPONS_DELIVERY_PRICING_LOYALTY.product-truth.json` | IMPLEMENTED |
| FS-02 | Roles, permissions, surfaces, forbidden actions | coupon maker-checker, operator permissions, partner store scoping, Product Truth actors | IMPLEMENTED |
| FS-03 | States, transitions, allowed actions, negative invariants | coupon and loyalty lifecycle guards, pricing restrictions, empty-create and focused negative tests | IMPLEMENTED |
| FS-04 | Truth ownership and service boundaries | DSH coupon/pricing ownership and WLT loyalty/funding ownership are explicit | IMPLEMENTED |
| FS-05 | Database constraints, indexes, concurrency | serializable coupon/WLT ledger paths, delivery-pricing OCC and audit, pickup trigger | IMPLEMENTED |
| FS-06 | OpenAPI contracts and approved adapters | DSH modular OpenAPI verification is included in the permanent gate | IMPLEMENTED_AWAITING_FINAL_HEAD_GATE |
| FS-07 | Backend routes, validation, authz, idempotency | governed coupon, pricing, loyalty routes and route verification | IMPLEMENTED |
| FS-08 | Events, outbox, readback, retry, reconciliation | durable WLT outbox, idempotent loyalty earn/reverse, promotion-funding transitions | IMPLEMENTED |
| FS-09 | Shared brain types, adapters, controllers, view models | focused public partner-pricing entrypoint plus governed partner/operator controllers | IMPLEMENTED |
| FS-10 | Required surface routes, screens, actions, navigation | control panel, mounted partner card, governed client checkout | IMPLEMENTED |
| FS-11 | Loading, empty, offline, forbidden, conflict, recovery states | partner empty-create path, retry/error states, OCC conflict recovery | IMPLEMENTED |
| FS-12 | Multi-surface readback and removal of local truth | client renders server pricing snapshot; partner reloads persisted policy | IMPLEMENTED |
| FS-13 | Security, privacy, tenant isolation, RBAC, audit | partner store isolation, mode restriction, permission checks, append-only pricing audit | IMPLEMENTED |
| FS-14 | Accessibility, Arabic/RTL, reliability, weak-network behavior | Arabic operational states and governed retry/readback paths | IMPLEMENTED |
| FS-15 | SLA, observability, diagnostics, operational support | correlation IDs, audit records, outbox retries, workflow diagnostics | IMPLEMENTED |
| FS-16 | Legacy, duplicate, temporary workflow cleanup | dead-end and legacy public partner hook removed; no alternate local pricing owner introduced | IMPLEMENTED |
| FS-17 | Static, runtime, database, finance, governance, CI verification | permanent DSH/WLT/TypeScript/binding/Product-Truth/OpenAPI workflow | IMPLEMENTED_AWAITING_FINAL_HEAD_GATE |
| FS-18 | Same-commit evidence, rollback, remaining-risk decision | code is ready for independent product, finance, QA, security, release, and production review | READY_FOR_INDEPENDENT_REVIEW |

## Required verification gate

`.github/workflows/jrn-026-coupons-pricing-loyalty-verification.yml` must pass after this evidence update. It verifies:

1. DSH coupon, delivery-pricing, loyalty-policy, WLT-adapter, and outbox package compilation.
2. Governed JRN-026 route registration.
3. Sovereign WLT commercial loyalty-ledger compilation.
4. The focused JRN-026 public TypeScript capability and partner card.
5. Route mount, public-boundary, negative-invariant, and cross-surface binding tests.
6. Product Truth schema and semantic governance.
7. DSH modular OpenAPI composition and generated-client drift.

## Closure boundary

The code implementer does not grant independent product-owner, finance, QA, security, release, deployment, or production approvals. Final `CLOSED_WITH_EVIDENCE` remains prohibited until the relevant same-head workflow succeeds and those independent approvals and required runtime/visual evidence exist.
