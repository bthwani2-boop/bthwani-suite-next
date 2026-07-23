-- Prove that an explicitly established server-side PostgreSQL tenant context
-- fills otherwise-missing root ownership without installing a schema default.

SELECT set_config('bthwani.tenant_id', 'schema-contract-tenant', TRUE);

INSERT INTO dsh_partners (
  id,
  legal_name_ar,
  legal_name_en,
  display_name,
  legal_identity_type,
  legal_identity_number,
  owner_name,
  primary_phone,
  secondary_phone,
  email,
  category,
  activation_status,
  created_by_actor_id,
  created_by_surface,
  notes,
  version
) VALUES (
  'prt_schema_tenant_context',
  'شريك اختبار سياق المستأجر',
  'Tenant Context Contract Partner',
  'شريك سياق المستأجر',
  'commercial_register',
  'SCHEMA-TENANT-CONTEXT-001',
  'Schema Contract',
  '+967770000901',
  '',
  'schema-tenant-context@local.test',
  'grocery',
  'draft',
  'schema-contract',
  'system',
  'trusted tenant session context contract',
  1
);

INSERT INTO dsh_stores (
  id,
  slug,
  display_name,
  status,
  city_code,
  service_area_code,
  serviceability_status,
  rating_average,
  rating_count,
  delivery_eta_min,
  delivery_eta_max,
  is_visible,
  hero_image_url,
  logo_url,
  catalog_domain_id,
  delivery_modes,
  is_free_delivery,
  distance_km,
  follower_count,
  has_pro_badge,
  has_coupon_badge,
  points_multiplier,
  is_popular,
  latitude,
  longitude
) VALUES (
  'store-schema-tenant-context',
  'schema-tenant-context-store',
  'متجر اختبار سياق المستأجر',
  'active',
  'sana',
  'schema-contract',
  'serviceable',
  4.50,
  1,
  10,
  20,
  FALSE,
  NULL,
  NULL,
  'domain-groceries',
  ARRAY['delivery']::TEXT[],
  FALSE,
  0,
  0,
  FALSE,
  FALSE,
  NULL,
  FALSE,
  15.3400000,
  44.1900000
);

DO $$
DECLARE
  partner_tenant TEXT;
  store_tenant TEXT;
BEGIN
  SELECT tenant_id INTO partner_tenant
  FROM dsh_partners
  WHERE id = 'prt_schema_tenant_context';

  SELECT tenant_id INTO store_tenant
  FROM dsh_stores
  WHERE id = 'store-schema-tenant-context';

  IF partner_tenant IS DISTINCT FROM 'schema-contract-tenant' THEN
    RAISE EXCEPTION 'trusted partner tenant context failed: %', COALESCE(partner_tenant, '<null>');
  END IF;

  IF store_tenant IS DISTINCT FROM 'schema-contract-tenant' THEN
    RAISE EXCEPTION 'trusted store tenant context failed: %', COALESCE(store_tenant, '<null>');
  END IF;
END
$$;

DELETE FROM dsh_stores WHERE id = 'store-schema-tenant-context';
DELETE FROM dsh_partners WHERE id = 'prt_schema_tenant_context';
