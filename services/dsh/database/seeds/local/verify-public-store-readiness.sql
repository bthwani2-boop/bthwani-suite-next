-- Fail closed when local store fixtures no longer satisfy the same predicate
-- used by the public DSH store repository.

DO $$
DECLARE
  eligible_count INTEGER;
  incomplete_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO eligible_count
  FROM dsh_stores
  WHERE tenant_id = 'local-dsh'
    AND is_visible = true
    AND status = 'active'
    AND serviceability_status IN ('serviceable', 'limited')
    AND partner_readiness = 'ready'
    AND catalog_approval_status = 'approved'
    AND marketing_visibility = 'visible'
    AND cardinality(delivery_modes) > 0
    AND btrim(COALESCE(address_line, '')) <> ''
    AND btrim(COALESCE(coverage_summary, '')) <> ''
    AND btrim(COALESCE(operating_hours, '')) <> ''
    AND delivery_readiness = 'ready'
    AND btrim(COALESCE(hero_image_url, '')) <> ''
    AND btrim(COALESCE(logo_url, '')) <> '';

  IF eligible_count < 1 THEN
    RAISE EXCEPTION 'public store readiness verification failed: no eligible local stores';
  END IF;

  SELECT COUNT(*)
  INTO incomplete_count
  FROM dsh_stores
  WHERE tenant_id = 'local-dsh'
    AND status = 'active'
    AND is_visible = true
    AND partner_readiness = 'ready'
    AND catalog_approval_status = 'approved'
    AND marketing_visibility = 'visible'
    AND (
      btrim(COALESCE(address_line, '')) = ''
      OR btrim(COALESCE(coverage_summary, '')) = ''
      OR btrim(COALESCE(operating_hours, '')) = ''
      OR delivery_readiness <> 'ready'
      OR btrim(COALESCE(storefront_photo_ref, '')) = ''
      OR btrim(COALESCE(interior_photo_ref, '')) = ''
      OR btrim(COALESCE(signage_photo_ref, '')) = ''
    );

  IF incomplete_count <> 0 THEN
    RAISE EXCEPTION 'public store readiness verification failed: % governed visible stores are incomplete', incomplete_count;
  END IF;

  RAISE NOTICE 'public store readiness verification: % eligible local stores', eligible_count;
END
$$;
