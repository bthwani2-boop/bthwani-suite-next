-- DSH-099 / JRN-007 S8: a client-home impression is counted once per
-- content item and view-session reference. Clicks remain repeatable user actions.

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_home_marketing_impression_view
  ON dsh_marketing_impressions(entity_type, entity_id, surface, viewer_ref)
  WHERE viewer_ref IS NOT NULL
    AND surface = 'app-client'
    AND entity_type IN ('banner','promo');

COMMENT ON INDEX uq_dsh_home_marketing_impression_view IS
  'Prevents duplicate JRN-007 impressions for one banner/promo in one client view session.';
