# Security and Privacy Policy

Status: ACTIVE_CANONICAL

## Identity and authorization

- Authentication proves identity; authorization separately enforces permission, trusted context, business scope, and object ownership.
- Every protected read/write is authorized server-side. UI visibility is never authorization.
- Trusted operator/platform context comes from authenticated server-side context and cannot be supplied or overridden by client input.
- Partner/store/customer/captain/field boundaries are enforced by the owning backend and, where appropriate, durable data constraints.

## Sessions and credentials

- Passwords, OTP/activation codes, tokens, signing keys, service credentials, and provider secrets are never logged or stored in plaintext outside their approved store.
- Session/refresh/revocation/activation behavior is explicit and replay-safe where required.
- Administrative/support access remains scoped and auditable.

## Service and provider security

- Privileged service-to-service operations use explicit authentication and least privilege.
- Provider webhooks use signature verification, replay/timestamp protection, schema/body limits, and stable event identity.
- Client/mobile/web bundles contain no server secret or privileged provider credential.
- Missing trusted context, permission, secret, signature, provider identity, or security-critical configuration fails closed.

## Privacy

- Collect only data required by current product/contracts.
- Restrict access by purpose, actor, and scope; redact data not required by a consumer.
- Logs, traces, analytics, support artifacts, screenshots, and test evidence avoid unnecessary PII, precise location history, document contents, financial payloads, tokens, and credentials.
- Use opaque IDs/correlation IDs when sufficient.

## Financial security

- WLT is the sole authoritative financial-truth owner.
- Financial mutations require authenticated server-side context, idempotency/correlation, legal state transition, and owner-side validation.
- Payout destinations/beneficiaries and other sensitive financial execution data are verified/versioned before use; material changes require renewed validation rather than silent trust transfer.
- Full financial identifiers are protected in storage and masked by default; unmasked access/export is restricted and auditable.
- Manual files/screenshots/operator assertions may support investigation but cannot directly mutate or establish authoritative wallet/ledger truth.
- Reconciliation mismatch or unknown external mutation outcome remains unresolved/fail-closed until the owning system can prove the result.

## Dependency and CI security

- Required dependencies/actions are pinned/locked according to the executable repository configuration.
- Generated artifacts retain provenance to their canonical source.
- Critical authentication/authorization bypass, secret exposure, cross-scope access, isolation failure, or material financial-security failure blocks the affected outcome until fixed or explicitly left unresolved by the current human authority.

## Evidence

Run only security checks relevant to the affected code cone. Static security checks prove what they test; runtime auth/session/isolation/provider claims require targeted runtime/integration evidence. Do not create security approval registries or governance gates as substitutes for actual security evidence.
