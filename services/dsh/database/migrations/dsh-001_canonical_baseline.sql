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
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--




--
-- Name: dsh_special_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dsh_special_request_status AS ENUM (
    'submitted',
    'under_review',
    'needs_customer_input',
    'approved',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'rejected'
);


--
-- Name: dsh_special_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dsh_special_request_type AS ENUM (
    'SHEIN_ASSISTED_PURCHASE',
    'AWNAK_ERRAND'
);


--
-- Name: dsh_admin_assert_intent_source_decision(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_assert_intent_source_decision() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  operation_type_value TEXT;
  request_id_value UUID;
  intent_status TEXT;
  source_status TEXT;
  replacement_count BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'dsh_admin_canonical_mutation_intents' THEN
    operation_type_value := COALESCE(NEW.operation_type, OLD.operation_type);
    request_id_value := COALESCE(NEW.request_id, OLD.request_id);
  ELSE
    operation_type_value := TG_ARGV[0];
    request_id_value := COALESCE(NEW.id, OLD.id);
  END IF;

  SELECT status INTO intent_status
  FROM dsh_admin_canonical_mutation_intents
  WHERE operation_type = operation_type_value AND request_id = request_id_value;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  CASE operation_type_value
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status FROM dsh_admin_approval_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_approval_requests WHERE supersedes_request_id = request_id_value;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status FROM dsh_admin_role_definition_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_role_definition_requests WHERE supersedes_request_id = request_id_value;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status FROM dsh_admin_rollback_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_rollback_requests WHERE supersedes_request_id = request_id_value;
    ELSE
      source_status := NULL;
      replacement_count := 0;
  END CASE;

  IF source_status IS NULL
     OR (intent_status = 'applied' AND source_status <> 'approved')
     OR (source_status = 'approved' AND intent_status <> 'applied')
     OR (source_status = 'superseded' AND intent_status <> 'failed_terminal')
     OR (source_status = 'superseded' AND replacement_count <> 1)
     OR (source_status <> 'superseded' AND replacement_count <> 0)
     OR (intent_status IN ('pending', 'retryable_failure') AND source_status <> 'pending')
     OR (intent_status = 'failed_terminal' AND source_status NOT IN ('pending', 'superseded')) THEN
    RAISE EXCEPTION 'canonical intent/source invariant violation: %/% intent=% source=%', operation_type_value, request_id_value, intent_status, source_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: dsh_admin_audit_append_only_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_audit_append_only_guard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF current_setting('bthwani.audit_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'dsh_admin_audit is append-only';
END;
$$;


--
-- Name: dsh_admin_guard_canonical_intent_source(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_guard_canonical_intent_source() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  source_status TEXT;
BEGIN
  CASE NEW.operation_type
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status
      FROM dsh_admin_approval_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status
      FROM dsh_admin_role_definition_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status
      FROM dsh_admin_rollback_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    ELSE
      RAISE EXCEPTION 'unsupported canonical mutation operation type: %', NEW.operation_type
        USING ERRCODE = '23514';
  END CASE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'canonical mutation source request does not exist: %/%', NEW.operation_type, NEW.request_id
      USING ERRCODE = '23503';
  END IF;
  IF source_status <> 'pending' THEN
    RAISE EXCEPTION 'canonical mutation source request is not pending: %/% status=%', NEW.operation_type, NEW.request_id, source_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_admin_guard_rejection_after_canonical_intent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_guard_rejection_after_canonical_intent() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'rejected' AND EXISTS (
    SELECT 1
    FROM dsh_admin_canonical_mutation_intents AS intent
    WHERE intent.operation_type = TG_ARGV[0]
      AND intent.request_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'request decision is fenced by canonical mutation intent: %/%', TG_ARGV[0], NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_admin_guard_replacement_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_guard_replacement_link() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  source_status TEXT;
  intent_status TEXT;
BEGIN
  IF NEW.supersedes_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'pending' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
    RAISE EXCEPTION 'replacement administration request must start a fresh maker/checker decision'
      USING ERRCODE = '23514';
  END IF;
  IF TG_ARGV[0] IN ('role-assignment', 'role-rollback')
     AND NULLIF(to_jsonb(NEW)->>'expected_role_version', '') IS NULL THEN
    RAISE EXCEPTION 'replacement role mutation must be fenced to the current canonical role version'
      USING ERRCODE = '23514';
  END IF;

  CASE TG_ARGV[0]
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status FROM dsh_admin_approval_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status FROM dsh_admin_role_definition_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status FROM dsh_admin_rollback_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    ELSE
      RAISE EXCEPTION 'unsupported administration replacement operation: %', TG_ARGV[0]
        USING ERRCODE = '23514';
  END CASE;

  SELECT status INTO intent_status
  FROM dsh_admin_canonical_mutation_intents
  WHERE operation_type = TG_ARGV[0]
    AND request_id = NEW.supersedes_request_id
  FOR UPDATE;

  IF source_status IS DISTINCT FROM 'superseded' OR intent_status IS DISTINCT FROM 'failed_terminal' THEN
    RAISE EXCEPTION 'replacement must reference a superseded failed terminal request: %/%', TG_ARGV[0], NEW.supersedes_request_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_admin_guard_source_supersession(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_guard_source_supersession() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  terminal_status TEXT;
BEGIN
  IF OLD.status = 'superseded' THEN
    RAISE EXCEPTION 'superseded administration request is immutable: %/%', TG_ARGV[0], OLD.id
      USING ERRCODE = '23514';
  END IF;

  SELECT intent.status
  INTO terminal_status
  FROM dsh_admin_canonical_mutation_intents AS intent
  WHERE intent.operation_type = TG_ARGV[0]
    AND intent.request_id = OLD.id
  FOR UPDATE;

  IF terminal_status = 'failed_terminal' THEN
    IF NEW.status <> 'superseded' THEN
      RAISE EXCEPTION 'failed terminal administration request must be superseded, not modified: %/%', TG_ARGV[0], OLD.id
        USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'pending'
       OR (to_jsonb(NEW) - ARRAY['status','superseded_by','superseded_reason_code','superseded_at','version','updated_at'])
          IS DISTINCT FROM
          (to_jsonb(OLD) - ARRAY['status','superseded_by','superseded_reason_code','superseded_at','version','updated_at'])
       OR NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'failed terminal administration request payload or decision cannot change during supersession: %/%', TG_ARGV[0], OLD.id
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'only a failed terminal administration request can be superseded: %/%', TG_ARGV[0], OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_admin_guard_terminal_intent_immutability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_admin_guard_terminal_intent_immutability() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'canonical mutation intents are immutable ledger records'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.operation_type IS DISTINCT FROM OLD.operation_type
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'canonical mutation intent identity and payload are immutable'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status IN ('failed_terminal', 'applied') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'terminal canonical mutation intent cannot be replayed or reset: %/%', OLD.operation_type, OLD.request_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_anonymize_expired_client_addresses(integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_anonymize_expired_client_addresses(p_batch_limit integer, p_actor_id text, p_correlation_id text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_limit INTEGER;
    v_policy_version INTEGER;
    v_count INTEGER := 0;
    v_row RECORD;
    v_subject_hash TEXT;
    v_deleted_subject TEXT;
BEGIN
    IF btrim(COALESCE(p_actor_id, '')) = '' THEN
        RAISE EXCEPTION 'actor id is required';
    END IF;

    SELECT CASE
               WHEN p_batch_limit IS NULL OR p_batch_limit <= 0
                 THEN batch_limit
               ELSE LEAST(GREATEST(p_batch_limit, 1), 10000)
           END,
           version
      INTO v_limit, v_policy_version
      FROM dsh_client_address_privacy_policy
     WHERE id = 1
       AND enabled = TRUE;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    FOR v_row IN
        SELECT id, client_id
          FROM dsh_client_addresses
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL
           AND pii_purge_after IS NOT NULL
           AND pii_purge_after <= NOW()
         ORDER BY pii_purge_after, id
         FOR UPDATE SKIP LOCKED
         LIMIT v_limit
    LOOP
        v_subject_hash := encode(digest(v_row.client_id, 'sha256'), 'hex');
        v_deleted_subject := 'deleted:' || encode(
            digest(v_row.client_id || ':' || v_row.id, 'sha256'),
            'hex'
        );

        UPDATE dsh_client_address_events
           SET client_id = v_deleted_subject,
               correlation_id = NULL,
               metadata = jsonb_build_object('piiAnonymized', TRUE)
         WHERE address_id = v_row.id;

        UPDATE dsh_client_addresses
           SET client_id = v_deleted_subject,
               label = 'deleted',
               recipient_name = 'deleted-user',
               phone_e164 = '+96700000000',
               address_line = 'deleted-address',
               service_area_code = 'deleted',
               building = NULL,
               floor = NULL,
               unit = NULL,
               delivery_instructions = NULL,
               latitude = NULL,
               longitude = NULL,
               create_idempotency_key = 'anonymized:' || id,
               pii_anonymized_at = NOW(),
               updated_at = NOW(),
               version = version + 1
         WHERE id = v_row.id;

        INSERT INTO dsh_client_address_privacy_events (
            address_id,
            client_subject_hash,
            action,
            actor_id,
            correlation_id,
            policy_version,
            metadata
        ) VALUES (
            v_row.id,
            v_subject_hash,
            'anonymized',
            p_actor_id,
            NULLIF(btrim(COALESCE(p_correlation_id, '')), ''),
            v_policy_version,
            jsonb_build_object(
                'anonymizedAt', NOW(),
                'subjectLinkSevered', TRUE,
                'addressEventsScrubbed', TRUE
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;


--
-- Name: dsh_apply_checkout_pricing_to_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_apply_checkout_pricing_to_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    checkout_pricing RECORD;
    committed_rows INTEGER;
BEGIN
    SELECT subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
           total_minor_units,currency,pricing_snapshot_hash,coupon_id,
           coupon_redemption_id,coupon_code_last4
    INTO checkout_pricing
    FROM dsh_checkout_intents
    WHERE id=NEW.checkout_intent_id
    FOR UPDATE;

    IF NOT FOUND OR checkout_pricing.subtotal_minor_units<=0
       OR checkout_pricing.total_minor_units<=0
       OR checkout_pricing.total_minor_units<>
          checkout_pricing.subtotal_minor_units+checkout_pricing.delivery_fee_minor_units-checkout_pricing.discount_minor_units
       OR checkout_pricing.pricing_snapshot_hash='' THEN
        RAISE EXCEPTION 'checkout pricing snapshot is missing or invalid';
    END IF;

    NEW.subtotal_minor_units:=checkout_pricing.subtotal_minor_units;
    NEW.delivery_fee_minor_units:=checkout_pricing.delivery_fee_minor_units;
    NEW.discount_minor_units:=checkout_pricing.discount_minor_units;
    NEW.total_minor_units:=checkout_pricing.total_minor_units;
    NEW.currency:=checkout_pricing.currency;
    NEW.pricing_snapshot_hash:=checkout_pricing.pricing_snapshot_hash;
    NEW.coupon_id:=checkout_pricing.coupon_id;
    NEW.coupon_redemption_id:=checkout_pricing.coupon_redemption_id;
    NEW.coupon_code_last4:=checkout_pricing.coupon_code_last4;

    IF checkout_pricing.coupon_id IS NOT NULL THEN
        UPDATE dsh_coupon_redemptions
        SET status='committed',order_id=NEW.id,committed_at=NOW(),updated_at=NOW()
        WHERE id=checkout_pricing.coupon_redemption_id
          AND checkout_intent_id=NEW.checkout_intent_id
          AND status='reserved' AND reserved_until>NOW();
        GET DIAGNOSTICS committed_rows=ROW_COUNT;
        IF committed_rows<>1 THEN
            RAISE EXCEPTION 'coupon reservation is missing, expired, or already consumed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dsh_order_refund_effects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_refund_effects (
    order_id uuid NOT NULL,
    refund_reference text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    coupon_reversed boolean DEFAULT false NOT NULL,
    loyalty_reversal_queued boolean DEFAULT false NOT NULL,
    funding_reversal_queued boolean DEFAULT false NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_refund_effects_status_check CHECK ((status = 'completed'::text))
);


--
-- Name: dsh_apply_confirmed_refund_effects(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_apply_confirmed_refund_effects(p_order_id uuid, p_refund_reference text, p_reason text) RETURNS public.dsh_order_refund_effects
    LANGUAGE plpgsql
    AS $$
DECLARE
    existing_effect dsh_order_refund_effects;
    coupon_changed BOOLEAN := FALSE;
    loyalty_actioned BOOLEAN := FALSE;
    funding_queued BOOLEAN := FALSE;
    earn_event RECORD;
BEGIN
    IF p_refund_reference IS NULL OR btrim(p_refund_reference)='' THEN
        RAISE EXCEPTION 'refund reference is required';
    END IF;

    SELECT * INTO existing_effect
    FROM dsh_order_refund_effects
    WHERE order_id=p_order_id OR refund_reference=p_refund_reference
    FOR UPDATE;
    IF FOUND THEN
        IF existing_effect.order_id<>p_order_id OR existing_effect.refund_reference<>p_refund_reference THEN
            RAISE EXCEPTION 'refund idempotency conflict';
        END IF;
        RETURN existing_effect;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM dsh_orders WHERE id=p_order_id) THEN
        RAISE EXCEPTION 'order not found';
    END IF;

    INSERT INTO dsh_promotion_funding_outbox (
        event_type,operator_context_id,checkout_intent_id,coupon_redemption_id,
        wlt_funding_reservation_id,order_id,reason,idempotency_key,correlation_id
    )
    SELECT 'reverse',r.funding_operator_context_id,r.checkout_intent_id,r.id,
           r.wlt_funding_reservation_id,p_order_id,
           COALESCE(NULLIF(p_reason,''),'confirmed_refund'),
           'dsh-promotion-funding-reverse:' || r.id::TEXT || ':' || p_order_id::TEXT,
           p_refund_reference
    FROM dsh_coupon_redemptions r
    WHERE r.order_id=p_order_id
      AND r.funding_status='committed'
      AND btrim(COALESCE(r.funding_operator_context_id,''))<>''
      AND btrim(COALESCE(r.wlt_funding_reservation_id,''))<>''
    ON CONFLICT (idempotency_key) DO NOTHING;
    funding_queued := FOUND;

    UPDATE dsh_coupon_redemptions
    SET status='reversed',reversed_at=NOW(),release_reason=COALESCE(p_reason,''),updated_at=NOW()
    WHERE order_id=p_order_id AND status='committed';
    coupon_changed := FOUND;

    SELECT * INTO earn_event
    FROM dsh_wlt_outbox_events
    WHERE order_id=p_order_id AND event_type='loyalty_earned'
    FOR UPDATE;

    IF FOUND THEN
        CASE earn_event.status
            WHEN 'pending' THEN
                UPDATE dsh_wlt_outbox_events
                SET status='cancelled',reversal_requested=TRUE,
                    last_error='cancelled by confirmed refund before WLT delivery',updated_at=NOW()
                WHERE id=earn_event.id;
                loyalty_actioned := TRUE;
            WHEN 'processing' THEN
                UPDATE dsh_wlt_outbox_events
                SET reversal_requested=TRUE,
                    last_error='confirmed refund arrived while loyalty event was processing',updated_at=NOW()
                WHERE id=earn_event.id;
                loyalty_actioned := TRUE;
            WHEN 'sent' THEN
                IF earn_event.external_reference='' THEN
                    RAISE EXCEPTION 'sent loyalty event has no external WLT reference';
                END IF;
                PERFORM dsh_enqueue_loyalty_reversal(p_order_id,COALESCE(p_reason,''));
                loyalty_actioned := TRUE;
            WHEN 'cancelled' THEN
                loyalty_actioned := TRUE;
            ELSE
                RAISE EXCEPTION 'unsupported loyalty outbox state during refund: %',earn_event.status;
        END CASE;
    END IF;

    INSERT INTO dsh_order_refund_effects
        (order_id,refund_reference,reason,coupon_reversed,loyalty_reversal_queued,funding_reversal_queued)
    VALUES (p_order_id,p_refund_reference,COALESCE(p_reason,''),coupon_changed,loyalty_actioned,funding_queued)
    RETURNING * INTO existing_effect;
    RETURN existing_effect;
END;
$$;


--
-- Name: FUNCTION dsh_apply_confirmed_refund_effects(p_order_id uuid, p_refund_reference text, p_reason text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_apply_confirmed_refund_effects(p_order_id uuid, p_refund_reference text, p_reason text) IS 'Applies coupon state and atomically queues loyalty and WLT promotion-funding reversal exactly once after WLT confirms refund completion.';


--
-- Name: dsh_apply_order_item_currency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_apply_order_item_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  order_currency TEXT;
BEGIN
  SELECT UPPER(BTRIM(currency))
  INTO order_currency
  FROM dsh_orders
  WHERE id = NEW.order_id
  FOR SHARE;

  IF NOT FOUND OR order_currency = '' OR order_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'order currency snapshot is missing or invalid';
  END IF;

  IF NEW.currency IS NOT NULL AND BTRIM(NEW.currency) <> ''
     AND UPPER(BTRIM(NEW.currency)) <> order_currency THEN
    RAISE EXCEPTION 'order item currency must equal the order pricing currency';
  END IF;

  NEW.currency := order_currency;
  RETURN NEW;
END;
$_$;


--
-- Name: dsh_apply_order_item_currency_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_apply_order_item_currency_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  order_currency TEXT;
BEGIN
  SELECT UPPER(BTRIM(currency))
  INTO order_currency
  FROM dsh_orders
  WHERE id = NEW.order_id
  FOR SHARE;

  IF NOT FOUND OR order_currency = '' OR order_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'order currency snapshot is missing or invalid';
  END IF;

  IF NEW.currency IS NOT NULL AND BTRIM(NEW.currency) <> ''
     AND UPPER(BTRIM(NEW.currency)) <> order_currency THEN
    RAISE EXCEPTION 'order item currency must equal the order pricing currency';
  END IF;

  NEW.currency := order_currency;
  NEW.item_snapshot := jsonb_set(
    COALESCE(NEW.item_snapshot, '{}'::jsonb),
    '{currency}',
    to_jsonb(order_currency),
    true
  );
  RETURN NEW;
END;
$_$;


--
-- Name: dsh_apply_order_truth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_apply_order_truth() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  checkout_row RECORD;
BEGIN
  SELECT ci.delivery_address_id,
         ci.delivery_address,
         ca.latitude,
         ca.longitude,
         ci.state,
         ci.payment_method,
         ci.wlt_payment_session_id,
         ci.updated_at
  INTO checkout_row
  FROM dsh_checkout_intents ci
  LEFT JOIN dsh_client_addresses ca
    ON ca.id = ci.delivery_address_id
   AND ca.client_id = ci.client_id
  WHERE ci.id = NEW.checkout_intent_id
    AND ci.operator_context_id = NEW.operator_context_id
  FOR SHARE OF ci;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout intent is outside order OperatorContext';
  END IF;

  NEW.order_number := COALESCE(NULLIF(NEW.order_number, ''),
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' ||
    UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 12)));
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id, ''), 'order:' || NEW.id::text);
  NEW.delivery_address_id := checkout_row.delivery_address_id;
  NEW.delivery_address_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'addressId', checkout_row.delivery_address_id,
    'formattedAddress', NULLIF(checkout_row.delivery_address, ''),
    'latitude', checkout_row.latitude,
    'longitude', checkout_row.longitude
  ));
  NEW.payment_status_projection := CASE
    WHEN checkout_row.state = 'confirmed' AND checkout_row.payment_method <> 'cod' THEN 'confirmed'
    WHEN checkout_row.payment_method = 'cod' AND checkout_row.state IN ('confirming', 'confirmed') THEN 'cash_due'
    ELSE 'unknown'
  END;
  NEW.payment_projection_updated_at := checkout_row.updated_at;
  NEW.payment_projection_source_updated_at := checkout_row.updated_at;
  NEW.payment_projection_reconciled_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION dsh_apply_order_truth(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_apply_order_truth() IS 'Creates immutable order truth, including order-time delivery geofence coordinates.';


--
-- Name: dsh_assert_governed_assignment_financial_eligibility(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_assert_governed_assignment_financial_eligibility() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.idempotency_key IS NULL OR btrim(NEW.idempotency_key) = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('offered','accepted') THEN
    RETURN NEW;
  END IF;

  IF dsh_financial_snapshot_is_eligible(NEW.operator_context_id, NEW.captain_id) = false THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'CAPTAIN_WLT_FINANCIAL_DECISION_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_assert_no_active_captain_absence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_assert_no_active_captain_absence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.idempotency_key IS NULL OR NEW.status NOT IN ('offered','accepted') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM dsh_provider_availability_projections absence
    WHERE absence.operator_context_id=NEW.operator_context_id
      AND absence.actor_type='captain'
      AND absence.actor_id=NEW.captain_id
      AND absence.status='active'
      AND now() >= absence.starts_at
      AND now() < absence.ends_at
  ) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='CAPTAIN_UNAVAILABLE_BY_WORKFORCE_NOTICE';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_assign_and_guard_order_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_assign_and_guard_order_operatorcontext() RETURNS trigger
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


--
-- Name: dsh_assign_support_message_sequence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_assign_support_message_sequence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    SELECT COALESCE(MAX(sequence_num), 0) + 1
    INTO NEW.sequence_num
    FROM dsh_support_messages
    WHERE ticket_id = NEW.ticket_id;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_cancel_order_dependent_work(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_cancel_order_dependent_work() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_reason TEXT;
BEGIN
  IF NEW.status NOT IN (
    'cancelled_by_client', 'cancelled_by_store', 'cancelled_by_operator',
    'cancelled_no_driver', 'failed_payment', 'failed_dispatch'
  ) OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_reason := COALESCE(
    NULLIF(BTRIM(NEW.cancellation_note), ''),
    NULLIF(BTRIM(NEW.cancellation_reason_code), ''),
    NEW.status
  );

  UPDATE dsh_assignments
  SET status = 'cancelled', last_latitude = NULL, last_longitude = NULL,
      location_recorded_at = NULL, updated_at = NOW()
  WHERE order_id = NEW.id AND status IN ('offered', 'accepted');

  UPDATE dsh_deliveries
  SET status = 'cancelled', note = COALESCE(NULLIF(note, ''), v_reason),
      updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('delivered', 'cancelled');

  UPDATE dsh_partner_delivery_tasks
  SET status = 'cancelled', version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('completed', 'cancelled');

  UPDATE dsh_pickup_sessions
  SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()),
      cancellation_reason = COALESCE(NULLIF(cancellation_reason, ''), v_reason),
      used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,
      version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status <> 'cancelled';

  RETURN NEW;
END;
$$;


--
-- Name: dsh_capture_order_preparation_timing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_capture_order_preparation_timing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    policy_default_minutes INTEGER := 25;
    policy_warning_minutes INTEGER := 5;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'pending' AND NEW.status = 'store_accepted' THEN
        SELECT
            COALESCE(policy.default_preparation_minutes, 25),
            COALESCE(policy.warning_before_minutes, 5)
        INTO policy_default_minutes, policy_warning_minutes
        FROM (SELECT NEW.store_id AS store_id) requested
        LEFT JOIN dsh_store_order_preparation_policies policy USING (store_id);

        NEW.accepted_at := COALESCE(NEW.accepted_at, NOW());
        NEW.estimated_preparation_minutes := CASE
            WHEN NEW.estimated_preparation_minutes BETWEEN 5 AND 180
                THEN NEW.estimated_preparation_minutes
            ELSE policy_default_minutes
        END;
        NEW.preparation_warning_minutes := CASE
            WHEN NEW.preparation_warning_minutes BETWEEN 1 AND NEW.estimated_preparation_minutes - 1
                THEN NEW.preparation_warning_minutes
            ELSE LEAST(policy_warning_minutes, NEW.estimated_preparation_minutes - 1)
        END;
        NEW.estimated_ready_at := COALESCE(
            NEW.estimated_ready_at,
            NEW.accepted_at + make_interval(mins => NEW.estimated_preparation_minutes)
        );
        NEW.preparation_delay_reason := NULL;
    ELSIF OLD.status = 'store_accepted' AND NEW.status = 'preparing' THEN
        NEW.preparation_started_at := COALESCE(NEW.preparation_started_at, NOW());
    ELSIF OLD.status = 'preparing' AND NEW.status = 'ready_for_pickup' THEN
        NEW.ready_at := COALESCE(NEW.ready_at, NOW());
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_catalog_capture_entity_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_catalog_capture_entity_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_entity_id TEXT;
  v_actor_id TEXT := COALESCE(NULLIF(current_setting('bthwani.actor_id', TRUE), ''), 'system');
  v_actor_role TEXT := COALESCE(NULLIF(current_setting('bthwani.actor_role', TRUE), ''), 'system');
  v_reason TEXT := COALESCE(NULLIF(current_setting('bthwani.change_reason', TRUE), ''), '');
  v_correlation_id TEXT := COALESCE(NULLIF(current_setting('bthwani.correlation_id', TRUE), ''), '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  INSERT INTO dsh_catalog_entity_audit (
    id, entity_type, entity_id, action, actor_id, actor_role, reason,
    correlation_id, before_json, after_json
  ) VALUES (
    'catalog-audit-' || gen_random_uuid()::text,
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP,
    v_actor_id,
    v_actor_role,
    v_reason,
    v_correlation_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;


--
-- Name: dsh_catalog_rollback_audit(text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_catalog_rollback_audit(p_audit_id text, p_actor_id text, p_actor_role text, p_reason text, p_expected_version integer) RETURNS TABLE(entity_type text, entity_id text, new_version integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_audit dsh_catalog_entity_audit%ROWTYPE;
  v_current_version INTEGER;
BEGIN
  IF BTRIM(COALESCE(p_actor_id, '')) = '' OR BTRIM(COALESCE(p_reason, '')) = '' OR p_expected_version IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROLLBACK_REQUEST';
  END IF;

  SELECT * INTO v_audit
  FROM dsh_catalog_entity_audit
  WHERE id = p_audit_id
  FOR UPDATE;

  IF NOT FOUND OR v_audit.action <> 'UPDATE' OR v_audit.before_json IS NULL THEN
    RAISE EXCEPTION 'AUDIT_ENTRY_NOT_ROLLBACKABLE';
  END IF;

  PERFORM set_config('bthwani.actor_id', p_actor_id, TRUE);
  PERFORM set_config('bthwani.actor_role', COALESCE(NULLIF(p_actor_role, ''), 'operator'), TRUE);
  PERFORM set_config('bthwani.change_reason', p_reason, TRUE);

  CASE v_audit.entity_type
    WHEN 'dsh_catalog_domains' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_domains WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_domains SET
        name_ar = v_audit.before_json->>'name_ar',
        name_en = v_audit.before_json->>'name_en',
        icon = v_audit.before_json->>'icon',
        sort_order = (v_audit.before_json->>'sort_order')::INTEGER,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        is_client_visible = (v_audit.before_json->>'is_client_visible')::BOOLEAN,
        requires_product_catalog = (v_audit.before_json->>'requires_product_catalog')::BOOLEAN,
        is_manual_request = (v_audit.before_json->>'is_manual_request')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_catalog_nodes' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_nodes WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_nodes SET
        name_ar = v_audit.before_json->>'name_ar',
        name_en = v_audit.before_json->>'name_en',
        icon = v_audit.before_json->>'icon',
        sort_order = (v_audit.before_json->>'sort_order')::INTEGER,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        is_client_visible = (v_audit.before_json->>'is_client_visible')::BOOLEAN,
        requires_barcode = (v_audit.before_json->>'requires_barcode')::BOOLEAN,
        allows_product_proposal = (v_audit.before_json->>'allows_product_proposal')::BOOLEAN,
        allows_store_product_custom_image = (v_audit.before_json->>'allows_store_product_custom_image')::BOOLEAN,
        requires_catalog_review = (v_audit.before_json->>'requires_catalog_review')::BOOLEAN,
        requires_product_catalog = (v_audit.before_json->>'requires_product_catalog')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_master_products' THEN
      SELECT version INTO v_current_version FROM dsh_master_products WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_master_products SET
        category_node_id = NULLIF(v_audit.before_json->>'category_node_id', ''),
        canonical_name_ar = v_audit.before_json->>'canonical_name_ar',
        canonical_name_en = v_audit.before_json->>'canonical_name_en',
        brand = v_audit.before_json->>'brand',
        barcode = NULLIF(v_audit.before_json->>'barcode', ''),
        gtin = NULLIF(v_audit.before_json->>'gtin', ''),
        sku = NULLIF(v_audit.before_json->>'sku', ''),
        unit = v_audit.before_json->>'unit',
        measurement_type = v_audit.before_json->>'measurement_type',
        approval_status = v_audit.before_json->>'approval_status',
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_store_assortments' THEN
      SELECT version INTO v_current_version FROM dsh_store_assortments WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      -- Assortment rollback owns metadata only. Commercial rollback is owned by
      -- the normalized inventory/price audit entries after this cutover.
      UPDATE dsh_store_assortments SET
        local_note = v_audit.before_json->>'local_note',
        custom_image_object_key = NULLIF(v_audit.before_json->>'custom_image_object_key', ''),
        publication_status = v_audit.before_json->>'publication_status',
        pause_reason = COALESCE(v_audit.before_json->>'pause_reason', ''),
        paused_until = NULLIF(v_audit.before_json->>'paused_until', '')::TIMESTAMPTZ,
        paused_at = NULLIF(v_audit.before_json->>'paused_at', '')::TIMESTAMPTZ,
        paused_by = NULLIF(v_audit.before_json->>'paused_by', ''),
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_catalog_platform_policies' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_platform_policies WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_platform_policies SET
        allows_store_product_custom_image = (v_audit.before_json->>'allows_store_product_custom_image')::BOOLEAN,
        allows_product_proposal = (v_audit.before_json->>'allows_product_proposal')::BOOLEAN,
        requires_barcode = (v_audit.before_json->>'requires_barcode')::BOOLEAN,
        requires_catalog_review = (v_audit.before_json->>'requires_catalog_review')::BOOLEAN,
        requires_marketing_review = (v_audit.before_json->>'requires_marketing_review')::BOOLEAN,
        requires_product_image = (v_audit.before_json->>'requires_product_image')::BOOLEAN,
        requires_category_image = (v_audit.before_json->>'requires_category_image')::BOOLEAN,
        requires_description = (v_audit.before_json->>'requires_description')::BOOLEAN,
        requires_brand = (v_audit.before_json->>'requires_brand')::BOOLEAN,
        requires_unit = (v_audit.before_json->>'requires_unit')::BOOLEAN,
        product_data_quality_minimum_score = (v_audit.before_json->>'product_data_quality_minimum_score')::NUMERIC,
        max_gallery_images = (v_audit.before_json->>'max_gallery_images')::INTEGER,
        manual_request_mode = (v_audit.before_json->>'manual_request_mode')::BOOLEAN,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        notes = v_audit.before_json->>'notes',
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    ELSE
      RAISE EXCEPTION 'AUDIT_ENTITY_NOT_ROLLBACKABLE';
  END CASE;

  INSERT INTO dsh_catalog_entity_audit (
    id, entity_type, entity_id, action, actor_id, actor_role, reason,
    before_json, after_json, metadata_json
  ) VALUES (
    'catalog-audit-' || gen_random_uuid()::text,
    v_audit.entity_type,
    v_audit.entity_id,
    'ROLLBACK',
    p_actor_id,
    COALESCE(NULLIF(p_actor_role, ''), 'operator'),
    p_reason,
    v_audit.after_json,
    v_audit.before_json,
    jsonb_build_object('sourceAuditId', p_audit_id)
  );

  RETURN QUERY SELECT v_audit.entity_type, v_audit.entity_id, v_current_version + 1;
END
$$;


--
-- Name: dsh_check_assignment_fulfillment_mode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_check_assignment_fulfillment_mode() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_mode TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT fulfillment_mode INTO v_mode FROM dsh_orders WHERE id = NEW.order_id;
        IF v_mode IN ('partner_delivery', 'pickup') THEN
            RAISE EXCEPTION 'Orders with fulfillment_mode % cannot have bthwani assignments', v_mode;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_cleanup_home_content_targets(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_cleanup_home_content_targets() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM dsh_home_content_targets
  WHERE content_kind = TG_ARGV[0] AND content_id = OLD.id;
  RETURN OLD;
END;
$$;


--
-- Name: dsh_client_address_fingerprint(text, text, text, text, text, text, text, text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_client_address_fingerprint(p_recipient_name text, p_phone_e164 text, p_address_line text, p_service_area_code text, p_building text, p_floor text, p_unit text, p_delivery_instructions text, p_latitude double precision, p_longitude double precision) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $$
    SELECT md5(
        lower(btrim(COALESCE(p_recipient_name, ''))) || E'\x1f' ||
        btrim(COALESCE(p_phone_e164, '')) || E'\x1f' ||
        lower(btrim(COALESCE(p_address_line, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_service_area_code, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_building, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_floor, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_unit, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_delivery_instructions, ''))) || E'\x1f' ||
        COALESCE(p_latitude::TEXT, '') || E'\x1f' ||
        COALESCE(p_longitude::TEXT, '')
    );
$$;


--
-- Name: dsh_enforce_client_address_service_area(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_client_address_service_area() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_resolved_service_area_code TEXT;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'DSH_ADDRESS_COORDINATES_REQUIRED';
    END IF;

    NEW.service_area_code := lower(btrim(NEW.service_area_code));

    WITH effective_versions AS (
        SELECT DISTINCT ON (service_area_code)
               service_area_code,
               polygon,
               active,
               priority,
               effective_from,
               expires_at,
               version
          FROM dsh_service_area_versions
         WHERE effective_from <= NOW()
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY service_area_code, effective_from DESC, version DESC
    )
    SELECT service_area_code
      INTO v_resolved_service_area_code
      FROM effective_versions
     WHERE active = TRUE
       AND ST_Contains(
             polygon,
             ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
           )
     ORDER BY priority DESC, service_area_code ASC
     LIMIT 1;

    IF v_resolved_service_area_code IS NULL
       OR v_resolved_service_area_code <> NEW.service_area_code THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION dsh_enforce_client_address_service_area(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_enforce_client_address_service_area() IS 'Enforces active client addresses against the effective PostGIS service-area winner used by DSH runtime resolution.';


--
-- Name: dsh_enforce_partner_child_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_partner_child_operatorcontext() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  owner_OperatorContext TEXT;
BEGIN
  SELECT operator_context_id INTO owner_OperatorContext
  FROM dsh_partners
  WHERE id = NEW.partner_id;

  IF owner_OperatorContext IS NULL OR btrim(owner_OperatorContext) = '' THEN
    RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: partner OperatorContext not found';
  END IF;

  NEW.operator_context_id := owner_OperatorContext;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_enforce_partner_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_partner_operatorcontext() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  session_OperatorContext TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.operator_context_id IS NOT NULL
     AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
    RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: partner context cannot change'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
    session_OperatorContext := dsh_trusted_OperatorContext_context();
    IF session_OperatorContext IS NULL THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted partner context is required';
    END IF;
    NEW.operator_context_id := session_OperatorContext;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_enforce_partner_store_operatorcontext_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_partner_store_operatorcontext_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    owner_OperatorContext TEXT;
BEGIN
    IF NEW.partner_id IS NULL OR btrim(NEW.partner_id) = '' THEN
        IF NEW.brand_id IS NOT NULL THEN
            RAISE EXCEPTION 'brand requires partner ownership for store %', NEW.id
                USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;

    SELECT operator_context_id
      INTO owner_OperatorContext
      FROM dsh_partners
     WHERE id = NEW.partner_id;

    IF owner_OperatorContext IS NULL THEN
        RAISE EXCEPTION 'partner % does not exist', NEW.partner_id
            USING ERRCODE = '23503';
    END IF;

    IF owner_OperatorContext <> NEW.operator_context_id THEN
        RAISE EXCEPTION 'partner/store OperatorContext mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.brand_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM dsh_partner_brands b
         WHERE b.id = NEW.brand_id
           AND b.operator_context_id = NEW.operator_context_id
           AND b.partner_id = NEW.partner_id
    ) THEN
        RAISE EXCEPTION 'brand/store ownership mismatch for store %', NEW.id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_enforce_store_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_store_operatorcontext() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  owner_OperatorContext TEXT;
  session_OperatorContext TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL AND BTRIM(NEW.partner_id) <> '' THEN
    SELECT operator_context_id INTO owner_OperatorContext
    FROM dsh_partners
    WHERE id = NEW.partner_id;

    IF owner_OperatorContext IS NULL OR BTRIM(owner_OperatorContext) = '' THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: partner context not found';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND OLD.operator_context_id IS DISTINCT FROM owner_OperatorContext THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store cannot move across contexts'
        USING ERRCODE = '23514';
    END IF;

    NEW.operator_context_id := owner_OperatorContext;
  ELSE
    IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
      session_OperatorContext := dsh_trusted_OperatorContext_context();
      IF session_OperatorContext IS NULL THEN
        RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted store context is required';
      END IF;
      NEW.operator_context_id := session_OperatorContext;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store context cannot change'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_enforce_store_scope_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enforce_store_scope_operatorcontext() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  owner_OperatorContext TEXT;
BEGIN
  SELECT operator_context_id INTO owner_OperatorContext
  FROM dsh_stores
  WHERE id = NEW.store_id;

  IF owner_OperatorContext IS NULL OR btrim(owner_OperatorContext) = '' THEN
    RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: store OperatorContext not found';
  END IF;

  NEW.operator_context_id := owner_OperatorContext;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_enqueue_coupon_funding_release_on_checkout_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_coupon_funding_release_on_checkout_cancel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.state = 'cancelled' AND OLD.state IS DISTINCT FROM NEW.state THEN
        INSERT INTO dsh_promotion_funding_outbox (
            event_type,
            operator_context_id,
            checkout_intent_id,
            coupon_redemption_id,
            wlt_funding_reservation_id,
            order_id,
            reason,
            idempotency_key,
            correlation_id
        )
        SELECT
            'release',
            r.funding_operator_context_id,
            r.checkout_intent_id,
            r.id,
            r.wlt_funding_reservation_id,
            NULL,
            'checkout_cancelled',
            'dsh-promotion-funding-release:' || r.id::TEXT || ':checkout_cancelled',
            NEW.id::TEXT
        FROM dsh_coupon_redemptions r
        WHERE r.checkout_intent_id = NEW.id
          AND r.funding_status = 'reserved'
          AND r.funding_operator_context_id IS NOT NULL
          AND r.wlt_funding_reservation_id IS NOT NULL
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_enqueue_coupon_funding_reverse_on_order_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_coupon_funding_reverse_on_order_cancel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO dsh_promotion_funding_outbox (
            event_type,
            operator_context_id,
            checkout_intent_id,
            coupon_redemption_id,
            wlt_funding_reservation_id,
            order_id,
            reason,
            idempotency_key,
            correlation_id
        )
        SELECT
            'reverse',
            r.funding_operator_context_id,
            r.checkout_intent_id,
            r.id,
            r.wlt_funding_reservation_id,
            NEW.id,
            COALESCE(NULLIF(NEW.rejection_reason, ''), 'order_cancelled'),
            'dsh-promotion-funding-reverse:' || r.id::TEXT || ':' || NEW.id::TEXT,
            NEW.id::TEXT
        FROM dsh_coupon_redemptions r
        WHERE r.checkout_intent_id = NEW.checkout_intent_id
          AND r.funding_status = 'committed'
          AND r.funding_operator_context_id IS NOT NULL
          AND r.wlt_funding_reservation_id IS NOT NULL
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_enqueue_loyalty_earned_on_delivery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_loyalty_earned_on_delivery() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    policy RECORD;
    eligible_minor_units BIGINT;
    calculated_points BIGINT;
    event_operator_context_id TEXT;
    event_partner_id TEXT;
BEGIN
    IF NEW.status='delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT points_numerator,eligible_minor_units_denominator,minimum_points,
               maximum_points_per_order
        INTO policy
        FROM dsh_loyalty_earning_policies
        WHERE status='active' AND approved_at IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1;

        IF FOUND THEN
            eligible_minor_units := GREATEST(NEW.subtotal_minor_units-NEW.discount_minor_units,0);
            calculated_points := FLOOR(
                eligible_minor_units::NUMERIC * policy.points_numerator::NUMERIC /
                policy.eligible_minor_units_denominator::NUMERIC
            );
            IF calculated_points < policy.minimum_points THEN
                calculated_points := policy.minimum_points;
            END IF;
            IF policy.maximum_points_per_order > 0 AND calculated_points > policy.maximum_points_per_order THEN
                calculated_points := policy.maximum_points_per_order;
            END IF;

            IF calculated_points > 0 THEN
                SELECT ci.operator_context_id, COALESCE(s.partner_id,'')
                INTO event_operator_context_id, event_partner_id
                FROM dsh_checkout_intents ci
                JOIN dsh_stores s ON s.id=NEW.store_id
                WHERE ci.id=NEW.checkout_intent_id
                FOR SHARE OF ci, s;

                IF NOT FOUND OR event_operator_context_id IS NULL OR btrim(event_operator_context_id)='' THEN
                    RAISE EXCEPTION 'cannot enqueue loyalty earn without checkout OperatorContext context';
                END IF;

                INSERT INTO dsh_wlt_outbox_events
                    (event_type,operator_context_id,order_id,captain_id,partner_id,checkout_intent_id,
                     client_id,points,payload)
                VALUES (
                    'loyalty_earned',event_operator_context_id,NEW.id,'',event_partner_id,
                    NEW.checkout_intent_id,NEW.client_id,calculated_points,
                    jsonb_build_object(
                        'eligibleMinorUnits',eligible_minor_units,
                        'subtotalMinorUnits',NEW.subtotal_minor_units,
                        'discountMinorUnits',NEW.discount_minor_units,
                        'currency',NEW.currency,
                        'pricingSnapshotHash',NEW.pricing_snapshot_hash
                    )
                )
                ON CONFLICT (order_id,event_type) DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION dsh_enqueue_loyalty_earned_on_delivery(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_enqueue_loyalty_earned_on_delivery() IS 'Atomically enqueues OperatorContext-scoped loyalty earn truth when an order is delivered.';


--
-- Name: dsh_enqueue_loyalty_reversal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_loyalty_reversal(p_order_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    original_event RECORD;
BEGIN
    SELECT * INTO original_event
    FROM dsh_wlt_outbox_events
    WHERE order_id=p_order_id AND event_type='loyalty_earned'
    FOR UPDATE;

    IF NOT FOUND OR original_event.points<=0 THEN
        RETURN;
    END IF;
    IF original_event.status<>'sent' OR original_event.external_reference='' THEN
        RAISE EXCEPTION 'loyalty earn event is not confirmed by WLT';
    END IF;
    IF original_event.operator_context_id IS NULL OR btrim(original_event.operator_context_id)='' THEN
        RAISE EXCEPTION 'loyalty earn event has no OperatorContext context';
    END IF;

    INSERT INTO dsh_wlt_outbox_events
        (event_type,operator_context_id,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,points,reversal_of_reference,payload)
    VALUES (
        'loyalty_reversed',original_event.operator_context_id,original_event.order_id,'',
        original_event.partner_id,original_event.checkout_intent_id,
        original_event.client_id,original_event.points,original_event.external_reference,
        jsonb_build_object('reason',p_reason)
    )
    ON CONFLICT (order_id,event_type) DO NOTHING;
END;
$$;


--
-- Name: FUNCTION dsh_enqueue_loyalty_reversal(p_order_id uuid, p_reason text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_enqueue_loyalty_reversal(p_order_id uuid, p_reason text) IS 'Creates an idempotent OperatorContext-scoped WLT loyalty reversal after governed refund confirmation.';


--
-- Name: dsh_enqueue_partner_wlt_deactivation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_partner_wlt_deactivation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.to_status = 'partner_terminated' THEN
    INSERT INTO dsh_partner_wlt_outbox (
      partner_id, activation_event_id, event_type, actor_id,
      correlation_id, idempotency_key
    ) VALUES (
      NEW.partner_id, NEW.id, 'deactivate_payout_destination', NEW.actor_id,
      COALESCE(NULLIF(NEW.correlation_id,''), 'partner-termination-' || NEW.id),
      'partner-payout-deactivate-' || NEW.id
    )
    ON CONFLICT (event_type, activation_event_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_enqueue_pickup_delivery_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enqueue_pickup_delivery_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_partner_id TEXT;
BEGIN
    IF NEW.fulfillment_mode <> 'pickup'
       OR NEW.status <> 'delivered'
       OR OLD.status = 'delivered' THEN
        RETURN NEW;
    END IF;

    SELECT partner_id INTO v_partner_id
      FROM dsh_stores
     WHERE id = NEW.store_id;

    INSERT INTO dsh_wlt_outbox_events
      (event_type, operator_context_id, order_id, captain_id, collector_type, collector_id,
       partner_id, checkout_intent_id)
    VALUES
      ('delivery_completed', NEW.operator_context_id, NEW.id, NULL, 'partner_store', v_partner_id,
       v_partner_id, NEW.checkout_intent_id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_enrich_order_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_enrich_order_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  order_row RECORD;
BEGIN
  SELECT operator_context_id, correlation_id, version
  INTO order_row
  FROM dsh_orders
  WHERE id=NEW.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order event references missing order'; END IF;

  NEW.operator_context_id := order_row.operator_context_id;
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id,''), order_row.correlation_id);
  NEW.causation_id := COALESCE(NEW.causation_id,'');
  NEW.actor_id := COALESCE(NEW.actor_id,'');
  NEW.order_version := order_row.version;
  NEW.event_type := CASE
    WHEN NULLIF(NEW.event_type,'') IS NOT NULL AND NEW.event_type <> 'order.status_changed' THEN NEW.event_type
    WHEN NEW.from_status='' AND NEW.to_status='pending' THEN 'order.created'
    ELSE 'order.status_changed'
  END;
  NEW.metadata := COALESCE(NEW.metadata,'{}'::jsonb);
  RETURN NEW;
END $$;


--
-- Name: dsh_financial_snapshot_is_eligible(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_financial_snapshot_is_eligible(requested_operator_context_id text, requested_captain_id text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE((
    SELECT eligible AND expires_at > now()
    FROM dsh_captain_financial_eligibility
    WHERE operator_context_id = requested_operator_context_id
      AND captain_id = requested_captain_id
  ), false);
$$;


--
-- Name: dsh_guard_checkout_operatorcontext(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_checkout_operatorcontext() RETURNS trigger
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


--
-- Name: dsh_guard_checkout_wlt_event_receipt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_checkout_wlt_event_receipt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    intent_OperatorContext TEXT;
    intent_session TEXT;
BEGIN
    SELECT operator_context_id, wlt_payment_session_id
      INTO intent_OperatorContext, intent_session
      FROM dsh_checkout_intents
     WHERE id = NEW.checkout_intent_id
     FOR SHARE;

    IF intent_OperatorContext IS NULL OR intent_OperatorContext <> NEW.operator_context_id THEN
        RAISE EXCEPTION 'WLT event OperatorContext does not match checkout intent OperatorContext'
            USING ERRCODE = '23514';
    END IF;
    IF btrim(intent_session) = '' OR intent_session <> NEW.payment_session_id THEN
        RAISE EXCEPTION 'WLT event payment session does not match checkout intent'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_cod_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_cod_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.event_type = 'delivery_completed'
     AND (NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '') THEN
    RAISE EXCEPTION
      'OPERATOR_CONTEXT_REQUIRED: delivery_completed WLT outbox event must carry operator_context_id'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_coupon_funding_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_coupon_funding_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.funding_status IN ('released', 'reversed')
       AND NEW.funding_status <> OLD.funding_status THEN
        RAISE EXCEPTION 'terminal coupon funding projection cannot transition'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.funding_status = 'committed'
       AND NEW.funding_status NOT IN ('committed', 'reversed') THEN
        RAISE EXCEPTION 'committed coupon funding can only be reversed'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_funding_reservation_id IS NOT NULL
       AND NEW.wlt_funding_reservation_id IS DISTINCT FROM OLD.wlt_funding_reservation_id THEN
        RAISE EXCEPTION 'WLT funding reservation reference is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.funding_operator_context_id IS NOT NULL
       AND NEW.funding_operator_context_id IS DISTINCT FROM OLD.funding_operator_context_id THEN
        RAISE EXCEPTION 'coupon funding OperatorContext is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.funding_status <> 'not_required'
       AND ROW(
            NEW.platform_funded_minor_units,
            NEW.partner_funded_minor_units,
            NEW.funding_partner_id
       ) IS DISTINCT FROM ROW(
            OLD.platform_funded_minor_units,
            OLD.partner_funded_minor_units,
            OLD.funding_partner_id
       ) THEN
        RAISE EXCEPTION 'coupon funding split is immutable after reservation begins'
            USING ERRCODE = '23514';
    END IF;

    NEW.funding_updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_duplicate_pending_team_invite(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_duplicate_pending_team_invite() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.invited_identity := btrim(NEW.invited_identity);
  PERFORM pg_advisory_xact_lock(
    hashtextextended('dsh-team-invite:' || NEW.store_id || ':' || lower(NEW.invited_identity), 0)
  );
  IF EXISTS (
    SELECT 1
    FROM dsh_store_team_members
    WHERE store_id = NEW.store_id
      AND lower(btrim(invited_identity)) = lower(NEW.invited_identity)
      AND status = 'invited'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_loyalty_tier_governance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_loyalty_tier_governance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent loyalty-tier approval is required'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.name_ar,
            OLD.name_en,
            OLD.min_points,
            OLD.discount_percent,
            OLD.free_delivery_threshold_yer,
            OLD.badge
       ) IS DISTINCT FROM ROW(
            NEW.name_ar,
            NEW.name_en,
            NEW.min_points,
            NEW.discount_percent,
            NEW.free_delivery_threshold_yer,
            NEW.badge
       ) THEN
        RAISE EXCEPTION 'active loyalty-tier terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_special_request_wlt_event_receipt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_special_request_wlt_event_receipt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    request_context TEXT;
    request_session TEXT;
BEGIN
    SELECT operator_context_id, wlt_payment_session_id
      INTO request_context, request_session
      FROM dsh_special_requests
     WHERE id = NEW.special_request_id
     FOR SHARE;

    IF request_context IS NULL OR request_context <> NEW.operator_context_id THEN
        RAISE EXCEPTION 'WLT event OperatorContext does not match special request'
            USING ERRCODE = '23514';
    END IF;
    IF btrim(COALESCE(request_session, '')) = '' OR request_session <> NEW.payment_session_id THEN
        RAISE EXCEPTION 'WLT event payment session does not match special request'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_subscription_plan_governance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_subscription_plan_governance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent subscription-plan approval is required'
                USING ERRCODE = '23514';
        END IF;
        IF btrim(COALESCE(NEW.wlt_product_reference, '')) = '' THEN
            RAISE EXCEPTION 'WLT product reference is required before subscription activation'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.name_ar,
            OLD.name_en,
            OLD.price_yer,
            OLD.billing_cycle,
            OLD.include_free_delivery,
            OLD.points_multiplier,
            OLD.order_cap,
            OLD.badge,
            OLD.wlt_product_reference
       ) IS DISTINCT FROM ROW(
            NEW.name_ar,
            NEW.name_en,
            NEW.price_yer,
            NEW.billing_cycle,
            NEW.include_free_delivery,
            NEW.points_multiplier,
            NEW.order_cap,
            NEW.badge,
            NEW.wlt_product_reference
       ) THEN
        RAISE EXCEPTION 'active subscription-plan terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_subscription_purchase_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_subscription_purchase_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.plan_id <> OLD.plan_id
       OR NEW.client_id <> OLD.client_id
       OR NEW.operator_context_id <> OLD.operator_context_id
       OR NEW.wlt_product_reference <> OLD.wlt_product_reference
       OR NEW.idempotency_key <> OLD.idempotency_key
       OR COALESCE(NEW.renewal_of_purchase_id, '') <> COALESCE(OLD.renewal_of_purchase_id, '') THEN
        RAISE EXCEPTION 'subscription purchase identity and WLT product reference are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_payment_session_id IS NOT NULL
       AND COALESCE(NEW.wlt_payment_session_id, '') <> OLD.wlt_payment_session_id THEN
        RAISE EXCEPTION 'bound WLT payment session is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_subscription_id IS NOT NULL
       AND COALESCE(NEW.wlt_subscription_id, '') <> OLD.wlt_subscription_id THEN
        RAISE EXCEPTION 'bound WLT subscription reference is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status IN ('cancelled', 'expired', 'compensated', 'failed')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'terminal subscription purchase state cannot transition'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'active'
       AND NEW.status NOT IN ('active', 'renewal_pending_payment', 'cancelled', 'expired', 'compensation_pending') THEN
        RAISE EXCEPTION 'invalid transition from active subscription purchase'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'cancelled'
       AND (NEW.cancelled_at IS NULL OR btrim(COALESCE(NEW.cancellation_reason, '')) = '') THEN
        RAISE EXCEPTION 'cancellation timestamp and reason are required'
            USING ERRCODE = '23514';
    END IF;

    NEW.lifecycle_version := OLD.lifecycle_version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_team_member_action_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_team_member_action_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.action_label NOT IN (
    'pause',
    'activate',
    'block',
    'resend-invite',
    'cancel-invite',
    'issue_captain_connection_code',
    'redeem_captain_connection_code',
    'captain_disconnect',
    'revoke_captain_connection_code',
    'expire_captain_connection_code'
  ) THEN
    RAISE EXCEPTION 'unsupported team member action: %', NEW.action_label
      USING ERRCODE = '23514';
  END IF;

  -- Preserve the legacy suppression rule only for UI status commands.
  -- Fleet lifecycle events represent security and membership facts independently
  -- of whether the team-member status changed in that exact transaction.
  IF NEW.action_label IN (
    'pause',
    'activate',
    'block',
    'resend-invite',
    'cancel-invite'
  ) AND NEW.from_status IS NOT DISTINCT FROM NEW.to_status THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_guard_team_member_noop_status_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_guard_team_member_noop_status_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.version := OLD.version;
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_increment_order_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_increment_order_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END $$;


--
-- Name: dsh_normalize_delivery_collection_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_normalize_delivery_collection_actor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_mode TEXT;
    v_partner_id TEXT;
BEGIN
    IF NEW.event_type <> 'delivery_completed' THEN
        NEW.collector_type := NULL;
        NEW.collector_id := NULL;
        RETURN NEW;
    END IF;

    SELECT o.fulfillment_mode, s.partner_id
      INTO v_mode, v_partner_id
      FROM dsh_orders o
      JOIN dsh_stores s ON s.id = o.store_id
     WHERE o.id = NEW.order_id;

    IF v_mode = 'partner_delivery' THEN
        NEW.collector_type := 'store_courier';
        NEW.collector_id := COALESCE(NULLIF(NEW.collector_id, ''), NEW.captain_id);
        NEW.captain_id := NULL;
    ELSIF v_mode = 'pickup' THEN
        NEW.collector_type := 'partner_store';
        NEW.collector_id := v_partner_id;
        NEW.captain_id := NULL;
    ELSE
        NEW.collector_type := 'captain';
        NEW.collector_id := COALESCE(NULLIF(NEW.collector_id, ''), NEW.captain_id);
        NEW.captain_id := NEW.collector_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_prepare_pickup_no_show_shape(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_prepare_pickup_no_show_shape() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'no_show' THEN
        NEW.no_show_at := COALESCE(NEW.no_show_at, NEW.used_at, NOW());
        NEW.no_show_reason := COALESCE(NULLIF(BTRIM(NEW.no_show_reason), ''), 'recorded_by_partner');
    ELSIF OLD.status = 'no_show' AND NEW.status <> 'no_show' THEN
        NEW.no_show_at := NULL;
        NEW.no_show_reason := NULL;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_prevent_store_partner_reassignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_prevent_store_partner_reassignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.partner_id IS NOT NULL
     AND NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND current_setting('bthwani.governed_store_partner_transfer', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'STORE_PARTNER_REASSIGNMENT_FORBIDDEN'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_project_pickup_lifecycle_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_project_pickup_lifecycle_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.action = 'notify_customer' THEN
        UPDATE dsh_pickup_sessions
           SET customer_notified_at = NEW.created_at,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE order_id::text = NEW.entity_id;
    ELSIF NEW.action = 'customer_arrived' THEN
        UPDATE dsh_pickup_sessions
           SET customer_arrived_at = NEW.created_at,
               version = version + 1,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE order_id::text = NEW.entity_id
           AND status = 'active';
    ELSIF NEW.action = 'no_show' THEN
        UPDATE dsh_pickup_sessions
           SET no_show_at = NEW.created_at,
               no_show_reason = COALESCE(NULLIF(BTRIM(NEW.reason), ''), no_show_reason),
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE id = NEW.entity_id;
    ELSIF NEW.action = 'reschedule' THEN
        UPDATE dsh_pickup_sessions
           SET rescheduled_at = NEW.created_at,
               customer_notified_at = NULL,
               customer_arrived_at = NULL,
               no_show_at = NULL,
               no_show_reason = NULL,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_protect_checkout_cart_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_checkout_cart_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'checkout cart snapshot is immutable';
END;
$$;


--
-- Name: dsh_protect_checkout_item_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_checkout_item_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'checkout item snapshot is immutable';
END;
$$;


--
-- Name: dsh_protect_order_item_commercial_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_order_item_commercial_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ROW(NEW.order_id, NEW.product_id, NEW.product_name, NEW.quantity,
         NEW.unit_price, NEW.currency, NEW.item_snapshot, NEW.line_total_minor_units)
     IS DISTINCT FROM
     ROW(OLD.order_id, OLD.product_id, OLD.product_name, OLD.quantity,
         OLD.unit_price, OLD.currency, OLD.item_snapshot, OLD.line_total_minor_units) THEN
    RAISE EXCEPTION 'order item commercial snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_protect_order_pricing_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_order_pricing_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF ROW(NEW.subtotal_minor_units,NEW.delivery_fee_minor_units,NEW.discount_minor_units,
           NEW.total_minor_units,NEW.currency,NEW.pricing_snapshot_hash,NEW.coupon_id,
           NEW.coupon_redemption_id,NEW.coupon_code_last4)
       IS DISTINCT FROM
       ROW(OLD.subtotal_minor_units,OLD.delivery_fee_minor_units,OLD.discount_minor_units,
           OLD.total_minor_units,OLD.currency,OLD.pricing_snapshot_hash,OLD.coupon_id,
           OLD.coupon_redemption_id,OLD.coupon_code_last4) THEN
        RAISE EXCEPTION 'order pricing snapshot is immutable';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_protect_order_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_order_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF ROW(NEW.checkout_intent_id, NEW.operator_context_id, NEW.store_id, NEW.client_id,
         NEW.fulfillment_mode, NEW.order_number, NEW.correlation_id,
         NEW.delivery_address_id, NEW.delivery_address_snapshot,
         NEW.subtotal_minor_units, NEW.discount_minor_units, NEW.total_minor_units,
         NEW.currency, NEW.pricing_snapshot_hash, NEW.coupon_id,
         NEW.coupon_redemption_id, NEW.coupon_code_last4)
     IS DISTINCT FROM
     ROW(OLD.checkout_intent_id, OLD.operator_context_id, OLD.store_id, OLD.client_id,
         OLD.fulfillment_mode, OLD.order_number, OLD.correlation_id,
         OLD.delivery_address_id, OLD.delivery_address_snapshot,
         OLD.subtotal_minor_units, OLD.discount_minor_units, OLD.total_minor_units,
         OLD.currency, OLD.pricing_snapshot_hash, OLD.coupon_id,
         OLD.coupon_redemption_id, OLD.coupon_code_last4) THEN
    RAISE EXCEPTION ' order truth snapshot is immutable';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: dsh_protect_pickup_fee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_protect_pickup_fee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.fulfillment_mode='pickup' AND NEW.fee_minor_units<>0 THEN
        RAISE EXCEPTION 'pickup fee must remain zero';
    END IF;
    IF NEW.status='active' AND NEW.approved_at IS NULL THEN
        RAISE EXCEPTION 'active delivery pricing requires approval';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_publish_order_event_to_outbox(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_publish_order_event_to_outbox() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO dsh_order_event_outbox
    (operator_context_id,order_id,event_id,event_type,correlation_id,causation_id,payload)
  VALUES
    (NEW.operator_context_id,NEW.order_id,NEW.id,NEW.event_type,NEW.correlation_id,NEW.causation_id,
     jsonb_build_object(
       'eventId',NEW.id,
       'eventType',NEW.event_type,
       'orderId',NEW.order_id,
       'fromStatus',NEW.from_status,
       'toStatus',NEW.to_status,
       'actorRole',NEW.actor_role,
       'correlationId',NEW.correlation_id,
       'causationId',NEW.causation_id,
       'orderVersion',NEW.order_version,
       'metadata',NEW.metadata,
       'occurredAt',NEW.created_at
     ))
  ON CONFLICT (operator_context_id,event_id) DO NOTHING;
  RETURN NEW;
END $$;


--
-- Name: dsh_purge_expired_client_address_mutation_receipts(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_purge_expired_client_address_mutation_receipts(p_limit integer DEFAULT 1000) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'DSH_ADDRESS_RECEIPT_PURGE_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  WITH candidates AS (
    SELECT client_id, idempotency_key
    FROM dsh_client_address_mutation_receipts
    WHERE expires_at <= NOW()
    ORDER BY expires_at ASC, client_id ASC, idempotency_key ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), deleted AS (
    DELETE FROM dsh_client_address_mutation_receipts AS receipt
    USING candidates
    WHERE receipt.client_id = candidates.client_id
      AND receipt.idempotency_key = candidates.idempotency_key
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$;


--
-- Name: FUNCTION dsh_purge_expired_client_address_mutation_receipts(p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.dsh_purge_expired_client_address_mutation_receipts(p_limit integer) IS 'Deletes an operator-bounded batch of expired  mutation receipts.';


--
-- Name: dsh_record_default_delivery_exception_reporter(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_record_default_delivery_exception_reporter() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO dsh_delivery_exception_reporters (
        exception_id,
        actor_id,
        actor_role,
        reported_at
    ) VALUES (
        NEW.id,
        NEW.captain_id,
        'captain',
        NEW.reported_at
    )
    ON CONFLICT (exception_id) DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_refresh_client_address_fingerprint(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_refresh_client_address_fingerprint() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.address_fingerprint := dsh_client_address_fingerprint(
        NEW.recipient_name,
        NEW.phone_e164,
        NEW.address_line,
        NEW.service_area_code,
        NEW.building,
        NEW.floor,
        NEW.unit,
        NEW.delivery_instructions,
        NEW.latitude,
        NEW.longitude
    );
    RETURN NEW;
END;
$$;


--
-- Name: dsh_reject_quarantined_cart_mutation_receipt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_reject_quarantined_cart_mutation_receipt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_cart_mutation_receipt_quarantine quarantined
    WHERE quarantined.client_id = NEW.client_id
      AND quarantined.idempotency_key = NEW.idempotency_key
  ) THEN
    RAISE EXCEPTION 'DSH_CART_MUTATION_OUTCOME_UNKNOWN'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: dsh_reject_service_area_version_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_reject_service_area_version_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'DSH_SERVICE_AREA_VERSION_IMMUTABLE'
        USING ERRCODE = '55000';
END;
$$;


--
-- Name: dsh_reject_subscription_lifecycle_event_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_reject_subscription_lifecycle_event_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'dsh_subscription_lifecycle_events is append-only'
        USING ERRCODE = '55000';
END;
$$;


--
-- Name: dsh_require_store_partner_transfer_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_require_store_partner_transfer_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.partner_id IS NOT NULL
     AND NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT EXISTS (
       SELECT 1
       FROM dsh_partner_store_transfer_audit audit
       WHERE audit.operator_context_id = NEW.operator_context_id
         AND audit.store_id = NEW.id
         AND audit.from_partner_id = OLD.partner_id
         AND audit.to_partner_id = NEW.partner_id
         AND audit.expected_store_version = OLD.version
         AND audit.resulting_store_version = NEW.version
     ) THEN
    RAISE EXCEPTION 'STORE_PARTNER_TRANSFER_AUDIT_REQUIRED'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_reschedule_client_address_privacy_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_reschedule_client_address_privacy_queue() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.enabled THEN
        UPDATE dsh_client_addresses
           SET pii_purge_after = deleted_at + make_interval(days => NEW.retention_days),
               updated_at = NOW()
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL;
    ELSE
        UPDATE dsh_client_addresses
           SET pii_purge_after = NULL,
               updated_at = NOW()
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_schedule_client_address_pii_purge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_schedule_client_address_pii_purge() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_enabled BOOLEAN;
    v_retention_days INTEGER;
    v_policy_version INTEGER;
BEGIN
    IF NEW.deleted_at IS NULL OR NEW.pii_anonymized_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT enabled, retention_days, version
      INTO v_enabled, v_retention_days, v_policy_version
      FROM dsh_client_address_privacy_policy
     WHERE id = 1;

    IF NOT v_enabled THEN
        NEW.pii_purge_after := NULL;
        RETURN NEW;
    END IF;

    NEW.pii_purge_after := COALESCE(
        NEW.pii_purge_after,
        NEW.deleted_at + make_interval(days => v_retention_days)
    );

    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL THEN
        INSERT INTO dsh_client_address_privacy_events (
            address_id,
            client_subject_hash,
            action,
            actor_id,
            policy_version,
            metadata
        ) VALUES (
            NEW.id,
            encode(digest(NEW.client_id, 'sha256'), 'hex'),
            'retention_scheduled',
            'database-trigger',
            v_policy_version,
            jsonb_build_object('purgeAfter', NEW.pii_purge_after)
        );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_schedule_payment_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_schedule_payment_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.wlt_payment_ref_id <> '' THEN
    INSERT INTO dsh_order_payment_projection_reconciliation
      (order_id, operator_context_id, wlt_payment_session_id, status, next_attempt_at)
    VALUES
      (NEW.id, NEW.operator_context_id, NEW.wlt_payment_ref_id, 'pending', NOW())
    ON CONFLICT (order_id) DO UPDATE
      SET operator_context_id=EXCLUDED.operator_context_id,
          wlt_payment_session_id=EXCLUDED.wlt_payment_session_id,
          status='pending',
          next_attempt_at=NOW(),
          updated_at=NOW();
  END IF;
  RETURN NEW;
END $$;


--
-- Name: dsh_snapshot_delivery_proof_location(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_snapshot_delivery_proof_location() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    assignment_latitude DOUBLE PRECISION;
    assignment_longitude DOUBLE PRECISION;
    assignment_recorded_at TIMESTAMPTZ;
BEGIN
    IF NEW.captured_latitude IS NOT NULL OR NEW.captured_longitude IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT last_latitude, last_longitude, location_recorded_at
      INTO assignment_latitude, assignment_longitude, assignment_recorded_at
      FROM dsh_assignments
     WHERE id = NEW.assignment_id;

    IF assignment_latitude IS NOT NULL
       AND assignment_longitude IS NOT NULL
       AND assignment_recorded_at IS NOT NULL
       AND assignment_recorded_at >= NEW.submitted_at - INTERVAL '15 minutes'
    THEN
        NEW.captured_latitude := assignment_latitude;
        NEW.captured_longitude := assignment_longitude;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_supersede_store_captain_handoff_on_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_supersede_store_captain_handoff_on_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        UPDATE dsh_store_captain_handoffs
        SET status = 'superseded',
            version = version + 1,
            updated_at = NOW()
        WHERE order_id = NEW.order_id
          AND assignment_id <> NEW.id
          AND status IN ('awaiting_partner', 'partner_confirmed');
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_sync_special_request_dispatch_stage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_sync_special_request_dispatch_stage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF NEW.request_type = 'SHEIN_ASSISTED_PURCHASE' THEN
        NEW.workflow_stage := CASE
            WHEN NEW.status = 'assigned' THEN 'captain_assignment'
            WHEN NEW.status = 'in_progress' THEN 'out_for_delivery'
            WHEN NEW.status = 'completed' THEN 'delivered'
            WHEN NEW.status = 'approved' AND OLD.status IN ('assigned', 'in_progress') THEN 'ready_for_delivery'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'rejected' THEN 'rejected'
            ELSE NEW.workflow_stage
        END;
    ELSIF NEW.request_type = 'AWNAK_ERRAND' THEN
        NEW.workflow_stage := CASE
            WHEN NEW.status = 'assigned' THEN 'assigned'
            WHEN NEW.status = 'in_progress' THEN 'in_progress'
            WHEN NEW.status = 'completed' THEN 'completed'
            WHEN NEW.status = 'approved' AND OLD.status IN ('assigned', 'in_progress') THEN 'dispatch_pending'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'rejected' THEN 'cancelled'
            ELSE NEW.workflow_stage
        END;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_sync_store_coupon_badge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_sync_store_coupon_badge() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_store TEXT;
BEGIN
    affected_store := COALESCE(NEW.store_id,OLD.store_id);
    IF affected_store IS NOT NULL THEN
        UPDATE dsh_stores s
        SET has_coupon_badge=EXISTS (
            SELECT 1
            FROM dsh_partner_offers o
            JOIN dsh_coupons c ON c.id=o.coupon_id
            WHERE o.store_id=s.id
              AND o.offer_type='coupon'
              AND o.status='published'
              AND o.archived_at IS NULL
              AND c.status='active'
              AND c.approved_at IS NOT NULL
              AND c.archived_at IS NULL
              AND (c.starts_at IS NULL OR c.starts_at<=NOW())
              AND (c.ends_at IS NULL OR c.ends_at>NOW())
        ), updated_at=NOW()
        WHERE s.id=affected_store;
    END IF;
    IF TG_OP='UPDATE' AND OLD.store_id IS DISTINCT FROM NEW.store_id THEN
        UPDATE dsh_stores s
        SET has_coupon_badge=EXISTS (
            SELECT 1 FROM dsh_partner_offers o
            JOIN dsh_coupons c ON c.id=o.coupon_id
            WHERE o.store_id=s.id AND o.offer_type='coupon' AND o.status='published'
              AND o.archived_at IS NULL AND c.status='active' AND c.approved_at IS NOT NULL
              AND c.archived_at IS NULL AND (c.starts_at IS NULL OR c.starts_at<=NOW())
              AND (c.ends_at IS NULL OR c.ends_at>NOW())
        ), updated_at=NOW()
        WHERE s.id=OLD.store_id;
    END IF;
    RETURN COALESCE(NEW,OLD);
END;
$$;


--
-- Name: dsh_trusted_operatorcontext_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_trusted_operatorcontext_context() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(BTRIM(current_setting('bthwani.operator_context_id', TRUE)), '');
$$;


--
-- Name: dsh_validate_audit_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_audit_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  serialized TEXT;
BEGIN
  serialized := LOWER(NEW.metadata::text);
  IF serialized ~ '(authorization|bearer|idempotency.?key|delivery.?address|wallet.?balance|provider.?payload)' THEN
    RAISE EXCEPTION ' audit metadata contains a forbidden sensitive key';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: dsh_validate_captain_delivery_proof_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_captain_delivery_proof_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.pod_reference IS NULL OR btrim(NEW.pod_reference) = '' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_media_refs mr
        WHERE mr.media_ref = NEW.pod_reference
          AND mr.owner_actor_role = 'captain'
          AND mr.owner_actor_id = NEW.captain_id
          AND mr.purpose = 'delivery_proof'
    ) THEN
        RAISE EXCEPTION 'invalid captain delivery proof media reference'
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_coupon_funding_ownership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_coupon_funding_ownership() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    partner_is_active BOOLEAN;
    partner_owns_store BOOLEAN;
BEGIN
    IF NEW.funding_source='platform' THEN
        IF NEW.platform_share_bps<>10000 OR NEW.funding_partner_id IS NOT NULL THEN
            RAISE EXCEPTION 'platform-funded coupon requires full platform share and no partner';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.store_id IS NULL OR NEW.funding_partner_id IS NULL THEN
        RAISE EXCEPTION 'partner/shared-funded coupon requires store and funding partner';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM dsh_partners
        WHERE id=NEW.funding_partner_id AND status='active'
    ) INTO partner_is_active;
    IF NOT partner_is_active THEN
        RAISE EXCEPTION 'funding partner must be active';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM dsh_stores
        WHERE id=NEW.store_id AND partner_id=NEW.funding_partner_id
    ) INTO partner_owns_store;
    IF NOT partner_owns_store THEN
        RAISE EXCEPTION 'funding partner must own coupon store';
    END IF;

    IF NEW.funding_source='partner' AND NEW.platform_share_bps<>0 THEN
        RAISE EXCEPTION 'partner-funded coupon requires zero platform share';
    END IF;
    IF NEW.funding_source='shared'
       AND (NEW.platform_share_bps<=0 OR NEW.platform_share_bps>=10000) THEN
        RAISE EXCEPTION 'shared-funded coupon requires platform share between 1 and 9999';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_dispatch_location_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_dispatch_location_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.location_recorded_at IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.last_latitude IS NULL OR NEW.last_longitude IS NULL THEN
        RAISE EXCEPTION 'location timestamp requires coordinates'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.location_recorded_at < NOW() - INTERVAL '10 minutes' THEN
        RAISE EXCEPTION 'location sample is stale'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.location_recorded_at > NOW() + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'location sample is ahead of server time'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.location_recorded_at IS NOT NULL
       AND NEW.location_recorded_at <= OLD.location_recorded_at THEN
        RAISE EXCEPTION 'location sample is out of order'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_partner_delivery_proof_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_partner_delivery_proof_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.proof_reference IS NULL OR btrim(NEW.proof_reference) = '' THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM dsh_media_refs mr
        JOIN dsh_stores st ON st.id = NEW.store_id
        WHERE mr.media_ref = NEW.proof_reference
          AND mr.owner_actor_role = 'partner'
          AND mr.purpose = 'partner_delivery_proof'
          AND mr.store_id = NEW.store_id
          AND mr.partner_id = st.partner_id
    ) THEN
        RAISE EXCEPTION 'invalid partner delivery proof media reference'
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_published_coupon_offer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_published_coupon_offer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    linked_coupon RECORD;
BEGIN
    IF NEW.offer_type='coupon' AND NEW.status='published' AND NEW.archived_at IS NULL THEN
        IF NEW.coupon_id IS NULL THEN
            RAISE EXCEPTION 'published coupon offer requires coupon_id';
        END IF;
        SELECT id,store_id,status,approved_at,starts_at,ends_at,archived_at
        INTO linked_coupon
        FROM dsh_coupons
        WHERE id=NEW.coupon_id;
        IF NOT FOUND OR linked_coupon.status<>'active' OR linked_coupon.approved_at IS NULL
           OR linked_coupon.archived_at IS NOT NULL
           OR (linked_coupon.store_id IS NOT NULL AND linked_coupon.store_id<>NEW.store_id)
           OR (linked_coupon.starts_at IS NOT NULL AND linked_coupon.starts_at>NOW())
           OR (linked_coupon.ends_at IS NOT NULL AND linked_coupon.ends_at<=NOW()) THEN
            RAISE EXCEPTION 'linked coupon is not active or not eligible for offer store';
        END IF;
    END IF;
    IF NEW.offer_type<>'coupon' AND NEW.coupon_id IS NOT NULL THEN
        RAISE EXCEPTION 'coupon_id is only valid for coupon offers';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_service_area_effectivity_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_service_area_effectivity_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR NEW.effective_from IS DISTINCT FROM OLD.effective_from)
       AND NEW.effective_from < statement_timestamp() - INTERVAL '5 seconds' THEN
        RAISE EXCEPTION 'DSH_SERVICE_AREA_RETROACTIVE_EFFECTIVITY_FORBIDDEN'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: dsh_validate_support_message_content(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dsh_validate_support_message_content() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_message_id UUID;
    message_exists BOOLEAN;
    content_valid BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'dsh_support_messages' THEN
        target_message_id := COALESCE(NEW.id, OLD.id);
    ELSE
        target_message_id := COALESCE(NEW.message_id, OLD.message_id);
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM dsh_support_messages WHERE id = target_message_id
    ) INTO message_exists;

    -- Cascading deletion removes the message and its attachments together.
    IF NOT message_exists THEN
        RETURN NULL;
    END IF;

    SELECT (
        NULLIF(BTRIM(m.body), '') IS NOT NULL
        OR EXISTS (
            SELECT 1
            FROM dsh_support_message_attachments a
            WHERE a.message_id = m.id
        )
    )
    INTO content_valid
    FROM dsh_support_messages m
    WHERE m.id = target_message_id;

    IF NOT COALESCE(content_valid, FALSE) THEN
        RAISE EXCEPTION 'support message requires text or at least one attachment'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'dsh_support_message_content_check';
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: enforce_catalog_domain_sovereignty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_catalog_domain_sovereignty() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  node_domain TEXT;
  parent_domain TEXT;
  store_domain_status TEXT;
BEGIN
  -- If inserting/updating a node, check parent domain
  IF TG_TABLE_NAME = 'dsh_catalog_nodes' THEN
    IF NEW.parent_id IS NOT NULL THEN
      SELECT domain_id INTO parent_domain FROM dsh_catalog_nodes WHERE id = NEW.parent_id;
      IF parent_domain != NEW.domain_id THEN
        RAISE EXCEPTION 'Category node domain % does not match parent domain %', NEW.domain_id, parent_domain;
      END IF;
    END IF;
  END IF;

  -- If inserting/updating a product, check category node domain
  IF TG_TABLE_NAME = 'dsh_master_products' THEN
    IF NEW.category_node_id IS NOT NULL THEN
      SELECT domain_id INTO node_domain FROM dsh_catalog_nodes WHERE id = NEW.category_node_id;
      IF node_domain != NEW.domain_id THEN
        RAISE EXCEPTION 'Master product domain % does not match category node domain %', NEW.domain_id, node_domain;
      END IF;
    END IF;
  END IF;

  -- If inserting/updating a store assortment, check if store is approved for the product's domain
  IF TG_TABLE_NAME = 'dsh_store_assortments' THEN
    SELECT domain_id INTO node_domain FROM dsh_master_products WHERE id = NEW.master_product_id;
    SELECT status INTO store_domain_status FROM dsh_store_catalog_domains WHERE store_id = NEW.store_id AND domain_id = node_domain;
    IF store_domain_status IS NULL OR store_domain_status != 'approved' THEN
      RAISE EXCEPTION 'Store % is not approved to sell products in domain %', NEW.store_id, node_domain;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_no_node_cycles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_no_node_cycles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_ancestor TEXT := NEW.parent_id;
BEGIN
  WHILE current_ancestor IS NOT NULL LOOP
    IF current_ancestor = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in category nodes for node %', NEW.id;
    END IF;
    SELECT parent_id INTO current_ancestor FROM dsh_catalog_nodes WHERE id = current_ancestor;
  END LOOP;
  RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_assignments_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_assignments_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_source_context TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '')
        INTO v_source_context
        FROM dsh_orders
        WHERE id = NEW.order_id;
    ELSIF NEW.special_request_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '')
        INTO v_source_context
        FROM dsh_special_requests
        WHERE id = NEW.special_request_id;
    END IF;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'dispatch assignment source context is missing';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'dispatch assignment operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_delivery_exceptions_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_delivery_exceptions_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_source_context TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '') INTO v_source_context
        FROM dsh_orders
        WHERE id = NEW.order_id;
    ELSIF NEW.special_request_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '') INTO v_source_context
        FROM dsh_special_requests
        WHERE id = NEW.special_request_id;
    END IF;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'delivery exception source context is missing';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'delivery exception operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_delivery_sla_alerts_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_delivery_sla_alerts_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_order_id UUID;
    v_source_context TEXT;
BEGIN
    SELECT o.id, NULLIF(BTRIM(o.operator_context_id), '')
    INTO v_order_id, v_source_context
    FROM dsh_partner_delivery_tasks t
    JOIN dsh_orders o ON o.id = t.order_id
    WHERE t.id = NEW.task_id;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'delivery SLA alert source context is missing';
    END IF;
    IF NEW.order_id IS NULL OR NEW.order_id IS DISTINCT FROM v_order_id THEN
        RAISE EXCEPTION 'delivery SLA alert order does not match its task';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'delivery SLA alert operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_operational_incidents_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_operational_incidents_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_order_context IS NULL THEN
        RAISE EXCEPTION 'dsh_operational_incidents: order % not found', NEW.order_id;
    END IF;

    IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
        NEW.operator_context_id := v_order_context;
    ELSIF NEW.operator_context_id <> v_order_context THEN
        RAISE EXCEPTION 'dsh_operational_incidents.operator_context_id (%) does not match order operator_context_id (%)',
            NEW.operator_context_id, v_order_context;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_order_cancellations_operator_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_order_cancellations_operator_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_order_context IS NULL THEN
        RAISE EXCEPTION 'dsh_order_cancellations: order % not found', NEW.order_id;
    END IF;

    IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
        NEW.operator_context_id := v_order_context;
    ELSIF NEW.operator_context_id <> v_order_context THEN
        RAISE EXCEPTION 'dsh_order_cancellations.operator_context_id (%) does not match order operator_context_id (%)',
            NEW.operator_context_id, v_order_context;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_fn_dsh_partner_delivery_tasks_context_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_dsh_partner_delivery_tasks_context_integrity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_store_context TEXT;
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_store_context
    FROM dsh_stores
    WHERE id = NEW.store_id;

    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_store_context IS NOT NULL AND v_order_context IS NOT NULL AND v_store_context <> v_order_context THEN
        RAISE EXCEPTION 'dsh_partner_delivery_tasks: store operator_context_id (%) does not match order operator_context_id (%)',
            v_store_context, v_order_context;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trigger_enforce_product_variant_depth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_enforce_product_variant_depth() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_grandparent_id TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT parent_id INTO v_grandparent_id FROM dsh_master_products WHERE id = NEW.parent_id;
    IF v_grandparent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Product variant nesting exceeded. Master product variants can only be 1 level deep.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trigger_enforce_product_variant_domain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_enforce_product_variant_domain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_parent_domain TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT domain_id INTO v_parent_domain FROM dsh_master_products WHERE id = NEW.parent_id;
    IF v_parent_domain != NEW.domain_id THEN
      RAISE EXCEPTION 'Variant domain_id % does not match parent domain_id %', NEW.domain_id, v_parent_domain;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: dsh_admin_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    target_actor_id text NOT NULL,
    requested_by text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    review_note text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    role_name text NOT NULL,
    expected_role_version integer,
    supersedes_request_id uuid,
    superseded_by text,
    superseded_reason_code text,
    superseded_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_approval_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_admin_approval_requests_action_type_check CHECK ((action_type = ANY (ARRAY['staff_role_assignment'::text, 'staff_role_revocation'::text]))),
    CONSTRAINT dsh_admin_approval_requests_check CHECK ((requested_by <> target_actor_id)),
    CONSTRAINT dsh_admin_approval_requests_expected_role_version_check CHECK (((expected_role_version IS NULL) OR (expected_role_version > 0))),
    CONSTRAINT dsh_admin_approval_requests_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT dsh_admin_approval_requests_role_name_nonempty CHECK ((btrim(role_name) <> ''::text)),
    CONSTRAINT dsh_admin_approval_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'superseded'::text]))),
    CONSTRAINT dsh_admin_approval_requests_supersedes_not_self_check CHECK (((supersedes_request_id IS NULL) OR (supersedes_request_id <> id))),
    CONSTRAINT dsh_admin_approval_requests_supersession_lifecycle_check CHECK ((((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = ANY (ARRAY['approved'::text, 'rejected'::text])) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = 'superseded'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NOT NULL) AND (superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'::text) AND (superseded_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_approval_requests_version_check CHECK ((version > 0))
);


--
-- Name: COLUMN dsh_admin_approval_requests.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_admin_approval_requests.operator_context_id IS 'Trusted DSH request ownership scope; legacy-unscoped is migration quarantine only.';


--
-- Name: dsh_admin_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_id text,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sensitivity text DEFAULT 'internal'::text NOT NULL,
    correlation_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_audit_metadata_object_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT dsh_admin_audit_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_admin_audit_sensitivity_check CHECK ((sensitivity = ANY (ARRAY['internal'::text, 'restricted'::text])))
);


--
-- Name: dsh_admin_canonical_mutation_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_canonical_mutation_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_type text NOT NULL,
    request_id uuid NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_owner text,
    lease_expires_at timestamp with time zone,
    lease_generation bigint DEFAULT 0 NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_canonical_mutation_intents_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT dsh_admin_canonical_mutation_intents_lease_generation_check CHECK ((lease_generation >= 0)),
    CONSTRAINT dsh_admin_canonical_mutation_intents_lease_pair_check CHECK ((((lease_owner IS NULL) AND (lease_expires_at IS NULL)) OR ((lease_owner IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_canonical_mutation_intents_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT dsh_admin_canonical_mutation_intents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'retryable_failure'::text, 'failed_terminal'::text, 'applied'::text]))),
    CONSTRAINT dsh_admin_canonical_mutation_intents_terminal_state_check CHECK ((((status = ANY (ARRAY['pending'::text, 'retryable_failure'::text])) AND (next_attempt_at IS NOT NULL)) OR ((status = ANY (ARRAY['failed_terminal'::text, 'applied'::text])) AND (next_attempt_at IS NULL) AND (lease_owner IS NULL) AND (lease_expires_at IS NULL)))),
    CONSTRAINT dsh_admin_intent_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: COLUMN dsh_admin_canonical_mutation_intents.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_admin_canonical_mutation_intents.operator_context_id IS 'Persisted execution ownership scope; legacy-unscoped intents are not executable.';


--
-- Name: dsh_admin_role_definition_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_role_definition_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    permissions jsonb NOT NULL,
    surfaces jsonb DEFAULT '["control-panel"]'::jsonb NOT NULL,
    requested_by text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    review_note text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    expected_role_version integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    supersedes_request_id uuid,
    superseded_by text,
    superseded_reason_code text,
    superseded_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_role_definition_expected_version_check CHECK ((expected_role_version >= 0)),
    CONSTRAINT dsh_admin_role_definition_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_admin_role_definition_requests_permissions_check CHECK ((jsonb_typeof(permissions) = 'array'::text)),
    CONSTRAINT dsh_admin_role_definition_requests_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT dsh_admin_role_definition_requests_role_name_check CHECK (((length(TRIM(BOTH FROM role_name)) >= 3) AND (length(TRIM(BOTH FROM role_name)) <= 80))),
    CONSTRAINT dsh_admin_role_definition_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'superseded'::text]))),
    CONSTRAINT dsh_admin_role_definition_requests_supersedes_not_self_check CHECK (((supersedes_request_id IS NULL) OR (supersedes_request_id <> id))),
    CONSTRAINT dsh_admin_role_definition_requests_supersession_lifecycle_check CHECK ((((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = ANY (ARRAY['approved'::text, 'rejected'::text])) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = 'superseded'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NOT NULL) AND (superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'::text) AND (superseded_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_role_definition_requests_surfaces_check CHECK (((jsonb_typeof(surfaces) = 'array'::text) AND (surfaces ? 'control-panel'::text))),
    CONSTRAINT dsh_admin_role_definition_requests_version_check CHECK ((version > 0))
);


--
-- Name: dsh_admin_rollback_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_rollback_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_approval_id uuid NOT NULL,
    inverse_action_type text NOT NULL,
    target_actor_id text NOT NULL,
    requested_by text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    review_note text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    role_name text NOT NULL,
    expected_role_version integer,
    supersedes_request_id uuid,
    superseded_by text,
    superseded_reason_code text,
    superseded_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_rollback_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_admin_rollback_requests_check CHECK (((reviewed_by IS NULL) OR (reviewed_by <> requested_by))),
    CONSTRAINT dsh_admin_rollback_requests_check1 CHECK ((requested_by <> target_actor_id)),
    CONSTRAINT dsh_admin_rollback_requests_check2 CHECK (((reviewed_by IS NULL) OR (reviewed_by <> target_actor_id))),
    CONSTRAINT dsh_admin_rollback_requests_expected_role_version_check CHECK (((expected_role_version IS NULL) OR (expected_role_version > 0))),
    CONSTRAINT dsh_admin_rollback_requests_inverse_action_type_check CHECK ((inverse_action_type = ANY (ARRAY['staff_role_assignment'::text, 'staff_role_revocation'::text]))),
    CONSTRAINT dsh_admin_rollback_requests_reason_check CHECK ((char_length(btrim(reason)) >= 5)),
    CONSTRAINT dsh_admin_rollback_requests_role_name_nonempty CHECK ((btrim(role_name) <> ''::text)),
    CONSTRAINT dsh_admin_rollback_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'superseded'::text]))),
    CONSTRAINT dsh_admin_rollback_requests_supersedes_not_self_check CHECK (((supersedes_request_id IS NULL) OR (supersedes_request_id <> id))),
    CONSTRAINT dsh_admin_rollback_requests_supersession_lifecycle_check CHECK ((((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = ANY (ARRAY['approved'::text, 'rejected'::text])) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (superseded_by IS NULL) AND (superseded_reason_code IS NULL) AND (superseded_at IS NULL)) OR ((status = 'superseded'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (superseded_by IS NOT NULL) AND (superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'::text) AND (superseded_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_rollback_requests_version_check CHECK ((version > 0))
);


--
-- Name: dsh_admin_support_session_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_admin_support_session_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_actor_id text NOT NULL,
    requested_by text NOT NULL,
    reason text NOT NULL,
    duration_minutes integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    review_note text,
    identity_session_id text,
    expires_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    issued_at timestamp with time zone,
    revoked_at timestamp with time zone,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_admin_support_session_requests_check CHECK ((target_actor_id <> requested_by)),
    CONSTRAINT dsh_admin_support_session_requests_check1 CHECK ((((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL)) OR ((status = ANY (ARRAY['approved'::text, 'rejected'::text, 'issued'::text, 'revoked'::text])) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_support_session_requests_check2 CHECK ((((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])) AND (identity_session_id IS NULL) AND (expires_at IS NULL)) OR ((status = ANY (ARRAY['issued'::text, 'revoked'::text])) AND (identity_session_id IS NOT NULL) AND (expires_at IS NOT NULL)))),
    CONSTRAINT dsh_admin_support_session_requests_duration_minutes_check CHECK (((duration_minutes >= 1) AND (duration_minutes <= 15))),
    CONSTRAINT dsh_admin_support_session_requests_reason_check CHECK ((length(TRIM(BOTH FROM reason)) >= 5)),
    CONSTRAINT dsh_admin_support_session_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'issued'::text, 'revoked'::text]))),
    CONSTRAINT dsh_admin_support_session_requests_version_check CHECK ((version > 0)),
    CONSTRAINT dsh_support_request_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: dsh_analytics_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_analytics_checkpoints (
    projection_name character varying(100) NOT NULL,
    last_processed_id uuid,
    last_processed_timestamp timestamp with time zone,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_analytics_metrics_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_analytics_metrics_registry (
    metric_id character varying(100) NOT NULL,
    owner_domain character varying(100) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    time_grain character varying(20) NOT NULL,
    aggregation_type character varying(20) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_analytics_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_analytics_projections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_id character varying(100) NOT NULL,
    store_id uuid,
    partner_id uuid,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    metric_value numeric NOT NULL,
    sample_size integer DEFAULT 0 NOT NULL,
    dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
    lineage_shas text[] DEFAULT '{}'::text[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    captain_id text NOT NULL,
    assigned_by text NOT NULL,
    status text DEFAULT 'offered'::text NOT NULL,
    response_deadline_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_latitude double precision,
    last_longitude double precision,
    location_recorded_at timestamp with time zone,
    special_request_id uuid,
    operator_context_id text DEFAULT 'default'::text NOT NULL,
    service_area_code text,
    idempotency_key text,
    priority smallint DEFAULT 0 NOT NULL,
    distance_meters integer,
    offer_reason text,
    response_reason text,
    expired_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_by text,
    supersedes_assignment_id uuid,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_assignment_source CHECK (((order_id IS NOT NULL) <> (special_request_id IS NOT NULL))),
    CONSTRAINT dsh_assignments_distance_meters_check CHECK (((distance_meters IS NULL) OR (distance_meters >= 0))),
    CONSTRAINT dsh_assignments_last_latitude_check CHECK (((last_latitude IS NULL) OR ((last_latitude >= ('-90'::integer)::double precision) AND (last_latitude <= (90)::double precision)))),
    CONSTRAINT dsh_assignments_last_longitude_check CHECK (((last_longitude IS NULL) OR ((last_longitude >= ('-180'::integer)::double precision) AND (last_longitude <= (180)::double precision)))),
    CONSTRAINT dsh_assignments_operator_context_nonempty_check CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_assignments_priority_check CHECK (((priority >= 0) AND (priority <= 100))),
    CONSTRAINT dsh_assignments_status_check CHECK ((status = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT dsh_assignments_version_check CHECK ((version > 0))
);


--
-- Name: dsh_captain_assignment_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_assignment_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    assignment_id uuid NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_captain_assignment_command_receip_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_captain_assignment_command_receip_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_captain_assignment_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_captain_assignment_command_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_captain_assignment_command_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_captain_assignment_command_receipts_operation_check CHECK ((operation = ANY (ARRAY['accept'::text, 'decline'::text])))
);


--
-- Name: dsh_captain_availability_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_availability_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    captain_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_captain_availability_command_rece_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_captain_availability_command_rece_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_captain_availability_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_captain_availability_command_receipts_captain_id_check CHECK ((char_length(btrim(captain_id)) > 0)),
    CONSTRAINT dsh_captain_availability_command_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_captain_availability_command_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200)))
);


--
-- Name: dsh_captain_delivery_status_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_delivery_status_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    assignment_id uuid NOT NULL,
    status text NOT NULL,
    expected_version integer NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_captain_delivery_status_command_r_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_captain_delivery_status_command_r_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_captain_delivery_status_command_rece_expected_version_check CHECK ((expected_version > 0)),
    CONSTRAINT dsh_captain_delivery_status_command_recei_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_captain_delivery_status_command_receip_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_captain_delivery_status_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_captain_delivery_status_command_receipts_status_check CHECK ((status = ANY (ARRAY['driver_arrived_store'::text, 'picked_up'::text, 'arrived_customer'::text])))
);


--
-- Name: dsh_captain_dispatch_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_dispatch_profiles (
    operator_context_id text DEFAULT 'default'::text NOT NULL,
    captain_id text NOT NULL,
    accreditation_status text DEFAULT 'pending'::text NOT NULL,
    availability_status text DEFAULT 'offline'::text NOT NULL,
    max_active_assignments integer DEFAULT 1 NOT NULL,
    priority_score integer DEFAULT 0 NOT NULL,
    updated_by text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_captain_dispatch_profiles_accreditation_status_check CHECK ((accreditation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'expired'::text]))),
    CONSTRAINT dsh_captain_dispatch_profiles_availability_status_check CHECK ((availability_status = ANY (ARRAY['available'::text, 'busy'::text, 'offline'::text, 'suspended'::text]))),
    CONSTRAINT dsh_captain_dispatch_profiles_max_active_assignments_check CHECK (((max_active_assignments >= 1) AND (max_active_assignments <= 20))),
    CONSTRAINT dsh_captain_dispatch_profiles_priority_score_check CHECK (((priority_score >= 0) AND (priority_score <= 1000))),
    CONSTRAINT dsh_captain_dispatch_profiles_version_check CHECK ((version > 0))
);


--
-- Name: dsh_captain_financial_eligibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_financial_eligibility (
    operator_context_id text NOT NULL,
    captain_id text NOT NULL,
    eligible boolean NOT NULL,
    ineligibility_reason text DEFAULT ''::text NOT NULL,
    snapshot_reference text NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    wlt_decision_id text DEFAULT ''::text NOT NULL,
    wlt_reason_code text DEFAULT ''::text NOT NULL,
    wlt_policy_version text DEFAULT ''::text NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_captain_financial_eligibility_captain_id_check CHECK ((btrim(captain_id) <> ''::text)),
    CONSTRAINT dsh_captain_financial_eligibility_check CHECK ((expires_at > checked_at)),
    CONSTRAINT dsh_captain_financial_eligibility_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_captain_financial_eligibility_snapshot_reference_check CHECK ((btrim(snapshot_reference) <> ''::text))
);


--
-- Name: TABLE dsh_captain_financial_eligibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_captain_financial_eligibility IS 'Short-lived WLT dispatch eligibility decision projection. DSH stores decision metadata only; balances, wallet state, thresholds, currency, and financial policy belong exclusively to WLT.';


--
-- Name: COLUMN dsh_captain_financial_eligibility.wlt_decision_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_captain_financial_eligibility.wlt_decision_id IS 'Opaque WLT decision identifier used for dispatch gating readback; not a wallet, balance, or ledger reference.';


--
-- Name: dsh_captain_membership_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_membership_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id text NOT NULL,
    action_label text NOT NULL,
    actor_id text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_captain_membership_history_action_length_chk CHECK ((char_length(action_label) <= 120)),
    CONSTRAINT dsh_captain_membership_history_correlation_length_chk CHECK ((char_length(correlation_id) <= 240)),
    CONSTRAINT dsh_captain_membership_history_idempotency_length_chk CHECK ((char_length(idempotency_key) <= 240))
);


--
-- Name: dsh_captain_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_captain_memberships (
    id text DEFAULT ('cfm_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    captain_actor_id text NOT NULL,
    affiliation text NOT NULL,
    partner_id text DEFAULT ''::text NOT NULL,
    store_id text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    branch_assignment text DEFAULT ''::text NOT NULL,
    delivery_assignment text DEFAULT ''::text NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_until timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team_role text DEFAULT 'staff'::text NOT NULL,
    CONSTRAINT dsh_captain_memberships_affiliation_check CHECK ((affiliation = ANY (ARRAY['BTHWANI'::text, 'PARTNER'::text]))),
    CONSTRAINT dsh_captain_memberships_partner_chk CHECK (((affiliation = 'BTHWANI'::text) OR ((affiliation = 'PARTNER'::text) AND (btrim(partner_id) <> ''::text)))),
    CONSTRAINT dsh_captain_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'ended'::text, 'transfer_requested'::text, 'invited'::text]))),
    CONSTRAINT dsh_captain_memberships_team_role_chk CHECK ((team_role = ANY (ARRAY['owner'::text, 'supervisor'::text, 'staff'::text]))),
    CONSTRAINT dsh_captain_memberships_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    price_reference text DEFAULT ''::text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    master_product_id text DEFAULT ''::text NOT NULL,
    store_assortment_id text,
    currency text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    options_hash text DEFAULT ''::text NOT NULL,
    unit_price_minor bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_dsh_cart_items_currency_code CHECK (((currency = upper(btrim(currency))) AND (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT dsh_cart_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT dsh_cart_items_unit_price_chk CHECK ((unit_price >= (0)::numeric)),
    CONSTRAINT dsh_cart_items_unit_price_minor_chk CHECK ((unit_price_minor >= 0))
);


--
-- Name: dsh_cart_mutation_receipt_quarantine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_cart_mutation_receipt_quarantine (
    id uuid NOT NULL,
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    cart_id uuid,
    item_id uuid,
    result_version integer,
    result_deleted boolean NOT NULL,
    result_json jsonb NOT NULL,
    device_id text,
    session_id text,
    original_created_at timestamp with time zone NOT NULL,
    quarantine_reason text NOT NULL,
    quarantined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_cart_mutation_receipt_quarantine_quarantine_reason_check CHECK ((quarantine_reason = 'invalid_result_version'::text))
);


--
-- Name: TABLE dsh_cart_mutation_receipt_quarantine; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_cart_mutation_receipt_quarantine IS 'Forensic evidence for cart mutation keys whose committed result cannot be replayed safely. Rows reserve client_id/idempotency_key and are never business-result authority.';


--
-- Name: COLUMN dsh_cart_mutation_receipt_quarantine.quarantine_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_cart_mutation_receipt_quarantine.quarantine_reason IS 'Machine-readable reason the historical receipt is not safe to expose as a committed replay result.';


--
-- Name: dsh_cart_mutation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_cart_mutation_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    cart_id uuid,
    item_id uuid,
    result_version integer NOT NULL,
    result_deleted boolean DEFAULT false NOT NULL,
    result_json jsonb NOT NULL,
    device_id text,
    session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_cart_mutation_receipts_operation_check CHECK ((operation = ANY (ARRAY['add_item'::text, 'remove_item'::text, 'clear_cart'::text, 'historical'::text]))),
    CONSTRAINT dsh_cart_mutation_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_cart_mutation_receipts_result_version_check CHECK ((result_version >= 1))
);


--
-- Name: dsh_cart_serviceability_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_cart_serviceability_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    store_id text NOT NULL,
    address_id text,
    address_version integer,
    requested_mode text NOT NULL,
    service_area_code text NOT NULL,
    serviceable boolean NOT NULL,
    result_code text NOT NULL,
    capacity_state text NOT NULL,
    active_orders integer DEFAULT 0 NOT NULL,
    max_concurrent_orders integer,
    capacity_load_ratio double precision,
    sla_prep_minutes integer,
    sla_delivery_minutes integer,
    correlation_id text,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_cart_serviceability_checks_active_orders_check CHECK ((active_orders >= 0)),
    CONSTRAINT dsh_cart_serviceability_checks_address_version_check CHECK (((address_version IS NULL) OR (address_version >= 1))),
    CONSTRAINT dsh_cart_serviceability_checks_capacity_load_ratio_check CHECK (((capacity_load_ratio IS NULL) OR (capacity_load_ratio >= (0)::double precision))),
    CONSTRAINT dsh_cart_serviceability_checks_max_concurrent_orders_check CHECK (((max_concurrent_orders IS NULL) OR (max_concurrent_orders > 0))),
    CONSTRAINT dsh_cart_serviceability_checks_requested_mode_check CHECK ((requested_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_cart_serviceability_checks_sla_delivery_minutes_check CHECK (((sla_delivery_minutes IS NULL) OR (sla_delivery_minutes > 0))),
    CONSTRAINT dsh_cart_serviceability_checks_sla_prep_minutes_check CHECK (((sla_prep_minutes IS NULL) OR (sla_prep_minutes > 0)))
);


--
-- Name: dsh_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    store_id text NOT NULL,
    fulfillment_mode text DEFAULT 'bthwani_delivery'::text NOT NULL,
    state text DEFAULT 'active'::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_carts_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_carts_state_check CHECK ((state = ANY (ARRAY['active'::text, 'checked_out'::text, 'abandoned'::text])))
);


--
-- Name: dsh_catalog_approval_audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_approval_audit_trail (
    id text NOT NULL,
    approval_record_id text NOT NULL,
    from_stage text NOT NULL,
    to_stage text NOT NULL,
    owner text NOT NULL,
    action_label text NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_catalog_approval_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_approval_records (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    source text NOT NULL,
    stage text NOT NULL,
    title text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_actor_id text NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_catalog_approval_records_entity_type_check CHECK ((entity_type = ANY (ARRAY['product'::text, 'product-media'::text, 'category-suggestion'::text, 'store'::text, 'partner-offer'::text, 'video'::text, 'banner'::text, 'promo'::text]))),
    CONSTRAINT dsh_catalog_approval_records_operator_context_id_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_catalog_approval_records_owner_actor_id_nonempty CHECK ((btrim(owner_actor_id) <> ''::text)),
    CONSTRAINT dsh_catalog_approval_records_source_check CHECK ((source = ANY (ARRAY['app-partner'::text, 'app-field'::text, 'control-panel-partners'::text, 'control-panel-marketing'::text, 'control-panel-catalog'::text, 'app-client'::text]))),
    CONSTRAINT dsh_catalog_approval_records_stage_check CHECK ((stage = ANY (ARRAY['partner-submitted'::text, 'field-submitted'::text, 'partner-review'::text, 'partner-approved'::text, 'marketing-review'::text, 'marketing-approved'::text, 'catalog-adopted'::text, 'client-visible'::text, 'rejected'::text, 'needs-fix'::text])))
);


--
-- Name: dsh_catalog_asset_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_asset_links (
    id text NOT NULL,
    asset_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    role text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_catalog_asset_links_entity_type_check CHECK ((entity_type = ANY (ARRAY['domain'::text, 'node'::text, 'master_product'::text, 'product_proposal'::text, 'store_assortment'::text, 'collection'::text, 'campaign'::text, 'store'::text]))),
    CONSTRAINT dsh_catalog_asset_links_role_check CHECK ((role = ANY (ARRAY['icon'::text, 'cover'::text, 'thumbnail'::text, 'gallery'::text, 'canonical_product_image'::text, 'partner_custom_product_image'::text, 'marketing_banner'::text, 'document'::text, 'store_logo'::text, 'store_cover'::text, 'storefront_photo'::text, 'interior_photo'::text, 'signage_photo'::text, 'reel_video'::text]))),
    CONSTRAINT dsh_catalog_asset_links_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


--
-- Name: dsh_catalog_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_assets (
    id text NOT NULL,
    object_key text NOT NULL,
    public_url text,
    original_file_name text DEFAULT ''::text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    width integer,
    height integer,
    checksum_sha256 text,
    alt_ar text DEFAULT ''::text NOT NULL,
    alt_en text DEFAULT ''::text NOT NULL,
    dominant_color text,
    status text DEFAULT 'draft'::text NOT NULL,
    source_surface text NOT NULL,
    uploaded_by text DEFAULT ''::text NOT NULL,
    reviewed_by text,
    review_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    intended_entity_type text,
    intended_entity_id text,
    intended_role text,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_catalog_assets_source_surface_check CHECK ((source_surface = ANY (ARRAY['control-panel-catalog'::text, 'control-panel-platform'::text, 'app-partner'::text, 'app-field'::text, 'system'::text]))),
    CONSTRAINT dsh_catalog_assets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'uploaded'::text, 'scanning'::text, 'quarantined'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


--
-- Name: dsh_catalog_attribute_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_attribute_options (
    id text NOT NULL,
    attribute_id text NOT NULL,
    code text NOT NULL,
    label_ar text NOT NULL,
    label_en text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: dsh_catalog_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_attributes (
    id text NOT NULL,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    data_type text NOT NULL,
    is_filterable boolean DEFAULT false NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_variant_axis boolean DEFAULT false NOT NULL,
    is_global boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_catalog_attributes_data_type_check CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'enum'::text, 'multi_enum'::text, 'measurement'::text, 'money'::text, 'date'::text, 'media'::text])))
);


--
-- Name: dsh_catalog_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_collections (
    id text NOT NULL,
    slug text NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    description_ar text DEFAULT ''::text NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_catalog_collections_type_check CHECK ((type = ANY (ARRAY['campaign'::text, 'seasonal'::text, 'curated'::text, 'offer_bundle'::text, 'smart_collection'::text])))
);


--
-- Name: dsh_catalog_create_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_create_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_catalog_create_idempotency_hash_chk CHECK ((request_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_catalog_create_idempotency_key_chk CHECK (((char_length(idempotency_key) >= 8) AND (char_length(idempotency_key) <= 200))),
    CONSTRAINT dsh_catalog_create_idempotency_resource_chk CHECK (((resource_type <> ''::text) AND (resource_id <> ''::text)))
);


--
-- Name: TABLE dsh_catalog_create_idempotency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_catalog_create_idempotency IS 'Canonical replay identity and resource binding for Central Catalog create commands.';


--
-- Name: dsh_catalog_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_domains (
    id text NOT NULL,
    slug text NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    icon text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_client_visible boolean DEFAULT true NOT NULL,
    requires_product_catalog boolean DEFAULT true NOT NULL,
    is_manual_request boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: dsh_catalog_entity_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_entity_audit (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    actor_id text DEFAULT 'system'::text NOT NULL,
    actor_role text DEFAULT 'system'::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    before_json jsonb,
    after_json jsonb,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_catalog_entity_audit_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'ROLLBACK'::text])))
);


--
-- Name: dsh_catalog_legacy_archive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_legacy_archive (
    id text NOT NULL,
    source_table text NOT NULL,
    source_id text NOT NULL,
    store_id text,
    payload_json jsonb NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    migration_name text NOT NULL
);


--
-- Name: dsh_catalog_node_attribute_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_node_attribute_rules (
    id text NOT NULL,
    node_id text,
    domain_id text,
    attribute_id text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_filterable boolean DEFAULT false NOT NULL,
    is_variant_axis boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_catalog_node_attribute_rules_check CHECK (((node_id IS NOT NULL) OR (domain_id IS NOT NULL)))
);


--
-- Name: dsh_catalog_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_nodes (
    id text NOT NULL,
    domain_id text NOT NULL,
    parent_id text,
    level text NOT NULL,
    slug text NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    icon text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_client_visible boolean DEFAULT true NOT NULL,
    requires_barcode boolean DEFAULT false NOT NULL,
    allows_product_proposal boolean DEFAULT true NOT NULL,
    allows_store_product_custom_image boolean DEFAULT false NOT NULL,
    requires_catalog_review boolean DEFAULT true NOT NULL,
    requires_product_catalog boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    lifecycle_status text DEFAULT 'active'::text NOT NULL,
    merged_into_id text,
    CONSTRAINT dsh_catalog_nodes_level_check CHECK ((level = ANY (ARRAY['BUSINESS_SUBDOMAIN'::text, 'PRODUCT_MAIN_CLASS'::text, 'PRODUCT_SUB_CLASS'::text]))),
    CONSTRAINT dsh_catalog_nodes_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['active'::text, 'deprecated'::text, 'merged'::text])))
);


--
-- Name: dsh_catalog_platform_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_catalog_platform_policies (
    id text NOT NULL,
    domain_id text,
    node_id text,
    policy_scope text NOT NULL,
    allows_store_product_custom_image boolean DEFAULT false NOT NULL,
    allows_product_proposal boolean DEFAULT true NOT NULL,
    requires_barcode boolean DEFAULT false NOT NULL,
    requires_catalog_review boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requires_marketing_review boolean DEFAULT true NOT NULL,
    requires_product_image boolean DEFAULT false NOT NULL,
    requires_category_image boolean DEFAULT false NOT NULL,
    requires_description boolean DEFAULT false NOT NULL,
    requires_brand boolean DEFAULT false NOT NULL,
    requires_unit boolean DEFAULT false NOT NULL,
    product_data_quality_minimum_score numeric(5,2) DEFAULT 0 NOT NULL,
    max_gallery_images integer DEFAULT 6 NOT NULL,
    manual_request_mode boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_catalog_platform_policies_check CHECK ((((policy_scope = 'domain'::text) AND (domain_id IS NOT NULL) AND (node_id IS NULL)) OR ((policy_scope = 'node'::text) AND (node_id IS NOT NULL)) OR ((policy_scope = 'default'::text) AND (domain_id IS NULL) AND (node_id IS NULL)))),
    CONSTRAINT dsh_catalog_platform_policies_policy_scope_check CHECK ((policy_scope = ANY (ARRAY['domain'::text, 'node'::text, 'default'::text])))
);


--
-- Name: dsh_checkout_cart_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_cart_snapshots (
    checkout_intent_id uuid NOT NULL,
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    cart_id uuid NOT NULL,
    store_id text NOT NULL,
    cart_version integer NOT NULL,
    pricing_snapshot_hash text NOT NULL,
    subtotal_minor_units bigint NOT NULL,
    currency text NOT NULL,
    item_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_cart_snapshots_cart_version_check CHECK ((cart_version > 0)),
    CONSTRAINT dsh_checkout_cart_snapshots_currency_check CHECK (((currency = upper(btrim(currency))) AND (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT dsh_checkout_cart_snapshots_item_count_check CHECK ((item_count > 0)),
    CONSTRAINT dsh_checkout_cart_snapshots_pricing_snapshot_hash_check CHECK ((pricing_snapshot_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_checkout_cart_snapshots_subtotal_minor_units_check CHECK ((subtotal_minor_units > 0))
);


--
-- Name: TABLE dsh_checkout_cart_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_checkout_cart_snapshots IS 'Canonical DSH checkout commercial snapshot header captured atomically before the WLT handoff.';


--
-- Name: dsh_checkout_create_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_create_idempotency (
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_create_idempotency_client_chk CHECK ((btrim(client_id) <> ''::text)),
    CONSTRAINT dsh_checkout_create_idempotency_fingerprint_chk CHECK ((char_length(request_fingerprint) = 64)),
    CONSTRAINT dsh_checkout_create_idempotency_key_chk CHECK (((char_length(idempotency_key) >= 16) AND (char_length(idempotency_key) <= 200))),
    CONSTRAINT dsh_checkout_create_idempotency_operatorcontext_chk CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: dsh_checkout_financial_closure_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_financial_closure_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    payment_session_id text NOT NULL,
    order_id uuid,
    client_id text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    result_action text,
    result_reference text,
    completed_at timestamp with time zone,
    correlation_id text,
    lease_token uuid,
    lease_expires_at timestamp with time zone,
    readback_attempt_count integer DEFAULT 0 NOT NULL,
    last_readback_at timestamp with time zone,
    failure_disposition text DEFAULT 'none'::text NOT NULL,
    diagnostic_code text,
    failure_classification text DEFAULT 'UNKNOWN_REQUIRES_READBACK'::text NOT NULL,
    CONSTRAINT dsh_checkout_financial_closure_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_checkout_financial_closure_outbox_event_type_check CHECK ((event_type = ANY (ARRAY['expire_session'::text, 'cancel_for_order'::text, 'release_cod_reservation'::text]))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_failed_disposition_check CHECK (((status <> 'failed'::text) OR (failure_disposition <> 'none'::text))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_failure_classification_ch CHECK ((failure_classification = ANY (ARRAY['PROVEN_ABSENT'::text, 'PROVEN_REJECTED'::text, 'PROVEN_APPLIED'::text, 'UNKNOWN_REQUIRES_READBACK'::text, 'INVALID_UNRECOVERABLE'::text]))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_failure_disposition_check CHECK ((failure_disposition = ANY (ARRAY['none'::text, 'retry_scheduled'::text, 'reconciliation_required'::text, 'manual_retry_required'::text, 'invalid_operator_context'::text]))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_processing_lease_check CHECK (((status <> 'processing'::text) OR ((lease_token IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_readback_attempt_count_ch CHECK ((readback_attempt_count >= 0)),
    CONSTRAINT dsh_checkout_financial_closure_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'unknown'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT dsh_checkout_financial_closure_outbox_unknown_readback_check CHECK (((failure_classification <> 'UNKNOWN_REQUIRES_READBACK'::text) OR (status = ANY (ARRAY['unknown'::text, 'failed'::text, 'pending'::text, 'processing'::text, 'sent'::text]))))
);


--
-- Name: dsh_checkout_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    cart_id uuid NOT NULL,
    store_id text NOT NULL,
    fulfillment_mode text DEFAULT 'bthwani_delivery'::text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    wlt_payment_session_id text DEFAULT ''::text NOT NULL,
    delivery_address text DEFAULT ''::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_address_id text,
    subtotal_minor_units bigint DEFAULT 0 NOT NULL,
    discount_minor_units bigint DEFAULT 0 NOT NULL,
    total_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    pricing_snapshot_hash text DEFAULT ''::text NOT NULL,
    coupon_id uuid,
    coupon_redemption_id uuid,
    coupon_code_last4 text DEFAULT ''::text NOT NULL,
    delivery_fee_minor_units bigint DEFAULT 0 NOT NULL,
    operator_context_id text,
    expires_at timestamp with time zone,
    preview_hash text DEFAULT ''::text NOT NULL,
    validation_issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_wlt_status text,
    last_wlt_event_at timestamp with time zone,
    reconciliation_attempt_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT dsh_checkout_intents_delivery_fee_minor_units_check CHECK ((delivery_fee_minor_units >= 0)),
    CONSTRAINT dsh_checkout_intents_discount_minor_units_check CHECK ((discount_minor_units >= 0)),
    CONSTRAINT dsh_checkout_intents_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_checkout_intents_operator_context_id_chk CHECK (((operator_context_id IS NULL) OR (btrim(operator_context_id) <> ''::text))),
    CONSTRAINT dsh_checkout_intents_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'wallet'::text, 'mixed'::text]))),
    CONSTRAINT dsh_checkout_intents_pricing_totals_chk CHECK ((total_minor_units = GREATEST(((subtotal_minor_units + delivery_fee_minor_units) - discount_minor_units), (0)::bigint))),
    CONSTRAINT dsh_checkout_intents_reconciliation_attempt_count_chk CHECK ((reconciliation_attempt_count >= 0)),
    CONSTRAINT dsh_checkout_intents_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'validating'::text, 'ready'::text, 'blocked'::text, 'confirming'::text, 'confirmed'::text, 'cancelled'::text, 'expired'::text]))),
    CONSTRAINT dsh_checkout_intents_subtotal_minor_units_check CHECK ((subtotal_minor_units >= 0)),
    CONSTRAINT dsh_checkout_intents_total_minor_units_check CHECK ((total_minor_units >= 0))
);


--
-- Name: COLUMN dsh_checkout_intents.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_checkout_intents.payment_method IS 'Checkout tender selection owned by the WLT contract: cod, wallet, or mixed. Provider and official-wallet rails are not checkout methods.';


--
-- Name: COLUMN dsh_checkout_intents.pricing_snapshot_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_checkout_intents.pricing_snapshot_hash IS 'Hash of cart price snapshot plus applied commercial effects; sent to WLT with total_minor_units.';


--
-- Name: dsh_checkout_item_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_item_snapshots (
    checkout_intent_id uuid NOT NULL,
    line_number integer NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price_minor bigint NOT NULL,
    currency text NOT NULL,
    line_total_minor_units bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_item_snapshots_check CHECK ((line_total_minor_units = (unit_price_minor * quantity))),
    CONSTRAINT dsh_checkout_item_snapshots_currency_check CHECK (((currency = upper(btrim(currency))) AND (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT dsh_checkout_item_snapshots_line_number_check CHECK ((line_number > 0)),
    CONSTRAINT dsh_checkout_item_snapshots_line_total_minor_units_check CHECK ((line_total_minor_units > 0)),
    CONSTRAINT dsh_checkout_item_snapshots_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT dsh_checkout_item_snapshots_unit_price_minor_check CHECK ((unit_price_minor > 0))
);


--
-- Name: TABLE dsh_checkout_item_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_checkout_item_snapshots IS 'Canonical immutable checkout item lines consumed by order creation; live cart state is never an order-line source.';


--
-- Name: dsh_checkout_payment_saga_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_payment_saga_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    saga_id uuid NOT NULL,
    status text DEFAULT 'blocked'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_payment_saga_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_checkout_payment_saga_outbox_status_check CHECK ((status = ANY (ARRAY['blocked'::text, 'pending'::text, 'in_flight'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: TABLE dsh_checkout_payment_saga_outbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_checkout_payment_saga_outbox IS 'Transactional outbox for Checkout payment-session create/attach dispatch and restart recovery.';


--
-- Name: dsh_checkout_payment_sagas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_payment_sagas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    client_id text NOT NULL,
    source_version integer NOT NULL,
    command_id text NOT NULL,
    payload jsonb NOT NULL,
    payload_hash text NOT NULL,
    state text DEFAULT 'ready'::text NOT NULL,
    payment_session_id text,
    attempt_count integer DEFAULT 0 NOT NULL,
    readback_attempt_count integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_expires_at timestamp with time zone,
    last_error text,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_payment_saga_lease_check CHECK (((state <> ALL (ARRAY['dispatched'::text, 'remote_outcome_unknown'::text, 'remote_confirmed'::text, 'local_projection_pending'::text])) OR ((lease_token IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT dsh_checkout_payment_sagas_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_checkout_payment_sagas_payload_hash_check CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_checkout_payment_sagas_readback_attempt_count_check CHECK ((readback_attempt_count >= 0)),
    CONSTRAINT dsh_checkout_payment_sagas_source_version_check CHECK ((source_version > 0)),
    CONSTRAINT dsh_checkout_payment_sagas_state_check CHECK ((state = ANY (ARRAY['ready'::text, 'dispatched'::text, 'remote_outcome_unknown'::text, 'remote_confirmed'::text, 'local_projection_pending'::text, 'completed'::text, 'retry_scheduled'::text, 'reconciliation_required'::text, 'compensation_pending'::text, 'compensated'::text, 'terminal_failure'::text])))
);


--
-- Name: TABLE dsh_checkout_payment_sagas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_checkout_payment_sagas IS 'Canonical DSH command identity and state machine for Checkout payment-session create/attach convergence.';


--
-- Name: dsh_checkout_wlt_event_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_checkout_wlt_event_receipts (
    event_key text NOT NULL,
    operator_context_id text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    payment_session_id text NOT NULL,
    wlt_status text NOT NULL,
    payload_hash text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    delivery_attempt_count integer DEFAULT 1 NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    last_received_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_at timestamp with time zone,
    CONSTRAINT dsh_checkout_wlt_event_receipts_delivery_attempt_count_check CHECK ((delivery_attempt_count > 0)),
    CONSTRAINT dsh_checkout_wlt_event_receipts_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_checkout_wlt_event_receipts_payload_hash_check CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_checkout_wlt_event_receipts_payment_session_id_check CHECK ((btrim(payment_session_id) <> ''::text))
);


--
-- Name: dsh_client_address_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_address_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id text NOT NULL,
    client_id text NOT NULL,
    action text NOT NULL,
    version integer NOT NULL,
    correlation_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_address_events_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'defaulted'::text, 'deleted'::text, 'archived'::text, 'verified'::text, 'drafted'::text]))),
    CONSTRAINT dsh_client_address_events_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_client_address_mutation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_address_mutation_receipts (
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_fingerprint text NOT NULL,
    address_id text NOT NULL,
    result_version integer,
    result_deleted boolean DEFAULT false NOT NULL,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    CONSTRAINT dsh_client_address_mutation_receipts_delete_shape CHECK ((((operation = 'delete'::text) AND (result_deleted = true)) OR ((operation <> 'delete'::text) AND (result_deleted = false) AND (result_version IS NOT NULL)))),
    CONSTRAINT dsh_client_address_mutation_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_client_address_mutation_receipts_operation_check CHECK ((operation = ANY (ARRAY['update'::text, 'delete'::text, 'set_default'::text]))),
    CONSTRAINT dsh_client_address_mutation_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_client_address_mutation_receipts_result_version_check CHECK (((result_version IS NULL) OR (result_version >= 1)))
);


--
-- Name: TABLE dsh_client_address_mutation_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_client_address_mutation_receipts IS 'PII-free same-transaction idempotency receipts for  address mutations.';


--
-- Name: COLUMN dsh_client_address_mutation_receipts.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_client_address_mutation_receipts.expires_at IS 'Retry receipt expiry; defaults to 30 days after creation.';


--
-- Name: dsh_client_address_privacy_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_address_privacy_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    address_id text NOT NULL,
    client_subject_hash text NOT NULL,
    action text NOT NULL,
    actor_id text NOT NULL,
    correlation_id text,
    policy_version integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_address_privacy_events_action_check CHECK ((action = ANY (ARRAY['retention_scheduled'::text, 'anonymized'::text, 'policy_updated'::text]))),
    CONSTRAINT dsh_client_address_privacy_events_policy_version_check CHECK ((policy_version >= 1))
);


--
-- Name: dsh_client_address_privacy_audit_projection; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.dsh_client_address_privacy_audit_projection AS
 SELECT id AS event_id,
    address_id,
    client_subject_hash,
    action,
    actor_id,
    correlation_id,
    policy_version,
    metadata,
    created_at
   FROM public.dsh_client_address_privacy_events;


--
-- Name: VIEW dsh_client_address_privacy_audit_projection; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.dsh_client_address_privacy_audit_projection IS ' PII-safe audit projection. It intentionally excludes client_id, recipient_name, phone_e164, address_line, delivery instructions, and coordinates.';


--
-- Name: dsh_client_address_privacy_mutation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_address_privacy_mutation_results (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_client_address_privacy_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_address_privacy_policy (
    id smallint NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    retention_days integer DEFAULT 30 NOT NULL,
    batch_limit integer DEFAULT 500 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text DEFAULT 'system'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_address_privacy_policy_batch_limit_check CHECK (((batch_limit >= 1) AND (batch_limit <= 10000))),
    CONSTRAINT dsh_client_address_privacy_policy_id_check CHECK ((id = 1)),
    CONSTRAINT dsh_client_address_privacy_policy_retention_days_check CHECK (((retention_days >= 0) AND (retention_days <= 3650))),
    CONSTRAINT dsh_client_address_privacy_policy_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_client_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_addresses (
    id text DEFAULT ('addr_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    client_id text NOT NULL,
    label text NOT NULL,
    recipient_name text NOT NULL,
    phone_e164 text NOT NULL,
    address_line text NOT NULL,
    service_area_code text NOT NULL,
    building text,
    floor text,
    unit text,
    delivery_instructions text,
    latitude double precision,
    longitude double precision,
    is_default boolean DEFAULT false NOT NULL,
    create_idempotency_key text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    pii_purge_after timestamp with time zone,
    pii_anonymized_at timestamp with time zone,
    address_fingerprint text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    CONSTRAINT dsh_client_addresses_address_line_check CHECK (((char_length(btrim(address_line)) >= 5) AND (char_length(btrim(address_line)) <= 500))),
    CONSTRAINT dsh_client_addresses_building_length CHECK (((building IS NULL) OR (char_length(building) <= 120))),
    CONSTRAINT dsh_client_addresses_coordinates_pair CHECK ((((latitude IS NULL) AND (longitude IS NULL)) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL)))),
    CONSTRAINT dsh_client_addresses_floor_length CHECK (((floor IS NULL) OR (char_length(floor) <= 40))),
    CONSTRAINT dsh_client_addresses_instructions_length CHECK (((delivery_instructions IS NULL) OR (char_length(delivery_instructions) <= 500))),
    CONSTRAINT dsh_client_addresses_label_check CHECK (((char_length(btrim(label)) >= 1) AND (char_length(btrim(label)) <= 80))),
    CONSTRAINT dsh_client_addresses_latitude_range CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))),
    CONSTRAINT dsh_client_addresses_longitude_range CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))),
    CONSTRAINT dsh_client_addresses_phone_e164_check CHECK ((phone_e164 ~ '^\+[1-9][0-9]{7,14}$'::text)),
    CONSTRAINT dsh_client_addresses_recipient_name_check CHECK (((char_length(btrim(recipient_name)) >= 2) AND (char_length(btrim(recipient_name)) <= 160))),
    CONSTRAINT dsh_client_addresses_service_area_code_check CHECK (((char_length(btrim(service_area_code)) >= 1) AND (char_length(btrim(service_area_code)) <= 80))),
    CONSTRAINT dsh_client_addresses_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'VERIFIED'::text, 'ACTIVE'::text, 'ARCHIVED'::text, 'DELETED'::text]))),
    CONSTRAINT dsh_client_addresses_unit_length CHECK (((unit IS NULL) OR (char_length(unit) <= 40))),
    CONSTRAINT dsh_client_addresses_version_check CHECK ((version >= 1))
);


--
-- Name: COLUMN dsh_client_addresses.address_fingerprint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_client_addresses.address_fingerprint IS 'Server-owned normalized signature for preventing duplicate active delivery addresses per client.';


--
-- Name: dsh_client_profile_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_profile_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    action text NOT NULL,
    version integer NOT NULL,
    correlation_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_profile_events_action_check CHECK ((action = ANY (ARRAY['created'::text, 'preferences_updated'::text, 'consents_updated'::text]))),
    CONSTRAINT dsh_client_profile_events_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_client_profile_mutation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_profile_mutation_receipts (
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    result_version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_profile_mutation_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_client_profile_mutation_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_client_profile_mutation_receipts_operation_check CHECK ((operation = ANY (ARRAY['preferences'::text, 'consents'::text]))),
    CONSTRAINT dsh_client_profile_mutation_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_client_profile_mutation_receipts_result_version_check CHECK ((result_version >= 1))
);


--
-- Name: dsh_client_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_client_profiles (
    client_id text NOT NULL,
    locale text DEFAULT 'ar'::text NOT NULL,
    currency_preference text DEFAULT 'YER'::text NOT NULL,
    marketing_consent_email boolean DEFAULT false NOT NULL,
    marketing_consent_sms boolean DEFAULT false NOT NULL,
    marketing_consent_push boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_client_profiles_currency_check CHECK ((currency_preference = 'YER'::text)),
    CONSTRAINT dsh_client_profiles_locale_check CHECK ((locale = ANY (ARRAY['ar'::text, 'en'::text]))),
    CONSTRAINT dsh_client_profiles_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    client_actor_id text NOT NULL,
    cart_id uuid NOT NULL,
    checkout_intent_id uuid NOT NULL,
    order_id uuid,
    status text DEFAULT 'reserved'::text NOT NULL,
    subtotal_minor_units bigint NOT NULL,
    discount_minor_units bigint NOT NULL,
    total_minor_units bigint NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    idempotency_key text NOT NULL,
    reserved_until timestamp with time zone NOT NULL,
    committed_at timestamp with time zone,
    released_at timestamp with time zone,
    reversed_at timestamp with time zone,
    release_reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_fee_minor_units bigint DEFAULT 0 NOT NULL,
    funding_operator_context_id text,
    platform_funded_minor_units bigint DEFAULT 0 NOT NULL,
    partner_funded_minor_units bigint DEFAULT 0 NOT NULL,
    funding_partner_id text,
    funding_status text DEFAULT 'not_required'::text NOT NULL,
    wlt_funding_reservation_id text,
    funding_failure_code text DEFAULT ''::text NOT NULL,
    funding_updated_at timestamp with time zone,
    CONSTRAINT dsh_coupon_redemptions_delivery_fee_minor_units_check CHECK ((delivery_fee_minor_units >= 0)),
    CONSTRAINT dsh_coupon_redemptions_discount_minor_units_check CHECK ((discount_minor_units > 0)),
    CONSTRAINT dsh_coupon_redemptions_funding_split_chk CHECK (((funding_status = 'not_required'::text) OR ((platform_funded_minor_units + partner_funded_minor_units) = discount_minor_units))),
    CONSTRAINT dsh_coupon_redemptions_funding_status_check CHECK ((funding_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'reserved'::text, 'committed'::text, 'released'::text, 'reversed'::text, 'failed'::text]))),
    CONSTRAINT dsh_coupon_redemptions_partner_funded_minor_units_check CHECK ((partner_funded_minor_units >= 0)),
    CONSTRAINT dsh_coupon_redemptions_partner_funding_chk CHECK ((((partner_funded_minor_units = 0) AND (funding_partner_id IS NULL)) OR ((partner_funded_minor_units > 0) AND (funding_partner_id IS NOT NULL)))),
    CONSTRAINT dsh_coupon_redemptions_platform_funded_minor_units_check CHECK ((platform_funded_minor_units >= 0)),
    CONSTRAINT dsh_coupon_redemptions_pricing_totals_chk CHECK ((total_minor_units = GREATEST(((subtotal_minor_units + delivery_fee_minor_units) - discount_minor_units), (0)::bigint))),
    CONSTRAINT dsh_coupon_redemptions_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'committed'::text, 'released'::text, 'reversed'::text]))),
    CONSTRAINT dsh_coupon_redemptions_subtotal_minor_units_check CHECK ((subtotal_minor_units > 0)),
    CONSTRAINT dsh_coupon_redemptions_total_minor_units_check CHECK ((total_minor_units > 0)),
    CONSTRAINT dsh_coupon_redemptions_wlt_reference_chk CHECK (((funding_status <> ALL (ARRAY['reserved'::text, 'committed'::text, 'released'::text, 'reversed'::text])) OR ((funding_operator_context_id IS NOT NULL) AND (btrim(funding_operator_context_id) <> ''::text) AND (wlt_funding_reservation_id IS NOT NULL) AND (btrim(wlt_funding_reservation_id) <> ''::text))))
);


--
-- Name: TABLE dsh_coupon_redemptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_coupon_redemptions IS 'Authoritative idempotent coupon lifecycle: reserve before WLT, commit on order, release on failure/cancel, reverse on refund.';


--
-- Name: dsh_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    code_hash text NOT NULL,
    code_last4 text NOT NULL,
    store_id text,
    discount_type text NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    fixed_discount_minor_units bigint DEFAULT 0 NOT NULL,
    max_discount_minor_units bigint DEFAULT 0 NOT NULL,
    min_subtotal_minor_units bigint DEFAULT 0 NOT NULL,
    global_usage_limit integer DEFAULT 0 NOT NULL,
    per_client_usage_limit integer DEFAULT 1 NOT NULL,
    eligible_fulfillment_modes text[] DEFAULT ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text] NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    funding_source text DEFAULT 'platform'::text NOT NULL,
    platform_share_bps integer DEFAULT 10000 NOT NULL,
    funding_partner_id text,
    CONSTRAINT dsh_coupons_check CHECK ((((discount_type = 'percent'::text) AND (discount_percent > (0)::numeric) AND (fixed_discount_minor_units = 0)) OR ((discount_type = 'fixed'::text) AND (fixed_discount_minor_units > 0) AND (discount_percent = (0)::numeric)))),
    CONSTRAINT dsh_coupons_check1 CHECK (((ends_at IS NULL) OR (starts_at IS NULL) OR (ends_at > starts_at))),
    CONSTRAINT dsh_coupons_code_last4_check CHECK ((char_length(code_last4) = 4)),
    CONSTRAINT dsh_coupons_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT dsh_coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text]))),
    CONSTRAINT dsh_coupons_eligible_fulfillment_modes_check CHECK ((cardinality(eligible_fulfillment_modes) > 0)),
    CONSTRAINT dsh_coupons_eligible_fulfillment_modes_check1 CHECK ((eligible_fulfillment_modes <@ ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text])),
    CONSTRAINT dsh_coupons_fixed_discount_minor_units_check CHECK ((fixed_discount_minor_units >= 0)),
    CONSTRAINT dsh_coupons_funding_policy_chk CHECK ((((funding_source = 'platform'::text) AND (platform_share_bps = 10000) AND (funding_partner_id IS NULL)) OR ((funding_source = 'partner'::text) AND (platform_share_bps = 0) AND (funding_partner_id IS NOT NULL)) OR ((funding_source = 'shared'::text) AND (platform_share_bps > 0) AND (platform_share_bps < 10000) AND (funding_partner_id IS NOT NULL)))),
    CONSTRAINT dsh_coupons_funding_source_check CHECK ((funding_source = ANY (ARRAY['platform'::text, 'partner'::text, 'shared'::text]))),
    CONSTRAINT dsh_coupons_global_usage_limit_check CHECK ((global_usage_limit >= 0)),
    CONSTRAINT dsh_coupons_max_discount_minor_units_check CHECK ((max_discount_minor_units >= 0)),
    CONSTRAINT dsh_coupons_min_subtotal_minor_units_check CHECK ((min_subtotal_minor_units >= 0)),
    CONSTRAINT dsh_coupons_per_client_usage_limit_check CHECK ((per_client_usage_limit > 0)),
    CONSTRAINT dsh_coupons_platform_share_bps_check CHECK (((platform_share_bps >= 0) AND (platform_share_bps <= 10000))),
    CONSTRAINT dsh_coupons_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_coupons_version_check CHECK ((version > 0))
);


--
-- Name: dsh_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    order_id uuid,
    captain_id text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    pod_method text,
    pod_reference text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    special_request_id uuid,
    delivery_proof_id uuid,
    pod_review_status text,
    pod_verified_at timestamp with time zone,
    CONSTRAINT chk_delivery_source CHECK (((order_id IS NOT NULL) <> (special_request_id IS NOT NULL))),
    CONSTRAINT dsh_deliveries_pod_review_status_check CHECK (((pod_review_status IS NULL) OR (pod_review_status = ANY (ARRAY['pending_review'::text, 'accepted'::text, 'rejected'::text])))),
    CONSTRAINT dsh_deliveries_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'driver_assigned'::text, 'driver_arrived_store'::text, 'picked_up'::text, 'arrived_customer'::text, 'returning_to_store'::text, 'return_arrived_store'::text, 'returned_to_store'::text, 'delivered'::text, 'cancelled'::text])))
);


--
-- Name: dsh_delivery_exception_operation_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_exception_operation_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    exception_id uuid NOT NULL,
    operation text NOT NULL,
    expected_version integer NOT NULL,
    action text DEFAULT ''::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    replacement_captain_id text DEFAULT ''::text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    resulting_version integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT dsh_delivery_exception_operation_comm_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_delivery_exception_operation_comm_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_delivery_exception_operation_comman_resulting_version_check CHECK (((resulting_version IS NULL) OR (resulting_version > 0))),
    CONSTRAINT dsh_delivery_exception_operation_command__idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_delivery_exception_operation_command_expected_version_check CHECK ((expected_version > 0)),
    CONSTRAINT dsh_delivery_exception_operation_command_r_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_delivery_exception_operation_command_receip_operation_check CHECK ((operation = ANY (ARRAY['acknowledge'::text, 'resolve'::text]))),
    CONSTRAINT dsh_delivery_exception_operation_command_receipt_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_delivery_exception_operation_command_receipts_check CHECK (((operation <> 'acknowledge'::text) OR (action = ''::text))),
    CONSTRAINT dsh_delivery_exception_operation_command_receipts_check1 CHECK (((operation <> 'resolve'::text) OR ((action <> ''::text) AND ((char_length(btrim(note)) >= 5) AND (char_length(btrim(note)) <= 1000))))),
    CONSTRAINT dsh_delivery_exception_operation_command_receipts_check2 CHECK (((status <> 'completed'::text) OR (resulting_version IS NOT NULL))),
    CONSTRAINT dsh_delivery_exception_operation_command_receipts_check3 CHECK (((status <> 'started'::text) OR (completed_at IS NULL))),
    CONSTRAINT dsh_delivery_exception_operation_command_receipts_status_check CHECK ((status = ANY (ARRAY['started'::text, 'completed'::text])))
);


--
-- Name: dsh_delivery_exception_reporters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_exception_reporters (
    exception_id uuid NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_delivery_exception_reporters_actor_id_check CHECK ((NULLIF(btrim(actor_id), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_delivery_exception_reporters_actor_role_check CHECK ((actor_role = ANY (ARRAY['captain'::text, 'partner'::text])))
);


--
-- Name: dsh_delivery_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    assignment_id uuid NOT NULL,
    order_id uuid,
    captain_id text NOT NULL,
    reason_code text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    delivery_status_at_report text NOT NULL,
    severity text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    correlation_id text NOT NULL,
    reported_latitude double precision,
    reported_longitude double precision,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_at timestamp with time zone,
    acknowledged_by_actor_id text,
    resolved_at timestamp with time zone,
    resolved_by_actor_id text,
    resolution_action text,
    resolution_note text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    replacement_assignment_id uuid,
    replacement_captain_id text,
    return_started_at timestamp with time zone,
    returned_at timestamp with time zone,
    return_arrived_at timestamp with time zone,
    return_accepted_by_actor_id text,
    special_request_id uuid,
    proof_media_ref text,
    policy_next_action text DEFAULT 'review'::text NOT NULL,
    idempotency_key text NOT NULL,
    CONSTRAINT dsh_delivery_exceptions_delivery_status_at_report_check CHECK ((delivery_status_at_report = ANY (ARRAY['driver_assigned'::text, 'driver_arrived_store'::text, 'picked_up'::text, 'arrived_customer'::text]))),
    CONSTRAINT dsh_delivery_exceptions_idempotency_key_shape CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_delivery_exceptions_location_pair_check CHECK ((((reported_latitude IS NULL) = (reported_longitude IS NULL)) AND ((reported_latitude IS NULL) OR (((reported_latitude >= ('-90'::integer)::double precision) AND (reported_latitude <= (90)::double precision)) AND ((reported_longitude >= ('-180'::integer)::double precision) AND (reported_longitude <= (180)::double precision)))))),
    CONSTRAINT dsh_delivery_exceptions_operator_context_nonempty_check CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_delivery_exceptions_policy_next_action_check CHECK ((policy_next_action = ANY (ARRAY['retry'::text, 'wait'::text, 'return'::text, 'rescue'::text, 'review'::text]))),
    CONSTRAINT dsh_delivery_exceptions_proof_requirement_check CHECK (((reason_code <> ALL (ARRAY['damaged_order'::text, 'vehicle_breakdown'::text, 'accident'::text, 'unsafe_location'::text])) OR ((proof_media_ref IS NOT NULL) AND (proof_media_ref <> ''::text)))),
    CONSTRAINT dsh_delivery_exceptions_reason_code_check CHECK ((reason_code = ANY (ARRAY['customer_unreachable'::text, 'recipient_refused'::text, 'wrong_address'::text, 'unsafe_location'::text, 'vehicle_breakdown'::text, 'accident'::text, 'damaged_order'::text, 'cash_collection_issue'::text, 'weather_or_road_block'::text, 'proof_unavailable'::text, 'handoff_shortage'::text, 'handoff_mismatch'::text, 'other'::text]))),
    CONSTRAINT dsh_delivery_exceptions_resolution_action_check CHECK (((resolution_action IS NULL) OR (resolution_action = ANY (ARRAY['retry_same_captain'::text, 'reassign_captain'::text, 'return_to_store'::text, 'cancel_order'::text])))),
    CONSTRAINT dsh_delivery_exceptions_resolution_shape_check CHECK ((((status = 'resolved'::text) AND (resolved_at IS NOT NULL) AND (resolved_by_actor_id IS NOT NULL) AND (resolution_action IS NOT NULL) AND (NULLIF(btrim(resolution_note), ''::text) IS NOT NULL) AND (((resolution_action = 'reassign_captain'::text) AND (replacement_assignment_id IS NOT NULL) AND (NULLIF(btrim(replacement_captain_id), ''::text) IS NOT NULL) AND (return_started_at IS NULL) AND (return_arrived_at IS NULL) AND (returned_at IS NULL) AND (return_accepted_by_actor_id IS NULL)) OR ((resolution_action = 'return_to_store'::text) AND (replacement_assignment_id IS NULL) AND (replacement_captain_id IS NULL) AND (return_started_at IS NOT NULL) AND ((return_arrived_at IS NULL) OR (return_arrived_at >= return_started_at)) AND ((returned_at IS NULL) OR ((return_arrived_at IS NOT NULL) AND (returned_at >= return_arrived_at) AND (NULLIF(btrim(return_accepted_by_actor_id), ''::text) IS NOT NULL))) AND ((returned_at IS NOT NULL) OR (return_accepted_by_actor_id IS NULL))) OR ((resolution_action <> ALL (ARRAY['reassign_captain'::text, 'return_to_store'::text])) AND (replacement_assignment_id IS NULL) AND (replacement_captain_id IS NULL) AND (return_started_at IS NULL) AND (return_arrived_at IS NULL) AND (returned_at IS NULL) AND (return_accepted_by_actor_id IS NULL)))) OR ((status <> 'resolved'::text) AND (resolved_at IS NULL) AND (resolved_by_actor_id IS NULL) AND (resolution_action IS NULL) AND (resolution_note IS NULL) AND (replacement_assignment_id IS NULL) AND (replacement_captain_id IS NULL) AND (return_started_at IS NULL) AND (return_arrived_at IS NULL) AND (returned_at IS NULL) AND (return_accepted_by_actor_id IS NULL)))),
    CONSTRAINT dsh_delivery_exceptions_severity_check CHECK ((severity = ANY (ARRAY['medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_delivery_exceptions_source_check CHECK (((order_id IS NOT NULL) <> (special_request_id IS NOT NULL))),
    CONSTRAINT dsh_delivery_exceptions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text]))),
    CONSTRAINT dsh_delivery_exceptions_version_check CHECK ((version > 0))
);


--
-- Name: dsh_delivery_proof_review_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_proof_review_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proof_id uuid NOT NULL,
    operator_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_delivery_proof_review_receipts_idempotency_key_check CHECK (((length(btrim(idempotency_key)) >= 8) AND (length(btrim(idempotency_key)) <= 240))),
    CONSTRAINT dsh_delivery_proof_review_receipts_request_fingerprint_check CHECK ((length(request_fingerprint) = 64))
);


--
-- Name: TABLE dsh_delivery_proof_review_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_delivery_proof_review_receipts IS 'Durable actor-scoped command receipts for replay-safe operator delivery-proof reviews.';


--
-- Name: dsh_delivery_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    order_id uuid,
    captain_id text NOT NULL,
    verification_challenge_id uuid,
    method text NOT NULL,
    status text NOT NULL,
    photo_media_ref text,
    signature_media_ref text,
    captured_latitude double precision,
    captured_longitude double precision,
    captured_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by_actor_id text,
    review_reason text,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_relationship text DEFAULT 'customer'::text NOT NULL,
    recipient_name text,
    special_request_id uuid,
    CONSTRAINT chk_delivery_proof_source CHECK (((order_id IS NOT NULL) <> (special_request_id IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_captured_latitude_check CHECK (((captured_latitude IS NULL) OR ((captured_latitude >= ('-90'::integer)::double precision) AND (captured_latitude <= (90)::double precision)))),
    CONSTRAINT dsh_delivery_proofs_captured_longitude_check CHECK (((captured_longitude IS NULL) OR ((captured_longitude >= ('-180'::integer)::double precision) AND (captured_longitude <= (180)::double precision)))),
    CONSTRAINT dsh_delivery_proofs_check CHECK ((captured_at <= (submitted_at + '00:05:00'::interval))),
    CONSTRAINT dsh_delivery_proofs_check1 CHECK (((method <> 'otp_pin'::text) OR (verification_challenge_id IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_check2 CHECK (((method <> 'photo'::text) OR (photo_media_ref IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_check3 CHECK (((method <> 'signature'::text) OR (signature_media_ref IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_check4 CHECK (((method <> 'composite'::text) OR ((verification_challenge_id IS NOT NULL) AND ((photo_media_ref IS NOT NULL) OR (signature_media_ref IS NOT NULL))))),
    CONSTRAINT dsh_delivery_proofs_check5 CHECK (((status <> 'accepted'::text) OR (accepted_at IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_check6 CHECK (((status <> 'rejected'::text) OR (rejected_at IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_check7 CHECK (((reviewed_at IS NULL) OR (reviewed_by_actor_id IS NOT NULL))),
    CONSTRAINT dsh_delivery_proofs_method_check CHECK ((method = ANY (ARRAY['otp_pin'::text, 'photo'::text, 'signature'::text, 'composite'::text]))),
    CONSTRAINT dsh_delivery_proofs_recipient_name_check CHECK (((recipient_relationship = 'customer'::text) OR ((recipient_name IS NOT NULL) AND (length(TRIM(BOTH FROM recipient_name)) > 0)))),
    CONSTRAINT dsh_delivery_proofs_recipient_relationship_check CHECK ((recipient_relationship = ANY (ARRAY['customer'::text, 'reception'::text, 'neighbor'::text, 'family_member'::text, 'other'::text]))),
    CONSTRAINT dsh_delivery_proofs_request_fingerprint_check CHECK ((length(request_fingerprint) = 64)),
    CONSTRAINT dsh_delivery_proofs_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'pending_review'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text]))),
    CONSTRAINT dsh_delivery_proofs_version_check CHECK ((version > 0))
);


--
-- Name: dsh_delivery_sla_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_sla_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id text NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    leg text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_by_actor_id text,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    correlation_id text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_delivery_sla_alerts_operator_context_nonempty_check CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_delivery_sla_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])))
);


--
-- Name: dsh_delivery_verification_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_delivery_verification_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    order_id uuid NOT NULL,
    client_id text NOT NULL,
    pin_hash text NOT NULL,
    pin_expires_at timestamp with time zone NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    consumed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_delivery_verification_challenges_check CHECK ((pin_expires_at > issued_at)),
    CONSTRAINT dsh_delivery_verification_challenges_check1 CHECK (((consumed_at IS NULL) OR (consumed_at >= issued_at))),
    CONSTRAINT dsh_delivery_verification_challenges_failed_attempts_check CHECK ((failed_attempts >= 0)),
    CONSTRAINT dsh_delivery_verification_challenges_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 10))),
    CONSTRAINT dsh_delivery_verification_challenges_pin_hash_check CHECK ((((length(pin_hash) >= 59) AND (length(pin_hash) <= 72)) AND (pin_hash ~~ '$2%'::text))),
    CONSTRAINT dsh_delivery_verification_challenges_version_check CHECK ((version > 0))
);


--
-- Name: dsh_dispatch_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_dispatch_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text DEFAULT 'default'::text NOT NULL,
    assignment_id uuid,
    order_id uuid,
    captain_id text,
    action text NOT NULL,
    reason_code text,
    reason text,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_dispatch_decisions_action_check CHECK ((action = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'cancelled'::text, 'reassigned'::text, 'eligibility_rejected'::text, 'capacity_rejected'::text]))),
    CONSTRAINT dsh_dispatch_decisions_actor_role_check CHECK ((actor_role = ANY (ARRAY['operator'::text, 'captain'::text, 'system'::text])))
);


--
-- Name: dsh_field_commission_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_field_commission_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text DEFAULT 'field_visit_commission'::text NOT NULL,
    field_actor_id text NOT NULL,
    visit_id uuid NOT NULL,
    store_id text NOT NULL,
    partner_id text,
    commission_policy_id text,
    correlation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    partner_category text DEFAULT 'default'::text NOT NULL,
    CONSTRAINT dsh_field_commission_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: COLUMN dsh_field_commission_outbox.partner_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_field_commission_outbox.partner_category IS 'DSH-owned partner category snapshot captured at visit completion; WLT uses it only as policy evidence.';


--
-- Name: dsh_field_onboarding_assignment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_field_onboarding_assignment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    operator_context_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_id text NOT NULL,
    previous_field_actor_id text,
    next_field_actor_id text,
    draft_partner_id text,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_field_onboarding_assignment_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'opened'::text, 'reassigned'::text, 'cancelled'::text, 'draft_linked'::text]))),
    CONSTRAINT dsh_field_onboarding_assignment_events_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'opened'::text, 'handoff'::text, 'reassigned'::text, 'cancelled'::text, 'draft_linked'::text])))
);


--
-- Name: dsh_field_onboarding_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_field_onboarding_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    field_actor_id text NOT NULL,
    store_name_hint text NOT NULL,
    phone_hint text,
    address_hint text,
    location_latitude numeric(9,6),
    location_longitude numeric(9,6),
    status text DEFAULT 'assigned'::text NOT NULL,
    draft_partner_id text,
    version integer DEFAULT 1 NOT NULL,
    created_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_task_key text,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_at timestamp with time zone,
    sla_minutes integer DEFAULT 1440 NOT NULL,
    CONSTRAINT dsh_field_onboarding_assignments_check CHECK (((phone_hint IS NOT NULL) OR (address_hint IS NOT NULL))),
    CONSTRAINT dsh_field_onboarding_assignments_check1 CHECK (((location_latitude IS NULL) = (location_longitude IS NULL))),
    CONSTRAINT dsh_field_onboarding_assignments_location_latitude_check CHECK (((location_latitude IS NULL) OR ((location_latitude >= ('-90'::integer)::numeric) AND (location_latitude <= (90)::numeric)))),
    CONSTRAINT dsh_field_onboarding_assignments_location_longitude_check CHECK (((location_longitude IS NULL) OR ((location_longitude >= ('-180'::integer)::numeric) AND (location_longitude <= (180)::numeric)))),
    CONSTRAINT dsh_field_onboarding_assignments_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT dsh_field_onboarding_assignments_sla_minutes_check CHECK (((sla_minutes > 0) AND (sla_minutes <= 43200))),
    CONSTRAINT dsh_field_onboarding_assignments_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'draft_linked'::text, 'cancelled'::text]))),
    CONSTRAINT dsh_field_onboarding_assignments_version_check CHECK ((version > 0))
);


--
-- Name: dsh_field_readiness_operation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_field_readiness_operation_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    operation text NOT NULL,
    resource_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    correlation_id text NOT NULL,
    response_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_field_readiness_receipts_actor_chk CHECK ((length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_field_readiness_receipts_correlation_chk CHECK (((length(btrim(correlation_id)) >= 1) AND (length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_field_readiness_receipts_key_chk CHECK (((length(btrim(idempotency_key)) >= 8) AND (length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_field_readiness_receipts_operation_chk CHECK ((operation = ANY (ARRAY['create_visit'::text, 'complete_visit'::text, 'upsert_readiness_check'::text, 'create_escalation'::text])))
);


--
-- Name: dsh_field_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_field_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id text NOT NULL,
    field_agent_id text NOT NULL,
    visit_type text DEFAULT 'onboarding'::text NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    notes text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    start_latitude double precision,
    start_longitude double precision,
    start_accuracy_meters double precision,
    start_captured_at timestamp with time zone,
    start_provider text,
    start_device_reference text,
    start_is_mocked boolean DEFAULT false NOT NULL,
    completion_latitude double precision,
    completion_longitude double precision,
    completion_accuracy_meters double precision,
    completion_captured_at timestamp with time zone,
    completion_provider text,
    completion_is_mocked boolean,
    store_latitude double precision,
    store_longitude double precision,
    geofence_radius_meters double precision DEFAULT 200 NOT NULL,
    start_distance_from_store_meters double precision,
    completion_distance_from_store_meters double precision,
    start_geofence_status text,
    completion_geofence_status text,
    create_idempotency_key text,
    create_request_hash text,
    create_correlation_id text,
    completion_idempotency_key text,
    completion_request_hash text,
    completion_correlation_id text,
    CONSTRAINT dsh_field_visits_completion_geofence_status_chk CHECK (((completion_geofence_status IS NULL) OR (completion_geofence_status = ANY (ARRAY['inside'::text, 'outside'::text, 'unknown'::text])))),
    CONSTRAINT dsh_field_visits_completion_idempotency_pair_chk CHECK ((((completion_idempotency_key IS NULL) AND (completion_request_hash IS NULL)) OR ((completion_idempotency_key IS NOT NULL) AND (completion_request_hash IS NOT NULL)))),
    CONSTRAINT dsh_field_visits_create_idempotency_pair_chk CHECK ((((create_idempotency_key IS NULL) AND (create_request_hash IS NULL)) OR ((create_idempotency_key IS NOT NULL) AND (create_request_hash IS NOT NULL)))),
    CONSTRAINT dsh_field_visits_start_geofence_status_chk CHECK (((start_geofence_status IS NULL) OR (start_geofence_status = ANY (ARRAY['inside'::text, 'outside'::text, 'unknown'::text])))),
    CONSTRAINT dsh_field_visits_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'complete'::text, 'escalated'::text]))),
    CONSTRAINT dsh_field_visits_visit_type_check CHECK ((visit_type = ANY (ARRAY['onboarding'::text, 'periodic'::text, 'escalation_followup'::text])))
);


--
-- Name: dsh_home_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_home_banners (
    id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    image_url text NOT NULL,
    action_type text NOT NULL,
    action_target text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    publication_status text DEFAULT 'draft'::text NOT NULL,
    publish_from timestamp with time zone,
    publish_until timestamp with time zone,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_home_banners_action_type_check CHECK ((action_type = ANY (ARRAY['store'::text, 'category'::text, 'external'::text, 'none'::text]))),
    CONSTRAINT dsh_home_banners_publication_status_check CHECK ((publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_home_banners_publish_window_chk CHECK (((publish_until IS NULL) OR (publish_from IS NULL) OR (publish_until > publish_from))),
    CONSTRAINT dsh_home_banners_version_check CHECK ((version > 0))
);


--
-- Name: COLUMN dsh_home_banners.approved_by_actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_home_banners.approved_by_actor_id IS 'Authenticated marketing operator that approved client publication.';


--
-- Name: dsh_home_content_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_home_content_audit (
    id text NOT NULL,
    actor_id text NOT NULL,
    content_kind text NOT NULL,
    content_id text NOT NULL,
    action text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_home_content_audit_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text]))),
    CONSTRAINT dsh_home_content_audit_content_kind_check CHECK ((content_kind = ANY (ARRAY['banners'::text, 'promos'::text, 'categories'::text])))
);


--
-- Name: dsh_home_content_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_home_content_targets (
    content_kind text NOT NULL,
    content_id text NOT NULL,
    target_type text NOT NULL,
    target_value text NOT NULL,
    created_by_actor_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_home_content_targets_check CHECK (((target_type <> 'audience'::text) OR (target_value = ANY (ARRAY['guest'::text, 'authenticated'::text])))),
    CONSTRAINT dsh_home_content_targets_content_kind_check CHECK ((content_kind = ANY (ARRAY['banners'::text, 'promos'::text]))),
    CONSTRAINT dsh_home_content_targets_correlation_id_check CHECK ((length(TRIM(BOTH FROM correlation_id)) >= 8)),
    CONSTRAINT dsh_home_content_targets_target_type_check CHECK ((target_type = ANY (ARRAY['city'::text, 'service_area'::text, 'audience'::text]))),
    CONSTRAINT dsh_home_content_targets_target_value_check CHECK ((target_value ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$'::text))
);


--
-- Name: TABLE dsh_home_content_targets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_home_content_targets IS ' targeting projection. Empty dimension = all; audience values are guest/authenticated.';


--
-- Name: dsh_home_promos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_home_promos (
    id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    badge_label text,
    image_url text NOT NULL,
    action_type text NOT NULL,
    action_target text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    publication_status text DEFAULT 'draft'::text NOT NULL,
    publish_from timestamp with time zone,
    publish_until timestamp with time zone,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_home_promos_action_type_check CHECK ((action_type = ANY (ARRAY['store'::text, 'category'::text, 'external'::text, 'none'::text]))),
    CONSTRAINT dsh_home_promos_publication_status_check CHECK ((publication_status = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_home_promos_publish_window_chk CHECK (((publish_until IS NULL) OR (publish_from IS NULL) OR (publish_until > publish_from))),
    CONSTRAINT dsh_home_promos_version_check CHECK ((version > 0))
);


--
-- Name: COLUMN dsh_home_promos.approved_by_actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_home_promos.approved_by_actor_id IS 'Authenticated marketing operator that approved client publication.';


--
-- Name: dsh_incident_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_incident_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    author_id text NOT NULL,
    body text NOT NULL,
    is_public_safe boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_incident_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_incident_entities (
    incident_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    CONSTRAINT dsh_incident_entities_entity_type_check CHECK ((entity_type = ANY (ARRAY['store'::text, 'provider'::text, 'order'::text, 'payout'::text, 'identity'::text, 'runtime'::text, 'person'::text, 'driver'::text])))
);


--
-- Name: dsh_incident_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_incident_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    actor_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_incident_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'status_changed'::text, 'triaged'::text, 'containing_started'::text, 'mitigating_started'::text, 'monitoring_started'::text, 'resolved'::text, 'closed'::text, 'reopened'::text]))),
    CONSTRAINT dsh_incident_events_to_status_check CHECK ((to_status = ANY (ARRAY['open'::text, 'triaged'::text, 'containing'::text, 'mitigating'::text, 'monitoring'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: dsh_incident_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_incident_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    assignee_id text NOT NULL,
    assignee_role text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_incident_tasks_assignee_role_check CHECK ((assignee_role = ANY (ARRAY['operator'::text, 'field'::text, 'captain'::text, 'partner'::text]))),
    CONSTRAINT dsh_incident_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'canceled'::text])))
);


--
-- Name: dsh_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    affected_scope text DEFAULT 'unknown'::text NOT NULL,
    raised_by text NOT NULL,
    resolved_by text,
    resolved_at timestamp with time zone,
    postmortem_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    create_idempotency_key text,
    correlation_id text,
    CONSTRAINT dsh_incidents_affected_scope_check CHECK ((affected_scope = ANY (ARRAY['delivery'::text, 'stores'::text, 'payments'::text, 'platform'::text, 'unknown'::text]))),
    CONSTRAINT dsh_incidents_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_incidents_status_check CHECK ((status = ANY (ARRAY['open'::text, 'triaged'::text, 'containing'::text, 'mitigating'::text, 'monitoring'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: dsh_loyalty_earning_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_loyalty_earning_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    points_numerator bigint DEFAULT 1 NOT NULL,
    eligible_minor_units_denominator bigint NOT NULL,
    minimum_points bigint DEFAULT 0 NOT NULL,
    maximum_points_per_order bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_loyalty_earning_policies_eligible_minor_units_denomin_check CHECK ((eligible_minor_units_denominator > 0)),
    CONSTRAINT dsh_loyalty_earning_policies_maximum_points_per_order_check CHECK ((maximum_points_per_order >= 0)),
    CONSTRAINT dsh_loyalty_earning_policies_minimum_points_check CHECK ((minimum_points >= 0)),
    CONSTRAINT dsh_loyalty_earning_policies_points_numerator_check CHECK ((points_numerator > 0)),
    CONSTRAINT dsh_loyalty_earning_policies_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_loyalty_earning_policies_version_check CHECK ((version > 0))
);


--
-- Name: dsh_loyalty_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_loyalty_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    min_points bigint DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    free_delivery_threshold_yer bigint DEFAULT 0 NOT NULL,
    badge text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_loyalty_tiers_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT dsh_loyalty_tiers_free_delivery_threshold_yer_check CHECK ((free_delivery_threshold_yer >= 0)),
    CONSTRAINT dsh_loyalty_tiers_min_points_check CHECK ((min_points >= 0)),
    CONSTRAINT dsh_loyalty_tiers_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_loyalty_tiers_version_check CHECK ((version > 0))
);


--
-- Name: dsh_marketing_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_audit_events (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    from_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    to_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_audit_events_entity_type_check CHECK ((entity_type = ANY (ARRAY['campaign'::text, 'banner'::text, 'promo'::text, 'ticker'::text, 'partner_offer'::text])))
);


--
-- Name: dsh_marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date text,
    end_date text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_type text,
    target_id text,
    audience text DEFAULT 'all'::text NOT NULL,
    placement text,
    archived_at timestamp with time zone,
    created_by_actor_id text,
    created_by_surface text DEFAULT 'control-panel'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    target_city_code text,
    target_service_area_code text,
    CONSTRAINT dsh_marketing_campaigns_audience_chk CHECK ((audience = ANY (ARRAY['all'::text, 'client'::text, 'partner'::text, 'captain'::text, 'field'::text]))),
    CONSTRAINT dsh_marketing_campaigns_placement_chk CHECK (((placement IS NULL) OR (placement = ANY (ARRAY['home'::text, 'hero'::text, 'feed'::text, 'floating'::text, 'banner'::text, 'store-card'::text])))),
    CONSTRAINT dsh_marketing_campaigns_region_chk CHECK ((((target_city_code IS NULL) OR (target_city_code ~ '^[A-Za-z0-9._:-]{1,64}$'::text)) AND ((target_service_area_code IS NULL) OR (target_service_area_code ~ '^[A-Za-z0-9._:-]{1,64}$'::text)))),
    CONSTRAINT dsh_marketing_campaigns_schedule_chk CHECK ((((COALESCE(start_date, ''::text) = ''::text) AND (COALESCE(end_date, ''::text) = ''::text)) OR ((start_date ~ '^\d{4}-\d{2}-\d{2}$'::text) AND (end_date ~ '^\d{4}-\d{2}-\d{2}$'::text) AND (end_date > start_date)))),
    CONSTRAINT dsh_marketing_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT dsh_marketing_campaigns_target_type_chk CHECK (((target_type IS NULL) OR (target_type = ANY (ARRAY['home'::text, 'stores'::text, 'store'::text, 'category'::text, 'subcategory'::text, 'product'::text, 'offer'::text, 'campaign'::text, 'search'::text, 'custom'::text]))))
);


--
-- Name: dsh_marketing_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_clicks (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    surface text NOT NULL,
    viewer_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_clicks_entity_type_check CHECK ((entity_type = ANY (ARRAY['campaign'::text, 'banner'::text, 'promo'::text, 'ticker'::text, 'partner_offer'::text])))
);


--
-- Name: dsh_marketing_impressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_impressions (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    surface text NOT NULL,
    viewer_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_impressions_entity_type_check CHECK ((entity_type = ANY (ARRAY['campaign'::text, 'banner'::text, 'promo'::text, 'ticker'::text, 'partner_offer'::text])))
);


--
-- Name: dsh_marketing_target_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_target_bindings (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    bound_by_actor_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_target_bindings_entity_type_check CHECK ((entity_type = ANY (ARRAY['campaign'::text, 'banner'::text, 'promo'::text, 'ticker'::text, 'partner_offer'::text])))
);


--
-- Name: dsh_marketing_tickers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_tickers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    kind text DEFAULT 'news'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    source text DEFAULT 'ops'::text NOT NULL,
    audience text DEFAULT 'all'::text NOT NULL,
    delivery_mode text DEFAULT 'scroll'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    action_type text DEFAULT ''::text NOT NULL,
    action_target text DEFAULT ''::text NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    open_hour integer,
    close_hour integer,
    cooldown_minutes integer,
    repeat_gap_minutes integer,
    created_by text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_tickers_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'client'::text, 'partner'::text, 'captain'::text]))),
    CONSTRAINT dsh_marketing_tickers_clicks_check CHECK ((clicks >= 0)),
    CONSTRAINT dsh_marketing_tickers_close_hour_check CHECK (((close_hour >= 0) AND (close_hour <= 23))),
    CONSTRAINT dsh_marketing_tickers_cooldown_minutes_check CHECK ((cooldown_minutes >= 0)),
    CONSTRAINT dsh_marketing_tickers_delivery_mode_check CHECK ((delivery_mode = ANY (ARRAY['scroll'::text, 'toast'::text, 'overlay'::text]))),
    CONSTRAINT dsh_marketing_tickers_impressions_check CHECK ((impressions >= 0)),
    CONSTRAINT dsh_marketing_tickers_kind_check CHECK ((kind = ANY (ARRAY['alert'::text, 'news'::text, 'promo'::text]))),
    CONSTRAINT dsh_marketing_tickers_open_hour_check CHECK (((open_hour >= 0) AND (open_hour <= 23))),
    CONSTRAINT dsh_marketing_tickers_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_marketing_tickers_repeat_gap_minutes_check CHECK ((repeat_gap_minutes >= 0)),
    CONSTRAINT dsh_marketing_tickers_source_check CHECK ((source = ANY (ARRAY['system'::text, 'ops'::text, 'partner'::text]))),
    CONSTRAINT dsh_marketing_tickers_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text])))
);


--
-- Name: dsh_marketing_visibility_gates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_marketing_visibility_gates (
    id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    gate text NOT NULL,
    passed boolean NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_marketing_visibility_gates_entity_type_check CHECK ((entity_type = ANY (ARRAY['campaign'::text, 'banner'::text, 'promo'::text, 'ticker'::text, 'partner_offer'::text])))
);


--
-- Name: dsh_master_product_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_master_product_attribute_values (
    id text NOT NULL,
    master_product_id text NOT NULL,
    attribute_id text NOT NULL,
    value_json jsonb NOT NULL,
    locale text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: dsh_master_product_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_master_product_relationships (
    id text NOT NULL,
    source_master_product_id text NOT NULL,
    target_master_product_id text NOT NULL,
    relationship_type text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_master_product_relationships_check CHECK ((source_master_product_id <> target_master_product_id)),
    CONSTRAINT dsh_master_product_relationships_priority_check CHECK ((priority >= 0)),
    CONSTRAINT dsh_master_product_relationships_relationship_type_check CHECK ((relationship_type = ANY (ARRAY['substitute'::text, 'alternative'::text, 'complement'::text])))
);


--
-- Name: dsh_master_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_master_products (
    id text NOT NULL,
    domain_id text NOT NULL,
    category_node_id text,
    canonical_name_ar text NOT NULL,
    canonical_name_en text DEFAULT ''::text NOT NULL,
    brand text DEFAULT ''::text NOT NULL,
    barcode text,
    gtin text,
    sku text,
    unit text DEFAULT 'unit'::text NOT NULL,
    measurement_type text DEFAULT 'unit'::text NOT NULL,
    canonical_image_object_key text,
    approval_status text DEFAULT 'draft'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    duplicate_group_id text,
    created_source text DEFAULT 'control-panel-catalog'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_id text,
    is_standalone boolean DEFAULT true NOT NULL,
    CONSTRAINT dsh_master_products_approval_status_check CHECK ((approval_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


--
-- Name: dsh_media_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_media_refs (
    media_ref text DEFAULT ('media_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    storage_key text NOT NULL,
    owner_actor_id text NOT NULL,
    owner_actor_role text NOT NULL,
    partner_id text,
    store_id text,
    purpose text NOT NULL,
    content_type text NOT NULL,
    original_filename text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    order_id uuid,
    scan_status text DEFAULT 'clean'::text NOT NULL,
    retention_until timestamp with time zone DEFAULT (now() + '90 days'::interval) NOT NULL,
    legal_hold boolean DEFAULT false NOT NULL,
    special_request_id uuid,
    CONSTRAINT dsh_media_refs_scan_status_check CHECK ((scan_status = ANY (ARRAY['pending'::text, 'clean'::text, 'quarantined'::text, 'failed'::text])))
);


--
-- Name: dsh_notification_channel_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_notification_channel_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    channel text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_message_id text,
    last_error text,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_idempotency_key text,
    lease_token uuid,
    lease_expires_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    unknown_at timestamp with time zone,
    reconciliation_attempt_count integer DEFAULT 0 NOT NULL,
    last_reconciliation_at timestamp with time zone,
    CONSTRAINT dsh_notification_channel_deliveries_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_notification_channel_deliveries_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'push'::text]))),
    CONSTRAINT dsh_notification_channel_deliveries_push_identity_check CHECK (((channel <> 'push'::text) OR (NULLIF(btrim(provider_idempotency_key), ''::text) IS NOT NULL))),
    CONSTRAINT dsh_notification_channel_deliveries_reconciliation_attempt_coun CHECK ((reconciliation_attempt_count >= 0)),
    CONSTRAINT dsh_notification_channel_deliveries_sending_lease_check CHECK (((status <> 'sending'::text) OR ((lease_token IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT dsh_notification_channel_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'unknown'::text, 'sent'::text, 'failed'::text, 'suppressed'::text])))
);


--
-- Name: dsh_notification_delivery_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_notification_delivery_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    outcome text NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    next_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_notification_delivery_attempts_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT dsh_notification_delivery_attempts_outcome_check CHECK ((outcome = ANY (ARRAY['sent'::text, 'retry_scheduled'::text, 'dead_letter'::text])))
);


--
-- Name: dsh_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    topic text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    channels text[] DEFAULT ARRAY['in_app'::text] NOT NULL,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    locale text DEFAULT 'ar'::text NOT NULL,
    timezone text DEFAULT 'Asia/Aden'::text NOT NULL,
    CONSTRAINT dsh_notification_preferences_channels_check CHECK (((cardinality(channels) > 0) AND (channels <@ ARRAY['in_app'::text, 'push'::text]))),
    CONSTRAINT dsh_notification_preferences_locale_check CHECK ((locale = ANY (ARRAY['ar'::text, 'en'::text]))),
    CONSTRAINT dsh_notification_preferences_quiet_hours_check CHECK ((((quiet_hours_start IS NULL) AND (quiet_hours_end IS NULL)) OR ((quiet_hours_start IS NOT NULL) AND (quiet_hours_end IS NOT NULL))))
);


--
-- Name: dsh_notification_push_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_notification_push_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    provider text DEFAULT 'expo'::text NOT NULL,
    endpoint_token text NOT NULL,
    device_id text NOT NULL,
    platform text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    identity_session_id text,
    surface text,
    CONSTRAINT dsh_notification_push_endpoints_actor_type_check CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text, 'operator'::text]))),
    CONSTRAINT dsh_notification_push_endpoints_platform_check CHECK ((platform = ANY (ARRAY['android'::text, 'ios'::text]))),
    CONSTRAINT dsh_notification_push_endpoints_provider_check CHECK ((provider = 'expo'::text))
);


--
-- Name: dsh_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    topic text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    action_url text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    delivery_channels text[] DEFAULT ARRAY['in_app'::text] NOT NULL,
    CONSTRAINT dsh_notifications_actor_type_check CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text, 'operator'::text]))),
    CONSTRAINT dsh_notifications_delivery_channels_check CHECK (((cardinality(delivery_channels) > 0) AND (delivery_channels <@ ARRAY['in_app'::text, 'push'::text])))
);


--
-- Name: dsh_onboarding_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_onboarding_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    target_kind text NOT NULL,
    target_id text NOT NULL,
    requested_by_actor_id text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    idempotency_key text NOT NULL,
    resolved_by_actor_id text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_onboarding_change_requests_reason_check CHECK (((char_length(reason) >= 5) AND (char_length(reason) <= 2000))),
    CONSTRAINT dsh_onboarding_change_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'responded'::text, 'resolved'::text, 'cancelled'::text]))),
    CONSTRAINT dsh_onboarding_change_requests_target_kind_check CHECK ((target_kind = ANY (ARRAY['draft'::text, 'document'::text, 'assignment'::text])))
);


--
-- Name: dsh_onboarding_collaboration_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_onboarding_collaboration_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    sender_actor_id text NOT NULL,
    sender_surface text NOT NULL,
    body text NOT NULL,
    attachment_media_refs text[] DEFAULT '{}'::text[] NOT NULL,
    client_message_id text NOT NULL,
    sequence_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_onboarding_collaboration_messages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000))),
    CONSTRAINT dsh_onboarding_collaboration_messages_sender_surface_check CHECK ((sender_surface = ANY (ARRAY['app-field'::text, 'control-panel'::text]))),
    CONSTRAINT dsh_onboarding_collaboration_messages_sequence_number_check CHECK ((sequence_number > 0))
);


--
-- Name: dsh_onboarding_collaboration_read_cursors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_onboarding_collaboration_read_cursors (
    thread_id uuid NOT NULL,
    actor_id text NOT NULL,
    last_read_sequence integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_onboarding_collaboration_read_curs_last_read_sequence_check CHECK ((last_read_sequence >= 0))
);


--
-- Name: dsh_onboarding_collaboration_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_onboarding_collaboration_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    partner_id text NOT NULL,
    assignment_id uuid,
    document_id text,
    status text DEFAULT 'open'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_onboarding_collaboration_threads_check CHECK (((assignment_id IS NOT NULL) OR (document_id IS NOT NULL))),
    CONSTRAINT dsh_onboarding_collaboration_threads_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'closed'::text]))),
    CONSTRAINT dsh_onboarding_collaboration_threads_version_check CHECK ((version > 0))
);


--
-- Name: dsh_operational_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_operational_incidents (
    id text DEFAULT ('oi_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    order_id uuid NOT NULL,
    target_entity_type text NOT NULL,
    target_entity_id text NOT NULL,
    incident_type text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    reason text NOT NULL,
    ticket_reference text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    failure_reason text,
    partner_notified boolean DEFAULT false NOT NULL,
    partner_notified_at timestamp with time zone,
    correlation_id text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    command_payload jsonb NOT NULL,
    CONSTRAINT dsh_operational_incidents_command_payload_object_check CHECK ((jsonb_typeof(command_payload) = 'object'::text)),
    CONSTRAINT dsh_operational_incidents_incident_type_check CHECK ((incident_type = ANY (ARRAY['raise_exception'::text, 'cancel'::text, 'suspend'::text]))),
    CONSTRAINT dsh_operational_incidents_status_check CHECK ((status = ANY (ARRAY['open'::text, 'applied'::text, 'failed'::text]))),
    CONSTRAINT dsh_operational_incidents_target_entity_type_check CHECK ((target_entity_type = ANY (ARRAY['partner_delivery_task'::text, 'pickup_session'::text, 'order'::text])))
);


--
-- Name: dsh_operational_outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_operational_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    correlation_id text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    CONSTRAINT dsh_operational_outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: dsh_operator_dispatch_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_operator_dispatch_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    operation text NOT NULL,
    assignment_id uuid,
    reason_code text DEFAULT ''::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    limit_value integer DEFAULT 0 NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    result_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_operator_dispatch_command_receipt_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_operator_dispatch_command_receipt_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_operator_dispatch_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_operator_dispatch_command_receipts_check CHECK (((operation <> 'cancel_assignment'::text) OR ((assignment_id IS NOT NULL) AND (reason_code <> ''::text) AND (reason <> ''::text) AND (limit_value = 0)))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_check1 CHECK (((operation <> 'expire_assignments'::text) OR ((assignment_id IS NULL) AND (reason_code = ''::text) AND (reason = ''::text) AND ((limit_value >= 1) AND (limit_value <= 500))))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_limit_value_check CHECK (((limit_value >= 0) AND (limit_value <= 500))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_operation_check CHECK ((operation = ANY (ARRAY['cancel_assignment'::text, 'expire_assignments'::text]))),
    CONSTRAINT dsh_operator_dispatch_command_receipts_result_count_check CHECK ((result_count >= 0))
);


--
-- Name: dsh_operator_store_creation_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_operator_store_creation_idempotency (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    CONSTRAINT dsh_operator_store_creation_idempoten_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_operator_store_creation_idempotency_actor_id_check CHECK ((btrim(actor_id) <> ''::text)),
    CONSTRAINT dsh_operator_store_creation_idempotency_idempotency_key_check CHECK ((btrim(idempotency_key) <> ''::text)),
    CONSTRAINT dsh_operator_store_creation_idempotency_request_hash_check CHECK ((btrim(request_hash) <> ''::text))
);


--
-- Name: dsh_order_cancellation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_cancellation_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cancellation_id uuid NOT NULL,
    action_type text NOT NULL,
    status text DEFAULT 'pending_approval'::text NOT NULL,
    payload jsonb,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    created_by text NOT NULL,
    executed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_cancellation_actions_status_check CHECK ((status = ANY (ARRAY['pending_approval'::text, 'executing'::text, 'completed'::text, 'failed'::text, 'rejected'::text])))
);


--
-- Name: dsh_order_cancellations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_cancellations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    reason_code text NOT NULL,
    reason_note text,
    from_status text NOT NULL,
    to_status text NOT NULL,
    financial_closure_status text DEFAULT 'pending'::text NOT NULL,
    financial_reference text,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'requested'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_order_cancellations_actor_role_check CHECK ((actor_role = ANY (ARRAY['client'::text, 'partner'::text, 'operator'::text, 'system'::text]))),
    CONSTRAINT dsh_order_cancellations_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'review'::text, 'approved'::text, 'rejected'::text, 'cancelling'::text, 'cancelled'::text, 'conflict'::text, 'unknown'::text])))
);


--
-- Name: dsh_order_create_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_create_idempotency (
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    idempotency_key text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    request_fingerprint text NOT NULL,
    order_id uuid,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT dsh_order_create_idempotency_request_fingerprint_check CHECK ((char_length(request_fingerprint) = 64))
);


--
-- Name: dsh_order_event_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_event_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    order_id uuid NOT NULL,
    event_id uuid NOT NULL,
    event_type text NOT NULL,
    correlation_id text NOT NULL,
    causation_id text DEFAULT ''::text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_event_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_order_event_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'published'::text, 'retry'::text, 'dead_letter'::text])))
);


--
-- Name: dsh_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency text NOT NULL,
    item_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    line_total_minor_units bigint DEFAULT 0 NOT NULL,
    CONSTRAINT chk_dsh_order_items_currency_code CHECK (((currency = upper(btrim(currency))) AND (currency ~ '^[A-Z]{3}$'::text))),
    CONSTRAINT dsh_order_items_line_total_minor_units_check CHECK ((line_total_minor_units >= 0)),
    CONSTRAINT dsh_order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT dsh_order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: dsh_order_payment_projection_reconciliation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_payment_projection_reconciliation (
    order_id uuid NOT NULL,
    operator_context_id text NOT NULL,
    wlt_payment_session_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_expires_at timestamp with time zone,
    last_source_status text DEFAULT ''::text NOT NULL,
    last_source_updated_at timestamp with time zone,
    last_error text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_payment_projection_reconciliation_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_order_payment_projection_reconciliation_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry'::text, 'scheduled'::text, 'paused'::text])))
);


--
-- Name: dsh_order_preparation_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_preparation_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    alert_kind text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    estimate_revision integer DEFAULT 0 NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_by_actor_id text,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    resolution_reason text,
    version integer DEFAULT 1 NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_preparation_alerts_alert_kind_check CHECK ((alert_kind = ANY (ARRAY['due_soon'::text, 'overdue'::text, 'customer_decision_pending'::text]))),
    CONSTRAINT dsh_order_preparation_alerts_check CHECK ((((status = 'open'::text) AND (acknowledged_by_actor_id IS NULL) AND (acknowledged_at IS NULL) AND (resolved_at IS NULL)) OR ((status = 'acknowledged'::text) AND (acknowledged_by_actor_id IS NOT NULL) AND (acknowledged_at IS NOT NULL) AND (resolved_at IS NULL)) OR ((status = 'resolved'::text) AND (resolved_at IS NOT NULL) AND ((length(btrim(COALESCE(resolution_reason, ''::text))) >= 3) AND (length(btrim(COALESCE(resolution_reason, ''::text))) <= 500))))),
    CONSTRAINT dsh_order_preparation_alerts_estimate_revision_check CHECK ((estimate_revision >= 0)),
    CONSTRAINT dsh_order_preparation_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text]))),
    CONSTRAINT dsh_order_preparation_alerts_version_check CHECK ((version > 0))
);


--
-- Name: dsh_order_preparation_estimate_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_preparation_estimate_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    from_estimated_ready_at timestamp with time zone NOT NULL,
    to_estimated_ready_at timestamp with time zone NOT NULL,
    remaining_minutes integer NOT NULL,
    reason text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_preparation_estimate_events_reason_check CHECK (((length(btrim(reason)) >= 3) AND (length(btrim(reason)) <= 500))),
    CONSTRAINT dsh_order_preparation_estimate_events_remaining_minutes_check CHECK (((remaining_minutes >= 5) AND (remaining_minutes <= 180)))
);


--
-- Name: dsh_order_preparation_issue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_preparation_issue_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    note text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key text DEFAULT ''::text NOT NULL,
    request_fingerprint text,
    CONSTRAINT dsh_order_preparation_issue_events_event_type_check CHECK ((event_type = ANY (ARRAY['opened'::text, 'customer_decision'::text, 'resolved'::text]))),
    CONSTRAINT dsh_order_preparation_issue_events_note_check CHECK (((length(btrim(note)) >= 3) AND (length(btrim(note)) <= 500))),
    CONSTRAINT dsh_order_preparation_issue_events_to_status_check CHECK ((to_status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: dsh_order_preparation_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_preparation_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    order_item_id uuid,
    issue_kind text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    affected_quantity integer DEFAULT 1 NOT NULL,
    note text NOT NULL,
    replacement_product_id text,
    replacement_product_name text,
    opened_by_actor_id text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_by_actor_id text,
    resolution_note text,
    resolved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_decision text DEFAULT 'not_required'::text NOT NULL,
    customer_decided_by_actor_id text,
    customer_decision_note text,
    customer_decided_at timestamp with time zone,
    CONSTRAINT dsh_order_preparation_issues_affected_quantity_check CHECK ((affected_quantity > 0)),
    CONSTRAINT dsh_order_preparation_issues_check CHECK ((((status = 'open'::text) AND (resolved_by_actor_id IS NULL) AND (resolution_note IS NULL) AND (resolved_at IS NULL)) OR ((status = 'resolved'::text) AND (resolved_by_actor_id IS NOT NULL) AND ((length(btrim(resolution_note)) >= 3) AND (length(btrim(resolution_note)) <= 500)) AND (resolved_at IS NOT NULL)))),
    CONSTRAINT dsh_order_preparation_issues_check1 CHECK (((issue_kind <> 'substitution_required'::text) OR (replacement_product_id IS NOT NULL) OR (length(btrim(COALESCE(replacement_product_name, ''::text))) >= 2))),
    CONSTRAINT dsh_order_preparation_issues_customer_decision_check CHECK ((((issue_kind = 'substitution_required'::text) AND (customer_decision = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) OR ((issue_kind <> 'substitution_required'::text) AND (customer_decision = 'not_required'::text)))),
    CONSTRAINT dsh_order_preparation_issues_customer_decision_shape_check CHECK ((((customer_decision = ANY (ARRAY['not_required'::text, 'pending'::text])) AND (customer_decided_by_actor_id IS NULL) AND (customer_decision_note IS NULL) AND (customer_decided_at IS NULL)) OR ((customer_decision = ANY (ARRAY['approved'::text, 'rejected'::text])) AND (customer_decided_by_actor_id IS NOT NULL) AND (length(btrim(COALESCE(customer_decision_note, ''::text))) <= 500) AND (customer_decided_at IS NOT NULL)))),
    CONSTRAINT dsh_order_preparation_issues_issue_kind_check CHECK ((issue_kind = ANY (ARRAY['missing_item'::text, 'substitution_required'::text, 'quality_issue'::text, 'other'::text]))),
    CONSTRAINT dsh_order_preparation_issues_item_binding_check CHECK (((issue_kind = 'other'::text) OR (order_item_id IS NOT NULL))),
    CONSTRAINT dsh_order_preparation_issues_note_check CHECK (((length(btrim(note)) >= 3) AND (length(btrim(note)) <= 500))),
    CONSTRAINT dsh_order_preparation_issues_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text]))),
    CONSTRAINT dsh_order_preparation_issues_version_check CHECK ((version > 0))
);


--
-- Name: dsh_order_preparation_replacements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_preparation_replacements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issue_id uuid NOT NULL,
    original_item_id uuid NOT NULL,
    proposed_product_id text NOT NULL,
    proposed_product_name text NOT NULL,
    proposed_quantity integer NOT NULL,
    proposed_unit_price numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_preparation_replacements_proposed_quantity_check CHECK ((proposed_quantity > 0)),
    CONSTRAINT dsh_order_preparation_replacements_proposed_unit_price_check CHECK ((proposed_unit_price >= (0)::numeric))
);


--
-- Name: dsh_order_rescue_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_rescue_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rescue_case_id uuid NOT NULL,
    action_type text NOT NULL,
    status text DEFAULT 'pending_approval'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    requested_by text NOT NULL,
    approved_by text,
    executed_by text,
    execution_result jsonb,
    correlation_id text NOT NULL,
    idempotency_key text NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_rescue_actions_action_type_check CHECK ((action_type = ANY (ARRAY['replace_item'::text, 'remove_item'::text, 'wait_customer'::text, 'change_delivery_mode'::text, 'reassign_captain'::text, 'convert_to_support_exception'::text, 'create_follow_up_task'::text, 'open_wlt_visibility'::text]))),
    CONSTRAINT dsh_order_rescue_actions_status_check CHECK ((status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'executing'::text, 'completed'::text, 'failed'::text, 'rejected'::text])))
);


--
-- Name: dsh_order_rescue_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_rescue_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    ticket_id uuid,
    status text DEFAULT 'open'::text NOT NULL,
    reason text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    owner text DEFAULT 'operations'::text NOT NULL,
    next_action text DEFAULT 'create_follow_up_task'::text NOT NULL,
    summary text NOT NULL,
    operator_note text DEFAULT ''::text NOT NULL,
    affected_entity text DEFAULT ''::text NOT NULL,
    assigned_to text,
    opened_by text NOT NULL,
    resolution_note text DEFAULT ''::text NOT NULL,
    create_idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_rescue_cases_next_action_check CHECK ((next_action = ANY (ARRAY['replace_item'::text, 'remove_item'::text, 'wait_customer'::text, 'change_delivery_mode'::text, 'reassign_captain'::text, 'convert_to_support_exception'::text, 'create_follow_up_task'::text, 'open_wlt_visibility'::text]))),
    CONSTRAINT dsh_order_rescue_cases_owner_check CHECK ((owner = ANY (ARRAY['support'::text, 'operations'::text, 'partner'::text, 'captain'::text, 'wlt_reference_only'::text]))),
    CONSTRAINT dsh_order_rescue_cases_reason_check CHECK ((reason = ANY (ARRAY['item_unavailable'::text, 'customer_not_reachable'::text, 'store_closed_after_order'::text, 'captain_no_show'::text, 'captain_declined'::text, 'pickup_failed'::text, 'handoff_mismatch'::text, 'delivery_failed'::text, 'address_issue'::text, 'payment_failure'::text, 'wlt_visibility'::text]))),
    CONSTRAINT dsh_order_rescue_cases_severity_check CHECK ((severity = ANY (ARRAY['warning'::text, 'danger'::text]))),
    CONSTRAINT dsh_order_rescue_cases_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'action_required'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: dsh_order_rescue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_rescue_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rescue_case_id uuid NOT NULL,
    order_id uuid NOT NULL,
    actor_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_rescue_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'decision_recorded'::text, 'status_changed'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: dsh_order_return_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_return_actions (
    id text NOT NULL,
    return_id text NOT NULL,
    actor_id text NOT NULL,
    action_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    evidence_ids text[] DEFAULT '{}'::text[],
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    executed_at timestamp with time zone,
    error_message text,
    CONSTRAINT dsh_order_return_actions_action_check CHECK ((action_type = ANY (ARRAY['start_return'::text, 'provide_info'::text, 'approve'::text, 'reject'::text, 'require_logistics'::text, 'complete'::text, 'refund_wlt'::text]))),
    CONSTRAINT dsh_order_return_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'executed'::text, 'failed'::text])))
);


--
-- Name: dsh_order_return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_return_items (
    return_id text NOT NULL,
    order_item_id uuid NOT NULL,
    quantity bigint NOT NULL,
    CONSTRAINT dsh_order_return_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: dsh_order_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_returns (
    id text NOT NULL,
    order_id uuid NOT NULL,
    status text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    reason_code text NOT NULL,
    reason_note text,
    ticket_reference text,
    correlation_id text NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_returns_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'review'::text, 'needs_info'::text, 'approved'::text, 'rejected'::text, 'returning'::text, 'financial_pending'::text, 'resolved'::text])))
);


--
-- Name: dsh_order_status_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_status_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    actor_role text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    actor_id text DEFAULT ''::text NOT NULL,
    event_type text DEFAULT 'order.status_changed'::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    causation_id text DEFAULT ''::text NOT NULL,
    order_version integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT dsh_order_status_events_actor_role_check CHECK ((actor_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text, 'system'::text]))),
    CONSTRAINT dsh_order_status_events_order_version_check CHECK ((order_version > 0))
);


--
-- Name: dsh_order_truth_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_order_truth_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    actor_id text DEFAULT ''::text NOT NULL,
    actor_role text DEFAULT 'system'::text NOT NULL,
    order_id uuid,
    checkout_intent_id uuid,
    event_type text NOT NULL,
    result_code text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_truth_audit_event_type_check CHECK ((event_type = ANY (ARRAY['order.create_succeeded'::text, 'order.create_replayed'::text, 'order.create_conflict'::text, 'order.idempotency_conflict'::text, 'order.snapshot_write_blocked'::text, 'order.read_denied'::text, 'order.outbox_dead_letter'::text])))
);


--
-- Name: dsh_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkout_intent_id uuid NOT NULL,
    store_id text NOT NULL,
    client_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    wlt_payment_ref_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fulfillment_mode text DEFAULT 'bthwani_delivery'::text NOT NULL,
    subtotal_minor_units bigint DEFAULT 0 NOT NULL,
    discount_minor_units bigint DEFAULT 0 NOT NULL,
    total_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    pricing_snapshot_hash text DEFAULT ''::text NOT NULL,
    coupon_id uuid,
    coupon_redemption_id uuid,
    coupon_code_last4 text DEFAULT ''::text NOT NULL,
    delivery_fee_minor_units bigint DEFAULT 0 NOT NULL,
    operator_context_id text,
    cancellation_reason_code text,
    cancellation_note text,
    cancelled_by_actor_id text,
    cancelled_by_role text,
    cancelled_at timestamp with time zone,
    financial_closure_status text DEFAULT 'not_required'::text NOT NULL,
    financial_closure_reference text,
    accepted_at timestamp with time zone,
    preparation_started_at timestamp with time zone,
    estimated_ready_at timestamp with time zone,
    ready_at timestamp with time zone,
    estimated_preparation_minutes integer DEFAULT 0 NOT NULL,
    preparation_warning_minutes integer DEFAULT 0 NOT NULL,
    preparation_delay_reason text,
    preparation_estimate_revision_count integer DEFAULT 0 NOT NULL,
    order_number text NOT NULL,
    correlation_id text NOT NULL,
    delivery_address_id text,
    delivery_address_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    payment_status_projection text DEFAULT 'unknown'::text NOT NULL,
    payment_projection_updated_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    payment_projection_source_updated_at timestamp with time zone,
    payment_projection_reconciled_at timestamp with time zone,
    partner_deadline_at timestamp with time zone,
    latest_partner_inbox_cursor bigint DEFAULT (EXTRACT(epoch FROM now()))::bigint NOT NULL,
    CONSTRAINT dsh_orders_cancelled_by_role_check CHECK (((cancelled_by_role IS NULL) OR (cancelled_by_role = ANY (ARRAY['client'::text, 'partner'::text, 'operator'::text, 'system'::text])))),
    CONSTRAINT dsh_orders_delivery_fee_minor_units_check CHECK ((delivery_fee_minor_units >= 0)),
    CONSTRAINT dsh_orders_discount_minor_units_check CHECK ((discount_minor_units >= 0)),
    CONSTRAINT dsh_orders_financial_closure_status_check CHECK ((financial_closure_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'session_expired'::text, 'refund_requested'::text, 'refund_completed'::text, 'no_action'::text, 'failed'::text]))),
    CONSTRAINT dsh_orders_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_orders_operator_context_id_chk CHECK (((operator_context_id IS NULL) OR (btrim(operator_context_id) <> ''::text))),
    CONSTRAINT dsh_orders_preparation_timing_check CHECK ((((estimated_preparation_minutes >= 0) AND (estimated_preparation_minutes <= 180)) AND ((preparation_warning_minutes >= 0) AND (preparation_warning_minutes <= 60)) AND (preparation_estimate_revision_count >= 0) AND ((accepted_at IS NULL) OR (estimated_ready_at IS NOT NULL)) AND ((estimated_ready_at IS NULL) OR (accepted_at IS NOT NULL)) AND ((preparation_started_at IS NULL) OR (accepted_at IS NOT NULL)) AND ((ready_at IS NULL) OR (preparation_started_at IS NOT NULL)) AND ((preparation_started_at IS NULL) OR (preparation_started_at >= accepted_at)) AND ((ready_at IS NULL) OR (ready_at >= preparation_started_at)) AND ((accepted_at IS NULL) OR ((estimated_preparation_minutes >= 5) AND (estimated_preparation_minutes <= 180))) AND ((accepted_at IS NULL) OR ((preparation_warning_minutes >= 1) AND (preparation_warning_minutes <= 60))) AND ((accepted_at IS NULL) OR (preparation_warning_minutes < estimated_preparation_minutes)))),
    CONSTRAINT dsh_orders_pricing_totals_chk CHECK ((total_minor_units = GREATEST(((subtotal_minor_units + delivery_fee_minor_units) - discount_minor_units), (0)::bigint))),
    CONSTRAINT dsh_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'store_accepted'::text, 'preparing'::text, 'ready_for_pickup'::text, 'driver_assigned'::text, 'driver_arrived_store'::text, 'store_handoff_confirmed'::text, 'picked_up'::text, 'arrived_customer'::text, 'returning_to_store'::text, 'return_arrived_store'::text, 'returned_to_store'::text, 'delivered'::text, 'cancelled_by_client'::text, 'cancelled_by_store'::text, 'cancelled_by_operator'::text, 'cancelled_no_driver'::text, 'failed_payment'::text, 'failed_dispatch'::text]))),
    CONSTRAINT dsh_orders_subtotal_minor_units_check CHECK ((subtotal_minor_units >= 0)),
    CONSTRAINT dsh_orders_total_minor_units_check CHECK ((total_minor_units >= 0)),
    CONSTRAINT dsh_orders_version_check CHECK ((version > 0))
);


--
-- Name: dsh_partner_activation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_activation_events (
    id text DEFAULT ('pae_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    partner_id text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    actor_id text NOT NULL,
    actor_surface text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    idempotency_key text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_hash text DEFAULT ''::text NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_partner_activation_events_actor_surface_check CHECK ((actor_surface = ANY (ARRAY['app-field'::text, 'app-partner'::text, 'app-captain'::text, 'control-panel'::text, 'system'::text])))
);


--
-- Name: dsh_partner_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_brands (
    id text DEFAULT ('pbr_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    operator_context_id text NOT NULL,
    partner_id text NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'default'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_brands_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_partner_brands_version_check CHECK ((version > 0))
);


--
-- Name: TABLE dsh_partner_brands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_partner_brands IS 'Governed optional commercial identity owned by a partner within one trusted operator context.';


--
-- Name: dsh_partner_courier_connection_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_courier_connection_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id text NOT NULL,
    team_member_id text NOT NULL,
    code_hash text NOT NULL,
    code_last4 text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_by_actor_id text NOT NULL,
    redeemed_by_captain_actor_id text DEFAULT ''::text NOT NULL,
    redeemed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    issue_idempotency_key text DEFAULT ''::text NOT NULL,
    issue_correlation_id text DEFAULT ''::text NOT NULL,
    redeem_idempotency_key text DEFAULT ''::text NOT NULL,
    redeem_correlation_id text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_partner_courier_connection_codes_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'redeemed'::text, 'revoked'::text, 'expired'::text]))),
    CONSTRAINT dsh_partner_courier_connection_codes_version_check CHECK ((version > 0)),
    CONSTRAINT dsh_partner_courier_issue_correlation_length_chk CHECK ((char_length(issue_correlation_id) <= 240)),
    CONSTRAINT dsh_partner_courier_issue_idempotency_length_chk CHECK ((char_length(issue_idempotency_key) <= 240)),
    CONSTRAINT dsh_partner_courier_redeem_correlation_length_chk CHECK ((char_length(redeem_correlation_id) <= 240)),
    CONSTRAINT dsh_partner_courier_redeem_idempotency_length_chk CHECK ((char_length(redeem_idempotency_key) <= 240))
);


--
-- Name: dsh_partner_delivery_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_delivery_audit_events (
    id text DEFAULT ('pdae_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    entity_id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    from_state jsonb,
    to_state jsonb,
    reason text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_partner_delivery_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_delivery_command_receipts (
    actor_id text NOT NULL,
    command_id text NOT NULL,
    action text NOT NULL,
    request_fingerprint text NOT NULL,
    task_id text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_partner_delivery_command_receipts_action_check CHECK ((btrim(action) <> ''::text)),
    CONSTRAINT dsh_partner_delivery_command_receipts_actor_id_check CHECK ((btrim(actor_id) <> ''::text)),
    CONSTRAINT dsh_partner_delivery_command_receipts_command_id_check CHECK ((btrim(command_id) <> ''::text)),
    CONSTRAINT dsh_partner_delivery_command_receipts_operator_context_nonempty CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_partner_delivery_command_receipts_request_fingerprint_check CHECK ((btrim(request_fingerprint) <> ''::text))
);


--
-- Name: dsh_partner_delivery_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_delivery_tasks (
    id text DEFAULT ('pdt_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    branch_id text NOT NULL,
    store_courier_id text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    departed_at timestamp with time zone,
    arrived_at timestamp with time zone,
    proof_method text,
    proof_reference text,
    completed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    exception_reason text,
    exception_evidence_references jsonb DEFAULT '[]'::jsonb NOT NULL,
    exception_reported_at timestamp with time zone,
    CONSTRAINT chk_dsh_partner_delivery_exception_evidence_array CHECK ((jsonb_typeof(exception_evidence_references) = 'array'::text)),
    CONSTRAINT dsh_partner_delivery_tasks_status_check CHECK ((status = ANY (ARRAY['unassigned'::text, 'assigned'::text, 'departed'::text, 'arrived'::text, 'proof_pending'::text, 'completed'::text, 'cancelled'::text, 'exception'::text])))
);


--
-- Name: dsh_partner_document_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_document_reviews (
    id text DEFAULT ('drev_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    document_id text NOT NULL,
    partner_id text NOT NULL,
    reviewed_by_actor_id text NOT NULL,
    decision text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    idempotency_key text,
    request_hash text,
    CONSTRAINT dsh_partner_document_reviews_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'needs_resubmit'::text]))),
    CONSTRAINT dsh_partner_document_reviews_idempotency_pair_chk CHECK ((((idempotency_key IS NULL) AND (request_hash IS NULL)) OR ((idempotency_key IS NOT NULL) AND (request_hash IS NOT NULL))))
);


--
-- Name: dsh_partner_document_taxonomy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_document_taxonomy (
    document_type text NOT NULL,
    document_family text DEFAULT 'legal'::text NOT NULL,
    label_ar text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    expires boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_document_taxonomy_document_family_check CHECK ((document_family = 'legal'::text))
);


--
-- Name: dsh_partner_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_documents (
    id text DEFAULT ('doc_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    partner_id text NOT NULL,
    document_type text NOT NULL,
    document_status text DEFAULT 'pending'::text NOT NULL,
    uploaded_by_actor_id text NOT NULL,
    media_ref text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    rejection_reason text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    upload_status text DEFAULT 'uploaded'::text NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by_actor_id text,
    reviewed_at timestamp with time zone,
    last_review_reason text DEFAULT ''::text NOT NULL,
    supersedes_document_id text,
    idempotency_key text,
    request_hash text,
    correlation_id text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_partner_documents_document_status_check CHECK ((document_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT dsh_partner_documents_document_type_check CHECK ((document_type = ANY (ARRAY['national_id'::text, 'commercial_register'::text, 'freelancer_certificate'::text, 'lease_agreement'::text, 'health_certificate'::text, 'store_photo'::text, 'owner_photo'::text, 'other'::text]))),
    CONSTRAINT dsh_partner_documents_idempotency_pair_chk CHECK ((((idempotency_key IS NULL) AND (request_hash IS NULL)) OR ((idempotency_key IS NOT NULL) AND (request_hash IS NOT NULL)))),
    CONSTRAINT dsh_partner_documents_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'verified'::text, 'rejected'::text, 'reupload_required'::text]))),
    CONSTRAINT dsh_partner_documents_upload_status_check CHECK ((upload_status = 'uploaded'::text))
);


--
-- Name: COLUMN dsh_partner_documents.document_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partner_documents.document_status IS 'Deprecated compatibility projection. Use upload_status and review_status for new reads.';


--
-- Name: COLUMN dsh_partner_documents.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partner_documents.idempotency_key IS 'Canonical create identity for new onboarding document uploads; NULL is legacy history.';


--
-- Name: dsh_partner_field_visit_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_field_visit_media (
    id text DEFAULT ('pfvm_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    partner_id text NOT NULL,
    visit_id text NOT NULL,
    store_id text,
    media_ref text NOT NULL,
    source text DEFAULT 'field_capture'::text NOT NULL,
    captured_by_actor_id text NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    context text DEFAULT 'storefront'::text NOT NULL,
    status text DEFAULT 'uploaded'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_field_visit_media_source_check CHECK ((source = ANY (ARRAY['field_capture'::text, 'field_library'::text]))),
    CONSTRAINT dsh_partner_field_visit_media_status_check CHECK ((status = ANY (ARRAY['uploaded'::text, 'replaced'::text, 'deleted'::text])))
);


--
-- Name: dsh_partner_field_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_field_visits (
    id text DEFAULT ('pfv_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    partner_id text NOT NULL,
    store_id text,
    field_actor_id text NOT NULL,
    visit_status text DEFAULT 'draft'::text NOT NULL,
    visit_notes text DEFAULT ''::text NOT NULL,
    location_latitude numeric(10,7),
    location_longitude numeric(10,7),
    evidence_media_refs text[] DEFAULT ARRAY[]::text[] NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    operator_context_id text NOT NULL,
    idempotency_key text,
    request_hash text,
    correlation_id text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_partner_field_visits_idempotency_pair_chk CHECK ((((idempotency_key IS NULL) AND (request_hash IS NULL)) OR ((idempotency_key IS NOT NULL) AND (request_hash IS NOT NULL)))),
    CONSTRAINT dsh_partner_field_visits_location_chk CHECK ((((location_latitude IS NULL) AND (location_longitude IS NULL)) OR ((location_latitude IS NOT NULL) AND (location_longitude IS NOT NULL)))),
    CONSTRAINT dsh_partner_field_visits_visit_status_check CHECK ((visit_status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'submitted'::text, 'escalated'::text])))
);


--
-- Name: COLUMN dsh_partner_field_visits.evidence_media_refs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partner_field_visits.evidence_media_refs IS 'Deprecated compatibility projection. dsh_partner_field_visit_media is canonical.';


--
-- Name: COLUMN dsh_partner_field_visits.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partner_field_visits.idempotency_key IS 'Canonical create identity for new onboarding field visits; NULL is legacy history.';


--
-- Name: dsh_partner_first_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_first_stores (
    partner_id text NOT NULL,
    store_id text NOT NULL,
    operator_context_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_first_stores_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: dsh_partner_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    partner_name text DEFAULT ''::text NOT NULL,
    store_id text NOT NULL,
    store_label text DEFAULT ''::text NOT NULL,
    product_id text DEFAULT ''::text NOT NULL,
    product_label text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    offer_type text DEFAULT 'discount'::text NOT NULL,
    status text DEFAULT 'inbound'::text NOT NULL,
    source text DEFAULT 'partner'::text NOT NULL,
    value_label text NOT NULL,
    eligibility text DEFAULT 'all'::text NOT NULL,
    active_from_date text DEFAULT ''::text NOT NULL,
    active_to_date text DEFAULT ''::text NOT NULL,
    rejection_reason text DEFAULT ''::text NOT NULL,
    margin_risk_note text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    linked_campaign_id uuid,
    created_by text,
    created_by_surface text DEFAULT 'app-partner'::text NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    coupon_id uuid,
    CONSTRAINT dsh_partner_offers_eligibility_chk CHECK ((eligibility = ANY (ARRAY['all'::text, 'client'::text]))),
    CONSTRAINT dsh_partner_offers_offer_type_check CHECK ((offer_type = ANY (ARRAY['discount'::text, 'free-delivery'::text, 'bundle'::text, 'buy-x-get-y'::text, 'coupon'::text]))),
    CONSTRAINT dsh_partner_offers_rejection_reason_chk CHECK (((status <> 'rejected'::text) OR (btrim(rejection_reason) <> ''::text))),
    CONSTRAINT dsh_partner_offers_schedule_chk CHECK ((((active_from_date = ''::text) AND (active_to_date = ''::text)) OR ((active_from_date ~ '^\d{4}-\d{2}-\d{2}$'::text) AND (active_to_date ~ '^\d{4}-\d{2}-\d{2}$'::text) AND (active_to_date > active_from_date)))),
    CONSTRAINT dsh_partner_offers_source_check CHECK ((source = ANY (ARRAY['partner'::text, 'control-panel'::text]))),
    CONSTRAINT dsh_partner_offers_status_check CHECK ((status = ANY (ARRAY['inbound'::text, 'review'::text, 'marketing-ready'::text, 'published'::text, 'paused'::text, 'rejected'::text, 'archived'::text])))
);


--
-- Name: COLUMN dsh_partner_offers.coupon_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partner_offers.coupon_id IS 'Required for published coupon offers; links marketing presentation to the checkout coupon rule.';


--
-- Name: dsh_partner_order_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_order_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    decision text NOT NULL,
    reason_code text,
    reason_note text,
    idempotency_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_fingerprint text NOT NULL,
    CONSTRAINT dsh_partner_order_decisions_decision_check CHECK ((decision = ANY (ARRAY['accept'::text, 'reject'::text])))
);


--
-- Name: dsh_partner_order_transition_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_order_transition_receipts (
    store_id text NOT NULL,
    order_id uuid NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    expected_version integer NOT NULL,
    result_version integer NOT NULL,
    actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_order_transition_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_partner_order_transition_receipts_expected_version_check CHECK ((expected_version > 0)),
    CONSTRAINT dsh_partner_order_transition_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_partner_order_transition_receipts_operation_check CHECK ((operation = ANY (ARRAY['prepare'::text, 'ready'::text]))),
    CONSTRAINT dsh_partner_order_transition_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_partner_order_transition_receipts_result_version_check CHECK ((result_version > 0))
);


--
-- Name: dsh_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partners (
    id text DEFAULT ('prt_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    legal_name_ar text NOT NULL,
    legal_name_en text DEFAULT ''::text NOT NULL,
    display_name text NOT NULL,
    legal_identity_type text DEFAULT 'commercial_register'::text NOT NULL,
    legal_identity_number text NOT NULL,
    owner_name text DEFAULT ''::text NOT NULL,
    primary_phone text NOT NULL,
    secondary_phone text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'default'::text NOT NULL,
    activation_status text DEFAULT 'draft'::text NOT NULL,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    created_by_surface text DEFAULT 'app-field'::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    beneficiary_name text DEFAULT ''::text NOT NULL,
    bank_account_holder_matches_owner boolean DEFAULT false NOT NULL,
    bank_notes text DEFAULT ''::text NOT NULL,
    payout_destination_id text DEFAULT ''::text NOT NULL,
    operator_context_id text NOT NULL,
    destination_method text DEFAULT ''::text NOT NULL,
    masked_destination_reference text DEFAULT ''::text NOT NULL,
    destination_verification_status text DEFAULT 'unverified'::text NOT NULL,
    archived_at timestamp with time zone,
    owner_actor_id text DEFAULT ''::text NOT NULL,
    workforce_person_id text DEFAULT ''::text NOT NULL,
    onboarding_case_status text DEFAULT 'draft'::text NOT NULL,
    business_vertical_id text,
    CONSTRAINT dsh_partners_activation_status_check CHECK ((activation_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'field_visit_scheduled'::text, 'field_visit_completed'::text, 'documents_missing'::text, 'documents_uploaded'::text, 'documents_verified'::text, 'catalog_not_ready'::text, 'catalog_ready'::text, 'delivery_modes_not_ready'::text, 'delivery_modes_ready'::text, 'ops_review'::text, 'ops_approved'::text, 'ops_rejected'::text, 'partner_active'::text, 'partner_suspended'::text, 'partner_terminated'::text, 'client_visible'::text, 'client_hidden'::text]))),
    CONSTRAINT dsh_partners_category_check CHECK ((category = ANY (ARRAY['restaurant'::text, 'grocery'::text, 'pharmacy'::text, 'bakery'::text, 'default'::text]))),
    CONSTRAINT dsh_partners_created_by_surface_check CHECK ((created_by_surface = ANY (ARRAY['app-field'::text, 'control-panel'::text, 'system'::text]))),
    CONSTRAINT dsh_partners_destination_verification_status_chk CHECK ((destination_verification_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT dsh_partners_legal_identity_type_check CHECK ((legal_identity_type = ANY (ARRAY['commercial_register'::text, 'national_id'::text, 'freelancer_certificate'::text]))),
    CONSTRAINT dsh_partners_onboarding_case_status_check CHECK ((onboarding_case_status = ANY (ARRAY['draft'::text, 'duplicate_suspected'::text, 'validation_failed'::text, 'evidence_pending'::text, 'unknown_result'::text, 'submitted'::text]))),
    CONSTRAINT dsh_partners_operatorcontext_nonempty CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: COLUMN dsh_partners.owner_actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partners.owner_actor_id IS 'Authenticated partner owner actor reference; empty only for incomplete legacy or draft onboarding.';


--
-- Name: COLUMN dsh_partners.workforce_person_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_partners.workforce_person_id IS 'Workforce person reference captured by governed onboarding; empty when ownership is actor-backed.';


--
-- Name: dsh_store_assortment_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_assortment_inventory (
    store_assortment_id text NOT NULL,
    policy_type text DEFAULT 'signal'::text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    min_order_quantity integer DEFAULT 1 NOT NULL,
    max_order_quantity integer DEFAULT 100 NOT NULL,
    step_quantity integer DEFAULT 1 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_assortment_inventory_check CHECK (((reserved_quantity >= 0) AND (reserved_quantity <= quantity))),
    CONSTRAINT dsh_store_assortment_inventory_check1 CHECK ((max_order_quantity >= min_order_quantity)),
    CONSTRAINT dsh_store_assortment_inventory_min_order_quantity_check CHECK ((min_order_quantity >= 1)),
    CONSTRAINT dsh_store_assortment_inventory_policy_type_check CHECK ((policy_type = ANY (ARRAY['signal'::text, 'quantity'::text, 'infinite'::text]))),
    CONSTRAINT dsh_store_assortment_inventory_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT dsh_store_assortment_inventory_step_quantity_check CHECK ((step_quantity >= 1))
);


--
-- Name: dsh_store_assortment_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_assortment_prices (
    id text NOT NULL,
    store_assortment_id text NOT NULL,
    amount_minor integer NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    prep_time_min integer DEFAULT 0 NOT NULL,
    prep_time_max integer DEFAULT 0 NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_until timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_assortment_prices_amount_minor_check CHECK ((amount_minor >= 0)),
    CONSTRAINT dsh_store_assortment_prices_check CHECK ((prep_time_max >= prep_time_min)),
    CONSTRAINT dsh_store_assortment_prices_prep_time_min_check CHECK ((prep_time_min >= 0))
);


--
-- Name: dsh_store_assortments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_assortments (
    id text NOT NULL,
    store_id text NOT NULL,
    master_product_id text NOT NULL,
    local_note text DEFAULT ''::text NOT NULL,
    custom_image_object_key text,
    publication_status text DEFAULT 'draft'::text NOT NULL,
    submitted_by text DEFAULT ''::text NOT NULL,
    approved_by text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    pause_reason text DEFAULT ''::text NOT NULL,
    paused_until timestamp with time zone,
    paused_at timestamp with time zone,
    paused_by text,
    CONSTRAINT ck_dsh_store_assortments_pause_reason CHECK (((paused_at IS NULL) OR (btrim(pause_reason) <> ''::text))),
    CONSTRAINT dsh_store_assortments_publication_status_check CHECK ((publication_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'client_visible'::text, 'rejected'::text, 'hidden'::text])))
);


--
-- Name: dsh_store_catalog_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_catalog_domains (
    store_id text NOT NULL,
    domain_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_catalog_domains_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])))
);


--
-- Name: dsh_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_stores (
    id text NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    status text NOT NULL,
    city_code text NOT NULL,
    service_area_code text NOT NULL,
    serviceability_status text NOT NULL,
    rating_average numeric(3,2),
    rating_count integer DEFAULT 0 NOT NULL,
    delivery_eta_min integer,
    delivery_eta_max integer,
    is_visible boolean DEFAULT true NOT NULL,
    hero_image_url text,
    logo_url text,
    delivery_modes text[] DEFAULT ARRAY['delivery'::text] NOT NULL,
    is_free_delivery boolean DEFAULT false NOT NULL,
    distance_km numeric(6,2),
    follower_count integer DEFAULT 0 NOT NULL,
    has_pro_badge boolean DEFAULT false NOT NULL,
    has_coupon_badge boolean DEFAULT false NOT NULL,
    points_multiplier integer,
    is_popular boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    version integer DEFAULT 1 NOT NULL,
    partner_readiness text DEFAULT 'pending'::text NOT NULL,
    catalog_approval_status text DEFAULT 'draft'::text NOT NULL,
    marketing_visibility text DEFAULT 'hidden'::text NOT NULL,
    partner_id text,
    address_line text DEFAULT ''::text NOT NULL,
    coverage_summary text DEFAULT ''::text NOT NULL,
    operating_hours text DEFAULT ''::text NOT NULL,
    delivery_readiness text DEFAULT ''::text NOT NULL,
    storefront_photo_ref text DEFAULT ''::text,
    interior_photo_ref text DEFAULT ''::text,
    signage_photo_ref text DEFAULT ''::text,
    catalog_domain_id text DEFAULT 'domain-bthwani-store'::text NOT NULL,
    operator_context_id text NOT NULL,
    brand_id text,
    visibility_status text GENERATED ALWAYS AS (
CASE
    WHEN ((is_visible = true) AND (status = 'published'::text) AND (serviceability_status = ANY (ARRAY['serviceable'::text, 'limited'::text])) AND (partner_readiness = 'ready'::text) AND (catalog_approval_status = 'approved'::text) AND (marketing_visibility = 'visible'::text)) THEN 'visible'::text
    ELSE 'hidden'::text
END) STORED,
    CONSTRAINT dsh_stores_catalog_approval_chk CHECK ((catalog_approval_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT dsh_stores_delivery_modes_chk CHECK ((delivery_modes <@ ARRAY['delivery'::text, 'pickup'::text, 'express'::text])),
    CONSTRAINT dsh_stores_distance_chk CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT dsh_stores_eta_chk CHECK (((delivery_eta_min IS NULL) OR (delivery_eta_max IS NULL) OR (delivery_eta_min <= delivery_eta_max))),
    CONSTRAINT dsh_stores_follower_count_chk CHECK ((follower_count >= 0)),
    CONSTRAINT dsh_stores_marketing_visibility_chk CHECK ((marketing_visibility = ANY (ARRAY['hidden'::text, 'visible'::text]))),
    CONSTRAINT dsh_stores_operatorcontext_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_stores_partner_readiness_chk CHECK ((partner_readiness = ANY (ARRAY['pending'::text, 'ready'::text, 'blocked'::text]))),
    CONSTRAINT dsh_stores_points_multiplier_chk CHECK (((points_multiplier IS NULL) OR (points_multiplier >= 1))),
    CONSTRAINT dsh_stores_rating_average_chk CHECK (((rating_average IS NULL) OR ((rating_average >= (0)::numeric) AND (rating_average <= (5)::numeric)))),
    CONSTRAINT dsh_stores_rating_count_chk CHECK ((rating_count >= 0)),
    CONSTRAINT dsh_stores_serviceability_chk CHECK ((serviceability_status = ANY (ARRAY['serviceable'::text, 'limited'::text, 'out_of_area'::text, 'unavailable'::text]))),
    CONSTRAINT dsh_stores_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'published'::text, 'paused'::text, 'suspended'::text, 'closed'::text]))),
    CONSTRAINT dsh_stores_version_positive_chk CHECK ((version >= 1)),
    CONSTRAINT dsh_stores_visibility_status_projection_check CHECK ((visibility_status = ANY (ARRAY['visible'::text, 'hidden'::text])))
);


--
-- Name: dsh_partner_store_readiness_v; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.dsh_partner_store_readiness_v AS
 WITH gate_inputs AS (
         SELECT s.operator_context_id,
            s.partner_id,
            s.id AS store_id,
            s.display_name,
            s.status,
            s.is_visible,
            s.serviceability_status,
            s.partner_readiness,
            s.catalog_approval_status,
            s.marketing_visibility,
            s.delivery_modes,
            s.address_line,
            s.coverage_summary,
            s.operating_hours,
            s.delivery_readiness,
            (EXISTS ( SELECT 1
                   FROM public.dsh_partners partner
                  WHERE ((partner.id = s.partner_id) AND (partner.activation_status = 'client_visible'::text) AND (partner.archived_at IS NULL)))) AS partner_client_visible,
            (EXISTS ( SELECT 1
                   FROM (((((public.dsh_store_assortments assortment
                     JOIN public.dsh_store_assortment_inventory inventory ON ((inventory.store_assortment_id = assortment.id)))
                     JOIN public.dsh_master_products product ON ((product.id = assortment.master_product_id)))
                     JOIN public.dsh_catalog_domains domain ON ((domain.id = product.domain_id)))
                     JOIN public.dsh_store_catalog_domains store_domain ON (((store_domain.store_id = assortment.store_id) AND (store_domain.domain_id = product.domain_id))))
                     JOIN LATERAL ( SELECT price.amount_minor,
                            price.currency
                           FROM public.dsh_store_assortment_prices price
                          WHERE ((price.store_assortment_id = assortment.id) AND (price.effective_from <= now()) AND ((price.effective_until IS NULL) OR (price.effective_until > now())))
                          ORDER BY price.effective_from DESC, price.version DESC, price.id DESC
                         LIMIT 1) current_price ON (true))
                  WHERE ((assortment.store_id = s.id) AND (assortment.publication_status = 'client_visible'::text) AND (current_price.amount_minor > 0) AND (length(btrim(current_price.currency)) = 3) AND ((inventory.policy_type = 'infinite'::text) OR ((inventory.quantity - inventory.reserved_quantity) >= GREATEST(inventory.min_order_quantity, 1))) AND (product.approval_status = 'approved'::text) AND (product.is_active = true) AND (domain.is_active = true) AND (domain.is_client_visible = true) AND (store_domain.status = 'approved'::text)))) AS approved_assortment
           FROM public.dsh_stores s
          WHERE (s.partner_id IS NOT NULL)
        ), diagnosed AS (
         SELECT gate_inputs.operator_context_id,
            gate_inputs.partner_id,
            gate_inputs.store_id,
            gate_inputs.display_name,
            gate_inputs.status,
            gate_inputs.is_visible,
            gate_inputs.serviceability_status,
            gate_inputs.partner_readiness,
            gate_inputs.catalog_approval_status,
            gate_inputs.marketing_visibility,
            gate_inputs.delivery_modes,
            gate_inputs.address_line,
            gate_inputs.coverage_summary,
            gate_inputs.operating_hours,
            gate_inputs.delivery_readiness,
            gate_inputs.partner_client_visible,
            gate_inputs.approved_assortment,
            array_remove(ARRAY[
                CASE
                    WHEN (gate_inputs.status <> 'published'::text) THEN 'STORE_NOT_PUBLISHED'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.is_visible = false) THEN 'STORE_HIDDEN'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.serviceability_status <> ALL (ARRAY['serviceable'::text, 'limited'::text])) THEN 'STORE_NOT_SERVICEABLE'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.partner_readiness <> 'ready'::text) THEN 'PARTNER_NOT_READY'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.partner_client_visible = false) THEN 'PARTNER_NOT_CLIENT_VISIBLE'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.catalog_approval_status <> 'approved'::text) THEN 'CATALOG_NOT_APPROVED'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.approved_assortment = false) THEN 'APPROVED_ASSORTMENT_MISSING'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.marketing_visibility <> 'visible'::text) THEN 'MARKETING_HIDDEN'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (COALESCE(cardinality(gate_inputs.delivery_modes), 0) = 0) THEN 'DELIVERY_MODES_MISSING'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (btrim(COALESCE(gate_inputs.address_line, ''::text)) = ''::text) THEN 'ADDRESS_MISSING'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (btrim(COALESCE(gate_inputs.coverage_summary, ''::text)) = ''::text) THEN 'COVERAGE_MISSING'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (btrim(COALESCE(gate_inputs.operating_hours, ''::text)) = ''::text) THEN 'OPERATING_HOURS_MISSING'::text
                    ELSE NULL::text
                END,
                CASE
                    WHEN (gate_inputs.delivery_readiness <> 'ready'::text) THEN 'DELIVERY_NOT_READY'::text
                    ELSE NULL::text
                END], NULL::text) AS blocking_reason_codes
           FROM gate_inputs
        )
 SELECT operator_context_id,
    partner_id,
    store_id,
    display_name,
    status,
        CASE
            WHEN (cardinality(blocking_reason_codes) = 0) THEN 'PUBLISHED'::text
            ELSE 'BLOCKED'::text
        END AS publication_decision,
    blocking_reason_codes
   FROM diagnosed;


--
-- Name: dsh_partner_store_transfer_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_store_transfer_audit (
    id text DEFAULT ('psta_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    operator_context_id text NOT NULL,
    store_id text NOT NULL,
    from_partner_id text,
    to_partner_id text NOT NULL,
    actor_id text NOT NULL,
    actor_surface text DEFAULT 'control-panel'::text NOT NULL,
    reason text NOT NULL,
    expected_store_version integer NOT NULL,
    resulting_store_version integer NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_store_transfer_audit_check CHECK ((resulting_store_version > expected_store_version)),
    CONSTRAINT dsh_partner_store_transfer_audit_expected_store_version_check CHECK ((expected_store_version > 0)),
    CONSTRAINT dsh_partner_store_transfer_audit_reason_check CHECK ((char_length(btrim(reason)) >= 5))
);


--
-- Name: dsh_partner_wlt_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_wlt_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id text NOT NULL,
    activation_event_id text NOT NULL,
    event_type text NOT NULL,
    actor_id text NOT NULL,
    correlation_id text NOT NULL,
    idempotency_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_partner_wlt_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_partner_wlt_outbox_event_type_check CHECK ((event_type = 'deactivate_payout_destination'::text)),
    CONSTRAINT dsh_partner_wlt_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry'::text, 'delivered'::text, 'dead_letter'::text])))
);


--
-- Name: dsh_partner_wlt_reconciliation_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_partner_wlt_reconciliation_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id text NOT NULL,
    issue_type text NOT NULL,
    dsh_payout_destination_id text DEFAULT ''::text NOT NULL,
    wlt_payout_destination_id text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    first_detected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolution_note text DEFAULT ''::text NOT NULL,
    wlt_destination_method text DEFAULT ''::text NOT NULL,
    wlt_masked_destination_reference text DEFAULT ''::text NOT NULL,
    wlt_destination_verification_status text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_partner_wlt_reconciliation_cases_issue_type_check CHECK ((issue_type = ANY (ARRAY['dsh_reference_missing'::text, 'wlt_destination_missing'::text, 'reference_mismatch'::text, 'masked_readback_mismatch'::text]))),
    CONSTRAINT dsh_partner_wlt_reconciliation_cases_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: dsh_pickup_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_pickup_audit_events (
    id text DEFAULT ('pkae_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    entity_id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    from_state jsonb,
    to_state jsonb,
    reason text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_pickup_mutation_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_pickup_mutation_commands (
    command_id text NOT NULL,
    order_id uuid NOT NULL,
    action text NOT NULL,
    expected_version integer NOT NULL,
    response_status integer,
    response_body jsonb,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_pickup_mutation_commands_action_check CHECK ((action = ANY (ARRAY['mark_ready'::text, 'notify_customer'::text, 'customer_arrived'::text, 'verify_otp'::text, 'no_show'::text, 'extend_window'::text, 'reschedule'::text]))),
    CONSTRAINT dsh_pickup_mutation_commands_completion_shape_check CHECK ((((completed_at IS NULL) AND (response_status IS NULL) AND (response_body IS NULL)) OR ((completed_at IS NOT NULL) AND ((response_status >= 200) AND (response_status <= 299)) AND (response_body IS NOT NULL)))),
    CONSTRAINT dsh_pickup_mutation_commands_expected_version_check CHECK ((expected_version >= 0))
);


--
-- Name: dsh_pickup_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_pickup_sessions (
    id text DEFAULT ('pses_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    client_id uuid NOT NULL,
    hashed_otp text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    used_at timestamp with time zone,
    verified_by_actor_id text,
    verification_method text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    customer_notified_at timestamp with time zone,
    customer_arrived_at timestamp with time zone,
    no_show_at timestamp with time zone,
    no_show_reason text,
    rescheduled_at timestamp with time zone,
    extension_count integer DEFAULT 0 NOT NULL,
    max_extensions integer DEFAULT 2 NOT NULL,
    CONSTRAINT dsh_pickup_sessions_cancellation_shape_check CHECK ((((status = 'cancelled'::text) AND (cancelled_at IS NOT NULL) AND (NULLIF(btrim(cancellation_reason), ''::text) IS NOT NULL) AND (used_at IS NULL) AND (verification_method IS NULL)) OR ((status <> 'cancelled'::text) AND (cancelled_at IS NULL)))),
    CONSTRAINT dsh_pickup_sessions_no_show_shape_check CHECK ((((status = 'no_show'::text) AND (no_show_at IS NOT NULL) AND (NULLIF(btrim(no_show_reason), ''::text) IS NOT NULL)) OR ((status <> 'no_show'::text) AND (no_show_at IS NULL) AND (no_show_reason IS NULL)))),
    CONSTRAINT dsh_pickup_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'verified'::text, 'no_show'::text, 'consumed'::text, 'cancelled'::text])))
);


--
-- Name: dsh_pickup_sla_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_pickup_sla_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    leg text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_by_actor_id text,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    correlation_id text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_pickup_sla_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])))
);


--
-- Name: dsh_platform_capacity_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_capacity_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    max_concurrent_orders integer NOT NULL,
    max_captains_online integer NOT NULL,
    throttle_threshold double precision NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    pause_reason text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_platform_capacity_configs_max_captains_online_check CHECK (((max_captains_online >= 0) AND (max_captains_online <= 1000000))),
    CONSTRAINT dsh_platform_capacity_configs_max_concurrent_orders_check CHECK (((max_concurrent_orders >= 1) AND (max_concurrent_orders <= 1000000))),
    CONSTRAINT dsh_platform_capacity_configs_throttle_threshold_check CHECK (((throttle_threshold >= (0)::double precision) AND (throttle_threshold <= (1)::double precision))),
    CONSTRAINT dsh_platform_capacity_configs_version_check CHECK ((version >= 1)),
    CONSTRAINT dsh_platform_capacity_configs_version_positive CHECK ((version >= 1)),
    CONSTRAINT dsh_platform_capacity_pause_reason_length CHECK ((char_length(pause_reason) <= 500))
);


--
-- Name: dsh_platform_delivery_mode_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_delivery_mode_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    fulfillment_mode text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    sla_category text DEFAULT 'default'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_platform_delivery_mode_policies_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'client_pickup'::text]))),
    CONSTRAINT dsh_platform_delivery_mode_policies_sla_category_check CHECK (((char_length(btrim(sla_category)) >= 1) AND (char_length(btrim(sla_category)) <= 120))),
    CONSTRAINT dsh_platform_delivery_mode_policies_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_platform_notification_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_notification_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic text NOT NULL,
    actor_types text[] DEFAULT '{}'::text[] NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    description text,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_channels text[] DEFAULT ARRAY['in_app'::text] NOT NULL,
    title_ar text DEFAULT ''::text NOT NULL,
    body_ar text DEFAULT ''::text NOT NULL,
    title_en text DEFAULT ''::text NOT NULL,
    body_en text DEFAULT ''::text NOT NULL,
    variables text[] DEFAULT '{}'::text[] NOT NULL,
    deep_link_pattern text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_mandatory boolean DEFAULT false NOT NULL,
    CONSTRAINT dsh_platform_notification_config_actor_types_check CHECK ((actor_types <@ ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text, 'operator'::text])),
    CONSTRAINT dsh_platform_notification_config_channels_check CHECK (((cardinality(default_channels) > 0) AND (default_channels <@ ARRAY['in_app'::text, 'push'::text])))
);


--
-- Name: dsh_platform_policy_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_policy_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    action text NOT NULL,
    actor_id text NOT NULL,
    actor_surface text NOT NULL,
    correlation_id text,
    reason text NOT NULL,
    from_version integer,
    to_version integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_platform_policy_events_action_allowed CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'activated'::text, 'deactivated'::text, 'rolled_back'::text]))),
    CONSTRAINT dsh_platform_policy_events_aggregate_type_allowed CHECK ((aggregate_type = ANY (ARRAY['zone'::text, 'sla_rule'::text, 'capacity_config'::text, 'delivery_mode'::text, 'store_onboarding_fee'::text]))),
    CONSTRAINT dsh_platform_policy_events_reason_check CHECK (((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500))),
    CONSTRAINT dsh_platform_policy_events_to_version_check CHECK ((to_version >= 1))
);


--
-- Name: dsh_platform_policy_mutation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_policy_mutation_results (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_platform_sla_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_sla_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    category text NOT NULL,
    max_prep_mins integer DEFAULT 30 NOT NULL,
    max_delivery_mins integer DEFAULT 60 NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    max_assignment_mins integer DEFAULT 10 NOT NULL,
    warning_before_mins integer DEFAULT 5 NOT NULL,
    pickup_notify_mins integer DEFAULT 10 NOT NULL,
    pickup_arrival_mins integer DEFAULT 60 NOT NULL,
    pickup_verify_mins integer DEFAULT 10 NOT NULL,
    delivery_assign_to_pickup_mins integer DEFAULT 15 NOT NULL,
    delivery_pickup_to_depart_mins integer DEFAULT 10 NOT NULL,
    delivery_depart_to_arrive_mins integer DEFAULT 45 NOT NULL,
    delivery_arrive_to_proof_mins integer DEFAULT 15 NOT NULL,
    CONSTRAINT dsh_platform_sla_assignment_bounds CHECK (((max_assignment_mins >= 1) AND (max_assignment_mins <= 1440))),
    CONSTRAINT dsh_platform_sla_rules_bounds CHECK ((((char_length(btrim(category)) >= 1) AND (char_length(btrim(category)) <= 120)) AND ((max_prep_mins >= 1) AND (max_prep_mins <= 1440)) AND ((max_delivery_mins >= 1) AND (max_delivery_mins <= 1440)) AND (version >= 1))),
    CONSTRAINT dsh_platform_sla_stage_bounds CHECK ((((warning_before_mins >= 1) AND (warning_before_mins <= 1440)) AND ((pickup_notify_mins >= 1) AND (pickup_notify_mins <= 1440)) AND ((pickup_arrival_mins >= 1) AND (pickup_arrival_mins <= 1440)) AND ((pickup_verify_mins >= 1) AND (pickup_verify_mins <= 1440)) AND ((delivery_assign_to_pickup_mins >= 1) AND (delivery_assign_to_pickup_mins <= 1440)) AND ((delivery_pickup_to_depart_mins >= 1) AND (delivery_pickup_to_depart_mins <= 1440)) AND ((delivery_depart_to_arrive_mins >= 1) AND (delivery_depart_to_arrive_mins <= 1440)) AND ((delivery_arrive_to_proof_mins >= 1) AND (delivery_arrive_to_proof_mins <= 1440))))
);


--
-- Name: dsh_platform_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_platform_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    service_area_code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT dsh_platform_zones_name_length CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 160))),
    CONSTRAINT dsh_platform_zones_service_area_length CHECK (((char_length(btrim(service_area_code)) >= 1) AND (char_length(btrim(service_area_code)) <= 80))),
    CONSTRAINT dsh_platform_zones_version_positive CHECK ((version >= 1))
);


--
-- Name: dsh_product_duplicate_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_product_duplicate_candidates (
    id text NOT NULL,
    proposal_id text,
    candidate_master_product_id text,
    reason text NOT NULL,
    score numeric(6,4) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_product_duplicate_candidates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted_existing'::text, 'rejected_not_duplicate'::text, 'merged'::text])))
);


--
-- Name: dsh_product_proposal_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_product_proposal_audit (
    id text NOT NULL,
    proposal_id text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_product_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_product_proposals (
    id text NOT NULL,
    proposed_name_ar text NOT NULL,
    proposed_name_en text DEFAULT ''::text NOT NULL,
    domain_id text NOT NULL,
    category_node_id text,
    brand text DEFAULT ''::text NOT NULL,
    barcode text,
    image_object_key text,
    source_surface text NOT NULL,
    source_actor_id text DEFAULT ''::text NOT NULL,
    source_store_id text,
    status text DEFAULT 'submitted'::text NOT NULL,
    review_note text DEFAULT ''::text NOT NULL,
    adopted_master_product_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    review_stage text DEFAULT 'partner-review'::text NOT NULL,
    partner_reviewed_by text,
    marketing_reviewed_by text,
    catalog_adopted_by text,
    catalog_approved_by text,
    client_visible_at timestamp with time zone,
    audit_required boolean DEFAULT false NOT NULL,
    blocked_reason text,
    resubmission_count integer DEFAULT 0 NOT NULL,
    linked_store_id text,
    target_master_product_id text,
    base_version integer,
    duplicate_candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_dsh_product_proposals_status CHECK ((status = ANY (ARRAY['catalog-draft'::text, 'partner-proposed'::text, 'partner-review'::text, 'marketing-review'::text, 'catalog-adopted'::text, 'catalog-approved'::text, 'client-visible'::text, 'needs-fix'::text, 'rejected'::text, 'conflict'::text, 'withdrawn'::text]))),
    CONSTRAINT dsh_product_proposals_source_surface_check CHECK ((source_surface = ANY (ARRAY['app-field'::text, 'app-partner'::text, 'control-panel-catalog'::text, 'control-panel-platform'::text])))
);


--
-- Name: dsh_promotion_funding_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_promotion_funding_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    operator_context_id text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    coupon_redemption_id uuid NOT NULL,
    wlt_funding_reservation_id text,
    order_id uuid,
    reason text DEFAULT ''::text NOT NULL,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT dsh_promotion_funding_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_promotion_funding_outbox_event_type_check CHECK ((event_type = ANY (ARRAY['commit'::text, 'release'::text, 'reverse'::text, 'reserve_then_release'::text]))),
    CONSTRAINT dsh_promotion_funding_outbox_order_chk CHECK ((((event_type = 'release'::text) AND (order_id IS NULL) AND (btrim(reason) <> ''::text) AND (btrim(wlt_funding_reservation_id) <> ''::text)) OR ((event_type = 'commit'::text) AND (order_id IS NOT NULL) AND (btrim(wlt_funding_reservation_id) <> ''::text)) OR ((event_type = 'reverse'::text) AND (order_id IS NOT NULL) AND (btrim(reason) <> ''::text) AND (btrim(wlt_funding_reservation_id) <> ''::text)) OR ((event_type = 'reserve_then_release'::text) AND (order_id IS NULL) AND (btrim(reason) <> ''::text) AND (wlt_funding_reservation_id IS NULL)))),
    CONSTRAINT dsh_promotion_funding_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT dsh_promotion_funding_outbox_wlt_funding_reservation_id_check CHECK ((btrim(wlt_funding_reservation_id) <> ''::text))
);


--
-- Name: COLUMN dsh_promotion_funding_outbox.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_promotion_funding_outbox.status IS 'pending: awaiting delivery to WLT. sent: delivered. failed: exhausted 15 retry attempts and requires manual/operator intervention.';


--
-- Name: dsh_provider_availability_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_provider_availability_projections (
    operator_context_id text NOT NULL,
    notice_id text NOT NULL,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    notice_type text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    source_updated_at timestamp with time zone NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    source_version bigint NOT NULL,
    idempotency_key text NOT NULL,
    CONSTRAINT dsh_provider_availability_projections_actor_id_check CHECK ((btrim(actor_id) <> ''::text)),
    CONSTRAINT dsh_provider_availability_projections_actor_type_check CHECK ((actor_type = ANY (ARRAY['captain'::text, 'field'::text]))),
    CONSTRAINT dsh_provider_availability_projections_check CHECK ((ends_at > starts_at)),
    CONSTRAINT dsh_provider_availability_projections_idempotency_identity_chec CHECK ((idempotency_key = format('workforce-availability-v1:%s:%s:%s'::text, operator_context_id, notice_id, source_version))),
    CONSTRAINT dsh_provider_availability_projections_idempotency_key_check CHECK ((NULLIF(btrim(idempotency_key), ''::text) IS NOT NULL)),
    CONSTRAINT dsh_provider_availability_projections_notice_id_check CHECK ((btrim(notice_id) <> ''::text)),
    CONSTRAINT dsh_provider_availability_projections_notice_type_check CHECK ((btrim(notice_type) <> ''::text)),
    CONSTRAINT dsh_provider_availability_projections_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_provider_availability_projections_source_version_check CHECK ((source_version > 0)),
    CONSTRAINT dsh_provider_availability_projections_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text])))
);


--
-- Name: TABLE dsh_provider_availability_projections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_provider_availability_projections IS 'Read-only DSH projection of Workforce provider notices used for dispatch and capacity decisions.';


--
-- Name: COLUMN dsh_provider_availability_projections.source_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_provider_availability_projections.source_version IS 'Monotonic version issued by the Workforce availability notice; the only ordering authority.';


--
-- Name: COLUMN dsh_provider_availability_projections.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_provider_availability_projections.idempotency_key IS 'Deterministic Workforce delivery identity for OperatorContext + notice + source_version.';


--
-- Name: dsh_provider_rating_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_provider_rating_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rating_id uuid NOT NULL,
    operator_context_id text DEFAULT 'default'::text NOT NULL,
    action text NOT NULL,
    actor_id text NOT NULL,
    score smallint NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
    moderation_status text DEFAULT 'pending'::text NOT NULL,
    fraud_signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    partner_response text DEFAULT ''::text NOT NULL,
    dispute_reason text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_provider_rating_events_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'retracted'::text]))),
    CONSTRAINT dsh_provider_rating_events_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: dsh_provider_rating_mutation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_provider_rating_mutation_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    order_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    captain_rating_id uuid NOT NULL,
    order_rating_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_provider_rating_mutation_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_provider_rating_receipt_correlation_chk CHECK (((length(btrim(correlation_id)) >= 1) AND (length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_provider_rating_receipt_key_chk CHECK (((length(btrim(idempotency_key)) >= 16) AND (length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_provider_rating_receipt_pair_chk CHECK ((captain_rating_id <> order_rating_id))
);


--
-- Name: dsh_provider_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_provider_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text DEFAULT 'default'::text NOT NULL,
    rater_kind text NOT NULL,
    rater_actor_id text NOT NULL,
    target_kind text NOT NULL,
    target_actor_id text DEFAULT ''::text NOT NULL,
    source_kind text NOT NULL,
    source_id text NOT NULL,
    score smallint NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
    fraud_signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    moderation_status text DEFAULT 'pending'::text NOT NULL,
    partner_response text DEFAULT ''::text NOT NULL,
    dispute_reason text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_provider_ratings_comment_check CHECK ((char_length(comment) <= 1000)),
    CONSTRAINT dsh_provider_ratings_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'disputed'::text]))),
    CONSTRAINT dsh_provider_ratings_rater_kind_check CHECK ((rater_kind = ANY (ARRAY['partner'::text, 'client'::text]))),
    CONSTRAINT dsh_provider_ratings_score_check CHECK (((score >= 1) AND (score <= 5))),
    CONSTRAINT dsh_provider_ratings_source_kind_check CHECK ((source_kind = ANY (ARRAY['partner_activation'::text, 'order_delivery'::text]))),
    CONSTRAINT dsh_provider_ratings_source_target_chk CHECK ((((source_kind = 'partner_activation'::text) AND (target_kind = 'field'::text) AND (rater_kind = 'partner'::text)) OR ((source_kind = 'order_delivery'::text) AND (target_kind = ANY (ARRAY['captain'::text, 'order'::text])) AND (rater_kind = 'client'::text)))),
    CONSTRAINT dsh_provider_ratings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'retracted'::text]))),
    CONSTRAINT dsh_provider_ratings_target_actor_chk CHECK ((((target_kind = 'order'::text) AND (target_actor_id = ''::text)) OR ((target_kind = ANY (ARRAY['field'::text, 'captain'::text])) AND (target_actor_id <> ''::text)))),
    CONSTRAINT dsh_provider_ratings_target_kind_check CHECK ((target_kind = ANY (ARRAY['field'::text, 'captain'::text, 'order'::text])))
);


--
-- Name: dsh_readiness_checklist_policy_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_readiness_checklist_policy_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    operator_context_id text NOT NULL,
    business_vertical_id text NOT NULL,
    version integer NOT NULL,
    changed_by text NOT NULL,
    items_snapshot jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_readiness_checklist_policy_events_items_snapshot_check CHECK ((jsonb_typeof(items_snapshot) = 'array'::text)),
    CONSTRAINT dsh_readiness_checklist_policy_events_version_check CHECK ((version > 0))
);


--
-- Name: dsh_readiness_checklist_template_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_readiness_checklist_template_items (
    template_id uuid NOT NULL,
    check_type text NOT NULL,
    label_ar text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    critical boolean DEFAULT false NOT NULL,
    evidence_required boolean DEFAULT true NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_readiness_checklist_template_items_check CHECK (((NOT critical) OR required)),
    CONSTRAINT dsh_readiness_checklist_template_items_check_type_check CHECK ((btrim(check_type) ~ '^[a-z][a-z0-9_]{2,63}$'::text)),
    CONSTRAINT dsh_readiness_checklist_template_items_display_order_check CHECK (((display_order >= 0) AND (display_order <= 1000))),
    CONSTRAINT dsh_readiness_checklist_template_items_label_ar_check CHECK (((char_length(btrim(label_ar)) >= 2) AND (char_length(btrim(label_ar)) <= 160))),
    CONSTRAINT dsh_readiness_template_items_critical_evidence_chk CHECK (((NOT critical) OR (required AND evidence_required)))
);


--
-- Name: dsh_readiness_checklist_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_readiness_checklist_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    business_vertical_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_readiness_checklist_templates_version_check CHECK ((version > 0))
);


--
-- Name: dsh_readiness_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_readiness_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id uuid NOT NULL,
    store_id text NOT NULL,
    check_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_url text,
    notes text,
    verified_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mutation_idempotency_key text,
    mutation_request_hash text,
    mutation_correlation_id text,
    CONSTRAINT dsh_readiness_checks_mutation_idempotency_pair_chk CHECK ((((mutation_idempotency_key IS NULL) AND (mutation_request_hash IS NULL)) OR ((mutation_idempotency_key IS NOT NULL) AND (mutation_request_hash IS NOT NULL)))),
    CONSTRAINT dsh_readiness_checks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: dsh_readiness_escalations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_readiness_escalations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id uuid,
    store_id text NOT NULL,
    raised_by text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_by text,
    resolved_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    create_idempotency_key text,
    create_request_hash text,
    create_correlation_id text,
    CONSTRAINT dsh_readiness_escalations_category_check CHECK ((category = ANY (ARRAY['document_missing'::text, 'safety_violation'::text, 'location_mismatch'::text, 'product_compliance'::text, 'equipment_failure'::text, 'other'::text]))),
    CONSTRAINT dsh_readiness_escalations_create_idempotency_pair_chk CHECK ((((create_idempotency_key IS NULL) AND (create_request_hash IS NULL)) OR ((create_idempotency_key IS NOT NULL) AND (create_request_hash IS NOT NULL)))),
    CONSTRAINT dsh_readiness_escalations_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_readiness_escalations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text, 'escalated_further'::text])))
);


--
-- Name: dsh_reels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_reels (
    id text NOT NULL,
    asset_id text NOT NULL,
    title_ar text DEFAULT ''::text NOT NULL,
    title_en text DEFAULT ''::text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    status text DEFAULT 'pending_review'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    submitted_by text NOT NULL,
    submitted_by_role text DEFAULT 'partner'::text NOT NULL,
    source_store_id text,
    reviewed_by text,
    review_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    poster_asset_id text,
    subtitle_ar text DEFAULT ''::text NOT NULL,
    subtitle_en text DEFAULT ''::text NOT NULL,
    highlight_ar text DEFAULT ''::text NOT NULL,
    highlight_en text DEFAULT ''::text NOT NULL,
    cta_label_ar text DEFAULT ''::text NOT NULL,
    cta_label_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_reels_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text]))),
    CONSTRAINT dsh_reels_target_type_check CHECK ((target_type = ANY (ARRAY['master_product'::text, 'store'::text, 'offer'::text])))
);


--
-- Name: dsh_return_to_store_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_return_to_store_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    command text NOT NULL,
    entity_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    exception_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_return_to_store_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_return_to_store_command_receipts_command_check CHECK ((command = ANY (ARRAY['captain_arrive'::text, 'partner_accept'::text]))),
    CONSTRAINT dsh_return_to_store_command_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_return_to_store_command_receipts_entity_id_check CHECK ((char_length(btrim(entity_id)) > 0)),
    CONSTRAINT dsh_return_to_store_command_receipts_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_return_to_store_command_receipts_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_return_to_store_command_receipts_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: dsh_service_area_capacity_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_service_area_capacity_policies (
    operator_context_id text NOT NULL,
    service_area_code text NOT NULL,
    minimum_available_captains integer DEFAULT 1 NOT NULL,
    target_available_captains integer DEFAULT 2 NOT NULL,
    demand_buffer_basis_points integer DEFAULT 2000 NOT NULL,
    mass_absence_threshold_basis_points integer DEFAULT 4000 NOT NULL,
    forecast_horizon_minutes integer DEFAULT 180 NOT NULL,
    updated_by text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_service_area_capacity_po_mass_absence_threshold_basis_check CHECK (((mass_absence_threshold_basis_points >= 1) AND (mass_absence_threshold_basis_points <= 10000))),
    CONSTRAINT dsh_service_area_capacity_poli_demand_buffer_basis_points_check CHECK (((demand_buffer_basis_points >= 0) AND (demand_buffer_basis_points <= 10000))),
    CONSTRAINT dsh_service_area_capacity_poli_minimum_available_captains_check CHECK ((minimum_available_captains >= 0)),
    CONSTRAINT dsh_service_area_capacity_polici_forecast_horizon_minutes_check CHECK (((forecast_horizon_minutes >= 15) AND (forecast_horizon_minutes <= 10080))),
    CONSTRAINT dsh_service_area_capacity_policies_check CHECK ((target_available_captains >= minimum_available_captains)),
    CONSTRAINT dsh_service_area_capacity_policies_version_check CHECK ((version > 0))
);


--
-- Name: TABLE dsh_service_area_capacity_policies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_service_area_capacity_policies IS 'DSH-owned operational capacity thresholds and shortage forecasting policy by service area.';


--
-- Name: dsh_service_area_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_service_area_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_area_code text NOT NULL,
    actor_id text NOT NULL,
    actor_surface text NOT NULL,
    action text NOT NULL,
    from_version integer,
    to_version integer NOT NULL,
    reason text NOT NULL,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_service_area_events_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'activated'::text, 'deactivated'::text]))),
    CONSTRAINT dsh_service_area_events_reason_check CHECK (((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500))),
    CONSTRAINT dsh_service_area_events_to_version_check CHECK ((to_version >= 1))
);


--
-- Name: dsh_service_area_geofences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_service_area_geofences (
    service_area_code text NOT NULL,
    display_name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    srid integer DEFAULT 4326 NOT NULL,
    overlap_policy text DEFAULT 'priority_then_code'::text NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    polygon public.geometry(Polygon,4326) NOT NULL,
    CONSTRAINT check_valid_polygon CHECK (public.st_isvalid(polygon)),
    CONSTRAINT dsh_service_area_geofences_display_name_check CHECK (((char_length(btrim(display_name)) >= 2) AND (char_length(btrim(display_name)) <= 160))),
    CONSTRAINT dsh_service_area_geofences_effective_range_check CHECK (((expires_at IS NULL) OR (expires_at > effective_from))),
    CONSTRAINT dsh_service_area_geofences_overlap_policy_check CHECK ((overlap_policy = 'priority_then_code'::text)),
    CONSTRAINT dsh_service_area_geofences_priority_check CHECK (((priority >= 0) AND (priority <= 100000))),
    CONSTRAINT dsh_service_area_geofences_srid_check CHECK ((srid = 4326)),
    CONSTRAINT dsh_service_area_geofences_version_check CHECK ((version >= 1))
);


--
-- Name: COLUMN dsh_service_area_geofences.srid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_service_area_geofences.srid IS 'EPSG SRID. DSH service-area coordinates are exclusively WGS84 longitude/latitude (4326).';


--
-- Name: COLUMN dsh_service_area_geofences.overlap_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_service_area_geofences.overlap_policy IS 'Deterministic winner policy: highest priority, then lexicographically smallest service_area_code.';


--
-- Name: dsh_service_area_mutation_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_service_area_mutation_results (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_service_area_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_service_area_versions (
    service_area_code text NOT NULL,
    version integer NOT NULL,
    display_name text NOT NULL,
    active boolean NOT NULL,
    priority integer NOT NULL,
    srid integer NOT NULL,
    overlap_policy text NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    expires_at timestamp with time zone,
    actor_id text NOT NULL,
    actor_surface text NOT NULL,
    reason text NOT NULL,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    polygon public.geometry(Polygon,4326) NOT NULL,
    CONSTRAINT dsh_service_area_versions_check CHECK (((expires_at IS NULL) OR (expires_at > effective_from))),
    CONSTRAINT dsh_service_area_versions_overlap_policy_check CHECK ((overlap_policy = 'priority_then_code'::text)),
    CONSTRAINT dsh_service_area_versions_priority_check CHECK (((priority >= 0) AND (priority <= 100000))),
    CONSTRAINT dsh_service_area_versions_reason_check CHECK (((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500))),
    CONSTRAINT dsh_service_area_versions_srid_check CHECK ((srid = 4326)),
    CONSTRAINT dsh_service_area_versions_version_check CHECK ((version >= 1))
);


--
-- Name: TABLE dsh_service_area_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_service_area_versions IS 'Append-only authoritative temporal resolution history. dsh_service_area_geofences remains the latest governed command state.';


--
-- Name: dsh_sla_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_sla_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id uuid NOT NULL,
    store_id uuid NOT NULL,
    partner_id uuid,
    alert_type character varying(50) NOT NULL,
    state character varying(50) NOT NULL,
    pause_reason text,
    paused_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone
);


--
-- Name: dsh_special_request_information_exchanges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_request_information_exchanges (
    id uuid NOT NULL,
    operator_context_id text NOT NULL,
    special_request_id uuid NOT NULL,
    client_id text NOT NULL,
    requested_by_operator_id text NOT NULL,
    question text NOT NULL,
    response text,
    status text DEFAULT 'pending'::text NOT NULL,
    request_version_at_request integer NOT NULL,
    request_version_at_response integer,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_special_request_informati_request_version_at_response_check CHECK ((request_version_at_response > 0)),
    CONSTRAINT dsh_special_request_informatio_request_version_at_request_check CHECK ((request_version_at_request > 0)),
    CONSTRAINT dsh_special_request_information_exchanges_check CHECK ((((status = 'pending'::text) AND (response IS NULL) AND (responded_at IS NULL) AND (request_version_at_response IS NULL)) OR ((status = 'responded'::text) AND (response IS NOT NULL) AND (responded_at IS NOT NULL) AND (request_version_at_response IS NOT NULL)))),
    CONSTRAINT dsh_special_request_information_exchanges_question_check CHECK (((char_length(TRIM(BOTH FROM question)) >= 5) AND (char_length(TRIM(BOTH FROM question)) <= 2000))),
    CONSTRAINT dsh_special_request_information_exchanges_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'responded'::text])))
);


--
-- Name: dsh_special_request_information_response_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_request_information_response_receipts (
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    special_request_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    exchange_id uuid NOT NULL,
    result_version integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_special_request_information_respo_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_special_request_information_response__idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_special_request_information_response_r_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_special_request_information_response_r_result_version_check CHECK ((result_version > 0))
);


--
-- Name: dsh_special_request_saga_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_request_saga_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    saga_id uuid NOT NULL,
    status text DEFAULT 'blocked'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_special_request_saga_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_special_request_saga_outbox_status_check CHECK ((status = ANY (ARRAY['blocked'::text, 'pending'::text, 'in_flight'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: TABLE dsh_special_request_saga_outbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_special_request_saga_outbox IS 'Transactional outbox for SpecialRequest cross-service saga dispatch and restart recovery.';


--
-- Name: dsh_special_request_sagas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_request_sagas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    special_request_id uuid NOT NULL,
    operation text NOT NULL,
    command_id text NOT NULL,
    payload jsonb NOT NULL,
    payload_hash text NOT NULL,
    state text DEFAULT 'requested'::text NOT NULL,
    remote_reference text,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_special_request_sagas_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT dsh_special_request_sagas_operation_check CHECK ((operation = ANY (ARRAY['quote_issue_attach'::text, 'payment_session_create_attach'::text, 'cancel'::text]))),
    CONSTRAINT dsh_special_request_sagas_payload_hash_check CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_special_request_sagas_state_check CHECK ((state = ANY (ARRAY['requested'::text, 'dispatched'::text, 'remote_applied'::text, 'locally_confirmed'::text, 'completed'::text, 'retryable_failure'::text, 'reconciliation_required'::text, 'terminal_failure'::text])))
);


--
-- Name: TABLE dsh_special_request_sagas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_special_request_sagas IS 'Durable command identity and explicit state machine for DSH/WLT SpecialRequest mutations.';


--
-- Name: dsh_special_request_wlt_event_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_request_wlt_event_receipts (
    event_key text NOT NULL,
    operator_context_id text NOT NULL,
    special_request_id uuid NOT NULL,
    payment_session_id text NOT NULL,
    wlt_status text NOT NULL,
    payload_hash text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    delivery_attempt_count integer DEFAULT 1 NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    last_received_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_at timestamp with time zone,
    CONSTRAINT dsh_special_request_wlt_event_rece_delivery_attempt_count_check CHECK ((delivery_attempt_count > 0)),
    CONSTRAINT dsh_special_request_wlt_event_receipt_operator_context_id_check CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT dsh_special_request_wlt_event_receipts_payload_hash_check CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_special_request_wlt_event_receipts_payment_session_id_check CHECK ((btrim(payment_session_id) <> ''::text))
);


--
-- Name: dsh_special_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    request_type public.dsh_special_request_type NOT NULL,
    status public.dsh_special_request_status DEFAULT 'submitted'::public.dsh_special_request_status NOT NULL,
    customer_notes text,
    product_url text,
    quantity integer,
    size character varying(50),
    color character varying(50),
    variant_notes text,
    delivery_address_reference character varying(255),
    pickup_address_reference character varying(255),
    dropoff_address_reference character varying(255),
    pickup_location jsonb,
    dropoff_location jsonb,
    item_type character varying(50),
    schedule_mode character varying(20),
    scheduled_at timestamp with time zone,
    handling_requirements text,
    assigned_operator_id uuid,
    dispatch_assignment_id uuid,
    correlation_id character varying(255),
    idempotency_key character varying(255),
    rejection_reason text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    completed_at timestamp with time zone,
    workflow_stage text,
    wlt_payment_session_id character varying(255),
    quote_prepared_at timestamp with time zone,
    customer_approved_at timestamp with time zone,
    purchase_batch_id text,
    purchased_at timestamp with time zone,
    inbound_reference text,
    inbound_received_at timestamp with time zone,
    sorting_started_at timestamp with time zone,
    sorting_completed_at timestamp with time zone,
    fulfillment_prepared_at timestamp with time zone,
    ready_for_delivery_at timestamp with time zone,
    captain_assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    operator_context_id text DEFAULT 'OperatorContext-dev-001'::text NOT NULL,
    media_id uuid,
    safety_status text DEFAULT 'pending'::text,
    moderation_note text,
    is_unsafe_content boolean DEFAULT false,
    wlt_quote_id text,
    wlt_quote_policy_id text,
    wlt_quote_policy_version integer,
    wlt_quote_version integer,
    wlt_quote_amount_minor_units bigint,
    wlt_quote_currency text,
    wlt_quote_hash text,
    wlt_quote_expires_at timestamp with time zone,
    last_wlt_status text,
    last_wlt_event_at timestamp with time zone,
    CONSTRAINT chk_awnak_fields CHECK (((request_type <> 'AWNAK_ERRAND'::public.dsh_special_request_type) OR (((pickup_address_reference IS NOT NULL) OR (pickup_location IS NOT NULL)) AND ((dropoff_address_reference IS NOT NULL) OR (dropoff_location IS NOT NULL))))),
    CONSTRAINT chk_dsh_special_request_wlt_quote_projection CHECK ((((wlt_quote_id IS NULL) AND (wlt_quote_policy_id IS NULL) AND (wlt_quote_policy_version IS NULL) AND (wlt_quote_version IS NULL) AND (wlt_quote_amount_minor_units IS NULL) AND (wlt_quote_currency IS NULL) AND (wlt_quote_hash IS NULL) AND (wlt_quote_expires_at IS NULL)) OR ((wlt_quote_id IS NOT NULL) AND (wlt_quote_policy_id IS NOT NULL) AND (wlt_quote_policy_version IS NOT NULL) AND (wlt_quote_version IS NOT NULL) AND (wlt_quote_amount_minor_units IS NOT NULL) AND (wlt_quote_amount_minor_units > 0) AND (wlt_quote_currency IS NOT NULL) AND (char_length(wlt_quote_currency) = 3) AND (wlt_quote_hash IS NOT NULL) AND (wlt_quote_expires_at IS NOT NULL)))),
    CONSTRAINT chk_shein_fields CHECK (((request_type <> 'SHEIN_ASSISTED_PURCHASE'::public.dsh_special_request_type) OR ((product_url IS NOT NULL) AND (quantity > 0)))),
    CONSTRAINT chk_special_request_stage CHECK (((workflow_stage IS NULL) OR ((request_type = 'SHEIN_ASSISTED_PURCHASE'::public.dsh_special_request_type) AND (workflow_stage = ANY (ARRAY['intake_review'::text, 'quote_pending'::text, 'customer_information'::text, 'customer_approval'::text, 'batch_pending'::text, 'purchased'::text, 'inbound'::text, 'sorting'::text, 'ready_for_delivery'::text, 'captain_assignment'::text, 'out_for_delivery'::text, 'proof_of_delivery'::text, 'delivered'::text, 'exception'::text, 'cancelled'::text, 'rejected'::text]))) OR ((request_type = 'AWNAK_ERRAND'::public.dsh_special_request_type) AND (workflow_stage = ANY (ARRAY['intake'::text, 'quote_review'::text, 'customer_information'::text, 'customer_approval'::text, 'dispatch_pending'::text, 'assigned'::text, 'captain_enroute_to_pickup'::text, 'arrived_at_pickup'::text, 'item_received'::text, 'in_progress'::text, 'arrived_at_dropoff'::text, 'proof_review'::text, 'completed'::text, 'escalated'::text, 'cancelled'::text])))))
);


--
-- Name: dsh_special_requests_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_special_requests_audit_events (
    id text NOT NULL,
    entity_id uuid NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    action text NOT NULL,
    from_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    to_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_store_action_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_action_audit (
    id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    store_id text NOT NULL,
    action text NOT NULL,
    from_state jsonb NOT NULL,
    to_state jsonb NOT NULL,
    reason text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_action_audit_actor_role_chk CHECK ((actor_role = ANY (ARRAY['partner'::text, 'field'::text, 'captain'::text, 'operator'::text, 'system'::text])))
);


--
-- Name: dsh_store_actor_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_actor_scopes (
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    store_id text NOT NULL,
    scope_type text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT dsh_store_actor_scopes_actor_role_check CHECK ((actor_role = ANY (ARRAY['partner'::text, 'field'::text, 'captain'::text, 'operator'::text]))),
    CONSTRAINT dsh_store_actor_scopes_scope_type_check CHECK ((scope_type = ANY (ARRAY['own'::text, 'assigned'::text, 'all'::text])))
);


--
-- Name: dsh_store_captain_handoff_command_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_captain_handoff_command_receipts (
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    order_id uuid NOT NULL,
    store_id text NOT NULL,
    idempotency_key text NOT NULL,
    request_fingerprint text NOT NULL,
    correlation_id text NOT NULL,
    handoff_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_captain_handoff_command_rec_operator_context_id_check CHECK ((char_length(btrim(operator_context_id)) > 0)),
    CONSTRAINT dsh_store_captain_handoff_command_rec_request_fingerprint_check CHECK ((request_fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dsh_store_captain_handoff_command_receipt_idempotency_key_check CHECK (((char_length(btrim(idempotency_key)) >= 8) AND (char_length(btrim(idempotency_key)) <= 200))),
    CONSTRAINT dsh_store_captain_handoff_command_receipts_actor_id_check CHECK ((char_length(btrim(actor_id)) > 0)),
    CONSTRAINT dsh_store_captain_handoff_command_receipts_correlation_id_check CHECK (((char_length(btrim(correlation_id)) >= 8) AND (char_length(btrim(correlation_id)) <= 200))),
    CONSTRAINT dsh_store_captain_handoff_command_receipts_store_id_check CHECK ((char_length(btrim(store_id)) > 0))
);


--
-- Name: dsh_store_captain_handoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_captain_handoffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    store_id text NOT NULL,
    captain_id text NOT NULL,
    status text DEFAULT 'awaiting_partner'::text NOT NULL,
    partner_confirmed_at timestamp with time zone,
    partner_confirmed_by_actor_id text,
    captain_confirmed_at timestamp with time zone,
    captain_confirmed_by_actor_id text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_captain_handoffs_shape_check CHECK ((((status = 'awaiting_partner'::text) AND (partner_confirmed_at IS NULL) AND (partner_confirmed_by_actor_id IS NULL) AND (captain_confirmed_at IS NULL) AND (captain_confirmed_by_actor_id IS NULL)) OR ((status = 'partner_confirmed'::text) AND (partner_confirmed_at IS NOT NULL) AND (NULLIF(btrim(partner_confirmed_by_actor_id), ''::text) IS NOT NULL) AND (captain_confirmed_at IS NULL) AND (captain_confirmed_by_actor_id IS NULL)) OR ((status = 'completed'::text) AND (partner_confirmed_at IS NOT NULL) AND (NULLIF(btrim(partner_confirmed_by_actor_id), ''::text) IS NOT NULL) AND (captain_confirmed_at IS NOT NULL) AND (captain_confirmed_at >= partner_confirmed_at) AND (NULLIF(btrim(captain_confirmed_by_actor_id), ''::text) IS NOT NULL)) OR ((status = 'superseded'::text) AND (captain_confirmed_at IS NULL) AND (captain_confirmed_by_actor_id IS NULL) AND (((partner_confirmed_at IS NULL) AND (partner_confirmed_by_actor_id IS NULL)) OR ((partner_confirmed_at IS NOT NULL) AND (NULLIF(btrim(partner_confirmed_by_actor_id), ''::text) IS NOT NULL)))))),
    CONSTRAINT dsh_store_captain_handoffs_status_check CHECK ((status = ANY (ARRAY['awaiting_partner'::text, 'partner_confirmed'::text, 'completed'::text, 'superseded'::text]))),
    CONSTRAINT dsh_store_captain_handoffs_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_store_courier_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_courier_settings (
    store_id text NOT NULL,
    courier_name text DEFAULT ''::text NOT NULL,
    courier_phone text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    policy text DEFAULT 'free_delivery'::text NOT NULL,
    pricing_source text DEFAULT 'bthwani_pricing'::text NOT NULL,
    compensation text DEFAULT 'none'::text NOT NULL,
    selected_branch_ids text[] DEFAULT ARRAY[]::text[] NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_courier_settings_compensation_check CHECK ((compensation = ANY (ARRAY['none'::text, 'fixed_per_delivery'::text, 'percentage_of_delivery_fee'::text]))),
    CONSTRAINT dsh_store_courier_settings_policy_check CHECK ((policy = ANY (ARRAY['free_delivery'::text, 'courier_per_delivery_payout'::text, 'store_retained_fee_salary_courier'::text]))),
    CONSTRAINT dsh_store_courier_settings_pricing_source_check CHECK ((pricing_source = ANY (ARRAY['bthwani_pricing'::text, 'store_fixed_price'::text, 'control_panel_zone_pricing'::text])))
);


--
-- Name: dsh_store_coverage_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_coverage_zones (
    id text DEFAULT ('scz_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    store_id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    status_label text DEFAULT ''::text NOT NULL,
    branch_relation text DEFAULT ''::text NOT NULL,
    service_mode_relation text DEFAULT ''::text NOT NULL,
    policy_summary text DEFAULT ''::text NOT NULL,
    policy_reason text DEFAULT ''::text NOT NULL,
    operational_impact text DEFAULT ''::text NOT NULL,
    pricing_reference text DEFAULT ''::text NOT NULL,
    commission_reference text DEFAULT ''::text NOT NULL,
    payout_reference text DEFAULT ''::text NOT NULL,
    review_action_label text DEFAULT ''::text NOT NULL,
    audit_note text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_coverage_zones_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'blocked'::text])))
);


--
-- Name: dsh_store_delivery_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_delivery_pricing (
    store_id text NOT NULL,
    fulfillment_mode text NOT NULL,
    fee_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    pricing_source text DEFAULT 'control_panel'::text NOT NULL,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pricing_mode text DEFAULT 'partner_fixed_pricing'::text NOT NULL,
    pricing_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT dsh_store_delivery_pricing_fee_minor_units_check CHECK ((fee_minor_units >= 0)),
    CONSTRAINT dsh_store_delivery_pricing_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_store_delivery_pricing_pricing_mode_check CHECK ((pricing_mode = ANY (ARRAY['free_delivery'::text, 'bthwani_pricing'::text, 'partner_fixed_pricing'::text, 'zone_pricing'::text]))),
    CONSTRAINT dsh_store_delivery_pricing_pricing_source_check CHECK ((pricing_source = ANY (ARRAY['control_panel'::text, 'partner_store'::text, 'platform_default'::text, 'migration_legacy'::text]))),
    CONSTRAINT dsh_store_delivery_pricing_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_store_delivery_pricing_version_check CHECK ((version > 0))
);


--
-- Name: TABLE dsh_store_delivery_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dsh_store_delivery_pricing IS 'Sovereign DSH delivery-fee source consumed by checkout before WLT handoff.';


--
-- Name: dsh_store_delivery_pricing_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_delivery_pricing_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id text NOT NULL,
    fulfillment_mode text NOT NULL,
    actor_id text NOT NULL,
    actor_surface text NOT NULL,
    action text NOT NULL,
    from_fee_minor_units bigint,
    to_fee_minor_units bigint,
    from_status text,
    to_status text,
    reason text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    from_pricing_mode text,
    to_pricing_mode text,
    from_pricing_config jsonb,
    to_pricing_config jsonb,
    CONSTRAINT dsh_store_delivery_pricing_audit_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'pause'::text, 'activate'::text, 'archive'::text]))),
    CONSTRAINT dsh_store_delivery_pricing_audit_actor_surface_check CHECK ((actor_surface = ANY (ARRAY['control-panel'::text, 'app-partner'::text, 'system'::text])))
);


--
-- Name: dsh_store_field_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_field_verifications (
    id text NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    outcome text NOT NULL,
    evidence_status text NOT NULL,
    notes text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    visit_id uuid,
    checklist_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    location_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT dsh_store_field_verifications_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['complete'::text, 'partial'::text, 'missing'::text]))),
    CONSTRAINT dsh_store_field_verifications_outcome_check CHECK ((outcome = ANY (ARRAY['verified'::text, 'needs_follow_up'::text, 'rejected'::text])))
);


--
-- Name: dsh_store_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL
);


--
-- Name: dsh_store_order_preparation_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_order_preparation_policies (
    store_id text NOT NULL,
    default_preparation_minutes integer DEFAULT 25 NOT NULL,
    warning_before_minutes integer DEFAULT 5 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by_actor_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_order_preparation_p_default_preparation_minutes_check CHECK (((default_preparation_minutes >= 5) AND (default_preparation_minutes <= 180))),
    CONSTRAINT dsh_store_order_preparation_polici_warning_before_minutes_check CHECK (((warning_before_minutes >= 1) AND (warning_before_minutes <= 60))),
    CONSTRAINT dsh_store_order_preparation_policies_check CHECK ((warning_before_minutes < default_preparation_minutes)),
    CONSTRAINT dsh_store_order_preparation_policies_version_check CHECK ((version > 0))
);


--
-- Name: dsh_store_order_preparation_policy_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_order_preparation_policy_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    from_default_minutes integer NOT NULL,
    to_default_minutes integer NOT NULL,
    from_warning_minutes integer NOT NULL,
    to_warning_minutes integer NOT NULL,
    from_version integer NOT NULL,
    to_version integer NOT NULL,
    reason text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_order_preparation_policy_events_reason_check CHECK (((length(btrim(reason)) >= 3) AND (length(btrim(reason)) <= 500)))
);


--
-- Name: dsh_store_pickup_readiness_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_pickup_readiness_reports (
    id text NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    readiness text NOT NULL,
    reason text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_pickup_readiness_reports_readiness_check CHECK ((readiness = ANY (ARRAY['ready'::text, 'blocked'::text])))
);


--
-- Name: dsh_store_publication_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_publication_decisions (
    id text NOT NULL,
    operator_context_id text NOT NULL,
    store_id text NOT NULL,
    actor_id text NOT NULL,
    decision text NOT NULL,
    reason text NOT NULL,
    override_requested boolean DEFAULT false NOT NULL,
    override_applied boolean DEFAULT false NOT NULL,
    override_reason text DEFAULT ''::text NOT NULL,
    gate_blockers jsonb DEFAULT '[]'::jsonb NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_publication_decisions_check CHECK (((NOT override_applied) OR (override_requested AND (char_length(btrim(override_reason)) >= 10)))),
    CONSTRAINT dsh_store_publication_decisions_decision_check CHECK ((decision = ANY (ARRAY['publish'::text, 'hide'::text]))),
    CONSTRAINT dsh_store_publication_decisions_gate_blockers_check CHECK ((jsonb_typeof(gate_blockers) = 'array'::text)),
    CONSTRAINT dsh_store_publication_decisions_reason_check CHECK (((char_length(btrim(reason)) >= 3) AND (char_length(btrim(reason)) <= 500)))
);


--
-- Name: dsh_store_publication_override_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_store_publication_override_policies (
    operator_context_id text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    allowed_blocker_codes text[] DEFAULT ARRAY[]::text[] NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_publication_override_poli_allowed_blocker_codes_check CHECK ((array_position(allowed_blocker_codes, ''::text) IS NULL)),
    CONSTRAINT dsh_store_publication_override_policies_version_check CHECK ((version > 0))
);


--
-- Name: dsh_subscription_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_subscription_lifecycle_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_id text NOT NULL,
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    wlt_payment_session_id text,
    wlt_subscription_id text,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    actor_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_subscription_lifecycle_events_event_type_check CHECK ((event_type = ANY (ARRAY['purchase_initiated'::text, 'payment_session_bound'::text, 'payment_captured'::text, 'activated'::text, 'renewal_initiated'::text, 'renewed'::text, 'cancelled'::text, 'expired'::text, 'compensation_pending'::text, 'compensated'::text, 'failed'::text])))
);


--
-- Name: dsh_subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    price_yer bigint NOT NULL,
    billing_cycle text NOT NULL,
    include_free_delivery boolean DEFAULT false NOT NULL,
    points_multiplier numeric(6,2) DEFAULT 1 NOT NULL,
    order_cap integer DEFAULT 0 NOT NULL,
    badge text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    wlt_product_reference text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_by_actor_id text DEFAULT ''::text NOT NULL,
    approved_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_subscription_plans_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text]))),
    CONSTRAINT dsh_subscription_plans_order_cap_check CHECK ((order_cap >= 0)),
    CONSTRAINT dsh_subscription_plans_points_multiplier_check CHECK ((points_multiplier >= (1)::numeric)),
    CONSTRAINT dsh_subscription_plans_price_yer_check CHECK ((price_yer > 0)),
    CONSTRAINT dsh_subscription_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
    CONSTRAINT dsh_subscription_plans_version_check CHECK ((version > 0))
);


--
-- Name: COLUMN dsh_subscription_plans.wlt_product_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_subscription_plans.wlt_product_reference IS 'Reference only. WLT owns price collection and monetary transaction truth.';


--
-- Name: dsh_subscription_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_subscription_purchases (
    id text NOT NULL,
    operator_context_id text NOT NULL,
    client_id text NOT NULL,
    plan_id uuid NOT NULL,
    wlt_product_reference text NOT NULL,
    wlt_payment_session_id text,
    payment_method text NOT NULL,
    status text DEFAULT 'pending_payment'::text NOT NULL,
    idempotency_key text NOT NULL,
    correlation_id text NOT NULL,
    failure_code text,
    activated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wlt_subscription_id text,
    renewal_of_purchase_id text,
    lifecycle_version integer DEFAULT 1 NOT NULL,
    expires_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    compensation_status text DEFAULT 'not_required'::text NOT NULL,
    compensation_reference text,
    CONSTRAINT dsh_subscription_purchases_active_reference_chk CHECK (((status <> ALL (ARRAY['active'::text, 'renewed'::text, 'cancelled'::text, 'expired'::text, 'compensation_pending'::text, 'compensated'::text])) OR (btrim(COALESCE(wlt_subscription_id, ''::text)) <> ''::text))),
    CONSTRAINT dsh_subscription_purchases_cancellation_reason_chk CHECK (((status <> 'cancelled'::text) OR ((cancelled_at IS NOT NULL) AND (btrim(COALESCE(cancellation_reason, ''::text)) <> ''::text)))),
    CONSTRAINT dsh_subscription_purchases_compensation_status_chk CHECK ((compensation_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT dsh_subscription_purchases_lifecycle_version_check CHECK ((lifecycle_version > 0)),
    CONSTRAINT dsh_subscription_purchases_payment_method_check CHECK ((payment_method = ANY (ARRAY['wallet'::text, 'mixed'::text, 'official_wallet'::text]))),
    CONSTRAINT dsh_subscription_purchases_payment_reference_chk CHECK ((((status = 'initiated'::text) AND (wlt_payment_session_id IS NULL)) OR ((status <> 'initiated'::text) AND (btrim(COALESCE(wlt_payment_session_id, ''::text)) <> ''::text)))),
    CONSTRAINT dsh_subscription_purchases_status_check CHECK ((status = ANY (ARRAY['initiated'::text, 'pending_payment'::text, 'payment_captured'::text, 'active'::text, 'renewal_pending_payment'::text, 'renewed'::text, 'cancelled'::text, 'expired'::text, 'compensation_pending'::text, 'compensated'::text, 'failed'::text])))
);


--
-- Name: dsh_support_canned_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_canned_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    category text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dsh_support_message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message_id uuid NOT NULL,
    media_asset_id text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    attached_by text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'document'::text NOT NULL,
    duration_ms bigint,
    thumbnail_media_asset_id text,
    waveform_ref text,
    upload_status text DEFAULT 'ready'::text NOT NULL,
    CONSTRAINT dsh_support_message_attachments_duration_ms_check CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT dsh_support_message_attachments_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'audio'::text, 'video'::text, 'document'::text]))),
    CONSTRAINT dsh_support_message_attachments_size_bytes_check CHECK (((size_bytes > 0) AND (size_bytes <= 104857600))),
    CONSTRAINT dsh_support_message_attachments_upload_status_check CHECK ((upload_status = ANY (ARRAY['uploaded'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);


--
-- Name: dsh_support_message_read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_message_read_receipts (
    message_id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_support_message_read_receipts_actor_role_check CHECK ((actor_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text])))
);


--
-- Name: dsh_support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id text NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    create_idempotency_key text,
    correlation_id text,
    client_message_id text,
    sequence_num integer,
    CONSTRAINT dsh_support_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text, 'system'::text])))
);


--
-- Name: dsh_support_ticket_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_ticket_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    reporter_id text NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    event_type text NOT NULL,
    correlation_id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_support_ticket_events_actor_role_check CHECK ((actor_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text, 'system'::text]))),
    CONSTRAINT dsh_support_ticket_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'message_added'::text, 'status_changed'::text, 'escalated'::text, 'closed'::text])))
);


--
-- Name: dsh_support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id text,
    reporter_id text NOT NULL,
    reporter_role text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to text,
    order_id uuid,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    create_idempotency_key text,
    correlation_id text,
    version integer DEFAULT 1 NOT NULL,
    claimed_by text,
    claimed_at timestamp with time zone,
    sla_breach_at timestamp with time zone,
    escalated_at timestamp with time zone,
    escalation_reason text,
    CONSTRAINT dsh_support_tickets_category_check CHECK ((category = ANY (ARRAY['order_issue'::text, 'delivery_issue'::text, 'store_quality'::text, 'payment_reference'::text, 'account_access'::text, 'app_bug'::text, 'other'::text]))),
    CONSTRAINT dsh_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT dsh_support_tickets_reporter_role_check CHECK ((reporter_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text]))),
    CONSTRAINT dsh_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'pending_user'::text, 'resolved'::text, 'closed'::text]))),
    CONSTRAINT dsh_support_tickets_version_check CHECK ((version >= 1))
);


--
-- Name: dsh_visit_checklist_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_visit_checklist_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id uuid NOT NULL,
    template_id uuid NOT NULL,
    template_version integer NOT NULL,
    business_vertical_id text NOT NULL,
    check_type text NOT NULL,
    label_ar text NOT NULL,
    required boolean NOT NULL,
    critical boolean NOT NULL,
    evidence_required boolean NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_visit_checklist_requirements_check CHECK (((NOT critical) OR required)),
    CONSTRAINT dsh_visit_checklist_requirements_critical_evidence_chk CHECK (((NOT critical) OR (required AND evidence_required))),
    CONSTRAINT dsh_visit_checklist_requirements_template_version_check CHECK ((template_version > 0))
);


--
-- Name: dsh_wlt_outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dsh_wlt_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    order_id uuid NOT NULL,
    captain_id text,
    partner_id text,
    checkout_intent_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id text DEFAULT ''::text NOT NULL,
    points bigint DEFAULT 0 NOT NULL,
    reversal_of_reference text DEFAULT ''::text NOT NULL,
    external_reference text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    reversal_requested boolean DEFAULT false NOT NULL,
    operator_context_id text NOT NULL,
    collector_type text,
    collector_id text,
    last_readback_at timestamp with time zone,
    readback_attempt_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT chk_dsh_wlt_outbox_events_operator_context_id CHECK (((char_length(btrim(operator_context_id)) >= 1) AND (char_length(btrim(operator_context_id)) <= 120))),
    CONSTRAINT dsh_wlt_outbox_events_collector_type_check CHECK ((((event_type = 'delivery_completed'::text) AND (collector_type = ANY (ARRAY['captain'::text, 'store_courier'::text, 'partner_store'::text])) AND (NULLIF(collector_id, ''::text) IS NOT NULL)) OR ((event_type <> 'delivery_completed'::text) AND (collector_type IS NULL) AND (collector_id IS NULL)))),
    CONSTRAINT dsh_wlt_outbox_events_points_check CHECK ((points >= 0)),
    CONSTRAINT dsh_wlt_outbox_events_readback_attempt_count_chk CHECK ((readback_attempt_count >= 0)),
    CONSTRAINT dsh_wlt_outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'unknown'::text, 'sent'::text, 'cancelled'::text, 'failed'::text])))
);


--
-- Name: COLUMN dsh_wlt_outbox_events.reversal_requested; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dsh_wlt_outbox_events.reversal_requested IS 'A confirmed refund arrived while a loyalty earn was leased; the worker must enqueue a reversal if WLT accepted the earn.';


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
-- Name: dsh_partner_delivery_tasks chk_dsh_partner_delivery_exception_reason; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_partner_delivery_tasks
    ADD CONSTRAINT chk_dsh_partner_delivery_exception_reason CHECK (((status <> 'exception'::text) OR ((exception_reason IS NOT NULL) AND (btrim(exception_reason) <> ''::text)))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_cta_label_lengths; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_cta_label_lengths CHECK (((char_length(cta_label_ar) <= 80) AND (char_length(cta_label_en) <= 80))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_highlight_lengths; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_highlight_lengths CHECK (((char_length(highlight_ar) <= 280) AND (char_length(highlight_en) <= 280))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_partner_source_store_required; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_partner_source_store_required CHECK (((submitted_by_role <> 'partner'::text) OR (source_store_id IS NOT NULL))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_store_target_matches_source; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_store_target_matches_source CHECK (((target_type <> 'store'::text) OR (source_store_id = target_id))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_subtitle_lengths; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_subtitle_lengths CHECK (((char_length(subtitle_ar) <= 500) AND (char_length(subtitle_en) <= 500))) NOT VALID;


--
-- Name: dsh_reels ck_dsh_reels_title_lengths; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_reels
    ADD CONSTRAINT ck_dsh_reels_title_lengths CHECK (((char_length(title_ar) <= 160) AND (char_length(title_en) <= 160))) NOT VALID;


--
-- Name: dsh_admin_approval_requests dsh_admin_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_approval_requests
    ADD CONSTRAINT dsh_admin_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_approval_requests dsh_admin_approval_requests_supersedes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_approval_requests
    ADD CONSTRAINT dsh_admin_approval_requests_supersedes_unique UNIQUE (supersedes_request_id);


--
-- Name: dsh_admin_audit dsh_admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_audit
    ADD CONSTRAINT dsh_admin_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_canonical_mutation_intents dsh_admin_canonical_mutation_inte_operation_type_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_canonical_mutation_intents
    ADD CONSTRAINT dsh_admin_canonical_mutation_inte_operation_type_request_id_key UNIQUE (operation_type, request_id);


--
-- Name: dsh_admin_canonical_mutation_intents dsh_admin_canonical_mutation_intents_context_operation_request_; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_canonical_mutation_intents
    ADD CONSTRAINT dsh_admin_canonical_mutation_intents_context_operation_request_ UNIQUE (operator_context_id, operation_type, request_id);


--
-- Name: dsh_admin_canonical_mutation_intents dsh_admin_canonical_mutation_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_canonical_mutation_intents
    ADD CONSTRAINT dsh_admin_canonical_mutation_intents_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_role_definition_requests dsh_admin_role_definition_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_role_definition_requests
    ADD CONSTRAINT dsh_admin_role_definition_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_role_definition_requests dsh_admin_role_definition_requests_supersedes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_role_definition_requests
    ADD CONSTRAINT dsh_admin_role_definition_requests_supersedes_unique UNIQUE (supersedes_request_id);


--
-- Name: dsh_admin_rollback_requests dsh_admin_rollback_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_rollback_requests
    ADD CONSTRAINT dsh_admin_rollback_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_rollback_requests dsh_admin_rollback_requests_supersedes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_rollback_requests
    ADD CONSTRAINT dsh_admin_rollback_requests_supersedes_unique UNIQUE (supersedes_request_id);


--
-- Name: dsh_admin_support_session_requests dsh_admin_support_session_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_support_session_requests
    ADD CONSTRAINT dsh_admin_support_session_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_analytics_checkpoints dsh_analytics_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_analytics_checkpoints
    ADD CONSTRAINT dsh_analytics_checkpoints_pkey PRIMARY KEY (projection_name);


--
-- Name: dsh_analytics_metrics_registry dsh_analytics_metrics_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_analytics_metrics_registry
    ADD CONSTRAINT dsh_analytics_metrics_registry_pkey PRIMARY KEY (metric_id);


--
-- Name: dsh_analytics_projections dsh_analytics_projections_metric_id_store_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_analytics_projections
    ADD CONSTRAINT dsh_analytics_projections_metric_id_store_id_period_start_key UNIQUE (metric_id, store_id, period_start);


--
-- Name: dsh_analytics_projections dsh_analytics_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_analytics_projections
    ADD CONSTRAINT dsh_analytics_projections_pkey PRIMARY KEY (id);


--
-- Name: dsh_assignments dsh_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_pkey PRIMARY KEY (id);


--
-- Name: dsh_captain_assignment_command_receipts dsh_captain_assignment_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_assignment_command_receipts
    ADD CONSTRAINT dsh_captain_assignment_command_receipts_pkey PRIMARY KEY (operator_context_id, actor_id, idempotency_key);


--
-- Name: dsh_captain_availability_command_receipts dsh_captain_availability_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_availability_command_receipts
    ADD CONSTRAINT dsh_captain_availability_command_receipts_pkey PRIMARY KEY (operator_context_id, actor_id, idempotency_key);


--
-- Name: dsh_captain_delivery_status_command_receipts dsh_captain_delivery_status_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_delivery_status_command_receipts
    ADD CONSTRAINT dsh_captain_delivery_status_command_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: dsh_captain_dispatch_profiles dsh_captain_dispatch_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_dispatch_profiles
    ADD CONSTRAINT dsh_captain_dispatch_profiles_pkey PRIMARY KEY (operator_context_id, captain_id);


--
-- Name: dsh_captain_financial_eligibility dsh_captain_financial_eligibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_financial_eligibility
    ADD CONSTRAINT dsh_captain_financial_eligibility_pkey PRIMARY KEY (operator_context_id, captain_id);


--
-- Name: dsh_captain_membership_history dsh_captain_membership_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_membership_history
    ADD CONSTRAINT dsh_captain_membership_history_pkey PRIMARY KEY (id);


--
-- Name: dsh_captain_memberships dsh_captain_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_memberships
    ADD CONSTRAINT dsh_captain_memberships_pkey PRIMARY KEY (id);


--
-- Name: dsh_cart_items dsh_cart_items_identity_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_identity_key UNIQUE (cart_id, master_product_id, options_hash);


--
-- Name: dsh_cart_items dsh_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_pkey PRIMARY KEY (id);


--
-- Name: dsh_cart_mutation_receipt_quarantine dsh_cart_mutation_receipt_quarant_client_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipt_quarantine
    ADD CONSTRAINT dsh_cart_mutation_receipt_quarant_client_id_idempotency_key_key UNIQUE (client_id, idempotency_key);


--
-- Name: dsh_cart_mutation_receipt_quarantine dsh_cart_mutation_receipt_quarantine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipt_quarantine
    ADD CONSTRAINT dsh_cart_mutation_receipt_quarantine_pkey PRIMARY KEY (id);


--
-- Name: dsh_cart_mutation_receipts dsh_cart_mutation_receipts_client_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipts
    ADD CONSTRAINT dsh_cart_mutation_receipts_client_id_idempotency_key_key UNIQUE (client_id, idempotency_key);


--
-- Name: dsh_cart_mutation_receipts dsh_cart_mutation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipts
    ADD CONSTRAINT dsh_cart_mutation_receipts_pkey PRIMARY KEY (id);


--
-- Name: dsh_cart_serviceability_checks dsh_cart_serviceability_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_serviceability_checks
    ADD CONSTRAINT dsh_cart_serviceability_checks_pkey PRIMARY KEY (id);


--
-- Name: dsh_carts dsh_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_carts
    ADD CONSTRAINT dsh_carts_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_approval_audit_trail dsh_catalog_approval_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_approval_audit_trail
    ADD CONSTRAINT dsh_catalog_approval_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_approval_records dsh_catalog_approval_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_approval_records
    ADD CONSTRAINT dsh_catalog_approval_records_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_entity_type_entity_id_role_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_entity_type_entity_id_role_asset_id_key UNIQUE (entity_type, entity_id, role, asset_id);


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_assets dsh_catalog_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_assets
    ADD CONSTRAINT dsh_catalog_assets_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_attribute_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_attribute_id_code_key UNIQUE (attribute_id, code);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_attributes dsh_catalog_attributes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_attributes
    ADD CONSTRAINT dsh_catalog_attributes_code_key UNIQUE (code);


--
-- Name: dsh_catalog_attributes dsh_catalog_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_attributes
    ADD CONSTRAINT dsh_catalog_attributes_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_collections dsh_catalog_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_collections
    ADD CONSTRAINT dsh_catalog_collections_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_collections dsh_catalog_collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_collections
    ADD CONSTRAINT dsh_catalog_collections_slug_key UNIQUE (slug);


--
-- Name: dsh_catalog_create_idempotency dsh_catalog_create_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_create_idempotency
    ADD CONSTRAINT dsh_catalog_create_idempotency_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_catalog_domains dsh_catalog_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_domains
    ADD CONSTRAINT dsh_catalog_domains_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_domains dsh_catalog_domains_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_domains
    ADD CONSTRAINT dsh_catalog_domains_slug_key UNIQUE (slug);


--
-- Name: dsh_catalog_entity_audit dsh_catalog_entity_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_entity_audit
    ADD CONSTRAINT dsh_catalog_entity_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_legacy_archive dsh_catalog_legacy_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_legacy_archive
    ADD CONSTRAINT dsh_catalog_legacy_archive_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_legacy_archive dsh_catalog_legacy_archive_source_table_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_legacy_archive
    ADD CONSTRAINT dsh_catalog_legacy_archive_source_table_source_id_key UNIQUE (source_table, source_id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_domain_id_parent_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_domain_id_parent_id_slug_key UNIQUE (domain_id, parent_id, slug);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_cart_snapshots dsh_checkout_cart_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_cart_snapshots
    ADD CONSTRAINT dsh_checkout_cart_snapshots_pkey PRIMARY KEY (checkout_intent_id);


--
-- Name: dsh_checkout_create_idempotency dsh_checkout_create_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_create_idempotency
    ADD CONSTRAINT dsh_checkout_create_idempotency_pkey PRIMARY KEY (operator_context_id, client_id, idempotency_key);


--
-- Name: dsh_checkout_financial_closure_outbox dsh_checkout_financial_closur_payment_session_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_financial_closure_outbox
    ADD CONSTRAINT dsh_checkout_financial_closur_payment_session_id_event_type_key UNIQUE (payment_session_id, event_type);


--
-- Name: dsh_checkout_financial_closure_outbox dsh_checkout_financial_closure_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_financial_closure_outbox
    ADD CONSTRAINT dsh_checkout_financial_closure_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_intents dsh_checkout_intents_last_wlt_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_last_wlt_status_chk CHECK (((last_wlt_status IS NULL) OR (last_wlt_status = ANY (ARRAY['authorized'::text, 'reference_created'::text, 'cod_pending'::text, 'captured'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text])))) NOT VALID;


--
-- Name: dsh_checkout_intents dsh_checkout_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_item_snapshots dsh_checkout_item_snapshots_checkout_intent_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_item_snapshots
    ADD CONSTRAINT dsh_checkout_item_snapshots_checkout_intent_id_product_id_key UNIQUE (checkout_intent_id, product_id);


--
-- Name: dsh_checkout_item_snapshots dsh_checkout_item_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_item_snapshots
    ADD CONSTRAINT dsh_checkout_item_snapshots_pkey PRIMARY KEY (checkout_intent_id, line_number);


--
-- Name: dsh_checkout_payment_saga_outbox dsh_checkout_payment_saga_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_saga_outbox
    ADD CONSTRAINT dsh_checkout_payment_saga_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_payment_saga_outbox dsh_checkout_payment_saga_outbox_saga_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_saga_outbox
    ADD CONSTRAINT dsh_checkout_payment_saga_outbox_saga_id_key UNIQUE (saga_id);


--
-- Name: dsh_checkout_payment_sagas dsh_checkout_payment_sagas_operator_context_id_command_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_sagas
    ADD CONSTRAINT dsh_checkout_payment_sagas_operator_context_id_command_id_key UNIQUE (operator_context_id, command_id);


--
-- Name: dsh_checkout_payment_sagas dsh_checkout_payment_sagas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_sagas
    ADD CONSTRAINT dsh_checkout_payment_sagas_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_wlt_event_receipts dsh_checkout_wlt_event_operatorcontext_intent_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_wlt_event_receipts
    ADD CONSTRAINT dsh_checkout_wlt_event_operatorcontext_intent_unique UNIQUE (operator_context_id, checkout_intent_id, event_key);


--
-- Name: dsh_checkout_wlt_event_receipts dsh_checkout_wlt_event_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_wlt_event_receipts
    ADD CONSTRAINT dsh_checkout_wlt_event_receipts_pkey PRIMARY KEY (event_key);


--
-- Name: dsh_checkout_wlt_event_receipts dsh_checkout_wlt_event_receipts_wlt_status_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_checkout_wlt_event_receipts
    ADD CONSTRAINT dsh_checkout_wlt_event_receipts_wlt_status_check CHECK ((wlt_status = ANY (ARRAY['authorized'::text, 'reference_created'::text, 'cod_pending'::text, 'captured'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text]))) NOT VALID;


--
-- Name: dsh_client_address_events dsh_client_address_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_address_events
    ADD CONSTRAINT dsh_client_address_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_client_address_mutation_receipts dsh_client_address_mutation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_address_mutation_receipts
    ADD CONSTRAINT dsh_client_address_mutation_receipts_pkey PRIMARY KEY (client_id, idempotency_key);


--
-- Name: dsh_client_address_privacy_events dsh_client_address_privacy_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_address_privacy_events
    ADD CONSTRAINT dsh_client_address_privacy_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_client_address_privacy_mutation_results dsh_client_address_privacy_mutation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_address_privacy_mutation_results
    ADD CONSTRAINT dsh_client_address_privacy_mutation_results_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_client_address_privacy_policy dsh_client_address_privacy_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_address_privacy_policy
    ADD CONSTRAINT dsh_client_address_privacy_policy_pkey PRIMARY KEY (id);


--
-- Name: dsh_client_addresses dsh_client_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_addresses
    ADD CONSTRAINT dsh_client_addresses_pkey PRIMARY KEY (id);


--
-- Name: dsh_client_profile_events dsh_client_profile_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_profile_events
    ADD CONSTRAINT dsh_client_profile_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_client_profile_mutation_receipts dsh_client_profile_mutation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_profile_mutation_receipts
    ADD CONSTRAINT dsh_client_profile_mutation_receipts_pkey PRIMARY KEY (client_id, idempotency_key);


--
-- Name: dsh_client_profiles dsh_client_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_client_profiles
    ADD CONSTRAINT dsh_client_profiles_pkey PRIMARY KEY (client_id);


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_checkout_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_checkout_intent_id_key UNIQUE (checkout_intent_id);


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_order_id_key UNIQUE (order_id);


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: dsh_coupons dsh_coupons_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupons
    ADD CONSTRAINT dsh_coupons_code_hash_key UNIQUE (code_hash);


--
-- Name: dsh_coupons dsh_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupons
    ADD CONSTRAINT dsh_coupons_pkey PRIMARY KEY (id);


--
-- Name: dsh_deliveries dsh_deliveries_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_assignment_id_key UNIQUE (assignment_id);


--
-- Name: dsh_deliveries dsh_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_pkey PRIMARY KEY (id);


--
-- Name: dsh_delivery_exception_operation_command_receipts dsh_delivery_exception_operation_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exception_operation_command_receipts
    ADD CONSTRAINT dsh_delivery_exception_operation_command_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: dsh_delivery_exception_reporters dsh_delivery_exception_reporters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exception_reporters
    ADD CONSTRAINT dsh_delivery_exception_reporters_pkey PRIMARY KEY (exception_id);


--
-- Name: dsh_delivery_exceptions dsh_delivery_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_pkey PRIMARY KEY (id);


--
-- Name: dsh_delivery_proof_review_receipts dsh_delivery_proof_review_recei_operator_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proof_review_receipts
    ADD CONSTRAINT dsh_delivery_proof_review_recei_operator_id_idempotency_key_key UNIQUE (operator_id, idempotency_key);


--
-- Name: dsh_delivery_proof_review_receipts dsh_delivery_proof_review_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proof_review_receipts
    ADD CONSTRAINT dsh_delivery_proof_review_receipts_pkey PRIMARY KEY (id);


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_assignment_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_assignment_id_idempotency_key_key UNIQUE (assignment_id, idempotency_key);


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_pkey PRIMARY KEY (id);


--
-- Name: dsh_delivery_sla_alerts dsh_delivery_sla_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_sla_alerts
    ADD CONSTRAINT dsh_delivery_sla_alerts_pkey PRIMARY KEY (id);


--
-- Name: dsh_delivery_verification_challenges dsh_delivery_verification_challenges_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_verification_challenges
    ADD CONSTRAINT dsh_delivery_verification_challenges_assignment_id_key UNIQUE (assignment_id);


--
-- Name: dsh_delivery_verification_challenges dsh_delivery_verification_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_verification_challenges
    ADD CONSTRAINT dsh_delivery_verification_challenges_pkey PRIMARY KEY (id);


--
-- Name: dsh_dispatch_decisions dsh_dispatch_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_dispatch_decisions
    ADD CONSTRAINT dsh_dispatch_decisions_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_commission_outbox dsh_field_commission_outbox_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_commission_outbox
    ADD CONSTRAINT dsh_field_commission_outbox_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: dsh_field_commission_outbox dsh_field_commission_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_commission_outbox
    ADD CONSTRAINT dsh_field_commission_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_onboarding_assignment_events dsh_field_onboarding_assignment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_onboarding_assignment_events
    ADD CONSTRAINT dsh_field_onboarding_assignment_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_onboarding_assignments dsh_field_onboarding_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_onboarding_assignments
    ADD CONSTRAINT dsh_field_onboarding_assignments_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_readiness_operation_receipts dsh_field_readiness_operation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_readiness_operation_receipts
    ADD CONSTRAINT dsh_field_readiness_operation_receipts_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_visits dsh_field_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_visits
    ADD CONSTRAINT dsh_field_visits_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_banners dsh_home_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_home_banners
    ADD CONSTRAINT dsh_home_banners_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_content_audit dsh_home_content_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_home_content_audit
    ADD CONSTRAINT dsh_home_content_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_content_targets dsh_home_content_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_home_content_targets
    ADD CONSTRAINT dsh_home_content_targets_pkey PRIMARY KEY (content_kind, content_id, target_type, target_value);


--
-- Name: dsh_home_promos dsh_home_promos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_home_promos
    ADD CONSTRAINT dsh_home_promos_pkey PRIMARY KEY (id);


--
-- Name: dsh_incident_communications dsh_incident_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_communications
    ADD CONSTRAINT dsh_incident_communications_pkey PRIMARY KEY (id);


--
-- Name: dsh_incident_entities dsh_incident_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_entities
    ADD CONSTRAINT dsh_incident_entities_pkey PRIMARY KEY (incident_id, entity_type, entity_id);


--
-- Name: dsh_incident_events dsh_incident_events_incident_id_event_type_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_events
    ADD CONSTRAINT dsh_incident_events_incident_id_event_type_correlation_id_key UNIQUE (incident_id, event_type, correlation_id);


--
-- Name: dsh_incident_events dsh_incident_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_events
    ADD CONSTRAINT dsh_incident_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_incident_tasks dsh_incident_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_tasks
    ADD CONSTRAINT dsh_incident_tasks_pkey PRIMARY KEY (id);


--
-- Name: dsh_incidents dsh_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incidents
    ADD CONSTRAINT dsh_incidents_pkey PRIMARY KEY (id);


--
-- Name: dsh_loyalty_earning_policies dsh_loyalty_earning_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_loyalty_earning_policies
    ADD CONSTRAINT dsh_loyalty_earning_policies_pkey PRIMARY KEY (id);


--
-- Name: dsh_loyalty_tiers dsh_loyalty_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_loyalty_tiers
    ADD CONSTRAINT dsh_loyalty_tiers_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_audit_events dsh_marketing_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_audit_events
    ADD CONSTRAINT dsh_marketing_audit_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_campaigns dsh_marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_campaigns
    ADD CONSTRAINT dsh_marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_clicks dsh_marketing_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_clicks
    ADD CONSTRAINT dsh_marketing_clicks_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_impressions dsh_marketing_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_impressions
    ADD CONSTRAINT dsh_marketing_impressions_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_target_bindings dsh_marketing_target_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_target_bindings
    ADD CONSTRAINT dsh_marketing_target_bindings_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_tickers dsh_marketing_tickers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_tickers
    ADD CONSTRAINT dsh_marketing_tickers_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_visibility_gates dsh_marketing_visibility_gates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_marketing_visibility_gates
    ADD CONSTRAINT dsh_marketing_visibility_gates_pkey PRIMARY KEY (id);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute__master_product_id_attribute_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute__master_product_id_attribute_i_key UNIQUE (master_product_id, attribute_id, locale);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: dsh_master_product_relationships dsh_master_product_relationsh_source_master_product_id_targ_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_relationships
    ADD CONSTRAINT dsh_master_product_relationsh_source_master_product_id_targ_key UNIQUE (source_master_product_id, target_master_product_id, relationship_type);


--
-- Name: dsh_master_product_relationships dsh_master_product_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_relationships
    ADD CONSTRAINT dsh_master_product_relationships_pkey PRIMARY KEY (id);


--
-- Name: dsh_master_products dsh_master_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_pkey PRIMARY KEY (id);


--
-- Name: dsh_media_refs dsh_media_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_pkey PRIMARY KEY (media_ref);


--
-- Name: dsh_media_refs dsh_media_refs_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_storage_key_key UNIQUE (storage_key);


--
-- Name: dsh_notification_channel_deliveries dsh_notification_channel_deliveries_notification_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_channel_deliveries
    ADD CONSTRAINT dsh_notification_channel_deliveries_notification_id_channel_key UNIQUE (notification_id, channel);


--
-- Name: dsh_notification_channel_deliveries dsh_notification_channel_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_channel_deliveries
    ADD CONSTRAINT dsh_notification_channel_deliveries_pkey PRIMARY KEY (id);


--
-- Name: dsh_notification_delivery_attempts dsh_notification_delivery_attempts_event_id_attempt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_delivery_attempts
    ADD CONSTRAINT dsh_notification_delivery_attempts_event_id_attempt_number_key UNIQUE (event_id, attempt_number);


--
-- Name: dsh_notification_delivery_attempts dsh_notification_delivery_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_delivery_attempts
    ADD CONSTRAINT dsh_notification_delivery_attempts_pkey PRIMARY KEY (id);


--
-- Name: dsh_notification_preferences dsh_notification_preferences_actor_id_actor_type_topic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_preferences
    ADD CONSTRAINT dsh_notification_preferences_actor_id_actor_type_topic_key UNIQUE (actor_id, actor_type, topic);


--
-- Name: dsh_notification_preferences dsh_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_preferences
    ADD CONSTRAINT dsh_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: dsh_notification_push_endpoints dsh_notification_push_endpoin_actor_id_actor_type_device_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_push_endpoints
    ADD CONSTRAINT dsh_notification_push_endpoin_actor_id_actor_type_device_id_key UNIQUE (actor_id, actor_type, device_id);


--
-- Name: dsh_notification_push_endpoints dsh_notification_push_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_push_endpoints
    ADD CONSTRAINT dsh_notification_push_endpoints_pkey PRIMARY KEY (id);


--
-- Name: dsh_notification_push_endpoints dsh_notification_push_endpoints_provider_endpoint_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_push_endpoints
    ADD CONSTRAINT dsh_notification_push_endpoints_provider_endpoint_token_key UNIQUE (provider, endpoint_token);


--
-- Name: dsh_notifications dsh_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notifications
    ADD CONSTRAINT dsh_notifications_pkey PRIMARY KEY (id);


--
-- Name: dsh_onboarding_change_requests dsh_onboarding_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_change_requests
    ADD CONSTRAINT dsh_onboarding_change_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_onboarding_change_requests dsh_onboarding_change_requests_thread_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_change_requests
    ADD CONSTRAINT dsh_onboarding_change_requests_thread_id_idempotency_key_key UNIQUE (thread_id, idempotency_key);


--
-- Name: dsh_onboarding_collaboration_messages dsh_onboarding_collaboration__thread_id_sender_actor_id_cli_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_messages
    ADD CONSTRAINT dsh_onboarding_collaboration__thread_id_sender_actor_id_cli_key UNIQUE (thread_id, sender_actor_id, client_message_id);


--
-- Name: dsh_onboarding_collaboration_messages dsh_onboarding_collaboration_mess_thread_id_sequence_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_messages
    ADD CONSTRAINT dsh_onboarding_collaboration_mess_thread_id_sequence_number_key UNIQUE (thread_id, sequence_number);


--
-- Name: dsh_onboarding_collaboration_messages dsh_onboarding_collaboration_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_messages
    ADD CONSTRAINT dsh_onboarding_collaboration_messages_pkey PRIMARY KEY (id);


--
-- Name: dsh_onboarding_collaboration_read_cursors dsh_onboarding_collaboration_read_cursors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_read_cursors
    ADD CONSTRAINT dsh_onboarding_collaboration_read_cursors_pkey PRIMARY KEY (thread_id, actor_id);


--
-- Name: dsh_onboarding_collaboration_threads dsh_onboarding_collaboration_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_threads
    ADD CONSTRAINT dsh_onboarding_collaboration_threads_pkey PRIMARY KEY (id);


--
-- Name: dsh_operational_incidents dsh_operational_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_operational_incidents
    ADD CONSTRAINT dsh_operational_incidents_pkey PRIMARY KEY (id);


--
-- Name: dsh_operational_outbox_events dsh_operational_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_operational_outbox_events
    ADD CONSTRAINT dsh_operational_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_operator_dispatch_command_receipts dsh_operator_dispatch_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_operator_dispatch_command_receipts
    ADD CONSTRAINT dsh_operator_dispatch_command_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: dsh_operator_store_creation_idempotency dsh_operator_store_creation_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_operator_store_creation_idempotency
    ADD CONSTRAINT dsh_operator_store_creation_idempotency_pkey PRIMARY KEY (operator_context_id, actor_id, idempotency_key);


--
-- Name: dsh_order_cancellation_actions dsh_order_cancellation_action_cancellation_id_idempotency_k_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellation_actions
    ADD CONSTRAINT dsh_order_cancellation_action_cancellation_id_idempotency_k_key UNIQUE (cancellation_id, idempotency_key);


--
-- Name: dsh_order_cancellation_actions dsh_order_cancellation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellation_actions
    ADD CONSTRAINT dsh_order_cancellation_actions_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_cancellations dsh_order_cancellations_operator_context_id_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellations
    ADD CONSTRAINT dsh_order_cancellations_operator_context_id_correlation_id_key UNIQUE (operator_context_id, correlation_id);


--
-- Name: dsh_order_cancellations dsh_order_cancellations_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellations
    ADD CONSTRAINT dsh_order_cancellations_order_id_key UNIQUE (order_id);


--
-- Name: dsh_order_cancellations dsh_order_cancellations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellations
    ADD CONSTRAINT dsh_order_cancellations_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_create_idempotency dsh_order_create_idempotency_operator_context_id_checkout_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_create_idempotency
    ADD CONSTRAINT dsh_order_create_idempotency_operator_context_id_checkout_i_key UNIQUE (operator_context_id, checkout_intent_id);


--
-- Name: dsh_order_create_idempotency dsh_order_create_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_create_idempotency
    ADD CONSTRAINT dsh_order_create_idempotency_pkey PRIMARY KEY (operator_context_id, client_id, idempotency_key);


--
-- Name: dsh_order_event_outbox dsh_order_event_outbox_operator_context_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_event_outbox
    ADD CONSTRAINT dsh_order_event_outbox_operator_context_id_event_id_key UNIQUE (operator_context_id, event_id);


--
-- Name: dsh_order_event_outbox dsh_order_event_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_event_outbox
    ADD CONSTRAINT dsh_order_event_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_items dsh_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_items
    ADD CONSTRAINT dsh_order_items_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_payment_projection_reconciliation dsh_order_payment_projection__operator_context_id_wlt_payme_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_payment_projection_reconciliation
    ADD CONSTRAINT dsh_order_payment_projection__operator_context_id_wlt_payme_key UNIQUE (operator_context_id, wlt_payment_session_id);


--
-- Name: dsh_order_payment_projection_reconciliation dsh_order_payment_projection_reconciliation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_payment_projection_reconciliation
    ADD CONSTRAINT dsh_order_payment_projection_reconciliation_pkey PRIMARY KEY (order_id);


--
-- Name: dsh_order_preparation_alerts dsh_order_preparation_alerts_order_id_alert_kind_estimate_r_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_alerts
    ADD CONSTRAINT dsh_order_preparation_alerts_order_id_alert_kind_estimate_r_key UNIQUE (order_id, alert_kind, estimate_revision, correlation_id);


--
-- Name: dsh_order_preparation_alerts dsh_order_preparation_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_alerts
    ADD CONSTRAINT dsh_order_preparation_alerts_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_preparation_estimate_events dsh_order_preparation_estimate_even_order_id_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_estimate_events
    ADD CONSTRAINT dsh_order_preparation_estimate_even_order_id_correlation_id_key UNIQUE (order_id, correlation_id);


--
-- Name: dsh_order_preparation_estimate_events dsh_order_preparation_estimate_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_estimate_events
    ADD CONSTRAINT dsh_order_preparation_estimate_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_preparation_issue_events dsh_order_preparation_issue_events_issue_id_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_issue_id_correlation_id_key UNIQUE (issue_id, correlation_id);


--
-- Name: dsh_order_preparation_issue_events dsh_order_preparation_issue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_preparation_issues dsh_order_preparation_issues_order_id_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_order_id_correlation_id_key UNIQUE (order_id, correlation_id);


--
-- Name: dsh_order_preparation_issues dsh_order_preparation_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_preparation_replacements dsh_order_preparation_replacements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_replacements
    ADD CONSTRAINT dsh_order_preparation_replacements_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_refund_effects dsh_order_refund_effects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_refund_effects
    ADD CONSTRAINT dsh_order_refund_effects_pkey PRIMARY KEY (order_id);


--
-- Name: dsh_order_refund_effects dsh_order_refund_effects_refund_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_refund_effects
    ADD CONSTRAINT dsh_order_refund_effects_refund_reference_key UNIQUE (refund_reference);


--
-- Name: dsh_order_rescue_actions dsh_order_rescue_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_actions
    ADD CONSTRAINT dsh_order_rescue_actions_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_rescue_actions dsh_order_rescue_actions_requested_by_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_actions
    ADD CONSTRAINT dsh_order_rescue_actions_requested_by_idempotency_key_key UNIQUE (requested_by, idempotency_key);


--
-- Name: dsh_order_rescue_cases dsh_order_rescue_cases_opened_by_create_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_cases
    ADD CONSTRAINT dsh_order_rescue_cases_opened_by_create_idempotency_key_key UNIQUE (opened_by, create_idempotency_key);


--
-- Name: dsh_order_rescue_cases dsh_order_rescue_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_cases
    ADD CONSTRAINT dsh_order_rescue_cases_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_rescue_events dsh_order_rescue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_events
    ADD CONSTRAINT dsh_order_rescue_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_rescue_events dsh_order_rescue_events_rescue_case_id_event_type_correlati_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_events
    ADD CONSTRAINT dsh_order_rescue_events_rescue_case_id_event_type_correlati_key UNIQUE (rescue_case_id, event_type, correlation_id);


--
-- Name: dsh_order_return_actions dsh_order_return_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_return_actions
    ADD CONSTRAINT dsh_order_return_actions_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_return_items dsh_order_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_return_items
    ADD CONSTRAINT dsh_order_return_items_pkey PRIMARY KEY (return_id, order_item_id);


--
-- Name: dsh_order_returns dsh_order_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_returns
    ADD CONSTRAINT dsh_order_returns_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_status_events dsh_order_status_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_status_events
    ADD CONSTRAINT dsh_order_status_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_truth_audit dsh_order_truth_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_truth_audit
    ADD CONSTRAINT dsh_order_truth_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_orders dsh_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_activation_events dsh_partner_activation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_activation_events
    ADD CONSTRAINT dsh_partner_activation_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_brands dsh_partner_brands_operatorcontext_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_brands
    ADD CONSTRAINT dsh_partner_brands_operatorcontext_name_unique UNIQUE (operator_context_id, partner_id, name_ar);


--
-- Name: dsh_partner_brands dsh_partner_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_brands
    ADD CONSTRAINT dsh_partner_brands_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_courier_connection_codes dsh_partner_courier_connection_codes_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_courier_connection_codes
    ADD CONSTRAINT dsh_partner_courier_connection_codes_code_hash_key UNIQUE (code_hash);


--
-- Name: dsh_partner_courier_connection_codes dsh_partner_courier_connection_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_courier_connection_codes
    ADD CONSTRAINT dsh_partner_courier_connection_codes_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_delivery_audit_events dsh_partner_delivery_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_audit_events
    ADD CONSTRAINT dsh_partner_delivery_audit_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_delivery_command_receipts dsh_partner_delivery_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_command_receipts
    ADD CONSTRAINT dsh_partner_delivery_command_receipts_pkey PRIMARY KEY (operator_context_id, actor_id, command_id);


--
-- Name: dsh_partner_delivery_tasks dsh_partner_delivery_tasks_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_tasks
    ADD CONSTRAINT dsh_partner_delivery_tasks_order_id_key UNIQUE (order_id);


--
-- Name: dsh_partner_delivery_tasks dsh_partner_delivery_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_tasks
    ADD CONSTRAINT dsh_partner_delivery_tasks_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_document_taxonomy dsh_partner_document_taxonomy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_document_taxonomy
    ADD CONSTRAINT dsh_partner_document_taxonomy_pkey PRIMARY KEY (document_type);


--
-- Name: dsh_partner_documents dsh_partner_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_documents
    ADD CONSTRAINT dsh_partner_documents_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_visit_id_media_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_visit_id_media_ref_key UNIQUE (visit_id, media_ref);


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_first_stores dsh_partner_first_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_first_stores
    ADD CONSTRAINT dsh_partner_first_stores_pkey PRIMARY KEY (partner_id);


--
-- Name: dsh_partner_first_stores dsh_partner_first_stores_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_first_stores
    ADD CONSTRAINT dsh_partner_first_stores_store_id_key UNIQUE (store_id);


--
-- Name: dsh_partner_offers dsh_partner_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_order_decisions dsh_partner_order_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_decisions
    ADD CONSTRAINT dsh_partner_order_decisions_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_order_transition_receipts dsh_partner_order_transition_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_transition_receipts
    ADD CONSTRAINT dsh_partner_order_transition_receipts_pkey PRIMARY KEY (store_id, idempotency_key);


--
-- Name: dsh_partner_store_transfer_audit dsh_partner_store_transfer_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_store_transfer_audit
    ADD CONSTRAINT dsh_partner_store_transfer_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_wlt_outbox dsh_partner_wlt_outbox_event_type_activation_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_outbox
    ADD CONSTRAINT dsh_partner_wlt_outbox_event_type_activation_event_id_key UNIQUE (event_type, activation_event_id);


--
-- Name: dsh_partner_wlt_outbox dsh_partner_wlt_outbox_partner_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_outbox
    ADD CONSTRAINT dsh_partner_wlt_outbox_partner_id_idempotency_key_key UNIQUE (partner_id, idempotency_key);


--
-- Name: dsh_partner_wlt_outbox dsh_partner_wlt_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_outbox
    ADD CONSTRAINT dsh_partner_wlt_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_wlt_reconciliation_cases dsh_partner_wlt_reconciliation_cases_partner_id_issue_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_reconciliation_cases
    ADD CONSTRAINT dsh_partner_wlt_reconciliation_cases_partner_id_issue_type_key UNIQUE (partner_id, issue_type);


--
-- Name: dsh_partner_wlt_reconciliation_cases dsh_partner_wlt_reconciliation_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_reconciliation_cases
    ADD CONSTRAINT dsh_partner_wlt_reconciliation_cases_pkey PRIMARY KEY (id);


--
-- Name: dsh_partners dsh_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partners
    ADD CONSTRAINT dsh_partners_pkey PRIMARY KEY (id);


--
-- Name: dsh_pickup_audit_events dsh_pickup_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_audit_events
    ADD CONSTRAINT dsh_pickup_audit_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_pickup_mutation_commands dsh_pickup_mutation_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_mutation_commands
    ADD CONSTRAINT dsh_pickup_mutation_commands_pkey PRIMARY KEY (command_id);


--
-- Name: dsh_pickup_sessions dsh_pickup_sessions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_order_id_key UNIQUE (order_id);


--
-- Name: dsh_pickup_sessions dsh_pickup_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_pkey PRIMARY KEY (id);


--
-- Name: dsh_pickup_sla_alerts dsh_pickup_sla_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sla_alerts
    ADD CONSTRAINT dsh_pickup_sla_alerts_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_capacity_configs dsh_platform_capacity_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_capacity_configs
    ADD CONSTRAINT dsh_platform_capacity_configs_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_capacity_configs dsh_platform_capacity_configs_zone_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_capacity_configs
    ADD CONSTRAINT dsh_platform_capacity_configs_zone_id_key UNIQUE (zone_id);


--
-- Name: dsh_platform_delivery_mode_policies dsh_platform_delivery_mode_policie_zone_id_fulfillment_mode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_delivery_mode_policies
    ADD CONSTRAINT dsh_platform_delivery_mode_policie_zone_id_fulfillment_mode_key UNIQUE (zone_id, fulfillment_mode);


--
-- Name: dsh_platform_delivery_mode_policies dsh_platform_delivery_mode_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_delivery_mode_policies
    ADD CONSTRAINT dsh_platform_delivery_mode_policies_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_notification_config dsh_platform_notification_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_notification_config
    ADD CONSTRAINT dsh_platform_notification_config_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_notification_config dsh_platform_notification_config_topic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_notification_config
    ADD CONSTRAINT dsh_platform_notification_config_topic_key UNIQUE (topic);


--
-- Name: dsh_platform_policy_events dsh_platform_policy_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_policy_events
    ADD CONSTRAINT dsh_platform_policy_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_policy_mutation_results dsh_platform_policy_mutation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_policy_mutation_results
    ADD CONSTRAINT dsh_platform_policy_mutation_results_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_platform_sla_rules dsh_platform_sla_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_sla_rules
    ADD CONSTRAINT dsh_platform_sla_rules_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_sla_rules dsh_platform_sla_rules_zone_id_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_sla_rules
    ADD CONSTRAINT dsh_platform_sla_rules_zone_id_category_key UNIQUE (zone_id, category);


--
-- Name: dsh_platform_zones dsh_platform_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_zones
    ADD CONSTRAINT dsh_platform_zones_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidates_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_proposal_audit dsh_product_proposal_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposal_audit
    ADD CONSTRAINT dsh_product_proposal_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_proposals dsh_product_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_pkey PRIMARY KEY (id);


--
-- Name: dsh_promotion_funding_outbox dsh_promotion_funding_outbox_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: dsh_promotion_funding_outbox dsh_promotion_funding_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_provider_availability_projections dsh_provider_availability_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_availability_projections
    ADD CONSTRAINT dsh_provider_availability_projections_pkey PRIMARY KEY (operator_context_id, notice_id);


--
-- Name: dsh_provider_rating_events dsh_provider_rating_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_events
    ADD CONSTRAINT dsh_provider_rating_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_provider_rating_mutation_receipts dsh_provider_rating_mutation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_mutation_receipts
    ADD CONSTRAINT dsh_provider_rating_mutation_receipts_pkey PRIMARY KEY (id);


--
-- Name: dsh_provider_ratings dsh_provider_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_ratings
    ADD CONSTRAINT dsh_provider_ratings_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_checklist_policy_events dsh_readiness_checklist_policy_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_policy_events
    ADD CONSTRAINT dsh_readiness_checklist_policy_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_checklist_policy_events dsh_readiness_checklist_policy_events_template_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_policy_events
    ADD CONSTRAINT dsh_readiness_checklist_policy_events_template_id_version_key UNIQUE (template_id, version);


--
-- Name: dsh_readiness_checklist_templates dsh_readiness_checklist_templ_operator_context_id_business__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_templates
    ADD CONSTRAINT dsh_readiness_checklist_templ_operator_context_id_business__key UNIQUE (operator_context_id, business_vertical_id);


--
-- Name: dsh_readiness_checklist_template_items dsh_readiness_checklist_template__template_id_display_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_template_items
    ADD CONSTRAINT dsh_readiness_checklist_template__template_id_display_order_key UNIQUE (template_id, display_order);


--
-- Name: dsh_readiness_checklist_template_items dsh_readiness_checklist_template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_template_items
    ADD CONSTRAINT dsh_readiness_checklist_template_items_pkey PRIMARY KEY (template_id, check_type);


--
-- Name: dsh_readiness_checklist_templates dsh_readiness_checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_templates
    ADD CONSTRAINT dsh_readiness_checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_checks dsh_readiness_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_pkey PRIMARY KEY (id);


--
-- Name: dsh_reels dsh_reels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_reels
    ADD CONSTRAINT dsh_reels_pkey PRIMARY KEY (id);


--
-- Name: dsh_return_to_store_command_receipts dsh_return_to_store_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_return_to_store_command_receipts
    ADD CONSTRAINT dsh_return_to_store_command_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: dsh_service_area_capacity_policies dsh_service_area_capacity_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_capacity_policies
    ADD CONSTRAINT dsh_service_area_capacity_policies_pkey PRIMARY KEY (operator_context_id, service_area_code);


--
-- Name: dsh_service_area_events dsh_service_area_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_events
    ADD CONSTRAINT dsh_service_area_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_service_area_geofences dsh_service_area_geofences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_geofences
    ADD CONSTRAINT dsh_service_area_geofences_pkey PRIMARY KEY (service_area_code);


--
-- Name: dsh_service_area_mutation_results dsh_service_area_mutation_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_mutation_results
    ADD CONSTRAINT dsh_service_area_mutation_results_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_service_area_versions dsh_service_area_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_versions
    ADD CONSTRAINT dsh_service_area_versions_pkey PRIMARY KEY (service_area_code, version);


--
-- Name: dsh_sla_alerts dsh_sla_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_sla_alerts
    ADD CONSTRAINT dsh_sla_alerts_pkey PRIMARY KEY (id);


--
-- Name: dsh_special_request_information_exchanges dsh_special_request_information_exchanges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_information_exchanges
    ADD CONSTRAINT dsh_special_request_information_exchanges_pkey PRIMARY KEY (id);


--
-- Name: dsh_special_request_information_response_receipts dsh_special_request_information_response_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_information_response_receipts
    ADD CONSTRAINT dsh_special_request_information_response_receipts_pkey PRIMARY KEY (operator_context_id, client_id, idempotency_key);


--
-- Name: dsh_special_requests dsh_special_request_last_wlt_status_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_special_requests
    ADD CONSTRAINT dsh_special_request_last_wlt_status_chk CHECK (((last_wlt_status IS NULL) OR (last_wlt_status = ANY (ARRAY['authorized'::text, 'reference_created'::text, 'cod_pending'::text, 'captured'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text])))) NOT VALID;


--
-- Name: dsh_special_request_saga_outbox dsh_special_request_saga_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_saga_outbox
    ADD CONSTRAINT dsh_special_request_saga_outbox_pkey PRIMARY KEY (id);


--
-- Name: dsh_special_request_saga_outbox dsh_special_request_saga_outbox_saga_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_saga_outbox
    ADD CONSTRAINT dsh_special_request_saga_outbox_saga_id_key UNIQUE (saga_id);


--
-- Name: dsh_special_request_sagas dsh_special_request_sagas_operator_context_id_command_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_sagas
    ADD CONSTRAINT dsh_special_request_sagas_operator_context_id_command_id_key UNIQUE (operator_context_id, command_id);


--
-- Name: dsh_special_request_sagas dsh_special_request_sagas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_sagas
    ADD CONSTRAINT dsh_special_request_sagas_pkey PRIMARY KEY (id);


--
-- Name: dsh_special_request_wlt_event_receipts dsh_special_request_wlt_event_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_wlt_event_receipts
    ADD CONSTRAINT dsh_special_request_wlt_event_receipts_pkey PRIMARY KEY (event_key);


--
-- Name: dsh_special_request_wlt_event_receipts dsh_special_request_wlt_event_receipts_wlt_status_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.dsh_special_request_wlt_event_receipts
    ADD CONSTRAINT dsh_special_request_wlt_event_receipts_wlt_status_check CHECK ((wlt_status = ANY (ARRAY['authorized'::text, 'reference_created'::text, 'cod_pending'::text, 'captured'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text]))) NOT VALID;


--
-- Name: dsh_special_request_wlt_event_receipts dsh_special_request_wlt_event_scope_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_wlt_event_receipts
    ADD CONSTRAINT dsh_special_request_wlt_event_scope_unique UNIQUE (operator_context_id, special_request_id, event_key);


--
-- Name: dsh_special_requests_audit_events dsh_special_requests_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_requests_audit_events
    ADD CONSTRAINT dsh_special_requests_audit_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_special_requests dsh_special_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_requests
    ADD CONSTRAINT dsh_special_requests_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_action_audit dsh_store_action_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_action_audit
    ADD CONSTRAINT dsh_store_action_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_actor_scopes dsh_store_actor_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_actor_scopes
    ADD CONSTRAINT dsh_store_actor_scopes_pkey PRIMARY KEY (actor_id, actor_role, store_id);


--
-- Name: dsh_store_assortment_inventory dsh_store_assortment_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortment_inventory
    ADD CONSTRAINT dsh_store_assortment_inventory_pkey PRIMARY KEY (store_assortment_id);


--
-- Name: dsh_store_assortment_prices dsh_store_assortment_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortment_prices
    ADD CONSTRAINT dsh_store_assortment_prices_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_assortments dsh_store_assortments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_assortments dsh_store_assortments_store_id_master_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_store_id_master_product_id_key UNIQUE (store_id, master_product_id);


--
-- Name: dsh_store_captain_handoff_command_receipts dsh_store_captain_handoff_command_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoff_command_receipts
    ADD CONSTRAINT dsh_store_captain_handoff_command_receipts_pkey PRIMARY KEY (operator_context_id, idempotency_key);


--
-- Name: dsh_store_captain_handoffs dsh_store_captain_handoffs_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoffs
    ADD CONSTRAINT dsh_store_captain_handoffs_assignment_id_key UNIQUE (assignment_id);


--
-- Name: dsh_store_captain_handoffs dsh_store_captain_handoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoffs
    ADD CONSTRAINT dsh_store_captain_handoffs_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_catalog_domains dsh_store_catalog_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_catalog_domains
    ADD CONSTRAINT dsh_store_catalog_domains_pkey PRIMARY KEY (store_id, domain_id);


--
-- Name: dsh_store_courier_settings dsh_store_courier_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_courier_settings
    ADD CONSTRAINT dsh_store_courier_settings_pkey PRIMARY KEY (store_id);


--
-- Name: dsh_store_coverage_zones dsh_store_coverage_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_coverage_zones
    ADD CONSTRAINT dsh_store_coverage_zones_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_delivery_pricing_audit dsh_store_delivery_pricing_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_delivery_pricing_audit
    ADD CONSTRAINT dsh_store_delivery_pricing_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_delivery_pricing dsh_store_delivery_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_delivery_pricing
    ADD CONSTRAINT dsh_store_delivery_pricing_pkey PRIMARY KEY (store_id, fulfillment_mode);


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_idempotency dsh_store_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_idempotency
    ADD CONSTRAINT dsh_store_idempotency_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_store_order_preparation_policies dsh_store_order_preparation_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_order_preparation_policies
    ADD CONSTRAINT dsh_store_order_preparation_policies_pkey PRIMARY KEY (store_id);


--
-- Name: dsh_store_order_preparation_policy_events dsh_store_order_preparation_policy__store_id_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_order_preparation_policy_events
    ADD CONSTRAINT dsh_store_order_preparation_policy__store_id_correlation_id_key UNIQUE (store_id, correlation_id);


--
-- Name: dsh_store_order_preparation_policy_events dsh_store_order_preparation_policy_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_order_preparation_policy_events
    ADD CONSTRAINT dsh_store_order_preparation_policy_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_pickup_readiness_reports dsh_store_pickup_readiness_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_pickup_readiness_reports
    ADD CONSTRAINT dsh_store_pickup_readiness_reports_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_publication_decisions dsh_store_publication_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_publication_decisions
    ADD CONSTRAINT dsh_store_publication_decisions_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_publication_override_policies dsh_store_publication_override_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_publication_override_policies
    ADD CONSTRAINT dsh_store_publication_override_policies_pkey PRIMARY KEY (operator_context_id);


--
-- Name: dsh_stores dsh_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_pkey PRIMARY KEY (id);


--
-- Name: dsh_stores dsh_stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_slug_key UNIQUE (slug);


--
-- Name: dsh_subscription_lifecycle_events dsh_subscription_lifecycle_ev_purchase_id_idempotency_key_e_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_lifecycle_events
    ADD CONSTRAINT dsh_subscription_lifecycle_ev_purchase_id_idempotency_key_e_key UNIQUE (purchase_id, idempotency_key, event_type);


--
-- Name: dsh_subscription_lifecycle_events dsh_subscription_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_lifecycle_events
    ADD CONSTRAINT dsh_subscription_lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_subscription_plans dsh_subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_plans
    ADD CONSTRAINT dsh_subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: dsh_subscription_purchases dsh_subscription_purchases_operator_context_id_client_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_operator_context_id_client_id_id_key UNIQUE (operator_context_id, client_id, idempotency_key);


--
-- Name: dsh_subscription_purchases dsh_subscription_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_pkey PRIMARY KEY (id);


--
-- Name: dsh_subscription_purchases dsh_subscription_purchases_wlt_payment_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_wlt_payment_session_id_key UNIQUE (wlt_payment_session_id);


--
-- Name: dsh_support_canned_responses dsh_support_canned_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_canned_responses
    ADD CONSTRAINT dsh_support_canned_responses_pkey PRIMARY KEY (id);


--
-- Name: dsh_support_message_attachments dsh_support_message_attachments_message_id_media_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_attachments
    ADD CONSTRAINT dsh_support_message_attachments_message_id_media_asset_id_key UNIQUE (message_id, media_asset_id);


--
-- Name: dsh_support_message_attachments dsh_support_message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_attachments
    ADD CONSTRAINT dsh_support_message_attachments_pkey PRIMARY KEY (id);


--
-- Name: dsh_support_message_read_receipts dsh_support_message_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_read_receipts
    ADD CONSTRAINT dsh_support_message_read_receipts_pkey PRIMARY KEY (message_id, actor_id, actor_role);


--
-- Name: dsh_support_messages dsh_support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_messages
    ADD CONSTRAINT dsh_support_messages_pkey PRIMARY KEY (id);


--
-- Name: dsh_support_ticket_events dsh_support_ticket_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_ticket_events
    ADD CONSTRAINT dsh_support_ticket_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_support_tickets dsh_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_tickets
    ADD CONSTRAINT dsh_support_tickets_pkey PRIMARY KEY (id);


--
-- Name: dsh_visit_checklist_requirements dsh_visit_checklist_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_visit_checklist_requirements
    ADD CONSTRAINT dsh_visit_checklist_requirements_pkey PRIMARY KEY (id);


--
-- Name: dsh_visit_checklist_requirements dsh_visit_checklist_requirements_visit_id_check_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_visit_checklist_requirements
    ADD CONSTRAINT dsh_visit_checklist_requirements_visit_id_check_type_key UNIQUE (visit_id, check_type);


--
-- Name: dsh_visit_checklist_requirements dsh_visit_checklist_requirements_visit_id_display_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_visit_checklist_requirements
    ADD CONSTRAINT dsh_visit_checklist_requirements_visit_id_display_order_key UNIQUE (visit_id, display_order);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_order_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_order_id_event_type_key UNIQUE (order_id, event_type);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: runtime_seed_history runtime_seed_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.runtime_seed_history
    ADD CONSTRAINT runtime_seed_history_pkey PRIMARY KEY (service_name, seed_name);


--


--
-- Name: dsh_partner_order_decisions uq_partner_order_decision; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_decisions
    ADD CONSTRAINT uq_partner_order_decision UNIQUE (order_id);


--
-- Name: dsh_captain_financial_eligibility_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_captain_financial_eligibility_expiry_idx ON public.dsh_captain_financial_eligibility USING btree (expires_at, eligible);


--
-- Name: dsh_captain_membership_history_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_captain_membership_history_idempotency_uidx ON public.dsh_captain_membership_history USING btree (membership_id, idempotency_key) WHERE (btrim(idempotency_key) <> ''::text);


--
-- Name: dsh_captain_memberships_active_store_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_captain_memberships_active_store_uidx ON public.dsh_captain_memberships USING btree (captain_actor_id, store_id) WHERE ((status = 'active'::text) AND (btrim(captain_actor_id) <> ''::text));


--
-- Name: dsh_captain_memberships_pending_identity_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_captain_memberships_pending_identity_uidx ON public.dsh_captain_memberships USING btree (store_id, lower(btrim(captain_actor_id))) WHERE ((status = 'invited'::text) AND (btrim(captain_actor_id) <> ''::text));


--
-- Name: dsh_captain_memberships_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_captain_memberships_store_idx ON public.dsh_captain_memberships USING btree (store_id, status);


--
-- Name: dsh_catalog_create_idempotency_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_catalog_create_idempotency_created_at_idx ON public.dsh_catalog_create_idempotency USING btree (created_at);


--
-- Name: dsh_field_commission_outbox_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_field_commission_outbox_category_idx ON public.dsh_field_commission_outbox USING btree (partner_category, occurred_at DESC);


--
-- Name: dsh_field_readiness_receipts_correlation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_field_readiness_receipts_correlation_idx ON public.dsh_field_readiness_operation_receipts USING btree (actor_id, correlation_id, created_at DESC);


--
-- Name: dsh_field_readiness_receipts_identity_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_field_readiness_receipts_identity_uq ON public.dsh_field_readiness_operation_receipts USING btree (actor_id, operation, idempotency_key);


--
-- Name: dsh_field_readiness_receipts_resource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_field_readiness_receipts_resource_idx ON public.dsh_field_readiness_operation_receipts USING btree (actor_id, operation, resource_id, created_at DESC);


--
-- Name: dsh_field_visits_completion_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_field_visits_completion_idempotency_uq ON public.dsh_field_visits USING btree (field_agent_id, completion_idempotency_key) WHERE (completion_idempotency_key IS NOT NULL);


--
-- Name: dsh_field_visits_create_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_field_visits_create_idempotency_uq ON public.dsh_field_visits USING btree (field_agent_id, create_idempotency_key) WHERE (create_idempotency_key IS NOT NULL);


--
-- Name: dsh_partner_activation_event_retry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_partner_activation_event_retry_idx ON public.dsh_partner_activation_events USING btree (partner_id, idempotency_key) WHERE (btrim(idempotency_key) <> ''::text);


--
-- Name: dsh_partner_courier_issue_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_partner_courier_issue_idempotency_uidx ON public.dsh_partner_courier_connection_codes USING btree (store_id, team_member_id, issue_idempotency_key) WHERE (btrim(issue_idempotency_key) <> ''::text);


--
-- Name: dsh_partner_document_reviews_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_partner_document_reviews_idempotency_uq ON public.dsh_partner_document_reviews USING btree (operator_context_id, partner_id, document_id, reviewed_by_actor_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: dsh_partner_documents_upload_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_partner_documents_upload_idempotency_uq ON public.dsh_partner_documents USING btree (operator_context_id, partner_id, uploaded_by_actor_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: dsh_partner_field_visits_create_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_partner_field_visits_create_idempotency_uq ON public.dsh_partner_field_visits USING btree (operator_context_id, partner_id, field_actor_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: dsh_partner_wlt_outbox_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_partner_wlt_outbox_pending_idx ON public.dsh_partner_wlt_outbox USING btree (available_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));


--
-- Name: dsh_partner_wlt_reconciliation_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_partner_wlt_reconciliation_open_idx ON public.dsh_partner_wlt_reconciliation_cases USING btree (last_detected_at DESC) WHERE (status = 'open'::text);


--
-- Name: dsh_provider_availability_actor_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_provider_availability_actor_window_idx ON public.dsh_provider_availability_projections USING btree (operator_context_id, actor_type, actor_id, starts_at, ends_at) WHERE (status = 'active'::text);


--
-- Name: dsh_provider_availability_projections_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_provider_availability_projections_idempotency_idx ON public.dsh_provider_availability_projections USING btree (operator_context_id, idempotency_key);


--
-- Name: dsh_readiness_checks_mutation_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_readiness_checks_mutation_idempotency_uq ON public.dsh_readiness_checks USING btree (verified_by, mutation_idempotency_key) WHERE (mutation_idempotency_key IS NOT NULL);


--
-- Name: dsh_readiness_escalations_create_idempotency_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_readiness_escalations_create_idempotency_uq ON public.dsh_readiness_escalations USING btree (raised_by, create_idempotency_key) WHERE (create_idempotency_key IS NOT NULL);


--
-- Name: dsh_special_request_wlt_terminal_outcome_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dsh_special_request_wlt_terminal_outcome_unique ON public.dsh_special_request_wlt_event_receipts USING btree (operator_context_id, special_request_id, payment_session_id) WHERE (wlt_status = ANY (ARRAY['captured'::text, 'cod_finalized'::text, 'failed'::text, 'expired'::text]));


--
-- Name: dsh_store_action_audit_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_store_action_audit_store_idx ON public.dsh_store_action_audit USING btree (store_id, created_at DESC);


--
-- Name: dsh_store_actor_scopes_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_store_actor_scopes_lookup_idx ON public.dsh_store_actor_scopes USING btree (actor_id, actor_role, active, store_id);


--
-- Name: dsh_store_field_verifications_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_store_field_verifications_store_idx ON public.dsh_store_field_verifications USING btree (store_id, created_at DESC);


--
-- Name: dsh_store_pickup_readiness_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dsh_store_pickup_readiness_store_idx ON public.dsh_store_pickup_readiness_reports USING btree (store_id, created_at DESC);


--
-- Name: idx_dsh_admin_approval_context_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_approval_context_status_created ON public.dsh_admin_approval_requests USING btree (operator_context_id, status, created_at DESC);


--
-- Name: idx_dsh_admin_approval_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_approval_requested_by ON public.dsh_admin_approval_requests USING btree (requested_by, created_at DESC);


--
-- Name: idx_dsh_admin_approval_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_approval_reviewed_by ON public.dsh_admin_approval_requests USING btree (reviewed_by, reviewed_at DESC) WHERE (reviewed_by IS NOT NULL);


--
-- Name: idx_dsh_admin_approval_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_approval_role_name ON public.dsh_admin_approval_requests USING btree (role_name, created_at DESC);


--
-- Name: idx_dsh_admin_approval_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_approval_status_created ON public.dsh_admin_approval_requests USING btree (status, created_at DESC);


--
-- Name: idx_dsh_admin_audit_action_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_audit_action_time ON public.dsh_admin_audit USING btree (action, created_at DESC);


--
-- Name: idx_dsh_admin_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_audit_actor ON public.dsh_admin_audit USING btree (actor_id);


--
-- Name: idx_dsh_admin_audit_context_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_audit_context_correlation ON public.dsh_admin_audit USING btree (operator_context_id, correlation_id, created_at DESC);


--
-- Name: idx_dsh_admin_audit_target_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_audit_target_time ON public.dsh_admin_audit USING btree (target_id, created_at DESC);


--
-- Name: idx_dsh_admin_audit_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_audit_time ON public.dsh_admin_audit USING btree (created_at DESC);


--
-- Name: idx_dsh_admin_intent_context_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_intent_context_retry ON public.dsh_admin_canonical_mutation_intents USING btree (operator_context_id, next_attempt_at, created_at) WHERE (status <> 'applied'::text);


--
-- Name: idx_dsh_admin_mutation_intents_lease_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_mutation_intents_lease_expiry ON public.dsh_admin_canonical_mutation_intents USING btree (lease_expires_at) WHERE (status = ANY (ARRAY['pending'::text, 'retryable_failure'::text]));


--
-- Name: idx_dsh_admin_mutation_intents_lease_generation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_mutation_intents_lease_generation ON public.dsh_admin_canonical_mutation_intents USING btree (lease_generation) WHERE (status = ANY (ARRAY['pending'::text, 'retryable_failure'::text]));


--
-- Name: idx_dsh_admin_mutation_intents_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_mutation_intents_retry ON public.dsh_admin_canonical_mutation_intents USING btree (next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retryable_failure'::text]));


--
-- Name: idx_dsh_admin_role_definition_context_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_role_definition_context_status_created ON public.dsh_admin_role_definition_requests USING btree (operator_context_id, status, created_at DESC);


--
-- Name: idx_dsh_admin_role_definition_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_role_definition_status_created ON public.dsh_admin_role_definition_requests USING btree (status, created_at DESC);


--
-- Name: idx_dsh_admin_rollback_context_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_rollback_context_status_created ON public.dsh_admin_rollback_requests USING btree (operator_context_id, status, created_at DESC);


--
-- Name: idx_dsh_admin_rollback_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_rollback_role_name ON public.dsh_admin_rollback_requests USING btree (role_name, created_at DESC);


--
-- Name: idx_dsh_admin_rollback_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_rollback_status_created ON public.dsh_admin_rollback_requests USING btree (status, created_at DESC);


--
-- Name: idx_dsh_admin_rollback_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_rollback_target ON public.dsh_admin_rollback_requests USING btree (target_actor_id, created_at DESC);


--
-- Name: idx_dsh_admin_support_context_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_support_context_status_created ON public.dsh_admin_support_session_requests USING btree (operator_context_id, status, created_at DESC);


--
-- Name: idx_dsh_admin_support_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_support_requester ON public.dsh_admin_support_session_requests USING btree (requested_by, created_at DESC);


--
-- Name: idx_dsh_admin_support_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_admin_support_status_created ON public.dsh_admin_support_session_requests USING btree (status, created_at DESC);


--
-- Name: idx_dsh_analytics_projections_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_analytics_projections_partner ON public.dsh_analytics_projections USING btree (partner_id) WHERE (partner_id IS NOT NULL);


--
-- Name: idx_dsh_analytics_projections_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_analytics_projections_period ON public.dsh_analytics_projections USING btree (period_start, period_end);


--
-- Name: idx_dsh_analytics_projections_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_analytics_projections_store ON public.dsh_analytics_projections USING btree (store_id) WHERE (store_id IS NOT NULL);


--
-- Name: idx_dsh_assignments_active_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_assignments_active_captain ON public.dsh_assignments USING btree (operator_context_id, captain_id, response_deadline_at) WHERE (status = ANY (ARRAY['offered'::text, 'accepted'::text]));


--
-- Name: idx_dsh_assignments_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_assignments_active_order ON public.dsh_assignments USING btree (order_id) WHERE (status = ANY (ARRAY['offered'::text, 'accepted'::text]));


--
-- Name: idx_dsh_assignments_active_special_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_assignments_active_special_request ON public.dsh_assignments USING btree (special_request_id) WHERE ((special_request_id IS NOT NULL) AND (status = ANY (ARRAY['offered'::text, 'accepted'::text])));


--
-- Name: idx_dsh_assignments_captain_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_assignments_captain_status ON public.dsh_assignments USING btree (captain_id, status, created_at DESC);


--
-- Name: idx_dsh_assignments_operator_context_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_assignments_operator_context_status_created ON public.dsh_assignments USING btree (operator_context_id, status, created_at DESC);


--
-- Name: idx_dsh_assignments_special_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_assignments_special_request ON public.dsh_assignments USING btree (special_request_id) WHERE (special_request_id IS NOT NULL);


--
-- Name: idx_dsh_captain_assignment_receipts_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_captain_assignment_receipts_assignment ON public.dsh_captain_assignment_command_receipts USING btree (operator_context_id, assignment_id, created_at DESC);


--
-- Name: idx_dsh_captain_availability_receipts_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_captain_availability_receipts_captain ON public.dsh_captain_availability_command_receipts USING btree (operator_context_id, captain_id, created_at DESC);


--
-- Name: idx_dsh_captain_delivery_status_receipts_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_captain_delivery_status_receipts_assignment ON public.dsh_captain_delivery_status_command_receipts USING btree (operator_context_id, assignment_id, created_at DESC);


--
-- Name: idx_dsh_captain_dispatch_profiles_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_captain_dispatch_profiles_candidate ON public.dsh_captain_dispatch_profiles USING btree (operator_context_id, accreditation_status, availability_status, priority_score DESC, captain_id);


--
-- Name: idx_dsh_cart_items_assortment_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_items_assortment_snapshot ON public.dsh_cart_items USING btree (store_assortment_id) WHERE (store_assortment_id IS NOT NULL);


--
-- Name: idx_dsh_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_items_cart ON public.dsh_cart_items USING btree (cart_id);


--
-- Name: idx_dsh_cart_items_master_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_items_master_product ON public.dsh_cart_items USING btree (master_product_id);


--
-- Name: idx_dsh_cart_mutation_receipt_quarantine_quarantined; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_mutation_receipt_quarantine_quarantined ON public.dsh_cart_mutation_receipt_quarantine USING btree (quarantined_at DESC, client_id, idempotency_key);


--
-- Name: idx_dsh_cart_mutation_receipts_cart_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_mutation_receipts_cart_created ON public.dsh_cart_mutation_receipts USING btree (cart_id, created_at DESC);


--
-- Name: idx_dsh_cart_serviceability_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_serviceability_blocked ON public.dsh_cart_serviceability_checks USING btree (result_code, checked_at DESC) WHERE (serviceable = false);


--
-- Name: idx_dsh_cart_serviceability_client_checked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_serviceability_client_checked ON public.dsh_cart_serviceability_checks USING btree (client_id, checked_at DESC);


--
-- Name: idx_dsh_cart_serviceability_store_checked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_cart_serviceability_store_checked ON public.dsh_cart_serviceability_checks USING btree (store_id, checked_at DESC);


--
-- Name: idx_dsh_carts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_carts_client_id ON public.dsh_carts USING btree (client_id);


--
-- Name: idx_dsh_carts_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_carts_state ON public.dsh_carts USING btree (state);


--
-- Name: idx_dsh_carts_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_carts_store_id ON public.dsh_carts USING btree (store_id);


--
-- Name: idx_dsh_catalog_approval_audit_trail_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_audit_trail_record ON public.dsh_catalog_approval_audit_trail USING btree (approval_record_id, at DESC);


--
-- Name: idx_dsh_catalog_approval_records_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_entity ON public.dsh_catalog_approval_records USING btree (entity_type, entity_id);


--
-- Name: idx_dsh_catalog_approval_records_operatorcontext_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_operatorcontext_entity ON public.dsh_catalog_approval_records USING btree (operator_context_id, entity_type, entity_id);


--
-- Name: idx_dsh_catalog_approval_records_operatorcontext_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_operatorcontext_owner ON public.dsh_catalog_approval_records USING btree (operator_context_id, owner_actor_id, source, submitted_at DESC);


--
-- Name: idx_dsh_catalog_approval_records_operatorcontext_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_operatorcontext_stage ON public.dsh_catalog_approval_records USING btree (operator_context_id, stage, submitted_at DESC);


--
-- Name: idx_dsh_catalog_approval_records_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_source ON public.dsh_catalog_approval_records USING btree (source, submitted_at DESC);


--
-- Name: idx_dsh_catalog_approval_records_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_approval_records_stage ON public.dsh_catalog_approval_records USING btree (stage, submitted_at DESC);


--
-- Name: idx_dsh_catalog_asset_links_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_asset_links_asset ON public.dsh_catalog_asset_links USING btree (asset_id);


--
-- Name: idx_dsh_catalog_asset_links_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_asset_links_entity ON public.dsh_catalog_asset_links USING btree (entity_type, entity_id, role, sort_order);


--
-- Name: idx_dsh_catalog_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_assets_status ON public.dsh_catalog_assets USING btree (status, created_at DESC);


--
-- Name: idx_dsh_catalog_domains_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_domains_active_sort ON public.dsh_catalog_domains USING btree (is_active, sort_order);


--
-- Name: idx_dsh_catalog_entity_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_entity_audit_created ON public.dsh_catalog_entity_audit USING btree (created_at DESC);


--
-- Name: idx_dsh_catalog_entity_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_entity_audit_entity ON public.dsh_catalog_entity_audit USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_catalog_legacy_archive_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_legacy_archive_source ON public.dsh_catalog_legacy_archive USING btree (source_table, store_id);


--
-- Name: idx_dsh_catalog_node_attribute_rules_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_node_attribute_rules_domain ON public.dsh_catalog_node_attribute_rules USING btree (domain_id);


--
-- Name: idx_dsh_catalog_node_attribute_rules_node; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_node_attribute_rules_node ON public.dsh_catalog_node_attribute_rules USING btree (node_id);


--
-- Name: idx_dsh_catalog_nodes_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_nodes_domain ON public.dsh_catalog_nodes USING btree (domain_id, level, sort_order);


--
-- Name: idx_dsh_catalog_nodes_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_nodes_lifecycle ON public.dsh_catalog_nodes USING btree (lifecycle_status);


--
-- Name: idx_dsh_catalog_nodes_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_catalog_nodes_parent ON public.dsh_catalog_nodes USING btree (parent_id, sort_order);


--
-- Name: idx_dsh_checkout_cart_snapshots_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_cart_snapshots_actor ON public.dsh_checkout_cart_snapshots USING btree (operator_context_id, client_id, checkout_intent_id);


--
-- Name: idx_dsh_checkout_cart_snapshots_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_cart_snapshots_cart ON public.dsh_checkout_cart_snapshots USING btree (cart_id, cart_version);


--
-- Name: idx_dsh_checkout_create_idempotency_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_create_idempotency_created_at ON public.dsh_checkout_create_idempotency USING btree (created_at DESC);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_failed_disposition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_failed_disposition ON public.dsh_checkout_financial_closure_outbox USING btree (failure_disposition, updated_at DESC) WHERE (status = 'failed'::text);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_failure_classificatio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_failure_classificatio ON public.dsh_checkout_financial_closure_outbox USING btree (failure_classification, updated_at DESC);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_order ON public.dsh_checkout_financial_closure_outbox USING btree (order_id, created_at DESC) WHERE (order_id IS NOT NULL);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_pending ON public.dsh_checkout_financial_closure_outbox USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_processing_lease; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_processing_lease ON public.dsh_checkout_financial_closure_outbox USING btree (lease_expires_at, updated_at) WHERE (status = 'processing'::text);


--
-- Name: idx_dsh_checkout_financial_closure_outbox_recovery_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_financial_closure_outbox_recovery_due ON public.dsh_checkout_financial_closure_outbox USING btree (status, next_retry_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'unknown'::text]));


--
-- Name: idx_dsh_checkout_intents_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_cart_id ON public.dsh_checkout_intents USING btree (cart_id);


--
-- Name: idx_dsh_checkout_intents_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_client_id ON public.dsh_checkout_intents USING btree (client_id);


--
-- Name: idx_dsh_checkout_intents_delivery_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_delivery_address ON public.dsh_checkout_intents USING btree (delivery_address_id) WHERE (delivery_address_id IS NOT NULL);


--
-- Name: idx_dsh_checkout_intents_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_expiry ON public.dsh_checkout_intents USING btree (expires_at) WHERE (state = ANY (ARRAY['draft'::text, 'validating'::text, 'ready'::text, 'blocked'::text]));


--
-- Name: idx_dsh_checkout_intents_reconciliation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_reconciliation ON public.dsh_checkout_intents USING btree (updated_at, operator_context_id) WHERE ((state = 'confirming'::text) AND (btrim(wlt_payment_session_id) <> ''::text));


--
-- Name: idx_dsh_checkout_intents_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_state ON public.dsh_checkout_intents USING btree (state);


--
-- Name: idx_dsh_checkout_intents_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_intents_store_id ON public.dsh_checkout_intents USING btree (store_id);


--
-- Name: idx_dsh_checkout_item_snapshots_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_item_snapshots_product ON public.dsh_checkout_item_snapshots USING btree (product_id, checkout_intent_id);


--
-- Name: idx_dsh_checkout_operatorcontext_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_operatorcontext_client ON public.dsh_checkout_intents USING btree (operator_context_id, client_id, created_at DESC) WHERE (operator_context_id IS NOT NULL);


--
-- Name: idx_dsh_checkout_payment_saga_outbox_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_payment_saga_outbox_recovery ON public.dsh_checkout_payment_saga_outbox USING btree (status, next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'in_flight'::text]));


--
-- Name: idx_dsh_checkout_payment_sagas_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_payment_sagas_recovery ON public.dsh_checkout_payment_sagas USING btree (state, next_attempt_at, updated_at) WHERE (state = ANY (ARRAY['ready'::text, 'dispatched'::text, 'remote_outcome_unknown'::text, 'remote_confirmed'::text, 'local_projection_pending'::text, 'retry_scheduled'::text]));


--
-- Name: idx_dsh_checkout_reconciliation_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_reconciliation_queue ON public.dsh_checkout_intents USING btree (updated_at, operator_context_id) WHERE (state = 'wlt_outcome_unknown'::text);


--
-- Name: idx_dsh_checkout_wlt_event_receipts_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_wlt_event_receipts_intent ON public.dsh_checkout_wlt_event_receipts USING btree (operator_context_id, checkout_intent_id, received_at DESC);


--
-- Name: idx_dsh_checkout_wlt_event_receipts_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_wlt_event_receipts_session ON public.dsh_checkout_wlt_event_receipts USING btree (operator_context_id, payment_session_id, received_at DESC);


--
-- Name: idx_dsh_checkout_wlt_event_receipts_unapplied; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_checkout_wlt_event_receipts_unapplied ON public.dsh_checkout_wlt_event_receipts USING btree (received_at) WHERE (applied_at IS NULL);


--
-- Name: idx_dsh_client_address_events_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_address_events_owner ON public.dsh_client_address_events USING btree (client_id, address_id, created_at DESC);


--
-- Name: idx_dsh_client_address_mutation_receipts_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_address_mutation_receipts_address ON public.dsh_client_address_mutation_receipts USING btree (client_id, address_id, created_at DESC);


--
-- Name: idx_dsh_client_address_mutation_receipts_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_address_mutation_receipts_expiry ON public.dsh_client_address_mutation_receipts USING btree (expires_at, client_id);


--
-- Name: idx_dsh_client_address_privacy_events_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_address_privacy_events_address ON public.dsh_client_address_privacy_events USING btree (address_id, created_at DESC);


--
-- Name: idx_dsh_client_addresses_client_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_addresses_client_active ON public.dsh_client_addresses USING btree (client_id, updated_at DESC) WHERE (status = ANY (ARRAY['ACTIVE'::text, 'VERIFIED'::text]));


--
-- Name: idx_dsh_client_addresses_pii_purge_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_addresses_pii_purge_due ON public.dsh_client_addresses USING btree (pii_purge_after, id) WHERE ((deleted_at IS NOT NULL) AND (pii_anonymized_at IS NULL));


--
-- Name: idx_dsh_client_profile_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_profile_events_client ON public.dsh_client_profile_events USING btree (client_id, created_at DESC);


--
-- Name: idx_dsh_client_profile_receipts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_client_profile_receipts_client ON public.dsh_client_profile_mutation_receipts USING btree (client_id, created_at DESC);


--
-- Name: idx_dsh_coupon_redemption_funding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_coupon_redemption_funding_status ON public.dsh_coupon_redemptions USING btree (funding_status, funding_updated_at DESC);


--
-- Name: idx_dsh_coupon_redemptions_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_coupon_redemptions_client ON public.dsh_coupon_redemptions USING btree (coupon_id, client_actor_id, status);


--
-- Name: idx_dsh_coupon_redemptions_coupon_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_coupon_redemptions_coupon_status ON public.dsh_coupon_redemptions USING btree (coupon_id, status, reserved_until);


--
-- Name: idx_dsh_coupons_status_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_coupons_status_window ON public.dsh_coupons USING btree (status, starts_at, ends_at) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_coupons_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_coupons_store ON public.dsh_coupons USING btree (store_id) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_deliveries_captain_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_deliveries_captain_status ON public.dsh_deliveries USING btree (captain_id, status, updated_at DESC);


--
-- Name: idx_dsh_deliveries_delivery_proof; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_deliveries_delivery_proof ON public.dsh_deliveries USING btree (delivery_proof_id) WHERE (delivery_proof_id IS NOT NULL);


--
-- Name: idx_dsh_deliveries_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_deliveries_order ON public.dsh_deliveries USING btree (order_id);


--
-- Name: idx_dsh_deliveries_special_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_deliveries_special_request ON public.dsh_deliveries USING btree (special_request_id) WHERE (special_request_id IS NOT NULL);


--
-- Name: idx_dsh_delivery_exception_operation_receipts_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exception_operation_receipts_entity ON public.dsh_delivery_exception_operation_command_receipts USING btree (operator_context_id, exception_id, created_at DESC);


--
-- Name: idx_dsh_delivery_exception_reporters_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exception_reporters_actor ON public.dsh_delivery_exception_reporters USING btree (actor_role, actor_id, reported_at DESC);


--
-- Name: idx_dsh_delivery_exceptions_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_correlation ON public.dsh_delivery_exceptions USING btree (operator_context_id, correlation_id);


--
-- Name: idx_dsh_delivery_exceptions_operator_context_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_operator_context_queue ON public.dsh_delivery_exceptions USING btree (operator_context_id, status, severity, reported_at DESC);


--
-- Name: idx_dsh_delivery_exceptions_operator_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_operator_queue ON public.dsh_delivery_exceptions USING btree (status, severity, reported_at DESC);


--
-- Name: idx_dsh_delivery_exceptions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_order ON public.dsh_delivery_exceptions USING btree (order_id, reported_at DESC);


--
-- Name: idx_dsh_delivery_exceptions_partner_return_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_partner_return_receipt ON public.dsh_delivery_exceptions USING btree (order_id, return_arrived_at DESC) WHERE ((resolution_action = 'return_to_store'::text) AND (returned_at IS NULL));


--
-- Name: idx_dsh_delivery_exceptions_return_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_return_queue ON public.dsh_delivery_exceptions USING btree (returned_at, return_started_at DESC) WHERE (resolution_action = 'return_to_store'::text);


--
-- Name: idx_dsh_delivery_exceptions_special_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_exceptions_special_request ON public.dsh_delivery_exceptions USING btree (special_request_id, reported_at DESC) WHERE (special_request_id IS NOT NULL);


--
-- Name: idx_dsh_delivery_pricing_audit_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_pricing_audit_store ON public.dsh_store_delivery_pricing_audit USING btree (store_id, fulfillment_mode, created_at DESC);


--
-- Name: idx_dsh_delivery_proof_review_receipts_proof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_proof_review_receipts_proof ON public.dsh_delivery_proof_review_receipts USING btree (proof_id, created_at DESC);


--
-- Name: idx_dsh_delivery_proofs_one_accepted_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_delivery_proofs_one_accepted_assignment ON public.dsh_delivery_proofs USING btree (assignment_id) WHERE (status = 'accepted'::text);


--
-- Name: idx_dsh_delivery_proofs_one_open_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_delivery_proofs_one_open_assignment ON public.dsh_delivery_proofs USING btree (assignment_id) WHERE (status = ANY (ARRAY['submitted'::text, 'pending_review'::text]));


--
-- Name: idx_dsh_delivery_proofs_operator_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_proofs_operator_queue ON public.dsh_delivery_proofs USING btree (status, submitted_at) WHERE (status = ANY (ARRAY['submitted'::text, 'pending_review'::text]));


--
-- Name: idx_dsh_delivery_proofs_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_proofs_order ON public.dsh_delivery_proofs USING btree (order_id, created_at DESC);


--
-- Name: idx_dsh_delivery_proofs_special_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_proofs_special_request ON public.dsh_delivery_proofs USING btree (special_request_id, created_at DESC) WHERE (special_request_id IS NOT NULL);


--
-- Name: idx_dsh_delivery_sla_alerts_operator_context_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_sla_alerts_operator_context_status ON public.dsh_delivery_sla_alerts USING btree (operator_context_id, status, detected_at DESC);


--
-- Name: idx_dsh_delivery_sla_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_sla_alerts_status ON public.dsh_delivery_sla_alerts USING btree (status, detected_at DESC);


--
-- Name: idx_dsh_delivery_verification_challenges_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_delivery_verification_challenges_client ON public.dsh_delivery_verification_challenges USING btree (client_id, issued_at DESC);


--
-- Name: idx_dsh_dispatch_decisions_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_dispatch_decisions_assignment ON public.dsh_dispatch_decisions USING btree (operator_context_id, assignment_id, created_at DESC);


--
-- Name: idx_dsh_dispatch_decisions_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_dispatch_decisions_captain ON public.dsh_dispatch_decisions USING btree (operator_context_id, captain_id, created_at DESC);


--
-- Name: idx_dsh_dispatch_decisions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_dispatch_decisions_order ON public.dsh_dispatch_decisions USING btree (operator_context_id, order_id, created_at DESC);


--
-- Name: idx_dsh_escalations_raised_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_escalations_raised_by ON public.dsh_readiness_escalations USING btree (raised_by);


--
-- Name: idx_dsh_escalations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_escalations_status ON public.dsh_readiness_escalations USING btree (status);


--
-- Name: idx_dsh_escalations_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_escalations_store_id ON public.dsh_readiness_escalations USING btree (store_id);


--
-- Name: idx_dsh_field_commission_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_commission_outbox_pending ON public.dsh_field_commission_outbox USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_field_commission_outbox_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_commission_outbox_visit ON public.dsh_field_commission_outbox USING btree (visit_id);


--
-- Name: idx_dsh_field_onboarding_assignment_events; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_onboarding_assignment_events ON public.dsh_field_onboarding_assignment_events USING btree (assignment_id, created_at DESC);


--
-- Name: idx_dsh_field_onboarding_assignments_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_onboarding_assignments_actor ON public.dsh_field_onboarding_assignments USING btree (operator_context_id, field_actor_id, status, updated_at DESC);


--
-- Name: idx_dsh_field_onboarding_assignments_operator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_onboarding_assignments_operator ON public.dsh_field_onboarding_assignments USING btree (operator_context_id, status, updated_at DESC);


--
-- Name: idx_dsh_field_visits_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_visits_agent_id ON public.dsh_field_visits USING btree (field_agent_id);


--
-- Name: idx_dsh_field_visits_completion_geofence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_visits_completion_geofence ON public.dsh_field_visits USING btree (completion_geofence_status) WHERE (completion_geofence_status IS NOT NULL);


--
-- Name: idx_dsh_field_visits_start_geofence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_visits_start_geofence ON public.dsh_field_visits USING btree (start_geofence_status) WHERE (start_geofence_status IS NOT NULL);


--
-- Name: idx_dsh_field_visits_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_field_visits_store_id ON public.dsh_field_visits USING btree (store_id);


--
-- Name: idx_dsh_home_banners_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_banners_active ON public.dsh_home_banners USING btree (is_active, sort_order);


--
-- Name: idx_dsh_home_banners_publication; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_banners_publication ON public.dsh_home_banners USING btree (publication_status, publish_from, publish_until, sort_order) WHERE (is_active = true);


--
-- Name: idx_dsh_home_content_audit_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_content_audit_lookup ON public.dsh_home_content_audit USING btree (content_kind, content_id, created_at DESC);


--
-- Name: idx_dsh_home_content_targets_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_content_targets_lookup ON public.dsh_home_content_targets USING btree (content_kind, content_id, target_type, target_value);


--
-- Name: idx_dsh_home_content_targets_reverse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_content_targets_reverse ON public.dsh_home_content_targets USING btree (target_type, target_value, content_kind, content_id);


--
-- Name: idx_dsh_home_promos_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_promos_active ON public.dsh_home_promos USING btree (is_active, sort_order);


--
-- Name: idx_dsh_home_promos_publication; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_home_promos_publication ON public.dsh_home_promos USING btree (publication_status, publish_from, publish_until, sort_order) WHERE (is_active = true);


--
-- Name: idx_dsh_incident_comms_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incident_comms_incident ON public.dsh_incident_communications USING btree (incident_id);


--
-- Name: idx_dsh_incident_entities_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incident_entities_entity ON public.dsh_incident_entities USING btree (entity_type, entity_id);


--
-- Name: idx_dsh_incident_events_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incident_events_incident ON public.dsh_incident_events USING btree (incident_id, created_at, id);


--
-- Name: idx_dsh_incident_tasks_incident; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incident_tasks_incident ON public.dsh_incident_tasks USING btree (incident_id);


--
-- Name: idx_dsh_incidents_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incidents_severity ON public.dsh_incidents USING btree (severity);


--
-- Name: idx_dsh_incidents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_incidents_status ON public.dsh_incidents USING btree (status);


--
-- Name: idx_dsh_loyalty_tiers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_loyalty_tiers_status ON public.dsh_loyalty_tiers USING btree (status) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_marketing_audit_events_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_audit_events_entity ON public.dsh_marketing_audit_events USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_campaigns_active_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_campaigns_active_window ON public.dsh_marketing_campaigns USING btree (status, start_date, end_date) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_marketing_campaigns_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_campaigns_region ON public.dsh_marketing_campaigns USING btree (target_city_code, target_service_area_code, status) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_marketing_campaigns_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_campaigns_version ON public.dsh_marketing_campaigns USING btree (id, version) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_marketing_clicks_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_clicks_entity ON public.dsh_marketing_clicks USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_impressions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_impressions_entity ON public.dsh_marketing_impressions USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_target_bindings_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_target_bindings_entity ON public.dsh_marketing_target_bindings USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_tickers_live; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_tickers_live ON public.dsh_marketing_tickers USING btree (status, pinned) WHERE (deleted_at IS NULL);


--
-- Name: idx_dsh_marketing_visibility_gates_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_marketing_visibility_gates_entity ON public.dsh_marketing_visibility_gates USING btree (entity_type, entity_id, checked_at DESC);


--
-- Name: idx_dsh_master_product_attribute_values_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_product_attribute_values_gin ON public.dsh_master_product_attribute_values USING gin (value_json);


--
-- Name: idx_dsh_master_product_attribute_values_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_product_attribute_values_product ON public.dsh_master_product_attribute_values USING btree (master_product_id);


--
-- Name: idx_dsh_master_product_relationships_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_product_relationships_source ON public.dsh_master_product_relationships USING btree (source_master_product_id, relationship_type, is_active, priority);


--
-- Name: idx_dsh_master_product_relationships_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_product_relationships_target ON public.dsh_master_product_relationships USING btree (target_master_product_id, relationship_type, is_active);


--
-- Name: idx_dsh_master_products_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_products_approval ON public.dsh_master_products USING btree (approval_status, updated_at DESC);


--
-- Name: idx_dsh_master_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_products_barcode ON public.dsh_master_products USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_dsh_master_products_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_products_domain ON public.dsh_master_products USING btree (domain_id, category_node_id, is_active);


--
-- Name: idx_dsh_master_products_duplicate_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_products_duplicate_group ON public.dsh_master_products USING btree (duplicate_group_id) WHERE (duplicate_group_id IS NOT NULL);


--
-- Name: idx_dsh_master_products_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_master_products_parent ON public.dsh_master_products USING btree (parent_id) WHERE (parent_id IS NOT NULL);


--
-- Name: idx_dsh_media_refs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_media_refs_order_id ON public.dsh_media_refs USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_dsh_media_refs_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_media_refs_owner ON public.dsh_media_refs USING btree (owner_actor_id, owner_actor_role);


--
-- Name: idx_dsh_media_refs_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_media_refs_partner ON public.dsh_media_refs USING btree (partner_id);


--
-- Name: idx_dsh_media_refs_special_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_media_refs_special_request_id ON public.dsh_media_refs USING btree (special_request_id) WHERE (special_request_id IS NOT NULL);


--
-- Name: idx_dsh_notification_channel_deliveries_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_channel_deliveries_due ON public.dsh_notification_channel_deliveries USING btree (status, next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_notification_channel_deliveries_notification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_channel_deliveries_notification ON public.dsh_notification_channel_deliveries USING btree (notification_id);


--
-- Name: idx_dsh_notification_dead_letters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_dead_letters ON public.dsh_operational_outbox_events USING btree (failed_at DESC) WHERE (status = 'failed'::text);


--
-- Name: idx_dsh_notification_delivery_attempts_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_delivery_attempts_event ON public.dsh_notification_delivery_attempts USING btree (event_id, attempt_number DESC);


--
-- Name: idx_dsh_notification_push_delivery_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_push_delivery_due ON public.dsh_notification_channel_deliveries USING btree (status, next_retry_at, created_at) WHERE ((channel = 'push'::text) AND (status = 'pending'::text));


--
-- Name: idx_dsh_notification_push_delivery_lease; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_push_delivery_lease ON public.dsh_notification_channel_deliveries USING btree (lease_expires_at, updated_at) WHERE ((channel = 'push'::text) AND (status = 'sending'::text));


--
-- Name: idx_dsh_notification_push_delivery_unknown; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_push_delivery_unknown ON public.dsh_notification_channel_deliveries USING btree (next_retry_at, updated_at) WHERE ((channel = 'push'::text) AND (status = 'unknown'::text));


--
-- Name: idx_dsh_notification_push_endpoints_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notification_push_endpoints_actor ON public.dsh_notification_push_endpoints USING btree (actor_id, actor_type) WHERE (active = true);


--
-- Name: idx_dsh_notification_push_provider_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_notification_push_provider_idempotency ON public.dsh_notification_channel_deliveries USING btree (provider_idempotency_key) WHERE (channel = 'push'::text);


--
-- Name: idx_dsh_notifications_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notifications_actor ON public.dsh_notifications USING btree (actor_id, actor_type);


--
-- Name: idx_dsh_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_notifications_unread ON public.dsh_notifications USING btree (actor_id, is_read) WHERE (is_read = false);


--
-- Name: idx_dsh_onboarding_change_requests_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_onboarding_change_requests_thread ON public.dsh_onboarding_change_requests USING btree (thread_id, status, created_at DESC);


--
-- Name: idx_dsh_onboarding_collab_messages_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_onboarding_collab_messages_thread ON public.dsh_onboarding_collaboration_messages USING btree (thread_id, sequence_number);


--
-- Name: idx_dsh_onboarding_collab_threads_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_onboarding_collab_threads_context ON public.dsh_onboarding_collaboration_threads USING btree (operator_context_id, updated_at DESC);


--
-- Name: idx_dsh_operational_incidents_context_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operational_incidents_context_created ON public.dsh_operational_incidents USING btree (operator_context_id, created_at DESC);


--
-- Name: idx_dsh_operational_incidents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operational_incidents_entity ON public.dsh_operational_incidents USING btree (target_entity_id, created_at DESC);


--
-- Name: idx_dsh_operational_incidents_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operational_incidents_order ON public.dsh_operational_incidents USING btree (order_id, created_at DESC);


--
-- Name: idx_dsh_operational_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operational_outbox_pending ON public.dsh_operational_outbox_events USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_operator_dispatch_command_receipts_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operator_dispatch_command_receipts_assignment ON public.dsh_operator_dispatch_command_receipts USING btree (operator_context_id, assignment_id, created_at DESC);


--
-- Name: idx_dsh_operator_store_creation_idempotency_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_operator_store_creation_idempotency_expiry ON public.dsh_operator_store_creation_idempotency USING btree (expires_at, operator_context_id, actor_id);


--
-- Name: idx_dsh_order_cancellation_actions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_order_cancellation_actions_active ON public.dsh_order_cancellation_actions USING btree (cancellation_id) WHERE (status = ANY (ARRAY['pending_approval'::text, 'executing'::text]));


--
-- Name: idx_dsh_order_cancellations_financial_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_cancellations_financial_status ON public.dsh_order_cancellations USING btree (financial_closure_status, updated_at DESC);


--
-- Name: idx_dsh_order_cancellations_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_cancellations_order ON public.dsh_order_cancellations USING btree (order_id);


--
-- Name: idx_dsh_order_events_operatorcontext_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_events_operatorcontext_order_created ON public.dsh_order_status_events USING btree (operator_context_id, order_id, created_at, id);


--
-- Name: idx_dsh_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_items_order_id ON public.dsh_order_items USING btree (order_id);


--
-- Name: idx_dsh_order_outbox_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_outbox_dispatch ON public.dsh_order_event_outbox USING btree (status, next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));


--
-- Name: idx_dsh_order_payment_reconciliation_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_payment_reconciliation_due ON public.dsh_order_payment_projection_reconciliation USING btree (status, next_attempt_at, updated_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text, 'scheduled'::text, 'processing'::text]));


--
-- Name: idx_dsh_order_preparation_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_alerts_status ON public.dsh_order_preparation_alerts USING btree (status, alert_kind, detected_at DESC);


--
-- Name: idx_dsh_order_preparation_alerts_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_alerts_store ON public.dsh_order_preparation_alerts USING btree (store_id, status, detected_at DESC);


--
-- Name: idx_dsh_order_preparation_estimate_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_estimate_events_order ON public.dsh_order_preparation_estimate_events USING btree (order_id, created_at DESC);


--
-- Name: idx_dsh_order_preparation_issue_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_issue_events_order ON public.dsh_order_preparation_issue_events USING btree (order_id, created_at DESC);


--
-- Name: idx_dsh_order_preparation_issues_customer_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_issues_customer_decision ON public.dsh_order_preparation_issues USING btree (order_id, customer_decision, updated_at DESC) WHERE ((issue_kind = 'substitution_required'::text) AND (status = 'open'::text));


--
-- Name: idx_dsh_order_preparation_issues_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_issues_order ON public.dsh_order_preparation_issues USING btree (order_id, status, created_at DESC);


--
-- Name: idx_dsh_order_preparation_issues_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_preparation_issues_store ON public.dsh_order_preparation_issues USING btree (store_id, status, updated_at DESC);


--
-- Name: idx_dsh_order_rescue_events_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_rescue_events_case ON public.dsh_order_rescue_events USING btree (rescue_case_id, created_at, id);


--
-- Name: idx_dsh_order_rescue_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_rescue_queue ON public.dsh_order_rescue_cases USING btree (status, severity, updated_at DESC, id);


--
-- Name: idx_dsh_order_return_actions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_order_return_actions_active ON public.dsh_order_return_actions USING btree (return_id) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_order_return_actions_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_order_return_actions_idempotency ON public.dsh_order_return_actions USING btree (return_id, idempotency_key);


--
-- Name: idx_dsh_order_returns_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_order_returns_order_id ON public.dsh_order_returns USING btree (order_id);


--
-- Name: idx_dsh_order_status_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_status_events_order ON public.dsh_order_status_events USING btree (order_id);


--
-- Name: idx_dsh_order_truth_audit_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_truth_audit_correlation ON public.dsh_order_truth_audit USING btree (operator_context_id, correlation_id) WHERE (correlation_id <> ''::text);


--
-- Name: idx_dsh_order_truth_audit_operatorcontext_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_truth_audit_operatorcontext_created ON public.dsh_order_truth_audit USING btree (operator_context_id, created_at DESC);


--
-- Name: idx_dsh_order_truth_audit_operatorcontext_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_order_truth_audit_operatorcontext_type_created ON public.dsh_order_truth_audit USING btree (operator_context_id, event_type, created_at DESC);


--
-- Name: idx_dsh_orders_checkout_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_checkout_intent ON public.dsh_orders USING btree (checkout_intent_id);


--
-- Name: idx_dsh_orders_checkout_intent_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_orders_checkout_intent_unique ON public.dsh_orders USING btree (checkout_intent_id);


--
-- Name: idx_dsh_orders_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_client_id ON public.dsh_orders USING btree (client_id);


--
-- Name: idx_dsh_orders_fulfillment_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_fulfillment_mode ON public.dsh_orders USING btree (fulfillment_mode);


--
-- Name: idx_dsh_orders_operatorcontext_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_operatorcontext_client ON public.dsh_orders USING btree (operator_context_id, client_id, created_at DESC) WHERE (operator_context_id IS NOT NULL);


--
-- Name: idx_dsh_orders_operatorcontext_client_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_operatorcontext_client_created ON public.dsh_orders USING btree (operator_context_id, client_id, created_at DESC);


--
-- Name: idx_dsh_orders_operatorcontext_store_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_operatorcontext_store_created ON public.dsh_orders USING btree (operator_context_id, store_id, created_at DESC);


--
-- Name: idx_dsh_orders_partner_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_partner_deadline ON public.dsh_orders USING btree (partner_deadline_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_orders_preparation_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_preparation_due ON public.dsh_orders USING btree (estimated_ready_at, store_id) WHERE ((status = ANY (ARRAY['store_accepted'::text, 'preparing'::text])) AND (ready_at IS NULL));


--
-- Name: idx_dsh_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_status ON public.dsh_orders USING btree (status);


--
-- Name: idx_dsh_orders_store_cursor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_store_cursor ON public.dsh_orders USING btree (store_id, latest_partner_inbox_cursor DESC);


--
-- Name: idx_dsh_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_orders_store_id ON public.dsh_orders USING btree (store_id);


--
-- Name: idx_dsh_partner_activation_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_activation_events_created_at ON public.dsh_partner_activation_events USING btree (created_at DESC);


--
-- Name: idx_dsh_partner_activation_events_operatorcontext_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_activation_events_operatorcontext_partner ON public.dsh_partner_activation_events USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: idx_dsh_partner_activation_events_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_activation_events_partner_id ON public.dsh_partner_activation_events USING btree (partner_id);


--
-- Name: idx_dsh_partner_brands_operatorcontext_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_brands_operatorcontext_partner ON public.dsh_partner_brands USING btree (operator_context_id, partner_id);


--
-- Name: idx_dsh_partner_courier_codes_redeemed_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_courier_codes_redeemed_actor ON public.dsh_partner_courier_connection_codes USING btree (redeemed_by_captain_actor_id) WHERE (status = 'redeemed'::text);


--
-- Name: idx_dsh_partner_courier_codes_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_courier_codes_store ON public.dsh_partner_courier_connection_codes USING btree (store_id, created_at DESC);


--
-- Name: idx_dsh_partner_delivery_audit_events_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_audit_events_entity ON public.dsh_partner_delivery_audit_events USING btree (entity_id, created_at DESC);


--
-- Name: idx_dsh_partner_delivery_command_receipts_context_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_command_receipts_context_task ON public.dsh_partner_delivery_command_receipts USING btree (operator_context_id, task_id);


--
-- Name: idx_dsh_partner_delivery_command_receipts_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_command_receipts_expiry ON public.dsh_partner_delivery_command_receipts USING btree (expires_at);


--
-- Name: idx_dsh_partner_delivery_command_receipts_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_command_receipts_task ON public.dsh_partner_delivery_command_receipts USING btree (task_id);


--
-- Name: idx_dsh_partner_delivery_tasks_courier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_tasks_courier_id ON public.dsh_partner_delivery_tasks USING btree (store_courier_id);


--
-- Name: idx_dsh_partner_delivery_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_tasks_status ON public.dsh_partner_delivery_tasks USING btree (status);


--
-- Name: idx_dsh_partner_delivery_tasks_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_delivery_tasks_store_id ON public.dsh_partner_delivery_tasks USING btree (store_id);


--
-- Name: idx_dsh_partner_doc_reviews_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_doc_reviews_document_id ON public.dsh_partner_document_reviews USING btree (document_id);


--
-- Name: idx_dsh_partner_doc_reviews_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_doc_reviews_partner_id ON public.dsh_partner_document_reviews USING btree (partner_id);


--
-- Name: idx_dsh_partner_documents_latest_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_documents_latest_type ON public.dsh_partner_documents USING btree (partner_id, document_type, created_at DESC);


--
-- Name: idx_dsh_partner_documents_operatorcontext_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_documents_operatorcontext_partner ON public.dsh_partner_documents USING btree (operator_context_id, partner_id, created_at);


--
-- Name: idx_dsh_partner_documents_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_documents_partner_id ON public.dsh_partner_documents USING btree (partner_id);


--
-- Name: idx_dsh_partner_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_documents_status ON public.dsh_partner_documents USING btree (document_status);


--
-- Name: idx_dsh_partner_field_visit_media_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visit_media_partner ON public.dsh_partner_field_visit_media USING btree (partner_id, created_at DESC);


--
-- Name: idx_dsh_partner_field_visit_media_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visit_media_visit ON public.dsh_partner_field_visit_media USING btree (visit_id, created_at);


--
-- Name: idx_dsh_partner_field_visits_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visits_actor_id ON public.dsh_partner_field_visits USING btree (field_actor_id);


--
-- Name: idx_dsh_partner_field_visits_operatorcontext_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visits_operatorcontext_partner ON public.dsh_partner_field_visits USING btree (operator_context_id, partner_id, created_at DESC);


--
-- Name: idx_dsh_partner_field_visits_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visits_partner_id ON public.dsh_partner_field_visits USING btree (partner_id);


--
-- Name: idx_dsh_partner_field_visits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_field_visits_status ON public.dsh_partner_field_visits USING btree (visit_status);


--
-- Name: idx_dsh_partner_first_stores_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_first_stores_context ON public.dsh_partner_first_stores USING btree (operator_context_id, partner_id);


--
-- Name: idx_dsh_partner_offers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_offers_active ON public.dsh_partner_offers USING btree (status) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_partner_offers_client_projection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_offers_client_projection ON public.dsh_partner_offers USING btree (status, active_from_date, active_to_date, store_id) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_partner_offers_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_offers_status_created ON public.dsh_partner_offers USING btree (status, created_at DESC);


--
-- Name: idx_dsh_partner_offers_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_offers_store_status ON public.dsh_partner_offers USING btree (store_id, status);


--
-- Name: idx_dsh_partner_offers_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_offers_version ON public.dsh_partner_offers USING btree (id, version) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_partner_order_transition_receipts_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_order_transition_receipts_order ON public.dsh_partner_order_transition_receipts USING btree (store_id, order_id, created_at DESC);


--
-- Name: idx_dsh_partner_store_transfer_audit_partners; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_store_transfer_audit_partners ON public.dsh_partner_store_transfer_audit USING btree (operator_context_id, from_partner_id, to_partner_id, created_at DESC);


--
-- Name: idx_dsh_partner_store_transfer_audit_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partner_store_transfer_audit_store ON public.dsh_partner_store_transfer_audit USING btree (operator_context_id, store_id, created_at DESC);


--
-- Name: idx_dsh_partners_activation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_activation_status ON public.dsh_partners USING btree (activation_status);


--
-- Name: idx_dsh_partners_archived_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_archived_at ON public.dsh_partners USING btree (archived_at) WHERE (archived_at IS NOT NULL);


--
-- Name: idx_dsh_partners_business_vertical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_business_vertical ON public.dsh_partners USING btree (business_vertical_id);


--
-- Name: idx_dsh_partners_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_created_at ON public.dsh_partners USING btree (created_at DESC);


--
-- Name: idx_dsh_partners_operator_context_onboarding_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_operator_context_onboarding_case ON public.dsh_partners USING btree (operator_context_id, onboarding_case_status, updated_at DESC);


--
-- Name: idx_dsh_partners_operator_context_owner_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_operator_context_owner_actor ON public.dsh_partners USING btree (operator_context_id, owner_actor_id) WHERE (btrim(owner_actor_id) <> ''::text);


--
-- Name: idx_dsh_partners_operator_context_workforce_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_operator_context_workforce_person ON public.dsh_partners USING btree (operator_context_id, workforce_person_id) WHERE (btrim(workforce_person_id) <> ''::text);


--
-- Name: idx_dsh_partners_operatorcontext_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_partners_operatorcontext_status_created ON public.dsh_partners USING btree (operator_context_id, activation_status, created_at DESC);


--
-- Name: idx_dsh_pickup_audit_events_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_audit_events_entity ON public.dsh_pickup_audit_events USING btree (entity_id, created_at DESC);


--
-- Name: idx_dsh_pickup_mutation_commands_order_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_mutation_commands_order_action ON public.dsh_pickup_mutation_commands USING btree (order_id, action, created_at DESC);


--
-- Name: idx_dsh_pickup_sessions_active_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_sessions_active_expiry ON public.dsh_pickup_sessions USING btree (expires_at, updated_at DESC) WHERE (status = 'active'::text);


--
-- Name: idx_dsh_pickup_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_sessions_status ON public.dsh_pickup_sessions USING btree (status, updated_at DESC);


--
-- Name: idx_dsh_pickup_sessions_store_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_sessions_store_client ON public.dsh_pickup_sessions USING btree (store_id, client_id);


--
-- Name: idx_dsh_pickup_sla_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_pickup_sla_alerts_status ON public.dsh_pickup_sla_alerts USING btree (status, detected_at DESC);


--
-- Name: idx_dsh_platform_delivery_modes_zone_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_platform_delivery_modes_zone_enabled ON public.dsh_platform_delivery_mode_policies USING btree (zone_id, is_enabled, fulfillment_mode);


--
-- Name: idx_dsh_platform_policy_events_aggregate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_platform_policy_events_aggregate ON public.dsh_platform_policy_events USING btree (aggregate_type, aggregate_id, created_at DESC);


--
-- Name: idx_dsh_platform_policy_events_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_platform_policy_events_correlation ON public.dsh_platform_policy_events USING btree (correlation_id, created_at DESC) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_dsh_platform_sla_rules_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_platform_sla_rules_zone ON public.dsh_platform_sla_rules USING btree (zone_id, category);


--
-- Name: idx_dsh_platform_zones_active_service_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_platform_zones_active_service_area ON public.dsh_platform_zones USING btree (is_active, service_area_code, name);


--
-- Name: idx_dsh_preparation_issue_events_decision_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_preparation_issue_events_decision_identity ON public.dsh_order_preparation_issue_events USING btree (issue_id, idempotency_key, created_at DESC) WHERE (event_type = 'customer_decision'::text);


--
-- Name: idx_dsh_product_duplicate_candidates_proposal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_product_duplicate_candidates_proposal ON public.dsh_product_duplicate_candidates USING btree (proposal_id, status);


--
-- Name: idx_dsh_product_proposal_audit_proposal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_product_proposal_audit_proposal ON public.dsh_product_proposal_audit USING btree (proposal_id, created_at DESC);


--
-- Name: idx_dsh_product_proposals_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_product_proposals_domain ON public.dsh_product_proposals USING btree (domain_id, category_node_id);


--
-- Name: idx_dsh_product_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_product_proposals_status ON public.dsh_product_proposals USING btree (status, created_at DESC);


--
-- Name: idx_dsh_product_proposals_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_product_proposals_store ON public.dsh_product_proposals USING btree (source_store_id) WHERE (source_store_id IS NOT NULL);


--
-- Name: idx_dsh_promotion_funding_outbox_failed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_promotion_funding_outbox_failed ON public.dsh_promotion_funding_outbox USING btree (updated_at) WHERE (status = 'failed'::text);


--
-- Name: idx_dsh_promotion_funding_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_promotion_funding_outbox_pending ON public.dsh_promotion_funding_outbox USING btree (next_retry_at, created_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_provider_rating_events_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_provider_rating_events_rating ON public.dsh_provider_rating_events USING btree (rating_id, created_at DESC);


--
-- Name: idx_dsh_provider_rating_receipts_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_provider_rating_receipts_order ON public.dsh_provider_rating_mutation_receipts USING btree (operator_context_id, actor_id, order_id, created_at DESC);


--
-- Name: idx_dsh_provider_ratings_moderation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_provider_ratings_moderation ON public.dsh_provider_ratings USING btree (operator_context_id, moderation_status, created_at DESC);


--
-- Name: idx_dsh_provider_ratings_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_provider_ratings_source ON public.dsh_provider_ratings USING btree (operator_context_id, source_kind, source_id, created_at DESC);


--
-- Name: idx_dsh_provider_ratings_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_provider_ratings_target ON public.dsh_provider_ratings USING btree (operator_context_id, target_kind, target_actor_id, created_at DESC) WHERE (status = 'active'::text);


--
-- Name: idx_dsh_push_endpoints_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_push_endpoints_session_id ON public.dsh_notification_push_endpoints USING btree (identity_session_id) WHERE (identity_session_id IS NOT NULL);


--
-- Name: idx_dsh_readiness_checklist_policy_events_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_readiness_checklist_policy_events_scope ON public.dsh_readiness_checklist_policy_events USING btree (operator_context_id, business_vertical_id, version DESC);


--
-- Name: idx_dsh_readiness_checks_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_readiness_checks_store_id ON public.dsh_readiness_checks USING btree (store_id);


--
-- Name: idx_dsh_readiness_checks_visit_check; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_readiness_checks_visit_check ON public.dsh_readiness_checks USING btree (visit_id, check_type);


--
-- Name: idx_dsh_readiness_checks_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_readiness_checks_visit_id ON public.dsh_readiness_checks USING btree (visit_id);


--
-- Name: idx_dsh_readiness_templates_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_readiness_templates_scope ON public.dsh_readiness_checklist_templates USING btree (operator_context_id, business_vertical_id);


--
-- Name: idx_dsh_reels_poster_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_reels_poster_asset ON public.dsh_reels USING btree (poster_asset_id) WHERE (poster_asset_id IS NOT NULL);


--
-- Name: idx_dsh_reels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_reels_status ON public.dsh_reels USING btree (status, sort_order, created_at DESC);


--
-- Name: idx_dsh_return_to_store_receipts_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_return_to_store_receipts_entity ON public.dsh_return_to_store_command_receipts USING btree (operator_context_id, entity_id, created_at DESC);


--
-- Name: idx_dsh_service_area_events_code_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_events_code_created ON public.dsh_service_area_events USING btree (service_area_code, created_at DESC);


--
-- Name: idx_dsh_service_area_geofences_active_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_geofences_active_priority ON public.dsh_service_area_geofences USING btree (active, priority DESC, service_area_code) WHERE (active = true);


--
-- Name: idx_dsh_service_area_geofences_effective_resolution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_geofences_effective_resolution ON public.dsh_service_area_geofences USING btree (active, effective_from, expires_at, priority DESC, service_area_code);


--
-- Name: idx_dsh_service_area_geofences_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_geofences_geom ON public.dsh_service_area_geofences USING gist (polygon);


--
-- Name: idx_dsh_service_area_versions_effective_resolution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_versions_effective_resolution ON public.dsh_service_area_versions USING btree (service_area_code, effective_from DESC, version DESC, expires_at, active, priority DESC);


--
-- Name: idx_dsh_service_area_versions_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_service_area_versions_geom ON public.dsh_service_area_versions USING gist (polygon);


--
-- Name: idx_dsh_sla_alerts_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_sla_alerts_partner ON public.dsh_sla_alerts USING btree (partner_id) WHERE (partner_id IS NOT NULL);


--
-- Name: idx_dsh_sla_alerts_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_sla_alerts_ref ON public.dsh_sla_alerts USING btree (reference_type, reference_id);


--
-- Name: idx_dsh_sla_alerts_store_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_sla_alerts_store_state ON public.dsh_sla_alerts USING btree (store_id, state);


--
-- Name: idx_dsh_special_req_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_req_client ON public.dsh_special_requests USING btree (client_id);


--
-- Name: idx_dsh_special_req_operatorcontext_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_req_operatorcontext_client ON public.dsh_special_requests USING btree (operator_context_id, client_id);


--
-- Name: idx_dsh_special_req_operatorcontext_client_idemp; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_special_req_operatorcontext_client_idemp ON public.dsh_special_requests USING btree (operator_context_id, client_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_dsh_special_req_operatorcontext_operator_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_req_operatorcontext_operator_filters ON public.dsh_special_requests USING btree (operator_context_id, request_type, status, workflow_stage);


--
-- Name: idx_dsh_special_req_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_req_status ON public.dsh_special_requests USING btree (status);


--
-- Name: idx_dsh_special_req_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_req_type ON public.dsh_special_requests USING btree (request_type);


--
-- Name: idx_dsh_special_request_information_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_information_history ON public.dsh_special_request_information_exchanges USING btree (operator_context_id, special_request_id, requested_at DESC);


--
-- Name: idx_dsh_special_request_information_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_special_request_information_pending ON public.dsh_special_request_information_exchanges USING btree (operator_context_id, special_request_id) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_special_request_information_response_receipts_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_information_response_receipts_request ON public.dsh_special_request_information_response_receipts USING btree (operator_context_id, special_request_id, created_at DESC);


--
-- Name: idx_dsh_special_request_saga_outbox_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_saga_outbox_dispatch ON public.dsh_special_request_saga_outbox USING btree (status, next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'in_flight'::text]));


--
-- Name: idx_dsh_special_request_sagas_dispatch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_sagas_dispatch ON public.dsh_special_request_sagas USING btree (state, next_attempt_at, updated_at) WHERE (state = ANY (ARRAY['requested'::text, 'dispatched'::text, 'remote_applied'::text, 'retryable_failure'::text]));


--
-- Name: idx_dsh_special_request_sagas_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_sagas_subject ON public.dsh_special_request_sagas USING btree (operator_context_id, special_request_id, created_at DESC);


--
-- Name: idx_dsh_special_request_wlt_event_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_wlt_event_request ON public.dsh_special_request_wlt_event_receipts USING btree (operator_context_id, special_request_id, received_at DESC);


--
-- Name: idx_dsh_special_request_wlt_event_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_wlt_event_session ON public.dsh_special_request_wlt_event_receipts USING btree (operator_context_id, payment_session_id, received_at DESC);


--
-- Name: idx_dsh_special_request_wlt_event_unapplied; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_request_wlt_event_unapplied ON public.dsh_special_request_wlt_event_receipts USING btree (received_at) WHERE (applied_at IS NULL);


--
-- Name: idx_dsh_special_requests_audit_events_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_requests_audit_events_entity ON public.dsh_special_requests_audit_events USING btree (entity_id, created_at DESC);


--
-- Name: idx_dsh_special_requests_operator_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_requests_operator_filters ON public.dsh_special_requests USING btree (request_type, status, workflow_stage);


--
-- Name: idx_dsh_special_requests_safety; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_requests_safety ON public.dsh_special_requests USING btree (safety_status, created_at) WHERE (safety_status = 'pending'::text);


--
-- Name: idx_dsh_special_requests_wlt_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_special_requests_wlt_quote ON public.dsh_special_requests USING btree (operator_context_id, wlt_quote_id) WHERE (wlt_quote_id IS NOT NULL);


--
-- Name: idx_dsh_store_action_audit_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_action_audit_correlation ON public.dsh_store_action_audit USING btree (correlation_id, created_at DESC);


--
-- Name: idx_dsh_store_actor_scopes_operatorcontext_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_actor_scopes_operatorcontext_actor ON public.dsh_store_actor_scopes USING btree (operator_context_id, actor_id, actor_role, active, store_id);


--
-- Name: idx_dsh_store_assortment_prices_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_assortment_prices_lookup ON public.dsh_store_assortment_prices USING btree (store_assortment_id, effective_from, effective_until);


--
-- Name: idx_dsh_store_assortments_master_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_assortments_master_product ON public.dsh_store_assortments USING btree (master_product_id);


--
-- Name: idx_dsh_store_assortments_paused; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_assortments_paused ON public.dsh_store_assortments USING btree (store_id, paused_until) WHERE (paused_at IS NOT NULL);


--
-- Name: idx_dsh_store_assortments_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_assortments_store ON public.dsh_store_assortments USING btree (store_id, publication_status);


--
-- Name: idx_dsh_store_captain_handoff_receipts_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_captain_handoff_receipts_entity ON public.dsh_store_captain_handoff_command_receipts USING btree (operator_context_id, order_id, store_id, created_at DESC);


--
-- Name: idx_dsh_store_captain_handoffs_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_store_captain_handoffs_active_order ON public.dsh_store_captain_handoffs USING btree (order_id) WHERE (status = ANY (ARRAY['awaiting_partner'::text, 'partner_confirmed'::text]));


--
-- Name: idx_dsh_store_captain_handoffs_captain_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_captain_handoffs_captain_status ON public.dsh_store_captain_handoffs USING btree (captain_id, status, updated_at DESC);


--
-- Name: idx_dsh_store_captain_handoffs_store_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_captain_handoffs_store_status ON public.dsh_store_captain_handoffs USING btree (store_id, status, updated_at DESC);


--
-- Name: idx_dsh_store_coverage_zones_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_coverage_zones_status ON public.dsh_store_coverage_zones USING btree (status);


--
-- Name: idx_dsh_store_coverage_zones_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_coverage_zones_store_id ON public.dsh_store_coverage_zones USING btree (store_id);


--
-- Name: idx_dsh_store_delivery_pricing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_delivery_pricing_status ON public.dsh_store_delivery_pricing USING btree (status, fulfillment_mode);


--
-- Name: idx_dsh_store_field_verifications_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_field_verifications_visit_id ON public.dsh_store_field_verifications USING btree (visit_id);


--
-- Name: idx_dsh_store_idempotency_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_idempotency_expiry ON public.dsh_store_idempotency USING btree (expires_at, actor_id, operation);


--
-- Name: idx_dsh_store_publication_decisions_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_store_publication_decisions_scope ON public.dsh_store_publication_decisions USING btree (operator_context_id, store_id, created_at DESC);


--
-- Name: idx_dsh_stores_catalog_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_catalog_domain ON public.dsh_stores USING btree (catalog_domain_id);


--
-- Name: idx_dsh_stores_city_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_city_code ON public.dsh_stores USING btree (city_code);


--
-- Name: idx_dsh_stores_is_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_is_visible ON public.dsh_stores USING btree (is_visible);


--
-- Name: idx_dsh_stores_operational_visibility_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_operational_visibility_area ON public.dsh_stores USING btree (service_area_code, visibility_status) WHERE (visibility_status = 'visible'::text);


--
-- Name: idx_dsh_stores_operator_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_operator_page ON public.dsh_stores USING btree (updated_at DESC, id);


--
-- Name: idx_dsh_stores_operatorcontext_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_operatorcontext_partner ON public.dsh_stores USING btree (operator_context_id, partner_id);


--
-- Name: idx_dsh_stores_operatorcontext_partner_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_operatorcontext_partner_brand ON public.dsh_stores USING btree (operator_context_id, partner_id, brand_id);


--
-- Name: idx_dsh_stores_partner_draft_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_partner_draft_lookup ON public.dsh_stores USING btree (partner_id, created_at);


--
-- Name: idx_dsh_stores_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_partner_id ON public.dsh_stores USING btree (partner_id);


--
-- Name: idx_dsh_stores_public_discovery_gate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_public_discovery_gate ON public.dsh_stores USING btree (is_visible, status, serviceability_status) WHERE ((is_visible = true) AND (status = 'published'::text) AND (serviceability_status = ANY (ARRAY['serviceable'::text, 'limited'::text])) AND (partner_readiness = 'ready'::text) AND (catalog_approval_status = 'approved'::text) AND (marketing_visibility = 'visible'::text) AND (cardinality(delivery_modes) > 0) AND (NULLIF(btrim(address_line), ''::text) IS NOT NULL) AND (NULLIF(btrim(coverage_summary), ''::text) IS NOT NULL) AND (NULLIF(btrim(operating_hours), ''::text) IS NOT NULL) AND (delivery_readiness = 'ready'::text));


--
-- Name: idx_dsh_stores_service_area_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_service_area_code ON public.dsh_stores USING btree (service_area_code);


--
-- Name: idx_dsh_stores_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_stores_status ON public.dsh_stores USING btree (status);


--
-- Name: idx_dsh_subscription_lifecycle_events_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_lifecycle_events_client ON public.dsh_subscription_lifecycle_events USING btree (operator_context_id, client_id, created_at DESC);


--
-- Name: idx_dsh_subscription_lifecycle_events_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_lifecycle_events_purchase ON public.dsh_subscription_lifecycle_events USING btree (purchase_id, created_at DESC);


--
-- Name: idx_dsh_subscription_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_plans_status ON public.dsh_subscription_plans USING btree (status) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_subscription_purchases_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_purchases_client ON public.dsh_subscription_purchases USING btree (operator_context_id, client_id, created_at DESC);


--
-- Name: idx_dsh_subscription_purchases_client_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_purchases_client_lifecycle ON public.dsh_subscription_purchases USING btree (operator_context_id, client_id, status, updated_at DESC);


--
-- Name: idx_dsh_subscription_purchases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_purchases_status ON public.dsh_subscription_purchases USING btree (status, updated_at DESC);


--
-- Name: idx_dsh_subscription_purchases_wlt_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_subscription_purchases_wlt_subscription ON public.dsh_subscription_purchases USING btree (wlt_subscription_id, updated_at DESC) WHERE (wlt_subscription_id IS NOT NULL);


--
-- Name: idx_dsh_support_canned_responses_title; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_support_canned_responses_title ON public.dsh_support_canned_responses USING btree (title);


--
-- Name: idx_dsh_support_message_attachments_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_message_attachments_asset ON public.dsh_support_message_attachments USING btree (media_asset_id, message_id);


--
-- Name: idx_dsh_support_message_attachments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_message_attachments_status ON public.dsh_support_message_attachments USING btree (upload_status, created_at) WHERE (upload_status <> 'ready'::text);


--
-- Name: idx_dsh_support_message_attachments_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_message_attachments_ticket ON public.dsh_support_message_attachments USING btree (ticket_id, created_at, id);


--
-- Name: idx_dsh_support_messages_client_message; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_support_messages_client_message ON public.dsh_support_messages USING btree (ticket_id, client_message_id) WHERE (client_message_id IS NOT NULL);


--
-- Name: idx_dsh_support_messages_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_messages_ticket_id ON public.dsh_support_messages USING btree (ticket_id);


--
-- Name: idx_dsh_support_read_receipts_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_read_receipts_actor ON public.dsh_support_message_read_receipts USING btree (actor_id, actor_role, read_at DESC);


--
-- Name: idx_dsh_support_read_receipts_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_read_receipts_ticket ON public.dsh_support_message_read_receipts USING btree (ticket_id, actor_id, actor_role);


--
-- Name: idx_dsh_support_ticket_events_reporter_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_ticket_events_reporter_created ON public.dsh_support_ticket_events USING btree (reporter_id, created_at DESC);


--
-- Name: idx_dsh_support_ticket_events_ticket_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_ticket_events_ticket_created ON public.dsh_support_ticket_events USING btree (ticket_id, created_at);


--
-- Name: idx_dsh_support_tickets_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_tickets_reporter ON public.dsh_support_tickets USING btree (reporter_id);


--
-- Name: idx_dsh_support_tickets_reporter_role_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_tickets_reporter_role_created ON public.dsh_support_tickets USING btree (reporter_id, reporter_role, created_at DESC);


--
-- Name: idx_dsh_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_tickets_status ON public.dsh_support_tickets USING btree (status);


--
-- Name: idx_dsh_support_tickets_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_support_tickets_store_id ON public.dsh_support_tickets USING btree (store_id);


--
-- Name: idx_dsh_visit_checklist_requirements_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_visit_checklist_requirements_visit ON public.dsh_visit_checklist_requirements USING btree (visit_id, display_order);


--
-- Name: idx_dsh_wlt_outbox_cod_partner_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_cod_partner_scope ON public.dsh_wlt_outbox_events USING btree (operator_context_id, collector_id, created_at DESC) WHERE ((event_type = 'delivery_completed'::text) AND (collector_type = ANY (ARRAY['captain'::text, 'store_courier'::text, 'partner_store'::text])));


--
-- Name: idx_dsh_wlt_outbox_delivery_completed_once; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dsh_wlt_outbox_delivery_completed_once ON public.dsh_wlt_outbox_events USING btree (order_id, event_type) WHERE (event_type = 'delivery_completed'::text);


--
-- Name: idx_dsh_wlt_outbox_events_collector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_events_collector ON public.dsh_wlt_outbox_events USING btree (collector_type, collector_id, created_at DESC) WHERE (event_type = 'delivery_completed'::text);


--
-- Name: idx_dsh_wlt_outbox_events_operatorcontext_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_events_operatorcontext_pending ON public.dsh_wlt_outbox_events USING btree (operator_context_id, next_retry_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));


--
-- Name: idx_dsh_wlt_outbox_events_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_events_pending ON public.dsh_wlt_outbox_events USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_wlt_outbox_events_unknown_readback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_events_unknown_readback ON public.dsh_wlt_outbox_events USING btree (next_retry_at, updated_at) WHERE (status = 'unknown'::text);


--
-- Name: idx_dsh_wlt_outbox_loyalty_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dsh_wlt_outbox_loyalty_client ON public.dsh_wlt_outbox_events USING btree (client_id, event_type, status) WHERE (event_type = ANY (ARRAY['loyalty_earned'::text, 'loyalty_reversed'::text]));


--
-- Name: idx_partner_order_decision_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_partner_order_decision_idempotency ON public.dsh_partner_order_decisions USING btree (store_id, idempotency_key);


--
-- Name: uq_dsh_admin_active_support_target_context; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_admin_active_support_target_context ON public.dsh_admin_support_session_requests USING btree (operator_context_id, target_actor_id) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text, 'issued'::text]));


--
-- Name: uq_dsh_admin_pending_role_change_by_context_actor_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_admin_pending_role_change_by_context_actor_role ON public.dsh_admin_approval_requests USING btree (operator_context_id, target_actor_id, role_name) WHERE (status = 'pending'::text);


--
-- Name: uq_dsh_admin_pending_role_definition_by_context; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_admin_pending_role_definition_by_context ON public.dsh_admin_role_definition_requests USING btree (operator_context_id, lower(role_name)) WHERE (status = 'pending'::text);


--
-- Name: uq_dsh_admin_rollback_pending_source_by_context; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_admin_rollback_pending_source_by_context ON public.dsh_admin_rollback_requests USING btree (operator_context_id, source_approval_id) WHERE (status = 'pending'::text);


--
-- Name: uq_dsh_assignments_operator_context_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_assignments_operator_context_idempotency ON public.dsh_assignments USING btree (operator_context_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: uq_dsh_carts_single_active_client; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_carts_single_active_client ON public.dsh_carts USING btree (client_id) WHERE (state = 'active'::text);


--
-- Name: uq_dsh_catalog_asset_links_primary_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_catalog_asset_links_primary_active ON public.dsh_catalog_asset_links USING btree (entity_type, entity_id, role) WHERE ((is_primary = true) AND (status <> 'archived'::text));


--
-- Name: uq_dsh_catalog_platform_policies_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_default ON public.dsh_catalog_platform_policies USING btree ((1)) WHERE (policy_scope = 'default'::text);


--
-- Name: uq_dsh_catalog_platform_policies_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_domain ON public.dsh_catalog_platform_policies USING btree (domain_id) WHERE (policy_scope = 'domain'::text);


--
-- Name: uq_dsh_catalog_platform_policies_node; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_node ON public.dsh_catalog_platform_policies USING btree (node_id) WHERE (policy_scope = 'node'::text);


--
-- Name: uq_dsh_checkout_create_idempotency_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_checkout_create_idempotency_intent ON public.dsh_checkout_create_idempotency USING btree (checkout_intent_id);


--
-- Name: uq_dsh_checkout_operatorcontext_payment_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_checkout_operatorcontext_payment_session ON public.dsh_checkout_intents USING btree (operator_context_id, wlt_payment_session_id) WHERE ((operator_context_id IS NOT NULL) AND (btrim(wlt_payment_session_id) <> ''::text));


--
-- Name: uq_dsh_client_addresses_active_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_client_addresses_active_fingerprint ON public.dsh_client_addresses USING btree (client_id, address_fingerprint) WHERE (deleted_at IS NULL);


--
-- Name: uq_dsh_client_addresses_active_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_client_addresses_active_idempotency ON public.dsh_client_addresses USING btree (client_id, create_idempotency_key) WHERE (status <> 'DELETED'::text);


--
-- Name: uq_dsh_client_addresses_single_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_client_addresses_single_default ON public.dsh_client_addresses USING btree (client_id) WHERE ((is_default = true) AND (status = 'ACTIVE'::text));


--
-- Name: uq_dsh_coupon_redemption_wlt_funding; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_coupon_redemption_wlt_funding ON public.dsh_coupon_redemptions USING btree (wlt_funding_reservation_id) WHERE (wlt_funding_reservation_id IS NOT NULL);


--
-- Name: uq_dsh_delivery_exceptions_active_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_delivery_exceptions_active_assignment ON public.dsh_delivery_exceptions USING btree (assignment_id) WHERE (status = ANY (ARRAY['open'::text, 'acknowledged'::text]));


--
-- Name: uq_dsh_delivery_exceptions_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_delivery_exceptions_idempotency ON public.dsh_delivery_exceptions USING btree (operator_context_id, idempotency_key);


--
-- Name: uq_dsh_delivery_sla_alerts_open_leg; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_delivery_sla_alerts_open_leg ON public.dsh_delivery_sla_alerts USING btree (task_id, leg) WHERE (status = ANY (ARRAY['open'::text, 'acknowledged'::text]));


--
-- Name: uq_dsh_field_onboarding_assignments_active_task; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_field_onboarding_assignments_active_task ON public.dsh_field_onboarding_assignments USING btree (operator_context_id, business_task_key) WHERE ((business_task_key IS NOT NULL) AND (status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'draft_linked'::text])));


--
-- Name: uq_dsh_field_visits_agent_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_field_visits_agent_in_progress ON public.dsh_field_visits USING btree (field_agent_id) WHERE (status = 'in_progress'::text);


--
-- Name: uq_dsh_field_visits_store_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_field_visits_store_in_progress ON public.dsh_field_visits USING btree (store_id) WHERE (status = 'in_progress'::text);


--
-- Name: uq_dsh_home_marketing_impression_view; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_home_marketing_impression_view ON public.dsh_marketing_impressions USING btree (entity_type, entity_id, surface, viewer_ref) WHERE ((viewer_ref IS NOT NULL) AND (surface = 'app-client'::text) AND (entity_type = ANY (ARRAY['banner'::text, 'promo'::text])));


--
-- Name: INDEX uq_dsh_home_marketing_impression_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_dsh_home_marketing_impression_view IS 'Prevents duplicate  impressions for one banner/promo in one client view session.';


--
-- Name: uq_dsh_incidents_creator_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_incidents_creator_idempotency ON public.dsh_incidents USING btree (raised_by, create_idempotency_key) WHERE (create_idempotency_key IS NOT NULL);


--
-- Name: uq_dsh_loyalty_active_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_loyalty_active_policy ON public.dsh_loyalty_earning_policies USING btree (status) WHERE (status = 'active'::text);


--
-- Name: uq_dsh_loyalty_tiers_name_ar_live; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_loyalty_tiers_name_ar_live ON public.dsh_loyalty_tiers USING btree (lower(name_ar)) WHERE (archived_at IS NULL);


--
-- Name: uq_dsh_master_products_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_master_products_barcode ON public.dsh_master_products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND (barcode <> ''::text));


--
-- Name: uq_dsh_master_products_gtin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_master_products_gtin ON public.dsh_master_products USING btree (gtin) WHERE ((gtin IS NOT NULL) AND (gtin <> ''::text));


--
-- Name: uq_dsh_master_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_master_products_sku ON public.dsh_master_products USING btree (domain_id, sku) WHERE ((sku IS NOT NULL) AND (sku <> ''::text));


--
-- Name: uq_dsh_onboarding_collab_thread_object; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_onboarding_collab_thread_object ON public.dsh_onboarding_collaboration_threads USING btree (partner_id, COALESCE(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(document_id, ''::text));


--
-- Name: uq_dsh_operational_incidents_context_actor_command; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_operational_incidents_context_actor_command ON public.dsh_operational_incidents USING btree (operator_context_id, order_id, actor_id, correlation_id) WHERE ((correlation_id IS NOT NULL) AND (btrim(correlation_id) <> ''::text));


--
-- Name: uq_dsh_order_events_order_version_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_order_events_order_version_type ON public.dsh_order_status_events USING btree (order_id, order_version, event_type);


--
-- Name: uq_dsh_order_preparation_active_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_order_preparation_active_alert ON public.dsh_order_preparation_alerts USING btree (order_id, alert_kind, estimate_revision) WHERE (status = ANY (ARRAY['open'::text, 'acknowledged'::text]));


--
-- Name: uq_dsh_order_preparation_open_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_order_preparation_open_issue ON public.dsh_order_preparation_issues USING btree (order_id, COALESCE(order_item_id, '00000000-0000-0000-0000-000000000000'::uuid), issue_kind) WHERE (status = 'open'::text);


--
-- Name: uq_dsh_order_rescue_active_action; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_order_rescue_active_action ON public.dsh_order_rescue_actions USING btree (rescue_case_id) WHERE (status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'executing'::text]));


--
-- Name: uq_dsh_order_rescue_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_order_rescue_active_order ON public.dsh_order_rescue_cases USING btree (order_id) WHERE (status <> ALL (ARRAY['resolved'::text, 'closed'::text]));


--
-- Name: uq_dsh_orders_operatorcontext_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_orders_operatorcontext_correlation ON public.dsh_orders USING btree (operator_context_id, correlation_id);


--
-- Name: uq_dsh_orders_operatorcontext_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_orders_operatorcontext_order_number ON public.dsh_orders USING btree (operator_context_id, order_number);


--
-- Name: uq_dsh_partner_courier_pending_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_partner_courier_pending_code ON public.dsh_partner_courier_connection_codes USING btree (team_member_id) WHERE (status = 'pending'::text);


--
-- Name: uq_dsh_partners_id_operatorcontext; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_partners_id_operatorcontext ON public.dsh_partners USING btree (id, operator_context_id);


--
-- Name: uq_dsh_partners_operatorcontext_legal_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_partners_operatorcontext_legal_identity ON public.dsh_partners USING btree (operator_context_id, legal_identity_type, legal_identity_number);


--
-- Name: uq_dsh_pickup_sla_alerts_open_leg; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_pickup_sla_alerts_open_leg ON public.dsh_pickup_sla_alerts USING btree (session_id, leg) WHERE (status = ANY (ARRAY['open'::text, 'acknowledged'::text]));


--
-- Name: uq_dsh_platform_zones_service_area; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_platform_zones_service_area ON public.dsh_platform_zones USING btree (lower(service_area_code));


--
-- Name: uq_dsh_preparation_issue_events_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_preparation_issue_events_idempotency ON public.dsh_order_preparation_issue_events USING btree (issue_id, idempotency_key) WHERE (btrim(idempotency_key) <> ''::text);


--
-- Name: uq_dsh_product_duplicate_candidates_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_product_duplicate_candidates_identity ON public.dsh_product_duplicate_candidates USING btree (proposal_id, candidate_master_product_id);


--
-- Name: uq_dsh_promotion_funding_outbox_reverse_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_promotion_funding_outbox_reverse_order ON public.dsh_promotion_funding_outbox USING btree (wlt_funding_reservation_id, event_type, order_id) WHERE (event_type = 'reverse'::text);


--
-- Name: uq_dsh_promotion_funding_outbox_transition; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_promotion_funding_outbox_transition ON public.dsh_promotion_funding_outbox USING btree (wlt_funding_reservation_id, event_type) WHERE (event_type = ANY (ARRAY['commit'::text, 'release'::text]));


--
-- Name: uq_dsh_provider_rating_receipts_actor_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_provider_rating_receipts_actor_key ON public.dsh_provider_rating_mutation_receipts USING btree (operator_context_id, actor_id, idempotency_key);


--
-- Name: uq_dsh_provider_ratings_rater_source_target; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_provider_ratings_rater_source_target ON public.dsh_provider_ratings USING btree (operator_context_id, rater_actor_id, source_kind, source_id, target_kind);


--
-- Name: uq_dsh_reels_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_reels_asset ON public.dsh_reels USING btree (asset_id);


--
-- Name: uq_dsh_stores_id_operatorcontext; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_stores_id_operatorcontext ON public.dsh_stores USING btree (id, operator_context_id);


--
-- Name: uq_dsh_subscription_plan_wlt_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_subscription_plan_wlt_reference ON public.dsh_subscription_plans USING btree (wlt_product_reference) WHERE ((btrim(COALESCE(wlt_product_reference, ''::text)) <> ''::text) AND (archived_at IS NULL));


--
-- Name: uq_dsh_subscription_plans_name_ar_live; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_subscription_plans_name_ar_live ON public.dsh_subscription_plans USING btree (lower(name_ar)) WHERE (archived_at IS NULL);


--
-- Name: uq_dsh_subscription_purchase_wlt_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_subscription_purchase_wlt_subscription ON public.dsh_subscription_purchases USING btree (wlt_subscription_id) WHERE ((wlt_subscription_id IS NOT NULL) AND (renewal_of_purchase_id IS NULL));


--
-- Name: uq_dsh_support_message_sender_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_support_message_sender_idempotency ON public.dsh_support_messages USING btree (ticket_id, sender_id, create_idempotency_key) WHERE (create_idempotency_key IS NOT NULL);


--
-- Name: uq_dsh_support_ticket_event_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_support_ticket_event_correlation ON public.dsh_support_ticket_events USING btree (ticket_id, event_type, correlation_id);


--
-- Name: uq_dsh_support_ticket_reporter_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_dsh_support_ticket_reporter_idempotency ON public.dsh_support_tickets USING btree (reporter_id, create_idempotency_key) WHERE (create_idempotency_key IS NOT NULL);


--
-- Name: dsh_partner_activation_events dsh_partner_activation_wlt_outbox_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dsh_partner_activation_wlt_outbox_trigger AFTER INSERT ON public.dsh_partner_activation_events FOR EACH ROW EXECUTE FUNCTION public.dsh_enqueue_partner_wlt_deactivation();


--
-- Name: dsh_stores dsh_stores_partner_reassignment_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dsh_stores_partner_reassignment_guard BEFORE UPDATE OF partner_id ON public.dsh_stores FOR EACH ROW EXECUTE FUNCTION public.dsh_prevent_store_partner_reassignment();


--
-- Name: dsh_stores dsh_stores_partner_transfer_audit_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER dsh_stores_partner_transfer_audit_guard AFTER UPDATE OF partner_id ON public.dsh_stores DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_require_store_partner_transfer_audit();


--
-- Name: dsh_master_products enforce_product_variant_depth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_product_variant_depth BEFORE INSERT OR UPDATE ON public.dsh_master_products FOR EACH ROW EXECUTE FUNCTION public.trigger_enforce_product_variant_depth();


--
-- Name: dsh_master_products enforce_product_variant_domain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_product_variant_domain BEFORE INSERT OR UPDATE ON public.dsh_master_products FOR EACH ROW EXECUTE FUNCTION public.trigger_enforce_product_variant_domain();


--
-- Name: dsh_assignments trg_check_assignment_mode; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_assignment_mode BEFORE INSERT OR UPDATE ON public.dsh_assignments FOR EACH ROW EXECUTE FUNCTION public.dsh_check_assignment_fulfillment_mode();


--
-- Name: dsh_deliveries trg_check_delivery_mode; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_delivery_mode BEFORE INSERT OR UPDATE ON public.dsh_deliveries FOR EACH ROW EXECUTE FUNCTION public.dsh_check_assignment_fulfillment_mode();


--
-- Name: dsh_admin_approval_requests trg_dsh_admin_approval_replacement_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_approval_replacement_link BEFORE INSERT OR UPDATE OF supersedes_request_id ON public.dsh_admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_replacement_link('role-assignment');


--
-- Name: dsh_admin_approval_requests trg_dsh_admin_approval_request_decision_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_approval_request_decision_fence BEFORE UPDATE OF status ON public.dsh_admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_rejection_after_canonical_intent('role-assignment');


--
-- Name: dsh_admin_approval_requests trg_dsh_admin_approval_request_supersession; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_approval_request_supersession BEFORE UPDATE ON public.dsh_admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_source_supersession('role-assignment');


--
-- Name: dsh_admin_approval_requests trg_dsh_admin_approval_source_decision_invariant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_admin_approval_source_decision_invariant AFTER INSERT OR DELETE OR UPDATE ON public.dsh_admin_approval_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_assert_intent_source_decision('role-assignment');


--
-- Name: dsh_admin_audit trg_dsh_admin_audit_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_audit_append_only BEFORE DELETE OR UPDATE ON public.dsh_admin_audit FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_audit_append_only_guard();


--
-- Name: dsh_admin_canonical_mutation_intents trg_dsh_admin_guard_canonical_intent_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_guard_canonical_intent_source BEFORE INSERT OR UPDATE OF operation_type, request_id ON public.dsh_admin_canonical_mutation_intents FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_canonical_intent_source();


--
-- Name: dsh_admin_canonical_mutation_intents trg_dsh_admin_intent_source_decision_invariant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_admin_intent_source_decision_invariant AFTER INSERT OR DELETE OR UPDATE ON public.dsh_admin_canonical_mutation_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_assert_intent_source_decision();


--
-- Name: dsh_admin_role_definition_requests trg_dsh_admin_role_definition_replacement_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_role_definition_replacement_link BEFORE INSERT OR UPDATE OF supersedes_request_id ON public.dsh_admin_role_definition_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_replacement_link('role-definition-upsert');


--
-- Name: dsh_admin_role_definition_requests trg_dsh_admin_role_definition_request_decision_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_role_definition_request_decision_fence BEFORE UPDATE OF status ON public.dsh_admin_role_definition_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_rejection_after_canonical_intent('role-definition-upsert');


--
-- Name: dsh_admin_role_definition_requests trg_dsh_admin_role_definition_request_supersession; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_role_definition_request_supersession BEFORE UPDATE ON public.dsh_admin_role_definition_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_source_supersession('role-definition-upsert');


--
-- Name: dsh_admin_role_definition_requests trg_dsh_admin_role_definition_source_decision_invariant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_admin_role_definition_source_decision_invariant AFTER INSERT OR DELETE OR UPDATE ON public.dsh_admin_role_definition_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_assert_intent_source_decision('role-definition-upsert');


--
-- Name: dsh_admin_rollback_requests trg_dsh_admin_rollback_replacement_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_rollback_replacement_link BEFORE INSERT OR UPDATE OF supersedes_request_id ON public.dsh_admin_rollback_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_replacement_link('role-rollback');


--
-- Name: dsh_admin_rollback_requests trg_dsh_admin_rollback_request_decision_fence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_rollback_request_decision_fence BEFORE UPDATE OF status ON public.dsh_admin_rollback_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_rejection_after_canonical_intent('role-rollback');


--
-- Name: dsh_admin_rollback_requests trg_dsh_admin_rollback_request_supersession; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_rollback_request_supersession BEFORE UPDATE ON public.dsh_admin_rollback_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_source_supersession('role-rollback');


--
-- Name: dsh_admin_rollback_requests trg_dsh_admin_rollback_source_decision_invariant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_admin_rollback_source_decision_invariant AFTER INSERT OR DELETE OR UPDATE ON public.dsh_admin_rollback_requests DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_assert_intent_source_decision('role-rollback');


--
-- Name: dsh_admin_canonical_mutation_intents trg_dsh_admin_terminal_intent_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_admin_terminal_intent_immutability BEFORE DELETE OR UPDATE ON public.dsh_admin_canonical_mutation_intents FOR EACH ROW EXECUTE FUNCTION public.dsh_admin_guard_terminal_intent_immutability();


--
-- Name: dsh_orders trg_dsh_apply_checkout_pricing_to_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_apply_checkout_pricing_to_order BEFORE INSERT ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_apply_checkout_pricing_to_order();


--
-- Name: dsh_order_items trg_dsh_apply_order_item_currency_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_apply_order_item_currency_snapshot BEFORE INSERT ON public.dsh_order_items FOR EACH ROW EXECUTE FUNCTION public.dsh_apply_order_item_currency_snapshot();


--
-- Name: dsh_orders trg_dsh_apply_order_truth; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_apply_order_truth BEFORE INSERT ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_apply_order_truth();


--
-- Name: dsh_orders trg_dsh_assign_order_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_assign_order_operatorcontext BEFORE INSERT OR UPDATE OF operator_context_id, checkout_intent_id ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_assign_and_guard_order_operatorcontext();


--
-- Name: dsh_assignments trg_dsh_assignment_captain_absence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_assignment_captain_absence BEFORE INSERT OR UPDATE OF status, captain_id, operator_context_id, idempotency_key ON public.dsh_assignments FOR EACH ROW EXECUTE FUNCTION public.dsh_assert_no_active_captain_absence();


--
-- Name: dsh_assignments trg_dsh_assignment_captain_financial_eligibility; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_assignment_captain_financial_eligibility BEFORE INSERT OR UPDATE OF status, captain_id, operator_context_id, idempotency_key ON public.dsh_assignments FOR EACH ROW EXECUTE FUNCTION public.dsh_assert_governed_assignment_financial_eligibility();


--
-- Name: dsh_assignments trg_dsh_assignments_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_assignments_operator_context BEFORE INSERT OR UPDATE OF operator_context_id, order_id, special_request_id ON public.dsh_assignments FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_assignments_operator_context();


--
-- Name: dsh_assignments trg_dsh_assignments_validate_location_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_assignments_validate_location_timestamp BEFORE UPDATE OF last_latitude, last_longitude, location_recorded_at ON public.dsh_assignments FOR EACH ROW WHEN ((new.location_recorded_at IS NOT NULL)) EXECUTE FUNCTION public.dsh_validate_dispatch_location_timestamp();


--
-- Name: dsh_orders trg_dsh_cancel_order_dependent_work; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_cancel_order_dependent_work AFTER UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_cancel_order_dependent_work();


--
-- Name: dsh_orders trg_dsh_capture_order_preparation_timing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_capture_order_preparation_timing BEFORE UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_capture_order_preparation_timing();


--
-- Name: dsh_catalog_asset_links trg_dsh_catalog_asset_links_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_catalog_asset_links_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_catalog_asset_links FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_catalog_assets trg_dsh_catalog_assets_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_catalog_assets_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_catalog_assets FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_catalog_domains trg_dsh_catalog_domains_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_catalog_domains_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_catalog_domains FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_catalog_nodes trg_dsh_catalog_nodes_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_catalog_nodes_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_catalog_nodes FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_catalog_platform_policies trg_dsh_catalog_platform_policies_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_catalog_platform_policies_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_catalog_platform_policies FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_client_addresses trg_dsh_client_address_fingerprint; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_client_address_fingerprint BEFORE INSERT OR UPDATE OF recipient_name, phone_e164, address_line, service_area_code, building, floor, unit, delivery_instructions, latitude, longitude ON public.dsh_client_addresses FOR EACH ROW EXECUTE FUNCTION public.dsh_refresh_client_address_fingerprint();


--
-- Name: dsh_client_addresses trg_dsh_client_address_pii_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_client_address_pii_schedule BEFORE UPDATE OF deleted_at ON public.dsh_client_addresses FOR EACH ROW EXECUTE FUNCTION public.dsh_schedule_client_address_pii_purge();


--
-- Name: dsh_client_address_privacy_policy trg_dsh_client_address_privacy_policy_reschedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_client_address_privacy_policy_reschedule AFTER UPDATE OF enabled, retention_days ON public.dsh_client_address_privacy_policy FOR EACH ROW WHEN (((old.enabled IS DISTINCT FROM new.enabled) OR (old.retention_days IS DISTINCT FROM new.retention_days))) EXECUTE FUNCTION public.dsh_reschedule_client_address_privacy_queue();


--
-- Name: dsh_client_addresses trg_dsh_client_address_service_area; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_client_address_service_area BEFORE INSERT OR UPDATE OF service_area_code, latitude, longitude, deleted_at ON public.dsh_client_addresses FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_client_address_service_area();


--
-- Name: dsh_checkout_intents trg_dsh_coupon_funding_release_on_checkout_cancel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_coupon_funding_release_on_checkout_cancel AFTER UPDATE OF state ON public.dsh_checkout_intents FOR EACH ROW EXECUTE FUNCTION public.dsh_enqueue_coupon_funding_release_on_checkout_cancel();


--
-- Name: dsh_orders trg_dsh_coupon_funding_reverse_on_order_cancel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_coupon_funding_reverse_on_order_cancel AFTER UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_enqueue_coupon_funding_reverse_on_order_cancel();


--
-- Name: dsh_deliveries trg_dsh_deliveries_validate_pod_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_deliveries_validate_pod_reference BEFORE INSERT OR UPDATE OF pod_reference ON public.dsh_deliveries FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_captain_delivery_proof_reference();


--
-- Name: dsh_delivery_exceptions trg_dsh_delivery_exceptions_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_delivery_exceptions_operator_context BEFORE INSERT OR UPDATE OF operator_context_id, order_id, special_request_id, assignment_id ON public.dsh_delivery_exceptions FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_delivery_exceptions_operator_context();


--
-- Name: dsh_delivery_proofs trg_dsh_delivery_proofs_location_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_delivery_proofs_location_snapshot BEFORE INSERT ON public.dsh_delivery_proofs FOR EACH ROW EXECUTE FUNCTION public.dsh_snapshot_delivery_proof_location();


--
-- Name: dsh_delivery_sla_alerts trg_dsh_delivery_sla_alerts_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_delivery_sla_alerts_operator_context BEFORE INSERT OR UPDATE OF operator_context_id, task_id, order_id ON public.dsh_delivery_sla_alerts FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_delivery_sla_alerts_operator_context();


--
-- Name: dsh_stores trg_dsh_enforce_partner_store_operatorcontext_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_enforce_partner_store_operatorcontext_match BEFORE INSERT OR UPDATE OF operator_context_id, partner_id, brand_id ON public.dsh_stores FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_store_operatorcontext_match();


--
-- Name: dsh_orders trg_dsh_enqueue_loyalty_earned; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_enqueue_loyalty_earned AFTER UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_enqueue_loyalty_earned_on_delivery();


--
-- Name: dsh_orders trg_dsh_enqueue_pickup_delivery_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_enqueue_pickup_delivery_completion AFTER UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_enqueue_pickup_delivery_completion();


--
-- Name: dsh_order_status_events trg_dsh_enrich_order_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_enrich_order_event BEFORE INSERT ON public.dsh_order_status_events FOR EACH ROW EXECUTE FUNCTION public.dsh_enrich_order_event();


--
-- Name: dsh_checkout_intents trg_dsh_guard_checkout_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_checkout_operatorcontext BEFORE INSERT OR UPDATE OF operator_context_id ON public.dsh_checkout_intents FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_checkout_operatorcontext();


--
-- Name: dsh_checkout_wlt_event_receipts trg_dsh_guard_checkout_wlt_event_receipt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_checkout_wlt_event_receipt BEFORE INSERT OR UPDATE OF operator_context_id, checkout_intent_id, payment_session_id ON public.dsh_checkout_wlt_event_receipts FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_checkout_wlt_event_receipt();


--
-- Name: dsh_wlt_outbox_events trg_dsh_guard_cod_operator_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_cod_operator_context BEFORE INSERT ON public.dsh_wlt_outbox_events FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_cod_operator_context();


--
-- Name: dsh_coupon_redemptions trg_dsh_guard_coupon_funding_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_coupon_funding_projection BEFORE UPDATE OF funding_operator_context_id, platform_funded_minor_units, partner_funded_minor_units, funding_partner_id, funding_status, wlt_funding_reservation_id ON public.dsh_coupon_redemptions FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_coupon_funding_projection();


--
-- Name: dsh_loyalty_tiers trg_dsh_guard_loyalty_tier_governance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_loyalty_tier_governance BEFORE UPDATE ON public.dsh_loyalty_tiers FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_loyalty_tier_governance();


--
-- Name: dsh_special_request_wlt_event_receipts trg_dsh_guard_special_request_wlt_event_receipt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_special_request_wlt_event_receipt BEFORE INSERT OR UPDATE OF operator_context_id, special_request_id, payment_session_id ON public.dsh_special_request_wlt_event_receipts FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_special_request_wlt_event_receipt();


--
-- Name: dsh_subscription_plans trg_dsh_guard_subscription_plan_governance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_subscription_plan_governance BEFORE UPDATE ON public.dsh_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_subscription_plan_governance();


--
-- Name: dsh_subscription_purchases trg_dsh_guard_subscription_purchase_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_guard_subscription_purchase_update BEFORE UPDATE ON public.dsh_subscription_purchases FOR EACH ROW EXECUTE FUNCTION public.dsh_guard_subscription_purchase_update();


--
-- Name: dsh_home_banners trg_dsh_home_banner_target_cleanup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_home_banner_target_cleanup AFTER DELETE ON public.dsh_home_banners FOR EACH ROW EXECUTE FUNCTION public.dsh_cleanup_home_content_targets('banners');


--
-- Name: dsh_home_promos trg_dsh_home_promo_target_cleanup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_home_promo_target_cleanup AFTER DELETE ON public.dsh_home_promos FOR EACH ROW EXECUTE FUNCTION public.dsh_cleanup_home_content_targets('promos');


--
-- Name: dsh_orders trg_dsh_increment_order_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_increment_order_version BEFORE UPDATE OF status ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_increment_order_version();


--
-- Name: dsh_master_product_attribute_values trg_dsh_master_product_attribute_values_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_master_product_attribute_values_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_master_product_attribute_values FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_master_product_relationships trg_dsh_master_product_relationships_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_master_product_relationships_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_master_product_relationships FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_master_products trg_dsh_master_products_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_master_products_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_master_products FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_wlt_outbox_events trg_dsh_normalize_delivery_collection_actor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_normalize_delivery_collection_actor BEFORE INSERT OR UPDATE OF event_type, order_id, captain_id, collector_type, collector_id ON public.dsh_wlt_outbox_events FOR EACH ROW EXECUTE FUNCTION public.dsh_normalize_delivery_collection_actor();


--
-- Name: dsh_operational_incidents trg_dsh_operational_incidents_operator_context_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_operational_incidents_operator_context_match BEFORE INSERT OR UPDATE OF operator_context_id, order_id ON public.dsh_operational_incidents FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_operational_incidents_operator_context();


--
-- Name: dsh_order_cancellations trg_dsh_order_cancellations_operator_context_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_order_cancellations_operator_context_match BEFORE INSERT OR UPDATE OF operator_context_id, order_id ON public.dsh_order_cancellations FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_order_cancellations_operator_context();


--
-- Name: dsh_order_status_events trg_dsh_order_event_outbox; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_order_event_outbox AFTER INSERT ON public.dsh_order_status_events FOR EACH ROW EXECUTE FUNCTION public.dsh_publish_order_event_to_outbox();


--
-- Name: dsh_partner_activation_events trg_dsh_partner_activation_events_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_activation_events_operatorcontext BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON public.dsh_partner_activation_events FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_child_operatorcontext();


--
-- Name: dsh_partner_delivery_tasks trg_dsh_partner_delivery_tasks_context_integrity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_delivery_tasks_context_integrity BEFORE INSERT OR UPDATE OF store_id, order_id ON public.dsh_partner_delivery_tasks FOR EACH ROW EXECUTE FUNCTION public.trg_fn_dsh_partner_delivery_tasks_context_integrity();


--
-- Name: dsh_partner_delivery_tasks trg_dsh_partner_delivery_validate_proof_reference; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_delivery_validate_proof_reference BEFORE INSERT OR UPDATE OF proof_reference ON public.dsh_partner_delivery_tasks FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_partner_delivery_proof_reference();


--
-- Name: dsh_partner_document_reviews trg_dsh_partner_document_reviews_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_document_reviews_operatorcontext BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON public.dsh_partner_document_reviews FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_child_operatorcontext();


--
-- Name: dsh_partner_documents trg_dsh_partner_documents_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_documents_operatorcontext BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON public.dsh_partner_documents FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_child_operatorcontext();


--
-- Name: dsh_partner_field_visits trg_dsh_partner_field_visits_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partner_field_visits_operatorcontext BEFORE INSERT OR UPDATE OF partner_id, operator_context_id ON public.dsh_partner_field_visits FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_child_operatorcontext();


--
-- Name: dsh_partners trg_dsh_partners_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_partners_operatorcontext BEFORE INSERT OR UPDATE ON public.dsh_partners FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_partner_operatorcontext();


--
-- Name: dsh_pickup_sessions trg_dsh_prepare_pickup_no_show_shape; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_prepare_pickup_no_show_shape BEFORE INSERT OR UPDATE OF status, used_at, no_show_at, no_show_reason ON public.dsh_pickup_sessions FOR EACH ROW EXECUTE FUNCTION public.dsh_prepare_pickup_no_show_shape();


--
-- Name: dsh_product_proposals trg_dsh_product_proposals_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_product_proposals_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_product_proposals FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_pickup_audit_events trg_dsh_project_pickup_lifecycle_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_project_pickup_lifecycle_audit AFTER INSERT ON public.dsh_pickup_audit_events FOR EACH ROW EXECUTE FUNCTION public.dsh_project_pickup_lifecycle_audit();


--
-- Name: dsh_checkout_cart_snapshots trg_dsh_protect_checkout_cart_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_checkout_cart_snapshot BEFORE UPDATE ON public.dsh_checkout_cart_snapshots FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_checkout_cart_snapshot();


--
-- Name: dsh_checkout_item_snapshots trg_dsh_protect_checkout_item_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_checkout_item_snapshot BEFORE UPDATE ON public.dsh_checkout_item_snapshots FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_checkout_item_snapshot();


--
-- Name: dsh_order_items trg_dsh_protect_order_item_commercial_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_order_item_commercial_snapshot BEFORE UPDATE ON public.dsh_order_items FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_order_item_commercial_snapshot();


--
-- Name: dsh_orders trg_dsh_protect_order_pricing_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_order_pricing_snapshot BEFORE UPDATE ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_order_pricing_snapshot();


--
-- Name: dsh_orders trg_dsh_protect_order_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_order_snapshot BEFORE UPDATE ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_order_snapshot();


--
-- Name: dsh_store_delivery_pricing trg_dsh_protect_pickup_fee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_protect_pickup_fee BEFORE INSERT OR UPDATE ON public.dsh_store_delivery_pricing FOR EACH ROW EXECUTE FUNCTION public.dsh_protect_pickup_fee();


--
-- Name: dsh_delivery_exceptions trg_dsh_record_default_delivery_exception_reporter; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_record_default_delivery_exception_reporter AFTER INSERT ON public.dsh_delivery_exceptions FOR EACH ROW EXECUTE FUNCTION public.dsh_record_default_delivery_exception_reporter();


--
-- Name: dsh_reels trg_dsh_reels_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_reels_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_reels FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_cart_mutation_receipts trg_dsh_reject_quarantined_cart_mutation_receipt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_reject_quarantined_cart_mutation_receipt BEFORE INSERT ON public.dsh_cart_mutation_receipts FOR EACH ROW EXECUTE FUNCTION public.dsh_reject_quarantined_cart_mutation_receipt();


--
-- Name: dsh_orders trg_dsh_schedule_payment_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_schedule_payment_projection AFTER INSERT ON public.dsh_orders FOR EACH ROW EXECUTE FUNCTION public.dsh_schedule_payment_projection();


--
-- Name: dsh_service_area_geofences trg_dsh_service_area_effectivity_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_service_area_effectivity_update BEFORE INSERT OR UPDATE OF effective_from ON public.dsh_service_area_geofences FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_service_area_effectivity_update();


--
-- Name: dsh_service_area_versions trg_dsh_service_area_versions_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_service_area_versions_immutable BEFORE DELETE OR UPDATE ON public.dsh_service_area_versions FOR EACH ROW EXECUTE FUNCTION public.dsh_reject_service_area_version_mutation();


--
-- Name: dsh_store_actor_scopes trg_dsh_store_actor_scopes_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_store_actor_scopes_operatorcontext BEFORE INSERT OR UPDATE OF store_id, operator_context_id ON public.dsh_store_actor_scopes FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_store_scope_operatorcontext();


--
-- Name: dsh_store_assortments trg_dsh_store_assortments_catalog_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_store_assortments_catalog_audit AFTER INSERT OR DELETE OR UPDATE ON public.dsh_store_assortments FOR EACH ROW EXECUTE FUNCTION public.dsh_catalog_capture_entity_audit();


--
-- Name: dsh_stores trg_dsh_stores_operatorcontext; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_stores_operatorcontext BEFORE INSERT OR UPDATE ON public.dsh_stores FOR EACH ROW EXECUTE FUNCTION public.dsh_enforce_store_operatorcontext();


--
-- Name: dsh_subscription_lifecycle_events trg_dsh_subscription_lifecycle_events_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_subscription_lifecycle_events_no_delete BEFORE DELETE ON public.dsh_subscription_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.dsh_reject_subscription_lifecycle_event_mutation();


--
-- Name: dsh_subscription_lifecycle_events trg_dsh_subscription_lifecycle_events_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_subscription_lifecycle_events_no_update BEFORE UPDATE ON public.dsh_subscription_lifecycle_events FOR EACH ROW EXECUTE FUNCTION public.dsh_reject_subscription_lifecycle_event_mutation();


--
-- Name: dsh_assignments trg_dsh_supersede_store_captain_handoff_on_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_supersede_store_captain_handoff_on_assignment AFTER INSERT ON public.dsh_assignments FOR EACH ROW EXECUTE FUNCTION public.dsh_supersede_store_captain_handoff_on_assignment();


--
-- Name: dsh_support_message_attachments trg_dsh_support_message_content_attachment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_support_message_content_attachment AFTER INSERT OR DELETE OR UPDATE ON public.dsh_support_message_attachments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_support_message_content();


--
-- Name: dsh_support_messages trg_dsh_support_message_content_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_dsh_support_message_content_message AFTER INSERT OR DELETE OR UPDATE ON public.dsh_support_messages DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_support_message_content();


--
-- Name: dsh_support_messages trg_dsh_support_messages_sequence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_support_messages_sequence BEFORE INSERT ON public.dsh_support_messages FOR EACH ROW WHEN ((new.sequence_num IS NULL)) EXECUTE FUNCTION public.dsh_assign_support_message_sequence();


--
-- Name: dsh_special_requests trg_dsh_sync_special_request_dispatch_stage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_sync_special_request_dispatch_stage BEFORE UPDATE OF status ON public.dsh_special_requests FOR EACH ROW EXECUTE FUNCTION public.dsh_sync_special_request_dispatch_stage();


--
-- Name: dsh_partner_offers trg_dsh_sync_store_coupon_badge; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_sync_store_coupon_badge AFTER INSERT OR DELETE OR UPDATE ON public.dsh_partner_offers FOR EACH ROW EXECUTE FUNCTION public.dsh_sync_store_coupon_badge();


--
-- Name: dsh_order_truth_audit trg_dsh_validate_audit_metadata; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_validate_audit_metadata BEFORE INSERT OR UPDATE ON public.dsh_order_truth_audit FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_audit_metadata();


--
-- Name: dsh_coupons trg_dsh_validate_coupon_funding_ownership; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_validate_coupon_funding_ownership BEFORE INSERT OR UPDATE OF store_id, funding_source, platform_share_bps, funding_partner_id ON public.dsh_coupons FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_coupon_funding_ownership();


--
-- Name: dsh_partner_offers trg_dsh_validate_published_coupon_offer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dsh_validate_published_coupon_offer BEFORE INSERT OR UPDATE OF offer_type, status, coupon_id, store_id, archived_at ON public.dsh_partner_offers FOR EACH ROW EXECUTE FUNCTION public.dsh_validate_published_coupon_offer();


--
-- Name: dsh_store_assortments trigger_enforce_assortment_domain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_enforce_assortment_domain BEFORE INSERT OR UPDATE ON public.dsh_store_assortments FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_domain_sovereignty();


--
-- Name: dsh_catalog_nodes trigger_enforce_node_domain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_enforce_node_domain BEFORE INSERT OR UPDATE ON public.dsh_catalog_nodes FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_domain_sovereignty();


--
-- Name: dsh_master_products trigger_enforce_product_domain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_enforce_product_domain BEFORE INSERT OR UPDATE ON public.dsh_master_products FOR EACH ROW EXECUTE FUNCTION public.enforce_catalog_domain_sovereignty();


--
-- Name: dsh_catalog_nodes trigger_no_node_cycles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_no_node_cycles BEFORE INSERT OR UPDATE ON public.dsh_catalog_nodes FOR EACH ROW EXECUTE FUNCTION public.enforce_no_node_cycles();


--
-- Name: dsh_admin_approval_requests dsh_admin_approval_requests_supersedes_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_approval_requests
    ADD CONSTRAINT dsh_admin_approval_requests_supersedes_fkey FOREIGN KEY (supersedes_request_id) REFERENCES public.dsh_admin_approval_requests(id) ON DELETE RESTRICT;


--
-- Name: dsh_admin_role_definition_requests dsh_admin_role_definition_requests_supersedes_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_role_definition_requests
    ADD CONSTRAINT dsh_admin_role_definition_requests_supersedes_fkey FOREIGN KEY (supersedes_request_id) REFERENCES public.dsh_admin_role_definition_requests(id) ON DELETE RESTRICT;


--
-- Name: dsh_admin_rollback_requests dsh_admin_rollback_requests_source_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_rollback_requests
    ADD CONSTRAINT dsh_admin_rollback_requests_source_approval_id_fkey FOREIGN KEY (source_approval_id) REFERENCES public.dsh_admin_approval_requests(id) ON DELETE RESTRICT;


--
-- Name: dsh_admin_rollback_requests dsh_admin_rollback_requests_supersedes_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_admin_rollback_requests
    ADD CONSTRAINT dsh_admin_rollback_requests_supersedes_fkey FOREIGN KEY (supersedes_request_id) REFERENCES public.dsh_admin_rollback_requests(id) ON DELETE RESTRICT;


--
-- Name: dsh_analytics_projections dsh_analytics_projections_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_analytics_projections
    ADD CONSTRAINT dsh_analytics_projections_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.dsh_analytics_metrics_registry(metric_id);


--
-- Name: dsh_assignments dsh_assignments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_assignments dsh_assignments_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_assignments dsh_assignments_supersedes_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_supersedes_assignment_id_fkey FOREIGN KEY (supersedes_assignment_id) REFERENCES public.dsh_assignments(id);


--
-- Name: dsh_captain_assignment_command_receipts dsh_captain_assignment_command_receipts_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_assignment_command_receipts
    ADD CONSTRAINT dsh_captain_assignment_command_receipts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_captain_availability_command_receipts dsh_captain_availability_comm_operator_context_id_captain__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_availability_command_receipts
    ADD CONSTRAINT dsh_captain_availability_comm_operator_context_id_captain__fkey FOREIGN KEY (operator_context_id, captain_id) REFERENCES public.dsh_captain_dispatch_profiles(operator_context_id, captain_id) ON DELETE CASCADE;


--
-- Name: dsh_captain_delivery_status_command_receipts dsh_captain_delivery_status_command_receipts_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_delivery_status_command_receipts
    ADD CONSTRAINT dsh_captain_delivery_status_command_receipts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_captain_membership_history dsh_captain_membership_history_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_captain_membership_history
    ADD CONSTRAINT dsh_captain_membership_history_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.dsh_captain_memberships(id) ON DELETE CASCADE;


--
-- Name: dsh_cart_items dsh_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.dsh_carts(id) ON DELETE CASCADE;


--
-- Name: dsh_cart_items dsh_cart_items_store_assortment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_store_assortment_id_fkey FOREIGN KEY (store_assortment_id) REFERENCES public.dsh_store_assortments(id);


--
-- Name: dsh_cart_mutation_receipts dsh_cart_mutation_receipts_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipts
    ADD CONSTRAINT dsh_cart_mutation_receipts_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.dsh_carts(id) ON DELETE SET NULL;


--
-- Name: dsh_cart_mutation_receipts dsh_cart_mutation_receipts_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_mutation_receipts
    ADD CONSTRAINT dsh_cart_mutation_receipts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.dsh_cart_items(id) ON DELETE SET NULL;


--
-- Name: dsh_cart_serviceability_checks dsh_cart_serviceability_checks_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_serviceability_checks
    ADD CONSTRAINT dsh_cart_serviceability_checks_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.dsh_client_addresses(id) ON DELETE SET NULL;


--
-- Name: dsh_cart_serviceability_checks dsh_cart_serviceability_checks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_cart_serviceability_checks
    ADD CONSTRAINT dsh_cart_serviceability_checks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_carts dsh_carts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_carts
    ADD CONSTRAINT dsh_carts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_catalog_approval_audit_trail dsh_catalog_approval_audit_trail_approval_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_approval_audit_trail
    ADD CONSTRAINT dsh_catalog_approval_audit_trail_approval_record_id_fkey FOREIGN KEY (approval_record_id) REFERENCES public.dsh_catalog_approval_records(id) ON DELETE CASCADE;


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.dsh_catalog_assets(id);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_checkout_cart_snapshots dsh_checkout_cart_snapshots_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_cart_snapshots
    ADD CONSTRAINT dsh_checkout_cart_snapshots_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.dsh_carts(id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_cart_snapshots dsh_checkout_cart_snapshots_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_cart_snapshots
    ADD CONSTRAINT dsh_checkout_cart_snapshots_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_cart_snapshots dsh_checkout_cart_snapshots_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_cart_snapshots
    ADD CONSTRAINT dsh_checkout_cart_snapshots_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_create_idempotency dsh_checkout_create_idempotency_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_create_idempotency
    ADD CONSTRAINT dsh_checkout_create_idempotency_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE CASCADE;


--
-- Name: dsh_checkout_financial_closure_outbox dsh_checkout_financial_closure_outbox_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_financial_closure_outbox
    ADD CONSTRAINT dsh_checkout_financial_closure_outbox_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_checkout_financial_closure_outbox dsh_checkout_financial_closure_outbox_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_financial_closure_outbox
    ADD CONSTRAINT dsh_checkout_financial_closure_outbox_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_checkout_intents dsh_checkout_intents_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.dsh_coupons(id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_intents dsh_checkout_intents_coupon_redemption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_coupon_redemption_id_fkey FOREIGN KEY (coupon_redemption_id) REFERENCES public.dsh_coupon_redemptions(id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_intents dsh_checkout_intents_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_checkout_item_snapshots dsh_checkout_item_snapshots_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_item_snapshots
    ADD CONSTRAINT dsh_checkout_item_snapshots_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_cart_snapshots(checkout_intent_id) ON DELETE RESTRICT;


--
-- Name: dsh_checkout_payment_saga_outbox dsh_checkout_payment_saga_outbox_saga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_saga_outbox
    ADD CONSTRAINT dsh_checkout_payment_saga_outbox_saga_id_fkey FOREIGN KEY (saga_id) REFERENCES public.dsh_checkout_payment_sagas(id) ON DELETE CASCADE;


--
-- Name: dsh_checkout_payment_sagas dsh_checkout_payment_sagas_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_payment_sagas
    ADD CONSTRAINT dsh_checkout_payment_sagas_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_checkout_wlt_event_receipts dsh_checkout_wlt_event_receipts_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_wlt_event_receipts
    ADD CONSTRAINT dsh_checkout_wlt_event_receipts_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.dsh_carts(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.dsh_coupons(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupon_redemptions dsh_coupon_redemptions_funding_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_funding_partner_id_fkey FOREIGN KEY (funding_partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupons dsh_coupons_funding_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupons
    ADD CONSTRAINT dsh_coupons_funding_partner_id_fkey FOREIGN KEY (funding_partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupons dsh_coupons_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupons
    ADD CONSTRAINT dsh_coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_deliveries dsh_deliveries_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_deliveries dsh_deliveries_delivery_proof_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_delivery_proof_id_fkey FOREIGN KEY (delivery_proof_id) REFERENCES public.dsh_delivery_proofs(id) ON DELETE RESTRICT;


--
-- Name: dsh_deliveries dsh_deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_deliveries dsh_deliveries_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_exception_operation_command_receipts dsh_delivery_exception_operation_command_rece_exception_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exception_operation_command_receipts
    ADD CONSTRAINT dsh_delivery_exception_operation_command_rece_exception_id_fkey FOREIGN KEY (exception_id) REFERENCES public.dsh_delivery_exceptions(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_exception_reporters dsh_delivery_exception_reporters_exception_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exception_reporters
    ADD CONSTRAINT dsh_delivery_exception_reporters_exception_id_fkey FOREIGN KEY (exception_id) REFERENCES public.dsh_delivery_exceptions(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_exceptions dsh_delivery_exceptions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_exceptions dsh_delivery_exceptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_exceptions dsh_delivery_exceptions_replacement_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_replacement_assignment_id_fkey FOREIGN KEY (replacement_assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE SET NULL;


--
-- Name: dsh_delivery_exceptions dsh_delivery_exceptions_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_proof_review_receipts dsh_delivery_proof_review_receipts_proof_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proof_review_receipts
    ADD CONSTRAINT dsh_delivery_proof_review_receipts_proof_id_fkey FOREIGN KEY (proof_id) REFERENCES public.dsh_delivery_proofs(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_photo_media_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_photo_media_ref_fkey FOREIGN KEY (photo_media_ref) REFERENCES public.dsh_media_refs(media_ref) ON DELETE RESTRICT;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_signature_media_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_signature_media_ref_fkey FOREIGN KEY (signature_media_ref) REFERENCES public.dsh_media_refs(media_ref) ON DELETE RESTRICT;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_proofs dsh_delivery_proofs_verification_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_proofs
    ADD CONSTRAINT dsh_delivery_proofs_verification_challenge_id_fkey FOREIGN KEY (verification_challenge_id) REFERENCES public.dsh_delivery_verification_challenges(id) ON DELETE RESTRICT;


--
-- Name: dsh_delivery_sla_alerts dsh_delivery_sla_alerts_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_sla_alerts
    ADD CONSTRAINT dsh_delivery_sla_alerts_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.dsh_partner_delivery_tasks(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_verification_challenges dsh_delivery_verification_challenges_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_verification_challenges
    ADD CONSTRAINT dsh_delivery_verification_challenges_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_delivery_verification_challenges dsh_delivery_verification_challenges_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_delivery_verification_challenges
    ADD CONSTRAINT dsh_delivery_verification_challenges_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_dispatch_decisions dsh_dispatch_decisions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_dispatch_decisions
    ADD CONSTRAINT dsh_dispatch_decisions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id);


--
-- Name: dsh_dispatch_decisions dsh_dispatch_decisions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_dispatch_decisions
    ADD CONSTRAINT dsh_dispatch_decisions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id);


--
-- Name: dsh_field_commission_outbox dsh_field_commission_outbox_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_commission_outbox
    ADD CONSTRAINT dsh_field_commission_outbox_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE CASCADE;


--
-- Name: dsh_field_onboarding_assignment_events dsh_field_onboarding_assignment_events_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_onboarding_assignment_events
    ADD CONSTRAINT dsh_field_onboarding_assignment_events_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_field_onboarding_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_field_onboarding_assignment_events dsh_field_onboarding_assignment_events_draft_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_onboarding_assignment_events
    ADD CONSTRAINT dsh_field_onboarding_assignment_events_draft_partner_id_fkey FOREIGN KEY (draft_partner_id) REFERENCES public.dsh_partners(id);


--
-- Name: dsh_field_onboarding_assignments dsh_field_onboarding_assignments_draft_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_onboarding_assignments
    ADD CONSTRAINT dsh_field_onboarding_assignments_draft_partner_id_fkey FOREIGN KEY (draft_partner_id) REFERENCES public.dsh_partners(id);


--
-- Name: dsh_field_visits dsh_field_visits_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_field_visits
    ADD CONSTRAINT dsh_field_visits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_incident_communications dsh_incident_communications_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_communications
    ADD CONSTRAINT dsh_incident_communications_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.dsh_incidents(id) ON DELETE CASCADE;


--
-- Name: dsh_incident_entities dsh_incident_entities_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_entities
    ADD CONSTRAINT dsh_incident_entities_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.dsh_incidents(id) ON DELETE CASCADE;


--
-- Name: dsh_incident_events dsh_incident_events_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_events
    ADD CONSTRAINT dsh_incident_events_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.dsh_incidents(id) ON DELETE CASCADE;


--
-- Name: dsh_incident_tasks dsh_incident_tasks_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_incident_tasks
    ADD CONSTRAINT dsh_incident_tasks_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.dsh_incidents(id) ON DELETE CASCADE;


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_master_product_id_fkey FOREIGN KEY (master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_master_product_relationships dsh_master_product_relationships_source_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_relationships
    ADD CONSTRAINT dsh_master_product_relationships_source_master_product_id_fkey FOREIGN KEY (source_master_product_id) REFERENCES public.dsh_master_products(id) ON DELETE CASCADE;


--
-- Name: dsh_master_product_relationships dsh_master_product_relationships_target_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_product_relationships
    ADD CONSTRAINT dsh_master_product_relationships_target_master_product_id_fkey FOREIGN KEY (target_master_product_id) REFERENCES public.dsh_master_products(id) ON DELETE CASCADE;


--
-- Name: dsh_master_products dsh_master_products_category_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_category_node_id_fkey FOREIGN KEY (category_node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_master_products dsh_master_products_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_master_products dsh_master_products_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_media_refs dsh_media_refs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE SET NULL;


--
-- Name: dsh_media_refs dsh_media_refs_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_media_refs dsh_media_refs_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE SET NULL;


--
-- Name: dsh_media_refs dsh_media_refs_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_notification_channel_deliveries dsh_notification_channel_deliveries_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_channel_deliveries
    ADD CONSTRAINT dsh_notification_channel_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.dsh_notifications(id) ON DELETE CASCADE;


--
-- Name: dsh_notification_delivery_attempts dsh_notification_delivery_attempts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_notification_delivery_attempts
    ADD CONSTRAINT dsh_notification_delivery_attempts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.dsh_operational_outbox_events(id) ON DELETE CASCADE;


--
-- Name: dsh_onboarding_change_requests dsh_onboarding_change_requests_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_change_requests
    ADD CONSTRAINT dsh_onboarding_change_requests_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE;


--
-- Name: dsh_onboarding_collaboration_messages dsh_onboarding_collaboration_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_messages
    ADD CONSTRAINT dsh_onboarding_collaboration_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE;


--
-- Name: dsh_onboarding_collaboration_read_cursors dsh_onboarding_collaboration_read_cursors_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_read_cursors
    ADD CONSTRAINT dsh_onboarding_collaboration_read_cursors_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE;


--
-- Name: dsh_onboarding_collaboration_threads dsh_onboarding_collaboration_threads_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_threads
    ADD CONSTRAINT dsh_onboarding_collaboration_threads_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_field_onboarding_assignments(id) ON DELETE SET NULL;


--
-- Name: dsh_onboarding_collaboration_threads dsh_onboarding_collaboration_threads_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_threads
    ADD CONSTRAINT dsh_onboarding_collaboration_threads_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dsh_partner_documents(id) ON DELETE SET NULL;


--
-- Name: dsh_onboarding_collaboration_threads dsh_onboarding_collaboration_threads_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_onboarding_collaboration_threads
    ADD CONSTRAINT dsh_onboarding_collaboration_threads_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_operational_incidents dsh_operational_incidents_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_operational_incidents
    ADD CONSTRAINT dsh_operational_incidents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_cancellation_actions dsh_order_cancellation_actions_cancellation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellation_actions
    ADD CONSTRAINT dsh_order_cancellation_actions_cancellation_id_fkey FOREIGN KEY (cancellation_id) REFERENCES public.dsh_order_cancellations(id) ON DELETE CASCADE;


--
-- Name: dsh_order_cancellations dsh_order_cancellations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_cancellations
    ADD CONSTRAINT dsh_order_cancellations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_create_idempotency dsh_order_create_idempotency_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_create_idempotency
    ADD CONSTRAINT dsh_order_create_idempotency_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_create_idempotency dsh_order_create_idempotency_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_create_idempotency
    ADD CONSTRAINT dsh_order_create_idempotency_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_event_outbox dsh_order_event_outbox_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_event_outbox
    ADD CONSTRAINT dsh_order_event_outbox_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.dsh_order_status_events(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_event_outbox dsh_order_event_outbox_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_event_outbox
    ADD CONSTRAINT dsh_order_event_outbox_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_items dsh_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_items
    ADD CONSTRAINT dsh_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_payment_projection_reconciliation dsh_order_payment_projection_reconciliation_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_payment_projection_reconciliation
    ADD CONSTRAINT dsh_order_payment_projection_reconciliation_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_alerts dsh_order_preparation_alerts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_alerts
    ADD CONSTRAINT dsh_order_preparation_alerts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_alerts dsh_order_preparation_alerts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_alerts
    ADD CONSTRAINT dsh_order_preparation_alerts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_estimate_events dsh_order_preparation_estimate_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_estimate_events
    ADD CONSTRAINT dsh_order_preparation_estimate_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_estimate_events dsh_order_preparation_estimate_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_estimate_events
    ADD CONSTRAINT dsh_order_preparation_estimate_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_issue_events dsh_order_preparation_issue_events_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.dsh_order_preparation_issues(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_issue_events dsh_order_preparation_issue_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_issue_events dsh_order_preparation_issue_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issue_events
    ADD CONSTRAINT dsh_order_preparation_issue_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_issues dsh_order_preparation_issues_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_issues dsh_order_preparation_issues_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.dsh_order_items(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_preparation_issues dsh_order_preparation_issues_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_order_preparation_replacements dsh_order_preparation_replacements_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_replacements
    ADD CONSTRAINT dsh_order_preparation_replacements_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.dsh_order_preparation_issues(id);


--
-- Name: dsh_order_preparation_replacements dsh_order_preparation_replacements_original_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_preparation_replacements
    ADD CONSTRAINT dsh_order_preparation_replacements_original_item_id_fkey FOREIGN KEY (original_item_id) REFERENCES public.dsh_order_items(id);


--
-- Name: dsh_order_refund_effects dsh_order_refund_effects_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_refund_effects
    ADD CONSTRAINT dsh_order_refund_effects_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_rescue_actions dsh_order_rescue_actions_rescue_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_actions
    ADD CONSTRAINT dsh_order_rescue_actions_rescue_case_id_fkey FOREIGN KEY (rescue_case_id) REFERENCES public.dsh_order_rescue_cases(id) ON DELETE CASCADE;


--
-- Name: dsh_order_rescue_cases dsh_order_rescue_cases_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_cases
    ADD CONSTRAINT dsh_order_rescue_cases_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_rescue_cases dsh_order_rescue_cases_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_cases
    ADD CONSTRAINT dsh_order_rescue_cases_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE SET NULL;


--
-- Name: dsh_order_rescue_events dsh_order_rescue_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_events
    ADD CONSTRAINT dsh_order_rescue_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_order_rescue_events dsh_order_rescue_events_rescue_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_rescue_events
    ADD CONSTRAINT dsh_order_rescue_events_rescue_case_id_fkey FOREIGN KEY (rescue_case_id) REFERENCES public.dsh_order_rescue_cases(id) ON DELETE CASCADE;


--
-- Name: dsh_order_return_actions dsh_order_return_actions_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_return_actions
    ADD CONSTRAINT dsh_order_return_actions_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.dsh_order_returns(id);


--
-- Name: dsh_order_return_items dsh_order_return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_return_items
    ADD CONSTRAINT dsh_order_return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.dsh_order_items(id);


--
-- Name: dsh_order_return_items dsh_order_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_return_items
    ADD CONSTRAINT dsh_order_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.dsh_order_returns(id);


--
-- Name: dsh_order_returns dsh_order_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_returns
    ADD CONSTRAINT dsh_order_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id);


--
-- Name: dsh_order_status_events dsh_order_status_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_status_events
    ADD CONSTRAINT dsh_order_status_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_truth_audit dsh_order_truth_audit_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_truth_audit
    ADD CONSTRAINT dsh_order_truth_audit_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE SET NULL;


--
-- Name: dsh_order_truth_audit dsh_order_truth_audit_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_order_truth_audit
    ADD CONSTRAINT dsh_order_truth_audit_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE SET NULL;


--
-- Name: dsh_orders dsh_orders_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_orders dsh_orders_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.dsh_coupons(id) ON DELETE RESTRICT;


--
-- Name: dsh_orders dsh_orders_coupon_redemption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_coupon_redemption_id_fkey FOREIGN KEY (coupon_redemption_id) REFERENCES public.dsh_coupon_redemptions(id) ON DELETE RESTRICT;


--
-- Name: dsh_orders dsh_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_partner_activation_events dsh_partner_activation_events_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_activation_events
    ADD CONSTRAINT dsh_partner_activation_events_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_brands dsh_partner_brands_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_brands
    ADD CONSTRAINT dsh_partner_brands_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_courier_connection_codes dsh_partner_courier_connection_codes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_courier_connection_codes
    ADD CONSTRAINT dsh_partner_courier_connection_codes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_courier_connection_codes dsh_partner_courier_connection_codes_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_courier_connection_codes
    ADD CONSTRAINT dsh_partner_courier_connection_codes_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.dsh_captain_memberships(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_delivery_command_receipts dsh_partner_delivery_command_receipts_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_command_receipts
    ADD CONSTRAINT dsh_partner_delivery_command_receipts_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.dsh_partner_delivery_tasks(id) ON DELETE SET NULL;


--
-- Name: dsh_partner_delivery_tasks dsh_partner_delivery_tasks_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_tasks
    ADD CONSTRAINT dsh_partner_delivery_tasks_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_delivery_tasks dsh_partner_delivery_tasks_store_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_tasks
    ADD CONSTRAINT dsh_partner_delivery_tasks_store_courier_id_fkey FOREIGN KEY (store_courier_id) REFERENCES public.dsh_captain_memberships(id);


--
-- Name: dsh_partner_delivery_tasks dsh_partner_delivery_tasks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_delivery_tasks
    ADD CONSTRAINT dsh_partner_delivery_tasks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dsh_partner_documents(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_documents dsh_partner_documents_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_documents
    ADD CONSTRAINT dsh_partner_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_documents dsh_partner_documents_supersedes_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_documents
    ADD CONSTRAINT dsh_partner_documents_supersedes_document_id_fkey FOREIGN KEY (supersedes_document_id) REFERENCES public.dsh_partner_documents(id) ON DELETE SET NULL;


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_media_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_media_ref_fkey FOREIGN KEY (media_ref) REFERENCES public.dsh_media_refs(media_ref) ON DELETE RESTRICT;


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_partner_field_visit_media dsh_partner_field_visit_media_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visit_media
    ADD CONSTRAINT dsh_partner_field_visit_media_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_partner_field_visits(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_partner_first_stores dsh_partner_first_stores_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_first_stores
    ADD CONSTRAINT dsh_partner_first_stores_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_first_stores dsh_partner_first_stores_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_first_stores
    ADD CONSTRAINT dsh_partner_first_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_offers dsh_partner_offers_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.dsh_coupons(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_offers dsh_partner_offers_linked_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_linked_campaign_id_fkey FOREIGN KEY (linked_campaign_id) REFERENCES public.dsh_marketing_campaigns(id);


--
-- Name: dsh_partner_order_decisions dsh_partner_order_decisions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_decisions
    ADD CONSTRAINT dsh_partner_order_decisions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id);


--
-- Name: dsh_partner_order_decisions dsh_partner_order_decisions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_decisions
    ADD CONSTRAINT dsh_partner_order_decisions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_partner_order_transition_receipts dsh_partner_order_transition_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_transition_receipts
    ADD CONSTRAINT dsh_partner_order_transition_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_order_transition_receipts dsh_partner_order_transition_receipts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_order_transition_receipts
    ADD CONSTRAINT dsh_partner_order_transition_receipts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_store_transfer_audit dsh_partner_store_transfer_audit_from_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_store_transfer_audit
    ADD CONSTRAINT dsh_partner_store_transfer_audit_from_partner_id_fkey FOREIGN KEY (from_partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_store_transfer_audit dsh_partner_store_transfer_audit_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_store_transfer_audit
    ADD CONSTRAINT dsh_partner_store_transfer_audit_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_store_transfer_audit dsh_partner_store_transfer_audit_to_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_store_transfer_audit
    ADD CONSTRAINT dsh_partner_store_transfer_audit_to_partner_id_fkey FOREIGN KEY (to_partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_wlt_outbox dsh_partner_wlt_outbox_activation_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_outbox
    ADD CONSTRAINT dsh_partner_wlt_outbox_activation_event_id_fkey FOREIGN KEY (activation_event_id) REFERENCES public.dsh_partner_activation_events(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_wlt_outbox dsh_partner_wlt_outbox_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_outbox
    ADD CONSTRAINT dsh_partner_wlt_outbox_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partner_wlt_reconciliation_cases dsh_partner_wlt_reconciliation_cases_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partner_wlt_reconciliation_cases
    ADD CONSTRAINT dsh_partner_wlt_reconciliation_cases_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE RESTRICT;


--
-- Name: dsh_partners dsh_partners_business_vertical_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_partners
    ADD CONSTRAINT dsh_partners_business_vertical_id_fkey FOREIGN KEY (business_vertical_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_pickup_mutation_commands dsh_pickup_mutation_commands_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_mutation_commands
    ADD CONSTRAINT dsh_pickup_mutation_commands_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_pickup_sessions dsh_pickup_sessions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_pickup_sessions dsh_pickup_sessions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_pickup_sla_alerts dsh_pickup_sla_alerts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_pickup_sla_alerts
    ADD CONSTRAINT dsh_pickup_sla_alerts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.dsh_pickup_sessions(id) ON DELETE CASCADE;


--
-- Name: dsh_platform_capacity_configs dsh_platform_capacity_configs_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_capacity_configs
    ADD CONSTRAINT dsh_platform_capacity_configs_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.dsh_platform_zones(id) ON DELETE RESTRICT;


--
-- Name: dsh_platform_delivery_mode_policies dsh_platform_delivery_mode_policies_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_delivery_mode_policies
    ADD CONSTRAINT dsh_platform_delivery_mode_policies_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.dsh_platform_zones(id) ON DELETE RESTRICT;


--
-- Name: dsh_platform_sla_rules dsh_platform_sla_rules_zone_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_sla_rules
    ADD CONSTRAINT dsh_platform_sla_rules_zone_fk FOREIGN KEY (zone_id) REFERENCES public.dsh_platform_zones(id) ON DELETE RESTRICT;


--
-- Name: dsh_platform_zones dsh_platform_zones_service_area_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_platform_zones
    ADD CONSTRAINT dsh_platform_zones_service_area_fk FOREIGN KEY (service_area_code) REFERENCES public.dsh_service_area_geofences(service_area_code) ON DELETE RESTRICT;


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidat_candidate_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidat_candidate_master_product_id_fkey FOREIGN KEY (candidate_master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidates_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidates_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.dsh_product_proposals(id);


--
-- Name: dsh_product_proposal_audit dsh_product_proposal_audit_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposal_audit
    ADD CONSTRAINT dsh_product_proposal_audit_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.dsh_product_proposals(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_adopted_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_adopted_master_product_id_fkey FOREIGN KEY (adopted_master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_category_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_category_node_id_fkey FOREIGN KEY (category_node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_target_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_target_master_product_id_fkey FOREIGN KEY (target_master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_promotion_funding_outbox dsh_promotion_funding_outbox_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE RESTRICT;


--
-- Name: dsh_promotion_funding_outbox dsh_promotion_funding_outbox_coupon_redemption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_coupon_redemption_id_fkey FOREIGN KEY (coupon_redemption_id) REFERENCES public.dsh_coupon_redemptions(id) ON DELETE RESTRICT;


--
-- Name: dsh_promotion_funding_outbox dsh_promotion_funding_outbox_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT;


--
-- Name: dsh_provider_rating_events dsh_provider_rating_events_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_events
    ADD CONSTRAINT dsh_provider_rating_events_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.dsh_provider_ratings(id) ON DELETE CASCADE;


--
-- Name: dsh_provider_rating_mutation_receipts dsh_provider_rating_mutation_receipts_captain_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_mutation_receipts
    ADD CONSTRAINT dsh_provider_rating_mutation_receipts_captain_rating_id_fkey FOREIGN KEY (captain_rating_id) REFERENCES public.dsh_provider_ratings(id) ON DELETE CASCADE;


--
-- Name: dsh_provider_rating_mutation_receipts dsh_provider_rating_mutation_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_mutation_receipts
    ADD CONSTRAINT dsh_provider_rating_mutation_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_provider_rating_mutation_receipts dsh_provider_rating_mutation_receipts_order_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_provider_rating_mutation_receipts
    ADD CONSTRAINT dsh_provider_rating_mutation_receipts_order_rating_id_fkey FOREIGN KEY (order_rating_id) REFERENCES public.dsh_provider_ratings(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_checklist_policy_events dsh_readiness_checklist_policy_events_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_policy_events
    ADD CONSTRAINT dsh_readiness_checklist_policy_events_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.dsh_readiness_checklist_templates(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_checklist_template_items dsh_readiness_checklist_template_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checklist_template_items
    ADD CONSTRAINT dsh_readiness_checklist_template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.dsh_readiness_checklist_templates(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_checks dsh_readiness_checks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_checks dsh_readiness_checks_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE SET NULL;


--
-- Name: dsh_reels dsh_reels_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_reels
    ADD CONSTRAINT dsh_reels_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.dsh_catalog_assets(id);


--
-- Name: dsh_reels dsh_reels_poster_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_reels
    ADD CONSTRAINT dsh_reels_poster_asset_id_fkey FOREIGN KEY (poster_asset_id) REFERENCES public.dsh_catalog_assets(id);


--
-- Name: dsh_return_to_store_command_receipts dsh_return_to_store_command_receipts_exception_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_return_to_store_command_receipts
    ADD CONSTRAINT dsh_return_to_store_command_receipts_exception_id_fkey FOREIGN KEY (exception_id) REFERENCES public.dsh_delivery_exceptions(id) ON DELETE CASCADE;


--
-- Name: dsh_service_area_events dsh_service_area_events_service_area_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_service_area_events
    ADD CONSTRAINT dsh_service_area_events_service_area_code_fkey FOREIGN KEY (service_area_code) REFERENCES public.dsh_service_area_geofences(service_area_code);


--
-- Name: dsh_special_request_information_exchanges dsh_special_request_information_exchang_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_information_exchanges
    ADD CONSTRAINT dsh_special_request_information_exchang_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_special_request_information_response_receipts dsh_special_request_information_respons_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_information_response_receipts
    ADD CONSTRAINT dsh_special_request_information_respons_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE CASCADE;


--
-- Name: dsh_special_request_information_response_receipts dsh_special_request_information_response_recei_exchange_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_information_response_receipts
    ADD CONSTRAINT dsh_special_request_information_response_recei_exchange_id_fkey FOREIGN KEY (exchange_id) REFERENCES public.dsh_special_request_information_exchanges(id) ON DELETE CASCADE;


--
-- Name: dsh_special_request_saga_outbox dsh_special_request_saga_outbox_saga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_saga_outbox
    ADD CONSTRAINT dsh_special_request_saga_outbox_saga_id_fkey FOREIGN KEY (saga_id) REFERENCES public.dsh_special_request_sagas(id) ON DELETE CASCADE;


--
-- Name: dsh_special_request_sagas dsh_special_request_sagas_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_sagas
    ADD CONSTRAINT dsh_special_request_sagas_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id);


--
-- Name: dsh_special_request_wlt_event_receipts dsh_special_request_wlt_event_receipts_special_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_special_request_wlt_event_receipts
    ADD CONSTRAINT dsh_special_request_wlt_event_receipts_special_request_id_fkey FOREIGN KEY (special_request_id) REFERENCES public.dsh_special_requests(id) ON DELETE RESTRICT;


--
-- Name: dsh_store_action_audit dsh_store_action_audit_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_action_audit
    ADD CONSTRAINT dsh_store_action_audit_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_actor_scopes dsh_store_actor_scopes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_actor_scopes
    ADD CONSTRAINT dsh_store_actor_scopes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_assortment_inventory dsh_store_assortment_inventory_store_assortment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortment_inventory
    ADD CONSTRAINT dsh_store_assortment_inventory_store_assortment_id_fkey FOREIGN KEY (store_assortment_id) REFERENCES public.dsh_store_assortments(id) ON DELETE CASCADE;


--
-- Name: dsh_store_assortment_prices dsh_store_assortment_prices_store_assortment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortment_prices
    ADD CONSTRAINT dsh_store_assortment_prices_store_assortment_id_fkey FOREIGN KEY (store_assortment_id) REFERENCES public.dsh_store_assortments(id) ON DELETE CASCADE;


--
-- Name: dsh_store_assortments dsh_store_assortments_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_master_product_id_fkey FOREIGN KEY (master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_store_assortments dsh_store_assortments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_captain_handoff_command_receipts dsh_store_captain_handoff_command_receipts_handoff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoff_command_receipts
    ADD CONSTRAINT dsh_store_captain_handoff_command_receipts_handoff_id_fkey FOREIGN KEY (handoff_id) REFERENCES public.dsh_store_captain_handoffs(id) ON DELETE CASCADE;


--
-- Name: dsh_store_captain_handoff_command_receipts dsh_store_captain_handoff_command_receipts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoff_command_receipts
    ADD CONSTRAINT dsh_store_captain_handoff_command_receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_store_captain_handoffs dsh_store_captain_handoffs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoffs
    ADD CONSTRAINT dsh_store_captain_handoffs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_store_captain_handoffs dsh_store_captain_handoffs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_captain_handoffs
    ADD CONSTRAINT dsh_store_captain_handoffs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_store_catalog_domains dsh_store_catalog_domains_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_catalog_domains
    ADD CONSTRAINT dsh_store_catalog_domains_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_store_catalog_domains dsh_store_catalog_domains_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_catalog_domains
    ADD CONSTRAINT dsh_store_catalog_domains_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_courier_settings dsh_store_courier_settings_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_courier_settings
    ADD CONSTRAINT dsh_store_courier_settings_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_coverage_zones dsh_store_coverage_zones_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_coverage_zones
    ADD CONSTRAINT dsh_store_coverage_zones_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_delivery_pricing_audit dsh_store_delivery_pricing_audit_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_delivery_pricing_audit
    ADD CONSTRAINT dsh_store_delivery_pricing_audit_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE RESTRICT;


--
-- Name: dsh_store_delivery_pricing dsh_store_delivery_pricing_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_delivery_pricing
    ADD CONSTRAINT dsh_store_delivery_pricing_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE SET NULL;


--
-- Name: dsh_store_order_preparation_policies dsh_store_order_preparation_policies_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_order_preparation_policies
    ADD CONSTRAINT dsh_store_order_preparation_policies_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_order_preparation_policy_events dsh_store_order_preparation_policy_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_order_preparation_policy_events
    ADD CONSTRAINT dsh_store_order_preparation_policy_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_pickup_readiness_reports dsh_store_pickup_readiness_reports_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_pickup_readiness_reports
    ADD CONSTRAINT dsh_store_pickup_readiness_reports_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_publication_decisions dsh_store_publication_decisions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_store_publication_decisions
    ADD CONSTRAINT dsh_store_publication_decisions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_stores dsh_stores_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.dsh_partner_brands(id) ON DELETE SET NULL;


--
-- Name: dsh_stores dsh_stores_catalog_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_catalog_domain_id_fkey FOREIGN KEY (catalog_domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_stores dsh_stores_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE SET NULL;


--
-- Name: dsh_subscription_lifecycle_events dsh_subscription_lifecycle_events_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_lifecycle_events
    ADD CONSTRAINT dsh_subscription_lifecycle_events_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.dsh_subscription_purchases(id);


--
-- Name: dsh_subscription_purchases dsh_subscription_purchases_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.dsh_subscription_plans(id);


--
-- Name: dsh_subscription_purchases dsh_subscription_purchases_renewal_of_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_renewal_of_purchase_id_fkey FOREIGN KEY (renewal_of_purchase_id) REFERENCES public.dsh_subscription_purchases(id);


--
-- Name: dsh_support_message_attachments dsh_support_message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_attachments
    ADD CONSTRAINT dsh_support_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.dsh_support_messages(id) ON DELETE CASCADE;


--
-- Name: dsh_support_message_attachments dsh_support_message_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_attachments
    ADD CONSTRAINT dsh_support_message_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE CASCADE;


--
-- Name: dsh_support_message_read_receipts dsh_support_message_read_receipts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_read_receipts
    ADD CONSTRAINT dsh_support_message_read_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.dsh_support_messages(id) ON DELETE CASCADE;


--
-- Name: dsh_support_message_read_receipts dsh_support_message_read_receipts_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_message_read_receipts
    ADD CONSTRAINT dsh_support_message_read_receipts_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE CASCADE;


--
-- Name: dsh_support_messages dsh_support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_messages
    ADD CONSTRAINT dsh_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE CASCADE;


--
-- Name: dsh_support_ticket_events dsh_support_ticket_events_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_ticket_events
    ADD CONSTRAINT dsh_support_ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE CASCADE;


--
-- Name: dsh_support_tickets dsh_support_tickets_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_support_tickets
    ADD CONSTRAINT dsh_support_tickets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_visit_checklist_requirements dsh_visit_checklist_requirements_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_visit_checklist_requirements
    ADD CONSTRAINT dsh_visit_checklist_requirements_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.dsh_readiness_checklist_templates(id);


--
-- Name: dsh_visit_checklist_requirements dsh_visit_checklist_requirements_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_visit_checklist_requirements
    ADD CONSTRAINT dsh_visit_checklist_requirements_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE CASCADE;


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_checkout_intents fk_dsh_checkout_intents_delivery_address; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT fk_dsh_checkout_intents_delivery_address FOREIGN KEY (delivery_address_id) REFERENCES public.dsh_client_addresses(id) ON DELETE RESTRICT;


--
-- Name: dsh_coupon_redemptions fk_dsh_coupon_redemption_checkout_intent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT fk_dsh_coupon_redemption_checkout_intent FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: dsh_coupon_redemptions fk_dsh_coupon_redemption_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dsh_coupon_redemptions
    ADD CONSTRAINT fk_dsh_coupon_redemption_order FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

