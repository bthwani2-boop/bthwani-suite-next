# Target — Governance Knowledge System

## 1. Mission

Refound `governance/` into BThwani's durable, navigable project-memory and policy system: complete enough that a competent engineer can understand what BThwani is, who participates, which bounded context owns each durable meaning, what invariants may not be violated, and where the executable source of truth lives.

Governance must not become a second implementation, runtime registry, campaign ledger or self-certifying authority.

```text
GOVERNANCE = DURABLE MEANING + POLICY + OWNERSHIP INTENT + DECISION RATIONALE
GOVERNANCE != LIVE RUNTIME STATE
GOVERNANCE != API/DB/COMPONENT INVENTORY MIRROR
GOVERNANCE != EXECUTION/CLOSURE AUTHORITY
```

## 2. Authority metadata law

Durable governance artifacts use explicit class/status/owner metadata without semantic self-certification.

Preferred model:

```text
ARTIFACT_CLASS: DURABLE_PROJECT_GOVERNANCE | DURABLE_PRODUCT_GOVERNANCE | DURABLE_ARCHITECTURE_POLICY | ...
STATUS: ACTIVE | DEPRECATED | SUPERSEDED
SEMANTIC_OWNER: <real durable owner/steward>
EXECUTION_AUTHORITY: NO
SELF_CERTIFICATION: FORBIDDEN
```

Labels such as `ACTIVE_CANONICAL` must not be used as proof that content is correct. Existing self-certifying labels are treatment candidates.

`DEPRECATED` or `SUPERSEDED` does not grant survival rights. A superseded governance artifact remains live only when it owns unique still-required explanatory/decision value that cannot be represented more cleanly by the current owner or Git history.

Otherwise:

```text
ABSORB_REQUIRED_VALUE
→ UPDATE_REFERENCES
→ DELETE
```

ADRs may survive as decision-rationale artifacts when that rationale is itself durable required value; they do not become current-rule authority.

## 3. Canonical information architecture

The following is an illustrative semantic taxonomy, not a required directory/file tree. Create only the minimum governance structure justified by real durable meaning.

```text
CREATE_GOVERNANCE_ARTIFACT_ONLY_IF:
REQUIRED_DURABLE_MEANING
+ UNIQUE_CANONICAL_RESPONSIBILITY
+ NO_EXISTING_CANONICAL_HOME
+ NO_EXECUTABLE_SOURCE_CAN_REPRESENT_IT_BETTER
+ NO_DUPLICATION
+ REAL_DISCOVERABILITY_VALUE

OTHERWISE:
MERGE / ABSORB / DELETE / DO_NOT_CREATE

MINIMUM_SUFFICIENT_GOVERNANCE > MAXIMUM_DOCUMENTATION_COVERAGE
```

Illustrative taxonomy:

```text
governance/
├── GOVERNANCE.md
├── project/
│   ├── mission-and-scope.md
│   ├── operating-model.md
│   ├── stakeholders-and-actors.md
│   ├── glossary-and-ubiquitous-language.md
│   ├── assumptions-and-non-goals.md
│   └── legal-commercial-context.md
├── product/
│   ├── product-model.md
│   ├── surfaces.md
│   ├── capability-model.md
│   ├── journey-model.md
│   ├── capabilities/
│   ├── journeys/
│   ├── commercial-model.md
│   ├── workforce-model.md
│   ├── financial-model.md
│   └── experience-and-design.md
├── architecture/
│   ├── system-context.md
│   ├── bounded-contexts-and-services.md
│   ├── repository-topology.md
│   ├── dependency-direction.md
│   ├── apps-and-composition.md
│   ├── contracts-and-generated-lineage.md
│   ├── data-ownership.md
│   ├── integrations-and-providers.md
│   ├── runtime-and-configuration.md
│   ├── design-system.md
│   └── source-of-truth-map.md
├── security/
├── quality/
├── delivery/
└── decisions/
    └── adr/
```

Do not create empty placeholders mechanically. The illustration above is not a checklist. A directory/file survives only when required durable meaning exists and the artifact-admission test above passes.

## 4. Project and stakeholder model

Governance must explicitly separate:

```text
ACTOR
ROLE
ENGAGEMENT
AUTHORIZATION_SCOPE
ORGANIZATION/BUSINESS_SCOPE
BOUNDED_CONTEXT
DEPLOYABLE_SURFACE
```

Required stakeholder model must cover, where real:

```text
customer
partner organization / owner / manager / staff
workforce person
employee / independent contractor / third-party engagement
captain / field / support / operations roles
platform/operator/finance/approval/audit roles
system/service actors
external provider/rail/platform actors
```

Do not encode false exclusivity such as `employee != captain` or `field != employee`. Identity, Workforce, DSH operational role and WLT financial ownership remain distinct authorities.

## 5. Capability and journey separation

```text
CAPABILITY = stable semantic responsibility/owner
JOURNEY = actor/system outcome that may cross capabilities
SURFACE = where interaction appears
ROUTE/SCREEN = implementation composition
```

Product Truth must not merge these categories.

Current `governance/product/contracts/` is noncanonical terminology when it stores Product Truth rather than executable wire contracts. Preserve required meaning and converge to explicit `product/capabilities/` and `product/journeys/` ownership when supported by the census.

## 6. Product Truth refoundation

Product Truth records retain durable semantic meaning only:

```text
problem/outcome
actors/responsibilities
required/excluded surfaces
semantic owners
states/transitions/invariants
authorization/trust requirements
mutation/readback meaning
cross-domain handoffs
security/privacy/financial restrictions
failure/recovery semantics
acceptance/negative invariants
```

Implementation-specific material such as current hook/component names, exact table names, operation IDs, generated-client paths or a synthetic `shared` surface must not become durable Product authority. If traceability is useful, derive it or store it as explicitly non-normative evidence outside Product Truth.

Split mega Product Truth records when they combine independently owned capabilities, e.g. wallet/ledger/payment/refund/settlement/commission/payout/reconciliation/COD/collateral.

Schema validation must become stricter where ambiguity permits incompatible owner vocabularies, while remaining structural rather than claiming semantic correctness.

## 7. Bounded-context and source-of-truth map

Governance must provide one discoverable map from durable meaning to executable owner, for example:

```text
Authentication → Identity → services/identity
Work relationship/engagement → Workforce → services/workforce
Commerce/order/delivery → DSH → services/dsh
Wallet/ledger/payment/payout/settlement → WLT → services/wlt
App route/composition → apps/*
Design language implementation → packages/design-system
Provider control-plane config → Platform Control only where admitted
Provider execution adapter → operation-owning service
```

The map points to canonical executable contract/storage/runtime locations; it does not duplicate them.

Stale generic `PROVIDERS`, `core/*`, `shared/*`, app-shaped service ownership, or DSH-owned WLT frontend claims must be removed when the refoundation target disproves them.

## 8. Durable security, finance and operations knowledge

Governance must be sufficient to answer without guesswork:

```text
trust/context model
identity/session/authz separation
service-to-service trust
secret/key ownership
privacy/data classification and retention
financial owner/ledger/payment/refund/payout/settlement/reconciliation model
provider unknown-outcome handling
workforce engagement and role model
commercial/partner model
environment/release/supply-chain model
observability/reliability ownership
Arabic/RTL/accessibility/design-system durable requirements
```

Do not invent regulatory, legal, SLA, RPO/RTO or retention numbers without authorized evidence.

## 9. ADR law

Use ADRs for durable decision rationale:

```text
CONTEXT
DECISION
ALTERNATIVES
CONSEQUENCES
SUPERSESSION
```

ADRs explain why a current rule exists. They do not replace the current-rule owner and do not become parallel truth.

High-value decisions include repository taxonomy, app-host/service-capability separation, WLT independence, Identity/Workforce separation, provider control-plane/data-plane split, secret handling, design-system authority and contract ownership.

## 10. Governance closure gate

```text
GOVERNANCE_ENTRYPOINT=PASS
DURABLE_INFORMATION_ARCHITECTURE=PASS
SELF_CERTIFYING_STATUS_CONFLICTS=0
STALE_OWNER/TAXONOMY_CLAIMS=0
PROJECT_SCOPE/OPERATING_MODEL=PASS
STAKEHOLDER/ACTOR/GLOSSARY=PASS
SERVICE/BOUNDED_CONTEXT_MODEL=PASS
CAPABILITY_MODEL=PASS
JOURNEY_MODEL=PASS
SOURCE_OF_TRUTH_MAP=PASS
PRODUCT_TRUTH_IMPLEMENTATION_LEAK=0
DUPLICATE_DURABLE_MEANING_AUTHORITIES=0
SECURITY/FINANCE/WORKFORCE/COMMERCIAL/EXPERIENCE DURABLE MODEL=PASS
ADR_SYSTEM=PASS
GOVERNANCE↔EXECUTABLE_CONTRADICTIONS=0
```
