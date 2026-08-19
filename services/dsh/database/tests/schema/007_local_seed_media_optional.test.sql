-- Local seed media is an optional runtime overlay, not a DSH schema prerequisite.

DO $dsh_optional_media_contract$
DECLARE
  hero_not_null BOOLEAN;
  logo_not_null BOOLEAN;
  readiness_definition TEXT;
  discovery_index_definition TEXT;
BEGIN
  SELECT attnotnull
    INTO hero_not_null
  FROM pg_attribute
  WHERE attrelid = 'dsh_stores'::regclass
    AND attname = 'hero_image_url'
    AND NOT attisdropped;

  SELECT attnotnull
    INTO logo_not_null
  FROM pg_attribute
  WHERE attrelid = 'dsh_stores'::regclass
    AND attname = 'logo_url'
    AND NOT attisdropped;

  IF hero_not_null IS DISTINCT FROM FALSE OR logo_not_null IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION
      'store media projections must be nullable: hero_not_null=% logo_not_null=%',
      hero_not_null, logo_not_null;
  END IF;

  SELECT pg_get_viewdef('dsh_partner_store_readiness_v'::regclass, TRUE)
    INTO readiness_definition;
  IF readiness_definition ILIKE '%hero_image_url%'
     OR readiness_definition ILIKE '%logo_url%' THEN
    RAISE EXCEPTION
      'store readiness view must not require optional local seed media';
  END IF;

  SELECT indexdef
    INTO discovery_index_definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'idx_dsh_stores_public_discovery_gate';

  IF discovery_index_definition IS NULL THEN
    RAISE EXCEPTION 'public discovery gate index is missing';
  END IF;

  IF discovery_index_definition ILIKE '%hero_image_url%'
     OR discovery_index_definition ILIKE '%logo_url%' THEN
    RAISE EXCEPTION
      'public discovery gate index must not require optional local seed media';
  END IF;
END
$dsh_optional_media_contract$;
