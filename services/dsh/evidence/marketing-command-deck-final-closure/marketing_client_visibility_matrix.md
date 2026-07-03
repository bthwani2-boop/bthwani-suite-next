# marketing_client_visibility_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

Required checks per 10#31 failure_conditions ("any app-client that displays Store/product/category
content must use the same visibility gates"):

```yaml
marketing_client_visibility_matrix:
  - check: does app-client see draft/pending/paused/cancelled/deleted marketing content?
    finding: N/A — app-client has no read route into dsh_marketing_campaigns/banners/promos at all
      (confirmed via server.go route list), so it cannot see them in ANY state, published or not.
    result: N/A (evidenced), not a leak.
  - check: does app-client's actual banner/promo carousel (dsh.home-discovery) filter by is_active?
    finding: GET /dsh/home-discovery (live smoke, this pass) returned only active-looking banners/promos
      (banner-001/002, promo-001/002); ListBanners/ListPromos in homediscovery/repository.go were not
      re-read in full in this pass (out of the requested dsh.marketing scope — see
      out_of_scope_justification_matrix.md). Not re-verified as PASS/FAIL here; flagged as a
      cross-capability observation only.
    verification_command: curl -s http://localhost:58080/dsh/home-discovery
    result: OUT_OF_SCOPE (belongs to dsh.home-discovery's own evidence, not re-audited here).
  - check: does app-client see stores that are not client_visible?
    finding: not touched by this pass's code changes; dsh.marketing's own store-target gate (used only
      at campaign/banner/promo CREATE time, not by any client read path) independently enforces the
      same 6-condition check as store_client_visibility_gate_matrix elsewhere.
    result: PASS on the gate that exists; N/A on client-facing exposure (none exists for this capability).
```
