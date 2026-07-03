# out_of_scope_justification_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
out_of_scope_justification_matrix:
  - path_or_scope: core/identity/backend
    reason: Marketing Command Deck does not modify identity/session/auth logic; only consumes it via auth.Client.Resolve.
    evidence: rg -n "identity" services/dsh/backend/internal/marketing -> no matches
    verification_command: rg -n "identity" services/dsh/backend/internal/marketing
    impact_if_skipped: none — identity backend guard (07 core\identity\backend go test/build) not run since journey does not touch it.
    decision: OUT_OF_SCOPE
  - path_or_scope: services/wlt (financial/wallet)
    reason: dsh.marketing has no financial mutation; confirmed by guard-no-financial-mutation-outside-wlt PASS.
    evidence: verification-output.md, guard-no-financial-mutation-outside-wlt result
    verification_command: node tools/guards/no-financial-mutation-outside-wlt.mjs (or pwsh journey-gate step)
    impact_if_skipped: none
    decision: OUT_OF_SCOPE
  - path_or_scope: app-captain, app-field
    reason: capability-map.ts lists dsh.marketing surfaces as control-panel/app-client/app-partner only; captain/field have no marketing screens.
    evidence: "rg -rn \"marketing\" services/dsh/frontend/app-captain services/dsh/frontend/app-field" -> no matches
    verification_command: rg -rln "marketing" services/dsh/frontend/app-captain services/dsh/frontend/app-field
    impact_if_skipped: none — no commercial leakage or publish/activation decision surface exists in either app for this capability; see marketing_captain_field_impact_matrix.md for the explicit N/A-with-evidence record required by 31.
    decision: OUT_OF_SCOPE (N/A, evidenced)
  - path_or_scope: dsh.home-discovery capability (its own already-verified evidence folder)
    reason: this pass documents the discovered overlap (control-panel banners/promos tabs call
      dsh.home-discovery, not dsh.marketing) but does NOT re-audit or re-close dsh.home-discovery
      itself — that capability already has its own verified evidence and is out of the requested
      journey scope (Marketing Command Deck).
    evidence: services/dsh/evidence/Home Discovery-client-home-discovery (pre-existing, unmodified)
    verification_command: (n/a — read-only cross-reference)
    impact_if_skipped: the product decision of which system (home-discovery vs marketing) should
      own banners/promos going forward is left open; see zero_defect_closure_matrix.md.
    decision: OUT_OF_SCOPE for re-verification; IN_SCOPE for the cross-reference finding itself.
```
