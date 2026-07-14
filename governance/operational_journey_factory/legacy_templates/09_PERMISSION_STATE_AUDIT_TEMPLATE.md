# Permission State Audit Template

<!-- markdownlint-disable MD060 -->

Every actor/action/state combination must be explicit and backed by backend enforcement and frontend visibility evidence.

| Field | Required value |
|---|---|
| actor | Client, partner, captain, field, operations, support, admin, system, provider |
| action | UI or API action |
| permission | Permission name or policy owner |
| allowed state | State where the action is allowed |
| forbidden state | State where the action must be hidden, disabled, or rejected |
| backend enforcement | Middleware, policy, validation, or service guard |
| frontend visibility | Screen, section, tab, button, icon, or message behavior |
| audit event | Audit event or justified exclusion |
| rollback path | Rollback, retry, compensation, or external blocker |
| blocked state | User-visible blocked behavior and reason |
| error mapping | Backend error to frontend state |
| verification command | Smallest command proving the matrix |
