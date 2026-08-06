# Diagnosis Report — TASK_NAME

> This file is a disposable derived-support artifact. It records diagnosis at `PINNED_START_SHA` and cannot override canonical governance, contracts, live code, or current remote state.

## 1. Executive decision

```yaml
repository: bthwani2-boop/bthwani-suite-next
target_branch: TARGET_BRANCH
pinned_start_sha: PINNED_START_SHA
diagnosis_scope: REPLACE_WITH_EXACT_SCOPE
diagnosis_status: DIAGNOSIS_IN_PROGRESS
plan_status: NOT_READY
execution_authorization: NOT_AUTHORIZED
decision: NEEDS_EVIDENCE
```

State exactly what is proven, what is not proven, and the consequence. Do not claim completeness from file count, build success, or absence of visible failures.

## 2. Original request and measurable outcome

### Requested outcome

- REPLACE_WITH_REQUESTED_OUTCOME

### Measurable completion conditions

1. REPLACE_WITH_MEASURABLE_CONDITION
2. REPLACE_WITH_MEASURABLE_CONDITION
3. REPLACE_WITH_MEASURABLE_CONDITION

### Explicit non-goals

- REPLACE_WITH_NON_GOAL_AND_REASON

## 3. Authority and source resolution

| Priority | Source | Resolved SHA/version | Applicable domain | Effect on this task |
| --- | --- | --- | --- | --- |
| 1 | Current user instruction | Current turn | Requested scope/actions | REPLACE |
| 2 | `governance/authority/authority-precedence.json` | PINNED_START_SHA | Authority resolution | REPLACE |
| 3 | `AGENTS.md` | PINNED_START_SHA | Agent execution | REPLACE |
| 4 | Relevant canonical policy/contract | PINNED_START_SHA | Domain-specific truth | REPLACE |

Record conflicts and their resolution. Do not silently choose the most convenient rule.

## 4. Remote baseline

Record:

- exact repository and branch;
- pinned commit SHA and commit timestamp;
- working mode (`REMOTE_ONLY`, `LOCAL_WITH_REMOTE_PIN`, or another proven mode);
- whether the branch moved during diagnosis;
- files examined from a different SHA, if any, and why;
- current CI/check evidence relevant to the requested claim;
- unavailable evidence.

### Baseline evidence

| Evidence ID | Claim | SHA | Path/command/source | Exact range/result | Confidence |
| --- | --- | --- | --- | --- | --- |
| EVD-0001 | REPLACE | PINNED_START_SHA | REPLACE | REPLACE | PROVEN |

## 5. Scope model

### Included

| Scope ID | Element | Type | Why included | Entry evidence | Downstream consumers |
| --- | --- | --- | --- | --- | --- |
| SCP-0001 | REPLACE | service/surface/contract/data/flow/tool | REPLACE | EVD-0001 | REPLACE |

### Excluded with proof

| Scope ID | Element | Exclusion reason | Proof | Re-open trigger |
| --- | --- | --- | --- | --- |
| SCP-X001 | REPLACE | REPLACE | EVD-0002 | REPLACE |

### Forbidden or protected paths

List paths that must not be changed and the authority or risk reason.

### Scope-expansion rule

The scope may expand only when evidence proves an ownership, dependency, consumer, security, data, runtime, migration, release, or operational impact. Every expansion must be recorded before planning the affected work.

## 6. Complete inventory and classification

Every in-scope file, component, endpoint, contract, table, migration, route, screen, state transition, integration, script, test, guard, and relevant document must be classified.

Allowed classifications:

- `AFFECTED`
- `NOT_AFFECTED_WITH_REASON`
- `OBSOLETE_CANDIDATE`
- `DUPLICATE_CANDIDATE`
- `MIGRATION_REQUIRED`
- `EXTERNAL`
- `UNPROVEN`

| Inventory ID | Path/entity | Type | Owner | Purpose | Classification | Usage proof | Dependencies | Dependents | Finding IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INV-0001 | REPLACE | REPLACE | REPLACE | REPLACE | UNPROVEN | EVD-0003 | REPLACE | REPLACE | REPLACE |

No row may remain unclassified when the plan status becomes `READY_FOR_REVIEW`.

## 7. Functional and operational flow reconstruction

Describe the current behavior from entry point to final state, including:

1. actor and intent;
2. navigation or invocation entry;
3. authentication and authorization checks;
4. request and contract boundary;
5. service/controller/use-case path;
6. data read/write and transaction boundary;
7. events, outbox, jobs, webhooks, or providers;
8. response and error mapping;
9. consuming surfaces and readback;
10. audit, observability, recovery, and failure behavior.

For each step, attach evidence. Mark missing or inferred links as `UNPROVEN`.

## 8. Truth ownership and parallel-source analysis

| Concept | Correct owner | Authoritative contract | Authoritative persistence | Allowed writers | Allowed readers | Parallel sources found | Required convergence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REPLACE | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

Explicitly analyze business rules, statuses, permissions, financial values, identifiers, request/response types, configuration, feature flags, runtime state, and generated clients.

## 9. Architecture and dependency analysis

Provide:

- dependency direction and forbidden edges;
- ownership boundaries;
- shared versus surface-local responsibilities;
- generated versus handwritten artifacts;
- database and migration ordering;
- synchronous/asynchronous integration boundaries;
- failure propagation and retry behavior;
- circular dependencies and hidden coupling;
- compatibility layers and whether each remains justified.

Use a text or Mermaid graph only when it adds information. Every node and edge must correspond to evidence.

## 10. Findings summary

The detailed register lives in `02-FINDINGS-REGISTER.json`.

| Finding ID | Severity | Category | Root cause | Affected scope | Evidence | Proposed disposition |
| --- | --- | --- | --- | --- | --- | --- |
| FND-0001 | REPLACE | REPLACE | REPLACE | REPLACE | EVD-0001 | REPLACE |

### Required finding categories to assess

Record `NOT_AFFECTED_WITH_REASON` when a category is not applicable:

- authority and ownership;
- authentication and authorization;
- data truth and persistence;
- contracts and generated clients;
- service boundaries;
- cross-surface binding;
- states and lifecycle;
- error semantics;
- security and privacy;
- financial boundary;
- migrations and compatibility;
- runtime and configuration;
- observability and audit;
- tests and evidence;
- obsolete, duplicate, dead, or misleading files;
- scripts, CI, guards, and release impact;
- documentation drift.

## 11. Root-cause map

For every material finding, show:

```text
observable symptom
→ immediate technical cause
→ structural cause
→ incorrect or missing truth owner
→ affected consumers
→ durable correction
→ obsolete remnants to remove
→ verification that proves the correction
```

Do not stop at the first failing line when the underlying design is invalid.

## 12. Obsolete, duplicate, and deletion candidates

| Candidate ID | Path/entity | Candidate reason | Reference search evidence | Replacement/none | Migration prerequisite | Risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEL-0001 | REPLACE | REPLACE | EVD-0004 | REPLACE | REPLACE | REPLACE | UNPROVEN |

A deletion recommendation is invalid without consumer, build, test, workflow, documentation, data, contract, and runtime impact analysis appropriate to the item.

## 13. Target state

Define the intended post-change model:

- single owner for every truth;
- allowed dependency direction;
- authoritative contracts and persistence;
- expected flows and state transitions;
- surface responsibilities;
- error and negative-state behavior;
- migration and compatibility strategy;
- security, privacy, isolation, and finance boundaries where applicable;
- observability and operational recovery;
- explicit removals.

Distinguish required design from optional improvement.

## 14. Risk analysis

| Risk ID | Scenario | Likelihood | Impact | Detection | Prevention | Rollback | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RSK-0001 | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

Include risks of action, inaction, migration, deletion, partial deployment, stale clients, concurrency, retries, data corruption, authorization bypass, financial mismatch, and operational rollback when applicable.

## 15. Evidence gaps and blockers

| Item ID | Missing evidence | Why it matters | Internal/external | Acquisition method | Blocking decision |
| --- | --- | --- | --- | --- | --- |
| GAP-0001 | REPLACE | REPLACE | REPLACE | REPLACE | NEEDS_EVIDENCE |

Internal evidence gaps must not be mislabeled as external blockers.

## 16. Diagnosis coverage gate

Before changing diagnosis status to complete, prove:

```yaml
unclassified_inventory_items: 0
material_claims_without_evidence: 0
findings_without_root_cause: 0
findings_without_truth_owner: 0
silent_exclusions: 0
unmapped_consumers: 0
unassessed_deletion_candidates: 0
unrecorded_scope_expansions: 0
unresolved_authority_conflicts: 0
```

Any nonzero value keeps the diagnosis open.

## 17. Final diagnosis statement

State one canonical decision and cite the exact evidence and open gaps supporting it. A diagnosis report may end in `READY_FOR_REVIEW`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, or `PROTOCOL_VIOLATION`. It must not claim `CLOSED_WITH_EVIDENCE` before implementation and all applicable verification are complete.
