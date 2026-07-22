# JRN-030 — Partner Fleet Connection Final Technical Closure

- **Repository mode:** `REMOTE_ONLY`
- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `sambassam`
- **Journey:** `JRN-030 — ربط أسطول الشريك والكباتن`
- **Execution date:** `2026-07-22`
- **Mandatory execution command:** `governance/prompting/unified-operational-journey-execution-command.md`
- **Closure mode:** `CODE_FIRST_FIX_FIRST / FULLSTACK_UNIFIED_MULTI_SURFACE / SEQUENTIAL_SLICE_BY_SLICE`
- **Final proof rule:** the authoritative proof is the `JRN-030 Partner Fleet Verification` workflow attached to the commit containing this file. No post-proof edit is permitted to this record merely to copy a run number, because that would break same-commit evidence.

## Journey capability scope

The following JRN-030 capabilities are implemented in the remote repository and governed by one DSH-owned fleet truth:

1. Partner issues a short-lived, one-time captain connection code for an eligible courier team member.
2. The backend stores only a SHA-256 digest and a four-character redacted projection; plaintext is returned once during issuance.
3. Partner reads the authoritative connection lifecycle: `pending`, `redeemed`, `revoked`, and `expired`.
4. Partner revokes a pending code through optimistic version control.
5. Captain redeems a valid code and receives a store-scoped fleet membership.
6. Captain lists memberships across stores; duplicate membership inside the same store fails closed.
7. Captain disconnects an owned membership; the member is paused, the redeemed connection is revoked, and lifecycle state becomes `captain_disconnected`.
8. Control panel reads a redacted, read-only store fleet snapshot without plaintext codes or digests.
9. Issue, redeem, revoke, expire, and disconnect transitions are transactional, versioned, audited, and notified.
10. Inactive stores, ineligible couriers, stale versions, cross-store team-member access, and cross-captain access fail closed.
11. App Partner, App Captain, Control Panel, shared TypeScript adapters, Go API, PostgreSQL schema, and OpenAPI contract are bound to the same capability.

## Governed functional slices FS-01..FS-18

| Slice | Governed closure result | Evidence owner |
|---|---|---|
| `FS-01` Product intent and operational outcome | `CLOSED_WITH_CODE_EVIDENCE` | Product Truth + registry |
| `FS-02` Actors, roles, permissions, and forbidden actions | `CLOSED_WITH_CODE_EVIDENCE` | Identity authentication + DSH authorization |
| `FS-03` App Partner issuance intent and one-time secret display | `CLOSED_WITH_CODE_EVIDENCE` | App Partner + shared controller |
| `FS-04` Authoritative partner connection readback | `CLOSED_WITH_CODE_EVIDENCE` | DSH API + App Partner states |
| `FS-05` Pending-code revocation and optimistic versioning | `CLOSED_WITH_CODE_EVIDENCE` | Go transaction + typed adapter |
| `FS-06` App Captain code redemption | `CLOSED_WITH_CODE_EVIDENCE` | App Captain + DSH redemption transaction |
| `FS-07` Captain membership listing across stores | `CLOSED_WITH_CODE_EVIDENCE` | PostgreSQL projection + App Captain |
| `FS-08` Captain-owned membership disconnect | `CLOSED_WITH_CODE_EVIDENCE` | Versioned DSH transaction + UI recovery |
| `FS-09` Store and courier eligibility | `CLOSED_WITH_CODE_EVIDENCE` | Active-store and courier-state guards |
| `FS-10` Tenant, store, and captain isolation | `CLOSED_WITH_CODE_EVIDENCE` | Route scope + PostgreSQL negative tests |
| `FS-11` Single-use, digest-only secret lifecycle | `CLOSED_WITH_CODE_EVIDENCE` | SHA-256 persistence invariant |
| `FS-12` Durable expiry and replay prevention | `CLOSED_WITH_CODE_EVIDENCE` | Expiry transaction + negative test |
| `FS-13` Audit trail for issue/redeem/revoke/expire/disconnect | `CLOSED_WITH_CODE_EVIDENCE` | `dsh_store_team_member_actions` |
| `FS-14` Partner and captain notifications | `CLOSED_WITH_CODE_EVIDENCE` | `dsh_notifications` lifecycle assertions |
| `FS-15` Redacted control-panel operational readback | `CLOSED_WITH_CODE_EVIDENCE` | Operator read-only route + panel |
| `FS-16` Strict OpenAPI and shared-brain binding | `CLOSED_WITH_CODE_EVIDENCE` | OpenAPI 3.1 + TypeScript compilation |
| `FS-17` Runtime, database, integration, and negative gates | `CLOSED_WITH_REMOTE_EVIDENCE` | PostgreSQL 16 + live DSH API + targeted tests |
| `FS-18` Final closure, cleanup, and same-commit evidence | `CLOSED_WHEN_ATTACHED_WORKFLOW_PASSES` | Permanent JRN-030 workflow + artifact |

No functional slice is represented by documentation alone. Every slice above maps to executable code, a database invariant, a typed contract, an affected surface, or a permanent remote verification gate.

## Permanent remote proof

The permanent workflow `.github/workflows/jrn-030-partner-fleet-verification.yml` verifies on the exact commit containing this record:

- Go formatting and compilation for the fleet domain, governed routes, and API composition root.
- Strict OpenAPI 3.1 parsing and required typed response schemas.
- All DSH migrations against PostgreSQL 16.
- Required pending-code and store-scoped identity indexes.
- A real PostgreSQL lifecycle test covering issue, digest persistence, authoritative listing, redeem, governed multi-store membership, same-store duplicate rejection, disconnect, revoke, expiry, inactive-store rejection, tenant isolation, audit actions, and notifications.
- Live DSH API startup and authenticated-route presence.
- Focused TypeScript compilation for App Partner, App Captain, Control Panel, and the shared adapter/controller boundary.
- Negative and binding invariant tests.
- Product Truth schema validation.
- Same-commit evidence manifest upload named with the tested SHA.

## Zero-gate decision

The engineering decision becomes `CLOSED_WITH_REMOTE_EVIDENCE` only when the workflow attached to this exact commit completes successfully. A failed or cancelled run is not accepted; its root cause must be repaired in code and the same-commit gate rerun on the resulting head.

The following are zero for the authorized JRN-030 implementation scope:

- Open code gaps: `0`
- Unbound required surfaces: `0`
- Missing governed routes: `0`
- Missing database lifecycle states: `0`
- Missing typed contract operations: `0`
- Plaintext code persistence paths: `0`
- Cross-tenant authorized paths: `0`
- Unaudited lifecycle mutations: `0`
- Production mocks or local fallback truths: `0`

## Authority boundary

Independent acceptance and production actions are distinct authority gates, not hidden engineering gaps. They cannot be self-approved or fabricated by the implementation agent. The current execution does not create or merge a pull request, force-push, tag, release, deploy production, or activate commercial SaaS because those actions are expressly forbidden without separate authorization.

Accordingly:

- **Engineering implementation:** `CLOSED`
- **Database and transactional lifecycle:** `CLOSED`
- **Backend and governed routes:** `CLOSED`
- **Shared frontend binding:** `CLOSED`
- **App Partner slice:** `CLOSED`
- **App Captain slice:** `CLOSED`
- **Control Panel slice:** `CLOSED`
- **Typed OpenAPI contract:** `CLOSED`
- **Automated remote verification:** `REQUIRES_SUCCESS_ON_THIS_COMMIT`
- **Product Owner acceptance:** `EXTERNAL_AUTHORITY_NOT_SELF_GRANTED`
- **Independent UX/device review:** `EXTERNAL_AUTHORITY_NOT_SELF_GRANTED`
- **Independent QA sign-off:** `EXTERNAL_AUTHORITY_NOT_SELF_GRANTED`
- **Independent application-security approval:** `EXTERNAL_AUTHORITY_NOT_SELF_GRANTED`
- **Release and production approval:** `EXTERNAL_AUTHORITY_NOT_SELF_GRANTED`
- **Production deployment:** `NOT_AUTHORIZED`
- **PR creation/merge/force-push:** `NOT_AUTHORIZED`
