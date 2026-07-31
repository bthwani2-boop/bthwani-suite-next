--  database invariant proof for dsh-910.
BEGIN;

DO $$
DECLARE
    checkout_id UUID := gen_random_uuid();
    store_key TEXT;
BEGIN
    SELECT id INTO store_key FROM dsh_stores ORDER BY created_at NULLS LAST, id LIMIT 1;
    IF store_key IS NULL THEN
        RAISE EXCEPTION ' database test requires an official seeded store';
    END IF;

    INSERT INTO dsh_checkout_intents (
        id, operator_context_id, client_id, cart_id, store_id, fulfillment_mode,
        state, payment_method, wlt_payment_session_id
    ) VALUES (
        checkout_id, 'OperatorContext-test', 'client-test', gen_random_uuid(),
        store_key, 'pickup', 'payment_pending', 'wallet', 'wlt-session-test'
    );

    INSERT INTO dsh_checkout_wlt_event_receipts (
        event_key, operator_context_id, checkout_intent_id, payment_session_id,
        wlt_status, payload_hash, correlation_id
    ) VALUES (
        'evt-0000000000000001', 'OperatorContext-test', checkout_id,
        'wlt-session-test', 'captured', repeat('a', 64), 'corr-'
    );

    BEGIN
        INSERT INTO dsh_checkout_wlt_event_receipts (
            event_key, operator_context_id, checkout_intent_id, payment_session_id,
            wlt_status, payload_hash
        ) VALUES (
            'evt-0000000000000002', 'another-OperatorContext', checkout_id,
            'wlt-session-test', 'captured', repeat('b', 64)
        );
        RAISE EXCEPTION 'OperatorContext mismatch was not rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO dsh_checkout_wlt_event_receipts (
            event_key, operator_context_id, checkout_intent_id, payment_session_id,
            wlt_status, payload_hash
        ) VALUES (
            'evt-0000000000000003', 'OperatorContext-test', checkout_id,
            'different-session', 'captured', repeat('c', 64)
        );
        RAISE EXCEPTION 'payment-session mismatch was not rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO dsh_checkout_wlt_event_receipts (
            event_key, operator_context_id, checkout_intent_id, payment_session_id,
            wlt_status, payload_hash
        ) VALUES (
            'evt-0000000000000001', 'OperatorContext-test', checkout_id,
            'wlt-session-test', 'captured', repeat('d', 64)
        );
        RAISE EXCEPTION 'duplicate event key was not rejected';
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;
END;
$$;

ROLLBACK;
