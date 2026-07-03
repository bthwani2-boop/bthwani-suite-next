# marketing_control_panel_sections_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

Per-tab closure state for MarketingDashboardScreen.tsx, using the three protocol-legal end states:
API_BACKED_PASS | DISABLED_WITH_BLOCKER | REMOVED_AS_DEAD_SCOPE.

```yaml
marketing_control_panel_sections_matrix:
  - tab: campaigns
    state: API_BACKED_PASS
    evidence: CampaignsCommandDeck -> useCampaignsController -> /dsh/operator/marketing/campaigns;
      fresh HTTP smoke create/archive PASS (dsh-marketing-http-smoke.txt); 4 DB integration tests PASS.
  - tab: banners-carousel
    state: API_BACKED_PASS (but against dsh.home-discovery, not dsh.marketing — see marketing_surface_impact_matrix.md)
    evidence: MarketingHomeDiscoveryPanel(kind="banners") -> useHomeDiscoveryAdminController -> dsh_home_banners.
  - tab: homepage-promos
    state: API_BACKED_PASS (same caveat — dsh.home-discovery, not dsh.marketing)
    evidence: MarketingHomeDiscoveryPanel(kind="promos") -> dsh_home_promos.
  - tab: smart-bar (ticker)
    state: DISABLED_WITH_BLOCKER
    evidence: useTickersController isBackedByApi:false; TickerCommandDeck disables save/toggle/remove; NotBackedNotice shown.
  - tab: video-studio
    state: DISABLED_WITH_BLOCKER
    evidence: useVideosController isBackedByApi:false; same pattern.
  - tab: partner-offers
    state: DISABLED_WITH_BLOCKER
    evidence: usePartnerOffersController isBackedByApi:false; ValidateTarget rejects target_type=offer server-side too.
  - tab: image-product-review
    state: DISABLED_WITH_BLOCKER
    evidence: useCatalogReviewController isBackedByApi:false; load() always returns empty list.
  - tab: benefits-subscriptions (loyalty)
    state: DISABLED_WITH_BLOCKER
    evidence: useLoyaltyController isBackedByApi:false; multiplier/tier buttons disabled.
  - tab: growth
    state: DISABLED_WITH_BLOCKER
    evidence: useGrowthController isBackedByApi:false; same pattern.
  - tab: signals-measurement
    state: FIX_REQUIRED (not fully DISABLED_WITH_BLOCKER)
    evidence: useVisibilityGatesController.isBackedByApi is false and NotBackedNotice IS shown, but the
      literal numbers rendered in SignalsMeasurementCommandDeck ("4.85★", "2,450 طلب", "94.2%", "2 طلب")
      are hardcoded JSX, not even reading the hook's own `metrics` object — a second, undisclosed
      layer of fake data sitting behind the disclosed one. Not fixed in this pass (scope: rewiring to
      real delivery/rating queries is a backend + frontend change, not a comment/label fix).
    verification_command: rg -n "4.85|2,450|94.2%" services/dsh/frontend/control-panel/marketing/MarketingCommandDecks.tsx
  - tab: visibility-gates (main dashboard tab, not the "signals-measurement" deck above)
    state: FIX_REQUIRED
    evidence: PARTNER_GATE_CARDS / PRODUCT_GATE_CARDS "تجاوز البوابة"/"تجاوز الموانع" buttons call only
      local setBypassedGates state in MarketingDashboardScreen.tsx — no governance API call. Also the
      top-of-page KPI strip (buildMarketingKpiMetrics) was previously silently hardcoded; fixed in this
      pass to carry isBackedByApi:false + a rendered disclosure, but the underlying numbers are still
      static placeholders, not live.
    verification_command: rg -n "setBypassedGates" services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx
  - tab: review-queue / video-review (sub-tabs of visibility-gates)
    state: FIX_REQUIRED
    evidence: MARKETING_SUB_TABS registered (review-queue, video-review) but MarketingDashboardScreen.tsx
      never renders any content conditioned on `subTab` — the sub-tab buttons render and can be
      clicked but produce no visible change. Newly discovered in this pass.
    verification_command: rg -n "subTab" services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx
```
