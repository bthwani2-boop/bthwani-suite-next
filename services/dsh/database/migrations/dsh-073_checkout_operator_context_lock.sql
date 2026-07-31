-- DSH-073: OperatorContext-lock checkout intents, WLT payment events, and orders.
--
-- Legacy rows remain nullable when no trustworthy OperatorContext source exists. New
-- checkout intents and orders must always carry a non-empty authenticated
-- OperatorContext. No synthetic/default OperatorContext is introduced.

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_checkout_intents intent
SET operator_context_id = source.operator_context_id
FROM (
    SELECT checkout_intent_id, MIN(funding_operator_context_id) AS operator_context_id
    FROM dsh_coupon_redemptions
    WHERE btrim(COALESCE(funding_operator_context_id,'')) <> ''
    GROUP BY checkout_intent_id
    HAVING COUNT(DISTINCT funding_operator_context_id) = 1
) source
WHERE source.checkout_intent_id = intent.id
  AND intent.operator_context_id IS NULL;

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_operator_context_id_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_operator_context_id_chk
    CHECK (operator_context_id IS NULL OR btrim(operator_context_id) <> '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_checkout_OperatorContext_payment_session
    ON dsh_checkout_intents(operator_context_id,wlt_payment_session_id)
    WHERE operator_context_id IS NOT NULL AND btrim(wlt_payment_session_id) <> '';
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_OperatorContext_client
    ON dsh_checkout_intents(operator_context_id,client_id,created_at DESC)
    WHERE operator_context_id IS NOT NULL;

CREATE OR REPLACE FUNCTION dsh_guard_checkout_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
            RAISE EXCEPTION 'operator_context_id is required for every new checkout intent'
                USING ERRCODE = '23514';
        END IF;
    ELSE
        IF OLD.operator_context_id IS NOT NULL AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
            RAISE EXCEPTION 'checkout operator_context_id is immutable'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
            RAISE EXCEPTION 'checkout operator_context_id cannot be cleared'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_checkout_OperatorContext ON dsh_checkout_intents;
CREATE TRIGGER trg_dsh_guard_checkout_OperatorContext
BEFORE INSERT OR UPDATE OF operator_context_id ON dsh_checkout_intents
FOR EACH ROW EXECUTE FUNCTION dsh_guard_checkout_OperatorContext();

ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_orders orders
SET operator_context_id = intent.operator_context_id
FROM dsh_checkout_intents intent
WHERE intent.id = orders.checkout_intent_id
  AND intent.operator_context_id IS NOT NULL
  AND orders.operator_context_id IS NULL;

ALTER TABLE dsh_orders
    DROP CONSTRAINT IF EXISTS dsh_orders_operator_context_id_chk;
ALTER TABLE dsh_orders
    ADD CONSTRAINT dsh_orders_operator_context_id_chk
    CHECK (operator_context_id IS NULL OR btrim(operator_context_id) <> '');

CREATE INDEX IF NOT EXISTS idx_dsh_orders_OperatorContext_client
    ON dsh_orders(operator_context_id,client_id,created_at DESC)
    WHERE operator_context_id IS NOT NULL;

CREATE OR REPLACE FUNCTION dsh_assign_and_guard_order_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    checkout_OperatorContext TEXT;
BEGIN
    SELECT operator_context_id INTO checkout_OperatorContext
    FROM dsh_checkout_intents
    WHERE id = NEW.checkout_intent_id
    FOR SHARE;

    IF checkout_OperatorContext IS NULL OR btrim(checkout_OperatorContext) = '' THEN
        RAISE EXCEPTION 'order requires a OperatorContext-locked checkout intent'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.operator_context_id IS NOT NULL AND NEW.operator_context_id <> checkout_OperatorContext THEN
            RAISE EXCEPTION 'order OperatorContext does not match checkout OperatorContext'
                USING ERRCODE = '23514';
        END IF;
        NEW.operator_context_id := checkout_OperatorContext;
    ELSIF NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
        RAISE EXCEPTION 'order operator_context_id is immutable'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assign_order_OperatorContext ON dsh_orders;
CREATE TRIGGER trg_dsh_assign_order_OperatorContext
BEFORE INSERT OR UPDATE OF operator_context_id,checkout_intent_id ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_assign_and_guard_order_OperatorContext();
