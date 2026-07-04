# 14 — Extraction and Screen Inventory

Status: CANONICAL
Stage: PHASE_10_11_EXTRACTION_AND_SCREEN_INVENTORY

## Purpose

Define the canonical inventory of donor artifacts, target ownership, control-panel
pages, mobile journeys, and screen states before capability-journey implementation.

## Extraction schema

`machine-readable/extraction_matrix.csv` uses schema v2:

```text
record_id,source_path,target_path,target_anchor,fragment_id,owner,service,section,
surface,consumer_surfaces,capability,slice_id,integration_scope,layer,artifact_type,
imports,runtime_data,api_binding,db_dependency,auth_dependency,wlt_dependency,
ui_kit_compliance,test_coverage,evidence,decision,action,risk,rollback,status,next_action
```

`target_anchor` distinguishes contract paths, components, and control-panel
sections that share a target file or directory. `fragment_id` is unique per row
and prevents harmful duplicate target fragments.

## Inventory truth

- The donor repository is a read-only reference.
- A donor path is not target runtime truth.
- Target ownership must be one of the canonical service or shared owners.
- `dsh-wlt` is an integration scope or journey family, never a service owner.
- `platform` belongs to `core`.
- Financial truth belongs to `wlt`.
- Shared frontend rows use `surface=shared` and declare consumers.
- Screen and route targets are plans only until implemented by their owning journey.

## Current gate

The normalized inventory does not authorize Store Discovery implementation. Store
Discovery remains blocked until its service-owned API and domain entry gate pass.

Current result after REPAIR_PHASE_10_11_FINAL_LOGIC_AND_METADATA_CONSISTENCY:

```text
PHASE_10_11_MATRICES_CONSISTENT_NOT_JOURNEY_READY
```

## Pre-journey gate rules

The following rules from `governance/15_MATRIX_NORMALIZATION_RULES.md` are
enforced as hard gates before any journey execution begins:

- Core identity must not target DSH paths
- SPEC journey segment must match journey_id exactly
- operations-support is not a valid executable capability — split into operations-room or support-queue/support-entry
- WLT Refund Status must have at least 5 direct WLT logic rows (refund-status)
- WLT Settlement Status must have at least 4 direct WLT logic rows (settlement-status-read)
- Administration must have at least 4 support-entry logic rows (client, partner, captain, field)
- Marketing api_contract must reference Partner Onboarding & Store Publication, not Notifications
- settlement-status-read is the canonical capability name (not settlement-read-model)
- commission-cod-reference must be split into commission-reference, cod-reference, or wallet-finance-summary
- Control-panel target_path must use section folder (not capability folder)
- screen_state_coverage_matrix.csv must include section column; all control-panel rows must declare a non-empty section
- ADOPT_AS_IS requires explicit target verification evidence
- No row may reach READY_FOR_JOURNEY during the final consistency repair

## Next gate

```text
Store Discovery_CONTRACT_AND_DOMAIN_READINESS
```

Store Discovery becomes READY_FOR_JOURNEY only after an independent step approves:
GET /dsh/stores, GET /dsh/stores/{storeId}, store domain, store DB schema, and
store auth/serviceability rules.

## Acceptance condition

Accepted only when schema v2 is present, ownership and journey normalization pass,
all mobile/control-panel targets have screen-state coverage, forbidden paths and
service owners are absent, all pre-journey gate rules pass, and the foundation gate passes.

