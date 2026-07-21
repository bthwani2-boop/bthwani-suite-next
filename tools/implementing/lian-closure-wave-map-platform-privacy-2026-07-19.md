# Lian Closure Wave — Governed Maps, Platform Policies, and Address Privacy

Date: 2026-07-19
Repository: `bthwani2-boop/bthwani-suite-next`
Target branch: `lian`
Execution mode: `REMOTE_ONLY`
Canonical decision after implementation: `FIX_REQUIRED` until same-commit gates and runtime evidence pass.

## Closed in repository implementation

### Governed map-provider boundary

- Providers owns external provider invocation, credentials, HTTPS enforcement, bounded responses, timeout, priority, and failover.
- DSH invokes Providers through the governed internal boundary and never stores provider credentials.
- App-client invokes only DSH map endpoints and contains no direct external-provider URL or secret.
- Search and reverse-geocoding results are normalized before they reach DSH.

### DSH service-area truth

- DSH owns active geofences, priority, version, and coordinate-to-service-area resolution.
- Client-selected coordinates are accepted only when DSH resolves an active service area.
- Manual service-area text entry was removed from the client address screen.
- Operator service-area changes require permission, reason, correlation, idempotency, and expected version.
- A sovereign control-panel editor now supports geofence create/update and readback.

### Platform zones, SLA, capacity, and onboarding-fee policy

- Previously disconnected routes were restored and registered in the live router.
- The existing legacy tables were upgraded with optimistic concurrency instead of creating duplicate sources of truth.
- Mutations are transaction-bound, replay-safe, audited, and permission-protected.
- The control panel exposes a separate sovereign policies route rather than a blank or misleading platform-control tab.
- Zone, SLA, capacity, serviceability, and onboarding-fee screens reload server truth after mutations.
- WLT remains the sole financial truth owner; DSH only owns the onboarding-fee policy definition.

### Client-address PII governance

- Deleted addresses receive a governed purge deadline.
- Expired deleted addresses are irreversibly anonymized in bounded batches.
- Name, phone, address text, service-area value, delivery details, and coordinates are removed.
- Active addresses are excluded from anonymization.
- Privacy policy changes use version, idempotency, correlation, reason, and audit events.
- The worker requires an explicit stable run identifier so retrying after timeout cannot process a second batch under the same run.
- A PowerShell runner and dedicated worker command were added for repeatable operations.

### Contract and verification closure

- Active map and platform-policy contracts were registered and added to the master contract index.
- Capability ownership now assigns map/address operations to checkout and geofence governance to platform policies.
- Backend route extraction now scans every Go file in the HTTP package instead of only `server.go`.
- Dedicated guards cover map/provider separation, geofences, policy mutations, UI bindings, and PII.
- Dedicated workflows cover Go, TypeScript, generated-client drift, migrations, invariant tests, migration replay, full runtime smoke, and a final same-commit gate.

## Evidence required before promotion

The implementation above must not be promoted to `CLOSED_WITH_EVIDENCE` until all of the following are observed on one immutable final commit:

1. Final same-commit workflow succeeds.
2. Providers, DSH, WLT, Identity, Workforce, and Platform Control Go verification succeeds.
3. Typecheck, build, tests, guards, and generated-client comparisons succeed.
4. DSH and WLT migrations succeed from clean databases and supported upgrade baselines.
5. Full runtime bootstrap and smoke succeeds on canonical ports.
6. Authenticated map search, reverse geocoding, geofence resolution, address CRUD, checkout, and order snapshot readback succeed.
7. Client-address anonymization is executed against a disposable runtime database and read back.
8. Branch protection, required checks, stale-approval dismissal, and independent reviewers are verified through live GitHub configuration.
9. Production finance remains blocked until provider, finance, security, risk, and release approvals exist.

## Current decision

`FIX_REQUIRED`

This decision reflects missing same-commit and external evidence, not a claim that the repository work above is absent.
