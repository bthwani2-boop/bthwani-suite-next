# Security and Privacy Policy

Status: ACTIVE_CANONICAL

## 1. Scope

This policy governs authentication, authorization, object/business scope, trusted context, sessions, secrets, privacy, PII, audit safety, service authentication, provider credentials, vulnerability handling, and security evidence across all surfaces/services.

## 2. Identity and authorization

- Authentication proves actor identity; authorization separately proves role, permission, trusted context, business scope and object ownership for the requested operation.
- Server-side authorization is required for every protected read/write. UI visibility is not authorization.
- Trusted platform/operator context is derived from authenticated/server-side context and cannot be selected or overridden by client-controlled input.
- Partner/store/customer/captain/field scope is enforced at the owning backend and database/domain boundary where appropriate.
- Cross-scope identifiers must not disclose restricted existence/details when the current contract requires scoped not-found behavior.

## 3. Sessions and credentials

- Passwords, OTP/activation codes, refresh/access tokens, service credentials, signing keys and provider secrets are never logged or stored in plaintext outside their approved credential store.
- Activation/session/refresh/revocation semantics are explicit, bounded, single-use/rotation-safe where required, and tested for replay after logout/revocation/deactivation.
- Support/administrative access does not bypass normal trust boundaries and is auditable.

## 4. Service-to-service and provider security

- Internal privileged operations use explicit service authentication and least privilege.
- Provider webhooks use signature verification, replay/timestamp protection, body/schema limits and stable event identity.
- Secret rotation follows an approved overlap/cutover model without weakening verification.
- Client/mobile/web bundles contain no server secret or privileged provider credential.

## 5. Privacy and PII

- Collect only data required by current Product Truth/contract.
- Restrict access by purpose, actor and scope; redact data not required by a consumer.
- Retention/deletion/anonymization follows the active retention policy and legal/product obligations.
- Logs, traces, analytics, incidents, support tickets, screenshots and evidence must avoid unnecessary names, phones, addresses, precise location history, document contents, financial payloads, tokens and credentials.
- Use stable opaque IDs/correlation IDs for diagnostics wherever sufficient.

## 6. Financial/security boundary

- WLT is the sole authoritative financial-truth owner.
- No surface or DSH recovery/support path may directly mutate WLT ledger/balance/refund/settlement truth outside an explicitly governed WLT operation.
- Financial mutations require authenticated server-side context, idempotency/correlation, legal state transition and finance controls appropriate to the operation.

## 7. Secure failure behavior

- Missing/invalid trusted context, permission, required secret, signature, provider identity or security-critical configuration fails closed.
- Unknown external mutation outcome remains unresolved/reconcilable; it is never converted to local success.
- Error responses/logs must not leak secrets, raw stack internals, restricted scope data or sensitive provider payloads.

## 8. Dependency and supply-chain security

- Dependencies/actions/tool versions used in governed CI are pinned/locked according to repository policy.
- Dynamic tool downloads are not used inside required fail-closed verification where a pinned repository dependency/tool is required.
- Generated artifacts retain provenance to canonical source contracts/configuration.
- Critical/high vulnerabilities, compromised credentials, signature bypass, isolation failure or cross-scope access are protected security/risk domains and cannot be waived by the implementation agent.

## 9. Evidence and approvals

Static security guards prove only their registered assurance. Runtime auth/isolation/provider/secret claims require targeted runtime/integration evidence. Security approval and acceptance of critical/high vulnerability or residual security risk remain protected approval domains under the current authority registry.
