# marketing_captain_field_impact_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_captain_field_impact_matrix:
  - surface: app-captain
    check: commercial leakage (marketing content, campaign data, offer pricing) reaching captain surface
    finding: one incidental match — ModernPremiumHeader.tsx has a generic status `tickerBanner` style
      (an unrelated in-app status strip, not a marketing/promo banner); zero real references to
      campaign/promo/marketing content otherwise.
    verification_command: rg -rlni "marketing|campaign|banner|promo" services/dsh/frontend/app-captain
    result: PASS (N/A, evidenced) — no commercial leakage; the one hit is a false-positive keyword match.
  - surface: app-field
    check: publish / activation / client-visibility decision made from field surface
    finding: zero references to marketing/campaign/banner/promo in services/dsh/frontend/app-field
    verification_command: rg -rln "marketing|campaign|banner|promo" services/dsh/frontend/app-field
    result: PASS (N/A, evidenced) — no leakage, no activation authority found.
```
