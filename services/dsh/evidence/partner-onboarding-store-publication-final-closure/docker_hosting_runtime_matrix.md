# docker_hosting_runtime_matrix

resolved_commit_sha: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

```yaml
docker_hosting_runtime_matrix:
  docker:
    affected: true
    compose_files: [infra/docker/compose.runtime.yml]
    dockerfiles: [services/dsh/backend/Dockerfile]
    services: [postgres, identity-api, dsh-api, minio]
    ports:
      dsh-api: "58080:8080 (host:container)"
      identity-api: "58082:8082"
      postgres: "55432:5432"
      minio: "59000:9000, 59001:9001"
    volumes: postgres data volume (compose-managed)
    networks: [bthwani-runtime]
    env_files: [infra/docker/env/runtime.env.example]
    healthchecks: wget /dsh/health, /identity/health, minio /minio/health/live (compose healthcheck blocks)
    verification_command: docker ps --format "{{.Names}} {{.Ports}}"
    note: >
      Stale-image defect found and fixed during closure: the cached dsh-api image predated
      commit f3168d9 (PATCH /dsh/field/partners/{id}/store returned 404 while GET worked).
      Image rebuilt from source (docker compose build dsh-api) and the full E2E re-run PASS.
  database_container:
    affected: true
    image: postgres (compose runtime)
    port_mapping: "55432:5432"
    migration_command: pnpm run runtime:migrate (applies services/dsh/database/migrations/*.sql incl. dsh-015, dsh-016) — EXIT=0
    seed_command: pnpm run runtime:seed (services/dsh/database/seeds/local incl. dsh-015_partner_lifecycle.local.sql) — EXIT=0
    health_status_command: pnpm run runtime:status — EXIT=0
  backend_container_or_process:
    affected: true
    boot_command: pnpm run runtime:up (identity started first, then dsh-api) — EXIT=0
    env_required: [DATABASE_URL, DSH_AUTH_MODE=identity-required-for-protected-store-actions, DSH_IDENTITY_BASE_URL]
    health_endpoint: GET /dsh/health → healthy; GET /dsh/readiness → ready (postgres ready)
    smoke_command: pnpm run runtime:smoke — PASS incl. "Partner Onboarding & Store Publication partner lifecycle smoke: PASS" (dsh-runtime-smoke.txt)
  frontend_runtime:
    affected: true (surfaces consume DSH API via PlatformVarsRegistry dshApiBaseUrl binding)
    surface: app-field/app-partner/app-client/control-panel (apps/*/runtime)
    boot_command: pnpm run build (all runtimes) — EXIT=0
    env_required: EXPO_PUBLIC_DSH_API_BASE_URL / platform vars resolved in shared _kernel (not in screens)
    port: canonical host ports only (app-client 18101, app-partner 18102, app-captain 18103, app-field 18104, control-panel 13000) — enforced by guard:canonical-host-ports PASS
    api_base_url_binding: services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts (shared, not surfaces)
  hosting_or_deployment:
    affected: false
    reason: journey closes on local docker runtime; no hosting target defined in repo for DSH beyond compose runtime
    verification_command: rg -n "deploy" package.json (no dsh deployment scripts)
  forbidden_host_ports_check:
    forbidden: [8080, 8081, 8082, 8083, 8084, 3000]
    result: PASS — these appear only as container-internal ports (documented in SERVICE_BLUEPRINT "container internal") and inside guard definitions; host-facing bindings are 58080/58082/55432/59000/13000/1810x only
    verification_command: pnpm run guard:canonical-host-ports
```
