# Target — Governance Knowledge System

TEMPORARY_TARGET_SPECIALIZATION: YES
GENERAL_EXECUTION_AUTHORITY: NONE

## 1. Mission

Refound `governance/**` into the minimum sufficient durable semantic constitution of BThwani. Governance must let a qualified developer understand the platform without preserving accidental implementation topology or becoming a second execution engine.

## 2. Target information architecture

The current target is intentionally compact:

```text
governance/
├── GOVERNANCE.md
├── product/
│   ├── PRD.md
│   ├── CAPABILITIES.md
│   ├── FINANCIAL-MODEL.md
│   └── EXPERIENCE-AND-DESIGN.md
└── policies/
    ├── engineering.md
    ├── architecture-and-fullstack.md
    ├── data-and-migrations.md
    ├── frontend-and-client.md
    ├── runtime-reliability.md
    ├── security.md
    ├── standards-and-quality.md
    └── delivery.md
```

This tree is target-specific and remains subject to the orchestrator's artifact-admission law; do not create empty categories merely to make the tree larger.

## 3. Authority boundary

```text
GOVERNANCE = DURABLE PRODUCT/SYSTEM/POLICY MEANING
DOCS = HUMAN GUIDANCE
EXECUTABLE SOURCE = CURRENT IMPLEMENTATION STATE
ORCHESTRATOR = REFOUNDATION EXECUTION/CLOSURE
```

Governance files must not self-certify through labels such as `ACTIVE_CANONICAL`. Authority comes from the Governance index/semantic ownership model plus current human intent and reconciliation under the orchestrator.

## 4. Product/capability model

Durable capability governance owns stable outcomes, actors, owner boundaries, business/negative invariants and acceptance expectations.

It must not hand-maintain:

```text
ROUTE NAMES
OPERATION IDs
DATABASE TABLE INVENTORIES
SCREEN/HOOK FILE PATHS
GENERATED CLIENT INVENTORIES
CI RESULTS
CURRENT RUNTIME HEALTH
```

The inherited `product/contracts/*.product-truth.json`, schema and derived platform-model forms are losing representations when their durable value has been extracted into the semantic owners above.

## 5. Product/domain ownership

At minimum Governance must make unambiguous:

- Identity owns actor/authentication/session/activation truth.
- Workforce owns workforce profile/engagement/eligibility truth.
- DSH owns commerce/partner/store/order/dispatch/delivery/serviceability/support and other operational truth assigned by Product.
- WLT owns wallet/ledger/payment/refund/commission/payout/settlement/reconciliation truth.
- Platform Control owns only explicitly assigned cross-platform governed configuration/control-plane truth.
- External providers are adapters/integrations at semantic owners; a generic provider container does not become a business domain.
- Apps are deployable hosts/composition surfaces, not business truth owners.

## 6. Required durable models

Governance must preserve current required:

- product definition/non-goals;
- actors/surfaces/trust concepts;
- capability catalog and ownership;
- WLT/financial invariants;
- experience/RTL/accessibility/design-system meaning;
- architecture/data/contracts/client/runtime/security/quality/delivery policies.

## 7. Closure gate

```text
GOVERNANCE_ENTRYPOINT=PASS
DEVELOPER_RECONSTRUCTION_TEST=PASS
SELF_CERTIFYING_STATUS_LABELS=0
MANUAL_IMPLEMENTATION_INVENTORY_AUTHORITY=0
DUPLICATE_PRODUCT/CAPABILITY_AUTHORITIES=0
STALE core/shared/providers OWNER MODEL=0
REQUIRED_FINANCIAL/SECURITY/WORKFORCE/EXPERIENCE_MEANING_LOST=0
DOCS/GOVERNANCE_AUTHORITY_BOUNDARY=PASS
```
