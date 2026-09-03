--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--




--
-- Name: wlt_assert_checkout_session_quote_binding(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_assert_checkout_session_quote_binding() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  quote_matches boolean;
BEGIN
  IF NEW.checkout_intent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- WLT-927 explicitly marked pre-existing rows as historical bindings. They
  -- cannot be re-created by a new insert and remain readable/updatable only
  -- for non-financial lifecycle state changes.
  IF NEW.pricing_quote_id LIKE 'legacy-checkout-quote:%' THEN
    IF TG_OP = 'UPDATE' AND OLD.pricing_quote_id = NEW.pricing_quote_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'new checkout payment sessions require a canonical WLT pricing quote';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_checkout_pricing_quotes q
    WHERE q.id = NEW.pricing_quote_id
      AND q.operator_context_id = NEW.operator_context_id
      AND q.checkout_intent_id = NEW.checkout_intent_id
      AND q.client_id = NEW.client_id
      AND q.store_id = NEW.store_id
      AND q.cart_snapshot_hash = NEW.cart_snapshot_hash
      AND q.quote_hash = NEW.pricing_quote_hash
      AND q.quote_version = NEW.pricing_quote_version
      AND q.expires_at = NEW.pricing_quote_expires_at
      AND q.total_minor_units = NEW.amount_minor_units
      AND q.currency = NEW.currency
      AND q.expires_at > NOW()
  ) INTO quote_matches;

  IF NOT quote_matches THEN
    RAISE EXCEPTION 'checkout payment session must match an unexpired immutable WLT pricing quote';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION wlt_assert_checkout_session_quote_binding(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_assert_checkout_session_quote_binding() IS 'Rejects payment-session checkout quote bindings unless every financial field matches WLT immutable quote truth.';


--
-- Name: wlt_assert_payment_allocation_conserved(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_assert_payment_allocation_conserved() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  target_session   text;
  session_amount   bigint;
  session_currency text;
  allocated        bigint;
  component_count  int;
  mismatched       int;
BEGIN
  target_session := COALESCE(NEW.payment_session_id, OLD.payment_session_id);

  SELECT amount_minor_units, currency
    INTO session_amount, session_currency
  FROM wlt_payment_sessions
  WHERE id = target_session;

  -- The session itself is gone in this transaction; there is no total left to
  -- conserve against and the foreign key already governs that case.
  IF session_amount IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sum(amount_minor_units), 0), count(*)
    INTO allocated, component_count
  FROM wlt_payment_allocation_components
  WHERE payment_session_id = target_session;

  -- Allocation is optional. Recording none is not a violation; recording an
  -- incomplete set is.
  IF component_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO mismatched
  FROM wlt_payment_allocation_components
  WHERE payment_session_id = target_session
    AND currency <> session_currency;

  IF mismatched > 0 THEN
    RAISE EXCEPTION
      'WLT-908: payment allocation for session % has % component(s) in a currency other than the governed session currency %',
      target_session, mismatched, session_currency;
  END IF;

  IF allocated <> session_amount THEN
    RAISE EXCEPTION
      'WLT-908: payment allocation for session % sums to % but the governed session total is %',
      target_session, allocated, session_amount;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: wlt_assert_wallet_projection_identity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_assert_wallet_projection_identity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_wallet record;
  raw_balance bigint;
  canonical_balance bigint;
  restricted_balance bigint;
  expected_available bigint;
  has_open_exception boolean;
BEGIN
  -- A deferred trigger can be queued by an intermediate row version. Validate
  -- the row that exists now rather than transient NEW values.
  SELECT * INTO current_wallet
  FROM wlt_wallets
  WHERE operator_context_id = NEW.operator_context_id
    AND actor_type = NEW.actor_type
    AND actor_id = NEW.actor_id;

  IF NOT FOUND OR current_wallet.operator_context_id = 'legacy-unscoped' THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_wallet_projection_reconciliation_exceptions e
    WHERE e.operator_context_id = current_wallet.operator_context_id
      AND e.actor_type = current_wallet.actor_type
      AND e.actor_id = current_wallet.actor_id
      AND e.currency = current_wallet.currency
      AND e.status = 'open'
  ) INTO has_open_exception;

  IF has_open_exception THEN
    IF current_wallet.status <> 'frozen' THEN
      RAISE EXCEPTION
        'wallet with open projection reconciliation exception must remain frozen for %/%/%',
        current_wallet.operator_context_id, current_wallet.actor_type,
        current_wallet.actor_id;
    END IF;
    RETURN NULL;
  END IF;

  IF current_wallet.pending_balance_minor_units < 0
     OR current_wallet.held_balance_minor_units < 0
     OR COALESCE(current_wallet.cod_reserved_balance_minor_units, 0) < 0
     OR COALESCE(current_wallet.collateral_reserved_balance_minor_units, 0) < 0
     OR COALESCE(current_wallet.wallet_reserved_balance_minor_units, 0) < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units
  INTO raw_balance
  FROM wlt_ledger_accounts
  WHERE operator_context_id = current_wallet.operator_context_id
    AND account_type = 'wallet'
    AND actor_type = current_wallet.actor_type
    AND actor_id = current_wallet.actor_id
    AND currency = current_wallet.currency;

  canonical_balance := COALESCE(-raw_balance, 0);
  restricted_balance :=
      current_wallet.pending_balance_minor_units
    + current_wallet.held_balance_minor_units
    + COALESCE(current_wallet.cod_reserved_balance_minor_units, 0)
    + COALESCE(current_wallet.collateral_reserved_balance_minor_units, 0)
    + COALESCE(current_wallet.wallet_reserved_balance_minor_units, 0);
  expected_available := canonical_balance - restricted_balance;

  IF current_wallet.available_balance_minor_units <> expected_available THEN
    RAISE EXCEPTION
      'wallet projection drift: available % but canonical-minus-restricted is % for %/%/%',
      current_wallet.available_balance_minor_units, expected_available,
      current_wallet.operator_context_id, current_wallet.actor_type,
      current_wallet.actor_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: wlt_bind_reconciliation_case_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_bind_reconciliation_case_operatorcontext() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  session_operator_context_id text;
BEGIN
  SELECT operator_context_id
  INTO session_operator_context_id
  FROM wlt_payment_sessions
  WHERE id = NEW.payment_session_id;

  IF session_operator_context_id IS NULL OR btrim(session_operator_context_id) = '' THEN
    RAISE EXCEPTION 'reconciliation payment session OperatorContext is missing'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
    NEW.operator_context_id := session_operator_context_id;
  ELSIF NEW.operator_context_id <> session_operator_context_id THEN
    RAISE EXCEPTION 'reconciliation OperatorContext does not own payment session'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;


--
-- Name: wlt_bind_refund_reference_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_bind_refund_reference_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  resolved_context text;
  context_count integer;
BEGIN
  IF NEW.operator_context_id IS NOT NULL AND btrim(NEW.operator_context_id) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT min(operator_context_id), count(DISTINCT operator_context_id)
    INTO resolved_context, context_count
  FROM wlt_refunds
  WHERE order_id = NEW.order_id;

  IF context_count <> 1 OR resolved_context IS NULL OR btrim(resolved_context) = '' THEN
    RAISE EXCEPTION 'financial reference operator context is ambiguous or missing for order %', NEW.order_id;
  END IF;

  NEW.operator_context_id := resolved_context;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_capture_payout_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_capture_payout_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  event_name text;
  transition_actor_id text;
  transition_actor_type text;
  transition_correlation text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  event_name := CASE NEW.status
    WHEN 'approved' THEN 'payout.approved'
    WHEN 'rejected' THEN 'payout.rejected'
    WHEN 'provider_pending' THEN 'payout.provider_pending'
    WHEN 'provider_result_unknown' THEN 'payout.provider_unknown'
    WHEN 'processing' THEN 'payout.processing'
    WHEN 'completed' THEN 'payout.completed'
    WHEN 'failed' THEN 'payout.failed'
    ELSE NULL
  END;
  IF event_name IS NULL THEN
    RETURN NEW;
  END IF;

  transition_actor_id := COALESCE(
    NULLIF(NEW.completed_by_operator_id, ''),
    NULLIF(NEW.failed_by_operator_id, ''),
    NULLIF(NEW.processed_by_operator_id, ''),
    NULLIF(NEW.rejected_by_operator_id, ''),
    NULLIF(NEW.approved_by_operator_id, ''),
    NULLIF(NEW.operator_id, ''),
    NEW.beneficiary_actor_id
  );
  transition_actor_type := CASE
    WHEN transition_actor_id = NEW.beneficiary_actor_id
      THEN NEW.beneficiary_actor_type
    ELSE 'operator'
  END;
  transition_correlation := COALESCE(
    NULLIF(NEW.idempotency_key, ''),
    'payout:' || NEW.id || ':' || NEW.status
  );

  IF NEW.status = 'provider_result_unknown'
     AND NEW.reconciliation_status = 'not_required' THEN
    NEW.reconciliation_status := 'required';
  END IF;

  INSERT INTO wlt_payout_audit_events
    (operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type,
     reason, correlation_id, metadata)
  VALUES (
    NEW.operator_context_id, 'payout_request', NEW.id, event_name,
    transition_actor_id, transition_actor_type,
    COALESCE(NEW.failure_reason, ''), transition_correlation,
    jsonb_build_object(
      'previousStatus', OLD.status,
      'status', NEW.status,
      'payoutDestinationId', NEW.payout_destination_id,
      'providerReference', COALESCE(NEW.provider_reference, ''),
      'providerStatus', COALESCE(NEW.provider_status, '')
    )
  );

  RETURN NEW;
END;
$$;


--
-- Name: wlt_capture_reconciliation_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_capture_reconciliation_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  audit_event_type text;
  audit_actor_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    audit_event_type := 'opened';
    audit_actor_id := NULL;
  ELSIF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    audit_event_type := 'resolved';
    audit_actor_id := NEW.resolved_by_operator_id;
  ELSIF NEW.assigned_to_operator_id IS DISTINCT FROM OLD.assigned_to_operator_id THEN
    audit_event_type := CASE WHEN OLD.assigned_to_operator_id IS NULL THEN 'assigned' ELSE 'reassigned' END;
    audit_actor_id := NEW.assigned_to_operator_id;
  ELSIF NEW.investigation_note IS DISTINCT FROM OLD.investigation_note THEN
    audit_event_type := 'investigation_updated';
    audit_actor_id := NEW.assigned_to_operator_id;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO wlt_cod_reconciliation_audit_events
    (operator_context_id, reconciliation_case_id, cod_record_id, event_type,
     from_status, to_status, actor_id, metadata)
  VALUES
    (NEW.operator_context_id, NEW.id, NEW.cod_record_id, audit_event_type,
     CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
     NEW.status, audit_actor_id,
     jsonb_build_object(
       'custodyEvidenceId', NEW.custody_evidence_id,
       'differenceMinorUnits', NEW.difference_minor_units,
       'currency', NEW.currency,
       'investigationNote', NEW.investigation_note,
       'resolutionAction', NEW.resolution_action,
       'resolutionNote', NEW.resolution_note
     ));
  RETURN NEW;
END
$$;


--
-- Name: wlt_derive_wallet_available_from_ledger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_derive_wallet_available_from_ledger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  raw_balance bigint;
  canonical_balance bigint;
  restricted_balance bigint;
  has_open_exception boolean;
BEGIN
  IF NEW.operator_context_id = 'legacy-unscoped' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_wallet_projection_reconciliation_exceptions e
    WHERE e.operator_context_id = NEW.operator_context_id
      AND e.actor_type = NEW.actor_type
      AND e.actor_id = NEW.actor_id
      AND e.currency = NEW.currency
      AND e.status = 'open'
  ) INTO has_open_exception;

  IF has_open_exception THEN
    NEW.status := 'frozen';
    RETURN NEW;
  END IF;

  IF NEW.pending_balance_minor_units < 0
     OR NEW.held_balance_minor_units < 0
     OR COALESCE(NEW.cod_reserved_balance_minor_units, 0) < 0
     OR COALESCE(NEW.collateral_reserved_balance_minor_units, 0) < 0
     OR COALESCE(NEW.wallet_reserved_balance_minor_units, 0) < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units
  INTO raw_balance
  FROM wlt_ledger_accounts
  WHERE operator_context_id = NEW.operator_context_id
    AND account_type = 'wallet'
    AND actor_type = NEW.actor_type
    AND actor_id = NEW.actor_id
    AND currency = NEW.currency;

  canonical_balance := COALESCE(-raw_balance, 0);
  restricted_balance :=
      NEW.pending_balance_minor_units
    + NEW.held_balance_minor_units
    + COALESCE(NEW.cod_reserved_balance_minor_units, 0)
    + COALESCE(NEW.collateral_reserved_balance_minor_units, 0)
    + COALESCE(NEW.wallet_reserved_balance_minor_units, 0);

  NEW.available_balance_minor_units := canonical_balance - restricted_balance;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_commercial_product_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_commercial_product_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.display_name,
            OLD.price_minor_units,
            OLD.currency,
            OLD.billing_cycle
       ) IS DISTINCT FROM ROW(
            NEW.display_name,
            NEW.price_minor_units,
            NEW.currency,
            NEW.billing_cycle
       ) THEN
        RAISE EXCEPTION 'active WLT commercial product terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent WLT commercial product approval is required'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_loyalty_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_loyalty_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.operator_context_id <> OLD.operator_context_id THEN
    RAISE EXCEPTION 'loyalty OperatorContext ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_payment_reconciliation_resolution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_payment_reconciliation_resolution() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    payment_status TEXT;
BEGIN
    IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved'
       AND NEW.operation IN ('authorize', 'capture') THEN
        IF NEW.resolution_action NOT IN ('confirmed_success', 'confirmed_failed') THEN
            RAISE EXCEPTION 'payment reconciliation requires a confirmed provider resolution action'
                USING ERRCODE = '23514';
        END IF;

        SELECT status
        INTO payment_status
        FROM wlt_payment_sessions
        WHERE id = NEW.payment_session_id;

        IF payment_status IS NULL OR payment_status NOT IN ('authorized', 'captured', 'failed', 'expired') THEN
            RAISE EXCEPTION 'payment reconciliation cannot resolve before canonical payment transition (status=%)', payment_status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_payment_session_terminal_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_payment_session_terminal_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status IN ('captured', 'cod_finalized', 'failed', 'expired')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'payment session terminal status cannot transition from %', OLD.status
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION wlt_guard_payment_session_terminal_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_guard_payment_session_terminal_status() IS 'WLT payment-session terminal outcomes are final; contradictory outcomes fail closed.';


--
-- Name: wlt_guard_promotion_funding_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_promotion_funding_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF ROW(
        NEW.operator_context_id,
        NEW.external_reference,
        NEW.checkout_intent_id,
        NEW.coupon_redemption_id,
        NEW.coupon_id,
        NEW.client_id,
        NEW.partner_id,
        NEW.platform_funded_minor_units,
        NEW.partner_funded_minor_units,
        NEW.total_discount_minor_units,
        NEW.currency,
        NEW.idempotency_key
    ) IS DISTINCT FROM ROW(
        OLD.operator_context_id,
        OLD.external_reference,
        OLD.checkout_intent_id,
        OLD.coupon_redemption_id,
        OLD.coupon_id,
        OLD.client_id,
        OLD.partner_id,
        OLD.platform_funded_minor_units,
        OLD.partner_funded_minor_units,
        OLD.total_discount_minor_units,
        OLD.currency,
        OLD.idempotency_key
    ) THEN
        RAISE EXCEPTION 'promotion funding identity and split are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status = NEW.status THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    IF OLD.status = 'reserved' AND NEW.status NOT IN ('committed', 'released') THEN
        RAISE EXCEPTION 'invalid promotion funding transition from reserved'
            USING ERRCODE = '23514';
    ELSIF OLD.status = 'committed' AND NEW.status <> 'reversed' THEN
        RAISE EXCEPTION 'invalid promotion funding transition from committed'
            USING ERRCODE = '23514';
    ELSIF OLD.status IN ('released', 'reversed') THEN
        RAISE EXCEPTION 'terminal promotion funding reservation cannot transition'
            USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_subscription_compensation_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_subscription_compensation_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'completed'
       AND ROW(NEW.status, NEW.refund_reference, NEW.amount_minor_units, NEW.currency) IS DISTINCT FROM
           ROW(OLD.status, OLD.refund_reference, OLD.amount_minor_units, OLD.currency) THEN
        RAISE EXCEPTION 'completed subscription compensation is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.subscription_id <> OLD.subscription_id
       OR NEW.client_id <> OLD.client_id
       OR NEW.payment_session_id <> OLD.payment_session_id
       OR NEW.amount_minor_units <> OLD.amount_minor_units
       OR NEW.currency <> OLD.currency THEN
        RAISE EXCEPTION 'subscription compensation source identity is immutable'
            USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_subscription_lifecycle_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_subscription_lifecycle_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.client_id <> OLD.client_id
       OR NEW.product_reference <> OLD.product_reference
       OR COALESCE(NEW.subscription_purchase_id, '') <> COALESCE(OLD.subscription_purchase_id, '')
       OR COALESCE(NEW.payment_session_id::TEXT, '') <> COALESCE(OLD.payment_session_id::TEXT, '') THEN
        RAISE EXCEPTION 'subscription identity and activation evidence are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status IN ('cancelled', 'expired')
       AND ROW(NEW.status, NEW.ends_at, NEW.cancel_at_period_end) IS DISTINCT FROM
           ROW(OLD.status, OLD.ends_at, OLD.cancel_at_period_end) THEN
        RAISE EXCEPTION 'cancelled or expired subscription lifecycle is terminal'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.ends_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN
        RAISE EXCEPTION 'subscription end must remain after start'
            USING ERRCODE = '23514';
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: wlt_guard_subscription_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_guard_subscription_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.operator_context_id <> OLD.operator_context_id THEN
    RAISE EXCEPTION 'subscription OperatorContext ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_normalize_wallet_ledger_actor_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_normalize_wallet_ledger_actor_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.account_type = 'wallet' THEN
    IF NEW.actor_type = 'customer' THEN
      NEW.actor_type := 'client';
    END IF;
    IF NEW.actor_type IS NULL
       OR NEW.actor_id IS NULL
       OR NEW.actor_type NOT IN ('client', 'partner', 'captain', 'field') THEN
      RAISE EXCEPTION 'unsupported canonical wallet actor_type %', NEW.actor_type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_prevent_ledger_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_prevent_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Ledger records are immutable. Post a new reversal or adjustment transaction instead of mutating.';
END;
$$;


--
-- Name: wlt_refresh_wallet_from_cod_reservation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_from_cod_reservation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, 'captain', OLD.captain_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, 'captain', NEW.captain_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: wlt_refresh_wallet_from_commission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_from_commission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, OLD.beneficiary_actor_type,
      OLD.beneficiary_actor_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, NEW.beneficiary_actor_type,
      NEW.beneficiary_actor_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: wlt_refresh_wallet_from_payment_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_from_payment_session() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, 'client', OLD.client_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, 'client', NEW.client_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: wlt_refresh_wallet_from_payout(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_from_payout() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, OLD.beneficiary_actor_type,
      OLD.beneficiary_actor_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, NEW.beneficiary_actor_type,
      NEW.beneficiary_actor_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: wlt_refresh_wallet_projection(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_projection(p_operator_context_id text, p_actor_type text, p_actor_id text, p_currency text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_pending bigint := 0;
  v_earned bigint := 0;
  v_settled bigint := 0;
  v_held bigint := 0;
  v_paid bigint := 0;
  v_cod_reserved bigint := 0;
  v_wallet_reserved bigint := 0;
BEGIN
  IF btrim(COALESCE(p_operator_context_id, '')) = ''
     OR btrim(COALESCE(p_actor_type, '')) = ''
     OR btrim(COALESCE(p_actor_id, '')) = ''
     OR btrim(COALESCE(p_currency, '')) = '' THEN
    RAISE EXCEPTION 'wallet projection identity is incomplete';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN c.status IN (
      'pending', 'confirmed', 'earned_pending_review',
      'approved_pending_posting', 'posted_pending_settlement', 'held'
    ) THEN c.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.status <> 'rejected' THEN c.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.status = 'settled' THEN c.amount_minor_units ELSE 0 END), 0)
  INTO v_pending, v_earned, v_settled
  FROM wlt_commissions c
  WHERE c.operator_context_id = p_operator_context_id
    AND c.beneficiary_actor_type = p_actor_type
    AND c.beneficiary_actor_id = p_actor_id
    AND c.currency = p_currency;

  SELECT
    COALESCE(SUM(CASE WHEN p.status IN (
      'pending', 'approved', 'processing', 'provider_pending',
      'provider_result_unknown', 'verified'
    ) THEN p.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount_minor_units ELSE 0 END), 0)
  INTO v_held, v_paid
  FROM wlt_payout_requests p
  WHERE p.operator_context_id = p_operator_context_id
    AND p.beneficiary_actor_type = p_actor_type
    AND p.beneficiary_actor_id = p_actor_id
    AND p.currency = p_currency;

  SELECT COALESCE(SUM(r.amount_minor_units), 0)
  INTO v_cod_reserved
  FROM wlt_cod_reservations r
  WHERE r.operator_context_id = p_operator_context_id
    AND r.captain_id = p_actor_id
    AND p_actor_type = 'captain'
    AND r.currency = p_currency
    AND r.status = 'reserved';

  SELECT COALESCE(SUM(s.wallet_amount_minor_units), 0)
  INTO v_wallet_reserved
  FROM wlt_payment_sessions s
  WHERE s.operator_context_id = p_operator_context_id
    AND s.client_id = p_actor_id
    AND p_actor_type = 'client'
    AND s.currency = p_currency
    AND s.wallet_amount_minor_units IS NOT NULL
    AND s.wallet_amount_minor_units > 0
    AND s.status IN (
      'reference_created', 'pending_provider', 'authorization_pending',
      'authorized', 'capture_pending', 'cod_pending', 'provider_result_unknown'
    );

  UPDATE wlt_wallets
  SET pending_balance_minor_units = v_pending,
      earned_total_minor_units = v_earned,
      settled_total_minor_units = v_settled,
      held_balance_minor_units = v_held,
      paid_total_minor_units = v_paid,
      cod_reserved_balance_minor_units = v_cod_reserved,
      wallet_reserved_balance_minor_units = v_wallet_reserved,
      updated_at = now()
  WHERE operator_context_id = p_operator_context_id
    AND actor_type = p_actor_type
    AND actor_id = p_actor_id
    AND currency = p_currency;
END;
$$;


--
-- Name: FUNCTION wlt_refresh_wallet_projection(p_operator_context_id text, p_actor_type text, p_actor_id text, p_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_refresh_wallet_projection(p_operator_context_id text, p_actor_type text, p_actor_id text, p_currency text) IS 'Sole materialization path for workflow wallet buckets; source truth is domain rows plus canonical ledger projection, refreshed by deferred source triggers.';


--
-- Name: wlt_refresh_wallet_projection_from_ledger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_refresh_wallet_projection_from_ledger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.account_type <> 'wallet'
     OR NEW.operator_context_id = 'legacy-unscoped' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM wlt_wallets w
    WHERE w.operator_context_id = NEW.operator_context_id
      AND w.actor_type = NEW.actor_type
      AND w.actor_id = NEW.actor_id
      AND w.currency <> NEW.currency
  ) THEN
    RAISE EXCEPTION
      'canonical wallet currency % conflicts with materialized wallet currency for %/%/%',
      NEW.currency, NEW.operator_context_id, NEW.actor_type, NEW.actor_id;
  END IF;

  INSERT INTO wlt_wallets (
    operator_context_id, actor_id, actor_type, status, currency,
    last_ledger_entry_at
  )
  VALUES (
    NEW.operator_context_id, NEW.actor_id, NEW.actor_type, 'active',
    NEW.currency, now()
  )
  ON CONFLICT (operator_context_id, actor_type, actor_id)
  DO UPDATE SET
    last_ledger_entry_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION wlt_refresh_wallet_projection_from_ledger(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_refresh_wallet_projection_from_ledger() IS 'Refreshes wallet materialization from canonical ledger accounts at transaction close so workflow source-row transitions and ledger reversals are evaluated together.';


--
-- Name: wlt_reject_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'WLT COD reconciliation audit events are immutable';
END
$$;


--
-- Name: wlt_reject_checkout_pricing_quote_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_checkout_pricing_quote_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'canonical checkout pricing quotes are immutable';
END;
$$;


--
-- Name: wlt_reject_checkout_tender_allocation_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_checkout_tender_allocation_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.checkout_intent_id IS NOT NULL
     AND (OLD.wallet_amount_minor_units IS DISTINCT FROM NEW.wallet_amount_minor_units
       OR OLD.cash_on_delivery_amount_minor_units IS DISTINCT FROM NEW.cash_on_delivery_amount_minor_units) THEN
    RAISE EXCEPTION 'WLT-932: checkout tender allocation is immutable';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_reject_custody_evidence_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_custody_evidence_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'WLT COD custody evidence is immutable';
END
$$;


--
-- Name: wlt_reject_daily_close_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_daily_close_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'daily finance close records are immutable'
    USING ERRCODE = 'P0001';
END;
$$;


--
-- Name: wlt_reject_duplicate_reconciliation_claim(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_duplicate_reconciliation_claim() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.reconciliation_status = 'inquiry_pending'
     AND NEW.reconciliation_status = 'inquiry_pending' THEN
    RAISE EXCEPTION
      'payout reconciliation is already in progress for %', NEW.id
      USING ERRCODE = '55P03';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION wlt_reject_duplicate_reconciliation_claim(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_reject_duplicate_reconciliation_claim() IS 'Rejects a duplicate payout-provider inquiry claim while reconciliation is already in progress.';


--
-- Name: wlt_reject_external_statement_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_external_statement_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'authoritative external statement artifacts and lines are immutable';
END
$$;


--
-- Name: wlt_reject_legacy_cod_custody_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_legacy_cod_custody_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION
    'legacy COD custody relation % is read-only after captain-funded cutover',
    TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;


--
-- Name: FUNCTION wlt_reject_legacy_cod_custody_mutation(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wlt_reject_legacy_cod_custody_mutation() IS 'Blocks new legacy COD cash-custody/remittance facts; historical rows remain queryable for explicit reconciliation.';


--
-- Name: wlt_reject_loyalty_entry_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_loyalty_entry_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'wlt_loyalty_entries is append-only'
        USING ERRCODE = '55000';
END;
$$;


--
-- Name: wlt_reject_promotion_funding_event_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_promotion_funding_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'wlt_promotion_funding_events is append-only'
        USING ERRCODE = '55000';
END;
$$;


--
-- Name: wlt_reject_statement_import_after_close(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_statement_import_after_close() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_daily_finance_close close_record
    WHERE close_record.operator_context_id = NEW.operator_context_id
      AND close_record.business_date = NEW.business_date
  ) THEN
    RAISE EXCEPTION 'cannot import external statement for closed business date %', NEW.business_date
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_reject_subscription_lifecycle_event_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_reject_subscription_lifecycle_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'wlt_subscription_lifecycle_events is append-only'
        USING ERRCODE = '55000';
END;
$$;


--
-- Name: wlt_require_promotion_funding_transition_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_require_promotion_funding_transition_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    matching_event_exists BOOLEAN;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM wlt_promotion_funding_events event
        WHERE event.reservation_id = NEW.id
          AND event.transaction_id = txid_current()
          AND event.from_status = OLD.status
          AND event.to_status = NEW.status
          AND event.event_type = NEW.status
          AND COALESCE(event.order_id, '') = COALESCE(NEW.order_id, '')
          AND (
              NEW.status = 'committed'
              OR (NEW.status = 'released' AND event.reason = NEW.release_reason)
              OR (NEW.status = 'reversed' AND event.reason = NEW.reversal_reason)
          )
    ) INTO matching_event_exists;

    IF NOT matching_event_exists THEN
        RAISE EXCEPTION
            'promotion funding transition % -> % requires a same-transaction append-only event',
            OLD.status,
            NEW.status
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: wlt_sync_refund_provider_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_sync_refund_provider_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.provider_reference IS NULL AND NEW.provider_refund_reference IS NOT NULL THEN
    NEW.provider_reference := NEW.provider_refund_reference;
  ELSIF NEW.provider_reference IS NOT NULL THEN
    NEW.provider_refund_reference := NEW.provider_reference;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: wlt_validate_refund_payment_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wlt_validate_refund_payment_reference() RETURNS trigger
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: runtime_seed_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.runtime_seed_history (
    service_name text NOT NULL,
    seed_name text NOT NULL,
    checksum text NOT NULL,
    source_commit_sha text NOT NULL,
    run_count bigint DEFAULT 1 NOT NULL,
    applied_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT runtime_seed_history_run_count_check CHECK ((run_count > 0))
);


--


--
-- Name: wlt_approved_payout_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_approved_payout_snapshots (
    id text DEFAULT ('waps_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    payout_request_id text NOT NULL,
    payout_destination_id text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    beneficiary_actor_id text NOT NULL,
    beneficiary_actor_type text NOT NULL,
    snapshot_hash text NOT NULL,
    approved_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    destination_version integer NOT NULL
);


--
-- Name: TABLE wlt_approved_payout_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_approved_payout_snapshots IS 'Immutable snapshot of a payout request upon approval, locking the exact beneficiary, destination, and amount.';


--
-- Name: wlt_captain_collateral_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_captain_collateral_events (
    id text DEFAULT ('wcapcole_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    captain_id text NOT NULL,
    position_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    actor_id text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_captain_collateral_event_amount_chk CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_captain_collateral_event_operation_chk CHECK ((operation = ANY (ARRAY['allocate'::text, 'release'::text]))),
    CONSTRAINT wlt_captain_collateral_event_reason_chk CHECK ((btrim(reason) <> ''::text))
);


--
-- Name: wlt_captain_collateral_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_captain_collateral_policies (
    operator_context_id text NOT NULL,
    policy_id text NOT NULL,
    policy_version bigint DEFAULT 1 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    minimum_collateral_minor_units bigint NOT NULL,
    currency text NOT NULL,
    change_reason text NOT NULL,
    updated_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_captain_collateral_policy_actor_chk CHECK ((btrim(updated_by_actor_id) <> ''::text)),
    CONSTRAINT wlt_captain_collateral_policy_amount_chk CHECK ((minimum_collateral_minor_units >= 0)),
    CONSTRAINT wlt_captain_collateral_policy_currency_chk CHECK (((currency = upper(currency)) AND (length(currency) = 3))),
    CONSTRAINT wlt_captain_collateral_policy_id_chk CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_captain_collateral_policy_reason_chk CHECK ((btrim(change_reason) <> ''::text)),
    CONSTRAINT wlt_captain_collateral_policy_version_chk CHECK ((policy_version > 0))
);


--
-- Name: wlt_captain_collateral_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_captain_collateral_positions (
    id text DEFAULT ('wcapcol_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    captain_id text NOT NULL,
    currency text NOT NULL,
    policy_id text NOT NULL,
    policy_version bigint NOT NULL,
    protected_minimum_minor_units bigint NOT NULL,
    restricted_amount_minor_units bigint NOT NULL,
    source_payment_session_id text NOT NULL,
    source_ledger_transaction_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    release_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    CONSTRAINT wlt_captain_collateral_position_amount_chk CHECK ((restricted_amount_minor_units > 0)),
    CONSTRAINT wlt_captain_collateral_position_captain_chk CHECK ((btrim(captain_id) <> ''::text)),
    CONSTRAINT wlt_captain_collateral_position_context_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_captain_collateral_position_currency_chk CHECK (((currency = upper(currency)) AND (length(currency) = 3))),
    CONSTRAINT wlt_captain_collateral_position_minimum_chk CHECK ((protected_minimum_minor_units >= 0)),
    CONSTRAINT wlt_captain_collateral_position_policy_version_chk CHECK ((policy_version > 0)),
    CONSTRAINT wlt_captain_collateral_position_release_chk CHECK (((status = 'active'::text) OR ((released_at IS NOT NULL) AND (btrim(COALESCE(release_reason, ''::text)) <> ''::text)))),
    CONSTRAINT wlt_captain_collateral_position_source_chk CHECK (((btrim(source_payment_session_id) <> ''::text) AND (btrim(source_ledger_transaction_id) <> ''::text))),
    CONSTRAINT wlt_captain_collateral_position_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'released'::text])))
);


--
-- Name: TABLE wlt_captain_collateral_positions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_captain_collateral_positions IS 'Immutable-source-linked captain collateral positions. The source payment and ledger transaction are WLT facts.';


--
-- Name: wlt_checkout_pricing_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_checkout_pricing_quotes (
    id text DEFAULT ('wlpq_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    checkout_intent_id text NOT NULL,
    client_id text NOT NULL,
    store_id text NOT NULL,
    cart_snapshot_hash text NOT NULL,
    quote_hash text NOT NULL,
    quote_version integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    subtotal_minor_units bigint NOT NULL,
    delivery_fee_minor_units bigint NOT NULL,
    service_fee_minor_units bigint NOT NULL,
    tax_minor_units bigint NOT NULL,
    discount_minor_units bigint NOT NULL,
    rounding_minor_units bigint NOT NULL,
    total_minor_units bigint NOT NULL,
    currency text NOT NULL,
    lines jsonb NOT NULL,
    allocation jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_checkout_pricing_quotes_delivery_fee_minor_units_check CHECK ((delivery_fee_minor_units >= 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_discount_minor_units_check CHECK ((discount_minor_units >= 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_quote_version_check CHECK ((quote_version > 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_scope_chk CHECK (((btrim(operator_context_id) <> ''::text) AND (btrim(checkout_intent_id) <> ''::text) AND (btrim(client_id) <> ''::text) AND (btrim(store_id) <> ''::text) AND (btrim(cart_snapshot_hash) <> ''::text) AND (btrim(quote_hash) <> ''::text) AND (char_length(currency) = 3))),
    CONSTRAINT wlt_checkout_pricing_quotes_service_fee_minor_units_check CHECK ((service_fee_minor_units >= 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_subtotal_minor_units_check CHECK ((subtotal_minor_units >= 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_tax_minor_units_check CHECK ((tax_minor_units >= 0)),
    CONSTRAINT wlt_checkout_pricing_quotes_total_minor_units_check CHECK ((total_minor_units > 0))
);


--
-- Name: TABLE wlt_checkout_pricing_quotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_checkout_pricing_quotes IS 'Immutable WLT-owned checkout money facts; payment sessions must verify this record before creation.';


--
-- Name: wlt_client_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_client_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    product_reference text NOT NULL,
    status text NOT NULL,
    payment_session_id text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_purchase_id text,
    version integer DEFAULT 1 NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    last_renewal_payment_session_id text,
    compensation_status text DEFAULT 'not_required'::text NOT NULL,
    compensation_reference text,
    lifecycle_correlation_id text,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_client_subscriptions_compensation_reference_chk CHECK ((((compensation_status = 'completed'::text) AND (btrim(COALESCE(compensation_reference, ''::text)) <> ''::text)) OR (compensation_status <> 'completed'::text))),
    CONSTRAINT wlt_client_subscriptions_compensation_status_chk CHECK ((compensation_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT wlt_client_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'cancelled'::text, 'expired'::text]))),
    CONSTRAINT wlt_client_subscriptions_version_check CHECK ((version > 0)),
    CONSTRAINT wlt_subscription_end_after_start_chk CHECK (((ends_at IS NULL) OR (ends_at > starts_at)))
);


--
-- Name: wlt_cod_custody_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_cod_custody_evidence (
    id text DEFAULT ('wcde_'::text || (gen_random_uuid())::text) NOT NULL,
    cod_record_id text NOT NULL,
    event_type text NOT NULL,
    expected_amount_minor_units bigint NOT NULL,
    actual_amount_minor_units bigint NOT NULL,
    difference_minor_units bigint NOT NULL,
    currency text NOT NULL,
    proof_reference text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    correlation_id text NOT NULL,
    idempotency_key text NOT NULL,
    ledger_transaction_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_cod_custody_evidence_actor_chk CHECK ((actor_type = ANY (ARRAY['captain'::text, 'store_courier'::text, 'partner_store'::text, 'partner'::text, 'operator'::text]))),
    CONSTRAINT wlt_cod_custody_evidence_actual_amount_minor_units_check CHECK ((actual_amount_minor_units >= 0)),
    CONSTRAINT wlt_cod_custody_evidence_correlation_chk CHECK ((length(btrim(correlation_id)) >= 3)),
    CONSTRAINT wlt_cod_custody_evidence_difference_chk CHECK ((difference_minor_units = (actual_amount_minor_units - expected_amount_minor_units))),
    CONSTRAINT wlt_cod_custody_evidence_event_chk CHECK ((event_type = ANY (ARRAY['collection'::text, 'remittance'::text]))),
    CONSTRAINT wlt_cod_custody_evidence_expected_amount_minor_units_check CHECK ((expected_amount_minor_units >= 0)),
    CONSTRAINT wlt_cod_custody_evidence_idempotency_chk CHECK ((length(btrim(idempotency_key)) >= 3)),
    CONSTRAINT wlt_cod_custody_evidence_proof_chk CHECK ((length(btrim(proof_reference)) >= 3))
);


--
-- Name: TABLE wlt_cod_custody_evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_cod_custody_evidence IS 'Immutable proof and accounting linkage for COD collection/remittance events.';


--
-- Name: COLUMN wlt_cod_custody_evidence.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_cod_custody_evidence.operator_context_id IS 'OperatorContext owning immutable COD custody proof and its idempotency identity.';


--
-- Name: wlt_cod_reconciliation_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_cod_reconciliation_audit_events (
    id text DEFAULT ('wcrae_'::text || (gen_random_uuid())::text) NOT NULL,
    reconciliation_case_id text NOT NULL,
    cod_record_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_cod_reconciliation_audit_event_chk CHECK ((event_type = ANY (ARRAY['opened'::text, 'assigned'::text, 'reassigned'::text, 'investigation_updated'::text, 'resolved'::text])))
);


--
-- Name: TABLE wlt_cod_reconciliation_audit_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_cod_reconciliation_audit_events IS 'Append-only custody reconciliation audit trail for opening, assignment, investigation and resolution.';


--
-- Name: COLUMN wlt_cod_reconciliation_audit_events.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_cod_reconciliation_audit_events.operator_context_id IS 'OperatorContext copied by the reconciliation audit trigger for isolated audit reads.';


--
-- Name: wlt_cod_reconciliation_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_cod_reconciliation_cases (
    id text DEFAULT ('wcrc_'::text || (gen_random_uuid())::text) NOT NULL,
    cod_record_id text NOT NULL,
    custody_evidence_id text NOT NULL,
    expected_amount_minor_units bigint NOT NULL,
    actual_amount_minor_units bigint NOT NULL,
    difference_minor_units bigint NOT NULL,
    currency text NOT NULL,
    trigger_reason text DEFAULT 'cod_collection_variance'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to_operator_id text,
    assigned_at timestamp with time zone,
    investigation_note text DEFAULT ''::text NOT NULL,
    resolved_by_operator_id text,
    resolution_action text,
    resolution_note text DEFAULT ''::text NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_cod_reconciliation_action_chk CHECK (((resolution_action IS NULL) OR (resolution_action = ANY (ARRAY['confirmed_variance'::text, 'cash_adjustment'::text, 'collector_recovery'::text, 'write_off'::text])))),
    CONSTRAINT wlt_cod_reconciliation_cases_actual_amount_minor_units_check CHECK ((actual_amount_minor_units >= 0)),
    CONSTRAINT wlt_cod_reconciliation_cases_expected_amount_minor_units_check CHECK ((expected_amount_minor_units >= 0)),
    CONSTRAINT wlt_cod_reconciliation_difference_chk CHECK ((difference_minor_units = (actual_amount_minor_units - expected_amount_minor_units))),
    CONSTRAINT wlt_cod_reconciliation_non_zero_chk CHECK ((difference_minor_units <> 0)),
    CONSTRAINT wlt_cod_reconciliation_status_chk CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text])))
);


--
-- Name: TABLE wlt_cod_reconciliation_cases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_cod_reconciliation_cases IS 'COD-specific expected-vs-actual variance workflow with assignment, investigation and resolution truth.';


--
-- Name: COLUMN wlt_cod_reconciliation_cases.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_cod_reconciliation_cases.operator_context_id IS 'OperatorContext owning the COD variance workflow.';


--
-- Name: wlt_cod_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_cod_records (
    id text DEFAULT ('wcod_'::text || (gen_random_uuid())::text) NOT NULL,
    order_id text NOT NULL,
    captain_id text,
    partner_id text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'pending_collection'::text NOT NULL,
    collected_at timestamp with time zone,
    remitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    collector_type text NOT NULL,
    collector_id text NOT NULL,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_cod_records_captain_projection_chk CHECK ((((collector_type = 'captain'::text) AND (captain_id = collector_id)) OR ((collector_type <> 'captain'::text) AND (captain_id IS NULL)))),
    CONSTRAINT wlt_cod_records_collector_type_chk CHECK ((collector_type = ANY (ARRAY['captain'::text, 'store_courier'::text, 'partner_store'::text]))),
    CONSTRAINT wlt_cod_records_status_chk CHECK ((status = ANY (ARRAY['pending_collection'::text, 'collected'::text, 'remitted'::text, 'disputed'::text, 'resolved'::text])))
);


--
-- Name: wlt_cod_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_cod_reservations (
    id text DEFAULT ('wcodres_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    order_id text NOT NULL,
    captain_id text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'reserved'::text NOT NULL,
    idempotency_key text NOT NULL,
    release_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    checkout_intent_id text,
    finalization_ledger_transaction_id text,
    CONSTRAINT wlt_cod_reservations_amount_chk CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_cod_reservations_operator_context_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_cod_reservations_status_chk CHECK ((status = ANY (ARRAY['reserved'::text, 'released'::text, 'finalized'::text])))
);


--
-- Name: TABLE wlt_cod_reservations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_cod_reservations IS 'Canonical captain-funded COD exposure. reserved releases on a governed cancellation or finalizes once into the WLT ledger; no cash collection or remittance liability is created.';


--
-- Name: COLUMN wlt_cod_reservations.checkout_intent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_cod_reservations.checkout_intent_id IS 'Immutable WLT payment-session identity bound to the reservation at captain assignment.';


--
-- Name: COLUMN wlt_cod_reservations.finalization_ledger_transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_cod_reservations.finalization_ledger_transaction_id IS 'The one canonical WLT ledger posting that debits the captain-funded COD exposure.';


--
-- Name: wlt_commercial_context_backfill_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commercial_context_backfill_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    client_id text,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wlt_commercial_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commercial_products (
    reference text NOT NULL,
    product_type text NOT NULL,
    display_name text NOT NULL,
    price_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    billing_cycle text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by_actor_id text NOT NULL,
    approved_by_actor_id text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activation_points bigint DEFAULT 1 NOT NULL,
    CONSTRAINT wlt_commercial_product_independent_approval_chk CHECK (((status <> 'active'::text) OR ((approved_by_actor_id IS NOT NULL) AND (approved_by_actor_id <> created_by_actor_id) AND (approved_at IS NOT NULL)))),
    CONSTRAINT wlt_commercial_products_activation_points_check CHECK ((activation_points > 0)),
    CONSTRAINT wlt_commercial_products_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text]))),
    CONSTRAINT wlt_commercial_products_currency_check CHECK ((currency <> ''::text)),
    CONSTRAINT wlt_commercial_products_price_minor_units_check CHECK ((price_minor_units > 0)),
    CONSTRAINT wlt_commercial_products_product_type_check CHECK ((product_type = 'subscription'::text)),
    CONSTRAINT wlt_commercial_products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT wlt_commercial_products_version_check CHECK ((version > 0))
);


--
-- Name: wlt_commission_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commission_adjustments (
    id text DEFAULT ('wcadj_'::text || (gen_random_uuid())::text) NOT NULL,
    commission_id text NOT NULL,
    delta_minor_units bigint NOT NULL,
    reason text NOT NULL,
    operator_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_commission_adjustments_delta_minor_units_check CHECK ((delta_minor_units <> 0)),
    CONSTRAINT wlt_commission_adjustments_idempotency_key_check CHECK ((btrim(idempotency_key) <> ''::text)),
    CONSTRAINT wlt_commission_adjustments_operator_id_check CHECK ((btrim(operator_id) <> ''::text)),
    CONSTRAINT wlt_commission_adjustments_reason_check CHECK ((btrim(reason) <> ''::text)),
    CONSTRAINT wlt_commission_adjustments_request_hash_check CHECK ((btrim(request_hash) <> ''::text))
);


--
-- Name: TABLE wlt_commission_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_commission_adjustments IS 'Reasoned signed adjustments applied transactionally to pending or confirmed commissions.';


--
-- Name: COLUMN wlt_commission_adjustments.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_commission_adjustments.operator_context_id IS 'OperatorContext owning this reasoned financial adjustment and its idempotency identity.';


--
-- Name: wlt_commission_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commission_evidence (
    commission_id text NOT NULL,
    policy_id text NOT NULL,
    policy_version bigint NOT NULL,
    source_evidence_id text NOT NULL,
    source_evidence_hash text NOT NULL,
    source_evidence_status text NOT NULL,
    gross_basis_minor_units bigint DEFAULT 0 NOT NULL,
    calculated_amount_minor_units bigint NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_commission_evidence_calculated_amount_minor_units_check CHECK ((calculated_amount_minor_units > 0)),
    CONSTRAINT wlt_commission_evidence_gross_basis_minor_units_check CHECK ((gross_basis_minor_units >= 0)),
    CONSTRAINT wlt_commission_evidence_idempotency_key_check CHECK ((btrim(idempotency_key) <> ''::text)),
    CONSTRAINT wlt_commission_evidence_policy_id_check CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_commission_evidence_policy_version_check CHECK ((policy_version > 0)),
    CONSTRAINT wlt_commission_evidence_request_hash_check CHECK ((btrim(request_hash) <> ''::text)),
    CONSTRAINT wlt_commission_evidence_source_evidence_hash_check CHECK ((btrim(source_evidence_hash) <> ''::text)),
    CONSTRAINT wlt_commission_evidence_source_evidence_id_check CHECK ((btrim(source_evidence_id) <> ''::text)),
    CONSTRAINT wlt_commission_evidence_source_evidence_status_check CHECK ((source_evidence_status = ANY (ARRAY['completed'::text, 'delivered'::text, 'approved'::text])))
);


--
-- Name: wlt_commission_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commission_policies (
    id text NOT NULL,
    name text NOT NULL,
    commission_type text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    calculation_type text DEFAULT 'fixed'::text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wlt_commission_policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commission_policy_versions (
    policy_id text NOT NULL,
    version bigint NOT NULL,
    commission_type text NOT NULL,
    source_type text NOT NULL,
    beneficiary_actor_type text NOT NULL,
    calculation_type text NOT NULL,
    fixed_amount_minor_units bigint DEFAULT 0 NOT NULL,
    basis_points integer DEFAULT 0 NOT NULL,
    minimum_amount_minor_units bigint DEFAULT 0 NOT NULL,
    maximum_amount_minor_units bigint,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    change_reason text NOT NULL,
    updated_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_commission_policy_cap_chk CHECK (((maximum_amount_minor_units IS NULL) OR (maximum_amount_minor_units >= minimum_amount_minor_units))),
    CONSTRAINT wlt_commission_policy_formula_chk CHECK ((((calculation_type = 'fixed'::text) AND (fixed_amount_minor_units > 0) AND (basis_points = 0)) OR ((calculation_type = 'basis_points'::text) AND (basis_points > 0)))),
    CONSTRAINT wlt_commission_policy_versions_basis_points_check CHECK (((basis_points >= 0) AND (basis_points <= 10000))),
    CONSTRAINT wlt_commission_policy_versions_beneficiary_actor_type_check CHECK ((beneficiary_actor_type = ANY (ARRAY['partner'::text, 'captain'::text, 'field'::text]))),
    CONSTRAINT wlt_commission_policy_versions_calculation_type_check CHECK ((calculation_type = ANY (ARRAY['fixed'::text, 'basis_points'::text]))),
    CONSTRAINT wlt_commission_policy_versions_change_reason_check CHECK ((btrim(change_reason) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_commission_type_check CHECK ((btrim(commission_type) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_fixed_amount_minor_units_check CHECK ((fixed_amount_minor_units >= 0)),
    CONSTRAINT wlt_commission_policy_versions_minimum_amount_minor_units_check CHECK ((minimum_amount_minor_units >= 0)),
    CONSTRAINT wlt_commission_policy_versions_policy_id_check CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_source_type_check CHECK ((btrim(source_type) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT wlt_commission_policy_versions_updated_by_actor_id_check CHECK ((btrim(updated_by_actor_id) <> ''::text)),
    CONSTRAINT wlt_commission_policy_versions_version_check CHECK ((version > 0))
);


--
-- Name: TABLE wlt_commission_policy_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_commission_policy_versions IS 'Versioned WLT-owned commission calculation policies; callers never supply commission truth amounts.';


--
-- Name: COLUMN wlt_commission_policy_versions.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_commission_policy_versions.operator_context_id IS 'OperatorContext owning this versioned commission calculation policy.';


--
-- Name: wlt_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_commissions (
    id text DEFAULT ('wcom_'::text || (gen_random_uuid())::text) NOT NULL,
    order_id text,
    captain_id text,
    partner_id text,
    commission_type text DEFAULT 'delivery_fee'::text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    beneficiary_actor_id text NOT NULL,
    beneficiary_actor_type text NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    visit_id text,
    store_id text,
    commission_policy_id text,
    earned_at timestamp with time zone,
    approved_at timestamp with time zone,
    held_at timestamp with time zone,
    rejected_at timestamp with time zone,
    reversed_at timestamp with time zone,
    idempotency_key text,
    created_by text,
    approved_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    resolution_note text,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    partner_category text DEFAULT 'default'::text NOT NULL,
    CONSTRAINT wlt_commissions_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'settled'::text, 'reversed'::text, 'earned_pending_review'::text, 'approved_pending_posting'::text, 'posted_pending_settlement'::text, 'held'::text, 'rejected'::text, 'paid'::text]))),
    CONSTRAINT wlt_commissions_type_chk CHECK ((commission_type = ANY (ARRAY['delivery_fee'::text, 'platform_fee'::text, 'cod_fee'::text, 'partner_discount'::text, 'field_visit_fee'::text])))
);


--
-- Name: wlt_daily_finance_close; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_daily_finance_close (
    business_date date NOT NULL,
    operator_context_id text NOT NULL,
    total_payouts_minor_units bigint NOT NULL,
    total_cashin_minor_units bigint NOT NULL,
    closing_balance_minor_units bigint NOT NULL,
    closed_by_operator_id text NOT NULL,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    treasury_expected_balance_minor_units bigint,
    treasury_statement_balance_minor_units bigint,
    treasury_ledger_balance_minor_units bigint,
    settlement_audit_pack_count integer,
    cutoff_at timestamp with time zone NOT NULL,
    input_high_watermark jsonb NOT NULL
);


--
-- Name: COLUMN wlt_daily_finance_close.treasury_expected_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_daily_finance_close.treasury_expected_balance_minor_units IS 'Opening external-provider balance plus immutable statement movements through the business date.';


--
-- Name: COLUMN wlt_daily_finance_close.treasury_statement_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_daily_finance_close.treasury_statement_balance_minor_units IS 'Closing balance reported by the authoritative provider statements for the business date.';


--
-- Name: COLUMN wlt_daily_finance_close.treasury_ledger_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_daily_finance_close.treasury_ledger_balance_minor_units IS 'Canonical WLT external_settlement_cash balance at the close.';


--
-- Name: COLUMN wlt_daily_finance_close.cutoff_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_daily_finance_close.cutoff_at IS 'Immutable database timestamp captured by the close transaction; all included facts must be at or before this cutoff.';


--
-- Name: COLUMN wlt_daily_finance_close.input_high_watermark; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_daily_finance_close.input_high_watermark IS 'Immutable source high-watermark summary captured with the close; it is evidence metadata, not a second financial authority.';


--
-- Name: wlt_dispatch_financial_eligibility_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_dispatch_financial_eligibility_decisions (
    id text DEFAULT ('wlt_dfe_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    captain_id text NOT NULL,
    wallet_id text,
    wallet_status text,
    available_balance_minor_units bigint,
    required_balance_minor_units bigint,
    currency text,
    eligible boolean NOT NULL,
    reason_code text NOT NULL,
    policy_version text NOT NULL,
    evaluated_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_dispatch_financial_eligibility_de_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_dispatch_financial_eligibility_decisio_policy_version_check CHECK ((btrim(policy_version) <> ''::text)),
    CONSTRAINT wlt_dispatch_financial_eligibility_decisions_captain_id_check CHECK ((btrim(captain_id) <> ''::text)),
    CONSTRAINT wlt_dispatch_financial_eligibility_decisions_check CHECK ((expires_at > evaluated_at)),
    CONSTRAINT wlt_dispatch_financial_eligibility_decisions_check1 CHECK (((revoked_at IS NULL) OR (revoked_at >= evaluated_at))),
    CONSTRAINT wlt_dispatch_financial_eligibility_decisions_reason_code_check CHECK ((btrim(reason_code) <> ''::text))
);


--
-- Name: TABLE wlt_dispatch_financial_eligibility_decisions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_dispatch_financial_eligibility_decisions IS 'Auditable WLT-owned universal dispatch financial decisions. Only abstract decision metadata crosses into DSH.';


--
-- Name: wlt_dispatch_financial_eligibility_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_dispatch_financial_eligibility_policies (
    operator_context_id text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    require_active_wallet boolean DEFAULT true NOT NULL,
    minimum_dispatch_balance_minor_units bigint DEFAULT 0 NOT NULL,
    minimum_cod_balance_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    decision_ttl_seconds integer DEFAULT 120 NOT NULL,
    policy_version text NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_dispatch_financial_eligi_minimum_dispatch_balance_min_check CHECK ((minimum_dispatch_balance_minor_units >= 0)),
    CONSTRAINT wlt_dispatch_financial_eligibility_p_decision_ttl_seconds_check CHECK (((decision_ttl_seconds >= 30) AND (decision_ttl_seconds <= 600))),
    CONSTRAINT wlt_dispatch_financial_eligibility_po_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_dispatch_financial_eligibility_policie_policy_version_check CHECK ((btrim(policy_version) <> ''::text)),
    CONSTRAINT wlt_dispatch_financial_eligibility_policies_check CHECK ((minimum_cod_balance_minor_units >= minimum_dispatch_balance_minor_units)),
    CONSTRAINT wlt_dispatch_financial_eligibility_policies_currency_check CHECK ((char_length(currency) = 3))
);


--
-- Name: TABLE wlt_dispatch_financial_eligibility_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_dispatch_financial_eligibility_policies IS 'WLT-owned dispatch eligibility thresholds and currency policy. DSH must never copy or evaluate these values.';


--
-- Name: wlt_dsh_outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_dsh_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    payment_session_id text NOT NULL,
    checkout_intent_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    special_request_id text,
    operator_context_id text NOT NULL,
    order_id text,
    refund_reference text,
    reason text,
    correlation_id text,
    CONSTRAINT wlt_dsh_outbox_events_operator_context_nonblank_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_dsh_outbox_events_source_xor_chk CHECK (((refund_reference IS NOT NULL) OR ((checkout_intent_id IS NOT NULL) <> (special_request_id IS NOT NULL)))),
    CONSTRAINT wlt_dsh_outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: COLUMN wlt_dsh_outbox_events.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_dsh_outbox_events.status IS 'pending: awaiting delivery to DSH. sent: delivered. failed: exhausted 15 retry attempts and requires manual/operator intervention.';


--
-- Name: wlt_external_provider_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_external_provider_accounts (
    id text DEFAULT ('wepa_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    provider_key text NOT NULL,
    account_reference_hash text NOT NULL,
    currency text NOT NULL,
    opening_balance_minor_units bigint DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_external_provider_accounts_currency_chk CHECK ((btrim(currency) <> ''::text))
);


--
-- Name: wlt_external_provider_statement_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_external_provider_statement_lines (
    id text DEFAULT ('wepsl_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    statement_id text NOT NULL,
    external_transfer_reference text NOT NULL,
    direction text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    destination_reference_hash text NOT NULL,
    occurred_at timestamp with time zone,
    source_record jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_external_provider_statement_lines_amount_minor_units_check CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_external_provider_statement_lines_destination_hash_chk CHECK ((destination_reference_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT wlt_external_provider_statement_lines_direction_check CHECK ((direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])))
);


--
-- Name: wlt_external_provider_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_external_provider_statements (
    id text DEFAULT ('weps_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    external_provider_account_id text NOT NULL,
    statement_reference text NOT NULL,
    artifact_sha256 text NOT NULL,
    business_date date NOT NULL,
    closing_balance_minor_units bigint NOT NULL,
    currency text NOT NULL,
    imported_by_operator_id text NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    statement_fingerprint text,
    provenance_type text DEFAULT 'operator_attested'::text NOT NULL,
    provenance_evidence_sha256 text DEFAULT ''::text NOT NULL,
    provenance_evidence_bytes bytea DEFAULT '\x'::bytea NOT NULL,
    provenance_key_id text,
    provenance_verifier_version text,
    provenance_verification_receipt_id text,
    CONSTRAINT wlt_external_provider_statements_fingerprint_chk CHECK (((statement_fingerprint IS NULL) OR (statement_fingerprint ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT wlt_external_provider_statements_hash_chk CHECK ((artifact_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT wlt_external_provider_statements_provenance_evidence_chk CHECK ((((provenance_type = 'operator_attested'::text) AND (provenance_evidence_sha256 = artifact_sha256)) OR ((provenance_type = ANY (ARRAY['provider_signed'::text, 'provider_api_verified'::text])) AND (provenance_evidence_sha256 ~ '^[a-f0-9]{64}$'::text) AND (octet_length(provenance_evidence_bytes) > 0)))),
    CONSTRAINT wlt_external_provider_statements_provenance_type_chk CHECK ((provenance_type = ANY (ARRAY['operator_attested'::text, 'provider_signed'::text, 'provider_api_verified'::text]))),
    CONSTRAINT wlt_external_provider_statements_provider_provenance_link_chk CHECK (((provenance_type = 'operator_attested'::text) OR ((provenance_type = ANY (ARRAY['provider_signed'::text, 'provider_api_verified'::text])) AND (provenance_key_id IS NOT NULL) AND (provenance_key_id <> ''::text) AND (provenance_verifier_version IS NOT NULL) AND (provenance_verifier_version <> ''::text) AND (provenance_verification_receipt_id IS NOT NULL) AND (provenance_verification_receipt_id <> ''::text))))
);


--
-- Name: COLUMN wlt_external_provider_statements.provenance_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_external_provider_statements.provenance_type IS 'Explicit origin class. operator_attested is human-import authority; provider_signed/provider_api_verified are valid only when an independent trusted verifier receipt is present.';


--
-- Name: COLUMN wlt_external_provider_statements.provenance_evidence_sha256; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_external_provider_statements.provenance_evidence_sha256 IS 'Immutable digest of verifier-controlled signature/API/raw evidence when provenance_type is not operator_attested; the digest alone is not an authenticity claim.';


--
-- Name: COLUMN wlt_external_provider_statements.provenance_evidence_bytes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_external_provider_statements.provenance_evidence_bytes IS 'Immutable raw signature/API/raw-provider evidence. Required for provider_signed and provider_api_verified imports.';


--
-- Name: COLUMN wlt_external_provider_statements.provenance_key_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_external_provider_statements.provenance_key_id IS 'Trusted provider verification key identifier; absent for operator-attested imports.';


--
-- Name: COLUMN wlt_external_provider_statements.provenance_verification_receipt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_external_provider_statements.provenance_verification_receipt_id IS 'Immutable receipt proving provider provenance; required for provider-signed and provider-API-verified imports.';


--
-- Name: wlt_external_provider_verification_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_external_provider_verification_keys (
    id text DEFAULT ('wepvk_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    provider_key text NOT NULL,
    key_id text NOT NULL,
    algorithm text NOT NULL,
    public_key bytea NOT NULL,
    verifier_version text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_external_provider_verification_keys_algorithm_check CHECK ((algorithm = 'ed25519'::text)),
    CONSTRAINT wlt_external_provider_verification_keys_public_key_check CHECK ((octet_length(public_key) = 32)),
    CONSTRAINT wlt_external_provider_verification_keys_window_chk CHECK (((valid_until IS NULL) OR (valid_until > valid_from)))
);


--
-- Name: TABLE wlt_external_provider_verification_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_external_provider_verification_keys IS 'Trusted provider public keys provisioned by deployment/security operations; callers cannot create provenance keys through statement import.';


--
-- Name: wlt_external_statement_verification_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_external_statement_verification_receipts (
    id text DEFAULT ('wepsvr_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    statement_id text NOT NULL,
    provider_key text NOT NULL,
    verification_method text NOT NULL,
    key_id text NOT NULL,
    verifier_version text NOT NULL,
    artifact_sha256 text NOT NULL,
    evidence_sha256 text NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_evidence bytea NOT NULL,
    CONSTRAINT wlt_external_statement_verification_r_verification_method_check CHECK ((verification_method = ANY (ARRAY['provider_signed'::text, 'provider_api_verified'::text]))),
    CONSTRAINT wlt_external_statement_verification_receipts_artifact_chk CHECK ((artifact_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT wlt_external_statement_verification_receipts_evidence_chk CHECK ((evidence_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT wlt_external_statement_verification_receipts_raw_evidence_check CHECK ((octet_length(raw_evidence) > 0))
);


--
-- Name: TABLE wlt_external_statement_verification_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_external_statement_verification_receipts IS 'Immutable proof that a trusted verifier authenticated provider evidence bound to the canonical statement artifact.';


--
-- Name: wlt_field_commission_category_policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_field_commission_category_policy_versions (
    policy_id text NOT NULL,
    partner_category text NOT NULL,
    version bigint NOT NULL,
    fixed_amount_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    change_reason text NOT NULL,
    updated_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_field_commission_category_po_fixed_amount_minor_units_check CHECK ((fixed_amount_minor_units > 0)),
    CONSTRAINT wlt_field_commission_category_policy__updated_by_actor_id_check CHECK ((btrim(updated_by_actor_id) <> ''::text)),
    CONSTRAINT wlt_field_commission_category_policy_ver_partner_category_check CHECK ((btrim(partner_category) <> ''::text)),
    CONSTRAINT wlt_field_commission_category_policy_versio_change_reason_check CHECK ((btrim(change_reason) <> ''::text)),
    CONSTRAINT wlt_field_commission_category_policy_versions_currency_check CHECK ((char_length(currency) = 3)),
    CONSTRAINT wlt_field_commission_category_policy_versions_policy_id_check CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_field_commission_category_policy_versions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT wlt_field_commission_category_policy_versions_version_check CHECK ((version > 0))
);


--
-- Name: TABLE wlt_field_commission_category_policy_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_field_commission_category_policy_versions IS 'Versioned WLT-owned fixed commission policy selected by DSH partner category evidence.';


--
-- Name: COLUMN wlt_field_commission_category_policy_versions.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_field_commission_category_policy_versions.operator_context_id IS 'OperatorContext owning this WLT commission policy; active policy uniqueness is OperatorContext-local.';


--
-- Name: wlt_field_commission_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_field_commission_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    partner_id text NOT NULL,
    partner_name text NOT NULL,
    amount_minor_units integer NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text NOT NULL,
    description text NOT NULL,
    evidence_required boolean DEFAULT false NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_field_commission_refs_status_chk CHECK ((status = ANY (ARRAY['eligible_pending_review'::text, 'approved_pending_settlement'::text, 'settled'::text, 'held_for_evidence'::text, 'rejected'::text])))
);


--
-- Name: wlt_finance_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_finance_audit_events (
    id text DEFAULT ('wja36_'::text || (gen_random_uuid())::text) NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    action text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_audit_events_action_check CHECK ((btrim(action) <> ''::text)),
    CONSTRAINT wlt_audit_events_actor_id_check CHECK ((btrim(actor_id) <> ''::text)),
    CONSTRAINT wlt_audit_events_actor_type_check CHECK ((btrim(actor_type) <> ''::text)),
    CONSTRAINT wlt_audit_events_aggregate_id_check CHECK ((btrim(aggregate_id) <> ''::text)),
    CONSTRAINT wlt_audit_events_aggregate_type_check CHECK ((aggregate_type = ANY (ARRAY['settlement_policy'::text, 'settlement'::text, 'settlement_batch'::text, 'manual_transfer_evidence'::text, 'daily_close'::text, 'commission_policy'::text, 'commission'::text, 'commission_adjustment'::text]))),
    CONSTRAINT wlt_audit_events_correlation_id_check CHECK ((btrim(correlation_id) <> ''::text))
);


--
-- Name: TABLE wlt_finance_audit_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_finance_audit_events IS 'Append-only audit truth for governed commission and settlement changes.';


--
-- Name: COLUMN wlt_finance_audit_events.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_finance_audit_events.operator_context_id IS 'OperatorContext owning the audited financial aggregate. legacy-unscoped is compatibility-only and cannot prove isolation.';


--
-- Name: wlt_financial_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_financial_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type character varying(100) NOT NULL,
    environment character varying(50) NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    is_maintenance boolean DEFAULT false NOT NULL,
    secret_reference character varying(255) NOT NULL,
    timeout_budget_ms integer DEFAULT 15000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wlt_financial_store_onboarding_fee_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_financial_store_onboarding_fee_policy (
    id integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    currency character varying(3) DEFAULT 'YER'::character varying NOT NULL,
    applies_to character varying(64) DEFAULT 'first_store'::character varying NOT NULL,
    charge_timing character varying(64) DEFAULT 'on_approval'::character varying NOT NULL,
    actor_charged character varying(64) DEFAULT 'partner'::character varying NOT NULL,
    effective_from timestamp with time zone,
    notes character varying(1000) DEFAULT ''::character varying NOT NULL,
    updated_by character varying(64),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: wlt_financial_store_onboarding_fee_policy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wlt_financial_store_onboarding_fee_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wlt_financial_store_onboarding_fee_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wlt_financial_store_onboarding_fee_policy_id_seq OWNED BY public.wlt_financial_store_onboarding_fee_policy.id;


--
-- Name: wlt_ledger_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_ledger_accounts (
    id text DEFAULT ('wlacc_'::text || (gen_random_uuid())::text) NOT NULL,
    account_type text NOT NULL,
    actor_type text,
    actor_id text,
    currency text DEFAULT 'YER'::text NOT NULL,
    balance_minor_units bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    classification text NOT NULL,
    CONSTRAINT wlt_ledger_accounts_classification_chk CHECK ((classification = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'income'::text, 'expense'::text]))),
    CONSTRAINT wlt_ledger_accounts_operatorcontext_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_ledger_accounts_type_chk CHECK ((account_type = ANY (ARRAY['wallet'::text, 'platform_revenue'::text, 'platform_payable'::text, 'provider_clearing'::text, 'provider_receivable'::text, 'cash_in_transit'::text, 'cash_variance'::text, 'platform_commission_receivable'::text, 'external_settlement_cash'::text, 'payment_processing_expense'::text, 'platform_capital_contribution'::text, 'promotion_funding_expense'::text, 'partner_promotion_receivable'::text]))),
    CONSTRAINT wlt_ledger_accounts_wallet_actor_chk CHECK ((((account_type = 'wallet'::text) AND (actor_type IS NOT NULL) AND (actor_id IS NOT NULL)) OR ((account_type <> 'wallet'::text) AND (actor_id IS NULL))))
);


--
-- Name: COLUMN wlt_ledger_accounts.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_ledger_accounts.operator_context_id IS 'Trusted OperatorContext ownership. legacy-unscoped requires explicit financial reconciliation before production activation.';


--
-- Name: COLUMN wlt_ledger_accounts.classification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_ledger_accounts.classification IS 'Standard accounting classification defining the natural balance and financial statement position of the account.';


--
-- Name: wlt_ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_ledger_entries (
    id text DEFAULT ('wled_'::text || (gen_random_uuid())::text) NOT NULL,
    entry_type text NOT NULL,
    actor_id text NOT NULL,
    actor_type text DEFAULT 'system'::text NOT NULL,
    order_id text,
    reference_id text DEFAULT ''::text NOT NULL,
    reference_type text DEFAULT ''::text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    debit_credit text DEFAULT 'debit'::text NOT NULL,
    balance_after bigint DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text DEFAULT ''::text NOT NULL,
    source_id text DEFAULT ''::text NOT NULL,
    visit_id text,
    store_id text,
    partner_id text,
    commission_event_id text,
    idempotency_key text,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_ledger_actor_type_chk CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'system'::text, 'platform'::text, 'field'::text]))),
    CONSTRAINT wlt_ledger_debit_credit_chk CHECK ((debit_credit = ANY (ARRAY['debit'::text, 'credit'::text])))
);


--
-- Name: wlt_ledger_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_ledger_lines (
    id text DEFAULT ('wlline_'::text || (gen_random_uuid())::text) NOT NULL,
    ledger_transaction_id text NOT NULL,
    account_id text NOT NULL,
    debit_credit text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    running_balance_after bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_ledger_lines_amount_chk CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_ledger_lines_debit_credit_chk CHECK ((debit_credit = ANY (ARRAY['debit'::text, 'credit'::text]))),
    CONSTRAINT wlt_ledger_lines_operatorcontext_nonempty CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: wlt_ledger_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_ledger_transactions (
    id text DEFAULT ('wltxn_'::text || (gen_random_uuid())::text) NOT NULL,
    transaction_type text NOT NULL,
    reference_type text DEFAULT ''::text NOT NULL,
    reference_id text DEFAULT ''::text NOT NULL,
    created_by_actor_id text,
    created_by_actor_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_ledger_transactions_operatorcontext_nonempty CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: wlt_loyalty_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_loyalty_accounts (
    client_id text NOT NULL,
    points_balance bigint DEFAULT 0 NOT NULL,
    lifetime_points bigint DEFAULT 0 NOT NULL,
    tier_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_loyalty_accounts_lifetime_points_check CHECK ((lifetime_points >= 0)),
    CONSTRAINT wlt_loyalty_accounts_points_balance_check CHECK ((points_balance >= 0))
);


--
-- Name: wlt_loyalty_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_loyalty_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    direction text NOT NULL,
    points bigint NOT NULL,
    balance_after bigint NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    reversal_of uuid,
    idempotency_key text NOT NULL,
    correlation_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_loyalty_entries_balance_after_check CHECK ((balance_after >= 0)),
    CONSTRAINT wlt_loyalty_entries_direction_check CHECK ((direction = ANY (ARRAY['earn'::text, 'burn'::text, 'expire'::text, 'reverse'::text]))),
    CONSTRAINT wlt_loyalty_entries_points_check CHECK ((points > 0)),
    CONSTRAINT wlt_loyalty_entries_source_id_check CHECK ((source_id <> ''::text)),
    CONSTRAINT wlt_loyalty_entries_source_type_check CHECK ((source_type <> ''::text)),
    CONSTRAINT wlt_loyalty_reversal_reference_chk CHECK ((((direction = 'reverse'::text) AND (reversal_of IS NOT NULL)) OR ((direction <> 'reverse'::text) AND (reversal_of IS NULL))))
);


--
-- Name: wlt_manual_transfer_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_manual_transfer_evidence (
    id text DEFAULT ('wmte_'::text || (gen_random_uuid())::text) NOT NULL,
    batch_id text NOT NULL,
    approved_snapshot_id text NOT NULL,
    external_transfer_reference text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    verified_by_operator_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    executed_by_operator_id text NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    evidence_reference text,
    CONSTRAINT wlt_manual_transfer_evidence_verification_chk CHECK ((((verified_by_operator_id IS NULL) AND (verified_at IS NULL)) OR ((verified_by_operator_id IS NOT NULL) AND (verified_at IS NOT NULL) AND (verified_by_operator_id <> executed_by_operator_id))))
);


--
-- Name: TABLE wlt_manual_transfer_evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_manual_transfer_evidence IS 'External official-wallet transfer execution evidence. Execution and independent verification are separate governed acts.';


--
-- Name: wlt_mutation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_mutation_receipts (
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    mutation_type text NOT NULL,
    aggregate_id text NOT NULL,
    response_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_mutation_receipts_aggregate_id_check CHECK ((btrim(aggregate_id) <> ''::text)),
    CONSTRAINT wlt_mutation_receipts_mutation_type_check CHECK ((btrim(mutation_type) <> ''::text))
);


--
-- Name: wlt_official_wallet_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_official_wallet_providers (
    operator_context_id text NOT NULL,
    provider_key text NOT NULL,
    display_name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_official_wallet_providers_key_chk CHECK (((provider_key <> ''::text) AND (provider_key = lower(provider_key))))
);


--
-- Name: wlt_payment_allocation_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payment_allocation_components (
    id text DEFAULT ('wpalloc_'::text || (gen_random_uuid())::text) NOT NULL,
    payment_session_id text NOT NULL,
    operator_context_id text NOT NULL,
    component text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_payment_allocation_components_component_chk CHECK ((component = ANY (ARRAY['goods_subtotal'::text, 'delivery_fee'::text, 'service_fee'::text, 'tax'::text, 'discount'::text, 'tip'::text]))),
    CONSTRAINT wlt_payment_allocation_components_currency_chk CHECK ((char_length(currency) = 3)),
    CONSTRAINT wlt_payment_allocation_components_operator_context_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_payment_allocation_components_sign_chk CHECK ((((component = 'discount'::text) AND (amount_minor_units <= 0)) OR ((component <> 'discount'::text) AND (amount_minor_units >= 0))))
);


--
-- Name: TABLE wlt_payment_allocation_components; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_payment_allocation_components IS 'Server-owned breakdown of a payment session total. Components are unique per session and must conserve the governed session amount at COMMIT.';


--
-- Name: wlt_payment_operation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payment_operation_receipts (
    id text DEFAULT ('wpor_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    payment_session_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    state text DEFAULT 'in_progress'::text NOT NULL,
    response_status text DEFAULT ''::text NOT NULL,
    provider_reference text DEFAULT ''::text NOT NULL,
    error_code text DEFAULT ''::text NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT wlt_payment_operation_receipts_hash_chk CHECK ((length(request_hash) = 64)),
    CONSTRAINT wlt_payment_operation_receipts_key_chk CHECK (((length(btrim(idempotency_key)) >= 8) AND (length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT wlt_payment_operation_receipts_operation_chk CHECK ((operation = ANY (ARRAY['authorize'::text, 'capture'::text, 'provider_status_refresh'::text]))),
    CONSTRAINT wlt_payment_operation_receipts_state_chk CHECK ((state = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text, 'provider_result_unknown'::text])))
);


--
-- Name: wlt_payment_provider_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payment_provider_events (
    provider_event_id text NOT NULL,
    operator_context_id text NOT NULL,
    payment_session_id text NOT NULL,
    event_type text NOT NULL,
    provider_status text NOT NULL,
    provider_reference text DEFAULT ''::text NOT NULL,
    payload_hash text NOT NULL,
    signature_timestamp timestamp with time zone NOT NULL,
    occurred_at timestamp with time zone,
    processing_state text DEFAULT 'received'::text NOT NULL,
    processing_result text DEFAULT ''::text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT wlt_payment_provider_events_hash_chk CHECK ((length(payload_hash) = 64)),
    CONSTRAINT wlt_payment_provider_events_processing_chk CHECK ((processing_state = ANY (ARRAY['received'::text, 'applied'::text, 'ignored'::text, 'conflict'::text]))),
    CONSTRAINT wlt_payment_provider_events_status_chk CHECK ((provider_status = ANY (ARRAY['authorized'::text, 'captured'::text, 'failed'::text, 'expired'::text]))),
    CONSTRAINT wlt_payment_provider_events_type_chk CHECK ((event_type = ANY (ARRAY['payment.authorized'::text, 'payment.captured'::text, 'payment.failed'::text, 'payment.expired'::text])))
);


--
-- Name: wlt_payment_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payment_sessions (
    id text DEFAULT ('wps_'::text || (gen_random_uuid())::text) NOT NULL,
    checkout_intent_id text,
    client_id text NOT NULL,
    store_id text NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    status text DEFAULT 'reference_created'::text NOT NULL,
    provider_reference text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    captured_at timestamp with time zone,
    cart_snapshot_hash text DEFAULT ''::text NOT NULL,
    idempotency_key text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    special_request_id text,
    operator_context_id text NOT NULL,
    subscription_purchase_id text,
    commercial_product_reference text,
    capture_ledger_transaction_id text,
    last_provider_event_id text,
    last_provider_status text DEFAULT ''::text NOT NULL,
    financial_purpose text NOT NULL,
    topup_reference text,
    topup_actor_type text,
    pricing_quote_id text,
    pricing_quote_hash text,
    pricing_quote_version integer,
    pricing_quote_expires_at timestamp with time zone,
    wallet_amount_minor_units bigint,
    cash_on_delivery_amount_minor_units bigint,
    CONSTRAINT wlt_payment_sessions_checkout_tender_allocation_chk CHECK ((((checkout_intent_id IS NULL) AND (wallet_amount_minor_units IS NULL) AND (cash_on_delivery_amount_minor_units IS NULL)) OR ((checkout_intent_id IS NOT NULL) AND (wallet_amount_minor_units IS NOT NULL) AND (cash_on_delivery_amount_minor_units IS NOT NULL) AND (wallet_amount_minor_units >= 0) AND (cash_on_delivery_amount_minor_units >= 0) AND ((wallet_amount_minor_units + cash_on_delivery_amount_minor_units) = amount_minor_units)))),
    CONSTRAINT wlt_payment_sessions_financial_purpose_chk CHECK ((financial_purpose = ANY (ARRAY['order_payment'::text, 'special_request_payment'::text, 'subscription_purchase'::text, 'customer_topup'::text, 'captain_topup'::text]))),
    CONSTRAINT wlt_payment_sessions_funding_rail_source_chk CHECK ((((topup_reference IS NOT NULL) AND (payment_method = 'official_wallet'::text)) OR ((topup_reference IS NULL) AND (payment_method <> 'official_wallet'::text)))),
    CONSTRAINT wlt_payment_sessions_operator_context_id_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_payment_sessions_operator_context_nonblank_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_payment_sessions_payment_method_chk CHECK ((payment_method = ANY (ARRAY['cod'::text, 'wallet'::text, 'mixed'::text, 'official_wallet'::text]))),
    CONSTRAINT wlt_payment_sessions_pricing_quote_binding_chk CHECK ((((checkout_intent_id IS NULL) AND (pricing_quote_id IS NULL) AND (pricing_quote_hash IS NULL) AND (pricing_quote_version IS NULL) AND (pricing_quote_expires_at IS NULL)) OR ((checkout_intent_id IS NOT NULL) AND (btrim(COALESCE(pricing_quote_id, ''::text)) <> ''::text) AND (btrim(COALESCE(pricing_quote_hash, ''::text)) <> ''::text) AND (pricing_quote_version IS NOT NULL) AND (pricing_quote_version > 0) AND (pricing_quote_expires_at IS NOT NULL)))),
    CONSTRAINT wlt_payment_sessions_source_xor_chk CHECK ((num_nonnulls(checkout_intent_id, special_request_id, subscription_purchase_id, topup_reference) = 1)),
    CONSTRAINT wlt_payment_sessions_subscription_product_chk CHECK ((((subscription_purchase_id IS NOT NULL) AND (commercial_product_reference IS NOT NULL)) OR ((subscription_purchase_id IS NULL) AND (commercial_product_reference IS NULL)))),
    CONSTRAINT wlt_payment_sessions_topup_actor_type_chk CHECK (((topup_actor_type IS NULL) OR (topup_actor_type = ANY (ARRAY['customer'::text, 'captain'::text])))),
    CONSTRAINT wlt_payment_sessions_topup_pair_chk CHECK ((((topup_reference IS NOT NULL) AND (topup_actor_type IS NOT NULL)) OR ((topup_reference IS NULL) AND (topup_actor_type IS NULL))))
);


--
-- Name: COLUMN wlt_payment_sessions.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.operator_context_id IS 'Trusted DSH identity OperatorContext. Mandatory; runtime fallback is forbidden.';


--
-- Name: COLUMN wlt_payment_sessions.financial_purpose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.financial_purpose IS 'Server-derived accounting meaning of the session. Derived from the trusted persisted source identity; never accepted from a caller.';


--
-- Name: COLUMN wlt_payment_sessions.topup_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.topup_reference IS 'Fourth source identity: set only for a Cash-In wallet top-up session, mutually exclusive with the order/special-request/subscription identities.';


--
-- Name: COLUMN wlt_payment_sessions.topup_actor_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.topup_actor_type IS 'customer|captain: which actor type wlt_payment_sessions.client_id refers to for a top-up session. NULL for every other source identity.';


--
-- Name: COLUMN wlt_payment_sessions.pricing_quote_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.pricing_quote_id IS 'Immutable WLT pricing quote identity bound to the checkout payment session.';


--
-- Name: COLUMN wlt_payment_sessions.pricing_quote_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.pricing_quote_hash IS 'Canonical quote content hash; the payment amount is not authoritative without this binding.';


--
-- Name: COLUMN wlt_payment_sessions.wallet_amount_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.wallet_amount_minor_units IS 'WLT-owned checkout tender amount paid from the client wallet at the immutable handoff snapshot.';


--
-- Name: COLUMN wlt_payment_sessions.cash_on_delivery_amount_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payment_sessions.cash_on_delivery_amount_minor_units IS 'WLT-owned checkout tender amount exposed to physical COD custody and captain capacity.';


--
-- Name: wlt_payment_status_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payment_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_payment_status_refs_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'authorized'::text, 'captured'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text])))
);


--
-- Name: wlt_payout_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_audit_events (
    id text DEFAULT ('wpa37_'::text || (gen_random_uuid())::text) NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    action text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_payout_audit_events_action_check CHECK ((btrim(action) <> ''::text)),
    CONSTRAINT wlt_payout_audit_events_actor_id_check CHECK ((btrim(actor_id) <> ''::text)),
    CONSTRAINT wlt_payout_audit_events_actor_type_check CHECK ((btrim(actor_type) <> ''::text)),
    CONSTRAINT wlt_payout_audit_events_aggregate_id_check CHECK ((btrim(aggregate_id) <> ''::text)),
    CONSTRAINT wlt_payout_audit_events_aggregate_type_check CHECK ((aggregate_type = ANY (ARRAY['payout_destination'::text, 'payout_request'::text, 'payout_reconciliation'::text]))),
    CONSTRAINT wlt_payout_audit_events_correlation_id_check CHECK ((btrim(correlation_id) <> ''::text))
);


--
-- Name: TABLE wlt_payout_audit_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_payout_audit_events IS 'Append-only audit truth for payout destination, request, and reconciliation changes.';


--
-- Name: wlt_payout_destination_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_destination_requests (
    partner_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    payout_destination_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_payout_destination_requests_key_length CHECK ((length(btrim(idempotency_key)) >= 8))
);


--
-- Name: COLUMN wlt_payout_destination_requests.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_destination_requests.operator_context_id IS 'OperatorContext-local destination mutation idempotency identity.';


--
-- Name: wlt_payout_destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_destinations (
    id text DEFAULT ('wpd_'::text || (gen_random_uuid())::text) NOT NULL,
    partner_id text NOT NULL,
    beneficiary_name text DEFAULT ''::text NOT NULL,
    account_number text DEFAULT ''::text NOT NULL,
    iban text DEFAULT ''::text NOT NULL,
    payout_mobile_number text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_actor_id text NOT NULL,
    owner_actor_type text NOT NULL,
    operator_context_id text NOT NULL,
    destination_method text NOT NULL,
    destination_reference_encrypted bytea,
    masked_destination_reference text NOT NULL,
    destination_verification_status text NOT NULL,
    destination_verified_at timestamp with time zone,
    destination_verified_by_operator_id text,
    official_wallet_provider_key text,
    destination_version integer NOT NULL,
    material_identity_hash text NOT NULL,
    superseded_at timestamp with time zone,
    CONSTRAINT wlt_payout_destinations_owner_actor_type_chk CHECK ((owner_actor_type = ANY (ARRAY['partner'::text, 'captain'::text, 'field'::text]))),
    CONSTRAINT wlt_payout_destinations_verification_status_chk CHECK ((destination_verification_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'requires_reverification'::text, 'rejected'::text]))),
    CONSTRAINT wlt_payout_destinations_verified_provider_chk CHECK (((destination_verification_status <> 'verified'::text) OR (official_wallet_provider_key IS NOT NULL)))
);


--
-- Name: COLUMN wlt_payout_destinations.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_destinations.operator_context_id IS 'OperatorContext owning encrypted payout destination truth.';


--
-- Name: wlt_payout_four_way_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_four_way_reconciliations (
    id text DEFAULT ('wpfwr_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    payout_request_id text NOT NULL,
    approved_snapshot_id text NOT NULL,
    settlement_batch_id text NOT NULL,
    manual_transfer_evidence_id text NOT NULL,
    statement_line_id text NOT NULL,
    result text NOT NULL,
    reconciled_by_operator_id text NOT NULL,
    reconciled_at timestamp with time zone DEFAULT now() NOT NULL,
    canonical_ledger_transaction_id text,
    CONSTRAINT wlt_payout_four_way_reconciliations_result_check CHECK ((result = ANY (ARRAY['MATCHED'::text, 'UNMATCHED'::text, 'AMOUNT_MISMATCH'::text, 'DESTINATION_MISMATCH'::text, 'DUPLICATE_REFERENCE'::text, 'MISSING_TRANSFER'::text, 'UNKNOWN_EXTERNAL_TRANSACTION'::text, 'NEEDS_REVIEW'::text])))
);


--
-- Name: wlt_payout_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_reconciliations (
    id text DEFAULT ('wpr37_'::text || (gen_random_uuid())::text) NOT NULL,
    payout_request_id text NOT NULL,
    provider_reference text DEFAULT ''::text NOT NULL,
    inquiry_status text NOT NULL,
    provider_status text DEFAULT ''::text NOT NULL,
    provider_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    operator_id text NOT NULL,
    correlation_id text NOT NULL,
    resolution_action text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_payout_reconciliations_correlation_id_check CHECK ((btrim(correlation_id) <> ''::text)),
    CONSTRAINT wlt_payout_reconciliations_inquiry_status_check CHECK ((inquiry_status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'unknown'::text]))),
    CONSTRAINT wlt_payout_reconciliations_operator_id_check CHECK ((btrim(operator_id) <> ''::text)),
    CONSTRAINT wlt_payout_reconciliations_resolution_action_check CHECK ((resolution_action = ANY (ARRAY[''::text, 'confirmed_success'::text, 'confirmed_failed'::text])))
);


--
-- Name: TABLE wlt_payout_reconciliations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_payout_reconciliations IS 'Provider inquiry evidence for ambiguous payout outcomes; unknown results never release funds directly.';


--
-- Name: COLUMN wlt_payout_reconciliations.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_reconciliations.operator_context_id IS 'OperatorContext copied from the payout request for isolated provider inquiry evidence.';


--
-- Name: wlt_payout_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_payout_requests (
    id text DEFAULT ('wpor_'::text || (gen_random_uuid())::text) NOT NULL,
    beneficiary_actor_id text NOT NULL,
    beneficiary_actor_type text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    failure_reason text,
    operator_id text,
    idempotency_key text,
    payload_hash text,
    approved_by_operator_id text,
    rejected_by_operator_id text,
    processed_by_operator_id text,
    completed_by_operator_id text,
    failed_by_operator_id text,
    provider_reference text DEFAULT ''::text NOT NULL,
    provider_status text DEFAULT ''::text NOT NULL,
    provider_processed_at timestamp with time zone,
    payout_destination_id text,
    request_hash text,
    reconciliation_status text DEFAULT 'not_required'::text NOT NULL,
    reconciled_at timestamp with time zone,
    reconciled_by_operator_id text,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    executed_at timestamp with time zone,
    executed_by_operator_id text,
    verified_at timestamp with time zone,
    verified_by_operator_id text,
    CONSTRAINT wlt_payout_requests_execution_sod_chk CHECK (((verified_by_operator_id IS NULL) OR ((verified_by_operator_id <> COALESCE(executed_by_operator_id, ''::text)) AND (verified_by_operator_id <> COALESCE(approved_by_operator_id, ''::text))))),
    CONSTRAINT wlt_payout_requests_reconciliation_status_chk CHECK ((reconciliation_status = ANY (ARRAY['not_required'::text, 'required'::text, 'inquiry_pending'::text, 'resolved_success'::text, 'resolved_failed'::text]))),
    CONSTRAINT wlt_payout_requests_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executed'::text, 'verified'::text, 'completed'::text, 'failed'::text, 'provider_pending'::text, 'processing'::text, 'provider_result_unknown'::text])))
);


--
-- Name: COLUMN wlt_payout_requests.provider_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_requests.provider_reference IS 'External or simulator provider transaction reference required before completion.';


--
-- Name: COLUMN wlt_payout_requests.provider_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_requests.provider_status IS 'Last authoritative payout provider status.';


--
-- Name: COLUMN wlt_payout_requests.executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_requests.executed_at IS 'When the external official-wallet transfer was recorded by the executor.';


--
-- Name: COLUMN wlt_payout_requests.verified_by_operator_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_payout_requests.verified_by_operator_id IS 'Independent verifier of the external transfer; must differ from the executor and the approver.';


--
-- Name: wlt_promotion_funding_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_promotion_funding_commands (
    id text DEFAULT ('pfc_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    operator_context_id text NOT NULL,
    reservation_id text NOT NULL,
    operation text NOT NULL,
    target_status text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    state text DEFAULT 'claimed'::text NOT NULL,
    result_status text DEFAULT ''::text NOT NULL,
    result_ledger_transaction_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT wlt_promotion_funding_commands_operation_check CHECK ((operation = ANY (ARRAY['commit'::text, 'release'::text, 'reverse'::text]))),
    CONSTRAINT wlt_promotion_funding_commands_request_hash_check CHECK ((length(request_hash) = 64)),
    CONSTRAINT wlt_promotion_funding_commands_state_check CHECK ((state = ANY (ARRAY['claimed'::text, 'completed'::text]))),
    CONSTRAINT wlt_promotion_funding_commands_target_status_check CHECK ((target_status = ANY (ARRAY['committed'::text, 'released'::text, 'reversed'::text])))
);


--
-- Name: TABLE wlt_promotion_funding_commands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_promotion_funding_commands IS 'Canonical command identity and exact replay receipt for promotion-funding financial transitions.';


--
-- Name: wlt_promotion_funding_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_promotion_funding_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    order_id text,
    actor_service text DEFAULT 'dsh'::text NOT NULL,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    transaction_id bigint DEFAULT txid_current() NOT NULL,
    CONSTRAINT wlt_promotion_funding_events_actor_service_check CHECK ((actor_service = 'dsh'::text)),
    CONSTRAINT wlt_promotion_funding_events_event_type_check CHECK ((event_type = ANY (ARRAY['reserved'::text, 'committed'::text, 'released'::text, 'reversed'::text])))
);


--
-- Name: wlt_promotion_funding_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_promotion_funding_reservations (
    id text DEFAULT ('pfr_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    operator_context_id text NOT NULL,
    external_reference text NOT NULL,
    checkout_intent_id text NOT NULL,
    coupon_redemption_id text NOT NULL,
    coupon_id text NOT NULL,
    client_id text NOT NULL,
    partner_id text,
    platform_funded_minor_units bigint DEFAULT 0 NOT NULL,
    partner_funded_minor_units bigint DEFAULT 0 NOT NULL,
    total_discount_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'reserved'::text NOT NULL,
    order_id text,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    committed_at timestamp with time zone,
    released_at timestamp with time zone,
    reversed_at timestamp with time zone,
    release_reason text DEFAULT ''::text NOT NULL,
    reversal_reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    commit_ledger_transaction_id text,
    reversal_ledger_transaction_id text,
    CONSTRAINT wlt_promotion_commit_order_chk CHECK (((status <> 'committed'::text) OR ((order_id IS NOT NULL) AND (btrim(order_id) <> ''::text) AND (committed_at IS NOT NULL)))),
    CONSTRAINT wlt_promotion_funding_reserva_platform_funded_minor_units_check CHECK ((platform_funded_minor_units >= 0)),
    CONSTRAINT wlt_promotion_funding_reservat_partner_funded_minor_units_check CHECK ((partner_funded_minor_units >= 0)),
    CONSTRAINT wlt_promotion_funding_reservat_total_discount_minor_units_check CHECK ((total_discount_minor_units > 0)),
    CONSTRAINT wlt_promotion_funding_reservations_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_promotion_funding_reservations_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'committed'::text, 'released'::text, 'reversed'::text]))),
    CONSTRAINT wlt_promotion_funding_split_chk CHECK (((platform_funded_minor_units + partner_funded_minor_units) = total_discount_minor_units)),
    CONSTRAINT wlt_promotion_partner_source_chk CHECK ((((partner_funded_minor_units = 0) AND (partner_id IS NULL)) OR ((partner_funded_minor_units > 0) AND (partner_id IS NOT NULL) AND (btrim(partner_id) <> ''::text)))),
    CONSTRAINT wlt_promotion_release_chk CHECK (((status <> 'released'::text) OR (released_at IS NOT NULL))),
    CONSTRAINT wlt_promotion_reverse_chk CHECK (((status <> 'reversed'::text) OR ((order_id IS NOT NULL) AND (reversed_at IS NOT NULL))))
);


--
-- Name: wlt_provider_debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_provider_debts (
    id text DEFAULT ('wdebt_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    provider_actor_id text NOT NULL,
    provider_actor_type text NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    policy_id text NOT NULL,
    policy_version text NOT NULL,
    original_amount_minor_units bigint NOT NULL,
    outstanding_amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    ledger_transaction_id text NOT NULL,
    settled_at timestamp with time zone,
    reversed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_provider_debts_check CHECK ((outstanding_amount_minor_units <= original_amount_minor_units)),
    CONSTRAINT wlt_provider_debts_check1 CHECK (((status <> ALL (ARRAY['settled'::text, 'reversed'::text, 'written_off'::text])) OR (outstanding_amount_minor_units = 0))),
    CONSTRAINT wlt_provider_debts_check2 CHECK (((status <> 'open'::text) OR (outstanding_amount_minor_units > 0))),
    CONSTRAINT wlt_provider_debts_currency_check CHECK (((char_length(currency) = 3) AND (currency = upper(currency)))),
    CONSTRAINT wlt_provider_debts_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_provider_debts_original_amount_minor_units_check CHECK ((original_amount_minor_units > 0)),
    CONSTRAINT wlt_provider_debts_outstanding_amount_minor_units_check CHECK ((outstanding_amount_minor_units >= 0)),
    CONSTRAINT wlt_provider_debts_policy_id_check CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_provider_debts_policy_version_check CHECK ((btrim(policy_version) <> ''::text)),
    CONSTRAINT wlt_provider_debts_provider_actor_id_check CHECK ((btrim(provider_actor_id) <> ''::text)),
    CONSTRAINT wlt_provider_debts_provider_actor_type_check CHECK ((provider_actor_type = ANY (ARRAY['captain'::text, 'field'::text]))),
    CONSTRAINT wlt_provider_debts_source_id_check CHECK ((btrim(source_id) <> ''::text)),
    CONSTRAINT wlt_provider_debts_source_type_check CHECK ((source_type = 'provider_penalty'::text)),
    CONSTRAINT wlt_provider_debts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'partially_settled'::text, 'settled'::text, 'reversed'::text, 'written_off'::text])))
);


--
-- Name: TABLE wlt_provider_debts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_provider_debts IS 'WLT-owned provider receivable/debt. Outstanding liability blocks financial eligibility until settled, reversed or governed off.';


--
-- Name: wlt_provider_penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_provider_penalties (
    id text DEFAULT ('wpen_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    incident_id text NOT NULL,
    provider_actor_id text NOT NULL,
    provider_actor_type text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'posted'::text NOT NULL,
    ledger_transaction_id text NOT NULL,
    reversal_ledger_transaction_id text,
    posted_by_actor_id text NOT NULL,
    reversed_by_actor_id text,
    reversed_reason text,
    idempotency_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reversed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    policy_id text NOT NULL,
    policy_version text NOT NULL,
    debt_id text,
    wallet_applied_amount_minor_units bigint DEFAULT 0 NOT NULL,
    debt_amount_minor_units bigint DEFAULT 0 NOT NULL,
    post_request_hash text NOT NULL,
    reversal_idempotency_key text,
    reversal_request_hash text,
    CONSTRAINT wlt_provider_penalties_amount_minor_units_check CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_provider_penalties_applied_sum_chk CHECK (((wallet_applied_amount_minor_units + debt_amount_minor_units) = amount_minor_units)),
    CONSTRAINT wlt_provider_penalties_check CHECK (((status <> 'reversed'::text) OR ((reversal_ledger_transaction_id IS NOT NULL) AND (reversed_at IS NOT NULL) AND (btrim(COALESCE(reversed_reason, ''::text)) <> ''::text)))),
    CONSTRAINT wlt_provider_penalties_currency_check CHECK ((char_length(currency) = 3)),
    CONSTRAINT wlt_provider_penalties_debt_amount_chk CHECK ((debt_amount_minor_units >= 0)),
    CONSTRAINT wlt_provider_penalties_incident_id_check CHECK ((btrim(incident_id) <> ''::text)),
    CONSTRAINT wlt_provider_penalties_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_provider_penalties_post_request_hash_chk CHECK ((NULLIF(btrim(post_request_hash), ''::text) IS NOT NULL)),
    CONSTRAINT wlt_provider_penalties_provider_actor_id_check CHECK ((btrim(provider_actor_id) <> ''::text)),
    CONSTRAINT wlt_provider_penalties_provider_actor_type_check CHECK ((provider_actor_type = ANY (ARRAY['captain'::text, 'field'::text]))),
    CONSTRAINT wlt_provider_penalties_reason_check CHECK ((char_length(btrim(reason)) >= 3)),
    CONSTRAINT wlt_provider_penalties_reversal_identity_chk CHECK ((((status = 'posted'::text) AND (reversal_idempotency_key IS NULL) AND (reversal_request_hash IS NULL)) OR ((status = 'reversed'::text) AND (NULLIF(btrim(reversal_idempotency_key), ''::text) IS NOT NULL) AND (NULLIF(btrim(reversal_request_hash), ''::text) IS NOT NULL)))),
    CONSTRAINT wlt_provider_penalties_status_check CHECK ((status = ANY (ARRAY['posted'::text, 'reversed'::text]))),
    CONSTRAINT wlt_provider_penalties_wallet_applied_chk CHECK ((wallet_applied_amount_minor_units >= 0))
);


--
-- Name: TABLE wlt_provider_penalties; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_provider_penalties IS 'WLT-owned wallet debit and reversal records generated from governed Workforce incidents.';


--
-- Name: COLUMN wlt_provider_penalties.post_request_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_provider_penalties.post_request_hash IS 'Canonical hash bound to the POST idempotency key; payload drift is rejected.';


--
-- Name: COLUMN wlt_provider_penalties.reversal_idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_provider_penalties.reversal_idempotency_key IS 'Canonical end-to-end reversal command identity. One key cannot represent another penalty or payload.';


--
-- Name: wlt_provider_penalty_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_provider_penalty_policies (
    operator_context_id text NOT NULL,
    policy_id text NOT NULL,
    policy_version text NOT NULL,
    provider_actor_type text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    change_reason text DEFAULT 'legacy-migrated'::text NOT NULL,
    updated_by_actor_id text DEFAULT 'system'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_provider_penalty_policies_amount_minor_units_check CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_provider_penalty_policies_change_reason_check CHECK ((char_length(btrim(change_reason)) >= 3)),
    CONSTRAINT wlt_provider_penalty_policies_currency_check CHECK (((char_length(currency) = 3) AND (currency = upper(currency)))),
    CONSTRAINT wlt_provider_penalty_policies_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_provider_penalty_policies_policy_id_check CHECK ((btrim(policy_id) <> ''::text)),
    CONSTRAINT wlt_provider_penalty_policies_policy_version_check CHECK ((btrim(policy_version) <> ''::text)),
    CONSTRAINT wlt_provider_penalty_policies_provider_actor_type_check CHECK ((provider_actor_type = ANY (ARRAY['captain'::text, 'field'::text, 'any'::text])))
);


--
-- Name: TABLE wlt_provider_penalty_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_provider_penalty_policies IS 'WLT-owned versioned penalty catalog. Workforce selects policy_id; WLT derives amount and currency.';


--
-- Name: wlt_reconciliation_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_reconciliation_cases (
    id text DEFAULT ('wrec_'::text || (gen_random_uuid())::text) NOT NULL,
    payment_session_id text NOT NULL,
    operation text NOT NULL,
    trigger_reason text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_to_operator_id text,
    assigned_at timestamp with time zone,
    resolved_by_operator_id text,
    resolution_note text,
    resolution_action text,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_reconciliation_cases_operation_chk CHECK ((operation = ANY (ARRAY['authorize'::text, 'capture'::text, 'refund'::text]))),
    CONSTRAINT wlt_reconciliation_cases_resolution_action_chk CHECK (((resolution_action IS NULL) OR (resolution_action = ANY (ARRAY['confirmed_success'::text, 'confirmed_failed'::text, 'manual_adjustment'::text, 'ignored'::text])))),
    CONSTRAINT wlt_reconciliation_cases_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: COLUMN wlt_reconciliation_cases.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_reconciliation_cases.operator_context_id IS 'OperatorContext copied from the authoritative WLT payment session; active runtime never falls back to legacy-unscoped.';


--
-- Name: wlt_refund_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_refund_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_id text NOT NULL,
    operator_context_id text NOT NULL,
    event_type text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    reason text,
    correlation_id text,
    idempotency_key text,
    provider_reference text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_refund_audit_actor_type_chk CHECK ((actor_type = ANY (ARRAY['operator'::text, 'service'::text, 'provider'::text, 'reconciler'::text, 'system'::text])))
);


--
-- Name: wlt_refund_operation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_refund_operation_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    operation text NOT NULL,
    request_path text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    actor_id text,
    reason text,
    correlation_id text,
    request_body text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    response_status integer,
    response_content_type text,
    response_body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT wlt_refund_operation_receipts_operation_chk CHECK ((operation = ANY (ARRAY['create'::text, 'approve'::text, 'reject'::text, 'complete'::text, 'reconcile'::text]))),
    CONSTRAINT wlt_refund_operation_receipts_response_chk CHECK ((((status = 'processing'::text) AND (response_status IS NULL) AND (completed_at IS NULL)) OR ((status = 'completed'::text) AND ((response_status >= 100) AND (response_status <= 599)) AND (response_body IS NOT NULL) AND (completed_at IS NOT NULL)))),
    CONSTRAINT wlt_refund_operation_receipts_status_chk CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text])))
);


--
-- Name: wlt_refund_status_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_refund_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_refund_status_refs_status_chk CHECK ((status = ANY (ARRAY['none'::text, 'requested'::text, 'approved'::text, 'processing'::text, 'provider_unknown'::text, 'partially_refunded'::text, 'completed'::text, 'rejected'::text])))
);


--
-- Name: wlt_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_refunds (
    id text DEFAULT ('wref_'::text || (gen_random_uuid())::text) NOT NULL,
    payment_session_id text NOT NULL,
    order_id text NOT NULL,
    client_id text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    request_source text DEFAULT 'order_cancellation'::text NOT NULL,
    provider_refund_reference text,
    failure_code text,
    failure_message text,
    operator_context_id text NOT NULL,
    requested_by_operator_id text DEFAULT 'dsh-order-cancellation'::text NOT NULL,
    approved_by_operator_id text,
    rejected_by_operator_id text,
    decision_reason text,
    eligibility_reference text DEFAULT 'legacy'::text NOT NULL,
    idempotency_key text NOT NULL,
    provider_idempotency_key text NOT NULL,
    provider_reference text,
    provider_status text,
    provider_error text,
    provider_attempted_at timestamp with time zone,
    reconciliation_case_id text,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT wlt_refunds_maker_checker_chk CHECK ((((approved_by_operator_id IS NULL) OR (approved_by_operator_id <> requested_by_operator_id)) AND ((rejected_by_operator_id IS NULL) OR (rejected_by_operator_id <> requested_by_operator_id)))),
    CONSTRAINT wlt_refunds_provider_reference_sync_chk CHECK (((provider_reference IS NULL) OR (provider_refund_reference IS NULL) OR (provider_reference = provider_refund_reference))),
    CONSTRAINT wlt_refunds_reason_required_check CHECK ((btrim(reason) <> ''::text)),
    CONSTRAINT wlt_refunds_request_source_check CHECK ((request_source = ANY (ARRAY['order_cancellation'::text, 'support'::text, 'operator_adjustment'::text]))),
    CONSTRAINT wlt_refunds_status_chk CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'provider_unknown'::text, 'completed'::text, 'rejected'::text, 'reversed'::text])))
);


--
-- Name: wlt_settlement_audit_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_audit_packs (
    id text DEFAULT ('wsap_'::text || (gen_random_uuid())::text) NOT NULL,
    batch_id text NOT NULL,
    provider_statement_reference text NOT NULL,
    control_total_minor_units bigint NOT NULL,
    evidence_count integer NOT NULL,
    generated_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL
);


--
-- Name: wlt_settlement_batch_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_batch_rows (
    batch_id text NOT NULL,
    approved_snapshot_id text NOT NULL
);


--
-- Name: wlt_settlement_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_batches (
    id text DEFAULT ('wsb_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    provider_id text NOT NULL,
    currency text NOT NULL,
    batch_hash text NOT NULL,
    control_total_minor_units bigint NOT NULL,
    row_count integer NOT NULL,
    created_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    frozen_at timestamp with time zone,
    CONSTRAINT wlt_settlement_batches_status_check CHECK ((status = ANY (ARRAY['open'::text, 'frozen'::text, 'execution_in_progress'::text, 'awaiting_verification'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: wlt_settlement_mutation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_mutation_requests (
    operator_context_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    settlement_batch_id text NOT NULL,
    acted_by_operator_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_settlement_mutation_requests_acted_by_operator_id_check CHECK ((btrim(acted_by_operator_id) <> ''::text)),
    CONSTRAINT wlt_settlement_mutation_requests_correlation_id_check CHECK ((btrim(correlation_id) <> ''::text)),
    CONSTRAINT wlt_settlement_mutation_requests_operation_check CHECK ((operation = ANY (ARRAY['batch_create'::text, 'batch_freeze'::text]))),
    CONSTRAINT wlt_settlement_mutation_requests_request_hash_check CHECK ((request_hash ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: wlt_settlement_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_policies (
    partner_id text NOT NULL,
    fee_basis_points integer NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    updated_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_policies_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_settlement_policies_fee_basis_points_check CHECK (((fee_basis_points >= 0) AND (fee_basis_points <= 10000))),
    CONSTRAINT wlt_settlement_policies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: TABLE wlt_settlement_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_settlement_policies IS 'WLT-owned partner fee policy in basis points. No implicit platform fee exists.';


--
-- Name: COLUMN wlt_settlement_policies.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_settlement_policies.operator_context_id IS 'OperatorContext owning the settlement policy; active runtime never falls back to legacy-unscoped.';


--
-- Name: wlt_settlement_policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_policy_versions (
    partner_id text NOT NULL,
    version bigint NOT NULL,
    fee_basis_points integer NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    cycle_days integer DEFAULT 7 NOT NULL,
    minimum_net_minor_units bigint DEFAULT 0 NOT NULL,
    change_reason text NOT NULL,
    updated_by_operator_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_policy_versions_change_reason_check CHECK ((btrim(change_reason) <> ''::text)),
    CONSTRAINT wlt_settlement_policy_versions_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_settlement_policy_versions_cycle_days_check CHECK (((cycle_days >= 1) AND (cycle_days <= 366))),
    CONSTRAINT wlt_settlement_policy_versions_fee_basis_points_check CHECK (((fee_basis_points >= 0) AND (fee_basis_points <= 10000))),
    CONSTRAINT wlt_settlement_policy_versions_minimum_net_minor_units_check CHECK ((minimum_net_minor_units >= 0)),
    CONSTRAINT wlt_settlement_policy_versions_partner_id_check CHECK ((btrim(partner_id) <> ''::text)),
    CONSTRAINT wlt_settlement_policy_versions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT wlt_settlement_policy_versions_updated_by_operator_id_check CHECK ((btrim(updated_by_operator_id) <> ''::text)),
    CONSTRAINT wlt_settlement_policy_versions_version_check CHECK ((version > 0))
);


--
-- Name: wlt_settlement_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_requests (
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    settlement_id text NOT NULL,
    partner_id text NOT NULL,
    policy_version bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_requests_idempotency_key_check CHECK ((btrim(idempotency_key) <> ''::text)),
    CONSTRAINT wlt_settlement_requests_partner_id_check CHECK ((btrim(partner_id) <> ''::text)),
    CONSTRAINT wlt_settlement_requests_policy_version_check CHECK ((policy_version > 0)),
    CONSTRAINT wlt_settlement_requests_request_hash_check CHECK ((btrim(request_hash) <> ''::text))
);


--
-- Name: COLUMN wlt_settlement_requests.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_settlement_requests.operator_context_id IS 'OperatorContext-local idempotency and request evidence identity.';


--
-- Name: wlt_settlement_source_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_source_evidence (
    order_id text NOT NULL,
    settlement_id text NOT NULL,
    pricing_snapshot_hash text NOT NULL,
    completion_event_id text NOT NULL,
    completion_evidence_hash text NOT NULL,
    cancellation_status text NOT NULL,
    original_gross_minor_units bigint NOT NULL,
    completed_refund_minor_units bigint DEFAULT 0 NOT NULL,
    settlement_basis_minor_units bigint NOT NULL,
    refund_evidence_count integer DEFAULT 0 NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_refund_basis_chk CHECK ((original_gross_minor_units = (completed_refund_minor_units + settlement_basis_minor_units))),
    CONSTRAINT wlt_settlement_source_eviden_completed_refund_minor_units_check CHECK ((completed_refund_minor_units >= 0)),
    CONSTRAINT wlt_settlement_source_eviden_settlement_basis_minor_units_check CHECK ((settlement_basis_minor_units >= 0)),
    CONSTRAINT wlt_settlement_source_evidence_cancellation_status_check CHECK ((cancellation_status = ANY (ARRAY['not_cancelled'::text, 'cancelled'::text]))),
    CONSTRAINT wlt_settlement_source_evidence_completion_event_id_check CHECK ((btrim(completion_event_id) <> ''::text)),
    CONSTRAINT wlt_settlement_source_evidence_completion_evidence_hash_check CHECK ((btrim(completion_evidence_hash) <> ''::text)),
    CONSTRAINT wlt_settlement_source_evidence_original_gross_minor_units_check CHECK ((original_gross_minor_units > 0)),
    CONSTRAINT wlt_settlement_source_evidence_pricing_snapshot_hash_check CHECK ((btrim(pricing_snapshot_hash) <> ''::text)),
    CONSTRAINT wlt_settlement_source_evidence_refund_evidence_count_check CHECK ((refund_evidence_count >= 0))
);


--
-- Name: TABLE wlt_settlement_source_evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_settlement_source_evidence IS 'Immutable DSH completion/cancellation evidence enriched by WLT-owned completed refund truth.';


--
-- Name: COLUMN wlt_settlement_source_evidence.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_settlement_source_evidence.operator_context_id IS 'OperatorContext owning immutable DSH settlement evidence.';


--
-- Name: wlt_settlement_source_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_source_orders (
    order_id text NOT NULL,
    settlement_id text NOT NULL,
    partner_id text NOT NULL,
    gross_amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    delivered_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_source_orders_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_settlement_source_orders_gross_amount_minor_units_check CHECK ((gross_amount_minor_units > 0))
);


--
-- Name: TABLE wlt_settlement_source_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_settlement_source_orders IS 'Immutable delivered DSH order sources. order_id uniqueness prevents double settlement.';


--
-- Name: wlt_settlement_status_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlement_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_settlement_status_refs_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'settled'::text, 'failed'::text])))
);


--
-- Name: wlt_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_settlements (
    id text DEFAULT ('wset_'::text || (gen_random_uuid())::text) NOT NULL,
    partner_id text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross_amount bigint DEFAULT 0 NOT NULL,
    platform_fee bigint DEFAULT 0 NOT NULL,
    net_amount bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    order_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    CONSTRAINT wlt_settlements_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'settled'::text, 'failed'::text, 'reversed'::text])))
);


--
-- Name: wlt_special_request_quote_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_special_request_quote_policies (
    policy_id text NOT NULL,
    version integer NOT NULL,
    min_amount_minor_units bigint NOT NULL,
    max_amount_minor_units bigint NOT NULL,
    quote_validity_seconds integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_special_request_quote_policies_check CHECK ((max_amount_minor_units >= min_amount_minor_units)),
    CONSTRAINT wlt_special_request_quote_policies_min_amount_minor_units_check CHECK ((min_amount_minor_units > 0)),
    CONSTRAINT wlt_special_request_quote_policies_quote_validity_seconds_check CHECK (((quote_validity_seconds >= 60) AND (quote_validity_seconds <= 86400))),
    CONSTRAINT wlt_special_request_quote_policies_version_check CHECK ((version > 0))
);


--
-- Name: wlt_special_request_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_special_request_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    special_request_id uuid NOT NULL,
    client_id uuid NOT NULL,
    policy_id text NOT NULL,
    policy_version integer NOT NULL,
    quote_version integer NOT NULL,
    proposed_amount_minor_units bigint NOT NULL,
    proposed_currency text NOT NULL,
    proposal_reason text NOT NULL,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    quote_hash text NOT NULL,
    request_hash text NOT NULL,
    status text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_special_request_quotes_amount_minor_units_check CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_special_request_quotes_currency_check CHECK (((currency = upper(currency)) AND (char_length(currency) = 3))),
    CONSTRAINT wlt_special_request_quotes_policy_version_check CHECK ((policy_version > 0)),
    CONSTRAINT wlt_special_request_quotes_proposal_reason_check CHECK ((char_length(btrim(proposal_reason)) >= 5)),
    CONSTRAINT wlt_special_request_quotes_proposed_amount_minor_units_check CHECK ((proposed_amount_minor_units > 0)),
    CONSTRAINT wlt_special_request_quotes_proposed_currency_check CHECK (((proposed_currency = upper(proposed_currency)) AND (char_length(proposed_currency) = 3))),
    CONSTRAINT wlt_special_request_quotes_quote_hash_check CHECK ((char_length(quote_hash) = 64)),
    CONSTRAINT wlt_special_request_quotes_quote_version_check CHECK ((quote_version > 0)),
    CONSTRAINT wlt_special_request_quotes_request_hash_check CHECK ((char_length(request_hash) = 64)),
    CONSTRAINT wlt_special_request_quotes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'superseded'::text, 'expired'::text, 'accepted'::text, 'cancelled'::text])))
);


--
-- Name: wlt_store_onboarding_fee_policy_legacy_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_store_onboarding_fee_policy_legacy_reviews (
    legacy_policy_id integer NOT NULL,
    legacy_amount numeric(12,2) NOT NULL,
    legacy_currency character varying(3) NOT NULL,
    legacy_enabled boolean NOT NULL,
    legacy_applies_to character varying(64) NOT NULL,
    legacy_charge_timing character varying(64) NOT NULL,
    legacy_effective_from timestamp with time zone,
    amount_has_fractional_units boolean NOT NULL,
    review_status character varying(64) DEFAULT 'requires_operator_context'::character varying NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_store_onboarding_fee_policy_legacy_revi_review_status_check CHECK (((review_status)::text = ANY ((ARRAY['requires_operator_context'::character varying, 'reviewed'::character varying])::text[])))
);


--
-- Name: TABLE wlt_store_onboarding_fee_policy_legacy_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_store_onboarding_fee_policy_legacy_reviews IS 'Legacy singleton onboarding fee rows retained for finance review only. They are never canonical financial authority.';


--
-- Name: wlt_store_onboarding_fee_policy_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_store_onboarding_fee_policy_versions (
    id bigint NOT NULL,
    operator_context_id character varying(128) NOT NULL,
    version integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency character varying(3) NOT NULL,
    applies_to character varying(64) NOT NULL,
    charge_timing character varying(64) NOT NULL,
    actor_charged character varying(64) DEFAULT 'partner'::character varying NOT NULL,
    effective_from timestamp with time zone,
    notes character varying(1000) DEFAULT ''::character varying NOT NULL,
    reason character varying(1000) NOT NULL,
    correlation_id character varying(200) NOT NULL,
    idempotency_key character varying(200) NOT NULL,
    created_by_actor_id character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_store_onboarding_fee_policy_versio_amount_minor_units_check CHECK ((amount_minor_units >= 0)),
    CONSTRAINT wlt_store_onboarding_fee_policy_versions_version_check CHECK ((version > 0))
);


--
-- Name: TABLE wlt_store_onboarding_fee_policy_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wlt_store_onboarding_fee_policy_versions IS 'Canonical immutable OperatorContext-scoped onboarding fee policy history. Current authority is the highest version for the scope; money is exact integer minor units and each version carries audit/idempotency metadata.';


--
-- Name: wlt_store_onboarding_fee_policy_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wlt_store_onboarding_fee_policy_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wlt_store_onboarding_fee_policy_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wlt_store_onboarding_fee_policy_versions_id_seq OWNED BY public.wlt_store_onboarding_fee_policy_versions.id;


--
-- Name: wlt_subscription_compensations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_subscription_compensations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    client_id text NOT NULL,
    payment_session_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reason text NOT NULL,
    refund_reference text,
    amount_minor_units bigint NOT NULL,
    currency text NOT NULL,
    requested_by_actor_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_subscription_compensation_completion_chk CHECK ((((status = 'completed'::text) AND (btrim(COALESCE(refund_reference, ''::text)) <> ''::text) AND (completed_at IS NOT NULL)) OR ((status <> 'completed'::text) AND (completed_at IS NULL)))),
    CONSTRAINT wlt_subscription_compensations_amount_minor_units_check CHECK ((amount_minor_units > 0)),
    CONSTRAINT wlt_subscription_compensations_currency_check CHECK ((btrim(currency) <> ''::text)),
    CONSTRAINT wlt_subscription_compensations_reason_check CHECK ((btrim(reason) <> ''::text)),
    CONSTRAINT wlt_subscription_compensations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: wlt_subscription_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_subscription_lifecycle_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    client_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    payment_session_id text,
    subscription_purchase_id text,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    actor_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT wlt_subscription_lifecycle_events_event_type_check CHECK ((event_type = ANY (ARRAY['activated'::text, 'renewed'::text, 'cancellation_scheduled'::text, 'cancelled'::text, 'expired'::text, 'compensation_requested'::text, 'compensation_completed'::text, 'compensation_failed'::text])))
);


--
-- Name: wlt_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_wallets (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    status text NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    available_balance_minor_units bigint DEFAULT 0 NOT NULL,
    pending_balance_minor_units bigint DEFAULT 0 NOT NULL,
    held_balance_minor_units bigint DEFAULT 0 NOT NULL,
    earned_total_minor_units bigint DEFAULT 0 NOT NULL,
    settled_total_minor_units bigint DEFAULT 0 NOT NULL,
    paid_total_minor_units bigint DEFAULT 0 NOT NULL,
    last_ledger_entry_at timestamp with time zone,
    operator_context_id text DEFAULT 'legacy-unscoped'::text NOT NULL,
    cod_reserved_balance_minor_units bigint DEFAULT 0 NOT NULL,
    collateral_reserved_balance_minor_units bigint DEFAULT 0 NOT NULL,
    wallet_reserved_balance_minor_units bigint DEFAULT 0 NOT NULL,
    CONSTRAINT wlt_wallet_refs_actor_type_chk CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text]))),
    CONSTRAINT wlt_wallet_refs_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'frozen'::text, 'closed'::text]))),
    CONSTRAINT wlt_wallets_collateral_reserved_nonnegative_chk CHECK ((collateral_reserved_balance_minor_units >= 0))
);


--
-- Name: COLUMN wlt_wallets.cod_reserved_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_wallets.cod_reserved_balance_minor_units IS 'Captain COD exposure currently reserved against this wallet (wlt-912). Distinct from held_balance_minor_units, which is payout-hold exposure (internal/payout) -- kept separate so the two hold types remain independently accountable.';


--
-- Name: COLUMN wlt_wallets.collateral_reserved_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_wallets.collateral_reserved_balance_minor_units IS 'WLT-owned captain collateral restricted inside the one canonical wallet; excluded from spendable available balance.';


--
-- Name: COLUMN wlt_wallets.wallet_reserved_balance_minor_units; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wlt_wallets.wallet_reserved_balance_minor_units IS 'Client wallet tender held by unresolved payment sessions; derived from wlt_payment_sessions.wallet_amount_minor_units.';


--
-- Name: wlt_wallet_projection_consistency; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.wlt_wallet_projection_consistency AS
 SELECT w.operator_context_id,
    w.actor_type,
    w.actor_id,
    w.currency,
    COALESCE((- a.balance_minor_units), (0)::bigint) AS canonical_balance_minor_units,
    w.available_balance_minor_units,
    w.pending_balance_minor_units,
    w.held_balance_minor_units,
    COALESCE(w.cod_reserved_balance_minor_units, (0)::bigint) AS cod_reserved_balance_minor_units,
    (((((w.available_balance_minor_units + w.pending_balance_minor_units) + w.held_balance_minor_units) + COALESCE(w.cod_reserved_balance_minor_units, (0)::bigint)) + COALESCE(w.collateral_reserved_balance_minor_units, (0)::bigint)) + COALESCE(w.wallet_reserved_balance_minor_units, (0)::bigint)) AS materialized_balance_minor_units,
    (COALESCE((- a.balance_minor_units), (0)::bigint) = (((((w.available_balance_minor_units + w.pending_balance_minor_units) + w.held_balance_minor_units) + COALESCE(w.cod_reserved_balance_minor_units, (0)::bigint)) + COALESCE(w.collateral_reserved_balance_minor_units, (0)::bigint)) + COALESCE(w.wallet_reserved_balance_minor_units, (0)::bigint))) AS consistent,
    COALESCE(w.collateral_reserved_balance_minor_units, (0)::bigint) AS collateral_reserved_balance_minor_units,
    COALESCE(w.wallet_reserved_balance_minor_units, (0)::bigint) AS wallet_reserved_balance_minor_units
   FROM (public.wlt_wallets w
     LEFT JOIN public.wlt_ledger_accounts a ON (((a.operator_context_id = w.operator_context_id) AND (a.account_type = 'wallet'::text) AND (a.actor_type = w.actor_type) AND (a.actor_id = w.actor_id) AND (a.currency = w.currency))))
  WHERE (w.operator_context_id <> 'legacy-unscoped'::text);


--
-- Name: wlt_wallet_projection_reconciliation_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wlt_wallet_projection_reconciliation_exceptions (
    id text DEFAULT ('wwpre_'::text || (gen_random_uuid())::text) NOT NULL,
    operator_context_id text NOT NULL,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    currency text NOT NULL,
    canonical_balance_minor_units bigint NOT NULL,
    materialized_balance_minor_units bigint NOT NULL,
    pending_balance_minor_units bigint NOT NULL,
    held_balance_minor_units bigint NOT NULL,
    cod_reserved_balance_minor_units bigint NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by_actor_id text,
    resolution_note text,
    CONSTRAINT wlt_wallet_projection_reconciliation_context_chk CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT wlt_wallet_projection_reconciliation_exceptions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: wlt_financial_store_onboarding_fee_policy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_financial_store_onboarding_fee_policy ALTER COLUMN id SET DEFAULT nextval('public.wlt_financial_store_onboarding_fee_policy_id_seq'::regclass);


--
-- Name: wlt_store_onboarding_fee_policy_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_store_onboarding_fee_policy_versions ALTER COLUMN id SET DEFAULT nextval('public.wlt_store_onboarding_fee_policy_versions_id_seq'::regclass);


--
-- Name: runtime_seed_history runtime_seed_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.runtime_seed_history
    ADD CONSTRAINT runtime_seed_history_pkey PRIMARY KEY (service_name, seed_name);


--


--
-- Name: wlt_promotion_funding_commands uq_wlt_promotion_funding_command_identity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_commands
    ADD CONSTRAINT uq_wlt_promotion_funding_command_identity UNIQUE (operator_context_id, reservation_id, operation, idempotency_key);


--
-- Name: wlt_approved_payout_snapshots wlt_approved_payout_snapshots_context_id_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_approved_payout_snapshots
    ADD CONSTRAINT wlt_approved_payout_snapshots_context_id_uq UNIQUE (operator_context_id, id);


--
-- Name: wlt_approved_payout_snapshots wlt_approved_payout_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_approved_payout_snapshots
    ADD CONSTRAINT wlt_approved_payout_snapshots_pkey PRIMARY KEY (id);


--
-- Name: wlt_approved_payout_snapshots wlt_approved_payout_snapshots_req_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_approved_payout_snapshots
    ADD CONSTRAINT wlt_approved_payout_snapshots_req_uq UNIQUE (operator_context_id, payout_request_id);


--
-- Name: wlt_finance_audit_events wlt_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_finance_audit_events
    ADD CONSTRAINT wlt_audit_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_captain_collateral_events wlt_captain_collateral_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_captain_collateral_events
    ADD CONSTRAINT wlt_captain_collateral_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_captain_collateral_policies wlt_captain_collateral_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_captain_collateral_policies
    ADD CONSTRAINT wlt_captain_collateral_policies_pkey PRIMARY KEY (operator_context_id);


--
-- Name: wlt_captain_collateral_positions wlt_captain_collateral_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_captain_collateral_positions
    ADD CONSTRAINT wlt_captain_collateral_positions_pkey PRIMARY KEY (id);


--
-- Name: wlt_checkout_pricing_quotes wlt_checkout_pricing_quotes_identity_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_checkout_pricing_quotes
    ADD CONSTRAINT wlt_checkout_pricing_quotes_identity_uniq UNIQUE (operator_context_id, checkout_intent_id);


--
-- Name: wlt_checkout_pricing_quotes wlt_checkout_pricing_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_checkout_pricing_quotes
    ADD CONSTRAINT wlt_checkout_pricing_quotes_pkey PRIMARY KEY (id);


--
-- Name: wlt_client_subscriptions wlt_client_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_operator_context_idempotency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_custody_evidence
    ADD CONSTRAINT wlt_cod_custody_evidence_operator_context_idempotency_key UNIQUE (operator_context_id, event_type, idempotency_key);


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_operatorcontext_proof_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_custody_evidence
    ADD CONSTRAINT wlt_cod_custody_evidence_operatorcontext_proof_key UNIQUE (operator_context_id, event_type, proof_reference);


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_operatorcontext_record_event_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_custody_evidence
    ADD CONSTRAINT wlt_cod_custody_evidence_operatorcontext_record_event_key UNIQUE (operator_context_id, cod_record_id, event_type);


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_custody_evidence
    ADD CONSTRAINT wlt_cod_custody_evidence_pkey PRIMARY KEY (id);


--
-- Name: wlt_cod_reconciliation_audit_events wlt_cod_reconciliation_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_audit_events
    ADD CONSTRAINT wlt_cod_reconciliation_audit_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_cases_operatorcontext_evidence_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_cases
    ADD CONSTRAINT wlt_cod_reconciliation_cases_operatorcontext_evidence_key UNIQUE (operator_context_id, custody_evidence_id);


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_cases_operatorcontext_record_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_cases
    ADD CONSTRAINT wlt_cod_reconciliation_cases_operatorcontext_record_key UNIQUE (operator_context_id, cod_record_id);


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_cases
    ADD CONSTRAINT wlt_cod_reconciliation_cases_pkey PRIMARY KEY (id);


--
-- Name: wlt_cod_records wlt_cod_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_records
    ADD CONSTRAINT wlt_cod_records_pkey PRIMARY KEY (id);


--
-- Name: wlt_cod_reservations wlt_cod_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reservations
    ADD CONSTRAINT wlt_cod_reservations_pkey PRIMARY KEY (id);


--
-- Name: wlt_commercial_context_backfill_exceptions wlt_commercial_context_backfill_excep_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commercial_context_backfill_exceptions
    ADD CONSTRAINT wlt_commercial_context_backfill_excep_entity_type_entity_id_key UNIQUE (entity_type, entity_id);


--
-- Name: wlt_commercial_context_backfill_exceptions wlt_commercial_context_backfill_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commercial_context_backfill_exceptions
    ADD CONSTRAINT wlt_commercial_context_backfill_exceptions_pkey PRIMARY KEY (id);


--
-- Name: wlt_commercial_products wlt_commercial_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commercial_products
    ADD CONSTRAINT wlt_commercial_products_pkey PRIMARY KEY (reference);


--
-- Name: wlt_commission_adjustments wlt_commission_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_adjustments
    ADD CONSTRAINT wlt_commission_adjustments_pkey PRIMARY KEY (id);


--
-- Name: wlt_commission_evidence wlt_commission_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_evidence
    ADD CONSTRAINT wlt_commission_evidence_pkey PRIMARY KEY (commission_id);


--
-- Name: wlt_commission_evidence wlt_commission_evidence_source_evidence_id_commission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_evidence
    ADD CONSTRAINT wlt_commission_evidence_source_evidence_id_commission_id_key UNIQUE (source_evidence_id, commission_id);


--
-- Name: wlt_commission_policies wlt_commission_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_policies
    ADD CONSTRAINT wlt_commission_policies_pkey PRIMARY KEY (id);


--
-- Name: wlt_commission_policy_versions wlt_commission_policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_policy_versions
    ADD CONSTRAINT wlt_commission_policy_versions_pkey PRIMARY KEY (operator_context_id, policy_id, version);


--
-- Name: wlt_commissions wlt_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commissions
    ADD CONSTRAINT wlt_commissions_pkey PRIMARY KEY (id);


--
-- Name: wlt_daily_finance_close wlt_daily_finance_close_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_daily_finance_close
    ADD CONSTRAINT wlt_daily_finance_close_pkey PRIMARY KEY (operator_context_id, business_date);


--
-- Name: wlt_dispatch_financial_eligibility_decisions wlt_dispatch_financial_eligibility_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_dispatch_financial_eligibility_decisions
    ADD CONSTRAINT wlt_dispatch_financial_eligibility_decisions_pkey PRIMARY KEY (id);


--
-- Name: wlt_dispatch_financial_eligibility_policies wlt_dispatch_financial_eligibility_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_dispatch_financial_eligibility_policies
    ADD CONSTRAINT wlt_dispatch_financial_eligibility_policies_pkey PRIMARY KEY (operator_context_id);


--
-- Name: wlt_dsh_outbox_events wlt_dsh_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_provider_accounts wlt_external_provider_accounts_identity_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_accounts
    ADD CONSTRAINT wlt_external_provider_accounts_identity_uq UNIQUE (operator_context_id, provider_key, account_reference_hash, currency);


--
-- Name: wlt_external_provider_accounts wlt_external_provider_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_accounts
    ADD CONSTRAINT wlt_external_provider_accounts_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_provider_statement_lines wlt_external_provider_statement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statement_lines
    ADD CONSTRAINT wlt_external_provider_statement_lines_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_provider_statement_lines wlt_external_provider_statement_lines_reference_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statement_lines
    ADD CONSTRAINT wlt_external_provider_statement_lines_reference_uq UNIQUE (operator_context_id, statement_id, external_transfer_reference);


--
-- Name: wlt_external_provider_statements wlt_external_provider_statements_artifact_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statements
    ADD CONSTRAINT wlt_external_provider_statements_artifact_uq UNIQUE (operator_context_id, artifact_sha256);


--
-- Name: wlt_external_provider_statements wlt_external_provider_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statements
    ADD CONSTRAINT wlt_external_provider_statements_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_provider_statements wlt_external_provider_statements_reference_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statements
    ADD CONSTRAINT wlt_external_provider_statements_reference_uq UNIQUE (operator_context_id, external_provider_account_id, statement_reference);


--
-- Name: wlt_external_provider_verification_keys wlt_external_provider_verification_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_verification_keys
    ADD CONSTRAINT wlt_external_provider_verification_keys_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_provider_verification_keys wlt_external_provider_verification_keys_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_verification_keys
    ADD CONSTRAINT wlt_external_provider_verification_keys_uq UNIQUE (operator_context_id, provider_key, key_id);


--
-- Name: wlt_external_statement_verification_receipts wlt_external_statement_verification_receipts_composite_fk_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_statement_verification_receipts
    ADD CONSTRAINT wlt_external_statement_verification_receipts_composite_fk_uq UNIQUE (operator_context_id, statement_id, id);


--
-- Name: wlt_external_statement_verification_receipts wlt_external_statement_verification_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_statement_verification_receipts
    ADD CONSTRAINT wlt_external_statement_verification_receipts_pkey PRIMARY KEY (id);


--
-- Name: wlt_external_statement_verification_receipts wlt_external_statement_verification_receipts_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_statement_verification_receipts
    ADD CONSTRAINT wlt_external_statement_verification_receipts_uq UNIQUE (operator_context_id, statement_id);


--
-- Name: wlt_field_commission_category_policy_versions wlt_field_commission_category_policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_field_commission_category_policy_versions
    ADD CONSTRAINT wlt_field_commission_category_policy_versions_pkey PRIMARY KEY (operator_context_id, policy_id, version);


--
-- Name: wlt_field_commission_refs wlt_field_commission_refs_live_context_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_field_commission_refs
    ADD CONSTRAINT wlt_field_commission_refs_live_context_chk CHECK ((operator_context_id <> 'legacy-unscoped'::text)) NOT VALID;


--
-- Name: wlt_field_commission_refs wlt_field_commission_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_field_commission_refs
    ADD CONSTRAINT wlt_field_commission_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_financial_providers wlt_financial_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_financial_providers
    ADD CONSTRAINT wlt_financial_providers_pkey PRIMARY KEY (id);


--
-- Name: wlt_financial_store_onboarding_fee_policy wlt_financial_store_onboarding_fee_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_financial_store_onboarding_fee_policy
    ADD CONSTRAINT wlt_financial_store_onboarding_fee_policy_pkey PRIMARY KEY (id);


--
-- Name: wlt_ledger_accounts wlt_ledger_accounts_legacy_cod_account_write_fence; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_ledger_accounts
    ADD CONSTRAINT wlt_ledger_accounts_legacy_cod_account_write_fence CHECK ((account_type <> 'cash_in_transit'::text)) NOT VALID;


--
-- Name: CONSTRAINT wlt_ledger_accounts_legacy_cod_account_write_fence ON wlt_ledger_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT wlt_ledger_accounts_legacy_cod_account_write_fence ON public.wlt_ledger_accounts IS 'Historical cash_in_transit accounts remain readable; new retired COD custody accounts are rejected.';


--
-- Name: wlt_ledger_accounts wlt_ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_accounts
    ADD CONSTRAINT wlt_ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: wlt_ledger_entries wlt_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_entries
    ADD CONSTRAINT wlt_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: wlt_ledger_lines wlt_ledger_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_lines
    ADD CONSTRAINT wlt_ledger_lines_pkey PRIMARY KEY (id);


--
-- Name: wlt_ledger_transactions wlt_ledger_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_transactions
    ADD CONSTRAINT wlt_ledger_transactions_pkey PRIMARY KEY (id);


--
-- Name: wlt_loyalty_accounts wlt_loyalty_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_loyalty_accounts
    ADD CONSTRAINT wlt_loyalty_accounts_pkey PRIMARY KEY (operator_context_id, client_id);


--
-- Name: wlt_loyalty_entries wlt_loyalty_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_loyalty_entries
    ADD CONSTRAINT wlt_loyalty_entries_pkey PRIMARY KEY (id);


--
-- Name: wlt_manual_transfer_evidence wlt_manual_transfer_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_pkey PRIMARY KEY (id);


--
-- Name: wlt_manual_transfer_evidence wlt_manual_transfer_evidence_ref_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_ref_uq UNIQUE (external_transfer_reference);


--
-- Name: wlt_manual_transfer_evidence wlt_manual_transfer_evidence_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_uq UNIQUE (batch_id, approved_snapshot_id);


--
-- Name: wlt_mutation_receipts wlt_mutation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_mutation_receipts
    ADD CONSTRAINT wlt_mutation_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: wlt_official_wallet_providers wlt_official_wallet_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_official_wallet_providers
    ADD CONSTRAINT wlt_official_wallet_providers_pkey PRIMARY KEY (operator_context_id, provider_key);


--
-- Name: wlt_payment_allocation_components wlt_payment_allocation_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_allocation_components
    ADD CONSTRAINT wlt_payment_allocation_components_pkey PRIMARY KEY (id);


--
-- Name: wlt_payment_operation_receipts wlt_payment_operation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_operation_receipts
    ADD CONSTRAINT wlt_payment_operation_receipts_pkey PRIMARY KEY (id);


--
-- Name: wlt_payment_provider_events wlt_payment_provider_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_provider_events
    ADD CONSTRAINT wlt_payment_provider_events_pkey PRIMARY KEY (provider_event_id);


--
-- Name: wlt_payment_sessions wlt_payment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_pkey PRIMARY KEY (id);


--
-- Name: wlt_payment_sessions wlt_payment_sessions_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_status_chk CHECK ((status = ANY (ARRAY['reference_created'::text, 'pending_provider'::text, 'authorization_pending'::text, 'authorized'::text, 'capture_pending'::text, 'captured'::text, 'cod_pending'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text, 'provider_result_unknown'::text]))) NOT VALID;


--
-- Name: CONSTRAINT wlt_payment_sessions_status_chk ON wlt_payment_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT wlt_payment_sessions_status_chk ON public.wlt_payment_sessions IS 'Live payment sessions use captain-funded cod_pending -> cod_finalized. Historical cod_collected rows remain unvalidated and require explicit reconciliation before archival.';


--
-- Name: wlt_payment_status_refs wlt_payment_status_refs_live_context_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_payment_status_refs
    ADD CONSTRAINT wlt_payment_status_refs_live_context_chk CHECK ((operator_context_id <> 'legacy-unscoped'::text)) NOT VALID;


--
-- Name: wlt_payment_status_refs wlt_payment_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_status_refs
    ADD CONSTRAINT wlt_payment_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_payout_audit_events wlt_payout_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_audit_events
    ADD CONSTRAINT wlt_payout_audit_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_payout_destination_requests wlt_payout_destination_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_destination_requests
    ADD CONSTRAINT wlt_payout_destination_requests_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: wlt_payout_destinations wlt_payout_destinations_operator_context_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_destinations
    ADD CONSTRAINT wlt_payout_destinations_operator_context_id_key UNIQUE (operator_context_id, id);


--
-- Name: wlt_payout_destinations wlt_payout_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_destinations
    ADD CONSTRAINT wlt_payout_destinations_pkey PRIMARY KEY (id);


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_payout_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_payout_uq UNIQUE (operator_context_id, payout_request_id);


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: wlt_payout_reconciliations wlt_payout_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_reconciliations
    ADD CONSTRAINT wlt_payout_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: wlt_payout_requests wlt_payout_requests_operator_context_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_operator_context_id_key UNIQUE (operator_context_id, id);


--
-- Name: wlt_payout_requests wlt_payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_pkey PRIMARY KEY (id);


--
-- Name: wlt_promotion_funding_commands wlt_promotion_funding_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_commands
    ADD CONSTRAINT wlt_promotion_funding_commands_pkey PRIMARY KEY (id);


--
-- Name: wlt_promotion_funding_events wlt_promotion_funding_events_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_events
    ADD CONSTRAINT wlt_promotion_funding_events_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: wlt_promotion_funding_events wlt_promotion_funding_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_events
    ADD CONSTRAINT wlt_promotion_funding_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_ledger_lifecycle_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_ledger_lifecycle_chk CHECK ((((status = ANY (ARRAY['reserved'::text, 'released'::text])) AND (commit_ledger_transaction_id IS NULL) AND (reversal_ledger_transaction_id IS NULL)) OR ((status = 'committed'::text) AND (commit_ledger_transaction_id IS NOT NULL) AND (reversal_ledger_transaction_id IS NULL)) OR ((status = 'reversed'::text) AND (commit_ledger_transaction_id IS NOT NULL) AND (reversal_ledger_transaction_id IS NOT NULL)))) NOT VALID;


--
-- Name: CONSTRAINT wlt_promotion_funding_ledger_lifecycle_chk ON wlt_promotion_funding_reservations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT wlt_promotion_funding_ledger_lifecycle_chk ON public.wlt_promotion_funding_reservations IS 'New promotion-funding lifecycle changes require their immutable canonical ledger facts; historical rows remain readable.';


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_operator_context_id_checkout__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_operator_context_id_checkout__key UNIQUE (operator_context_id, checkout_intent_id);


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_operator_context_id_coupon_re_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_operator_context_id_coupon_re_key UNIQUE (operator_context_id, coupon_redemption_id);


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_operator_context_id_external__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_operator_context_id_external__key UNIQUE (operator_context_id, external_reference);


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_operator_context_id_idempoten_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_operator_context_id_idempoten_key UNIQUE (operator_context_id, idempotency_key);


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reservations_pkey PRIMARY KEY (id);


--
-- Name: wlt_provider_debts wlt_provider_debts_operator_context_id_source_type_source_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_debts
    ADD CONSTRAINT wlt_provider_debts_operator_context_id_source_type_source_i_key UNIQUE (operator_context_id, source_type, source_id);


--
-- Name: wlt_provider_debts wlt_provider_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_debts
    ADD CONSTRAINT wlt_provider_debts_pkey PRIMARY KEY (id);


--
-- Name: wlt_provider_penalties wlt_provider_penalties_operator_context_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalties
    ADD CONSTRAINT wlt_provider_penalties_operator_context_id_idempotency_key_key UNIQUE (operator_context_id, idempotency_key);


--
-- Name: wlt_provider_penalties wlt_provider_penalties_operator_context_id_incident_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalties
    ADD CONSTRAINT wlt_provider_penalties_operator_context_id_incident_id_key UNIQUE (operator_context_id, incident_id);


--
-- Name: wlt_provider_penalties wlt_provider_penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalties
    ADD CONSTRAINT wlt_provider_penalties_pkey PRIMARY KEY (id);


--
-- Name: wlt_provider_penalty_policies wlt_provider_penalty_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalty_policies
    ADD CONSTRAINT wlt_provider_penalty_policies_pkey PRIMARY KEY (operator_context_id, policy_id);


--
-- Name: wlt_reconciliation_cases wlt_reconciliation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_reconciliation_cases
    ADD CONSTRAINT wlt_reconciliation_cases_pkey PRIMARY KEY (id);


--
-- Name: wlt_refund_audit_events wlt_refund_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refund_audit_events
    ADD CONSTRAINT wlt_refund_audit_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_refund_operation_receipts wlt_refund_operation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refund_operation_receipts
    ADD CONSTRAINT wlt_refund_operation_receipts_pkey PRIMARY KEY (id);


--
-- Name: wlt_refund_status_refs wlt_refund_status_refs_live_context_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_refund_status_refs
    ADD CONSTRAINT wlt_refund_status_refs_live_context_chk CHECK ((operator_context_id <> 'legacy-unscoped'::text)) NOT VALID;


--
-- Name: wlt_refund_status_refs wlt_refund_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refund_status_refs
    ADD CONSTRAINT wlt_refund_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_refunds wlt_refunds_amount_positive_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_amount_positive_chk CHECK ((amount_minor_units > 0)) NOT VALID;


--
-- Name: wlt_refunds wlt_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlement_audit_packs wlt_settlement_audit_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_audit_packs
    ADD CONSTRAINT wlt_settlement_audit_packs_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlement_audit_packs wlt_settlement_audit_packs_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_audit_packs
    ADD CONSTRAINT wlt_settlement_audit_packs_uq UNIQUE (batch_id);


--
-- Name: wlt_settlement_batch_rows wlt_settlement_batch_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_batch_rows
    ADD CONSTRAINT wlt_settlement_batch_rows_pkey PRIMARY KEY (batch_id, approved_snapshot_id);


--
-- Name: wlt_settlement_batches wlt_settlement_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_batches
    ADD CONSTRAINT wlt_settlement_batches_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlement_mutation_requests wlt_settlement_mutation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_mutation_requests
    ADD CONSTRAINT wlt_settlement_mutation_requests_pkey PRIMARY KEY (operator_context_id, operation, idempotency_key);


--
-- Name: wlt_settlement_policies wlt_settlement_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_policies
    ADD CONSTRAINT wlt_settlement_policies_pkey PRIMARY KEY (operator_context_id, partner_id);


--
-- Name: wlt_settlement_policy_versions wlt_settlement_policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_policy_versions
    ADD CONSTRAINT wlt_settlement_policy_versions_pkey PRIMARY KEY (operator_context_id, partner_id, version);


--
-- Name: wlt_settlement_requests wlt_settlement_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_requests
    ADD CONSTRAINT wlt_settlement_requests_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: wlt_settlement_source_evidence wlt_settlement_source_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_source_evidence
    ADD CONSTRAINT wlt_settlement_source_evidence_pkey PRIMARY KEY (operator_context_id, order_id);


--
-- Name: wlt_settlement_source_orders wlt_settlement_source_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_source_orders
    ADD CONSTRAINT wlt_settlement_source_orders_pkey PRIMARY KEY (operator_context_id, order_id);


--
-- Name: wlt_settlement_status_refs wlt_settlement_status_refs_live_context_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.wlt_settlement_status_refs
    ADD CONSTRAINT wlt_settlement_status_refs_live_context_chk CHECK ((operator_context_id <> 'legacy-unscoped'::text)) NOT VALID;


--
-- Name: wlt_settlement_status_refs wlt_settlement_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_status_refs
    ADD CONSTRAINT wlt_settlement_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlements wlt_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlements
    ADD CONSTRAINT wlt_settlements_pkey PRIMARY KEY (id);


--
-- Name: wlt_special_request_quote_policies wlt_special_request_quote_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_special_request_quote_policies
    ADD CONSTRAINT wlt_special_request_quote_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: wlt_special_request_quotes wlt_special_request_quotes_operator_context_id_special_req_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_special_request_quotes
    ADD CONSTRAINT wlt_special_request_quotes_operator_context_id_special_req_key1 UNIQUE (operator_context_id, special_request_id, idempotency_key);


--
-- Name: wlt_special_request_quotes wlt_special_request_quotes_operator_context_id_special_requ_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_special_request_quotes
    ADD CONSTRAINT wlt_special_request_quotes_operator_context_id_special_requ_key UNIQUE (operator_context_id, special_request_id, quote_version);


--
-- Name: wlt_special_request_quotes wlt_special_request_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_special_request_quotes
    ADD CONSTRAINT wlt_special_request_quotes_pkey PRIMARY KEY (id);


--
-- Name: wlt_store_onboarding_fee_policy_legacy_reviews wlt_store_onboarding_fee_policy_legacy_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_store_onboarding_fee_policy_legacy_reviews
    ADD CONSTRAINT wlt_store_onboarding_fee_policy_legacy_reviews_pkey PRIMARY KEY (legacy_policy_id);


--
-- Name: wlt_store_onboarding_fee_policy_versions wlt_store_onboarding_fee_policy_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_store_onboarding_fee_policy_versions
    ADD CONSTRAINT wlt_store_onboarding_fee_policy_versions_pkey PRIMARY KEY (id);


--
-- Name: wlt_store_onboarding_fee_policy_versions wlt_store_onboarding_fee_policy_versions_scope_idempotency_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_store_onboarding_fee_policy_versions
    ADD CONSTRAINT wlt_store_onboarding_fee_policy_versions_scope_idempotency_uq UNIQUE (operator_context_id, idempotency_key);


--
-- Name: wlt_store_onboarding_fee_policy_versions wlt_store_onboarding_fee_policy_versions_scope_version_uq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_store_onboarding_fee_policy_versions
    ADD CONSTRAINT wlt_store_onboarding_fee_policy_versions_scope_version_uq UNIQUE (operator_context_id, version);


--
-- Name: wlt_subscription_compensations wlt_subscription_compensations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_compensations
    ADD CONSTRAINT wlt_subscription_compensations_pkey PRIMARY KEY (id);


--
-- Name: wlt_subscription_lifecycle_events wlt_subscription_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_lifecycle_events
    ADD CONSTRAINT wlt_subscription_lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_wallet_projection_reconciliation_exceptions wlt_wallet_projection_reconciliation_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_wallet_projection_reconciliation_exceptions
    ADD CONSTRAINT wlt_wallet_projection_reconciliation_exceptions_pkey PRIMARY KEY (id);


--
-- Name: wlt_wallets wlt_wallet_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_wallets
    ADD CONSTRAINT wlt_wallet_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_wallets wlt_wallets_operatorcontext_actor_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_wallets
    ADD CONSTRAINT wlt_wallets_operatorcontext_actor_key UNIQUE (operator_context_id, actor_type, actor_id);


--
-- Name: CONSTRAINT wlt_wallets_operatorcontext_actor_key ON wlt_wallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT wlt_wallets_operatorcontext_actor_key ON public.wlt_wallets IS 'One wallet per actor inside one OperatorContext; identical actor ids in other OperatorContexts remain isolated.';


--
-- Name: idx_wlt_client_subscriptions_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_client_subscriptions_due ON public.wlt_client_subscriptions USING btree (ends_at, status) WHERE (status = 'active'::text);


--
-- Name: idx_wlt_client_subscriptions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_client_subscriptions_product ON public.wlt_client_subscriptions USING btree (product_reference, status);


--
-- Name: idx_wlt_commercial_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_commercial_products_status ON public.wlt_commercial_products USING btree (status, product_type);


--
-- Name: idx_wlt_compensation_context_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_compensation_context_client_status ON public.wlt_subscription_compensations USING btree (operator_context_id, client_id, status, updated_at DESC);


--
-- Name: idx_wlt_dsh_outbox_events_failed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_dsh_outbox_events_failed ON public.wlt_dsh_outbox_events USING btree (updated_at) WHERE (status = 'failed'::text);


--
-- Name: idx_wlt_dsh_outbox_events_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_dsh_outbox_events_pending ON public.wlt_dsh_outbox_events USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_wlt_financial_providers_type_env; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wlt_financial_providers_type_env ON public.wlt_financial_providers USING btree (provider_type, environment);


--
-- Name: idx_wlt_loyalty_accounts_context_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_loyalty_accounts_context_client ON public.wlt_loyalty_accounts USING btree (operator_context_id, client_id);


--
-- Name: idx_wlt_loyalty_entries_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_loyalty_entries_client_created ON public.wlt_loyalty_entries USING btree (client_id, created_at DESC);


--
-- Name: idx_wlt_loyalty_entries_context_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_loyalty_entries_context_client_created ON public.wlt_loyalty_entries USING btree (operator_context_id, client_id, created_at DESC);


--
-- Name: idx_wlt_promotion_funding_commands_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_promotion_funding_commands_recovery ON public.wlt_promotion_funding_commands USING btree (state, created_at) WHERE (state = 'claimed'::text);


--
-- Name: idx_wlt_promotion_funding_events_reservation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_promotion_funding_events_reservation ON public.wlt_promotion_funding_events USING btree (reservation_id, created_at DESC);


--
-- Name: idx_wlt_promotion_funding_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_promotion_funding_partner ON public.wlt_promotion_funding_reservations USING btree (operator_context_id, partner_id, status) WHERE (partner_id IS NOT NULL);


--
-- Name: idx_wlt_promotion_funding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_promotion_funding_status ON public.wlt_promotion_funding_reservations USING btree (operator_context_id, status, updated_at DESC);


--
-- Name: idx_wlt_refunds_operational_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_refunds_operational_queue ON public.wlt_refunds USING btree (status, updated_at DESC) WHERE (status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text]));


--
-- Name: idx_wlt_special_request_quotes_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_special_request_quotes_lookup ON public.wlt_special_request_quotes USING btree (operator_context_id, special_request_id, created_at DESC);


--
-- Name: idx_wlt_subscription_compensations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_subscription_compensations_status ON public.wlt_subscription_compensations USING btree (status, updated_at DESC);


--
-- Name: idx_wlt_subscription_context_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_subscription_context_client_status ON public.wlt_client_subscriptions USING btree (operator_context_id, client_id, status);


--
-- Name: idx_wlt_subscription_event_context_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_subscription_event_context_subscription ON public.wlt_subscription_lifecycle_events USING btree (operator_context_id, subscription_id, created_at DESC);


--
-- Name: idx_wlt_subscription_lifecycle_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_subscription_lifecycle_events_client ON public.wlt_subscription_lifecycle_events USING btree (client_id, created_at DESC);


--
-- Name: idx_wlt_subscription_lifecycle_events_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wlt_subscription_lifecycle_events_subscription ON public.wlt_subscription_lifecycle_events USING btree (subscription_id, created_at DESC);


--
-- Name: uq_wlt_client_active_subscription_context; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_client_active_subscription_context ON public.wlt_client_subscriptions USING btree (operator_context_id, client_id) WHERE (status = 'active'::text);


--
-- Name: uq_wlt_client_subscription_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_client_subscription_purchase ON public.wlt_client_subscriptions USING btree (subscription_purchase_id) WHERE (subscription_purchase_id IS NOT NULL);


--
-- Name: uq_wlt_commission_adjustments_operator_context_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_commission_adjustments_operator_context_idempotency ON public.wlt_commission_adjustments USING btree (operator_context_id, idempotency_key) WHERE ((idempotency_key IS NOT NULL) AND (btrim(idempotency_key) <> ''::text));


--
-- Name: uq_wlt_loyalty_entry_context_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_loyalty_entry_context_idempotency ON public.wlt_loyalty_entries USING btree (operator_context_id, idempotency_key);


--
-- Name: uq_wlt_loyalty_single_reversal_context; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_loyalty_single_reversal_context ON public.wlt_loyalty_entries USING btree (operator_context_id, reversal_of) WHERE (reversal_of IS NOT NULL);


--
-- Name: uq_wlt_promotion_funding_event_transition; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_promotion_funding_event_transition ON public.wlt_promotion_funding_events USING btree (reservation_id, to_status);


--
-- Name: uq_wlt_subscription_compensation_context_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_subscription_compensation_context_subscription ON public.wlt_subscription_compensations USING btree (operator_context_id, subscription_id);


--
-- Name: uq_wlt_subscription_event_context_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_subscription_event_context_idempotency ON public.wlt_subscription_lifecycle_events USING btree (operator_context_id, idempotency_key);


--
-- Name: uq_wlt_subscription_last_renewal_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_subscription_last_renewal_payment ON public.wlt_client_subscriptions USING btree (last_renewal_payment_session_id) WHERE (last_renewal_payment_session_id IS NOT NULL);


--
-- Name: uq_wlt_subscription_payment_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_wlt_subscription_payment_session ON public.wlt_client_subscriptions USING btree (payment_session_id) WHERE (payment_session_id IS NOT NULL);


--
-- Name: ux_wlt_special_request_quotes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_wlt_special_request_quotes_active ON public.wlt_special_request_quotes USING btree (operator_context_id, special_request_id) WHERE (status = 'active'::text);


--
-- Name: wlt_approved_payout_snapshots_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_approved_payout_snapshots_created_idx ON public.wlt_approved_payout_snapshots USING btree (operator_context_id, created_at DESC);


--
-- Name: wlt_audit_aggregate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_audit_aggregate_idx ON public.wlt_finance_audit_events USING btree (aggregate_type, aggregate_id, created_at DESC);


--
-- Name: wlt_audit_correlation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_audit_correlation_idx ON public.wlt_finance_audit_events USING btree (correlation_id, created_at DESC);


--
-- Name: wlt_audit_operatorcontext_aggregate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_audit_operatorcontext_aggregate_idx ON public.wlt_finance_audit_events USING btree (operator_context_id, aggregate_type, aggregate_id, created_at DESC);


--
-- Name: wlt_captain_collateral_active_captain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_captain_collateral_active_captain_idx ON public.wlt_captain_collateral_positions USING btree (operator_context_id, captain_id, currency) WHERE (status = 'active'::text);


--
-- Name: wlt_captain_collateral_event_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_captain_collateral_event_idempotency_uq ON public.wlt_captain_collateral_events USING btree (operator_context_id, idempotency_key);


--
-- Name: wlt_captain_collateral_events_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_captain_collateral_events_position_idx ON public.wlt_captain_collateral_events USING btree (operator_context_id, position_id, created_at);


--
-- Name: wlt_captain_collateral_source_session_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_captain_collateral_source_session_uq ON public.wlt_captain_collateral_positions USING btree (operator_context_id, source_payment_session_id);


--
-- Name: wlt_cod_custody_evidence_operatorcontext_record_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_custody_evidence_operatorcontext_record_created_idx ON public.wlt_cod_custody_evidence USING btree (operator_context_id, cod_record_id, created_at DESC);


--
-- Name: wlt_cod_reconciliation_audit_operatorcontext_case_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_reconciliation_audit_operatorcontext_case_created_idx ON public.wlt_cod_reconciliation_audit_events USING btree (operator_context_id, reconciliation_case_id, created_at, id);


--
-- Name: wlt_cod_reconciliation_operatorcontext_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_reconciliation_operatorcontext_status_created_idx ON public.wlt_cod_reconciliation_cases USING btree (operator_context_id, status, created_at DESC);


--
-- Name: wlt_cod_records_captain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_records_captain_idx ON public.wlt_cod_records USING btree (captain_id, created_at DESC);


--
-- Name: wlt_cod_records_collector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_records_collector_idx ON public.wlt_cod_records USING btree (collector_type, collector_id, created_at DESC);


--
-- Name: wlt_cod_records_operatorcontext_order_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_cod_records_operatorcontext_order_uq ON public.wlt_cod_records USING btree (operator_context_id, order_id);


--
-- Name: wlt_cod_records_operatorcontext_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_records_operatorcontext_partner_idx ON public.wlt_cod_records USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: wlt_cod_records_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_records_partner_idx ON public.wlt_cod_records USING btree (partner_id, created_at DESC);


--
-- Name: wlt_cod_reservations_captain_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_cod_reservations_captain_status_idx ON public.wlt_cod_reservations USING btree (operator_context_id, captain_id, status);


--
-- Name: wlt_cod_reservations_checkout_intent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_cod_reservations_checkout_intent_idx ON public.wlt_cod_reservations USING btree (operator_context_id, checkout_intent_id) WHERE ((checkout_intent_id IS NOT NULL) AND (btrim(checkout_intent_id) <> ''::text));


--
-- Name: wlt_cod_reservations_operator_context_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_cod_reservations_operator_context_order_idx ON public.wlt_cod_reservations USING btree (operator_context_id, order_id);


--
-- Name: wlt_commission_adjustments_commission_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commission_adjustments_commission_idx ON public.wlt_commission_adjustments USING btree (commission_id, created_at DESC);


--
-- Name: wlt_commission_adjustments_operatorcontext_commission_created_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commission_adjustments_operatorcontext_commission_created_i ON public.wlt_commission_adjustments USING btree (operator_context_id, commission_id, created_at, id);


--
-- Name: wlt_commission_adjustments_operatorcontext_request_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commission_adjustments_operatorcontext_request_hash_idx ON public.wlt_commission_adjustments USING btree (operator_context_id, request_hash);


--
-- Name: wlt_commission_evidence_operator_context_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_commission_evidence_operator_context_idempotency_uq ON public.wlt_commission_evidence USING btree (operator_context_id, idempotency_key);


--
-- Name: wlt_commission_evidence_operatorcontext_commission_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commission_evidence_operatorcontext_commission_idx ON public.wlt_commission_evidence USING btree (operator_context_id, commission_id);


--
-- Name: wlt_commission_evidence_operatorcontext_request_hash_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_commission_evidence_operatorcontext_request_hash_uq ON public.wlt_commission_evidence USING btree (operator_context_id, request_hash);


--
-- Name: wlt_commission_policy_active_operatorcontext_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_commission_policy_active_operatorcontext_uidx ON public.wlt_commission_policy_versions USING btree (operator_context_id, commission_type, source_type, beneficiary_actor_type) WHERE (status = 'active'::text);


--
-- Name: wlt_commission_policy_operatorcontext_history_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commission_policy_operatorcontext_history_idx ON public.wlt_commission_policy_versions USING btree (operator_context_id, policy_id, version DESC);


--
-- Name: wlt_commissions_captain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commissions_captain_idx ON public.wlt_commissions USING btree (captain_id, created_at DESC);


--
-- Name: wlt_commissions_operator_context_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_commissions_operator_context_idempotency_idx ON public.wlt_commissions USING btree (operator_context_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: wlt_commissions_operatorcontext_beneficiary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commissions_operatorcontext_beneficiary_idx ON public.wlt_commissions USING btree (operator_context_id, beneficiary_actor_id, created_at DESC);


--
-- Name: wlt_commissions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commissions_order_idx ON public.wlt_commissions USING btree (order_id);


--
-- Name: wlt_commissions_partner_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_commissions_partner_category_idx ON public.wlt_commissions USING btree (operator_context_id, partner_category, created_at DESC);


--
-- Name: wlt_dispatch_financial_eligibility_decisions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_dispatch_financial_eligibility_decisions_active_idx ON public.wlt_dispatch_financial_eligibility_decisions USING btree (expires_at) WHERE ((eligible = true) AND (revoked_at IS NULL));


--
-- Name: wlt_dispatch_financial_eligibility_decisions_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_dispatch_financial_eligibility_decisions_lookup_idx ON public.wlt_dispatch_financial_eligibility_decisions USING btree (operator_context_id, captain_id, evaluated_at DESC);


--
-- Name: wlt_dsh_outbox_events_payment_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_dsh_outbox_events_payment_event_idx ON public.wlt_dsh_outbox_events USING btree (payment_session_id, event_type) WHERE (refund_reference IS NULL);


--
-- Name: wlt_dsh_outbox_events_refund_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_dsh_outbox_events_refund_event_idx ON public.wlt_dsh_outbox_events USING btree (refund_reference, event_type) WHERE (refund_reference IS NOT NULL);


--
-- Name: wlt_external_provider_statement_lines_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_external_provider_statement_lines_match_idx ON public.wlt_external_provider_statement_lines USING btree (operator_context_id, external_transfer_reference, amount_minor_units, currency);


--
-- Name: wlt_external_provider_statements_fingerprint_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_external_provider_statements_fingerprint_uq ON public.wlt_external_provider_statements USING btree (operator_context_id, statement_fingerprint) WHERE (statement_fingerprint IS NOT NULL);


--
-- Name: wlt_external_provider_statements_replay_identity_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_external_provider_statements_replay_identity_uq ON public.wlt_external_provider_statements USING btree (operator_context_id, external_provider_account_id, statement_reference, business_date);


--
-- Name: wlt_external_provider_verification_keys_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_external_provider_verification_keys_active_idx ON public.wlt_external_provider_verification_keys USING btree (operator_context_id, provider_key, key_id) WHERE active;


--
-- Name: wlt_field_commission_category_policy_active_operatorcontext_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_field_commission_category_policy_active_operatorcontext_uq ON public.wlt_field_commission_category_policy_versions USING btree (operator_context_id, partner_category) WHERE (status = 'active'::text);


--
-- Name: wlt_field_commission_category_policy_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_field_commission_category_policy_active_uidx ON public.wlt_field_commission_category_policy_versions USING btree (partner_category) WHERE (status = 'active'::text);


--
-- Name: wlt_field_commission_category_policy_operatorcontext_history_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_field_commission_category_policy_operatorcontext_history_id ON public.wlt_field_commission_category_policy_versions USING btree (operator_context_id, partner_category, version DESC);


--
-- Name: wlt_field_commission_refs_context_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_field_commission_refs_context_partner_idx ON public.wlt_field_commission_refs USING btree (operator_context_id, partner_id, updated_at DESC);


--
-- Name: wlt_field_commission_refs_partner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_field_commission_refs_partner_id_idx ON public.wlt_field_commission_refs USING btree (partner_id, updated_at DESC);


--
-- Name: wlt_ledger_accounts_system_operatorcontext_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_ledger_accounts_system_operatorcontext_uq ON public.wlt_ledger_accounts USING btree (operator_context_id, account_type, currency) WHERE (account_type <> 'wallet'::text);


--
-- Name: wlt_ledger_accounts_wallet_operatorcontext_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_ledger_accounts_wallet_operatorcontext_uq ON public.wlt_ledger_accounts USING btree (operator_context_id, account_type, actor_type, actor_id, currency) WHERE (account_type = 'wallet'::text);


--
-- Name: wlt_ledger_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_actor_idx ON public.wlt_ledger_entries USING btree (actor_id, created_at DESC);


--
-- Name: wlt_ledger_entries_operator_context_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_ledger_entries_operator_context_idempotency_uq ON public.wlt_ledger_entries USING btree (operator_context_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: INDEX wlt_ledger_entries_operator_context_idempotency_uq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.wlt_ledger_entries_operator_context_idempotency_uq IS 'Idempotency keys are authoritative only inside one trusted OperatorContext.';


--
-- Name: wlt_ledger_entries_operatorcontext_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_entries_operatorcontext_actor_idx ON public.wlt_ledger_entries USING btree (operator_context_id, actor_type, actor_id, created_at DESC);


--
-- Name: wlt_ledger_entries_operatorcontext_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_entries_operatorcontext_created_idx ON public.wlt_ledger_entries USING btree (operator_context_id, created_at DESC, id DESC);


--
-- Name: wlt_ledger_lines_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_lines_account_idx ON public.wlt_ledger_lines USING btree (account_id, created_at DESC);


--
-- Name: wlt_ledger_lines_operatorcontext_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_lines_operatorcontext_account_idx ON public.wlt_ledger_lines USING btree (operator_context_id, account_id, created_at DESC);


--
-- Name: wlt_ledger_lines_operatorcontext_transaction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_lines_operatorcontext_transaction_idx ON public.wlt_ledger_lines USING btree (operator_context_id, ledger_transaction_id);


--
-- Name: wlt_ledger_lines_transaction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_lines_transaction_idx ON public.wlt_ledger_lines USING btree (ledger_transaction_id);


--
-- Name: wlt_ledger_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_order_idx ON public.wlt_ledger_entries USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: wlt_ledger_transactions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_transactions_created_at_idx ON public.wlt_ledger_transactions USING btree (created_at DESC, id DESC);


--
-- Name: wlt_ledger_transactions_operatorcontext_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_transactions_operatorcontext_created_idx ON public.wlt_ledger_transactions USING btree (operator_context_id, created_at DESC, id DESC);


--
-- Name: wlt_ledger_transactions_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_transactions_reference_idx ON public.wlt_ledger_transactions USING btree (reference_type, reference_id);


--
-- Name: wlt_ledger_transactions_source_operatorcontext_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_ledger_transactions_source_operatorcontext_uq ON public.wlt_ledger_transactions USING btree (operator_context_id, transaction_type, reference_type, reference_id) WHERE ((reference_type <> ''::text) AND (reference_id <> ''::text));


--
-- Name: wlt_ledger_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_ledger_type_idx ON public.wlt_ledger_entries USING btree (entry_type, created_at DESC);


--
-- Name: wlt_manual_transfer_evidence_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_manual_transfer_evidence_batch_idx ON public.wlt_manual_transfer_evidence USING btree (batch_id);


--
-- Name: wlt_manual_transfer_evidence_unverified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_manual_transfer_evidence_unverified_idx ON public.wlt_manual_transfer_evidence USING btree (operator_context_id) WHERE (verified_at IS NULL);


--
-- Name: wlt_mutation_receipts_operatorcontext_aggregate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_mutation_receipts_operatorcontext_aggregate_idx ON public.wlt_mutation_receipts USING btree (operator_context_id, mutation_type, aggregate_id, created_at DESC);


--
-- Name: wlt_mutation_receipts_operatorcontext_request_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_mutation_receipts_operatorcontext_request_hash_idx ON public.wlt_mutation_receipts USING btree (operator_context_id, request_hash);


--
-- Name: wlt_payment_allocation_components_operator_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_allocation_components_operator_context_idx ON public.wlt_payment_allocation_components USING btree (operator_context_id, payment_session_id);


--
-- Name: wlt_payment_allocation_components_session_component_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_allocation_components_session_component_idx ON public.wlt_payment_allocation_components USING btree (payment_session_id, component);


--
-- Name: wlt_payment_operation_receipts_in_progress_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_operation_receipts_in_progress_idx ON public.wlt_payment_operation_receipts USING btree (updated_at) WHERE (state = 'in_progress'::text);


--
-- Name: wlt_payment_operation_receipts_replay_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_operation_receipts_replay_uq ON public.wlt_payment_operation_receipts USING btree (operator_context_id, payment_session_id, operation, idempotency_key);


--
-- Name: wlt_payment_operation_receipts_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_operation_receipts_session_idx ON public.wlt_payment_operation_receipts USING btree (operator_context_id, payment_session_id, created_at DESC);


--
-- Name: wlt_payment_provider_events_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_provider_events_session_idx ON public.wlt_payment_provider_events USING btree (operator_context_id, payment_session_id, received_at DESC);


--
-- Name: wlt_payment_provider_events_unprocessed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_provider_events_unprocessed_idx ON public.wlt_payment_provider_events USING btree (received_at) WHERE (processing_state = 'received'::text);


--
-- Name: wlt_payment_sessions_capture_ledger_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_capture_ledger_uq ON public.wlt_payment_sessions USING btree (capture_ledger_transaction_id) WHERE (capture_ledger_transaction_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_sessions_client_idx ON public.wlt_payment_sessions USING btree (client_id, updated_at DESC);


--
-- Name: wlt_payment_sessions_idempotency_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_sessions_idempotency_key_idx ON public.wlt_payment_sessions USING btree (idempotency_key) WHERE (idempotency_key <> ''::text);


--
-- Name: wlt_payment_sessions_operator_context_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_sessions_operator_context_id_idx ON public.wlt_payment_sessions USING btree (operator_context_id, created_at DESC, id DESC);


--
-- Name: wlt_payment_sessions_operatorcontext_checkout_intent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_operatorcontext_checkout_intent_idx ON public.wlt_payment_sessions USING btree (operator_context_id, checkout_intent_id) WHERE (checkout_intent_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_operatorcontext_checkout_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_operatorcontext_checkout_uq ON public.wlt_payment_sessions USING btree (operator_context_id, checkout_intent_id) WHERE (checkout_intent_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_operatorcontext_special_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_operatorcontext_special_request_idx ON public.wlt_payment_sessions USING btree (operator_context_id, special_request_id) WHERE (special_request_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_operatorcontext_special_request_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_operatorcontext_special_request_uq ON public.wlt_payment_sessions USING btree (operator_context_id, special_request_id) WHERE (special_request_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_pricing_quote_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_sessions_pricing_quote_hash_idx ON public.wlt_payment_sessions USING btree (operator_context_id, pricing_quote_hash) WHERE (pricing_quote_hash IS NOT NULL);


--
-- Name: wlt_payment_sessions_subscription_purchase_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_subscription_purchase_idx ON public.wlt_payment_sessions USING btree (subscription_purchase_id) WHERE (subscription_purchase_id IS NOT NULL);


--
-- Name: wlt_payment_sessions_topup_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payment_sessions_topup_reference_idx ON public.wlt_payment_sessions USING btree (topup_reference) WHERE (topup_reference IS NOT NULL);


--
-- Name: wlt_payment_status_refs_context_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_status_refs_context_order_idx ON public.wlt_payment_status_refs USING btree (operator_context_id, order_id, updated_at DESC);


--
-- Name: wlt_payment_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payment_status_refs_order_id_idx ON public.wlt_payment_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_payout_audit_operatorcontext_aggregate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_audit_operatorcontext_aggregate_idx ON public.wlt_payout_audit_events USING btree (operator_context_id, aggregate_type, aggregate_id, created_at DESC);


--
-- Name: wlt_payout_audit_operatorcontext_correlation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_audit_operatorcontext_correlation_idx ON public.wlt_payout_audit_events USING btree (operator_context_id, correlation_id, created_at DESC);


--
-- Name: wlt_payout_destination_requests_destination_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destination_requests_destination_idx ON public.wlt_payout_destination_requests USING btree (payout_destination_id);


--
-- Name: wlt_payout_destination_requests_operator_context_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_destination_requests_operator_context_idempotency_uq ON public.wlt_payout_destination_requests USING btree (operator_context_id, idempotency_key);


--
-- Name: wlt_payout_destination_requests_operatorcontext_owner_created_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destination_requests_operatorcontext_owner_created_i ON public.wlt_payout_destination_requests USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: wlt_payout_destination_requests_operatorcontext_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destination_requests_operatorcontext_owner_idx ON public.wlt_payout_destination_requests USING btree (operator_context_id, partner_id, idempotency_key);


--
-- Name: wlt_payout_destinations_active_owner_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_destinations_active_owner_uidx ON public.wlt_payout_destinations USING btree (operator_context_id, owner_actor_type, owner_actor_id) WHERE (active = true);


--
-- Name: wlt_payout_destinations_one_active_operatorcontext_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_destinations_one_active_operatorcontext_owner_idx ON public.wlt_payout_destinations USING btree (operator_context_id, owner_actor_type, owner_actor_id) WHERE (active = true);


--
-- Name: wlt_payout_destinations_operatorcontext_owner_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destinations_operatorcontext_owner_created_idx ON public.wlt_payout_destinations USING btree (operator_context_id, owner_actor_type, owner_actor_id, created_at DESC);


--
-- Name: wlt_payout_destinations_operatorcontext_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destinations_operatorcontext_partner_idx ON public.wlt_payout_destinations USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: wlt_payout_destinations_owner_history_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_destinations_owner_history_idx ON public.wlt_payout_destinations USING btree (owner_actor_type, owner_actor_id, created_at DESC);


--
-- Name: wlt_payout_destinations_owner_version_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_destinations_owner_version_uidx ON public.wlt_payout_destinations USING btree (operator_context_id, owner_actor_type, owner_actor_id, destination_version);


--
-- Name: wlt_payout_four_way_reconciliations_close_gate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_four_way_reconciliations_close_gate_idx ON public.wlt_payout_four_way_reconciliations USING btree (operator_context_id, result, reconciled_at DESC);


--
-- Name: wlt_payout_reconciliation_operatorcontext_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_reconciliation_operatorcontext_request_idx ON public.wlt_payout_reconciliations USING btree (operator_context_id, payout_request_id, created_at DESC);


--
-- Name: wlt_payout_reconciliation_operatorcontext_single_claim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_reconciliation_operatorcontext_single_claim_idx ON public.wlt_payout_reconciliations USING btree (operator_context_id, payout_request_id) WHERE (resolved_at IS NULL);


--
-- Name: wlt_payout_requests_destination_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_requests_destination_idx ON public.wlt_payout_requests USING btree (payout_destination_id, requested_at DESC);


--
-- Name: wlt_payout_requests_operator_context_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_payout_requests_operator_context_idempotency_uq ON public.wlt_payout_requests USING btree (operator_context_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: wlt_payout_requests_operatorcontext_beneficiary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_requests_operatorcontext_beneficiary_idx ON public.wlt_payout_requests USING btree (operator_context_id, beneficiary_actor_id, requested_at DESC);


--
-- Name: wlt_payout_requests_operatorcontext_request_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_requests_operatorcontext_request_hash_idx ON public.wlt_payout_requests USING btree (operator_context_id, request_hash) WHERE (request_hash IS NOT NULL);


--
-- Name: wlt_payout_requests_provider_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_payout_requests_provider_reference_idx ON public.wlt_payout_requests USING btree (provider_reference) WHERE (provider_reference <> ''::text);


--
-- Name: wlt_promotion_funding_commit_ledger_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_promotion_funding_commit_ledger_uq ON public.wlt_promotion_funding_reservations USING btree (commit_ledger_transaction_id) WHERE (commit_ledger_transaction_id IS NOT NULL);


--
-- Name: wlt_promotion_funding_reversal_ledger_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_promotion_funding_reversal_ledger_uq ON public.wlt_promotion_funding_reservations USING btree (reversal_ledger_transaction_id) WHERE (reversal_ledger_transaction_id IS NOT NULL);


--
-- Name: wlt_provider_debts_actor_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_provider_debts_actor_status_idx ON public.wlt_provider_debts USING btree (operator_context_id, provider_actor_type, provider_actor_id, status, currency);


--
-- Name: wlt_provider_penalties_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_provider_penalties_actor_idx ON public.wlt_provider_penalties USING btree (operator_context_id, provider_actor_type, provider_actor_id, created_at DESC);


--
-- Name: wlt_provider_penalties_debt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_provider_penalties_debt_idx ON public.wlt_provider_penalties USING btree (operator_context_id, debt_id) WHERE (debt_id IS NOT NULL);


--
-- Name: wlt_provider_penalties_policy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_provider_penalties_policy_idx ON public.wlt_provider_penalties USING btree (operator_context_id, policy_id, created_at DESC);


--
-- Name: wlt_provider_penalties_reversal_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_provider_penalties_reversal_idempotency_uidx ON public.wlt_provider_penalties USING btree (operator_context_id, reversal_idempotency_key) WHERE (reversal_idempotency_key IS NOT NULL);


--
-- Name: wlt_reconciliation_cases_operatorcontext_open_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_reconciliation_cases_operatorcontext_open_uq ON public.wlt_reconciliation_cases USING btree (operator_context_id, payment_session_id, operation) WHERE (status = 'open'::text);


--
-- Name: wlt_reconciliation_cases_operatorcontext_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_reconciliation_cases_operatorcontext_session_idx ON public.wlt_reconciliation_cases USING btree (operator_context_id, payment_session_id, created_at DESC);


--
-- Name: wlt_reconciliation_cases_operatorcontext_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_reconciliation_cases_operatorcontext_status_idx ON public.wlt_reconciliation_cases USING btree (operator_context_id, status, created_at DESC);


--
-- Name: wlt_refund_audit_operator_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_audit_operator_context_idx ON public.wlt_refund_audit_events USING btree (operator_context_id, created_at DESC);


--
-- Name: wlt_refund_audit_refund_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_audit_refund_idx ON public.wlt_refund_audit_events USING btree (refund_id, created_at);


--
-- Name: wlt_refund_operation_receipts_correlation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_operation_receipts_correlation_idx ON public.wlt_refund_operation_receipts USING btree (operator_context_id, correlation_id, created_at DESC) WHERE (correlation_id IS NOT NULL);


--
-- Name: wlt_refund_operation_receipts_identity_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_refund_operation_receipts_identity_uq ON public.wlt_refund_operation_receipts USING btree (operator_context_id, operation, request_path, idempotency_key);


--
-- Name: wlt_refund_operation_receipts_processing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_operation_receipts_processing_idx ON public.wlt_refund_operation_receipts USING btree (created_at) WHERE (status = 'processing'::text);


--
-- Name: wlt_refund_status_refs_context_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_status_refs_context_order_idx ON public.wlt_refund_status_refs USING btree (operator_context_id, order_id, updated_at DESC);


--
-- Name: wlt_refund_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refund_status_refs_order_id_idx ON public.wlt_refund_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_refunds_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refunds_client_idx ON public.wlt_refunds USING btree (client_id, created_at DESC);


--
-- Name: wlt_refunds_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refunds_order_idx ON public.wlt_refunds USING btree (order_id);


--
-- Name: wlt_refunds_payment_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refunds_payment_session_idx ON public.wlt_refunds USING btree (payment_session_id);


--
-- Name: wlt_refunds_provider_unknown_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refunds_provider_unknown_idx ON public.wlt_refunds USING btree (operator_context_id, updated_at) WHERE (status = 'provider_unknown'::text);


--
-- Name: wlt_refunds_remaining_amount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_refunds_remaining_amount_idx ON public.wlt_refunds USING btree (operator_context_id, payment_session_id, status);


--
-- Name: wlt_refunds_session_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_refunds_session_idempotency_idx ON public.wlt_refunds USING btree (operator_context_id, payment_session_id, idempotency_key);


--
-- Name: wlt_settlement_audit_packs_close_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_audit_packs_close_idx ON public.wlt_settlement_audit_packs USING btree (operator_context_id, created_at DESC);


--
-- Name: wlt_settlement_batch_rows_snapshot_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_settlement_batch_rows_snapshot_uidx ON public.wlt_settlement_batch_rows USING btree (approved_snapshot_id);


--
-- Name: wlt_settlement_batches_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_batches_context_idx ON public.wlt_settlement_batches USING btree (operator_context_id, provider_id, status);


--
-- Name: wlt_settlement_completion_event_operatorcontext_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_settlement_completion_event_operatorcontext_uidx ON public.wlt_settlement_source_evidence USING btree (operator_context_id, completion_event_id);


--
-- Name: wlt_settlement_evidence_operatorcontext_settlement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_evidence_operatorcontext_settlement_idx ON public.wlt_settlement_source_evidence USING btree (operator_context_id, settlement_id, order_id);


--
-- Name: wlt_settlement_evidence_settlement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_evidence_settlement_idx ON public.wlt_settlement_source_evidence USING btree (settlement_id, order_id);


--
-- Name: wlt_settlement_mutation_requests_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_mutation_requests_batch_idx ON public.wlt_settlement_mutation_requests USING btree (operator_context_id, settlement_batch_id, operation, created_at DESC);


--
-- Name: wlt_settlement_policies_operatorcontext_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_policies_operatorcontext_status_idx ON public.wlt_settlement_policies USING btree (operator_context_id, status, partner_id);


--
-- Name: wlt_settlement_policy_operatorcontext_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_policy_operatorcontext_current_idx ON public.wlt_settlement_policy_versions USING btree (operator_context_id, partner_id, version DESC);


--
-- Name: wlt_settlement_request_operatorcontext_hash_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_settlement_request_operatorcontext_hash_uidx ON public.wlt_settlement_requests USING btree (operator_context_id, request_hash);


--
-- Name: wlt_settlement_request_operatorcontext_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_request_operatorcontext_partner_idx ON public.wlt_settlement_requests USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: wlt_settlement_source_orders_operatorcontext_partner_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_source_orders_operatorcontext_partner_period_idx ON public.wlt_settlement_source_orders USING btree (operator_context_id, partner_id, delivered_at DESC);


--
-- Name: wlt_settlement_source_orders_operatorcontext_settlement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_source_orders_operatorcontext_settlement_idx ON public.wlt_settlement_source_orders USING btree (operator_context_id, settlement_id, order_id);


--
-- Name: wlt_settlement_source_orders_partner_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_source_orders_partner_period_idx ON public.wlt_settlement_source_orders USING btree (partner_id, delivered_at DESC);


--
-- Name: wlt_settlement_source_orders_settlement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_source_orders_settlement_idx ON public.wlt_settlement_source_orders USING btree (settlement_id, order_id);


--
-- Name: wlt_settlement_status_refs_context_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_status_refs_context_order_idx ON public.wlt_settlement_status_refs USING btree (operator_context_id, order_id, updated_at DESC);


--
-- Name: wlt_settlement_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlement_status_refs_order_id_idx ON public.wlt_settlement_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_settlements_operatorcontext_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlements_operatorcontext_partner_idx ON public.wlt_settlements USING btree (operator_context_id, partner_id, period_start DESC);


--
-- Name: wlt_settlements_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_settlements_partner_idx ON public.wlt_settlements USING btree (partner_id, period_start DESC);


--
-- Name: wlt_store_onboarding_fee_policy_versions_scope_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_store_onboarding_fee_policy_versions_scope_version_idx ON public.wlt_store_onboarding_fee_policy_versions USING btree (operator_context_id, version DESC);


--
-- Name: wlt_wallet_projection_reconciliation_open_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wlt_wallet_projection_reconciliation_open_uq ON public.wlt_wallet_projection_reconciliation_exceptions USING btree (operator_context_id, actor_type, actor_id, currency) WHERE (status = 'open'::text);


--
-- Name: wlt_wallet_refs_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_wallet_refs_actor_idx ON public.wlt_wallets USING btree (actor_id, actor_type, updated_at DESC);


--
-- Name: wlt_wallets_operatorcontext_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_wallets_operatorcontext_actor_idx ON public.wlt_wallets USING btree (operator_context_id, actor_type, actor_id, updated_at DESC);


--
-- Name: wlt_wallets_operatorcontext_status_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wlt_wallets_operatorcontext_status_updated_idx ON public.wlt_wallets USING btree (operator_context_id, status, updated_at DESC, actor_type, actor_id);


--
-- Name: wlt_commercial_products trg_wlt_guard_commercial_product_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_commercial_product_update BEFORE UPDATE ON public.wlt_commercial_products FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_commercial_product_update();


--
-- Name: wlt_loyalty_accounts trg_wlt_guard_loyalty_account_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_loyalty_account_operator_context BEFORE UPDATE ON public.wlt_loyalty_accounts FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_loyalty_operator_context();


--
-- Name: wlt_reconciliation_cases trg_wlt_guard_payment_reconciliation_resolution; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_payment_reconciliation_resolution BEFORE UPDATE ON public.wlt_reconciliation_cases FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_payment_reconciliation_resolution();


--
-- Name: wlt_promotion_funding_reservations trg_wlt_guard_promotion_funding_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_promotion_funding_update BEFORE UPDATE ON public.wlt_promotion_funding_reservations FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_promotion_funding_update();


--
-- Name: wlt_subscription_compensations trg_wlt_guard_subscription_compensation_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_subscription_compensation_update BEFORE UPDATE ON public.wlt_subscription_compensations FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_subscription_compensation_update();


--
-- Name: wlt_client_subscriptions trg_wlt_guard_subscription_lifecycle_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_subscription_lifecycle_update BEFORE UPDATE ON public.wlt_client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_subscription_lifecycle_update();


--
-- Name: wlt_client_subscriptions trg_wlt_guard_subscription_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_guard_subscription_operator_context BEFORE UPDATE ON public.wlt_client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_subscription_operator_context();


--
-- Name: wlt_loyalty_entries trg_wlt_loyalty_entries_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_loyalty_entries_no_delete BEFORE DELETE ON public.wlt_loyalty_entries FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_loyalty_entry_mutation();


--
-- Name: wlt_loyalty_entries trg_wlt_loyalty_entries_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_loyalty_entries_no_update BEFORE UPDATE ON public.wlt_loyalty_entries FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_loyalty_entry_mutation();


--
-- Name: wlt_payment_sessions trg_wlt_payment_session_terminal_status_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_payment_session_terminal_status_guard BEFORE UPDATE OF status ON public.wlt_payment_sessions FOR EACH ROW EXECUTE FUNCTION public.wlt_guard_payment_session_terminal_status();


--
-- Name: wlt_promotion_funding_events trg_wlt_promotion_funding_events_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_promotion_funding_events_no_delete BEFORE DELETE ON public.wlt_promotion_funding_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_promotion_funding_event_mutation();


--
-- Name: wlt_promotion_funding_events trg_wlt_promotion_funding_events_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_promotion_funding_events_no_update BEFORE UPDATE ON public.wlt_promotion_funding_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_promotion_funding_event_mutation();


--
-- Name: wlt_promotion_funding_reservations trg_wlt_require_promotion_funding_transition_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_wlt_require_promotion_funding_transition_event AFTER UPDATE ON public.wlt_promotion_funding_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_require_promotion_funding_transition_event();


--
-- Name: wlt_subscription_lifecycle_events trg_wlt_subscription_lifecycle_events_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_subscription_lifecycle_events_no_delete BEFORE DELETE ON public.wlt_subscription_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_subscription_lifecycle_event_mutation();


--
-- Name: wlt_subscription_lifecycle_events trg_wlt_subscription_lifecycle_events_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_subscription_lifecycle_events_no_update BEFORE UPDATE ON public.wlt_subscription_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_subscription_lifecycle_event_mutation();


--
-- Name: wlt_refunds trg_wlt_sync_refund_provider_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_sync_refund_provider_reference BEFORE INSERT OR UPDATE OF provider_reference, provider_refund_reference ON public.wlt_refunds FOR EACH ROW EXECUTE FUNCTION public.wlt_sync_refund_provider_reference();


--
-- Name: wlt_refunds trg_wlt_validate_refund_payment_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wlt_validate_refund_payment_reference BEFORE INSERT OR UPDATE OF payment_session_id, client_id, amount_minor_units, currency, reason ON public.wlt_refunds FOR EACH ROW EXECUTE FUNCTION public.wlt_validate_refund_payment_reference();


--
-- Name: wlt_checkout_pricing_quotes wlt_checkout_pricing_quotes_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_checkout_pricing_quotes_immutable BEFORE DELETE OR UPDATE ON public.wlt_checkout_pricing_quotes FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_checkout_pricing_quote_mutation();


--
-- Name: wlt_payment_sessions wlt_checkout_session_quote_binding_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_checkout_session_quote_binding_trg BEFORE INSERT OR UPDATE OF checkout_intent_id, operator_context_id, client_id, store_id, cart_snapshot_hash, pricing_quote_id, pricing_quote_hash, pricing_quote_version, pricing_quote_expires_at, amount_minor_units, currency ON public.wlt_payment_sessions FOR EACH ROW EXECUTE FUNCTION public.wlt_assert_checkout_session_quote_binding();


--
-- Name: wlt_payment_sessions wlt_checkout_tender_allocation_immutable_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_checkout_tender_allocation_immutable_trg BEFORE UPDATE OF wallet_amount_minor_units, cash_on_delivery_amount_minor_units ON public.wlt_payment_sessions FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_checkout_tender_allocation_mutation();


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_immutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_cod_custody_evidence_immutable_trigger BEFORE DELETE OR UPDATE ON public.wlt_cod_custody_evidence FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_custody_evidence_mutation();


--
-- Name: wlt_cod_reconciliation_audit_events wlt_cod_reconciliation_audit_immutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_cod_reconciliation_audit_immutable_trigger BEFORE DELETE OR UPDATE ON public.wlt_cod_reconciliation_audit_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_audit_mutation();


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_cod_reconciliation_audit_trigger AFTER INSERT OR UPDATE ON public.wlt_cod_reconciliation_cases FOR EACH ROW EXECUTE FUNCTION public.wlt_capture_reconciliation_audit();


--
-- Name: wlt_cod_reservations wlt_cod_wallet_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_cod_wallet_projection_trg AFTER INSERT OR DELETE OR UPDATE ON public.wlt_cod_reservations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_refresh_wallet_from_cod_reservation();


--
-- Name: wlt_commissions wlt_commission_wallet_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_commission_wallet_projection_trg AFTER INSERT OR DELETE OR UPDATE ON public.wlt_commissions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_refresh_wallet_from_commission();


--
-- Name: wlt_daily_finance_close wlt_daily_finance_close_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_daily_finance_close_immutable BEFORE DELETE OR UPDATE ON public.wlt_daily_finance_close FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_daily_close_mutation();


--
-- Name: wlt_external_provider_statement_lines wlt_external_provider_statement_lines_immutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_external_provider_statement_lines_immutable_trigger BEFORE DELETE OR UPDATE ON public.wlt_external_provider_statement_lines FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_external_statement_mutation();


--
-- Name: wlt_external_provider_statements wlt_external_provider_statements_immutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_external_provider_statements_immutable_trigger BEFORE DELETE OR UPDATE ON public.wlt_external_provider_statements FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_external_statement_mutation();


--
-- Name: wlt_external_provider_statements wlt_external_statement_closed_period_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_external_statement_closed_period_fence BEFORE INSERT OR UPDATE ON public.wlt_external_provider_statements FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_statement_import_after_close();


--
-- Name: wlt_ledger_accounts wlt_ledger_accounts_actor_normalize_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_ledger_accounts_actor_normalize_trg BEFORE INSERT OR UPDATE OF actor_type, actor_id, account_type, balance_minor_units ON public.wlt_ledger_accounts FOR EACH ROW EXECUTE FUNCTION public.wlt_normalize_wallet_ledger_actor_type();


--
-- Name: wlt_ledger_accounts wlt_ledger_accounts_wallet_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_ledger_accounts_wallet_projection_trg AFTER INSERT OR UPDATE ON public.wlt_ledger_accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN ((new.account_type = 'wallet'::text)) EXECUTE FUNCTION public.wlt_refresh_wallet_projection_from_ledger();


--
-- Name: wlt_ledger_entries wlt_ledger_entries_immutability_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_ledger_entries_immutability_trg BEFORE DELETE OR UPDATE ON public.wlt_ledger_entries FOR EACH ROW EXECUTE FUNCTION public.wlt_prevent_ledger_mutation();


--
-- Name: wlt_ledger_lines wlt_ledger_lines_immutability_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_ledger_lines_immutability_trg BEFORE DELETE OR UPDATE ON public.wlt_ledger_lines FOR EACH ROW EXECUTE FUNCTION public.wlt_prevent_ledger_mutation();


--
-- Name: wlt_ledger_transactions wlt_ledger_transactions_immutability_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_ledger_transactions_immutability_trg BEFORE DELETE OR UPDATE ON public.wlt_ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.wlt_prevent_ledger_mutation();


--
-- Name: wlt_cod_custody_evidence wlt_legacy_cod_custody_evidence_write_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_legacy_cod_custody_evidence_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wlt_cod_custody_evidence FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_legacy_cod_custody_mutation();


--
-- Name: wlt_cod_reconciliation_audit_events wlt_legacy_cod_reconciliation_audit_write_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_legacy_cod_reconciliation_audit_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wlt_cod_reconciliation_audit_events FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_legacy_cod_custody_mutation();


--
-- Name: wlt_cod_reconciliation_cases wlt_legacy_cod_reconciliation_cases_write_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_legacy_cod_reconciliation_cases_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wlt_cod_reconciliation_cases FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_legacy_cod_custody_mutation();


--
-- Name: wlt_cod_records wlt_legacy_cod_records_write_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_legacy_cod_records_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wlt_cod_records FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_legacy_cod_custody_mutation();


--
-- Name: wlt_payment_allocation_components wlt_payment_allocation_conserved_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_payment_allocation_conserved_trg AFTER INSERT OR DELETE OR UPDATE ON public.wlt_payment_allocation_components DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_assert_payment_allocation_conserved();


--
-- Name: wlt_payment_sessions wlt_payment_session_wallet_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_payment_session_wallet_projection_trg AFTER INSERT OR UPDATE OF status, wallet_amount_minor_units, client_id, currency, operator_context_id ON public.wlt_payment_sessions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_refresh_wallet_from_payment_session();


--
-- Name: wlt_payment_status_refs wlt_payment_status_refs_refund_context_bind; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_payment_status_refs_refund_context_bind BEFORE INSERT ON public.wlt_payment_status_refs FOR EACH ROW EXECUTE FUNCTION public.wlt_bind_refund_reference_operator_context();


--
-- Name: wlt_payout_requests wlt_payout_transition_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_payout_transition_audit_trigger BEFORE UPDATE OF status ON public.wlt_payout_requests FOR EACH ROW EXECUTE FUNCTION public.wlt_capture_payout_transition();


--
-- Name: wlt_payout_requests wlt_payout_wallet_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_payout_wallet_projection_trg AFTER INSERT OR DELETE OR UPDATE ON public.wlt_payout_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_refresh_wallet_from_payout();


--
-- Name: wlt_reconciliation_cases wlt_reconciliation_case_operatorcontext_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_reconciliation_case_operatorcontext_guard BEFORE INSERT OR UPDATE OF operator_context_id, payment_session_id ON public.wlt_reconciliation_cases FOR EACH ROW EXECUTE FUNCTION public.wlt_bind_reconciliation_case_operatorcontext();


--
-- Name: wlt_refund_status_refs wlt_refund_status_refs_context_bind; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_refund_status_refs_context_bind BEFORE INSERT ON public.wlt_refund_status_refs FOR EACH ROW EXECUTE FUNCTION public.wlt_bind_refund_reference_operator_context();


--
-- Name: wlt_payout_requests wlt_single_reconciliation_claim_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_single_reconciliation_claim_trigger BEFORE UPDATE OF reconciliation_status ON public.wlt_payout_requests FOR EACH ROW EXECUTE FUNCTION public.wlt_reject_duplicate_reconciliation_claim();


--
-- Name: wlt_wallets wlt_wallets_canonical_projection_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wlt_wallets_canonical_projection_trg BEFORE INSERT OR UPDATE ON public.wlt_wallets FOR EACH ROW EXECUTE FUNCTION public.wlt_derive_wallet_available_from_ledger();


--
-- Name: wlt_wallets wlt_wallets_projection_identity_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER wlt_wallets_projection_identity_trg AFTER INSERT OR UPDATE ON public.wlt_wallets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.wlt_assert_wallet_projection_identity();


--
-- Name: wlt_approved_payout_snapshots wlt_approved_payout_snapshots_dest_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_approved_payout_snapshots
    ADD CONSTRAINT wlt_approved_payout_snapshots_dest_fk FOREIGN KEY (operator_context_id, payout_destination_id) REFERENCES public.wlt_payout_destinations(operator_context_id, id) ON DELETE RESTRICT;


--
-- Name: wlt_approved_payout_snapshots wlt_approved_payout_snapshots_req_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_approved_payout_snapshots
    ADD CONSTRAINT wlt_approved_payout_snapshots_req_fk FOREIGN KEY (operator_context_id, payout_request_id) REFERENCES public.wlt_payout_requests(operator_context_id, id) ON DELETE RESTRICT;


--
-- Name: wlt_client_subscriptions wlt_client_subscriptions_last_renewal_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_last_renewal_payment_session_id_fkey FOREIGN KEY (last_renewal_payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_client_subscriptions wlt_client_subscriptions_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_client_subscriptions wlt_client_subscriptions_product_reference_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_product_reference_fkey FOREIGN KEY (product_reference) REFERENCES public.wlt_commercial_products(reference);


--
-- Name: wlt_cod_custody_evidence wlt_cod_custody_evidence_cod_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_custody_evidence
    ADD CONSTRAINT wlt_cod_custody_evidence_cod_record_id_fkey FOREIGN KEY (cod_record_id) REFERENCES public.wlt_cod_records(id) ON DELETE RESTRICT;


--
-- Name: wlt_cod_reconciliation_audit_events wlt_cod_reconciliation_audit_events_cod_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_audit_events
    ADD CONSTRAINT wlt_cod_reconciliation_audit_events_cod_record_id_fkey FOREIGN KEY (cod_record_id) REFERENCES public.wlt_cod_records(id) ON DELETE RESTRICT;


--
-- Name: wlt_cod_reconciliation_audit_events wlt_cod_reconciliation_audit_events_reconciliation_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_audit_events
    ADD CONSTRAINT wlt_cod_reconciliation_audit_events_reconciliation_case_id_fkey FOREIGN KEY (reconciliation_case_id) REFERENCES public.wlt_cod_reconciliation_cases(id) ON DELETE RESTRICT;


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_cases_cod_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_cases
    ADD CONSTRAINT wlt_cod_reconciliation_cases_cod_record_id_fkey FOREIGN KEY (cod_record_id) REFERENCES public.wlt_cod_records(id) ON DELETE RESTRICT;


--
-- Name: wlt_cod_reconciliation_cases wlt_cod_reconciliation_cases_custody_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_cod_reconciliation_cases
    ADD CONSTRAINT wlt_cod_reconciliation_cases_custody_evidence_id_fkey FOREIGN KEY (custody_evidence_id) REFERENCES public.wlt_cod_custody_evidence(id) ON DELETE RESTRICT;


--
-- Name: wlt_commission_adjustments wlt_commission_adjustments_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_adjustments
    ADD CONSTRAINT wlt_commission_adjustments_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.wlt_commissions(id) ON DELETE RESTRICT;


--
-- Name: wlt_commission_evidence wlt_commission_evidence_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_commission_evidence
    ADD CONSTRAINT wlt_commission_evidence_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.wlt_commissions(id) ON DELETE RESTRICT;


--
-- Name: wlt_dsh_outbox_events wlt_dsh_outbox_events_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id) ON DELETE CASCADE;


--
-- Name: wlt_external_provider_statements wlt_external_provider_stateme_external_provider_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statements
    ADD CONSTRAINT wlt_external_provider_stateme_external_provider_account_id_fkey FOREIGN KEY (external_provider_account_id) REFERENCES public.wlt_external_provider_accounts(id) ON DELETE RESTRICT;


--
-- Name: wlt_external_provider_statement_lines wlt_external_provider_statement_lines_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statement_lines
    ADD CONSTRAINT wlt_external_provider_statement_lines_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.wlt_external_provider_statements(id) ON DELETE RESTRICT;


--
-- Name: wlt_external_provider_statements wlt_external_provider_statements_verification_receipt_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_provider_statements
    ADD CONSTRAINT wlt_external_provider_statements_verification_receipt_fk FOREIGN KEY (operator_context_id, id, provenance_verification_receipt_id) REFERENCES public.wlt_external_statement_verification_receipts(operator_context_id, statement_id, id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: wlt_external_statement_verification_receipts wlt_external_statement_verification_receipts_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_external_statement_verification_receipts
    ADD CONSTRAINT wlt_external_statement_verification_receipts_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.wlt_external_provider_statements(id) ON DELETE RESTRICT;


--
-- Name: wlt_ledger_lines wlt_ledger_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_lines
    ADD CONSTRAINT wlt_ledger_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.wlt_ledger_accounts(id);


--
-- Name: wlt_ledger_lines wlt_ledger_lines_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_ledger_lines
    ADD CONSTRAINT wlt_ledger_lines_ledger_transaction_id_fkey FOREIGN KEY (ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id);


--
-- Name: wlt_loyalty_entries wlt_loyalty_entries_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_loyalty_entries
    ADD CONSTRAINT wlt_loyalty_entries_account_fkey FOREIGN KEY (operator_context_id, client_id) REFERENCES public.wlt_loyalty_accounts(operator_context_id, client_id) ON DELETE RESTRICT;


--
-- Name: wlt_loyalty_entries wlt_loyalty_entries_reversal_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_loyalty_entries
    ADD CONSTRAINT wlt_loyalty_entries_reversal_of_fkey FOREIGN KEY (reversal_of) REFERENCES public.wlt_loyalty_entries(id);


--
-- Name: wlt_manual_transfer_evidence wlt_manual_transfer_evidence_approved_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_approved_snapshot_id_fkey FOREIGN KEY (approved_snapshot_id) REFERENCES public.wlt_approved_payout_snapshots(id) ON DELETE RESTRICT;


--
-- Name: wlt_manual_transfer_evidence wlt_manual_transfer_evidence_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_manual_transfer_evidence
    ADD CONSTRAINT wlt_manual_transfer_evidence_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.wlt_settlement_batches(id) ON DELETE RESTRICT;


--
-- Name: wlt_payment_allocation_components wlt_payment_allocation_components_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_allocation_components
    ADD CONSTRAINT wlt_payment_allocation_components_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id) ON DELETE RESTRICT;


--
-- Name: wlt_payment_operation_receipts wlt_payment_operation_receipts_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_operation_receipts
    ADD CONSTRAINT wlt_payment_operation_receipts_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_payment_provider_events wlt_payment_provider_events_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_provider_events
    ADD CONSTRAINT wlt_payment_provider_events_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_payment_sessions wlt_payment_sessions_capture_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_capture_ledger_transaction_id_fkey FOREIGN KEY (capture_ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id);


--
-- Name: wlt_payment_sessions wlt_payment_sessions_commercial_product_reference_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_commercial_product_reference_fkey FOREIGN KEY (commercial_product_reference) REFERENCES public.wlt_commercial_products(reference);


--
-- Name: wlt_payout_destination_requests wlt_payout_destination_requests_payout_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_destination_requests
    ADD CONSTRAINT wlt_payout_destination_requests_payout_destination_id_fkey FOREIGN KEY (payout_destination_id) REFERENCES public.wlt_payout_destinations(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_destinations wlt_payout_destinations_provider_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_destinations
    ADD CONSTRAINT wlt_payout_destinations_provider_fk FOREIGN KEY (operator_context_id, official_wallet_provider_key) REFERENCES public.wlt_official_wallet_providers(operator_context_id, provider_key);


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_batch_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_batch_fk FOREIGN KEY (settlement_batch_id) REFERENCES public.wlt_settlement_batches(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_evidence_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_evidence_fk FOREIGN KEY (manual_transfer_evidence_id) REFERENCES public.wlt_manual_transfer_evidence(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_ledger_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_ledger_fk FOREIGN KEY (canonical_ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_snapshot_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_snapshot_fk FOREIGN KEY (operator_context_id, approved_snapshot_id) REFERENCES public.wlt_approved_payout_snapshots(operator_context_id, id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_four_way_reconciliations wlt_payout_four_way_reconciliations_statement_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_four_way_reconciliations
    ADD CONSTRAINT wlt_payout_four_way_reconciliations_statement_line_id_fkey FOREIGN KEY (statement_line_id) REFERENCES public.wlt_external_provider_statement_lines(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_reconciliations wlt_payout_reconciliation_request_operatorcontext_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_reconciliations
    ADD CONSTRAINT wlt_payout_reconciliation_request_operatorcontext_fk FOREIGN KEY (operator_context_id, payout_request_id) REFERENCES public.wlt_payout_requests(operator_context_id, id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_reconciliations wlt_payout_reconciliations_payout_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_reconciliations
    ADD CONSTRAINT wlt_payout_reconciliations_payout_request_id_fkey FOREIGN KEY (payout_request_id) REFERENCES public.wlt_payout_requests(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_requests wlt_payout_requests_destination_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_destination_fk FOREIGN KEY (payout_destination_id) REFERENCES public.wlt_payout_destinations(id) ON DELETE RESTRICT;


--
-- Name: wlt_payout_requests wlt_payout_requests_destination_operatorcontext_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_payout_requests
    ADD CONSTRAINT wlt_payout_requests_destination_operatorcontext_fk FOREIGN KEY (operator_context_id, payout_destination_id) REFERENCES public.wlt_payout_destinations(operator_context_id, id) ON DELETE RESTRICT;


--
-- Name: wlt_promotion_funding_commands wlt_promotion_funding_commands_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_commands
    ADD CONSTRAINT wlt_promotion_funding_commands_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.wlt_promotion_funding_reservations(id) ON DELETE RESTRICT;


--
-- Name: wlt_promotion_funding_events wlt_promotion_funding_events_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_events
    ADD CONSTRAINT wlt_promotion_funding_events_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.wlt_promotion_funding_reservations(id) ON DELETE RESTRICT;


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_commit_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_commit_ledger_transaction_id_fkey FOREIGN KEY (commit_ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: wlt_promotion_funding_reservations wlt_promotion_funding_reserva_reversal_ledger_transaction__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_promotion_funding_reservations
    ADD CONSTRAINT wlt_promotion_funding_reserva_reversal_ledger_transaction__fkey FOREIGN KEY (reversal_ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: wlt_provider_debts wlt_provider_debts_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_debts
    ADD CONSTRAINT wlt_provider_debts_ledger_transaction_id_fkey FOREIGN KEY (ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id);


--
-- Name: wlt_provider_penalties wlt_provider_penalties_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalties
    ADD CONSTRAINT wlt_provider_penalties_ledger_transaction_id_fkey FOREIGN KEY (ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id);


--
-- Name: wlt_provider_penalties wlt_provider_penalties_reversal_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_provider_penalties
    ADD CONSTRAINT wlt_provider_penalties_reversal_ledger_transaction_id_fkey FOREIGN KEY (reversal_ledger_transaction_id) REFERENCES public.wlt_ledger_transactions(id);


--
-- Name: wlt_reconciliation_cases wlt_reconciliation_cases_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_reconciliation_cases
    ADD CONSTRAINT wlt_reconciliation_cases_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_refund_audit_events wlt_refund_audit_events_refund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refund_audit_events
    ADD CONSTRAINT wlt_refund_audit_events_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.wlt_refunds(id) ON DELETE CASCADE;


--
-- Name: wlt_refunds wlt_refunds_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_refunds wlt_refunds_reconciliation_case_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_reconciliation_case_fk FOREIGN KEY (reconciliation_case_id) REFERENCES public.wlt_reconciliation_cases(id) NOT VALID;


--
-- Name: wlt_settlement_audit_packs wlt_settlement_audit_packs_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_audit_packs
    ADD CONSTRAINT wlt_settlement_audit_packs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.wlt_settlement_batches(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_batch_rows wlt_settlement_batch_rows_approved_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_batch_rows
    ADD CONSTRAINT wlt_settlement_batch_rows_approved_snapshot_id_fkey FOREIGN KEY (approved_snapshot_id) REFERENCES public.wlt_approved_payout_snapshots(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_batch_rows wlt_settlement_batch_rows_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_batch_rows
    ADD CONSTRAINT wlt_settlement_batch_rows_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.wlt_settlement_batches(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_mutation_requests wlt_settlement_mutation_requests_settlement_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_mutation_requests
    ADD CONSTRAINT wlt_settlement_mutation_requests_settlement_batch_id_fkey FOREIGN KEY (settlement_batch_id) REFERENCES public.wlt_settlement_batches(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_requests wlt_settlement_requests_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_requests
    ADD CONSTRAINT wlt_settlement_requests_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.wlt_settlements(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_source_evidence wlt_settlement_source_evidence_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_source_evidence
    ADD CONSTRAINT wlt_settlement_source_evidence_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.wlt_settlements(id) ON DELETE RESTRICT;


--
-- Name: wlt_settlement_source_orders wlt_settlement_source_orders_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_settlement_source_orders
    ADD CONSTRAINT wlt_settlement_source_orders_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.wlt_settlements(id) ON DELETE RESTRICT;


--
-- Name: wlt_special_request_quotes wlt_special_request_quotes_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_special_request_quotes
    ADD CONSTRAINT wlt_special_request_quotes_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.wlt_special_request_quote_policies(policy_id);


--
-- Name: wlt_subscription_compensations wlt_subscription_compensations_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_compensations
    ADD CONSTRAINT wlt_subscription_compensations_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_subscription_compensations wlt_subscription_compensations_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_compensations
    ADD CONSTRAINT wlt_subscription_compensations_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.wlt_client_subscriptions(id);


--
-- Name: wlt_subscription_lifecycle_events wlt_subscription_lifecycle_events_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_lifecycle_events
    ADD CONSTRAINT wlt_subscription_lifecycle_events_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- Name: wlt_subscription_lifecycle_events wlt_subscription_lifecycle_events_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wlt_subscription_lifecycle_events
    ADD CONSTRAINT wlt_subscription_lifecycle_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.wlt_client_subscriptions(id);


--
-- PostgreSQL database dump complete
--

