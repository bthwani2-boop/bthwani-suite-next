# H Refoundation Scope and Authority Rules

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: branch authority, mutation scope, forensic sources, exact-head discipline, concurrency and artifact survival.

## 1. Branch law

```text
MUTABLE_REFOUNDATION_AUTHORITY=h
```

`h` is the only branch that may be mutated by this campaign.

Initial refoundation identity:

```text
INITIAL_H_SHA=c29e848413ad64c85feca0e0b5d9fa468a6754bd
```

That SHA is historical identity, not a permanently frozen execution target. Every write begins from the current exact remote `h` SHA.

No branch protection or ruleset is required for `h`.

Campaign prohibitions:

```text
PR_FROM_h=FORBIDDEN
PR_TO_h=FORBIDDEN
MERGE_INTO_h=FORBIDDEN
MERGE_FROM_h=FORBIDDEN
REBASE_h_ON_OTHER_BRANCH=FORBIDDEN
AUTO_SYNC_h=FORBIDDEN
FORCE_PUSH_h=FORBIDDEN
BLIND_CHERRY_PICK_OF_OLD_STRUCTURE=FORBIDDEN
```

Normal fast-forward commits directly on `h` are the delivery mechanism.

## 2. Old branches are forensic sources, never baselines

Any historical branch may be read when it can reduce uncertainty:

```text
master
g
ocr
f
historical feature branches
other old refs
```

Allowed uses:

```text
COMPARE
TRACE HISTORY
RECOVER PROVEN LOST PRODUCT VALUE
UNDERSTAND OLD DATA/CONTRACT BEHAVIOR
FALSIFY CURRENT ASSUMPTIONS
EXAMINE REMOVED CAPABILITIES
```

Forbidden inference:

```text
OLD_BRANCH == BASELINE
OLD_BRANCH == CANONICAL_TRUTH
OLD_BRANCH == INTEGRATION_SOURCE
OLD_BRANCH_HEAD == EXECUTION_AUTHORITY
```

Value recovered from an old branch must re-earn canonical status and be reimplemented/recovered under the new owner; do not import historical structure merely because it contains useful behavior.

## 3. Exact-head write discipline

Before every coherent write batch:

```text
FETCH/RESOLVE REMOTE h
→ RECORD EXPECTED_REMOTE_H_SHA
→ READ/DIAGNOSE AGAINST THAT SHA
```

Immediately before moving the ref:

```text
RESOLVE ACTUAL_REMOTE_H_SHA
```

If:

```text
ACTUAL_REMOTE_H_SHA != EXPECTED_REMOTE_H_SHA
```

then:

```text
STOP THAT WRITE
→ INSPECT DELTA
→ INVALIDATE AFFECTED ASSUMPTIONS/EVIDENCE
→ RE-PIN
→ RE-DIAGNOSE
```

Never overwrite unseen work. Never force.

After push:

```text
VERIFY REMOTE h SHA
→ RE-PIN
```

## 4. Complete repository scope

The refoundation scope is every material tracked artifact on `h`, including but not limited to:

```text
PRODUCT CAPABILITIES / ACTORS / JOURNEYS / STATES / TRANSITIONS
DATABASES / SCHEMAS / TABLES / COLUMNS / INDEXES / CONSTRAINTS / POLICIES
MIGRATIONS / SEEDS / BACKFILLS / BOOTSTRAP
DOMAIN MODELS / SERVICES / USE CASES / HANDLERS / REPOSITORIES / JOBS
APIs / ROUTES / EVENTS / WEBHOOKS / COMMANDS
CONTRACTS / DTOs / ENUMs / GENERATED TYPES / CLIENTS / BINDINGS
FRONTEND DATA / STORES / CACHES / HOOKS / VIEW MODELS
COMPONENTS / SCREENS / NAVIGATION / FORMS / UX STATES
core/** / shared/** / services/** / packages/** / apps/**
runtime/** / config/** / infra/** / tools/** / scripts/** / .github/**
tests/** / fixtures/** / mocks/** / snapshots/**
DEPENDENCIES / WORKSPACES / LOCKFILE-RELEVANT AUTHORITIES
AUTHORITATIVE DOCUMENTATION WHEN IT DEFINES OPERATING TRUTH
REPOSITORY TOPOLOGY ITSELF
```

No path receives immunity from audit because it is named `core`, `shared`, `legacy`, `infra`, `generated`, `test`, `tool`, `docs` or similar.

## 5. Artifact survival law

The default for inherited material containers is:

```text
CURRENT_CONTAINER_DEFAULT=DOES_NOT_SURVIVE_UNLESS_PROVEN_CANONICAL
```

A surviving artifact must prove, as applicable:

```text
REQUIRED=TRUE
SEMANTICS_CORRECT=TRUE
UNIQUE_COHESIVE_RESPONSIBILITY=TRUE
CANONICAL_OWNER=TRUE
CANONICAL_WRITER_OR_DERIVED_ROLE=TRUE
CANONICAL_LOCATION=TRUE
CANONICAL_BOUNDARY=TRUE
NON_DUPLICATIVE=TRUE
NON_SHADOW=TRUE
NO_BETTER_CONSOLIDATION=TRUE
NO_OBSOLETE_COMPATIBILITY=TRUE
REQUIRED_BY_CANONICAL_BASELINE=TRUE
```

High-level dispositions are exactly:

```text
KEEP_PROVEN
PRESERVE_AND_REWIRE
REFOUND
MIGRATE_VALUE_THEN_DELETE
DELETE
BLOCKED_UNKNOWN
```

`BLOCKED_UNKNOWN` blocks closure; it is not `KEEP JUST IN CASE`.

## 6. Mutation authority

When `00` establishes the `h` refoundation mode, mutation authority includes all actions needed to realize the proven canonical target:

```text
DELETE / REWRITE / RESTRUCTURE / REHOME / RENAME / MERGE / SPLIT
COLLAPSE / CONSOLIDATE / REGENERATE / MIGRATE / BACKFILL
RECONCILE / CUT OVER / DECOMMISSION / REBUILD
```

Do not shrink a proven root to reduce diff size.

Safety constraints remain mandatory for:

```text
IRREVERSIBLE DATA
EXTERNAL CONSUMERS
SECURITY/TRUST
FINANCIAL STATE
MIGRATION/CUTOVER
GENERATED LINEAGE
LIVE RUNTIME
```

## 7. Concurrency

Only one overlapping material mutation root may be active.

Read-only work may run in parallel across independent discovery axes.

A large root may span multiple checkpoints/commits. Do not split it by file count, token count, model context, frontend/backend boundary or perceived size when one canonical cutover requires the whole cone.

Independent roots may be discovered while another is active but remain candidates until mutation authority is free.

## 8. GitHub Actions authority

On `h`, workflow creation/modification/deletion is permitted when it materially supports diagnosis, migration, proof or durable admission.

No workflow requires PR semantics merely because historical workflows did.

Campaign-only workflow residue must be zero at fixed point.

## 9. Human intent and precedence

Current explicit human intent may broaden or narrow execution only within repository safety and data-integrity constraints.

Precedence for this campaign:

```text
CURRENT EXPLICIT HUMAN INTENT
→ THIS ORCHESTRATOR PACKAGE
→ LIVE h IMPLEMENTATION/DATA/RUNTIME EVIDENCE
→ APPLICABLE DURABLE PRODUCT/SYSTEM TRUTH
→ FORENSIC HISTORICAL SOURCES
```

Historical plans/prompts/branches never override live proven truth or this package.

## 10. Assurance recursion outside the explicitly authorized h campaign

The broad refoundation authority above exists because the human owner explicitly authorized this `h` campaign.

Outside that explicit campaign, routine product work does not silently mutate the assurance control plane:

```text
HUMAN_ONLY
ASSURANCE_CONTROL_PLANE
FROZEN_FOR_NORMAL_PRODUCT_WORK
NO ASSURANCE RECURSION WITHOUT A UNIQUE MATERIAL CLAIM
```

These tokens are a boundary for unrelated normal work; they do not constrain the authorized `h` refoundation itself.
