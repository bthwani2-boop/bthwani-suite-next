-- Captain-funded COD finalization is a canonical refundable terminal state.
-- Keep the refund reference trigger aligned with the payment-session contract;
-- the pre-cutover cod_collected state remains historical-only.
CREATE OR REPLACE FUNCTION wlt_validate_refund_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_operator_context_id TEXT;
  v_client_id TEXT;
  v_amount BIGINT;
  v_currency TEXT;
  v_status TEXT;
BEGIN
  SELECT operator_context_id, client_id, amount_minor_units, currency, status
    INTO v_operator_context_id, v_client_id, v_amount, v_currency, v_status
    FROM wlt_payment_sessions
   WHERE id = NEW.payment_session_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment session not found for refund';
  END IF;
  IF NEW.operator_context_id <> v_operator_context_id THEN
    RAISE EXCEPTION 'refund OperatorContext does not match payment session OperatorContext';
  END IF;
  IF NEW.client_id <> v_client_id THEN
    RAISE EXCEPTION 'refund client does not match payment session owner';
  END IF;
  IF v_status NOT IN ('captured','cod_finalized') THEN
    RAISE EXCEPTION 'payment session is not refundable';
  END IF;
  IF NEW.amount_minor_units <= 0 OR NEW.amount_minor_units > v_amount THEN
    RAISE EXCEPTION 'refund amount must be positive and not exceed the payment session amount';
  END IF;

  NEW.currency := COALESCE(NULLIF(v_currency,''), 'YER');
  NEW.reason := BTRIM(NEW.reason);
  RETURN NEW;
END;
$$;
