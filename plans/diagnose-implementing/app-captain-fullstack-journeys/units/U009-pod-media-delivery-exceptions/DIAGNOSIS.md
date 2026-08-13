# U009 — pod-media-delivery-exceptions

Proof of Delivery is a separate closure boundary from tracking. The Captain flow captures media, submits proof through governed shared controllers and then fetches canonical DSH proof state. Delivery completion must follow accepted proof state, not a local upload response or toast. Pending/submitted, pending review, rejected and accepted states need explicit handling, including restart and retry.

Media must be bound to the active order/assignment/current Captain, have controlled content/type/size handling, and never allow a media key from another actor/order to satisfy proof. Duplicate submissions and uncertain network outcomes require idempotent/recoverable semantics. Reassignment or cancellation invalidates stale proof authority. Camera/media permissions must fail safely and the application must not invent an accepted state when upload/readback is unavailable.

Delivery exceptions are also server-owned. The current local store-courier mode can suppress exception presentation, which U005 must remove as an authority decision. This unit proves exception reason/evidence authorization, operator rescue/readback and cross-surface outcome without letting client/partner/control-panel mutate Captain proof outside their defined roles.

## Closure boundary

DSH owns delivery proof/exception state; media storage is evidence transport and app-captain cannot self-declare delivery success. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.
