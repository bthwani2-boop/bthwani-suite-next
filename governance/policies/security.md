# Security and Privacy Policy

Status: ACTIVE_CANONICAL

Never commit real credentials, tokens, keys, certificates, payment secrets,
provider secrets, or unredacted private data. Examples use nonfunctional
placeholders only. Runtime fails closed when sensitive configuration is absent,
and logs omit secrets, tokens, payment data, unnecessary PII, and private media.

Identity owns authentication, sessions, and actor identity. Services own
object-level authorization for their resources. Platform context is derived from
trusted identity or authenticated server delegation; a client cannot choose or
override it. Partner organization and store are not tenants.

Authentication, authorization, privacy, isolation, WLT finance, uploads,
providers, infrastructure, and CI changes require applicable threat boundaries,
negative tests, secret scanning, dependency review, and same-commit independent
security evidence. Security failures remain fail-closed as `SECURITY_BLOCK`.
