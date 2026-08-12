# Global diagnosis — App Captain on BB

## Rebaseline and concurrent movement

Repository: `bthwani2-boop/bthwani-suite-next`. Branch: `BB`.

The Captain product/implementation diagnosis was pinned at `bee8e9cfe1762cef39690f0b254fdf0b6855e1a9`. The prior Captain package commit `82f1743e6c8e4139a87ea1ac4c1cbb75fccd9986` is 310 commits behind that point, with material drift across Captain runtime, Identity, Workforce, dispatch governance, WLT finance, migrations, tests and CI.

During package preparation `BB` advanced one commit to `0628bf1aa3fe39477197f9a9cb8cf04c8e8332ef`. Inspection shows that descendant adds only `plans/diagnose-implementing/field-3`. It does not modify app-captain, this Captain package, Identity, Workforce, DSH, WLT, contracts, runtime or shared Captain consumers. The delta is therefore `DISJOINT_PLANNING_ONLY`: product diagnosis remains valid, the new subtree must be preserved, and the final Captain package commit must use `0628bf1aa3fe39477197f9a9cb8cf04c8e8332ef` as parent without force/reset.

## Fail-closed definition of work

The package is an execution package, not a closure report. Every unit remains OPEN until actual candidate-bound evidence proves root cause removal, all affected paths, cleanup, adversarial negative cases, regression safety and end-to-end behavior. Any known fixable in-scope error, gap, contradiction, duplicate behavior, dead/obsolete path, unresolved state, integration defect, authorization weakness, data inconsistency, workaround or regression prevents DONE. Small diff size is not an objective; correct ownership and a clean final architecture are.

## Truth ownership

- Identity: authentication, live session, exact role/surface access and refresh lifecycle.
- Workforce: Captain workforce profile, engagement and readiness.
- DSH: fleet membership, dispatch profile/eligibility/assignment, custody, tracking, proof, support/incidents/rescue and role-appropriate operational readback.
- Governed media: proof assets where the current contract delegates them.
- WLT: every authoritative financial amount/state including financial eligibility, wallet/ledger, Cash-In, COD financial effect, earnings/commissions, payout destination/eligibility/request, settlement and reconciliation.

No surface-local state may replace these owners.

## Identity / Workforce

Native Captain runtime persists Identity session through SecureStore, configures a device fingerprint provider, requires `captain` + `app-captain`, requires Workforce kind `captain`, and blocks DSH until readiness allows access. Current Identity policy additionally requires authenticated state, exact `sessionSurface`, matching `surfaceAccess`, role-to-surface mapping and role membership. Refresh rotation is repository/database governed; concurrent use of an already rotated token returns an explicit conflict instead of silently racing.

The mobile provider reads Workforce directly for `/workforce/me` and `/workforce/readiness/{actorId}` using the Identity bearer token. Separately, Workforce exposes `/internal/captains/{actorId}/readiness` to DSH behind service authentication. U002 must prove both transports converge on one Workforce actor/readiness truth and that missing profile, wrong kind, suspension/termination, wrong surface/role, actor switch, logout/restart and Identity/Workforce unavailability fail closed.

## Fleet and complete eligibility

Partner-fleet remains one DSH-owned versioned/audited lifecycle with digest-only one-time codes, own-Captain redeem/list/disconnect, partner lifecycle visibility and redacted operator readback.

Dispatch candidate selection now requires more than availability/capacity: approved accreditation, available state, unexpired WLT financial eligibility, fresh dispatch profile, no active provider absence, service-area context and remaining capacity. Final assignment validation locks the Captain profile row and recomputes capacity in the transaction. U003 must prove every prerequisite and concurrency behavior while treating WLT financial eligibility as an opaque WLT-owned projection rather than reimplementing money arithmetic in DSH/frontend.

## Dispatch / handoff

Dispatch Product Truth remains `IMPLEMENTED_PENDING_VERIFICATION`. U004 must prove one active assignment per order, idempotency, expiry, assigned-Captain-only decision, mandatory decline reason, stale/late rejection, atomic reassignment and role-appropriate readback.

Current DSH also requires `DSH_DISPATCH_ASSIGNMENT_KILL_SWITCH` to be explicitly configured. Missing, malformed, nil or unsupported decision states fail closed. Bypassing this boundary for development would be a regression.

Store↔Captain custody remains bilateral DSH truth: partner confirmation plus Captain completion precede pickup; replay identity is protected from payload drift; reassignment supersedes prior custody; shortage/mismatch can block progression; operator resolution permits only legal continuation; refresh/restart reads persisted truth; app-field is excluded and custody does not mutate WLT.

## Tracking / proof / support

Tracking/status/PoD need actor/assignment scope, duplicate safety, privacy, weak-network unknown-result recovery, governed media binding and canonical readback. Native camera/location/permission/restart claims require physical-device evidence when changed. Foreground-only behavior does not authorize background tracking by itself.

Support Product Truth explicitly names `CaptainOrderSupportConversationScreen` and permits Captain support only for an assigned order. Current code still has `orderchat` rendering messaging disabled while `chat-read-ack` and `chat-send` route to the live conversation screen. This is a known contradiction. U005 must perform route/navigation/deep-link reachability census, converge every live entry on one governed support model and remove/delegate obsolete route/type/copy only after proof. Internal notes stay operator-only, rescue remains operator-owned/audited, and DSH rescue is financially read-only toward WLT.

## Captain finance

Current WLT Product Truth is broader than the old commission-focused package. Captain requires one canonical WLT wallet, governed Cash-In, order-specific governed COD financial effect, automatically derived earnings, read-only current verified official-wallet destination and payout intent restricted to `FULL_AVAILABLE` or `SPECIFIED`. Beneficiary surfaces cannot create/update/select payout destination master data or supply authoritative financial totals.

The primary Captain finance screen already composes financial eligibility, wallet, COD, commissions, payout destination/request and incidents. The payout component correctly keeps destination read-only, sends no destination identifier, lets WLT calculate FULL_AVAILABLE eligibility and holds unknown external outcomes for reconciliation.

WLT already implements `captain_topup`, top-up sessions, CashInRail authorize/capture and atomic capture finalization plus wallet credit. The current diagnosis did not establish a reachable app-captain top-up entry/controller. Because Product Truth requires Captain top-up, U006 must complete the consumer census and, if absent, add only the bounded WLT-backed app/shared adapter rather than a second payment engine.

`WltDshCaptainBridge` still carries stale finance presentation while newer components exist. Reachability determines whether it must migrate or be removed. DSH also retains Captain COD collect/remit routes while the target Captain-funded COD model forbids a second remittance liability for the same effect. U006 must prove explicit mutually exclusive model selection per order/effect, atomic retry/cancellation/finalization, ledger/audit consistency and reconciliation.

## Bounded surface scope

Only Captain-linked control-panel administration, HR, partners/fleet readback, platform dispatch configuration, operations, support and WLT finance are included. app-partner is limited to fleet/handoff. app-client is limited to Captain-caused readback. app-field, catalogs, marketing, generic analytics/dashboard/login and unrelated finance remain excluded absent a proven direct dependency.

## Closure standard

No static inspection, successful build, successful unit suite or partial CI can close behavior that depends on PostgreSQL concurrency, runtime configuration, cross-surface readback, actor isolation, financial reconciliation, physical-device lifecycle, visual/accessibility QA or protected independent approval. Every `RESULT.json` must bind actual PASS evidence to the exact unit resulting SHA. Final cleanup, hardening and adversarial review are mandatory after the last product write; any new defect reopens the affected unit/package.
