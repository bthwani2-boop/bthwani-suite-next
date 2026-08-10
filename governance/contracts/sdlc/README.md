# SDLC Machine Contract

Status: MACHINE_READABLE_CONTRACT

This directory is the machine-readable SDLC contract for BThwani. It encodes `governance/policies/delivery.md` and the authority/decision contracts for automated validation; it must not contradict `governance/GOVERNANCE.md`, the PRD, Engineering/Security/Delivery policies, or higher authority.

## Contents

- `lifecycle.state-machine.yaml` — G0–G10 and closure transitions.
- `roles-and-authority.yaml` — logical authorities and separation of duties.
- `gate-catalog.yaml` — stage ownership and evidence requirements.
- `quality-profile.yaml`, `security-profile.yaml`, `test-profile.yaml` — risk-based verification requirements.
- `defect-policy.yaml`, `exception-policy.yaml`, `metrics.yaml` — bounded decision controls.
- `artifact-manifest.schema.json`, `change-impact.schema.json` — evidence/impact input schemas.
- `templates/` — schema-aligned starting artifacts; templates never constitute evidence.

## Rules

- Stage movement is forward-only unless the lifecycle explicitly permits otherwise.
- A skipped stage requires `notApplicableStages` plus a matching evidenced `stageExclusions` entry and must not conflict with change impact.
- `applicableEvidenceScopes` and `passedEvidenceScopes` are distinct; every applicable scope must pass on the same immutable candidate before final closure.
- Static, product, runtime, visual, QA, security, finance, isolation, governance, CI, release, and production evidence remain separate.
- Required approvals are logical authorities; an execution agent cannot fabricate or self-grant protected approval.
- `CLOSED_WITH_EVIDENCE` is valid only under `governance/contracts/decision-vocabulary.json` and the Delivery policy.

## Validation

```powershell
pnpm run guard:sdlc -- --stage <STAGE> --artifact <artifact.json> --impact <change-impact.json>
```

The guard validates contracts and supplied evidence metadata. It does not repair source, execute unavailable runtime checks, or create approvals.
