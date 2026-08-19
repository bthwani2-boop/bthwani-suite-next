-- Universal Commission Policies Seed
-- Idempotent inserts for field visit fees

INSERT INTO wlt_commission_policies (
    id, name, commission_type, description, status, calculation_type,
    amount_minor_units, currency, created_by_actor_id
)
VALUES (
    'cpol_field_visit_standard',
    'Standard Field Visit Fee',
    'field_visit_fee',
    'Standard commission applied for a successful field visit',
    'active',
    'fixed',
    1000, -- 10 YER
    'YER',
    'system'
)
ON CONFLICT (id) DO UPDATE SET
    amount_minor_units = EXCLUDED.amount_minor_units,
    status = 'active',
    updated_at = now();
