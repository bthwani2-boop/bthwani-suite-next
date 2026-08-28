-- DSH-1050: one canonical operational incident per actor-scoped command.
-- The same correlation may replay only for the same order and actor; payload
-- collision is rejected by the incident service before any consequence runs.

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_operational_incidents_actor_command
    ON dsh_operational_incidents (order_id, actor_id, correlation_id)
    WHERE correlation_id IS NOT NULL AND btrim(correlation_id) <> '';
