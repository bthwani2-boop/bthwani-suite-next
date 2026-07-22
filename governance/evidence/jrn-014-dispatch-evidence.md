# Governed captain dispatch closure evidence

## Decision

- Journey: `JRN-014 — إسناد الكابتن والتوزيع`
- Branch: `sambassam`
- Verified head: `b82a39c3a19f89e623d09e4e975355c4c18982f7`
- Verification run: `29880182868`
- Code closure: `VERIFIED`
- Release state: `NOT_MERGED_NOT_DEPLOYED`
- Required slices: `18`
- Verified slices: `18`
- `zeroGate`: `true`
- `nextJourneyStarted`: `false`

## Passed gates

1. Go tests for `services/dsh/backend/internal/dispatch`.
2. Go tests for protected DSH HTTP handlers.
3. Full-stack dispatch integrity gate.
4. Targeted dispatch integration tests.
5. Targeted dispatch OpenAPI and contract-registry gate.
6. TypeScript verification for the shared dispatch brain, control-panel dispatch surfaces, and captain assignment surfaces.

## Code truth covered

- Atomic governed assignment creation with idempotency and order locking.
- Tenant isolation and service-area matching.
- Captain accreditation, availability, capacity, and candidate ordering.
- Captain offer inbox, acceptance, reasoned decline, and timeout.
- Operator cancellation and atomic reassignment.
- Permanent dispatch decision log and read-after-write operational panels.
- Client/captain/control-panel cross-surface binding without local success simulation.
- Standard implementation filenames without journey numbers.

## Independent repository debt

The repository-wide DSH typecheck and global contract foundation lint still report failures in unrelated catalog, workforce, platform, partner-pricing, runtime-alias, and legacy contract files. Those failures are not imported by the governed dispatch verification scope and were not suppressed inside dispatch code. They remain separate repository debt.

## Rollback

Revert the governed dispatch closure as one release unit. Disable new offers first, retain `dsh_dispatch_decisions` for audit, and do not partially restore the legacy ungoverned assignment writer.
