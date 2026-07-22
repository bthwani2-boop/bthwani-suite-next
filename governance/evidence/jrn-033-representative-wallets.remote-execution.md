# JRN-033 — محافظ الممثلين والمالية المرجعية

## Execution identity

- `repository_mode`: `REMOTE_ONLY`
- `repository`: `bthwani2-boop/bthwani-suite-next`
- `target_branch`: `sambassam`
- `governing_command`: `governance/prompting/unified-operational-journey-execution-command.md`
- `journey_registry`: `governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md#JRN-033`
- `reviewed_verification_snapshot`: `3c335621c2b8358abd9ede69d1e72311627bddd0`
- `execution_date`: `2026-07-22`
- `mode`: `fullstack unified multi-surface`

The branch received concurrent journey commits throughout execution. Every overlapping finance file was re-read before replacement, and changes from JRN-034 through JRN-040 were preserved. Commits after the reviewed snapshot were compared; none changed a JRN-033-owned file.

## Financial and SaaS boundary

- WLT remains the sole owner of wallet balances and representative ledger truth.
- DSH is an authenticated and authorized BFF only; no representative balance mutation route exists in DSH or the frontends.
- Self-service routes derive both actor identity and tenant from the bearer session resolved by Identity.
- Operator wallet and ledger lookup requires `finance.read` and remains inside the operator tenant resolved by Identity.
- Browser path, query, body, or tenant headers cannot select the WLT tenant.
- WLT wallet and actor-ledger reads reject missing `X-Tenant-ID`.
- Cross-tenant wallet lookup is hidden as `NOT_FOUND`; cross-tenant actor-ledger lookup returns an empty collection.
- Representative finance responses use `Cache-Control: private, no-store` and `Pragma: no-cache`.
- Frontends call canonical DSH routes only and never call internal WLT financial routes directly.

## Sequential slice closure

| Slice | Implementation state | Evidence paths |
|---|---|---|
| Product truth and acceptance boundary | Implemented; independent approvals intentionally pending | `governance/product/contracts/jrn-033-representative-wallets.product-truth.json` |
| WLT representative actor validation | Implemented for client, partner, captain and field | `services/wlt/backend/internal/wallet/handler.go`, `handler_test.go` |
| Tenant-bound WLT wallet repository | Implemented | `services/wlt/backend/internal/wallet/repository.go` |
| Tenant-bound WLT actor ledger | Implemented | `services/wlt/backend/internal/ledger/ledger.go` |
| Database tenant migration and indexes | Implemented and registered in migration probes | `services/wlt/database/migrations/wlt-038_jrn_033_representative_finance_tenancy.sql`, `infra/docker/scripts/wlt-migration-probes.ps1` |
| Identity-aligned local runtime truth | Implemented for all four actors and cross-tenant negative evidence | `services/wlt/database/seeds/local/wlt-033_representative_wallets.local.sql` |
| DSH-to-WLT wallet boundary | Tenant-aware, normalized, validated and segment-escaped | `services/dsh/backend/internal/wlt/finance_proxy.go`, `client_test.go` |
| Authenticated DSH self-service routes | Actor and tenant scoped for all four actors | `services/dsh/backend/internal/http/representative_finance_routes.go` |
| Operator wallet and ledger lookup | `finance.read`, path-pinned actor and Identity tenant | `services/dsh/backend/internal/http/representative_finance_routes.go`, `representative_finance_routes_test.go` |
| Legacy field and captain finance bridges | Tenant propagation added without removing later COD/payout work | `services/dsh/backend/internal/http/field_finance.go`, `actor_finance_handlers.go`, `field_finance_test.go` |
| General control-panel finance proxy | Browser tenant forwarding removed; Identity tenant used | `services/dsh/backend/internal/http/financeproxy.go` |
| Client surface | Wallet and ledger panel bound in My Space | `services/dsh/frontend/app-client/account/MySpaceScreen.tsx` |
| Partner surface | WLT-owned wallet bound; hardcoded actor and settlement-as-wallet drift absent | `services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx` |
| Captain surface | Wallet and ledger primary view with COD references retained | `services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx` |
| Field surface | Wallet totals, ledger, commissions and governed payouts | `services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx`, `services/dsh/frontend/shared/finance-wlt-link/field-finance` |
| Control-panel surface | Read-only wallet lookup and matching representative ledger | `services/dsh/frontend/control-panel/finance/RepresentativeWalletLookup.tsx` |
| Shared frontend brain | Reusable actor wallet API, controller and stateful panel | `services/dsh/frontend/shared/finance-wlt-link/actor-wallet` |
| Focused API contract | Wallet and ledger operations for every required surface | `services/dsh/contracts/jrn-033-representative-finance.openapi.yaml` |
| Tenancy contract | Trusted Identity tenant and cross-tenant behavior declared | `services/dsh/contracts/jrn-033-representative-finance-tenancy.contract.json` |
| Authenticated runtime matrix | Implemented for positive and negative evidence | `tools/scripts/test-jrn-033-representative-wallets-runtime.ps1` |
| Runtime workflow | Canonical Identity + DSH + WLT Docker verification and WLT-unavailable test | `.github/workflows/jrn-033-runtime-verification.yml` |
| Visual evidence surface | Actual wallet components, environment gated | `services/dsh/frontend/control-panel/finance/Jrn033VisualEvidenceScreen.tsx`, `apps/control-panel/runtime/src/app/dsh/finance/jrn-033-visual-evidence/page.tsx` |
| Visual evidence workflow | Five hashed PNG states and immutable artifact | `.github/workflows/jrn-033-visual-evidence.yml` |
| Static closure workflow | Go, TypeScript, contracts, governance, tenancy and whitespace | `.github/workflows/jrn-033-representative-wallets-verification.yml` |

## Runtime matrix coverage

The runtime matrix authenticates the local Identity users for client, partner, captain, field and operator, then verifies:

1. Every representative reads only their own tenant-bound WLT wallet and ledger.
2. Available balances are real seeded WLT values, not frontend derivations.
3. Operator lookup reads the same wallet and matching ledger with `finance.read`.
4. Query attempts to override actor id or type are ignored.
5. Anonymous, cross-role and unauthorized operator requests are rejected.
6. Unsupported representative actor types are rejected.
7. A wallet in `other-tenant` is hidden and its ledger does not leak.
8. Suspended and frozen wallet states remain visible to the authorized operator.
9. Direct browser-style WLT wallet reads are rejected.
10. DSH returns `WLT_UNAVAILABLE` when WLT is stopped and recovers after WLT restarts.

## Visual evidence boundary

The visual evidence route is unavailable unless `NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE=1`. It renders the actual `ActorWalletPanel` for client, partner, captain and field plus the actual operator lookup component. The workflow captures `success`, `empty`, `frozen`, `error` and `loading` PNG files, verifies their size, writes SHA-256 hashes and uploads them for 30 days. Fixture data is used only for visual-state evidence; Docker runtime owns live financial evidence.

## Final remote verification runs

Reviewed snapshot: `3c335621c2b8358abd9ede69d1e72311627bddd0`

- Static/contract/compile run: `29929911369` — run number `561` — currently `queued`.
- Canonical Docker runtime run: `29929914174` — run number `278` — currently `queued`.
- Actual component visual evidence run: `29929911285` — run number `32` — currently `queued`.

The repository currently has a large number of unrelated journey workflows queued on the same branch. The connector does not expose workflow cancellation or direct `workflow_dispatch`, so obsolete runs cannot be removed remotely from this execution. A queued run is infrastructure evidence only and is not treated as a pass or failure.

## Independent evidence still external

- Independent financial-control approval.
- Independent product acceptance and explicit PM/PO approvals.
- Release and production telemetry; no deployment was authorized.

Engineering cannot issue those approvals on behalf of their owners. The product-truth contract therefore remains `DISCOVERY` with approval fields `PENDING`; this is intentional and prevents false closure.

## Decision

`IMPLEMENTED_AWAITING_REMOTE_RUNNER_AND_INDEPENDENT_APPROVAL`

All code, database, contract, tenant-isolation, multi-surface, runtime-test and visual-evidence work for JRN-033 is implemented on `sambassam`. `CLOSED_WITH_EVIDENCE` is blocked only until the three immutable runs above complete successfully and independent financial/product owners record their decisions.

## Unauthorized actions not performed

- No pull request was created or merged for this execution.
- No force push was performed.
- No tag or release was created.
- No production deployment or provider activation was performed.
- No independent approval was self-issued.
