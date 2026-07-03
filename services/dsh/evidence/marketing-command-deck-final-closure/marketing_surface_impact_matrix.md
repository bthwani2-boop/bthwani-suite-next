# marketing_surface_impact_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_surface_impact_matrix:
  - surface: control-panel
    impact: full — MarketingDashboardScreen.tsx (11 tabs), routed at apps/control-panel/runtime/src/app/dsh/marketing/page.tsx.
    state: MIXED — campaigns tab API_BACKED_PASS; banners/promos tabs API_BACKED_PASS but against
      dsh.home-discovery, not dsh.marketing; visibility-gates tab partially local-only (bypass
      buttons + hardcoded operational metrics); 7 tabs DISABLED_WITH_BLOCKER (ticker, video-studio,
      partner-offers, benefits-subscriptions, growth, signals-measurement, image-product-review).
    evidence: MarketingCommandDecks.tsx, MarketingDashboardScreen.tsx (this pass), marketing-registry.ts.
  - surface: app-client
    impact: none proven — no client-facing read route exists for dsh_marketing_campaigns/banners/promos.
    state: FIX_REQUIRED (claim unproven, not silently assumed true).
    evidence: services/dsh/backend/internal/http/server.go (grep "operator/marketing" -> only operator routes).
  - surface: app-partner
    impact: none proven for campaigns/banners/promos (no partner-facing route). Partner-offer
      *submission* conceptually belongs to app-partner but usePartnerOffersController has no backend
      table yet, so there is nothing for app-partner to submit into today.
    state: FIX_REQUIRED
    evidence: same server.go grep; visibility_gate.go rejects target_type=offer explicitly.
  - surface: app-captain
    impact: none
    state: N/A (evidenced) — see out_of_scope_justification_matrix.md.
  - surface: app-field
    impact: none
    state: N/A (evidenced)
```
