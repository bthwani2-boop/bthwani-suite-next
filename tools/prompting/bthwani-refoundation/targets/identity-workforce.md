# Target — Identity and Workforce

## 1. Service placement

Refound:

```text
core/identity  → services/identity
core/workforce → services/workforce
```

Both are real peer bounded contexts/services. Their former location under `core/` does not grant special architectural rank.

Package/export names must lose `core-` after consumer cutover.

## 2. Identity authority

Identity owns security-sensitive identity truth such as:

```text
actor identity
authentication
credentials/verification
session create/refresh/revoke
roles/permissions identity vocabulary
identity activation/security state
device/session authorization semantics where applicable
```

Apps bind platform storage/native callbacks; they do not reproduce session policy. DSH, WLT, Workforce, and Platform Control consume Identity rather than maintaining parallel auth truth.

## 3. Workforce conceptual correction

Do not encode employment relationship and operational role as one mutually exclusive axis.

Inherited concepts such as:

```text
workforce_kind = employee | captain | field
```

are noncanonical when they imply that being an employee excludes being a Captain/Field actor.

Refound Workforce around orthogonal concepts:

```text
PERSON
+
ENGAGEMENT
+
OPERATIONAL_ROLE_ASSIGNMENT
```

### Person

Represents the workforce person linked to a canonical Identity actor.

### Engagement

Represents the legal/organizational working relationship, for example when required:

```text
employee
independent-contractor
agency-worker/third-party-worker
```

These are engagement classifications, not operational roles.

### Operational role assignment

Represents what the person is operationally assigned to perform, for example:

```text
captain
field-agent
support-agent
operations-agent
```

A person may therefore be:

```text
Engagement = EMPLOYEE
Role       = CAPTAIN
```

or:

```text
Engagement = INDEPENDENT_CONTRACTOR
Role       = CAPTAIN
```

without duplicating the person or forcing a false mutually exclusive profile type.

## 4. Workforce ownership

Workforce may own, when proven:

```text
workforce person reference to Identity actor
engagement type/status
employee/contract identifiers
hire/start/end dates
organizational affiliation
supervision/reporting relationship
qualifications/licenses/documents
workforce availability/leave/shift facts
workforce lifecycle/status
role assignment metadata that belongs to workforce administration
```

Do not make Workforce the owner of DSH operational task truth or WLT financial truth merely because workforce actors participate.

## 5. Service boundary split

```text
IDENTITY
  who is this actor and how are they authenticated/authorized?

WORKFORCE
  what is this person's working relationship, qualification, availability, and organizational lifecycle?

DSH
  what operational commerce/delivery/field work is assigned/performed?

WLT
  what wallet/commission/payout/collateral/financial consequences exist?
```

Operational role eligibility may require Workforce evidence, but DSH remains owner of DSH operational assignment/state. Financial consequences may reference Workforce/DSH evidence, but WLT remains financial authority.

## 6. Workforce topology

Do not mechanically create directories, but organize proven capabilities around real meanings such as:

```text
person
engagement
role-assignment
qualification
availability
document
organization-affiliation
```

Technical boundaries:

```text
transport/http
runtime
integrations/identity
integrations/dsh
integrations/wlt
```

`internal/dshclient` style packages should become explicit integrations, not pseudo-domains.

Large HTTP server/worker files and giant baseline SQL require cohesion review under orchestrator size rules; do not split merely by LOC, but do not preserve multi-responsibility files for convenience.

## 7. Migration law for inherited profile exclusivity

Before changing current employee/captain/field profile constraints:

```text
CENSUS_ALL_CURRENT_WORKFORCE_FACTS
→ MAP_EACH_FACT_TO_PERSON/ENGAGEMENT/ROLE/QUALIFICATION/AVAILABILITY/OTHER_OWNER
→ IDENTIFY_DUPLICATE_OR_DERIVED_FACTS
→ DESIGN_CANONICAL_KEYS/CONSTRAINTS
→ TRANSFORM/BACKFILL_DETERMINISTICALLY
→ VERIFY_COUNTS/RELATIONSHIPS/INVARIANTS
→ CUT_OVER_WRITERS
→ CUT_OVER_READERS
→ DELETE_OLD_MUTUAL_EXCLUSIVITY/PROFILE_AUTHORITIES
```

Do not simply relax constraints and keep ambiguous duplicate models.

## 8. Independent service providers versus external technical providers

Do not overload the word `provider`.

A human independent contractor/service provider belongs to Workforce engagement/role semantics.

A technical external provider (payment/maps/SMS/etc.) belongs to integration/provider architecture in `targets/providers-and-integrations.md`.

Use explicit names such as `independent-contractor`, `captain`, `payment-rail`, `maps-adapter` rather than generic `provider` when ambiguity exists.

## 9. Exit gate

At closure prove:

```text
core/identity=ABSENT
core/workforce=ABSENT
core-* PACKAGE NAMES=0
PARALLEL_AUTH/SESSION_AUTHORITIES=0
WORKFORCE_RELATIONSHIP_AND_OPERATIONAL_ROLE_CONFLATION=0
FALSE_EMPLOYEE_VS_CAPTAIN/FIELD_MUTUAL_EXCLUSIVITY=0
DSH_OPERATIONAL_TRUTH_OWNED_BY_WORKFORCE=0
WLT_FINANCIAL_TRUTH_OWNED_BY_WORKFORCE=0
STALE_DSHCLIENT/HTTP_MEGA_PACKAGE_TOPOLOGY=0
OLD_DB_CONSTRAINTS/PROJECTIONS_PRESERVING_LOSING_MODEL=0
```
