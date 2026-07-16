# SDLC Support Package

These files are machine-readable support files derived from `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`.

They do not create a second authority. If these support files conflict with the canonical governance file, the canonical governance file wins and this package must be corrected.

## Files

- `lifecycle.state-machine.yaml` defines allowed stage order and terminal states.
- `roles-and-authority.yaml` defines authorities, blocking rights, and separation-of-duties rules.
- `gate-catalog.yaml` maps stages to required evidence categories.
- `quality-profile.yaml`, `security-profile.yaml`, and `test-profile.yaml` define risk-based expectations.
- `defect-policy.yaml`, `exception-policy.yaml`, and `metrics.yaml` define decision support.
- `artifact-manifest.schema.json` and `change-impact.schema.json` define machine-readable evidence inputs.
- `templates/` contains minimal starting manifests for governed journeys.

## Acceptance condition

Accepted only when `pnpm run guard:sdlc` validates the package structure and no stage transition is claimed without its required evidence.

## Optional Input Validation

`guard:sdlc` can validate JSON manifests against the bundled schemas:

```powershell
pnpm run guard:sdlc -- --stage G5_QA_APPROVED --artifact path/to/artifact.json --impact path/to/change-impact.json
```

The guard validates shape only. It does not approve QA, security, runtime, release, or production outcomes by itself.
