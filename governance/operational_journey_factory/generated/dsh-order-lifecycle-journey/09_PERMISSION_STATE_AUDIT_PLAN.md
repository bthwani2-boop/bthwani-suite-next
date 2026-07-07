# Permission, State, and Audit Plan

This document governs actors, state transitions, permissions, and audit logs.

## 1. Actor Permissions Matrix

| Actor | Allowed Actions | Permission Policies |
|---|---|---|
| **Client** | Create checkout intent, cancel checkout intent, create order, track client order | `dsh-role-permission.model.ts` (client role checks) |
| **Partner** | List partner orders, accept order, reject order, mark preparing, mark ready | `dsh-role-permission.model.ts` (partner role checks) |
| **Captain** | List captain assignments, accept assignment, decline assignment, update status, submit POD | `dsh-role-permission.model.ts` (captain role checks) |
| **Operator** | List operator orders, cancel operator order, create assignment | `dsh-role-permission.model.ts` (operator role checks) |
| **System** | Timeout unaccepted orders, flag SLA breaches, audit events | Automated system workers |

## 2. Order State Transition Map

```
[ pending ] 
   │
   ├─► store_accepted ──► preparing ──► ready_for_pickup ──► driver_assigned ──► driver_arrived_store ──► picked_up ──► arrived_customer ──► delivered
   │
   └─► cancelled (by client/partner/operator)
```

## 3. Audit Logging
Every status transition is audited and logged in the `order_status_events` database table with columns: `id`, `order_id`, `actor`, `from_status`, `to_status`, `note`, `created_at`.
- All operational and exception interventions write to `platform-audit-state.ts`.
