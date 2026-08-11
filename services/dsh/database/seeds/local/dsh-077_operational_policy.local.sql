-- Local-only governed operational policy truth for the canonical Haddah runtime fixture.
-- dsh-076 owns the spatial geofence. This seed supplies the operational zone,
-- SLA, capacity and fulfillment policies required by cart/checkout/order/dispatch.
-- Missing policy must stay fail-closed in product code; the local environment
-- therefore provisions the policy explicitly instead of bypassing the guard.

DO $$
DECLARE
    v_zone_id UUID;
    v_zone_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM dsh_service_area_geofences
        WHERE service_area_code = 'haddah'
          AND active = TRUE
    ) THEN
        RAISE EXCEPTION 'DSH_LOCAL_OPERATIONAL_POLICY_MISSING_SERVICE_AREA haddah';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_stores
        WHERE id = 'store-test-grocery'
          AND lower(service_area_code) = 'haddah'
          AND status = 'published'
          AND is_visible = TRUE
    ) THEN
        RAISE EXCEPTION 'DSH_LOCAL_OPERATIONAL_POLICY_STORE_DRIFT store-test-grocery must be published in haddah';
    END IF;

    SELECT COUNT(*)
    INTO v_zone_count
    FROM dsh_platform_zones
    WHERE lower(city_code) = 'haddah';

    IF v_zone_count > 1 THEN
        RAISE EXCEPTION 'DSH_LOCAL_OPERATIONAL_POLICY_AMBIGUOUS haddah has % operational zones', v_zone_count;
    END IF;

    IF v_zone_count = 0 THEN
        INSERT INTO dsh_platform_zones (
            id,
            name,
            city_code,
            is_active,
            description,
            version,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-4000-8000-000000000077'::uuid,
            'تشغيل حدة',
            'haddah',
            TRUE,
            'Canonical local operational zone bound to the governed Haddah service area.',
            1,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_zone_id;
    ELSE
        SELECT id
        INTO v_zone_id
        FROM dsh_platform_zones
        WHERE lower(city_code) = 'haddah';

        UPDATE dsh_platform_zones
        SET is_active = TRUE,
            updated_at = CASE WHEN is_active IS DISTINCT FROM TRUE THEN NOW() ELSE updated_at END,
            version = CASE WHEN is_active IS DISTINCT FROM TRUE THEN version + 1 ELSE version END
        WHERE id = v_zone_id;
    END IF;

    INSERT INTO dsh_platform_sla_rules (
        zone_id,
        category,
        max_prep_mins,
        max_assignment_mins,
        max_delivery_mins,
        version,
        updated_by,
        created_at,
        updated_at
    ) VALUES (
        v_zone_id,
        'default',
        20,
        10,
        45,
        1,
        'seed:dsh-077-local-operational-policy',
        NOW(),
        NOW()
    )
    ON CONFLICT (zone_id, category) DO UPDATE
    SET max_prep_mins = EXCLUDED.max_prep_mins,
        max_assignment_mins = EXCLUDED.max_assignment_mins,
        max_delivery_mins = EXCLUDED.max_delivery_mins,
        updated_by = EXCLUDED.updated_by,
        version = dsh_platform_sla_rules.version + 1,
        updated_at = NOW()
    WHERE dsh_platform_sla_rules.max_prep_mins IS DISTINCT FROM EXCLUDED.max_prep_mins
       OR dsh_platform_sla_rules.max_assignment_mins IS DISTINCT FROM EXCLUDED.max_assignment_mins
       OR dsh_platform_sla_rules.max_delivery_mins IS DISTINCT FROM EXCLUDED.max_delivery_mins;

    INSERT INTO dsh_platform_capacity_configs (
        zone_id,
        max_concurrent_orders,
        max_captains_online,
        throttle_threshold,
        is_paused,
        pause_reason,
        version,
        updated_by,
        created_at,
        updated_at
    ) VALUES (
        v_zone_id,
        100,
        30,
        0.8,
        FALSE,
        '',
        1,
        'seed:dsh-077-local-operational-policy',
        NOW(),
        NOW()
    )
    ON CONFLICT (zone_id) DO UPDATE
    SET max_concurrent_orders = EXCLUDED.max_concurrent_orders,
        max_captains_online = EXCLUDED.max_captains_online,
        throttle_threshold = EXCLUDED.throttle_threshold,
        is_paused = EXCLUDED.is_paused,
        pause_reason = EXCLUDED.pause_reason,
        updated_by = EXCLUDED.updated_by,
        version = dsh_platform_capacity_configs.version + 1,
        updated_at = NOW()
    WHERE dsh_platform_capacity_configs.max_concurrent_orders IS DISTINCT FROM EXCLUDED.max_concurrent_orders
       OR dsh_platform_capacity_configs.max_captains_online IS DISTINCT FROM EXCLUDED.max_captains_online
       OR dsh_platform_capacity_configs.throttle_threshold IS DISTINCT FROM EXCLUDED.throttle_threshold
       OR dsh_platform_capacity_configs.is_paused IS DISTINCT FROM EXCLUDED.is_paused
       OR dsh_platform_capacity_configs.pause_reason IS DISTINCT FROM EXCLUDED.pause_reason;

    INSERT INTO dsh_platform_delivery_mode_policies (
        zone_id,
        fulfillment_mode,
        is_enabled,
        sla_category,
        version,
        updated_by,
        created_at,
        updated_at
    )
    SELECT
        v_zone_id,
        mode.fulfillment_mode,
        TRUE,
        'default',
        1,
        'seed:dsh-077-local-operational-policy',
        NOW(),
        NOW()
    FROM (
        VALUES
            ('bthwani_delivery'),
            ('partner_delivery'),
            ('client_pickup')
    ) AS mode(fulfillment_mode)
    ON CONFLICT (zone_id, fulfillment_mode) DO UPDATE
    SET is_enabled = EXCLUDED.is_enabled,
        sla_category = EXCLUDED.sla_category,
        updated_by = EXCLUDED.updated_by,
        version = dsh_platform_delivery_mode_policies.version + 1,
        updated_at = NOW()
    WHERE dsh_platform_delivery_mode_policies.is_enabled IS DISTINCT FROM EXCLUDED.is_enabled
       OR dsh_platform_delivery_mode_policies.sla_category IS DISTINCT FROM EXCLUDED.sla_category;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_platform_zones z
        JOIN dsh_platform_sla_rules sla
          ON sla.zone_id = z.id AND sla.category = 'default'
        JOIN dsh_platform_capacity_configs capacity
          ON capacity.zone_id = z.id
        WHERE z.id = v_zone_id
          AND z.is_active = TRUE
          AND lower(z.city_code) = 'haddah'
          AND sla.max_prep_mins = 20
          AND sla.max_assignment_mins = 10
          AND sla.max_delivery_mins = 45
          AND capacity.max_concurrent_orders = 100
          AND capacity.max_captains_online = 30
          AND capacity.throttle_threshold = 0.8
          AND capacity.is_paused = FALSE
    ) THEN
        RAISE EXCEPTION 'DSH_LOCAL_OPERATIONAL_POLICY_PROFILE_INVALID haddah';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM dsh_platform_delivery_mode_policies
        WHERE zone_id = v_zone_id
          AND is_enabled = TRUE
          AND sla_category = 'default'
          AND fulfillment_mode IN ('bthwani_delivery', 'partner_delivery', 'client_pickup')
    ) <> 3 THEN
        RAISE EXCEPTION 'DSH_LOCAL_OPERATIONAL_POLICY_MODES_INVALID haddah';
    END IF;
END;
$$;
