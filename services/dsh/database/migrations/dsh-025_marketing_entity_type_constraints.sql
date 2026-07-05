-- DSH-025: Expand marketing entity_type check constraints to include ticker and partner_offer.
-- This allows news tickers and partner-submitted offers to be audited, visibility-gated,
-- and tracked via the shared marketing governance tables.

ALTER TABLE dsh_marketing_audit_events
  DROP CONSTRAINT IF EXISTS dsh_marketing_audit_events_entity_type_check;
ALTER TABLE dsh_marketing_audit_events
  ADD CONSTRAINT dsh_marketing_audit_events_entity_type_check
  CHECK (entity_type IN ('campaign', 'banner', 'promo', 'ticker', 'partner_offer'));

ALTER TABLE dsh_marketing_visibility_gates
  DROP CONSTRAINT IF EXISTS dsh_marketing_visibility_gates_entity_type_check;
ALTER TABLE dsh_marketing_visibility_gates
  ADD CONSTRAINT dsh_marketing_visibility_gates_entity_type_check
  CHECK (entity_type IN ('campaign', 'banner', 'promo', 'ticker', 'partner_offer'));

ALTER TABLE dsh_marketing_target_bindings
  DROP CONSTRAINT IF EXISTS dsh_marketing_target_bindings_entity_type_check;
ALTER TABLE dsh_marketing_target_bindings
  ADD CONSTRAINT dsh_marketing_target_bindings_entity_type_check
  CHECK (entity_type IN ('campaign', 'banner', 'promo', 'ticker', 'partner_offer'));

ALTER TABLE dsh_marketing_impressions
  DROP CONSTRAINT IF EXISTS dsh_marketing_impressions_entity_type_check;
ALTER TABLE dsh_marketing_impressions
  ADD CONSTRAINT dsh_marketing_impressions_entity_type_check
  CHECK (entity_type IN ('campaign', 'banner', 'promo', 'ticker', 'partner_offer'));

ALTER TABLE dsh_marketing_clicks
  DROP CONSTRAINT IF EXISTS dsh_marketing_clicks_entity_type_check;
ALTER TABLE dsh_marketing_clicks
  ADD CONSTRAINT dsh_marketing_clicks_entity_type_check
  CHECK (entity_type IN ('campaign', 'banner', 'promo', 'ticker', 'partner_offer'));
