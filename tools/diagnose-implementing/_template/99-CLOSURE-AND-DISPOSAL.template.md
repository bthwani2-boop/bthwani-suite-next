# Closure and Disposal — TASK_NAME

> This package is disposable derived support. Closure of the implementation and safe deletion of the package are separate decisions and require separate evidence.

## 1. Final immutable baseline

```yaml
repository: bthwani2-boop/bthwani-suite-next
target_branch: TARGET_BRANCH
pinned_start_sha: PINNED_START_SHA
final_implementation_sha: REPLACE
final_verified_sha: REPLACE
package_cleanup_sha: null
```

The final verification SHA must contain every implementation change being claimed. Record any later branch movement and determine whether it invalidates evidence.

## 2. Scope reconciliation

| Metric | Planned | Actual | Open |
| --- | ---: | ---: | ---: |
| Inventory items | 0 | 0 | 0 |
| Findings | 0 | 0 | 0 |
| Work items | 0 | 0 | 0 |
| Verification items | 0 | 0 | 0 |
| Deletion candidates | 0 | 0 | 0 |
| External blockers | 0 | 0 | 0 |

Explain every difference between planned and actual scope. Newly discovered items must be registered; they cannot disappear from the final count.

## 3. Finding disposition

| Finding ID | Final decision | Implementation SHA | Verification IDs | Residual risk | External approval |
| --- | --- | --- | --- | --- | --- |
| FND-0001 | REPLACE | REPLACE | VER-0001 | REPLACE_OR_NONE | REPLACE_OR_NOT_APPLICABLE |

No finding may be marked closed from intent, code review alone, or an unrelated passing check.

## 4. Applicable evidence scopes

For each scope, use `PASS`, `NOT_APPLICABLE_WITH_REASON`, `NEEDS_EVIDENCE`, or the relevant block decision.

| Scope | Applicability | Result | SHA/reference | Authority | Limitation |
| --- | --- | --- | --- | --- | --- |
| Static | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Product | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Runtime | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Visual | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| QA | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Security | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Finance | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Isolation | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Governance | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| CI | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Release | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |
| Production | REPLACE | REPLACE | REPLACE | REPLACE | REPLACE |

A static pass must not be reused as evidence for another scope.

## 5. Zero gate

```yaml
open_findings: 0
unproven_items: 0
unclassified_inventory_items: 0
failed_required_checks: 0
unverified_required_behaviors: 0
findings_without_evidence: 0
findings_without_work_items: 0
work_items_without_acceptance_criteria: 0
work_items_without_verification: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unverified_deletions: 0
unresolved_internal_blockers: 0
unresolved_external_blockers: 0
unresolved_template_markers: 0
```

Any nonzero value forbids `CLOSED_WITH_EVIDENCE`.

## 6. Durable-output migration

Before package deletion, record where every durable result lives:

| Durable result | Canonical destination | Commit SHA | Verification | Package-only copy removed? |
| --- | --- | --- | --- | --- |
| Code | REPLACE | REPLACE | REPLACE | YES |
| Contract | REPLACE_OR_NOT_APPLICABLE | REPLACE | REPLACE | YES |
| Migration | REPLACE_OR_NOT_APPLICABLE | REPLACE | REPLACE | YES |
| Tests | REPLACE | REPLACE | REPLACE | YES |
| Maintainer documentation | REPLACE_OR_NOT_APPLICABLE | REPLACE | REPLACE | YES |
| Governance decision | REPLACE_OR_NOT_APPLICABLE | REPLACE | REPLACE | YES |
| External approval/evidence | REPLACE_OR_NOT_APPLICABLE | IMMUTABLE_REFERENCE | REPLACE | YES |

If a maintainer needs information after deletion, that information must be moved to its canonical owner first.

## 7. Package dependency prohibition proof

Confirm all are false and attach search evidence:

```yaml
runtime_imports_package: false
workspace_exports_package: false
compiler_includes_package: false
build_scripts_require_package: false
ci_workflows_require_package: false
guards_require_package: false
migrations_require_package: false
generated_code_uses_package: false
deployment_uses_package: false
operations_runbooks_require_package: false
governance_authority_depends_on_package: false
external_repository_files_reference_package: false
```

Required reference scans must exclude `.git`, dependency caches, and the package itself. Record the exact command, SHA, and result.

## 8. Sensitive-content check

Confirm the package contains none of the following:

- secrets, tokens, credentials, or private keys;
- production database dumps or unredacted logs;
- personal or payment data;
- provider credentials or signed URLs;
- private screenshots or attachments that must be retained elsewhere.

If sensitive material was ever committed, deleting the current files is insufficient; use the repository's approved incident and history-remediation process.

## 9. Deletion readiness checklist

- [ ] Implementation and verification are complete on the recorded immutable SHA.
- [ ] All findings have valid final dispositions.
- [ ] All applicable evidence scopes have explicit results.
- [ ] All durable outputs exist in canonical locations.
- [ ] No source, runtime, build, CI, migration, release, or operation depends on the package.
- [ ] Repository-wide reference scan passes.
- [ ] No package-only maintenance or rollback knowledge remains.
- [ ] No secrets, production data, or required external evidence will be lost.
- [ ] Git history is sufficient for historical reconstruction.
- [ ] The package will be removed in a dedicated cleanup commit.
- [ ] Relevant targeted checks will be rerun after removal when repository tooling could observe the directory.

## 10. Final decisions

```yaml
implementation_decision: REPLACE_WITH_CANONICAL_DECISION
disposal_decision: NOT_READY|READY_TO_DELETE|BLOCKED
remaining_risks: []
remaining_blockers: []
```

Use `CLOSED_WITH_EVIDENCE` only when every applicable scope and required authority satisfies the repository closure rules. `READY_TO_DELETE` means only that removing this task package will not damage the repository or erase the sole durable copy of required information.

## 11. Cleanup record

After deletion, record the cleanup commit outside the deleted package, such as in the final response, commit message, or authoritative work-tracking system:

```yaml
deleted_package: tools/diagnose-implementing/TASK_SLUG
cleanup_commit_sha: REPLACE
post_deletion_checks: []
result: PASS|FIX_REQUIRED
```
