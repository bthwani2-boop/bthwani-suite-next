# UI Actions Icons States

status: `DISCOVERY_PACKAGE_ONLY`

## Required UI Inventory

Before execution, every UI item in the journey must be listed and classified:

- buttons
- icons
- CTAs
- nav items
- tabs
- lists
- tables
- cards
- dialogs
- forms
- disabled states
- loading indicators
- empty states
- error states
- success states
- blocked states
- retry states
- offline states

## Client Required Actions And States

Actions requiring proof:

- add/remove/update cart item
- validate serviceability
- create checkout intent
- cancel checkout intent
- create order
- view order list
- view tracking
- retry failed checkout/order creation

States requiring proof:

- cart empty
- checkout loading
- checkout failed
- payment decision blocked
- order created
- order canceled
- order tracking unavailable
- offline/retry

Current status:

- `BLOCKED_NEEDS_EVIDENCE` until screen-level handlers, icons, and state branches are inspected.

## Partner Required Actions And States

Actions requiring proof:

- view inbox
- accept order
- reject order
- mark preparing
- mark ready for pickup
- open conversation
- handle issue or alert

States requiring proof:

- no orders
- new order
- accepted
- rejected
- preparing
- ready for pickup
- blocked by permission
- retry/offline

Current status:

- `BLOCKED_NEEDS_EVIDENCE` until action panels, rejection screen, alert panel, and issue panel are inspected.

## Captain Required Actions And States

Actions requiring proof:

- view assignment inbox
- accept assignment
- decline assignment
- update delivery status
- open pickup/dropoff detail
- submit proof of delivery

States requiring proof:

- no assignment
- pending assignment
- accepted
- declined
- picked up
- delivered
- PoD submitted
- blocked/retry/offline

Current status:

- `BLOCKED_NEEDS_EVIDENCE` until captain order sections and PoD screen are inspected.

## Control Panel Required Actions And States

Actions requiring proof:

- view checkout activity
- view live orders
- view order queue
- rescue order
- cancel operator order
- assign dispatch
- view captain operations
- manage exceptions/escalations

States requiring proof:

- empty queue
- degraded queue
- blocked intervention
- assignment conflict
- cancellation pending
- escalation open
- retry/offline

Current status:

- `BLOCKED_NEEDS_EVIDENCE` until control-panel operation screens and decision handlers are inspected.

## Icon And Accessibility Rule

Every journey icon must have:

- source component/import
- semantic meaning
- handler or read-only reason
- accessibility label or justified exclusion
- permission/state visibility proof
