# SDLC Support Package

Status: DERIVED_SUPPORT

These machine-readable files derive from `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`. They do not create a second authority. Any conflict must be corrected in this package.

## Files

- `lifecycle.state-machine.yaml` defines G0–G10, closure, and canonical unresolved decisions.
- `roles-and-authority.yaml` defines authorities and separation of duties.
- `gate-catalog.yaml` maps stages to required evidence categories.
- `quality-profile.yaml`, `security-profile.yaml`, and `test-profile.yaml` define risk-based expectations.
- `defect-policy.yaml`, `exception-policy.yaml`, and `metrics.yaml` provide bounded decision support.
- `artifact-manifest.schema.json` and `change-impact.schema.json` define current evidence inputs.
- `templates/` contains starting manifests; templates are not evidence.

## Stage exclusions

A stage may be skipped only when:

1. it is listed in `notApplicableStages`;
2. a matching `stageExclusions` entry contains a reason and evidence;
3. the change-impact document does not make that stage mandatory;
4. the requested transition remains forward-only.

An excluded stage is not a passed stage.

## Evidence scopes

The artifact declares `applicableEvidenceScopes` and `passedEvidenceScopes`. Final closure requires every applicable scope to be passed on the same immutable commit. Static, product, runtime, visual, QA, security, finance, isolation, governance, CI, release, and production scopes remain independent.

## Input validation

```powershell
pnpm run guard:sdlc -- --stage G6_QA_APPROVED --artifact path/to/artifact.json --impact path/to/change-impact.json
```

The guard validates shape, impact routing, transitions, exclusions, approvals, and same-commit evidence. It does not create missing Product Manager, Product Owner, governance, CI, QA, security, finance, release, production, or risk-acceptance approval.

## Acceptance condition

Accepted only when `pnpm run guard:sdlc` validates the current schemas and no stage, scope, approval, or closure decision is claimed without its required same-commit evidence.
