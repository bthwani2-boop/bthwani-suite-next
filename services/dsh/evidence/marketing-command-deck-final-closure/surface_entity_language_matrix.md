# surface_entity_language_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
surface_entity_language_matrix:
  - surface: control-panel (MarketingDashboardScreen.tsx)
    language_used: "الشريك" (Partner) appears only in partner-offers tab labels and PARTNER_GATE_CARDS
      copy ("الشريك", "بوابة تفعيل الشريك") — correctly refers to partner-lifecycle readiness, not a
      Store being mislabeled as a Partner.
    result: PASS — no Partner/Store label confusion found.
  - surface: app-client
    language_used: n/a — dsh.marketing has no client-facing screen/copy at all (no read route exists,
      see entity_boundary_matrix.md); the only client-visible marketing-adjacent content is
      dsh.home-discovery's banners/promos, which is a different capability and already verified
      elsewhere.
    result: N/A (evidenced) — cannot violate a language rule on a surface it doesn't reach.
  - surface: app-partner
    language_used: n/a — same as app-client; no dsh.marketing read/write route reaches app-partner today.
    result: N/A (evidenced)
  - surface: app-captain / app-field
    language_used: n/a — confirmed zero references (see out_of_scope_justification_matrix.md).
    result: N/A (evidenced)
```
