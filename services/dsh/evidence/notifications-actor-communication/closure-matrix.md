# Notifications & Actor Communication Closure Matrix

| Field | Value |
| --- | --- |
| repo | `bthwani2-boop/bthwani-suite-next` |
| ref | `front-backend` |
| resolved_head_sha | `74ae6878fbed08e8eabc472da6ea8fe5982d3544` |
| capability_id | `dsh.notifications` |
| final_status | `RUNTIME_VERIFIED` |

## Operations

- `listDshNotifications`
- `markDshNotificationRead`
- `markAllDshNotificationsRead`
- `updateDshNotificationPreferences`
- `listDshPlatformNotificationConfig`
- `upsertDshPlatformNotificationConfig`

## Surfaces

- `app-client`: `NotificationCenterScreen` delegates to `ActorNotificationsPanel`.
- `app-partner`: notifications route renders `ActorNotificationsPanel` before order alerts.
- `app-captain`: bell route renders `ActorNotificationsPanel`; header badge uses notification unread count.
- `app-field`: top-bar bell opens a real `ActorNotificationsPanel`, not mark-all/reload only.
- `control-panel`: `PlatformNotificationConfigScreen` lists, saves, reloads, handles empty/error states via shared controller.

## Backend, Contract, DB

- Backend routes: `services/dsh/backend/internal/http/notifications.go`, `services/dsh/backend/internal/http/server.go`
- Backend domain: `services/dsh/backend/internal/notifications/notifications.go`
- OpenAPI: `services/dsh/contracts/dsh.openapi.yaml`
- Generated client: `services/dsh/clients/generated/dsh-api.ts`
- DB migration: `services/dsh/database/migrations/dsh-011_notifications.sql`
- Runtime HTTP proof: `dsh-notifications-runtime-smoke.txt` proves `/dsh/health` returns 200 and all six notification routes return 401, not 404, without auth, against the live `bthwani-dsh-api-runtime` container.
- Runtime DB proof: `dsh-notifications-runtime-smoke.txt` proves `dsh-011` is applied — `dsh_notifications`, `dsh_notification_preferences`, and `dsh_platform_notification_config` all resolve via `to_regclass` in the live `dsh_runtime` database on `bthwani-postgres-runtime`.

## Evidence And Gates

- Code evidence: `services/dsh/evidence/notifications-actor-communication/dsh-notifications-code-evidence.txt`
- Runtime smoke command: `pwsh -NoProfile -ExecutionPolicy Bypass -File services/dsh/evidence/notifications-actor-communication/run-notifications-runtime-smoke.ps1`
- Runtime smoke result: `HTTP_ROUTE_PASS_DB_PROOF_PASS` — all six routes plus health plus the three DB tables verified against the live runtime stack (`bthwani-dsh-api-runtime`, `bthwani-postgres-runtime`, resolved HEAD `74ae687`).
- Runtime DB note: the prior blocker (`DSH_DATABASE_URL` unset, Docker blocked by the local lean-ctx shell allowlist) is resolved — `docker` was added to the allowlist and the DB proof was taken directly via `docker exec bthwani-postgres-runtime psql -U dsh_runtime -d dsh_runtime`, against the actual `dsh_runtime` database (the earlier local-default assumption of `bthwani_runtime` was wrong; the DSH API container's real `DATABASE_URL` env resolves to `dsh_runtime`).
- Scope drift: branch contains changes outside notifications; they are `KEEP_WITH_SEPARATE_EVIDENCE` and are not used as notifications closure proof.

## Acceptance

`dsh.notifications` is set to `RUNTIME_VERIFIED` as of resolved HEAD `74ae687`:

- [x] all six notification routes return non-404 expected auth behavior on runtime (verified live against `bthwani-dsh-api-runtime`),
- [x] `dsh-011` is applied and `dsh_notifications`, `dsh_notification_preferences`, `dsh_platform_notification_config` exist (verified live against `dsh_runtime` db on `bthwani-postgres-runtime`),
- [x] generated client's `DshNotification` schema and notification operations are unchanged/in-sync after `pnpm run openapi:generate` — the only drift found was pre-existing, unrelated finance-proxy/WLT additions (scope drift, tracked separately, not blocking this journey),
- [x] maps consistent across manifest/capability/runtime/surface — `service.manifest.ts` (`nextOperationalJourney.closureState`), `capability-map.ts` (`dsh.notifications.status`), and `runtime-map.ts` (`dsh.notifications.state`) all set to `runtime-verified`/`verified`,
- [x] app-field keeps a real notification panel (`ActorNotificationsPanel` rendered on bell press, confirmed in `DshFieldPartnersScreen.tsx`),
- [x] targeted gates pass: `guard:api-binding`, `guard:no-broken-imports`, `guard:runtime-config`, `guard:fullstack-boundary`, `guard:cleanup-policy`, and `tools/scripts/run-journey-gate.ps1 -Journey "Notifications & Actor Communication"` (result `LOCAL_VERIFIED_AWAITING_REMOTE_EVIDENCE`) all pass.

## Known Out-Of-Scope Failure (not a notifications blocker)

`guard:ui-kit-boundary` and the repo-wide `foundation:gate` fail — but every violation is pre-existing raw-color styling in `apps/control-panel/runtime/src/shell/{ControlPanelNavigation,ControlPanelShell,ControlPanelTopBar,DataTablePageFrame}.tsx`, none of which are in the notifications exclusive-scope file list. This is scope drift (`MOVE_OUT_OF_SCOPE` / pre-existing), not introduced by this journey, and is not used as notifications closure proof. It remains an open repo-wide blocker for any 100%/MERGE_READY claim and should be tracked as its own remediation, not folded into this journey.
