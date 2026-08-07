# Evidence, SDLC, and Release Policy

Status: ACTIVE_CANONICAL

## Lifecycle

The governed lifecycle is:

```text
G0_INTAKE → G1_PRODUCT_MODEL_APPROVED → G2_DESIGN_APPROVED
→ G3_READY_FOR_IMPLEMENTATION → G4_IMPLEMENTATION_VERIFIED
→ G5_PRODUCT_ACCEPTED → G6_QA_APPROVED → G7_SECURITY_APPROVED
→ G8_RELEASE_APPROVED → G9_DEPLOYED → G10_PRODUCTION_VERIFIED
→ CLOSED_WITH_EVIDENCE
```

Evidence scopes are `static`, `product`, `runtime`, `visual`, `qa`, `security`, `finance`, `isolation`, `governance`, `ci`, `release`, and `production`. Each scope is independent and tied to one immutable commit. A skipped stage is valid only with an explicit reason and evidence that change impact makes it not applicable; exclusion is not a pass.

Lifecycle artifacts encode excluded stages in `notApplicableStages` and record their reasons and evidence in `stageExclusions`.

## Branch, CI and review policy

Direct work uses the explicitly named branch as source and target. Before and after each logical write batch, re-resolve the remote SHA. Do not create another branch or pull request, merge, deploy, substitute another target branch, force-push or rewrite history unless the current task explicitly authorizes it.

Verification and CI are read-only with respect to source. Required CI must:

- run against the exact candidate commit;
- propagate failures instead of swallowing them;
- use least-privilege explicit permissions;
- pin external GitHub Actions to immutable commit SHAs;
- disable persisted checkout credentials when source write-back is unnecessary;
- never commit, push, merge, auto-repair or rewrite source as part of verification.

Where a pull request/review is explicitly required, required checks must pass on the reviewed head commit, stale approvals must not survive changes that invalidate their evidence, and unresolved review threads remain unresolved work. A technical `PASS` never grants merge authority.

## Sole-owner and protected approvals

The sole-owner exception is defined only by `governance/authority/single-owner-mode.json`. It may satisfy only the approval domains explicitly listed there and only when its requirements are met. It does not create an independent reviewer and does not authorize the executor to impersonate the owner.

Authentication/authorization/session controls, privacy/PII/secrets, trusted isolation, WLT financial control, migrations affecting production data, critical/high vulnerability acceptance, residual-risk acceptance, release approval, deployment, production verification and final closure remain protected according to the active authority contracts.

`FINANCIAL_CONTROL_AUTHORITY` independently owns WLT financial approval and cannot be replaced by engineering, product, governance, QA or the sole-owner exception.

Missing required independent security, finance, isolation, migration, release, production or residual-risk evidence keeps the applicable scope open using the canonical decision vocabulary; it must not be converted into a fabricated approval.

## Release and production

Release or production action is never implied by implementation authorization, a passing build, a passing guard or a merged change. Automatic release is forbidden unless a separate active canonical mechanism explicitly authorizes it.

When release/production is applicable, require as appropriate to the release profile:

- immutable candidate commit;
- required same-commit CI and review evidence;
- release-authority approval;
- artifact provenance and integrity evidence;
- signed tag/artifact where the active release profile requires signing;
- rollback or roll-forward plan with an owner;
- deployment evidence;
- production verification from the deployed artifact/commit;
- reconciliation and recovery evidence for financial or migration-sensitive releases.

## Final closure

`CLOSED_WITH_EVIDENCE` requires every applicable evidence scope and protected approval on the same immutable candidate, with no open failure, blocker, pending decision, stale evidence or branch/commit mismatch. Merge does not equal approval, deployment does not equal production verification, and production verification does not erase missing earlier evidence.
