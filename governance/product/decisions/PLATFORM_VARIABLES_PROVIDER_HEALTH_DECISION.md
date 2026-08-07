# Platform Variables and Provider Health Decision

Status: ACTIVE_CANONICAL
Authority domain: `platform_variables_provider_health`

This decision defines durable semantics for centrally governed platform variables and external-provider health. It refines product/runtime/security policy but does not replace provider-specific contracts or runtime configuration.

## Outcome

Platform-owned configuration that affects multiple surfaces/services is governed from a single server-side owner with versioned/audited change semantics, while provider health is represented from real provider/runtime evidence and cannot be fabricated by a local surface or static config file.

## Ownership

- Platform Control owns approved platform-wide variable definitions, governed rollout/state and operator change audit where the current platform model assigns that responsibility.
- Each service owns service-local runtime configuration that is not a platform variable.
- Provider domain owns provider registration, capabilities, connection policy and secret references.
- Secret material remains in the approved secret manager/runtime environment; governance stores references/policy, not credentials.
- Surfaces consume bounded read models and never own provider health or platform-variable truth.

## Rules

1. Every platform variable has a stable key, type/schema, owner, scope, default/fallback semantics, validation, version and audit/reason requirements.
2. A variable must not silently change domain ownership, financial truth, authorization semantics or database compatibility.
3. Security-sensitive or production-impacting changes require the applicable approval/evidence scopes defined by current governance.
4. External providers have explicit capabilities and failure semantics; absence, degraded state, timeout and unknown result are distinct from healthy.
5. Health must be derived from configured runtime checks/provider evidence appropriate to the claim; a configured endpoint or static `enabled=true` flag is not health evidence.
6. Provider outages fail closed for mutations that require authoritative provider success and degrade/read-only only where the domain contract explicitly permits it.
7. Retries preserve idempotency/correlation and cannot duplicate provider or financial effects.
8. Provider/configuration changes that affect mobile/web clients preserve compatible rollout/version behavior where mixed versions can coexist.
9. Client-visible configuration contains no server secret, credential, private key or privileged provider token.
10. Every consuming surface/service must converge on the canonical effective value after rollout/readback; local overrides are development-only and clearly bounded.

## Forbidden

- duplicated platform variables hardcoded independently across surfaces;
- secrets committed to governance, source, client bundles or logs;
- treating configured/registered provider as healthy without runtime evidence;
- client-controlled provider selection when selection is a trusted server policy;
- bypassing a failed provider with fake success/local mutation;
- unversioned high-impact configuration changes without audit/readback.

## Evidence boundary

Schema/guard checks prove configuration structure only. Provider-health, rollout and effective-value claims require runtime evidence from the exact candidate/environment. Production-health and release claims remain separate protected evidence domains.
