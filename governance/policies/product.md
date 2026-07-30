# Product Policy

Status: ACTIVE_CANONICAL

Material user-visible, role-sensitive, commercial, operational, or cross-surface
changes require an approved product model before implementation. The model owns:
the problem and evidence state; actors and forbidden actions; required and
excluded surfaces; states and actions; outcomes; acceptance; and negative
invariants.

`PRODUCT_MANAGER_AUTHORITY` owns problem, actors, outcome, scope, exclusions,
priority, and model approval. `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns behavior,
permissions, states, readiness, and exact-commit product acceptance. Engineering
cannot approve its own outcome. The active sole owner may fulfill eligible human
roles only under the recorded contract; protected domains remain independent.

Every required surface maps to its actor and observable behavior. Seed, fixture,
preview, fallback, or in-memory data cannot prove an active capability, revenue,
runtime, or commercial state. Product files define semantics and acceptance;
OpenAPI and runtime source own routes and operation identifiers.

The canonical platform model is `governance/product/platform-model.yaml`.
BThwani is not a SaaS product and does not define tenants.
Partner subscriptions are commercial pricing relationships inside the platform;
they do not create an isolation boundary or an independent platform instance.
Operator context remains the trusted platform boundary defined by the canonical
platform model.
