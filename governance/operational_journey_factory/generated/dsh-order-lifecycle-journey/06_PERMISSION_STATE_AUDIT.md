# Permission State Audit

status: `DISCOVERY_PACKAGE_ONLY`

## Actor Matrix

### Client

Required actions:

- create checkout intent
- cancel checkout intent
- create order
- list own orders
- view own order
- track own order

Required proof:

- backend ownership and actor scoping
- frontend visibility
- error mapping
- retry and blocked state

Current status: `BLOCKED_NEEDS_EVIDENCE`

### Partner

Required actions:

- list partner orders
- accept order
- reject order
- mark preparing
- mark ready for pickup
- communicate or respond to order issue

Required proof:

- store/order ownership
- permission enforcement
- rejection reason validation
- audit event for accept/reject/status transitions
- rollback or compensation behavior

Current status: `BLOCKED_NEEDS_EVIDENCE`

### Captain

Required actions:

- list assignments
- accept assignment
- decline assignment
- update delivery status
- submit proof of delivery

Required proof:

- assignment ownership
- delivery state machine enforcement
- PoD validation and media/storage boundary
- audit event for assignment and delivery transitions
- rollback or compensation behavior

Current status: `BLOCKED_NEEDS_EVIDENCE`

### Operations Control Panel

Required actions:

- list checkout intents
- list operator orders
- cancel operator order
- list dispatch assignments
- create assignment
- intervene in rescue, exception, or escalation flow

Required proof:

- operator role enforcement
- reason capture for destructive or blocking actions
- audit event
- rollback or compensation behavior
- frontend visibility rules by tab/section

Current status: `BLOCKED_NEEDS_EVIDENCE`

### System

Required actions:

- create derived order state
- emit or store order events
- integrate with notification, dispatch, finance, and audit systems

Required proof:

- backend service ownership
- idempotency and transaction behavior
- event/audit mapping
- WLT boundary when financial truth is involved

Current status: `BLOCKED_NEEDS_EVIDENCE`

## Audit And Rollback Required Events

- checkout intent created
- checkout intent canceled
- order created
- partner accepted order
- partner rejected order
- partner marked preparing
- partner marked ready
- operator canceled order
- dispatch assignment created
- captain accepted assignment
- captain declined assignment
- delivery status updated
- proof of delivery submitted
- operator rescue or escalation intervention

All listed events remain blockers until source evidence is inspected.
