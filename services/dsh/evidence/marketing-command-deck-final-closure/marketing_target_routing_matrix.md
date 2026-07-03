# marketing_target_routing_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_target_routing_matrix:
  - concern: does a bound target_type/target_id ever get resolved into client-facing routing/navigation?
    finding: no — since there is no client-facing read route for campaigns/banners/promos at all
      (see entity_boundary_matrix.md), target_type/target_id are written and gate-checked at CREATE
      time but never read back out for any actual client navigation. dsh_marketing_target_bindings
      exists and is written (WriteTargetBinding) but nothing queries it for routing.
    verification_command: rg -n "dsh_marketing_target_bindings" services/dsh/backend --include=*.go
    result: FIX_REQUIRED — target routing is write-only, not round-tripped to any consuming surface.
  - concern: dsh_marketing_impressions / dsh_marketing_clicks tables
    finding: created by migration dsh-017 but no Go code writes or reads them (rg found zero
      references outside the migration file itself).
    verification_command: rg -n "dsh_marketing_impressions|dsh_marketing_clicks" services/dsh/backend --include=*.go
    result: FIX_REQUIRED — dead schema (tables exist with no application code touching them).
```
