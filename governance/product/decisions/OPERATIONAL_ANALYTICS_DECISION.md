# Operational Analytics Decision

Status: ACTIVE_CANONICAL
Authority domain: `operational_analytics`

This decision defines durable product semantics for operational analytics and executive/operator read models. It does not make analytics a source of operational or financial truth.

## Outcome

Authorized operators receive explainable, scoped, freshness-aware operational metrics derived from canonical domain facts, with drill-down/reference paths back to the owning systems where permitted. Analytics must not introduce a parallel write model or claim financial truth independently of WLT.

## Ownership

- Each source domain owns its underlying facts and state transitions.
- WLT owns authoritative financial amounts, ledger, settlement, payout, refund and reconciliation facts.
- Analytics/read-model components own aggregation, projection, windows, labels and presentation only.
- Platform/Identity authorization owns trusted operator context and access scope.

## Rules

1. Every metric must define source owner, numerator/denominator or aggregation semantics, time basis/window, currency/unit where relevant, freshness/staleness behavior and permitted dimensions.
2. A metric derived from multiple domains must preserve source attribution and must not resolve disagreement by inventing a third truth.
3. Financial metrics originate from WLT-owned facts or a governed WLT-backed projection; DSH/surfaces must not recalculate ledger truth.
4. Operational metrics may derive from DSH/Workforce/Platform Control/etc. only through current governed contracts/read models.
5. Analytics requests and filters are constrained by trusted platform/operator/business scope; a client-supplied scope is not authorization.
6. Empty, delayed, partial, stale and unavailable data are explicit states and must not be rendered as zero unless zero is the proven canonical value.
7. Aggregates and caches must have a defined refresh/invalidation model and correlation to source updates where the claim depends on freshness.
8. Drill-down must preserve object authorization and redaction; a high-level metric never grants access to underlying restricted records.
9. Dashboard or report calculations that affect a user-visible financial/operational decision must be deterministic and testable from source facts.
10. Export/report features obey current privacy, retention and authorization policy.

## Forbidden

- analytics tables/services becoming authoritative writers for source-domain state;
- surface-local formulas presented as canonical KPIs;
- silent mixing of different currencies, time zones, scopes or source versions;
- treating missing or stale data as proven zero/success;
- leaking PII, secrets, raw financial payloads or unauthorized cross-scope dimensions;
- using mock/fixture metrics as runtime or production evidence.

## Evidence boundary

Static/schema checks prove definitions/bindings only. Claims about freshness, aggregation correctness, performance or real data require same-commit data/runtime evidence against representative canonical sources. Product acceptance is separate from implementation verification.
