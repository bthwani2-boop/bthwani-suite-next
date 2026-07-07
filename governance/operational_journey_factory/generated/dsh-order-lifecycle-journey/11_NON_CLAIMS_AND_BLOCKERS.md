# Non-Claims And Blockers

status: `DISCOVERY_PACKAGE_ONLY`

## Explicit Non-Claims

- This package does not implement the DSH order lifecycle.
- This package does not modify backend behavior.
- This package does not modify frontend behavior.
- This package does not modify database schema or data.
- This package does not modify runtime configuration.
- This package does not prove live-readiness.
- This package does not prove runtime readiness.
- This package does not close the journey.
- This package does not allow file deletion.
- This package does not replace future source inspection.

## Current Blockers

- Database tables, migrations, constraints, indexes, and transaction truth are not yet mapped.
- Audit events for order, partner, captain, dispatch, and operator interventions are not yet mapped.
- Permission enforcement and frontend visibility are not yet mapped.
- UI action, icon, and state coverage is not yet complete.
- Shared order lifecycle transport/domain split decision is unresolved.
- Surface-local business logic flags remain open.
- WLT financial boundary proof is required for payment, settlement, refund, commission, COD, wallet, and ledger touchpoints.
- Runtime smoke is not run and must not be claimed.
- CI proof is not attached to this package.

## Next Required Action

The next step is focused source inspection for this journey package. Implementation must not begin until the blockers are converted into explicit decisions and verification commands.
