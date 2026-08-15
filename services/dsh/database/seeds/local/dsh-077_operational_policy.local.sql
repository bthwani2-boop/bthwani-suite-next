-- Local-only governed operational policy truth for canonical Sana'a service areas.
-- dsh-076 owns the spatial geofence. This seed supplies the operational zone,
-- SLA, capacity and fulfillment policies required by cart/checkout/order/dispatch.
-- Missing policy must stay fail-closed in product code; the local environment
-- therefore provisions the policy explicitly instead of bypassing the guard.

DO $$
DECLARE
    v_zone_id UUID;
    v_zone_count INTEGER;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'haddah' AS code, 'حدة' AS name, '00000000-0000-4000-8000-000000000077'::uuid AS static_id
        UNION ALL
        SELECT 'maeen', 'معين', '00000000-0000-4000-8000-000000001006'::uuid
        UNION ALL
        SELECT 'sabeen', 'السبعين', '00000000-0000-4000-8000-000000001002'::uuid
        UNION ALL
        SELECT 'taiz-st', 'شارع تعز', '00000000-0000-4000-8000-000000001003'::uuid
        UNION ALL
        SELECT 'zubairi', 'الزبيري', '00000000-0000-4000-8000-000000001004'::uuid
        UNION ALL
        SELECT 'old-city', 'المدينة القديمة', '00000000-0000-4000-8000-000000001005'::uuid
    ) LOOP
        SELECT COUNT(*)
        INTO v_zone_count
        FROM dsh_platform_zones
        WHERE lower(city_code) = lower(r.code);

        IF v_zone_count > 1 THEN
            SELECT id INTO v_zone_id FROM dsh_platform_zones WHERE lower(city_code) = lower(r.code) LIMIT 1;
        ELSIF v_zone_count = 0 THEN
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
                r.static_id,
                'تشغيل ' || r.name,
                r.code,
                TRUE,
                'Canonical local operational zone bound to the governed ' || r.name || ' service area.',
                1,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_zone_id;
        ELSE
            SELECT id
            INTO v_zone_id
            FROM dsh_platform_zones
            WHERE lower(city_code) = lower(r.code);

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
    END LOOP;
END;
$$;
