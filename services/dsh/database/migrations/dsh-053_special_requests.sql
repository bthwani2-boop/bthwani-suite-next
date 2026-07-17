-- dsh-053_special_requests.sql

BEGIN;

DO $$ BEGIN
    CREATE TYPE dsh_special_request_type AS ENUM ('SHEIN_ASSISTED_PURCHASE', 'AWNAK_ERRAND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dsh_special_request_status AS ENUM ('submitted', 'under_review', 'needs_customer_input', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS dsh_special_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    request_type dsh_special_request_type NOT NULL,
    status dsh_special_request_status NOT NULL DEFAULT 'submitted',
    
    customer_notes TEXT,
    currency VARCHAR(3),
    estimated_amount_reference VARCHAR(255),
    
    product_url TEXT,
    quantity INT,
    size VARCHAR(50),
    color VARCHAR(50),
    variant_notes TEXT,
    delivery_address_reference VARCHAR(255),
    
    pickup_address_reference VARCHAR(255),
    dropoff_address_reference VARCHAR(255),
    pickup_location JSONB,
    dropoff_location JSONB,
    item_type VARCHAR(50),
    schedule_mode VARCHAR(20),
    scheduled_at TIMESTAMPTZ,
    handling_requirements TEXT,
    
    assigned_operator_id UUID,
    dispatch_assignment_id UUID,
    correlation_id VARCHAR(255),
    idempotency_key VARCHAR(255),
    rejection_reason TEXT,
    
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    CONSTRAINT chk_shein_fields CHECK (
        request_type != 'SHEIN_ASSISTED_PURCHASE' OR 
        (product_url IS NOT NULL AND quantity > 0)
    ),
    CONSTRAINT chk_awnak_fields CHECK (
        request_type != 'AWNAK_ERRAND' OR 
        ((pickup_address_reference IS NOT NULL OR pickup_location IS NOT NULL) AND 
         (dropoff_address_reference IS NOT NULL OR dropoff_location IS NOT NULL))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_special_req_idemp ON dsh_special_requests (client_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_special_req_client ON dsh_special_requests (client_id);
CREATE INDEX IF NOT EXISTS idx_dsh_special_req_status ON dsh_special_requests (status);
CREATE INDEX IF NOT EXISTS idx_dsh_special_req_type ON dsh_special_requests (request_type);

-- Fix legacy 'node-shay-in' if it exists to be the canonical 'shein'
UPDATE dsh_catalog_nodes 
SET id = 'node-shein', slug = 'shein', name_ar = 'شي ان', name_en = 'SHEIN'
WHERE id = 'node-shay-in' OR slug = 'shay_in';

COMMIT;
