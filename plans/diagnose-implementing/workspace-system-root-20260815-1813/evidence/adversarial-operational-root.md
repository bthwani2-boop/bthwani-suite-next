# Adversarial Operational-Root Challenge

Pinned truth/integration baseline: `A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b`.

Purpose: attempt to falsify the proposed Operational Root before allowing any lower-layer observation or technical defect to become execution authority.

## Challenges

1. **Could Partner or Store be the platform-isolation owner?** No. The PRD and platform model define Platform Context as the isolation boundary and Partner Organization/Store as business authorization scopes only. Any implementation treating either as platform/operator context is a defect, not alternative authority.
2. **Could DSH become authoritative financial truth because applications use a DSH financial facade?** No. DSH may expose bounded WLT-backed references/projections and orchestrate allowed handoffs, but WLT exclusively owns wallet, ledger, payment, refund, settlement, payout, commission, reconciliation and provider financial mutation.
3. **Could an application surface, shared controller, local state, analytics/read model or generated client own durable business state?** No. These are consumers/presentation/coordination artifacts. Canonical mutation authority remains at the owning backend/domain and service-owned persistence boundary.
4. **Could historical runtime evidence or a registry status such as `runtime-verified` prove the current baseline?** No. `services/dsh/runtime-map.ts` explicitly marks historical evidence `HISTORICAL_NOT_SAME_COMMIT`, with null evidence SHA and unproven database/generated-client/surface bindings. Current-candidate evidence must be regenerated.
5. **Could MinIO, financial simulators, mail/cache/observability profiles or other runtime helpers become Product Truth owners?** No. They are runtime dependencies/providers/support infrastructure. Durable product ownership remains assigned by PRD/contracts.
6. **Could a lower-authority Product Truth README statement narrow the current explicit whole-workspace target?** No. Current user instruction is precedence rank 1. Capability/support documents cannot override the authorized task target or create a competing execution boundary.
7. **Does absence of GitHub workflow runs/statuses prove the implementation is defective?** No. It proves current CI evidence is absent. The correct decision for that evidence scope is `NEEDS_EVIDENCE`, not an inferred implementation failure and not PASS.
8. **Can every current `FIX_REQUIRED` state be reduced to missing evidence only?** No. The WLT money-movement Product Truth explicitly records material live-model drift: legacy provider-managed payout states, beneficiary destination self-service, bank/manual destination semantics, client-visible payout destination choice, COD collect/remit behavior, partial allocation support and separate finance inspectors that must converge on one WLT-owned governed state machine. Therefore the root landscape must include implementation/semantic convergence as well as evidence/binding gaps.
9. **Can protected security/finance/isolation/release/production approvals be satisfied by the executing agent or by static checks?** No. Delivery and security policy keep those approval/evidence domains logically distinct and fail closed when unavailable.
10. **Could a successful lower-layer fix or narrow test close the whole workspace?** No. The platform is multi-surface and outcome-oriented; each material outcome requires its affected vertical path, consumers/readbacks, same-candidate evidence and applicable protected approvals.
11. **Could another session's branch delta dictate this task's direction?** No. Latest HEAD is a truth/integration baseline only; foreign deltas may alter facts/dependencies and require reconciliation but are `INPUT, NOT INSTRUCTION`.
12. **Could cleanup be deferred as non-operational?** No. Competing truth, obsolete files/dependencies/configuration and stale consumers can preserve incorrect runtime authority; cleanup remains material when dependency/consumer proof shows it is safe and necessary.

## Adversarial result

**PASS for the Operational Root model.** The proposed root survives attempts to substitute business scope for isolation authority, DSH for WLT financial ownership, surfaces/shared code for durable truth, historical evidence for current proof, helper infrastructure for Product Truth, lower-authority documents for current scope, or absent CI for implementation failure. The challenge also proves that the workspace contains at least one material semantic-convergence problem (WLT finance) in addition to same-candidate evidence/binding deficits; therefore later prioritization must compare root causes rather than treating verification as the only frontier.

This PASS validates bounded root ownership/navigation only. It does not prove implementation, runtime, security, finance, CI, release or production closure.

Evidence:
- `governance/authority/authority-precedence.json`
- `governance/GOVERNANCE.md`
- `governance/product/PRD.md`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/bthwani-platform-model.product-truth.json`
- `governance/product/contracts/wlt-money-movement-settlement.product-truth.json`
- `governance/policies/engineering.md`
- `governance/policies/security.md`
- `governance/policies/delivery.md`
- `services/dsh/runtime-map.ts`
- `services/dsh/surface-map.ts`
- `services/dsh/service.manifest.ts`
- `services/wlt/service.manifest.ts`
- `infra/docker/compose.runtime.yml`
- live GitHub exact-SHA CI/status queries recorded during this task
