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
-- Name: bthwani_migration_input; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS bthwani_migration_input;


--
-- Name: workforce_create_employee_governance_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_create_employee_governance_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO workforce_employee_governance (
    operator_context_id,
    actor_id,
    position_title,
    updated_by_actor_id
  )
  VALUES (
    NEW.operator_context_id,
    NEW.actor_id,
    COALESCE(NEW.role, ''),
    'system:create'
  )
  ON CONFLICT (actor_id) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_create_provider_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_create_provider_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.workforce_kind IN ('field', 'captain') THEN
    INSERT INTO workforce_provider_operational_core (operator_context_id, actor_id)
    VALUES (NEW.operator_context_id, NEW.actor_id)
    ON CONFLICT (actor_id) DO NOTHING;
  END IF;

  IF NEW.workforce_kind = 'captain' THEN
    INSERT INTO workforce_captain_activation_core (operator_context_id, actor_id)
    VALUES (NEW.operator_context_id, NEW.actor_id)
    ON CONFLICT (actor_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_enforce_captain_license_evidence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_enforce_captain_license_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.license_status = 'valid' THEN
    IF NEW.document_media_refs IS NULL
       OR jsonb_typeof(NEW.document_media_refs) <> 'array'
       OR jsonb_array_length(NEW.document_media_refs) = 0 THEN
      RAISE EXCEPTION 'valid captain licence requires at least one supporting document'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.license_expires_at IS NULL OR NEW.license_expires_at < CURRENT_DATE THEN
      RAISE EXCEPTION 'valid captain licence requires a non-expired expiry date'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_enforce_operational_affiliation_actor_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_enforce_operational_affiliation_actor_context() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workforce_people AS person
    WHERE person.actor_id = NEW.actor_id
      AND person.operator_context_id = NEW.operator_context_id
      AND person.workforce_kind = NEW.role
  ) THEN
    RAISE EXCEPTION
      'operational affiliation actor/context/kind mismatch: actor=%, context=%, role=%',
      NEW.actor_id, NEW.operator_context_id, NEW.role
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_enforce_provider_exclusivity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_enforce_provider_exclusivity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'workforce_field_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_employee_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a captain or employee profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_captain_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_employee_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field or employee profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_employee_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) OR
       EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field or captain profile; a workforce member can only have one profile type', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: workforce_enqueue_dsh_availability_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_enqueue_dsh_availability_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  provider_kind text;
  person_operator_context text;
BEGIN
  SELECT workforce_kind, operator_context_id
  INTO provider_kind, person_operator_context
  FROM workforce_people
  WHERE actor_id = NEW.actor_id;

  IF provider_kind NOT IN ('captain', 'field') THEN
    RETURN NEW;
  END IF;
  IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL
     OR person_operator_context IS DISTINCT FROM NEW.operator_context_id THEN
    RAISE EXCEPTION 'availability notice actor/OperatorContext ownership cannot be proven';
  END IF;

  INSERT INTO workforce_dsh_availability_outbox(
    notice_id, operator_context_id, actor_type, actor_id, notice_type,
    starts_at, ends_at, status, reason, source_updated_at, source_version,
    idempotency_key, lifecycle_state, attempt_count, readback_attempt_count,
    next_retry_at, last_error, failure_disposition, terminal_disposition,
    reconciliation_eligible, lease_token, lease_expires_at,
    remote_ack_reference, remote_acknowledged_at, completed_at, updated_at
  ) VALUES(
    NEW.id, NEW.operator_context_id, provider_kind, NEW.actor_id, NEW.notice_type,
    NEW.starts_at, NEW.ends_at,
    CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'active' END,
    concat_ws(':', NEW.reason_code, NEW.note), NEW.updated_at, NEW.source_version,
    format('workforce-availability-v1:%s:%s:%s', NEW.operator_context_id, NEW.id, NEW.source_version),
    'pending', 0, 0, now(), '', 'retry_scheduled', 'none', false,
    NULL, NULL, NULL, NULL, NULL, now()
  )
  ON CONFLICT (notice_id) DO UPDATE SET
    operator_context_id = EXCLUDED.operator_context_id,
    actor_type = EXCLUDED.actor_type,
    actor_id = EXCLUDED.actor_id,
    notice_type = EXCLUDED.notice_type,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    reason = EXCLUDED.reason,
    source_updated_at = EXCLUDED.source_updated_at,
    source_version = EXCLUDED.source_version,
    idempotency_key = EXCLUDED.idempotency_key,
    lifecycle_state = 'pending',
    attempt_count = 0,
    readback_attempt_count = 0,
    next_retry_at = now(),
    last_error = '',
    failure_disposition = 'retry_scheduled',
    terminal_disposition = 'none',
    reconciliation_eligible = false,
    lease_token = NULL,
    lease_expires_at = NULL,
    remote_ack_reference = NULL,
    remote_acknowledged_at = NULL,
    completed_at = NULL,
    updated_at = now()
  WHERE workforce_dsh_availability_outbox.source_version < EXCLUDED.source_version;
  RETURN NEW;
END;
$$;


--
-- Name: workforce_guard_captain_activation_core_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_guard_captain_activation_core_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_captain_activation_core
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'captain activation core must be created with its workforce person';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_guard_employee_governance_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_guard_employee_governance_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_employee_governance
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'employee governance must be created with its workforce employee profile';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_guard_financial_incident_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_guard_financial_incident_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND EXISTS (
       SELECT 1 FROM workforce_provider_penalty_commands active
       WHERE active.operator_context_id=NEW.operator_context_id
         AND active.incident_id=NEW.id
         AND active.lifecycle_state IN (
           'READY','IN_FLIGHT','REMOTE_OUTCOME_UNKNOWN','REMOTE_CONFIRMED',
           'LOCAL_PROJECTION_PENDING','RECONCILING','RETRY_SCHEDULED'
         )
     )
     AND NOT EXISTS (
       SELECT 1 FROM workforce_provider_penalty_commands projecting
       WHERE projecting.operator_context_id=NEW.operator_context_id
         AND projecting.incident_id=NEW.id
         AND projecting.requested_to_status=NEW.status
         AND projecting.lifecycle_state='LOCAL_PROJECTION_PENDING'
     ) THEN
    RAISE EXCEPTION 'incident transition is fenced by an active financial command';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('financial_action_posted','reversed')
     AND NOT EXISTS (
       SELECT 1
       FROM workforce_provider_penalty_commands command
       WHERE command.operator_context_id=NEW.operator_context_id
         AND command.incident_id=NEW.id
         AND command.requested_to_status=NEW.status
         AND command.lifecycle_state='LOCAL_PROJECTION_PENDING'
         AND (
           (NULLIF(BTRIM(command.remote_penalty_id),'') IS NOT NULL
            AND NULLIF(BTRIM(command.remote_ledger_transaction_id),'') IS NOT NULL)
           OR (command.operation='reverse' AND command.reconciliation_state='ABSENT')
         )
     ) THEN
    RAISE EXCEPTION 'financial incident projection requires a reconciled durable command';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: workforce_guard_provider_operational_core_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_guard_provider_operational_core_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_provider_operational_core
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'provider operational core must be created with its workforce person';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_stamp_availability_notice_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_stamp_availability_notice_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.source_version := 1;
    RETURN NEW;
  END IF;

  IF NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
    RAISE EXCEPTION 'availability notice OperatorContext is immutable after creation';
  END IF;

  IF NEW.notice_type IS DISTINCT FROM OLD.notice_type
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.service_zone_id IS DISTINCT FROM OLD.service_zone_id
     OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.source_version := OLD.source_version + 1;
    NEW.updated_at := now();
  ELSE
    NEW.source_version := OLD.source_version;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: workforce_validate_captain_activation_evidence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_validate_captain_activation_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.classification <> NEW.classification AND NOT EXISTS (
    SELECT 1
    FROM workforce_captain_classification_history history
    WHERE history.operator_context_id = NEW.operator_context_id
      AND history.actor_id = NEW.actor_id
      AND history.from_classification = OLD.classification
      AND history.to_classification = NEW.classification
      AND history.created_at >= transaction_timestamp()
  ) THEN
    RAISE EXCEPTION 'captain classification change requires a current evidence-backed decision';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: workforce_validate_captain_classification_decision(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_validate_captain_classification_decision() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.to_classification = 'basic' AND (
    NEW.from_classification <> 'joker'
    OR COALESCE((NEW.evidence->>'completedDeliveries')::integer, 0) <= 0
    OR COALESCE((NEW.evidence->>'completionRateBasisPoints')::integer, 0) <= 0
    OR COALESCE((NEW.evidence->>'severeIncidentFree')::boolean, false) = false
    OR jsonb_array_length(COALESCE(NEW.evidence->'evidenceMediaRefs', '[]'::jsonb)) = 0
  ) THEN
    RAISE EXCEPTION 'captain promotion to basic requires completed-delivery, performance, incident, and evidence facts';
  END IF;

  IF NEW.to_classification = 'basic' AND EXISTS (
    SELECT 1
    FROM workforce_provider_incidents incident
    WHERE incident.operator_context_id = NEW.operator_context_id
      AND incident.actor_id = NEW.actor_id
      AND incident.severity IN ('major','critical')
      AND incident.status NOT IN ('rejected','reversed','closed')
  ) THEN
    RAISE EXCEPTION 'captain has an unresolved major or critical incident';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: workforce_validate_provider_activation_evidence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_validate_provider_activation_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.onboarding_stage NOT IN ('activation_ready','active') THEN
    RETURN NEW;
  END IF;

  IF NEW.guarantor_phone_verified_at IS NULL THEN
    RAISE EXCEPTION 'provider activation requires a verified guarantor phone';
  END IF;

  CASE NEW.referral_source_type
    WHEN 'employee', 'captain', 'field' THEN
      IF btrim(COALESCE(NEW.referral_source_actor_id, '')) = '' THEN
        RAISE EXCEPTION 'selected referral source requires a workforce actor reference';
      END IF;
    WHEN 'partner' THEN
      IF btrim(COALESCE(NEW.referral_partner_id, '')) = '' THEN
        RAISE EXCEPTION 'partner referral requires a partner reference';
      END IF;
    WHEN 'advertisement', 'social_media' THEN
      IF btrim(COALESCE(NEW.referral_channel, '')) = '' THEN
        RAISE EXCEPTION 'campaign referral requires a channel or campaign reference';
      END IF;
    WHEN 'other' THEN
      IF btrim(NEW.referral_note) = '' THEN
        RAISE EXCEPTION 'other referral source requires a note';
      END IF;
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION workforce_validate_provider_activation_evidence(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.workforce_validate_provider_activation_evidence() IS 'Preserves short provider creation while preventing activation without structured referral evidence and a verified guarantor phone.';


--
-- Name: workforce_validate_provider_incident_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workforce_validate_provider_incident_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  transition_allowed boolean := true;
BEGIN
  IF OLD.status <> NEW.status THEN
    transition_allowed := CASE OLD.status
      WHEN 'reported' THEN NEW.status IN ('under_review','provider_notified','rejected')
      WHEN 'under_review' THEN NEW.status IN ('provider_notified','appeal_window','approved','rejected')
      WHEN 'provider_notified' THEN NEW.status IN ('appeal_window','approved','rejected','under_review')
      WHEN 'appeal_window' THEN NEW.status IN ('under_review','approved','rejected')
      WHEN 'approved' THEN NEW.status IN ('under_review','financial_action_posted','closed','reversed')
      WHEN 'financial_action_posted' THEN NEW.status IN ('closed','reversed')
      WHEN 'rejected' THEN NEW.status = 'closed'
      WHEN 'reversed' THEN NEW.status = 'closed'
      ELSE false
    END;
    IF NOT transition_allowed AND NEW.status='approved' AND EXISTS (
      SELECT 1 FROM workforce_provider_penalty_commands command
      WHERE command.operator_context_id=NEW.operator_context_id
        AND command.incident_id=NEW.id
        AND command.operation='post'
        AND command.lifecycle_state='HISTORIC_UNPROVEN'
        AND command.reconciliation_state='ABSENT'
    ) THEN
      transition_allowed := true;
    END IF;
    IF NOT transition_allowed THEN
      RAISE EXCEPTION 'invalid provider incident transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  IF NEW.status = 'approved' AND btrim(NEW.policy_id) <> '' AND jsonb_array_length(NEW.evidence_media_refs) = 0 THEN
    RAISE EXCEPTION 'approved financial penalty requires evidence';
  END IF;
  IF NEW.status = 'financial_action_posted' AND btrim(NEW.wlt_ledger_reference) = '' THEN
    RAISE EXCEPTION 'posted financial action requires a WLT financial reference';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--


--
-- Name: workforce_action_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_action_audit (
    id bigint NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    target_actor_id text,
    action text NOT NULL,
    from_state jsonb,
    to_state jsonb,
    reason text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    operation text DEFAULT 'unknown'::text NOT NULL,
    idempotency_key text,
    financial_command_id uuid,
    lifecycle_command_id uuid
);


--
-- Name: TABLE workforce_action_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_action_audit IS 'Append-only audit trail for all privileged Workforce mutations. Each record is idempotent per (correlation_id, operation, actor_id, operator_context_id). State commit and audit insert are transactionally atomic.';


--
-- Name: COLUMN workforce_action_audit.correlation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_action_audit.correlation_id IS 'Request correlation ID linking all audit records from a single client command.';


--
-- Name: COLUMN workforce_action_audit.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_action_audit.operator_context_id IS 'Authoritative operator context that authorized this mutation. Never NULL.';


--
-- Name: COLUMN workforce_action_audit.operation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_action_audit.operation IS 'Canonical operation name (e.g., create_field_agent, suspend, promote_captain_to_basic). Used for idempotency.';


--
-- Name: COLUMN workforce_action_audit.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_action_audit.idempotency_key IS 'Client-supplied idempotency key from the command request. Combined with correlation_id for audit deduplication.';


--
-- Name: workforce_action_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workforce_action_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workforce_action_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workforce_action_audit_id_seq OWNED BY public.workforce_action_audit.id;


--
-- Name: workforce_captain_activation_core; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_captain_activation_core (
    actor_id text NOT NULL,
    classification text DEFAULT 'joker'::text NOT NULL,
    delivery_bag_custody_status text DEFAULT 'not_issued'::text NOT NULL,
    delivery_bag_custody_reference text DEFAULT ''::text NOT NULL,
    mandatory_purchases_status text DEFAULT 'not_required'::text NOT NULL,
    mandatory_purchases_reference text DEFAULT ''::text NOT NULL,
    training_status text DEFAULT 'pending'::text NOT NULL,
    operations_accreditation_status text DEFAULT 'pending'::text NOT NULL,
    classification_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by_actor_id text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_captain_activation__delivery_bag_custody_status_check CHECK ((delivery_bag_custody_status = ANY (ARRAY['not_issued'::text, 'issued'::text, 'returned'::text, 'lost'::text, 'damaged'::text]))),
    CONSTRAINT workforce_captain_activation_c_mandatory_purchases_status_check CHECK ((mandatory_purchases_status = ANY (ARRAY['not_required'::text, 'pending_payment'::text, 'paid'::text, 'paid_and_delivered'::text, 'cancelled'::text]))),
    CONSTRAINT workforce_captain_activation_core_classification_check CHECK ((classification = ANY (ARRAY['joker'::text, 'basic'::text]))),
    CONSTRAINT workforce_captain_activation_core_training_status_check CHECK ((training_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'passed'::text, 'failed'::text]))),
    CONSTRAINT workforce_captain_activation_core_version_check CHECK ((version > 0)),
    CONSTRAINT workforce_captain_activation_operations_accreditation_sta_check CHECK ((operations_accreditation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'expired'::text])))
);


--
-- Name: workforce_captain_classification_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_captain_classification_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    from_classification text NOT NULL,
    to_classification text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason text DEFAULT 'legacy-migrated'::text NOT NULL,
    decided_by_actor_id text DEFAULT 'system'::text NOT NULL,
    idempotency_key text NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_captain_classification_hist_from_classification_check CHECK ((from_classification = ANY (ARRAY['joker'::text, 'basic'::text]))),
    CONSTRAINT workforce_captain_classification_histor_to_classification_check CHECK ((to_classification = ANY (ARRAY['joker'::text, 'basic'::text]))),
    CONSTRAINT workforce_captain_classification_transition_chk CHECK ((from_classification <> to_classification))
);


--
-- Name: TABLE workforce_captain_classification_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_captain_classification_history IS 'Immutable evidence and decision history for joker/basic classification changes.';


--
-- Name: workforce_captain_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workforce_captain_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workforce_captain_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_captain_profiles (
    actor_id text NOT NULL,
    vehicle_type text,
    vehicle_identifier text,
    license_status text,
    license_expires_at date,
    operating_service_area_code text,
    operating_scope_code text,
    document_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_zone_id text,
    supervisor_actor_id text,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_captain_profiles_license_status_check CHECK ((license_status = ANY (ARRAY['missing'::text, 'pending_review'::text, 'valid'::text, 'expired'::text, 'rejected'::text])))
);


--
-- Name: workforce_dsh_availability_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_dsh_availability_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notice_id uuid NOT NULL,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    notice_type text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    source_updated_at timestamp with time zone NOT NULL,
    lifecycle_state text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    source_version bigint NOT NULL,
    idempotency_key text NOT NULL,
    lease_token uuid,
    lease_expires_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    readback_attempt_count integer DEFAULT 0 NOT NULL,
    last_readback_at timestamp with time zone,
    failure_disposition text DEFAULT 'none'::text NOT NULL,
    terminal_disposition text DEFAULT 'none'::text NOT NULL,
    diagnostic_code text DEFAULT 'none'::text NOT NULL,
    reconciliation_eligible boolean DEFAULT false NOT NULL,
    remote_ack_reference text,
    remote_acknowledged_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT workforce_dsh_availability_outbox_actor_type_check CHECK ((actor_type = ANY (ARRAY['captain'::text, 'field'::text]))),
    CONSTRAINT workforce_dsh_availability_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT workforce_dsh_availability_outbox_diagnostic_code_check CHECK ((NULLIF(btrim(diagnostic_code), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_dsh_availability_outbox_failed_disposition_check CHECK (((lifecycle_state <> 'failed'::text) OR (failure_disposition <> 'none'::text))),
    CONSTRAINT workforce_dsh_availability_outbox_failure_disposition_check CHECK ((failure_disposition = ANY (ARRAY['none'::text, 'retry_scheduled'::text, 'reconciliation_required'::text, 'manual_retry_required'::text, 'remote_rejected'::text, 'invalid_operator_context'::text]))),
    CONSTRAINT workforce_dsh_availability_outbox_idempotency_identity_check CHECK ((idempotency_key = format('workforce-availability-v1:%s:%s:%s'::text, operator_context_id, notice_id, source_version))),
    CONSTRAINT workforce_dsh_availability_outbox_idempotency_key_check CHECK ((NULLIF(btrim(idempotency_key), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_dsh_availability_outbox_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['pending'::text, 'processing'::text, 'unknown'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT workforce_dsh_availability_outbox_processing_lease_check CHECK (((lifecycle_state <> 'processing'::text) OR ((lease_token IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT workforce_dsh_availability_outbox_readback_attempt_count_check CHECK ((readback_attempt_count >= 0)),
    CONSTRAINT workforce_dsh_availability_outbox_reconciliation_check CHECK (((NOT reconciliation_eligible) OR (lifecycle_state = ANY (ARRAY['unknown'::text, 'failed'::text])))),
    CONSTRAINT workforce_dsh_availability_outbox_source_version_check CHECK ((source_version > 0)),
    CONSTRAINT workforce_dsh_availability_outbox_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text]))),
    CONSTRAINT workforce_dsh_availability_outbox_terminal_disposition_check CHECK ((((lifecycle_state = ANY (ARRAY['pending'::text, 'processing'::text, 'unknown'::text])) AND (terminal_disposition = 'none'::text)) OR ((lifecycle_state = 'sent'::text) AND (terminal_disposition = ANY (ARRAY['delivered'::text, 'superseded'::text]))) OR ((lifecycle_state = 'failed'::text) AND (terminal_disposition = ANY (ARRAY['manual_retry_required'::text, 'reconciliation_required'::text, 'remote_rejected'::text, 'invalid_operator_context'::text])))))
);


--
-- Name: workforce_employee_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workforce_employee_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workforce_employee_governance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_employee_governance (
    actor_id text NOT NULL,
    position_title text DEFAULT ''::text NOT NULL,
    job_grade text DEFAULT ''::text NOT NULL,
    employment_class text DEFAULT 'staff'::text NOT NULL,
    guarantee_type text DEFAULT 'none'::text NOT NULL,
    guarantee_status text DEFAULT 'not_required'::text NOT NULL,
    guarantee_reference text DEFAULT ''::text NOT NULL,
    responsibility_scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    managed_department_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    updated_by_actor_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_employee_governance_check CHECK (((guarantee_status <> ALL (ARRAY['active'::text, 'forfeited'::text])) OR ((guarantee_type <> 'none'::text) AND (btrim(guarantee_reference) <> ''::text)))),
    CONSTRAINT workforce_employee_governance_employment_class_check CHECK ((employment_class = ANY (ARRAY['staff'::text, 'coordinator'::text, 'department_manager'::text, 'executive'::text, 'project_manager'::text]))),
    CONSTRAINT workforce_employee_governance_guarantee_status_check CHECK ((guarantee_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'active'::text, 'released'::text, 'forfeited'::text]))),
    CONSTRAINT workforce_employee_governance_guarantee_type_check CHECK ((guarantee_type = ANY (ARRAY['none'::text, 'personal'::text, 'financial'::text, 'institutional'::text]))),
    CONSTRAINT workforce_employee_governance_managed_department_codes_check CHECK ((jsonb_typeof(managed_department_codes) = 'array'::text)),
    CONSTRAINT workforce_employee_governance_responsibility_scopes_check CHECK ((jsonb_typeof(responsibility_scopes) = 'array'::text)),
    CONSTRAINT workforce_employee_governance_version_check CHECK ((version > 0))
);


--
-- Name: TABLE workforce_employee_governance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_employee_governance IS 'Reviewed organisational position, guarantee, responsibility and managed departments; effective authority is owned exclusively by Identity.';


--
-- Name: workforce_employee_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_employee_profiles (
    actor_id text NOT NULL,
    department text,
    role text,
    supervisor_actor_id text,
    office_location text,
    document_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL
);


--
-- Name: workforce_field_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workforce_field_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workforce_field_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_field_profiles (
    actor_id text NOT NULL,
    service_area_code text,
    supervisor_actor_id text,
    emergency_contact_name text,
    emergency_contact_phone text,
    preferred_language text,
    policy_consent_at timestamp with time zone,
    document_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_zone_id text,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_field_profiles_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['ar'::text, 'en'::text])))
);


--
-- Name: workforce_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL
);


--
-- Name: workforce_lifecycle_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_lifecycle_commands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    actor_id text NOT NULL,
    operation text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    person_version_after integer NOT NULL,
    reason text NOT NULL,
    requested_by_actor_id text NOT NULL,
    requested_by_role text NOT NULL,
    correlation_id text NOT NULL,
    command_idempotency_key text NOT NULL,
    lifecycle_state text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_owner text,
    lease_expires_at timestamp with time zone,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error_code text DEFAULT ''::text NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    remote_confirmed_at timestamp with time zone,
    terminal_disposition text DEFAULT ''::text NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workforce_lifecycle_commands_actor_id_check CHECK ((NULLIF(btrim(actor_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT workforce_lifecycle_commands_check CHECK ((((operation = 'suspend'::text) AND (to_status = 'suspended'::text) AND (from_status <> 'suspended'::text)) OR ((operation = 'reactivate'::text) AND (to_status = 'active'::text) AND (from_status = 'suspended'::text)))),
    CONSTRAINT workforce_lifecycle_commands_check1 CHECK ((((lease_token IS NULL) AND (lease_owner IS NULL) AND (lease_expires_at IS NULL)) OR ((lease_token IS NOT NULL) AND (NULLIF(btrim(lease_owner), ''::text) IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT workforce_lifecycle_commands_check2 CHECK (((lifecycle_state = ANY (ARRAY['COMPLETED'::text, 'COMPENSATED'::text, 'SUPERSEDED'::text, 'FAILED'::text])) = (NULLIF(btrim(terminal_disposition), ''::text) IS NOT NULL))),
    CONSTRAINT workforce_lifecycle_commands_command_idempotency_key_check CHECK ((NULLIF(btrim(command_idempotency_key), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_correlation_id_check CHECK ((NULLIF(btrim(correlation_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_from_status_check CHECK ((from_status = ANY (ARRAY['active'::text, 'suspended'::text, 'terminated'::text]))),
    CONSTRAINT workforce_lifecycle_commands_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['IN_FLIGHT'::text, 'RETRY_SCHEDULED'::text, 'COMPLETED'::text, 'COMPENSATED'::text, 'SUPERSEDED'::text, 'FAILED'::text]))),
    CONSTRAINT workforce_lifecycle_commands_operation_check CHECK ((operation = ANY (ARRAY['suspend'::text, 'reactivate'::text]))),
    CONSTRAINT workforce_lifecycle_commands_operator_context_id_check CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_person_version_after_check CHECK ((person_version_after > 0)),
    CONSTRAINT workforce_lifecycle_commands_reason_check CHECK ((char_length(btrim(reason)) >= 3)),
    CONSTRAINT workforce_lifecycle_commands_requested_by_actor_id_check CHECK ((NULLIF(btrim(requested_by_actor_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_requested_by_role_check CHECK ((NULLIF(btrim(requested_by_role), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_lifecycle_commands_to_status_check CHECK ((to_status = ANY (ARRAY['active'::text, 'suspended'::text])))
);


--
-- Name: TABLE workforce_lifecycle_commands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_lifecycle_commands IS 'Durable Workforce intent/recovery authority for cross-sovereign suspend/reactivate identity commands; one terminal disposition per command, driven to convergence by the reconciler.';


--
-- Name: workforce_operational_assignment_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_operational_assignment_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    operator_context_id text NOT NULL,
    role text NOT NULL,
    changed_by text NOT NULL,
    store_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    service_areas jsonb DEFAULT '[]'::jsonb NOT NULL,
    partner_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    shift_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    correlation_id text NOT NULL,
    request_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workforce_operational_assignment_audit_integrity_chk CHECK (((btrim(actor_id) <> ''::text) AND (btrim(operator_context_id) <> ''::text) AND (btrim(role) <> ''::text) AND (btrim(changed_by) <> ''::text) AND (btrim(correlation_id) <> ''::text) AND (btrim(request_hash) <> ''::text) AND (jsonb_typeof(store_ids) = 'array'::text) AND (jsonb_typeof(service_areas) = 'array'::text) AND (jsonb_typeof(partner_ids) = 'array'::text) AND (jsonb_typeof(shift_codes) = 'array'::text)))
);


--
-- Name: workforce_operational_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_operational_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    operator_context_id text NOT NULL,
    role text NOT NULL,
    scope_type text NOT NULL,
    scope_target_id text NOT NULL,
    starts_on timestamp with time zone DEFAULT now() NOT NULL,
    ends_on timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    assigned_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workforce_operational_assignment_nonblank_chk CHECK (((btrim(actor_id) <> ''::text) AND (btrim(operator_context_id) <> ''::text) AND (btrim(role) <> ''::text) AND (btrim(scope_target_id) <> ''::text) AND (btrim(assigned_by) <> ''::text))),
    CONSTRAINT workforce_operational_assignment_period_chk CHECK (((ends_on IS NULL) OR (ends_on > starts_on))),
    CONSTRAINT workforce_operational_assignment_scope_type_chk CHECK ((scope_type = ANY (ARRAY['store'::text, 'area'::text, 'partner'::text, 'shift'::text])))
);


--
-- Name: workforce_operator_context_migration_proof; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_operator_context_migration_proof (
    migration_id text NOT NULL,
    source_commit_sha text NOT NULL,
    source_row_count integer NOT NULL,
    source_checksum_md5 text NOT NULL,
    workforce_people_row_count bigint NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workforce_people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_people (
    actor_id text NOT NULL,
    full_name_ar text NOT NULL,
    full_name_en text,
    workforce_code text NOT NULL,
    engagement_type text DEFAULT 'independent_contractor'::text NOT NULL,
    engagement_start_date date,
    engagement_status text DEFAULT 'pending_activation'::text NOT NULL,
    photo_media_ref text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workforce_kind text NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_people_engagement_status_check CHECK ((engagement_status = ANY (ARRAY['pending_activation'::text, 'active'::text, 'suspended'::text, 'terminated'::text]))),
    CONSTRAINT workforce_people_engagement_type_check CHECK ((engagement_type = ANY (ARRAY['independent_contractor'::text, 'employee'::text]))),
    CONSTRAINT workforce_people_version_check CHECK ((version >= 1)),
    CONSTRAINT workforce_people_workforce_kind_check CHECK ((workforce_kind = ANY (ARRAY['field'::text, 'captain'::text, 'employee'::text])))
);


--
-- Name: COLUMN workforce_people.workforce_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_people.workforce_code IS 'Workforce-owned server-generated identifier; per-kind sequences are reconciled to persisted canonical codes by workforce-015.';


--
-- Name: workforce_provider_availability_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provider_availability_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    notice_type text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    service_zone_id text,
    reason_code text DEFAULT 'personal'::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_by_actor_id text,
    cancelled_at timestamp with time zone,
    cancellation_reason text DEFAULT ''::text NOT NULL,
    operator_context_id text NOT NULL,
    source_version bigint NOT NULL,
    CONSTRAINT workforce_provider_availability_notices_check CHECK ((ends_at > starts_at)),
    CONSTRAINT workforce_provider_availability_notices_notice_type_check CHECK ((notice_type = ANY (ARRAY['planned_unavailability'::text, 'immediate_unavailability'::text, 'short_break'::text, 'emergency'::text, 'temporary_restriction'::text]))),
    CONSTRAINT workforce_provider_availability_notices_source_version_check CHECK ((source_version > 0)),
    CONSTRAINT workforce_provider_availability_notices_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: workforce_provider_incident_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provider_incident_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    wlt_ledger_reference text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    decided_by_actor_id text DEFAULT 'system'::text NOT NULL,
    incident_version integer DEFAULT 1 NOT NULL,
    operator_context_id text NOT NULL,
    financial_command_id uuid,
    CONSTRAINT workforce_provider_incident_transition_changed_chk CHECK ((from_status <> to_status))
);


--
-- Name: TABLE workforce_provider_incident_transitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_provider_incident_transitions IS 'Append-only incident decision trail; financial actions remain valid only when linked to a WLT ledger reference.';


--
-- Name: workforce_provider_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provider_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    incident_code text NOT NULL,
    source_type text DEFAULT 'operational'::text NOT NULL,
    source_id text DEFAULT ''::text NOT NULL,
    description text NOT NULL,
    evidence_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity text DEFAULT 'minor'::text NOT NULL,
    status text DEFAULT 'reported'::text NOT NULL,
    policy_id text DEFAULT ''::text NOT NULL,
    wlt_ledger_reference text DEFAULT ''::text NOT NULL,
    appeal_note text DEFAULT ''::text NOT NULL,
    appealed_at timestamp with time zone,
    resolution_note text DEFAULT ''::text NOT NULL,
    reported_by_actor_id text NOT NULL,
    reviewed_by_actor_id text,
    resolved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_provider_incidents_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text]))),
    CONSTRAINT workforce_provider_incidents_status_check CHECK ((status = ANY (ARRAY['reported'::text, 'under_review'::text, 'provider_notified'::text, 'appeal_window'::text, 'approved'::text, 'rejected'::text, 'financial_action_posted'::text, 'closed'::text, 'reversed'::text]))),
    CONSTRAINT workforce_provider_incidents_version_check CHECK ((version > 0))
);


--
-- Name: workforce_provider_operational_core; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provider_operational_core (
    actor_id text NOT NULL,
    referral_source_type text DEFAULT 'direct'::text NOT NULL,
    referral_source_actor_id text,
    referral_partner_id text,
    referral_channel text,
    referral_note text DEFAULT ''::text NOT NULL,
    guarantor_full_name text DEFAULT ''::text NOT NULL,
    guarantor_relationship text DEFAULT ''::text NOT NULL,
    guarantor_phone_e164 text DEFAULT ''::text NOT NULL,
    guarantor_phone_verified_at timestamp with time zone,
    national_id_number text DEFAULT ''::text NOT NULL,
    identity_front_media_ref text DEFAULT ''::text NOT NULL,
    identity_back_media_ref text DEFAULT ''::text NOT NULL,
    identity_verification_status text DEFAULT 'pending'::text NOT NULL,
    identity_rejection_reason text DEFAULT ''::text NOT NULL,
    contract_media_ref text DEFAULT ''::text NOT NULL,
    contract_review_status text DEFAULT 'pending'::text NOT NULL,
    contract_rejection_reason text DEFAULT ''::text NOT NULL,
    onboarding_stage text DEFAULT 'basic_profile'::text NOT NULL,
    partnerships_approved_at timestamp with time zone,
    reviewed_by_actor_id text,
    updated_by_actor_id text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_provider_operation_identity_verification_status_check CHECK ((identity_verification_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'needs_resubmission'::text]))),
    CONSTRAINT workforce_provider_operational_cor_contract_review_status_check CHECK ((contract_review_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'needs_resubmission'::text]))),
    CONSTRAINT workforce_provider_operational_core_onboarding_stage_check CHECK ((onboarding_stage = ANY (ARRAY['basic_profile'::text, 'documents_pending'::text, 'documents_review'::text, 'training_pending'::text, 'partnerships_review'::text, 'operations_review'::text, 'activation_ready'::text, 'active'::text]))),
    CONSTRAINT workforce_provider_operational_core_referral_source_type_check CHECK ((referral_source_type = ANY (ARRAY['employee'::text, 'captain'::text, 'field'::text, 'partner'::text, 'advertisement'::text, 'social_media'::text, 'public_referral'::text, 'direct'::text, 'other'::text]))),
    CONSTRAINT workforce_provider_operational_core_version_check CHECK ((version > 0))
);


--
-- Name: workforce_provider_penalty_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provider_penalty_commands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operator_context_id text NOT NULL,
    incident_id uuid NOT NULL,
    incident_source_version integer NOT NULL,
    operation text NOT NULL,
    requested_to_status text NOT NULL,
    command_idempotency_key text NOT NULL,
    client_idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    provider_actor_id text NOT NULL,
    provider_actor_type text NOT NULL,
    policy_id text DEFAULT ''::text NOT NULL,
    reason text NOT NULL,
    requested_by_actor_id text NOT NULL,
    requested_by_role text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    parent_command_id uuid,
    lifecycle_state text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    readback_attempt_count integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_owner text,
    lease_expires_at timestamp with time zone,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    last_readback_at timestamp with time zone,
    last_error_code text DEFAULT ''::text NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    remote_penalty_id text DEFAULT ''::text NOT NULL,
    remote_ledger_transaction_id text DEFAULT ''::text NOT NULL,
    remote_status text DEFAULT ''::text NOT NULL,
    reconciliation_state text DEFAULT 'NOT_REQUIRED'::text NOT NULL,
    terminal_disposition text DEFAULT ''::text NOT NULL,
    remote_confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workforce_provider_penalty_comman_command_idempotency_key_check CHECK ((NULLIF(btrim(command_idempotency_key), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_comman_incident_source_version_check CHECK ((incident_source_version > 0)),
    CONSTRAINT workforce_provider_penalty_command_client_idempotency_key_check CHECK ((NULLIF(btrim(client_idempotency_key), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_command_readback_attempt_count_check CHECK ((readback_attempt_count >= 0)),
    CONSTRAINT workforce_provider_penalty_commands_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT workforce_provider_penalty_commands_check CHECK ((((operation = 'post'::text) AND (requested_to_status = 'financial_action_posted'::text)) OR ((operation = 'reverse'::text) AND (requested_to_status = 'reversed'::text)))),
    CONSTRAINT workforce_provider_penalty_commands_check1 CHECK ((((operation = 'post'::text) AND (NULLIF(btrim(policy_id), ''::text) IS NOT NULL)) OR (operation = 'reverse'::text))),
    CONSTRAINT workforce_provider_penalty_commands_check2 CHECK ((((lease_token IS NULL) AND (lease_owner IS NULL) AND (lease_expires_at IS NULL)) OR ((lease_token IS NOT NULL) AND (NULLIF(btrim(lease_owner), ''::text) IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT workforce_provider_penalty_commands_check3 CHECK (((operation = 'post'::text) OR (parent_command_id IS NOT NULL) OR (lifecycle_state = 'HISTORIC_UNPROVEN'::text))),
    CONSTRAINT workforce_provider_penalty_commands_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['READY'::text, 'IN_FLIGHT'::text, 'REMOTE_OUTCOME_UNKNOWN'::text, 'REMOTE_CONFIRMED'::text, 'LOCAL_PROJECTION_PENDING'::text, 'RECONCILING'::text, 'RETRY_SCHEDULED'::text, 'COMPLETED'::text, 'PERMANENTLY_REJECTED'::text, 'HISTORIC_UNPROVEN'::text]))),
    CONSTRAINT workforce_provider_penalty_commands_operation_check CHECK ((operation = ANY (ARRAY['post'::text, 'reverse'::text]))),
    CONSTRAINT workforce_provider_penalty_commands_operator_context_id_check CHECK ((NULLIF(btrim(operator_context_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_commands_provider_actor_id_check CHECK ((NULLIF(btrim(provider_actor_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_commands_provider_actor_type_check CHECK ((provider_actor_type = ANY (ARRAY['captain'::text, 'field'::text]))),
    CONSTRAINT workforce_provider_penalty_commands_reason_check CHECK ((char_length(btrim(reason)) >= 3)),
    CONSTRAINT workforce_provider_penalty_commands_reconciliation_state_check CHECK ((reconciliation_state = ANY (ARRAY['NOT_REQUIRED'::text, 'REQUIRED'::text, 'FOUND'::text, 'ABSENT'::text, 'UNPROVEN'::text]))),
    CONSTRAINT workforce_provider_penalty_commands_request_hash_check CHECK ((NULLIF(btrim(request_hash), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_commands_requested_by_actor_id_check CHECK ((NULLIF(btrim(requested_by_actor_id), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_commands_requested_by_role_check CHECK ((NULLIF(btrim(requested_by_role), ''::text) IS NOT NULL)),
    CONSTRAINT workforce_provider_penalty_commands_requested_to_status_check CHECK ((requested_to_status = ANY (ARRAY['financial_action_posted'::text, 'reversed'::text])))
);


--
-- Name: TABLE workforce_provider_penalty_commands; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_provider_penalty_commands IS 'Durable Workforce intent/recovery authority for WLT provider-penalty POST and REVERSE commands; contains no monetary balance truth.';


--
-- Name: workforce_provisioning_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_provisioning_cases (
    id uuid NOT NULL,
    idempotency_key character varying(128) NOT NULL,
    status character varying(64) NOT NULL,
    workforce_kind character varying(32) NOT NULL,
    actor_id character varying(64),
    workforce_code character varying(32),
    payload jsonb NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    identity_created boolean DEFAULT false NOT NULL,
    operator_context_id text NOT NULL,
    operation text DEFAULT 'provision'::text NOT NULL,
    request_hash text DEFAULT ''::text NOT NULL,
    command_idempotency_key text NOT NULL,
    requested_by_actor_id text DEFAULT ''::text NOT NULL,
    requested_by_role text DEFAULT ''::text NOT NULL,
    correlation_id text DEFAULT ''::text NOT NULL,
    lifecycle_state text DEFAULT 'INTENT_RECORDED'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_owner text,
    lease_expires_at timestamp with time zone,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error_code text DEFAULT ''::text NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    remote_result jsonb DEFAULT '{}'::jsonb NOT NULL,
    terminal_disposition text DEFAULT ''::text NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT workforce_provisioning_cases_attempt_ck CHECK ((attempt_count >= 0)),
    CONSTRAINT workforce_provisioning_cases_lease_ck CHECK ((((lease_token IS NULL) AND (lease_owner IS NULL) AND (lease_expires_at IS NULL)) OR ((lease_token IS NOT NULL) AND (NULLIF(btrim(lease_owner), ''::text) IS NOT NULL) AND (lease_expires_at IS NOT NULL)))),
    CONSTRAINT workforce_provisioning_cases_lifecycle_state_ck CHECK ((lifecycle_state = ANY (ARRAY['INTENT_RECORDED'::text, 'REMOTE_APPLIED'::text, 'LOCAL_COMMITTED'::text, 'RETRY_SCHEDULED'::text, 'FAILED'::text, 'SUPERSEDED'::text]))),
    CONSTRAINT workforce_provisioning_cases_operation_ck CHECK ((operation = ANY (ARRAY['provision'::text, 'create_field_agent'::text, 'create_captain'::text, 'create_employee'::text, 'create_sovereign_leader'::text, 'create_department_employee'::text, 'issue_activation'::text, 'revoke_activation'::text])))
);


--
-- Name: TABLE workforce_provisioning_cases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workforce_provisioning_cases IS 'Canonical durable intent/recovery ledger for Workforce↔Identity provisioning, activation, and revocation; local intent precedes remote mutation and every command converges through persisted recovery state.';


--
-- Name: COLUMN workforce_provisioning_cases.request_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_provisioning_cases.request_hash IS 'Immutable request fingerprint; reuse of one command key with a different payload is rejected.';


--
-- Name: COLUMN workforce_provisioning_cases.remote_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_provisioning_cases.remote_result IS 'Authoritative remote outcome metadata used for restart/reconciliation; secret activation codes are never persisted.';


--
-- Name: workforce_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_shifts (
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    starts_at time without time zone,
    ends_at time without time zone,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workforce_sovereign_leadership_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workforce_sovereign_leadership_assignments (
    actor_id text NOT NULL,
    permission_bundle text NOT NULL,
    department_scope text NOT NULL,
    starts_on date DEFAULT CURRENT_DATE NOT NULL,
    ends_on date,
    assignment_status text DEFAULT 'active'::text NOT NULL,
    created_by_actor_id text NOT NULL,
    updated_by_actor_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT workforce_sovereign_leadership_assignme_assignment_status_check CHECK ((assignment_status = ANY (ARRAY['active'::text, 'suspended'::text, 'expired'::text, 'ended'::text]))),
    CONSTRAINT workforce_sovereign_leadership_assignments_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT workforce_sovereign_leadership_assignments_version_check CHECK ((version > 0)),
    CONSTRAINT workforce_sovereign_leadership_permission_bundle_format_chk CHECK ((permission_bundle ~ '^[a-z0-9][a-z0-9_-]{1,63}$'::text))
);


--
-- Name: COLUMN workforce_sovereign_leadership_assignments.permission_bundle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workforce_sovereign_leadership_assignments.permission_bundle IS 'Identity-owned permission-bundle identifier referenced by Workforce; Workforce must not expand or reinterpret it.';


--
-- Name: workforce_action_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_action_audit ALTER COLUMN id SET DEFAULT nextval('public.workforce_action_audit_id_seq'::regclass);


--


--
-- Name: workforce_action_audit workforce_action_audit_material_mutation_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_action_audit
    ADD CONSTRAINT workforce_action_audit_material_mutation_chk CHECK ((((correlation_id IS NOT NULL) AND (correlation_id <> ''::text)) OR (action = ANY (ARRAY['provider.document_linked'::text, 'field_agent.self_updated'::text])))) NOT VALID;


--
-- Name: workforce_action_audit workforce_action_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_action_audit
    ADD CONSTRAINT workforce_action_audit_pkey PRIMARY KEY (id);


--
-- Name: workforce_captain_activation_core workforce_captain_activation_core_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_activation_core
    ADD CONSTRAINT workforce_captain_activation_core_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_captain_activation_core workforce_captain_bag_reference_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_captain_activation_core
    ADD CONSTRAINT workforce_captain_bag_reference_chk CHECK (((delivery_bag_custody_status <> 'issued'::text) OR (btrim(delivery_bag_custody_reference) <> ''::text))) NOT VALID;


--
-- Name: workforce_captain_classification_history workforce_captain_classification_history_idempotency_key_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_captain_classification_history
    ADD CONSTRAINT workforce_captain_classification_history_idempotency_key_chk CHECK ((btrim(idempotency_key) <> ''::text)) NOT VALID;


--
-- Name: workforce_captain_classification_history workforce_captain_classification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_classification_history
    ADD CONSTRAINT workforce_captain_classification_history_pkey PRIMARY KEY (id);


--
-- Name: workforce_captain_profiles workforce_captain_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_profiles
    ADD CONSTRAINT workforce_captain_profiles_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_captain_activation_core workforce_captain_purchase_reference_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_captain_activation_core
    ADD CONSTRAINT workforce_captain_purchase_reference_chk CHECK (((mandatory_purchases_status <> 'paid_and_delivered'::text) OR (btrim(mandatory_purchases_reference) <> ''::text))) NOT VALID;


--
-- Name: workforce_dsh_availability_outbox workforce_dsh_availability_outbox_notice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_dsh_availability_outbox
    ADD CONSTRAINT workforce_dsh_availability_outbox_notice_id_key UNIQUE (notice_id);


--
-- Name: workforce_dsh_availability_outbox workforce_dsh_availability_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_dsh_availability_outbox
    ADD CONSTRAINT workforce_dsh_availability_outbox_pkey PRIMARY KEY (id);


--
-- Name: workforce_employee_governance workforce_employee_governance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_employee_governance
    ADD CONSTRAINT workforce_employee_governance_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_employee_profiles workforce_employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_employee_profiles
    ADD CONSTRAINT workforce_employee_profiles_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_field_profiles workforce_field_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_idempotency workforce_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_idempotency
    ADD CONSTRAINT workforce_idempotency_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: workforce_lifecycle_commands workforce_lifecycle_commands_operator_context_id_command_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_lifecycle_commands
    ADD CONSTRAINT workforce_lifecycle_commands_operator_context_id_command_id_key UNIQUE (operator_context_id, command_idempotency_key);


--
-- Name: workforce_lifecycle_commands workforce_lifecycle_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_lifecycle_commands
    ADD CONSTRAINT workforce_lifecycle_commands_pkey PRIMARY KEY (id);


--
-- Name: workforce_operational_assignment_audit workforce_operational_assignment_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_operational_assignment_audit
    ADD CONSTRAINT workforce_operational_assignment_audit_pkey PRIMARY KEY (id);


--
-- Name: workforce_operational_assignments workforce_operational_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_operational_assignments
    ADD CONSTRAINT workforce_operational_assignments_pkey PRIMARY KEY (id);


--
-- Name: workforce_operator_context_migration_proof workforce_operator_context_migration_proof_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_operator_context_migration_proof
    ADD CONSTRAINT workforce_operator_context_migration_proof_pkey PRIMARY KEY (migration_id);


--
-- Name: workforce_people workforce_people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_people
    ADD CONSTRAINT workforce_people_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_people workforce_people_workforce_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_people
    ADD CONSTRAINT workforce_people_workforce_code_key UNIQUE (workforce_code);


--
-- Name: workforce_provider_availability_notices workforce_provider_availability_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_availability_notices
    ADD CONSTRAINT workforce_provider_availability_notices_pkey PRIMARY KEY (id);


--
-- Name: workforce_provider_operational_core workforce_provider_core_activation_guarantor_verified_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_provider_operational_core
    ADD CONSTRAINT workforce_provider_core_activation_guarantor_verified_chk CHECK (((onboarding_stage <> ALL (ARRAY['activation_ready'::text, 'active'::text])) OR (guarantor_phone_verified_at IS NOT NULL))) NOT VALID;


--
-- Name: workforce_provider_incident_transitions workforce_provider_incident_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incident_transitions
    ADD CONSTRAINT workforce_provider_incident_transitions_pkey PRIMARY KEY (id);


--
-- Name: workforce_provider_incident_transitions workforce_provider_incident_transitions_version_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.workforce_provider_incident_transitions
    ADD CONSTRAINT workforce_provider_incident_transitions_version_chk CHECK ((incident_version > 0)) NOT VALID;


--
-- Name: workforce_provider_incidents workforce_provider_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incidents
    ADD CONSTRAINT workforce_provider_incidents_pkey PRIMARY KEY (id);


--
-- Name: workforce_provider_operational_core workforce_provider_operational_core_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_operational_core
    ADD CONSTRAINT workforce_provider_operational_core_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_provider_penalty_commands workforce_provider_penalty_co_operator_context_id_command_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_penalty_commands
    ADD CONSTRAINT workforce_provider_penalty_co_operator_context_id_command_i_key UNIQUE (operator_context_id, command_idempotency_key);


--
-- Name: workforce_provider_penalty_commands workforce_provider_penalty_co_operator_context_id_incident__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_penalty_commands
    ADD CONSTRAINT workforce_provider_penalty_co_operator_context_id_incident__key UNIQUE (operator_context_id, incident_id, operation, incident_source_version);


--
-- Name: workforce_provider_penalty_commands workforce_provider_penalty_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_penalty_commands
    ADD CONSTRAINT workforce_provider_penalty_commands_pkey PRIMARY KEY (id);


--
-- Name: workforce_provisioning_cases workforce_provisioning_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provisioning_cases
    ADD CONSTRAINT workforce_provisioning_cases_pkey PRIMARY KEY (id);


--
-- Name: workforce_shifts workforce_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_shifts
    ADD CONSTRAINT workforce_shifts_pkey PRIMARY KEY (code);


--
-- Name: workforce_sovereign_leadership_assignments workforce_sovereign_leadership_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_sovereign_leadership_assignments
    ADD CONSTRAINT workforce_sovereign_leadership_assignments_pkey PRIMARY KEY (actor_id);


--
-- Name: idx_workforce_provisioning_cases_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_workforce_provisioning_cases_idempotency ON public.workforce_provisioning_cases USING btree (idempotency_key);


--
-- Name: workforce_action_audit_context_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_action_audit_context_target_idx ON public.workforce_action_audit USING btree (operator_context_id, target_actor_id, created_at DESC);


--
-- Name: workforce_action_audit_financial_command_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_action_audit_financial_command_uidx ON public.workforce_action_audit USING btree (financial_command_id) WHERE (financial_command_id IS NOT NULL);


--
-- Name: workforce_action_audit_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_action_audit_idempotency_uidx ON public.workforce_action_audit USING btree (operator_context_id, actor_id, operation, idempotency_key) WHERE ((idempotency_key IS NOT NULL) AND (btrim(idempotency_key) <> ''::text));


--
-- Name: workforce_action_audit_lifecycle_command_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_action_audit_lifecycle_command_uidx ON public.workforce_action_audit USING btree (lifecycle_command_id) WHERE (lifecycle_command_id IS NOT NULL);


--
-- Name: workforce_action_audit_operator_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_action_audit_operator_context_idx ON public.workforce_action_audit USING btree (operator_context_id, created_at DESC);


--
-- Name: workforce_action_audit_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_action_audit_target_idx ON public.workforce_action_audit USING btree (target_actor_id, created_at DESC);


--
-- Name: workforce_captain_classification_history_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_captain_classification_history_actor_idx ON public.workforce_captain_classification_history USING btree (actor_id, created_at DESC);


--
-- Name: workforce_captain_classification_history_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_captain_classification_history_context_idx ON public.workforce_captain_classification_history USING btree (operator_context_id, actor_id, created_at DESC);


--
-- Name: workforce_captain_classification_history_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_captain_classification_history_idempotency_uidx ON public.workforce_captain_classification_history USING btree (idempotency_key);


--
-- Name: workforce_captain_profiles_service_area_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_captain_profiles_service_area_idx ON public.workforce_captain_profiles USING btree (operating_service_area_code);


--
-- Name: workforce_dsh_availability_outbox_lease_recovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_dsh_availability_outbox_lease_recovery_idx ON public.workforce_dsh_availability_outbox USING btree (lease_expires_at, updated_at, id) WHERE (lifecycle_state = 'processing'::text);


--
-- Name: workforce_dsh_availability_outbox_recovery_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_dsh_availability_outbox_recovery_due_idx ON public.workforce_dsh_availability_outbox USING btree (lifecycle_state, next_retry_at, created_at, id) WHERE (lifecycle_state = ANY (ARRAY['pending'::text, 'unknown'::text]));


--
-- Name: workforce_dsh_availability_outbox_terminal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_dsh_availability_outbox_terminal_idx ON public.workforce_dsh_availability_outbox USING btree (failure_disposition, updated_at DESC) WHERE (lifecycle_state = 'failed'::text);


--
-- Name: workforce_employee_governance_class_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_employee_governance_class_idx ON public.workforce_employee_governance USING btree (employment_class, guarantee_status, updated_at DESC);


--
-- Name: workforce_field_profiles_service_area_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_field_profiles_service_area_idx ON public.workforce_field_profiles USING btree (service_area_code);


--
-- Name: workforce_idempotency_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_idempotency_context_idx ON public.workforce_idempotency USING btree (operator_context_id, actor_id, operation, idempotency_key);


--
-- Name: workforce_lifecycle_commands_open_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_lifecycle_commands_open_uidx ON public.workforce_lifecycle_commands USING btree (operator_context_id, actor_id, operation) WHERE (lifecycle_state = ANY (ARRAY['IN_FLIGHT'::text, 'RETRY_SCHEDULED'::text]));


--
-- Name: workforce_lifecycle_commands_recovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_lifecycle_commands_recovery_idx ON public.workforce_lifecycle_commands USING btree (lifecycle_state, next_retry_at, created_at) WHERE (lifecycle_state = ANY (ARRAY['IN_FLIGHT'::text, 'RETRY_SCHEDULED'::text]));


--
-- Name: workforce_operational_assignment_audit_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_operational_assignment_audit_idempotency_uidx ON public.workforce_operational_assignment_audit USING btree (actor_id, operator_context_id, role, correlation_id);


--
-- Name: workforce_operational_assignments_active_scope_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_operational_assignments_active_scope_uidx ON public.workforce_operational_assignments USING btree (actor_id, operator_context_id, role, scope_type, scope_target_id) WHERE active;


--
-- Name: workforce_operational_assignments_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_operational_assignments_actor_idx ON public.workforce_operational_assignments USING btree (actor_id, operator_context_id, active, scope_type, scope_target_id);


--
-- Name: workforce_people_context_actor_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_people_context_actor_unique ON public.workforce_people USING btree (operator_context_id, actor_id);


--
-- Name: workforce_people_context_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_people_context_status_idx ON public.workforce_people USING btree (operator_context_id, engagement_status, created_at DESC);


--
-- Name: workforce_people_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_people_status_idx ON public.workforce_people USING btree (engagement_status, created_at DESC);


--
-- Name: workforce_provider_availability_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_availability_actor_idx ON public.workforce_provider_availability_notices USING btree (actor_id, starts_at DESC);


--
-- Name: workforce_provider_availability_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_availability_window_idx ON public.workforce_provider_availability_notices USING btree (starts_at, ends_at) WHERE (status = ANY (ARRAY['scheduled'::text, 'active'::text]));


--
-- Name: workforce_provider_incident_transitions_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_incident_transitions_actor_idx ON public.workforce_provider_incident_transitions USING btree (actor_id, created_at DESC);


--
-- Name: workforce_provider_incident_transitions_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_incident_transitions_context_idx ON public.workforce_provider_incident_transitions USING btree (operator_context_id, actor_id, created_at DESC);


--
-- Name: workforce_provider_incident_transitions_financial_command_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_provider_incident_transitions_financial_command_uidx ON public.workforce_provider_incident_transitions USING btree (financial_command_id) WHERE (financial_command_id IS NOT NULL);


--
-- Name: workforce_provider_incident_transitions_incident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_incident_transitions_incident_idx ON public.workforce_provider_incident_transitions USING btree (incident_id, created_at);


--
-- Name: workforce_provider_incidents_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_incidents_actor_idx ON public.workforce_provider_incidents USING btree (actor_id, created_at DESC);


--
-- Name: workforce_provider_incidents_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_provider_incidents_source_unique ON public.workforce_provider_incidents USING btree (actor_id, incident_code, source_type, source_id) WHERE (source_id <> ''::text);


--
-- Name: workforce_provider_operational_core_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_operational_core_stage_idx ON public.workforce_provider_operational_core USING btree (onboarding_stage, identity_verification_status, contract_review_status);


--
-- Name: workforce_provider_penalty_commands_client_idempotency_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_provider_penalty_commands_client_idempotency_uidx ON public.workforce_provider_penalty_commands USING btree (operator_context_id, requested_by_actor_id, operation, client_idempotency_key);


--
-- Name: workforce_provider_penalty_commands_incident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_penalty_commands_incident_idx ON public.workforce_provider_penalty_commands USING btree (operator_context_id, incident_id, created_at);


--
-- Name: workforce_provider_penalty_commands_recovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provider_penalty_commands_recovery_idx ON public.workforce_provider_penalty_commands USING btree (lifecycle_state, next_retry_at, created_at) WHERE (lifecycle_state = ANY (ARRAY['READY'::text, 'IN_FLIGHT'::text, 'REMOTE_OUTCOME_UNKNOWN'::text, 'REMOTE_CONFIRMED'::text, 'LOCAL_PROJECTION_PENDING'::text, 'RECONCILING'::text, 'RETRY_SCHEDULED'::text]));


--
-- Name: workforce_provisioning_cases_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provisioning_cases_context_idx ON public.workforce_provisioning_cases USING btree (operator_context_id, created_at DESC);


--
-- Name: workforce_provisioning_cases_context_key_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workforce_provisioning_cases_context_key_uidx ON public.workforce_provisioning_cases USING btree (operator_context_id, command_idempotency_key);


--
-- Name: workforce_provisioning_cases_recovery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_provisioning_cases_recovery_idx ON public.workforce_provisioning_cases USING btree (lifecycle_state, next_retry_at, created_at) WHERE (lifecycle_state = ANY (ARRAY['INTENT_RECORDED'::text, 'REMOTE_APPLIED'::text, 'RETRY_SCHEDULED'::text]));


--
-- Name: workforce_sovereign_leadership_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workforce_sovereign_leadership_active_idx ON public.workforce_sovereign_leadership_assignments USING btree (department_scope, assignment_status, starts_on, ends_on);


--
-- Name: workforce_employee_profiles trg_workforce_create_employee_governance_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_create_employee_governance_projection AFTER INSERT ON public.workforce_employee_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_create_employee_governance_projection();


--
-- Name: workforce_people trg_workforce_create_provider_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_create_provider_projection AFTER INSERT ON public.workforce_people FOR EACH ROW EXECUTE FUNCTION public.workforce_create_provider_projection();


--
-- Name: workforce_provider_availability_notices trg_workforce_enqueue_dsh_availability_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_enqueue_dsh_availability_projection AFTER INSERT OR UPDATE OF notice_type, starts_at, ends_at, service_zone_id, status, reason_code, note, source_version ON public.workforce_provider_availability_notices FOR EACH ROW EXECUTE FUNCTION public.workforce_enqueue_dsh_availability_projection();


--
-- Name: workforce_captain_activation_core trg_workforce_guard_captain_activation_core_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_guard_captain_activation_core_insert BEFORE INSERT ON public.workforce_captain_activation_core FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_captain_activation_core_insert();


--
-- Name: workforce_employee_governance trg_workforce_guard_employee_governance_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_guard_employee_governance_insert BEFORE INSERT ON public.workforce_employee_governance FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_employee_governance_insert();


--
-- Name: workforce_provider_incidents trg_workforce_guard_financial_incident_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_guard_financial_incident_projection BEFORE UPDATE OF status ON public.workforce_provider_incidents FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_financial_incident_projection();


--
-- Name: workforce_provider_operational_core trg_workforce_guard_provider_operational_core_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_guard_provider_operational_core_insert BEFORE INSERT ON public.workforce_provider_operational_core FOR EACH ROW EXECUTE FUNCTION public.workforce_guard_provider_operational_core_insert();


--
-- Name: workforce_operational_assignments trg_workforce_operational_assignment_actor_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_operational_assignment_actor_context BEFORE INSERT OR UPDATE OF actor_id, operator_context_id, role ON public.workforce_operational_assignments FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_operational_affiliation_actor_context();


--
-- Name: workforce_operational_assignment_audit trg_workforce_operational_assignment_audit_actor_context; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_operational_assignment_audit_actor_context BEFORE INSERT OR UPDATE OF actor_id, operator_context_id, role ON public.workforce_operational_assignment_audit FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_operational_affiliation_actor_context();


--
-- Name: workforce_provider_availability_notices trg_workforce_stamp_availability_notice_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_stamp_availability_notice_version BEFORE INSERT OR UPDATE ON public.workforce_provider_availability_notices FOR EACH ROW EXECUTE FUNCTION public.workforce_stamp_availability_notice_version();


--
-- Name: workforce_captain_activation_core trg_workforce_validate_captain_activation_evidence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_validate_captain_activation_evidence BEFORE INSERT OR UPDATE ON public.workforce_captain_activation_core FOR EACH ROW EXECUTE FUNCTION public.workforce_validate_captain_activation_evidence();


--
-- Name: workforce_captain_classification_history trg_workforce_validate_captain_classification_decision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_validate_captain_classification_decision BEFORE INSERT ON public.workforce_captain_classification_history FOR EACH ROW EXECUTE FUNCTION public.workforce_validate_captain_classification_decision();


--
-- Name: workforce_provider_operational_core trg_workforce_validate_provider_activation_evidence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_validate_provider_activation_evidence BEFORE INSERT OR UPDATE OF onboarding_stage, referral_source_type, referral_source_actor_id, referral_partner_id, referral_channel, referral_note, guarantor_phone_verified_at ON public.workforce_provider_operational_core FOR EACH ROW EXECUTE FUNCTION public.workforce_validate_provider_activation_evidence();


--
-- Name: workforce_provider_incidents trg_workforce_validate_provider_incident_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_workforce_validate_provider_incident_transition BEFORE UPDATE OF status, policy_id, evidence_media_refs, wlt_ledger_reference ON public.workforce_provider_incidents FOR EACH ROW EXECUTE FUNCTION public.workforce_validate_provider_incident_transition();


--
-- Name: workforce_captain_profiles workforce_captain_license_evidence_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workforce_captain_license_evidence_trg BEFORE INSERT OR UPDATE OF license_status, license_expires_at, document_media_refs ON public.workforce_captain_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_captain_license_evidence();


--
-- Name: workforce_captain_profiles workforce_captain_profiles_exclusivity_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workforce_captain_profiles_exclusivity_trg BEFORE INSERT ON public.workforce_captain_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_provider_exclusivity();


--
-- Name: workforce_employee_profiles workforce_employee_profiles_exclusivity_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workforce_employee_profiles_exclusivity_trg BEFORE INSERT ON public.workforce_employee_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_provider_exclusivity();


--
-- Name: workforce_field_profiles workforce_field_profiles_exclusivity_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workforce_field_profiles_exclusivity_trg BEFORE INSERT ON public.workforce_field_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_provider_exclusivity();


--
-- Name: workforce_action_audit workforce_action_audit_financial_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_action_audit
    ADD CONSTRAINT workforce_action_audit_financial_command_id_fkey FOREIGN KEY (financial_command_id) REFERENCES public.workforce_provider_penalty_commands(id) ON DELETE RESTRICT;


--
-- Name: workforce_action_audit workforce_action_audit_lifecycle_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_action_audit
    ADD CONSTRAINT workforce_action_audit_lifecycle_command_id_fkey FOREIGN KEY (lifecycle_command_id) REFERENCES public.workforce_lifecycle_commands(id) ON DELETE RESTRICT;


--
-- Name: workforce_captain_activation_core workforce_captain_activation_core_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_activation_core
    ADD CONSTRAINT workforce_captain_activation_core_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_captain_classification_history workforce_captain_classification_history_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_classification_history
    ADD CONSTRAINT workforce_captain_classification_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_captain_profiles workforce_captain_profiles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_captain_profiles
    ADD CONSTRAINT workforce_captain_profiles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_dsh_availability_outbox workforce_dsh_availability_outbox_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_dsh_availability_outbox
    ADD CONSTRAINT workforce_dsh_availability_outbox_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.workforce_provider_availability_notices(id) ON DELETE CASCADE;


--
-- Name: workforce_employee_governance workforce_employee_governance_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_employee_governance
    ADD CONSTRAINT workforce_employee_governance_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_employee_profiles(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_employee_profiles workforce_employee_profiles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_employee_profiles
    ADD CONSTRAINT workforce_employee_profiles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_field_profiles workforce_field_profiles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_provider_availability_notices workforce_provider_availability_notices_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_availability_notices
    ADD CONSTRAINT workforce_provider_availability_notices_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_provider_incident_transitions workforce_provider_incident_transitio_financial_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incident_transitions
    ADD CONSTRAINT workforce_provider_incident_transitio_financial_command_id_fkey FOREIGN KEY (financial_command_id) REFERENCES public.workforce_provider_penalty_commands(id) ON DELETE RESTRICT;


--
-- Name: workforce_provider_incident_transitions workforce_provider_incident_transitions_actor_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incident_transitions
    ADD CONSTRAINT workforce_provider_incident_transitions_actor_fk FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE NOT VALID;


--
-- Name: workforce_provider_incident_transitions workforce_provider_incident_transitions_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incident_transitions
    ADD CONSTRAINT workforce_provider_incident_transitions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.workforce_provider_incidents(id) ON DELETE CASCADE;


--
-- Name: workforce_provider_incidents workforce_provider_incidents_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_incidents
    ADD CONSTRAINT workforce_provider_incidents_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_provider_operational_core workforce_provider_operational_core_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_operational_core
    ADD CONSTRAINT workforce_provider_operational_core_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_provider_penalty_commands workforce_provider_penalty_commands_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_penalty_commands
    ADD CONSTRAINT workforce_provider_penalty_commands_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.workforce_provider_incidents(id) ON DELETE RESTRICT;


--
-- Name: workforce_provider_penalty_commands workforce_provider_penalty_commands_parent_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_provider_penalty_commands
    ADD CONSTRAINT workforce_provider_penalty_commands_parent_command_id_fkey FOREIGN KEY (parent_command_id) REFERENCES public.workforce_provider_penalty_commands(id) ON DELETE RESTRICT;


--
-- Name: workforce_sovereign_leadership_assignments workforce_sovereign_leadership_assignments_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workforce_sovereign_leadership_assignments
    ADD CONSTRAINT workforce_sovereign_leadership_assignments_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

