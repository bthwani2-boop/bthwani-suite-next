# Runtime Docker Env Template

<!-- markdownlint-disable MD060 -->

Runtime evidence is required only when a journey changes or claims runtime behavior. Without runtime smoke, no live-readiness claim is allowed.

| Field | Required value |
|---|---|
| docker compose | Compose file, profile, and service owner |
| profiles | DSH, WLT, identity, media, mail, cache, observability, or provider profile |
| service names | Backend, database, frontend, worker, or provider service |
| ports | Approved BThwani ports only |
| volumes | Volume purpose and data risk |
| networks | Network and service dependency |
| env vars | Safe references only, no frontend secrets |
| database health | Health command and migration state |
| backend boot | Boot command and health endpoint |
| frontend boot | Surface command and URL |
| API base URL | Runtime source and actor surface |
| adb/reverse/mobile runtime | Required for mobile surfaces when relevant |
| smoke command | Smallest runtime smoke command |
| runtime evidence | Current HEAD evidence path outside committed raw diagnostics |
| stale evidence check | SHA, timestamp, and command freshness |
