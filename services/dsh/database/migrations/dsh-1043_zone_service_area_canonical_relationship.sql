-- dsh-1043_zone_service_area_canonical_relationship.sql
-- Closes the dual meaning between DSH Service Area and Operational Zone.
-- dsh_platform_zones.city_code was the legacy persisted name for the service-area
-- binding of a zone; this migration renames it to service_area_code, binds it to the
-- canonical service-area owner (dsh_service_area_geofences) by foreign key, enforces
-- exactly one operational zone per service area, and backfills historical audit and
-- idempotency payloads to the canonical vocabulary. The store-level and workforce-level
-- city concepts are independent truths and are not touched.

BEGIN;

-- 1. Normalize existing zone bindings to the canonical geofence casing so the
--    exact-match foreign key can validate deterministically.
UPDATE dsh_platform_zones z
SET city_code = (
    SELECT g.service_area_code
    FROM dsh_service_area_geofences g
    WHERE lower(g.service_area_code) = lower(z.city_code)
    ORDER BY g.service_area_code
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM dsh_service_area_geofences g
    WHERE lower(g.service_area_code) = lower(z.city_code)
      AND g.service_area_code <> z.city_code
);

-- 2. Pre-flight inventory: an unresolved relationship is not proof that a
--    zone or any dependent policy is dead. Fail the migration before the
--    canonical rename rather than deleting operational truth. Any cleanup of
--    genuinely obsolete rows must be a separately governed migration with an
--    explicit owner, consumer inventory, and zero-reachability proof.
DO $$
DECLARE
    unresolved_zones integer;
BEGIN
    SELECT COUNT(*) INTO unresolved_zones
    FROM dsh_platform_zones z
    WHERE NOT EXISTS (
        SELECT 1 FROM dsh_service_area_geofences g
        WHERE lower(g.service_area_code) = lower(z.city_code)
    );
    IF unresolved_zones > 0 THEN
        RAISE EXCEPTION 'dsh-1043 requires explicit canonical mapping; % zone rows are unresolved and no data will be deleted', unresolved_zones;
    END IF;
END $$;

-- 3. Canonical rename.
ALTER TABLE dsh_platform_zones
    RENAME COLUMN city_code TO service_area_code;

-- 4. Replace the legacy length constraint under its canonical name.
ALTER TABLE dsh_platform_zones
    DROP CONSTRAINT IF EXISTS dsh_platform_zones_city_code_length;

ALTER TABLE dsh_platform_zones
    ADD CONSTRAINT dsh_platform_zones_service_area_length
    CHECK (char_length(btrim(service_area_code)) BETWEEN 1 AND 80) NOT VALID;

ALTER TABLE dsh_platform_zones
    VALIDATE CONSTRAINT dsh_platform_zones_service_area_length;

-- 5. Drop obsolete legacy indexes.
DROP INDEX IF EXISTS idx_dsh_zones_city;
DROP INDEX IF EXISTS idx_dsh_zones_active;
DROP INDEX IF EXISTS uq_dsh_platform_zones_city_name;
DROP INDEX IF EXISTS idx_dsh_platform_zones_active_city;

-- 6. Enforce exactly one operational zone per service area. The former runtime
--    ambiguity fail-closed guard becomes a persistence invariant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_platform_zones_service_area
    ON dsh_platform_zones(lower(service_area_code));

CREATE INDEX IF NOT EXISTS idx_dsh_platform_zones_active_service_area
    ON dsh_platform_zones(is_active, service_area_code, name);

-- 7. Explicit constrained relationship from the canonical service-area owner.
ALTER TABLE dsh_platform_zones
    ADD CONSTRAINT dsh_platform_zones_service_area_fk
    FOREIGN KEY (service_area_code)
    REFERENCES dsh_service_area_geofences(service_area_code)
    ON DELETE RESTRICT NOT VALID;

ALTER TABLE dsh_platform_zones
    VALIDATE CONSTRAINT dsh_platform_zones_service_area_fk;

-- 8. Backfill historical zone audit payloads to the canonical vocabulary so
--    rollback restores without compatibility shims. Casing is normalized to the
--    canonical geofence value when resolvable.
UPDATE dsh_platform_policy_events e
SET payload = (e.payload - 'cityCode'::text)
    || jsonb_build_object(
        'serviceAreaCode',
        COALESCE((
            SELECT g.service_area_code
            FROM dsh_service_area_geofences g
            WHERE lower(g.service_area_code) = lower(e.payload->>'cityCode')
            ORDER BY g.service_area_code
            LIMIT 1
        ), lower(e.payload->>'cityCode'))
    )
WHERE e.aggregate_type = 'zone'
  AND e.payload ? 'cityCode'::text;

-- 9. Backfill stored idempotency replay bodies for zone mutations.
UPDATE dsh_platform_policy_mutation_results m
SET response_body = jsonb_set(
    m.response_body,
    '{zone}',
    ((m.response_body -> 'zone'::text) - 'cityCode'::text)
        || jsonb_build_object(
            'serviceAreaCode',
            COALESCE((
                SELECT g.service_area_code
                FROM dsh_service_area_geofences g
                WHERE lower(g.service_area_code) = lower(m.response_body #>> '{zone,cityCode}')
                ORDER BY g.service_area_code
                LIMIT 1
            ), lower(m.response_body #>> '{zone,cityCode}'))
        )
)
WHERE m.response_body #> '{zone}' ? 'cityCode'::text;

COMMIT;
