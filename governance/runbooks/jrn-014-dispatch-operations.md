# JRN-014 Governed Dispatch Operations Runbook

## Scope

This runbook covers captain offer creation, captain response, timeout, cancellation, reassignment, capacity and service-area eligibility, operator monitoring, and client tracking readback. DSH is the operational truth owner.

## Primary signals

- offers older than their `response_deadline_at` that remain `offered`;
- repeated `CAPTAIN_NOT_ELIGIBLE` or `CAPTAIN_AT_CAPACITY` responses;
- orders in `driver_assigned` without an active assignment;
- more than one active assignment for an order;
- accepted assignments whose delivery remains `assigned`;
- cancellation or reassignment attempts after pickup execution starts;
- decision rows missing for an assignment mutation;
- captain inbox or operator list failures by tenant;
- unusual growth in `dsh_dispatch_decisions` rejection actions.

## Operator recovery

1. Read the current assignment and decision log before any mutation.
2. Run the governed expiry action for overdue offers.
3. For an active pre-pickup assignment, choose either cancellation or an eligible replacement captain in the same tenant and service area.
4. Enter a clear operational reason. Never reuse an idempotency key for a different target captain.
5. Confirm read-after-write: the prior assignment is terminal and at most one replacement is active.
6. Confirm the captain inbox and client tracking projections converge.

## Safe database diagnostics

```sql
-- Overdue offers that should have expired
SELECT id, tenant_id, order_id, captain_id, response_deadline_at
FROM dsh_assignments
WHERE status='offered' AND response_deadline_at <= now();

-- Orders with multiple active assignments
SELECT tenant_id, order_id, count(*)
FROM dsh_assignments
WHERE order_id IS NOT NULL
  AND (status='accepted' OR (status='offered' AND response_deadline_at > now()))
GROUP BY tenant_id, order_id
HAVING count(*) > 1;

-- Capacity projection
SELECT tenant_id, captain_id, count(*)
FROM dsh_assignments
WHERE status='accepted' OR (status='offered' AND response_deadline_at > now())
GROUP BY tenant_id, captain_id;

-- Decision history
SELECT assignment_id, order_id, captain_id, action, reason_code, actor_id, created_at
FROM dsh_dispatch_decisions
WHERE tenant_id=$1 AND (assignment_id=$2 OR order_id=$3)
ORDER BY created_at DESC;
```

## Forbidden recovery

- Do not update assignment status directly without the domain transition and decision log.
- Do not delete an assignment to make a conflict disappear.
- Do not increase captain capacity solely to bypass a queue.
- Do not change the order store area or captain scope to force a match.
- Do not mutate WLT balances, COD liability, commission, settlement, or payout from this runbook.
- Do not retry reassignment with a new key until the original response and readback have been checked.

## Rollback

Rollback is application-first. Disable operator mutation controls or revert the dispatch code commit while preserving database columns and audit rows. The migration is additive; do not drop decision history or assignment governance columns during an incident. Restore the last verified application commit, run read-only diagnostics, then reconcile active assignments through governed actions.

## Escalation

Escalate to security for cross-tenant or actor-ownership evidence, to Workforce for accreditation/vehicle/employment projection errors, to platform operations for service-area truth, and to WLT only for financial projections. Assignment truth remains in DSH.
