# U005 — visit-checklist-verification

## Current-BB diagnosis

Current DSH governed handlers already enforce worker/store scope and visit-completion prerequisites, and U005 has historical implementation evidence. Treat this as state-machine re-verification. Prove assigned-worker only, valid location/evidence, required checklist completion, idempotent retry, rejection of skipped/out-of-order transitions, refresh/restart persistence and consistent readiness readback to operator/partner. Mobile UI must not be the only place enforcing completion rules. Any reproduced defect belongs in the authoritative DSH handler/state model or shared field adapter, with database-backed regression coverage when persistence or concurrency matters.

Do not add a second visit state, client-only authorization, or unrelated operational analytics. If current behavior already satisfies Product Truth, record current-candidate evidence and leave product code unchanged.
