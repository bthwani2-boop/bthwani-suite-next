-- J078 Operational Analytics Projections, Metrics Registry, and Detached SLA Alerts

-- 1. Metrics Registry
CREATE TABLE IF NOT EXISTS dsh_analytics_metrics_registry (
    metric_id VARCHAR(100) PRIMARY KEY,
    owner_domain VARCHAR(100) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    time_grain VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    aggregation_type VARCHAR(20) NOT NULL, -- 'count', 'sum', 'average', 'ratio'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Versioned Projections
CREATE TABLE IF NOT EXISTS dsh_analytics_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id VARCHAR(100) NOT NULL REFERENCES dsh_analytics_metrics_registry(metric_id),
    store_id UUID, -- NULL for platform-wide metrics
    partner_id UUID, -- NULL if platform-wide
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_value NUMERIC NOT NULL,
    sample_size INT NOT NULL DEFAULT 0, -- Used for data quality / minimum sample
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store category/status splits
    lineage_shas TEXT[] NOT NULL DEFAULT '{}', -- Traceability to processed event SHAs
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (metric_id, store_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_dsh_analytics_projections_period ON dsh_analytics_projections(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dsh_analytics_projections_store ON dsh_analytics_projections(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_analytics_projections_partner ON dsh_analytics_projections(partner_id) WHERE partner_id IS NOT NULL;

-- 3. Checkpoints for Backfill/Rebuild
CREATE TABLE IF NOT EXISTS dsh_analytics_checkpoints (
    projection_name VARCHAR(100) PRIMARY KEY,
    last_processed_id UUID,
    last_processed_timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Detached SLA Alerts
CREATE TABLE IF NOT EXISTS dsh_sla_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_type VARCHAR(50) NOT NULL, -- 'order', 'pickup_session', 'delivery_assignment'
    reference_id UUID NOT NULL,
    store_id UUID NOT NULL,
    partner_id UUID,
    alert_type VARCHAR(50) NOT NULL, -- 'preparation_overdue', 'pickup_due_soon'
    state VARCHAR(50) NOT NULL, -- 'active', 'acknowledged', 'resolved', 'paused'
    pause_reason TEXT,
    paused_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_dsh_sla_alerts_ref ON dsh_sla_alerts(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_dsh_sla_alerts_store_state ON dsh_sla_alerts(store_id, state);
CREATE INDEX IF NOT EXISTS idx_dsh_sla_alerts_partner ON dsh_sla_alerts(partner_id) WHERE partner_id IS NOT NULL;
