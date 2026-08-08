# Change scope

## Outcome
<!-- What product/engineering outcome changes, or why this is behavior-preserving? -->

## Impact

- [ ] Product behavior / Product Truth
- [ ] Frontend or shared UI
- [ ] Backend/API/contracts
- [ ] Database/migration/data
- [ ] Runtime/infrastructure/provider
- [ ] Authentication/authorization/privacy/security
- [ ] WLT/financial truth
- [ ] Governance/agents/guards/tooling
- [ ] CI/workflows/release
- [ ] Documentation only

## Surfaces affected

- [ ] app-client
- [ ] app-partner
- [ ] app-captain
- [ ] app-field
- [ ] control-panel
- [ ] backend/service consumer
- [ ] none / not applicable

## Source and candidate

Linked issue/capability: <!-- issue/Product Truth/none -->

Candidate SHA: <!-- exact head SHA reviewed/tested -->

Risk class: <!-- low / medium / high / critical -->

## Ownership and invariants

Authoritative owner(s): <!-- service/domain/contract -->

Key invariants / forbidden behavior: <!-- concise list -->

Migration/compatibility impact: <!-- none or describe -->

Rollback / roll-forward plan: <!-- required when impact warrants it -->

## Verification

Use affected verification plus evidence-driven risk expansion. Do not check commands that are not applicable merely to satisfy this template.

| Evidence scope | Applicable? | Command/run/evidence | Candidate-bound result |
|---|---|---|---|
| static | yes |  |  |
| product |  |  |  |
| runtime |  |  |  |
| visual |  |  |  |
| qa |  |  |  |
| security |  |  |  |
| finance |  |  |  |
| isolation |  |  |  |
| governance |  |  |  |
| ci |  |  |  |
| release |  |  |  |
| production |  |  |  |

Do not commit transient logs, screenshots, generated diagnostics, or evidence packages unless a canonical retention contract explicitly requires a durable artifact.

## Reviews and protected approvals

Required independent/protected approvals: <!-- none or list authority domains -->

Approval/review evidence: <!-- exact candidate-bound references -->

## Decision

Use only `governance/contracts/decision-vocabulary.json`:

- [ ] `READY_FOR_REVIEW`
- [ ] `PASS` (scoped claim only)
- [ ] `FIX_REQUIRED`
- [ ] `NEEDS_EVIDENCE`
- [ ] `BLOCKED_EXTERNAL`
- [ ] `PROTOCOL_VIOLATION`

`CLOSED_WITH_EVIDENCE` is not implied by this PR template; it requires every applicable same-candidate scope and protected approval.
