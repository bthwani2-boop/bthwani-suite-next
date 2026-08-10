# U005 — tracking-proof-support-resilience

## Objective

Close Captain active-delivery tracking, PoD, support/rescue and recovery on current `BB` without creating local operational truth, leaking protected data, or adding speculative background behavior.

## Current diagnosis

The existing unit boundary remains correct, but current source reveals a sharper root-cause question than the old generic wording. `DshCaptainRouteRenderer` currently handles route `orderchat` by displaying that order messaging is not enabled. Separately, `CaptainSupportScreenRouter` handles `chat-read-ack` and `chat-send` using the real `CaptainOrderSupportConversationScreen`. That can represent an intentional legacy/dead route, or an actual parallel navigation path. The implementation unit must determine route ownership from current route registry/navigation/Product Truth and converge all live Captain support entry points on one governed support conversation path. It must not “fix” the warning text while leaving two behavioral paths.

Support/rescue Product Truth remains `DISCOVERY`: Captain may communicate only for an assigned order, internal notes are operator-only, rescue mutations are operator-owned, expected-state/idempotency/audit rules apply, and DSH rescue must not mutate WLT.

Location and PoD also remain evidence-sensitive. Current code can be statically mapped, but legal status progression, pending-location recovery, assignment scope, media proof binding, weak-network unknown-result handling, refresh/restart and physical-device permission behavior need candidate-bound verification. Foreground-only tracking is not a defect merely because background tracking is absent; background behavior may be changed only if current Product Truth explicitly requires it.

## Root-cause targets

1. One canonical Captain support/chat route and state owner; obsolete route aliases are removed or delegated only after navigation/readback proof.
2. No Captain can open/read another or unassigned order support conversation.
3. No internal operator note leaks to Captain.
4. No stale retry or unknown result fabricates status, PoD, exception, message, incident, rescue or delivery success.
5. Location/PoD remain assignment-scoped and privacy bounded.
6. Client/partner/operator readbacks consume canonical DSH state; WLT remains untouched by operational rescue.

## Closure rule

Typecheck/static mapping is insufficient for location/camera/push/weak-network/restart claims. U005 must execute current app-captain runtime tests, affected DSH backend tests and route/readback checks, then record any required physical-device evidence on the exact resulting SHA.
