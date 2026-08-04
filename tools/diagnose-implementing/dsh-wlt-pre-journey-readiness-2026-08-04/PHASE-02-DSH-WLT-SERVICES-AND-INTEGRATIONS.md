# PHASE 02: DSH & WLT Services and Integrations

## Scope
DSH Backend, WLT Backend, Databases, Event Outboxes, Domain Services, State Machines, Canonical Owners.

## Inputs
- Phase 01 Contract definitions.
- Current database schemas and migrations.

## Outputs
- Refactored Domain Services (DSH for ops, WLT for finance).
- Eliminated parallel truth tables.
- Consolidated state machines.

## Dependencies
- `PHASE-01-AUTHORITY-AND-BOUNDARIES`

## Tasks
1. **Diagnose Parallel Truths:** Identify duplicate states (e.g., Order Status vs Financial Status tracked in wrong domains).
2. **State Machine Consolidation:** Ensure DSH governs order/fulfillment state exclusively.
3. **Financial Isolation:** WLT exclusively handles ledger, balance, and settlement. DSH sends idempotent events.
4. **Radical Refactoring:** Replace corrupt legacy logic instead of patching. Delete dead routes.

## Acceptance Criteria
- DSH holds 0 financial accounting logic; exclusively uses WLT endpoints/events.
- Zero dual-writes for the same domain entity.
- Migrations cleanly rebuild or upgrade without legacy artifacts.

## Independent Closure Checks
- DB Schema validation and migration dry-run PASS.
- Unit and Integration tests for DSH/WLT state transitions PASS.
