# Tenant Hostname and TLS Policy

Status: ACTIVE_CANONICAL_POLICY / IMPLEMENTATION_DEFERRED

Machine-readable SaaS state: `governance/saas/saas-governance.json`

Conditional execution gates: `governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md`

Future infrastructure registry: `infra/FUTURE_RUNTIME_CAPABILITIES.md`

## 1. Purpose and Current Boundary

This policy defines how BThwani may later expose tenant-specific web hostnames with HTTPS without activating that capability now.

Current decision:

```yaml
capability: tenant_hostnames_and_managed_tls
implementation_state: DEFERRED
runtime_activation: FORBIDDEN_BY_THIS_DOCUMENT
production_deployment_authorized: false
saas_readiness_mode: SAAS_READY_DEFERRED
canonical_decision: NEEDS_EVIDENCE
```

This document is governance and architecture intent only. It does not create DNS records, certificates, ingress rules, tenant routing, self-service signup, custom domains, or production readiness evidence.

## 2. BThwani Tenancy URL Decision

BThwani distinguishes three URL models. They are not interchangeable.

### 2.1 Path-based tenancy

Example:

```text
https://platform.example/tenant/acme
```

Permitted later for internal operator tools, migration compatibility, support workflows, or a controlled fallback. It is not the preferred public identity for a tenant storefront or branded tenant portal.

A path segment is only a selector. It never becomes tenant authority by itself.

### 2.2 First-party tenant subdomains

Preferred future public model for platform-owned tenant hostnames:

```text
https://{tenantSlug}.{TENANT_BASE_DOMAIN}
```

Example only:

```text
https://acme.tenants.example
```

The concrete production domain is configuration owned by infrastructure governance and must not be hard-coded in application code or documentation examples.

### 2.3 Customer-owned custom domains

Future optional model:

```text
https://shop.customer-domain.example
```

This is a separate commercial capability. A wildcard certificate for the BThwani base domain does not cover a customer-owned domain. Customer-owned domains require ownership validation, managed certificate issuance, lifecycle monitoring, and explicit Product Truth, security, legal, support, and commercial approval.

## 3. Tenant Identity Is Not Derived from DNS Alone

A valid hostname routes a request; it does not prove authorization or data ownership.

The trusted resolution chain must be:

```text
request host
  -> edge and ingress hostname validation
  -> normalized exact hostname lookup
  -> active tenant-domain binding
  -> trusted server-side tenant context
  -> identity, permission, and object-ownership enforcement
```

Required invariants:

- Never trust a client-supplied `tenantId`, path segment, header, query parameter, or hostname as final authority.
- Resolve the hostname to an internal immutable `tenant_id` through an exact server-side binding.
- Bind authenticated sessions and delegated operator access to the same trusted tenant context.
- Reject unknown, unverified, disabled, suspended, expired, or ambiguous hostnames fail-closed.
- Never fall back from an unknown hostname to another tenant, a default tenant, sample data, or global data.
- Tenant context must propagate into DSH, WLT, identity, workforce, platform-control, providers, caches, queues, outbox events, audit events, media, idempotency keys, and observability whenever the resource is tenant-owned.
- A hostname mapping does not replace cross-tenant negative tests or object-level authorization.

## 4. Canonical Hostname Normalization

Before lookup, the server-side resolver must:

1. use the effective host supplied only by a trusted proxy chain;
2. reject untrusted forwarding headers;
3. remove an allowed port suffix;
4. lowercase the hostname;
5. remove one terminal dot;
6. convert internationalized names to canonical ASCII/Punycode;
7. enforce DNS label and total hostname length limits;
8. reject control characters, whitespace, slashes, encoded separators, wildcard characters, and malformed labels;
9. perform an exact lookup against the normalized stored hostname.

For the first release, tenant-selected slugs must be ASCII only:

```text
^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$
```

Additional first-release rules:

- minimum length: 3;
- maximum label length: 63;
- lowercase storage and comparison;
- no leading or trailing hyphen;
- no consecutive hyphens unless explicitly required by a future IDN policy;
- uniqueness is case-insensitive and global within the tenant base domain;
- display names may remain Arabic or multilingual and are independent from the DNS slug.

## 5. Reserved and Protected Labels

Tenant registration must deny reserved labels before persistence and again before activation.

The authoritative reserved-label registry must be machine-readable before implementation. At minimum it must protect:

```text
www
api
admin
control
console
auth
identity
login
logout
signup
register
account
accounts
billing
pay
payment
payments
wallet
wlt
dsh
partner
captain
field
client
operator
ops
support
help
docs
status
health
metrics
cdn
assets
static
media
files
uploads
download
mail
smtp
imap
pop
autodiscover
ftp
ssh
vpn
ns1
ns2
mx
dev
development
test
testing
stage
staging
preview
internal
localhost
root
system
security
abuse
postmaster
webmaster
```

The future registry must also block:

- current and planned service names;
- common infrastructure and protocol labels;
- trademarks and BThwani brand variants;
- offensive, deceptive, impersonating, phishing-like, or security-sensitive labels;
- labels visually confusable with protected labels;
- any exact hostname already used by platform infrastructure.

A released tenant slug must enter a configurable quarantine period before reuse to reduce takeover, stale-link, cookie, cache, and search-index risks.

## 6. First-Party Wildcard DNS and TLS Architecture

The preferred future architecture for platform-owned tenant subdomains is:

```text
browser
  -> HTTPS edge certificate
  -> proxied wildcard DNS
  -> Cloudflare or approved edge
  -> HTTPS origin connection
  -> approved ingress/reverse proxy
  -> tenant-aware application resolver
```

Required controls:

### 6.1 DNS

- Create a proxied wildcard DNS record only for the dedicated tenant base domain.
- Use exact DNS records for platform services; exact records take precedence over wildcard routing.
- Do not point wildcard DNS directly at databases, object-store consoles, administrative ports, or internal services.
- Do not use wildcard DNS as evidence that a tenant exists.
- Separate production, staging, preview, and local-development namespaces.

### 6.2 Edge certificate

- The edge must present a publicly trusted certificate for visitor traffic.
- Certificate coverage must explicitly include the required apex and wildcard names; `*.example` does not automatically cover the apex.
- Certificate wildcard coverage must not be assumed for arbitrary deeper labels.
- Minimum TLS version, cipher policy, HSTS, and certificate transparency monitoring are security-owned settings.

### 6.3 Origin certificate

The origin may use either:

1. a publicly trusted certificate; or
2. an approved Cloudflare Origin CA certificate when all traffic is guaranteed to remain proxied through Cloudflare.

An Origin CA certificate is not a browser-facing certificate and must not be treated as publicly trusted for direct client-to-origin access.

If Origin CA is selected:

- include the exact tenant base domain and its required wildcard SAN;
- store the private key only in an approved secret store;
- never commit certificate or key material;
- inventory issuer, SANs, serial, owner, environment, creation date, expiry date, and rotation owner;
- monitor expiry explicitly;
- treat long validity as an operational option, not a reason to omit rotation or compromise response;
- revoke and replace on suspected exposure.

### 6.4 Cloudflare encryption mode

Production traffic must use `Full (strict)` or a stronger approved mode after the origin presents a valid matching certificate.

Forbidden production steady states:

```text
Off
Flexible
Full without certificate validation
```

A temporary setup sequence may prepare the origin before switching to `Full (strict)`, but no production-readiness claim or tenant activation may occur until strict validation is enabled and verified.

### 6.5 Origin bypass prevention

`Full (strict)` validates the origin certificate but does not by itself prove that every request reached the origin through the approved edge.

Before production activation, at least one approved origin-protection design is required:

- Authenticated Origin Pulls with an account-controlled certificate;
- Cloudflare Tunnel or equivalent private ingress;
- firewall allowlisting combined with maintained provider network ranges;
- another architecture-approved mTLS or private-network control.

The origin must not expose an alternate public HTTP path that bypasses WAF, rate limiting, hostname validation, or tenant routing.

## 7. Customer-Owned Custom Domain Governance

Customer-owned domains remain independently deferred.

Required future onboarding flow:

```text
REQUESTED
  -> OWNERSHIP_PENDING
  -> OWNERSHIP_VERIFIED
  -> DNS_PENDING
  -> TLS_PENDING
  -> ROUTING_VERIFICATION
  -> ACTIVE
```

Possible terminal or non-active states:

```text
REJECTED
FAILED
SUSPENDED
DISABLED
REVOKED
EXPIRED
RELEASED
QUARANTINED
```

Activation requires all of the following:

- the tenant is active and authorized for the capability;
- the exact hostname is globally unique in BThwani;
- ownership is verified using an approved DNS or HTTP challenge;
- certificate issuance and deployment are active;
- DNS points to the approved SaaS target;
- routing resolves to the expected tenant;
- negative cross-tenant routing tests pass;
- CAA and certificate-authority constraints are satisfied;
- no conflicting platform or tenant hostname exists;
- audit evidence records who requested, verified, approved, activated, disabled, and released the domain.

Cloudflare for SaaS or an architecture-approved managed ACME design may be evaluated later. The provider choice must remain replaceable behind a platform-owned domain lifecycle contract.

## 8. Required Future Data Contract

A future domain registry must be server-owned and auditable. Minimum conceptual fields:

```yaml
tenant_domain:
  id: immutable identifier
  tenant_id: immutable trusted tenant reference
  hostname_ascii: unique normalized hostname
  hostname_display: optional display form
  domain_type: FIRST_PARTY_SUBDOMAIN | CUSTOMER_CUSTOM_DOMAIN
  status: lifecycle state
  is_primary: boolean
  verification_method: NONE | DNS_TXT | DNS_CNAME | HTTP
  verification_status: state
  dns_status: state
  tls_status: state
  provider: provider identifier
  provider_reference: secret-free external reference
  requested_by: actor reference
  approved_by: actor reference
  activated_at: timestamp
  disabled_at: timestamp
  released_at: timestamp
  quarantine_until: timestamp
  last_verified_at: timestamp
  created_at: timestamp
  updated_at: timestamp
```

Constraints:

- exact unique index on normalized hostname;
- no more than one primary hostname per tenant and domain type unless Product Truth explicitly allows it;
- immutable audit trail for lifecycle changes;
- secrets, private keys, and challenge credentials are references only and never database plaintext by default;
- deletion of a tenant does not silently release a hostname for immediate reuse.

## 9. Application, Session, and Browser Security

- Use host-only cookies by default.
- Do not set session cookies for the entire parent domain unless a reviewed cross-subdomain authentication design explicitly requires it.
- Broad parent-domain cookies must never contain tenant authority.
- Cookies must use `Secure`, `HttpOnly`, and an explicitly reviewed `SameSite` value.
- Central sign-in should use an exact authentication hostname and a standard redirect/token exchange rather than a shared wildcard session cookie where possible.
- CORS must use an exact allowlist derived from active domain bindings; wildcard credentialed CORS is forbidden.
- CSRF, OAuth redirect URIs, WebAuthn RP IDs, deep links, email links, and password-reset links must be tenant-domain aware and validated.
- HTTP must redirect permanently to HTTPS only after the target hostname is known and approved.
- HSTS rollout must be staged; `includeSubDomains` or preload must not be enabled until every covered hostname is HTTPS-safe.
- CSP, frame-ancestor policy, referrer policy, and content-type protections must remain consistent across tenant hostnames.

## 10. Cache, Queue, Rate-Limit, and Observability Isolation

Every tenant-aware infrastructure key must include or derive the immutable tenant boundary, not only the display hostname.

Required examples:

- CDN and reverse-proxy cache key includes normalized host and relevant vary dimensions;
- application cache key includes `tenant_id`;
- rate limits include tenant and hostname dimensions where applicable;
- idempotency keys cannot collide across tenants;
- queues and outbox events carry trusted tenant context;
- logs, traces, metrics, and audit events record `tenant_id`, normalized hostname, route, outcome, and correlation identifier without leaking secrets or unnecessary PII;
- alerts detect unknown-host spikes, certificate expiry, validation failure, routing mismatch, cross-tenant anomalies, and origin-bypass attempts.

Purging one tenant's cache must not purge or expose another tenant's data unless a separately authorized global purge is intended.

## 11. SEO, Redirect, and Lifecycle Rules

- Each tenant has one canonical primary hostname.
- Secondary approved hostnames redirect to the primary hostname using a controlled permanent redirect after activation.
- Slug changes are controlled migrations, not in-place silent edits.
- Old hostnames remain bound during the approved redirect period and then enter quarantine.
- Search canonical tags, sitemap generation, robots policy, social metadata, and public URLs must use the active primary hostname.
- Tenant suspension must fail closed without exposing another tenant; the product may show a neutral suspended/unavailable page.
- Domain release must remove routing, certificates or provider bindings, redirects, cache entries, and authentication allowlists in a defined order.

## 12. Required Threat Model

Before implementation, the security review must cover at least:

- Host header injection and poisoned absolute URLs;
- spoofed forwarding headers and untrusted proxy chains;
- subdomain takeover and stale DNS;
- released-slug takeover;
- custom-domain ownership theft;
- TLS mis-issuance, expiry, and key compromise;
- direct-origin bypass;
- cache poisoning and cross-tenant cache leakage;
- parent-domain cookie leakage and session fixation;
- CORS, CSRF, OAuth redirect, WebAuthn, and password-reset confusion;
- Unicode homograph and Punycode confusion;
- wildcard routing of protected infrastructure names;
- tenant enumeration and information leakage;
- suspended or deleted tenant hostname reuse;
- SSRF or callback abuse involving tenant-controlled domains;
- denial of service and noisy-neighbor behavior.

## 13. Rollout Sequence

No phase advances without same-commit evidence for its scope.

### Phase 0 — Current

```text
governance only
no DNS change
no certificate issuance
no ingress activation
no tenant hostname runtime
```

### Phase 1 — First-party non-production proof

- dedicated staging tenant base domain;
- approved wildcard DNS and edge TLS;
- strict origin TLS;
- trusted hostname resolver;
- reserved-label registry;
- negative routing and isolation tests;
- expiry and routing observability.

### Phase 2 — Controlled first-party production pilot

- explicit Product Truth and architecture approval;
- security and privacy approval;
- rollback and incident runbooks;
- restricted pilot tenants;
- support and domain-lifecycle operations;
- same-commit runtime and isolation proof.

### Phase 3 — Self-service tenant slug selection

- entitlement and abuse controls;
- reservation, moderation, rename, release, quarantine, and dispute workflows;
- audit and support tooling.

### Phase 4 — Customer-owned custom domains

- ownership verification;
- managed per-hostname certificates;
- certificate and DNS lifecycle automation;
- commercial entitlement and support model;
- provider portability and failure handling.

## 14. Activation Gates

The capability remains `NEEDS_EVIDENCE` until all applicable gates are proven:

```yaml
tenant_hostname_activation_gate:
  product_truth_approved: PROVEN
  tenant_model_and_domain_contract_approved: PROVEN
  reserved_label_registry_enforced: PROVEN
  trusted_proxy_and_host_validation_verified: PROVEN
  exact_hostname_to_tenant_resolution_verified: PROVEN
  cross_tenant_negative_routing_tests_passed: PROVEN
  wildcard_dns_scope_verified: PROVEN
  edge_certificate_coverage_verified: PROVEN
  origin_certificate_match_and_rotation_verified: PROVEN
  full_strict_enabled_and_verified: PROVEN
  origin_bypass_prevention_verified: PROVEN
  cookie_cors_csrf_redirect_controls_verified: PROVEN
  cache_queue_idempotency_isolation_verified: PROVEN
  observability_and_expiry_alerting_verified: PROVEN
  suspension_release_quarantine_workflows_verified: PROVEN
  incident_and_rollback_runbooks_verified: PROVEN
  independent_security_review_passed: PROVEN
  production_deployment_authorized: PROVEN
```

For customer-owned domains, additionally require:

```yaml
custom_domain_activation_gate:
  ownership_validation_verified: PROVEN
  dns_target_verified: PROVEN
  certificate_status_active: PROVEN
  hostname_status_active: PROVEN
  caa_policy_verified: PROVEN
  provider_failure_and_portability_tested: PROVEN
  entitlement_and_support_model_approved: PROVEN
```

## 15. Acceptance Condition

This policy is satisfied at the governance-only stage when:

- tenant subdomains and customer-owned domains are explicitly separated;
- wildcard DNS and wildcard certificates are not misrepresented as tenant isolation;
- `Full (strict)` is the required production end state;
- origin bypass, cookie scope, cache isolation, reserved labels, lifecycle, and custom-domain verification are governed;
- implementation and production activation remain deferred;
- `governance/saas/saas-governance.json` continues to report `SAAS_READY_DEFERRED` and `productionDeploymentAuthorized: false`.
