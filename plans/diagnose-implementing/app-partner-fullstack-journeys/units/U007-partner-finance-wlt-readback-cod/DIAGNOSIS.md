# U007 — Partner finance and WLT boundary

## Objective

Close Partner wallet/ledger, read-only payout destination, payout request/history, settlement/commission readback and any still-applicable Partner COD financial path on one WLT-owned truth, against the current `WLT_MONEY_MOVEMENT_SETTLEMENT` Product Truth rather than the older commission-centric package model.

## Current diagnosis

Current Product Truth is materially more specific than the old U007. `WLT_MONEY_MOVEMENT_SETTLEMENT` is still `DISCOVERY`, but for Partner it now requires:

- one canonical WLT wallet/ledger truth;
- masked current official-wallet destination as **read-only** beneficiary data;
- Partner cannot create/update/deactivate/select payout destination master data;
- payout intent contains only `FULL_AVAILABLE` or `SPECIFIED` plus the required idempotency context;
- `FULL_AVAILABLE` sends no authoritative total from the client; WLT calculates eligible available funds transactionally;
- `SPECIFIED` is only a requested amount and must be validated by WLT against current eligible funds;
- WLT resolves the current verified active destination server-side and pins the proper version/provenance into financial state;
- provider/external uncertainty remains held/reconcilable (for example `provider_result_unknown`) rather than being shown as completed;
- all authoritative financial totals, ledger effects, payout state, settlement and reconciliation remain WLT-owned.

Current Partner presentation is already substantially aligned. `WltDshPartnerBridge` composes `PartnerCodCustodyPanel`, `ActorWalletPanel`, `RepresentativeCommissionPanel` and `PayoutDestinationPanel`. The payout panel renders masked/read-only destination state, has no beneficiary destination mutation UI, exposes FULL_AVAILABLE/SPECIFIED, retains an attempt idempotency key through failure, reloads canonical state after request, and explicitly presents `provider_result_unknown` as requiring Finance reconciliation.

Therefore U007 must not rewrite already-correct UI to create activity. The root task is to prove the complete WLT/DSH/Partner chain and remove only actual stale/parallel financial behavior.

The highest-risk compatibility question is Partner COD. The repository still has Partner COD custody/remit presentation/routes, while the current WLT Product Truth has materially evolved its money-movement model. U007 must determine from current contracts/domain/order allocation whether Partner COD custody/remit remains a canonical legal Partner financial model. If yes, prove one authorized financial effect, idempotency, ledger/audit/reconciliation and actor isolation. If superseded, overlapping or dead, remove/delegate the stale path after caller/data migration proof. Route existence is not proof that a financial model is still canonical.

## Root-cause targets

1. Partner financial reads are actor-scoped and WLT-backed; no DSH/frontend parallel ledger or authoritative arithmetic exists.
2. Payout destination is beneficiary read-only, masked and server-resolved from the current verified active WLT destination.
3. FULL_AVAILABLE and SPECIFIED semantics are enforced transactionally by WLT, not by stale UI balance.
4. Idempotency/retry cannot duplicate payout/COD/settlement/commission ledger effects.
5. Unknown external outcomes remain held/auditable/reconcilable and refresh/restart reconstructs canonical WLT state.
6. Cross-Partner financial reads/mutations fail without disclosing sensitive destination/account truth.
7. Partner COD custody/remit is either proven current and mutually consistent with the money-movement model or removed/delegated when obsolete; no overlapping financial effect remains.
8. Finance operator destination/master-data/execution actions remain permission/separation-of-duties controlled and distinct from Partner self-service.

## Boundaries

Primary: app-partner financial presentation + WLT truth + bounded DSH representative/financial facade + directly required WLT Finance operator readback/actions. Captain/Field finance remains out unless a genuinely shared contract change invalidates those consumers, in which case verify the shared impact without importing their product work.

## Closure rule

U007 requires WLT backend/database/ledger/payout/COD/settlement evidence, DSH actor-scoped facade tests, OpenAPI/binding parity, financial-boundary guards, provider/unknown-result runtime evidence, cross-Partner negatives and reconciliation. A successful Partner screen or DSH 200 response is never sufficient financial proof.
