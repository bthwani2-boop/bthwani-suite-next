# 02_VERIFICATION_CLOSURE_SCHEMA

This schema defines how a journey is verified and closed.

```yaml
schema: verification_closure
version: 1.0
sections:
  numeric_gate:
    unbound_controls: 0
    contract_mismatches: 0
    permission_mismatches: 0
    failed_required_checks: 0
    unresolved_internal_gaps: 0
    duplicate_truth_owners: 0
    runtime_journeys_unverified: 0
  live_code_closure:
    docs_only_changes_allowed_for_closure: false
    governance_only_changes_allowed_for_closure: false
    diagnostics_only_changes_allowed_for_closure: false
    checklist_only_changes_allowed_for_closure: false
    generated_output_only_changes_allowed_for_closure: false
  zero_defect_checks: []
  frontend_backend_acceptance: []
  final_decision:
    result: 
    reason:
    remaining_external_blockers: []
```
