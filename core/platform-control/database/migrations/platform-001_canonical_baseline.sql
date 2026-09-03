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
-- Name: platform_normalize_audit_actor_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_normalize_audit_actor_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.actor_roles IS NULL THEN
        NEW.actor_roles := ARRAY[]::TEXT[];
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION platform_normalize_audit_actor_roles(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.platform_normalize_audit_actor_roles() IS 'Normalizes explicit NULL audit actor roles to the canonical empty text array before NOT NULL enforcement.';


--
-- Name: platform_prevent_baseline_restore_with_active_successor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_prevent_baseline_restore_with_active_successor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status IN ('aborted', 'rolled_back')
       AND OLD.status IS DISTINCT FROM NEW.status
       AND EXISTS (
           SELECT 1
           FROM platform_rollouts successor
           WHERE successor.feature_flag_key = OLD.feature_flag_key
             AND successor.id <> OLD.id
             AND successor.status IN ('running', 'paused')
       ) THEN
        RAISE EXCEPTION 'cannot restore rollout baseline while a newer active rollout exists for flag %', OLD.feature_flag_key
            USING ERRCODE = '40001';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: platform_prevent_paused_rollout_advance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_prevent_paused_rollout_advance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'paused'
       AND NEW.status NOT IN ('aborted', 'rolled_back')
       AND (
           NEW.current_step_index IS DISTINCT FROM OLD.current_step_index
           OR NEW.current_percentage IS DISTINCT FROM OLD.current_percentage
           OR NEW.flag_revision IS DISTINCT FROM OLD.flag_revision
       ) THEN
        RAISE EXCEPTION 'paused rollout % must be resumed before advance', OLD.id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION platform_prevent_paused_rollout_advance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.platform_prevent_paused_rollout_advance() IS 'JRN-041 defense in depth: a paused rollout cannot change step, percentage or flag revision until an explicit resume; abort and rollback baseline restoration remain legal.';


--
-- Name: platform_reject_partner_commercial_model_storage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_reject_partner_commercial_model_storage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.variable_key = 'VAR_PARTNER_COMMERCIAL_MODEL' THEN
    RAISE EXCEPTION
      'VAR_PARTNER_COMMERCIAL_MODEL is domain-owned and cannot be stored in Platform Control'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION platform_reject_partner_commercial_model_storage(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.platform_reject_partner_commercial_model_storage() IS 'Prevents Platform Control from becoming a parallel writer for DSH/WLT partner commercial truth.';


--
-- Name: platform_reject_sensitive_change_set_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_reject_sensitive_change_set_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    existing_classification TEXT;
    normalized_classification TEXT := lower(btrim(COALESCE(NEW.classification, '')));
BEGIN
    IF normalized_classification IN (
        'secret',
        'sensitive',
        'confidential',
        'restricted',
        'credential',
        'credentials',
        'password',
        'token',
        'private_key',
        'api_key',
        'client_secret'
    ) THEN
        RAISE EXCEPTION 'sensitive platform change-set classification is forbidden'
            USING ERRCODE = '22023';
    END IF;

    IF NEW.target_type = 'variable' THEN
        SELECT lower(btrim(classification))
          INTO existing_classification
          FROM platform_variables
         WHERE variable_key = NEW.target_key
           AND scope_type = NEW.scope_type
           AND scope_id = NEW.scope_id;

        IF existing_classification IN (
            'secret',
            'sensitive',
            'confidential',
            'restricted',
            'credential',
            'credentials',
            'password',
            'token',
            'private_key',
            'api_key',
            'client_secret'
        ) THEN
            RAISE EXCEPTION 'existing sensitive platform variable cannot enter a change set'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION platform_reject_sensitive_change_set_item(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.platform_reject_sensitive_change_set_item() IS 'Final database guard rejecting sensitive classifications and existing sensitive variable targets before change-set persistence.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: platform_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_set_id uuid,
    action text NOT NULL,
    actor_id text NOT NULL,
    actor_roles text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    before_state_json jsonb,
    after_state_json jsonb,
    correlation_id text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_change_set_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_change_set_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_set_id uuid NOT NULL,
    target_type text NOT NULL,
    target_key text NOT NULL,
    owner_service text NOT NULL,
    scope_type text DEFAULT 'global'::text NOT NULL,
    scope_id text DEFAULT ''::text NOT NULL,
    value_type text DEFAULT 'json'::text NOT NULL,
    classification text DEFAULT 'internal'::text NOT NULL,
    expected_revision bigint DEFAULT 0 NOT NULL,
    before_value_json jsonb,
    proposed_value_json jsonb NOT NULL,
    applied_revision bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    validated_value_json jsonb,
    validated_revision bigint,
    validated_at timestamp with time zone,
    CONSTRAINT platform_change_set_items_expected_revision_check CHECK ((expected_revision >= 0)),
    CONSTRAINT platform_change_set_items_target_type_check CHECK ((target_type = ANY (ARRAY['variable'::text, 'feature_flag'::text]))),
    CONSTRAINT platform_change_set_items_validated_revision_check CHECK (((validated_revision IS NULL) OR (validated_revision >= 0)))
);


--
-- Name: COLUMN platform_change_set_items.before_value_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_change_set_items.before_value_json IS 'Immutable pre-apply snapshot used by rollback. It must be captured in the same transaction as apply.';


--
-- Name: COLUMN platform_change_set_items.validated_value_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_change_set_items.validated_value_json IS 'Full target-state snapshot captured atomically during change-set validation; compared again before submit, approval, and apply.';


--
-- Name: COLUMN platform_change_set_items.validated_revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_change_set_items.validated_revision IS 'Target revision observed during validation. Zero represents a target that did not yet exist.';


--
-- Name: COLUMN platform_change_set_items.validated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_change_set_items.validated_at IS 'Timestamp at which the target precondition snapshot was captured.';


--
-- Name: platform_change_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_change_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    reason text NOT NULL,
    impact_assessment text NOT NULL,
    rollback_plan text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    proposer_actor_id text NOT NULL,
    approver_actor_id text,
    applied_by_actor_id text,
    rejected_by_actor_id text,
    rejection_reason text,
    version bigint DEFAULT 1 NOT NULL,
    validated_at timestamp with time zone,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    applied_at timestamp with time zone,
    rolled_back_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_change_sets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'rolled_back'::text, 'failed'::text]))),
    CONSTRAINT platform_change_sets_version_check CHECK ((version > 0))
);


--
-- Name: TABLE platform_change_sets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_change_sets IS 'Maker-checker governed proposals. The proposer may not approve the same change set.';


--
-- Name: platform_feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_feature_flags (
    flag_key text NOT NULL,
    owner_service text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    targeting_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_feature_flags_revision_check CHECK ((revision > 0)),
    CONSTRAINT platform_feature_flags_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text, 'scheduled'::text, 'expired'::text])))
);


--
-- Name: platform_rollouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_rollouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_set_id uuid NOT NULL,
    feature_flag_key text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    target_scope_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    steps integer[] NOT NULL,
    current_step_index integer DEFAULT '-1'::integer NOT NULL,
    current_percentage integer DEFAULT 0 NOT NULL,
    health_gate_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    baseline_enabled boolean NOT NULL,
    baseline_targeting_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    flag_revision bigint NOT NULL,
    created_by_actor_id text NOT NULL,
    updated_by_actor_id text NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    paused_at timestamp with time zone,
    completed_at timestamp with time zone,
    aborted_at timestamp with time zone,
    rolled_back_at timestamp with time zone,
    CONSTRAINT platform_rollout_step_index_valid CHECK (((current_step_index >= '-1'::integer) AND (current_step_index < cardinality(steps)))),
    CONSTRAINT platform_rollout_steps_not_empty CHECK ((cardinality(steps) > 0)),
    CONSTRAINT platform_rollouts_current_percentage_check CHECK (((current_percentage >= 0) AND (current_percentage <= 100))),
    CONSTRAINT platform_rollouts_flag_revision_check CHECK ((flag_revision > 0)),
    CONSTRAINT platform_rollouts_status_check CHECK ((status = ANY (ARRAY['running'::text, 'paused'::text, 'completed'::text, 'aborted'::text, 'rolled_back'::text, 'failed'::text]))),
    CONSTRAINT platform_rollouts_version_check CHECK ((version > 0))
);


--
-- Name: COLUMN platform_rollouts.baseline_targeting_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_rollouts.baseline_targeting_json IS 'Immutable targeting snapshot restored by abort or rollback.';


--
-- Name: COLUMN platform_rollouts.flag_revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_rollouts.flag_revision IS 'Last feature-flag revision written or observed by this rollout. Advance, abort and rollback reject newer external revisions.';


--
-- Name: platform_variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_variables (
    variable_key text NOT NULL,
    owner_service text NOT NULL,
    value_type text NOT NULL,
    classification text NOT NULL,
    scope_type text NOT NULL,
    scope_id text DEFAULT ''::text NOT NULL,
    value_json jsonb NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    effective_from timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_variables_revision_check CHECK ((revision > 0)),
    CONSTRAINT platform_variables_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text, 'scheduled'::text, 'expired'::text])))
);


--
-- Name: COLUMN platform_variables.value_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_variables.value_json IS 'Governed value. VAR_PARTNER_COMMERCIAL_MODEL stores only the operational enum; it never stores or calculates money.';


--


--
-- Name: platform_audit_events platform_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_audit_events
    ADD CONSTRAINT platform_audit_events_pkey PRIMARY KEY (id);


--
-- Name: platform_change_set_items platform_change_set_items_change_set_id_target_type_target__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_change_set_items
    ADD CONSTRAINT platform_change_set_items_change_set_id_target_type_target__key UNIQUE (change_set_id, target_type, target_key, scope_type, scope_id);


--
-- Name: platform_change_set_items platform_change_set_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_change_set_items
    ADD CONSTRAINT platform_change_set_items_pkey PRIMARY KEY (id);


--
-- Name: platform_change_sets platform_change_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_change_sets
    ADD CONSTRAINT platform_change_sets_pkey PRIMARY KEY (id);


--
-- Name: platform_feature_flags platform_feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_feature_flags
    ADD CONSTRAINT platform_feature_flags_pkey PRIMARY KEY (flag_key);


--
-- Name: platform_rollouts platform_rollout_health_gate_governed; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.platform_rollouts
    ADD CONSTRAINT platform_rollout_health_gate_governed CHECK (((jsonb_typeof(health_gate_json) = 'object'::text) AND ((health_gate_json ->> 'requiredState'::text) = 'OPERATIONAL'::text) AND ((NOT (health_gate_json ? 'requiredServices'::text)) OR ((jsonb_typeof((health_gate_json -> 'requiredServices'::text)) = 'array'::text) AND (jsonb_array_length((health_gate_json -> 'requiredServices'::text)) > 0))) AND
CASE
    WHEN (NOT (health_gate_json ? 'maxLatencyMs'::text)) THEN true
    WHEN (jsonb_typeof((health_gate_json -> 'maxLatencyMs'::text)) <> 'number'::text) THEN false
    ELSE (((health_gate_json ->> 'maxLatencyMs'::text))::numeric > (0)::numeric)
END)) NOT VALID;


--
-- Name: CONSTRAINT platform_rollout_health_gate_governed ON platform_rollouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT platform_rollout_health_gate_governed ON public.platform_rollouts IS 'JRN-041 every rollout must require OPERATIONAL health before progression.';


--
-- Name: platform_rollouts platform_rollout_target_scope_governed; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.platform_rollouts
    ADD CONSTRAINT platform_rollout_target_scope_governed CHECK (((jsonb_typeof(target_scope_json) = 'object'::text) AND (target_scope_json <> '{}'::jsonb) AND ((target_scope_json - ARRAY['audience'::text, 'audienceIds'::text, 'city'::text, 'regions'::text, 'surface'::text, 'surfaces'::text]) = '{}'::jsonb) AND ((NULLIF(btrim((target_scope_json ->> 'audience'::text)), ''::text) IS NOT NULL) OR (NULLIF(btrim((target_scope_json ->> 'city'::text)), ''::text) IS NOT NULL) OR (NULLIF(btrim((target_scope_json ->> 'surface'::text)), ''::text) IS NOT NULL) OR (jsonb_array_length(
CASE
    WHEN (jsonb_typeof((target_scope_json -> 'audienceIds'::text)) = 'array'::text) THEN (target_scope_json -> 'audienceIds'::text)
    ELSE '[]'::jsonb
END) > 0) OR (jsonb_array_length(
CASE
    WHEN (jsonb_typeof((target_scope_json -> 'regions'::text)) = 'array'::text) THEN (target_scope_json -> 'regions'::text)
    ELSE '[]'::jsonb
END) > 0) OR (jsonb_array_length(
CASE
    WHEN (jsonb_typeof((target_scope_json -> 'surfaces'::text)) = 'array'::text) THEN (target_scope_json -> 'surfaces'::text)
    ELSE '[]'::jsonb
END) > 0)))) NOT VALID;


--
-- Name: CONSTRAINT platform_rollout_target_scope_governed ON platform_rollouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT platform_rollout_target_scope_governed ON public.platform_rollouts IS 'JRN-041 rollout scope must use an explicit governed audience, region, city or surface selector.';


--
-- Name: platform_rollouts platform_rollout_terminal_state_consistency; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.platform_rollouts
    ADD CONSTRAINT platform_rollout_terminal_state_consistency CHECK ((((status <> 'paused'::text) OR (paused_at IS NOT NULL)) AND ((status <> 'completed'::text) OR ((completed_at IS NOT NULL) AND (current_percentage = 100))) AND ((status <> 'aborted'::text) OR (aborted_at IS NOT NULL)) AND ((status <> 'rolled_back'::text) OR (rolled_back_at IS NOT NULL)) AND ((status <> ALL (ARRAY['aborted'::text, 'rolled_back'::text])) OR ((current_percentage >= 0) AND (current_percentage <= 100))))) NOT VALID;


--
-- Name: CONSTRAINT platform_rollout_terminal_state_consistency ON platform_rollouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT platform_rollout_terminal_state_consistency ON public.platform_rollouts IS 'JRN-041 lifecycle timestamps and completed percentage must match the persisted rollout status.';


--
-- Name: platform_rollouts platform_rollouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_rollouts
    ADD CONSTRAINT platform_rollouts_pkey PRIMARY KEY (id);


--
-- Name: platform_variables platform_variables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_variables
    ADD CONSTRAINT platform_variables_pkey PRIMARY KEY (variable_key, scope_type, scope_id);


--


--
-- Name: idx_platform_audit_events_change_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_audit_events_change_set ON public.platform_audit_events USING btree (change_set_id, created_at);


--
-- Name: idx_platform_audit_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_audit_events_created ON public.platform_audit_events USING btree (created_at DESC);


--
-- Name: idx_platform_change_set_items_change_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_change_set_items_change_set ON public.platform_change_set_items USING btree (change_set_id, created_at);


--
-- Name: idx_platform_change_set_items_target_reservation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_change_set_items_target_reservation ON public.platform_change_set_items USING btree (target_type, target_key, scope_type, scope_id, change_set_id);


--
-- Name: idx_platform_change_sets_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_change_sets_status_created ON public.platform_change_sets USING btree (status, created_at DESC);


--
-- Name: idx_platform_rollouts_change_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_rollouts_change_set ON public.platform_rollouts USING btree (change_set_id, created_at DESC);


--
-- Name: idx_platform_rollouts_status_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_rollouts_status_updated ON public.platform_rollouts USING btree (status, updated_at DESC);


--
-- Name: idx_platform_variables_owner_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_variables_owner_scope ON public.platform_variables USING btree (owner_service, scope_type, scope_id);


--
-- Name: uq_platform_rollouts_active_flag; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_platform_rollouts_active_flag ON public.platform_rollouts USING btree (feature_flag_key) WHERE (status = ANY (ARRAY['running'::text, 'paused'::text]));


--
-- Name: platform_change_set_items platform_sensitive_change_set_item_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER platform_sensitive_change_set_item_trigger BEFORE INSERT OR UPDATE OF target_type, target_key, scope_type, scope_id, classification ON public.platform_change_set_items FOR EACH ROW EXECUTE FUNCTION public.platform_reject_sensitive_change_set_item();


--
-- Name: platform_audit_events trg_platform_normalize_audit_actor_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_normalize_audit_actor_roles BEFORE INSERT OR UPDATE OF actor_roles ON public.platform_audit_events FOR EACH ROW EXECUTE FUNCTION public.platform_normalize_audit_actor_roles();


--
-- Name: platform_variables trg_platform_reject_partner_commercial_model_storage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_reject_partner_commercial_model_storage BEFORE INSERT OR UPDATE OF variable_key ON public.platform_variables FOR EACH ROW EXECUTE FUNCTION public.platform_reject_partner_commercial_model_storage();


--
-- Name: platform_rollouts trg_platform_rollout_paused_advance_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_rollout_paused_advance_guard BEFORE UPDATE OF status, current_step_index, current_percentage, flag_revision ON public.platform_rollouts FOR EACH ROW EXECUTE FUNCTION public.platform_prevent_paused_rollout_advance();


--
-- Name: platform_rollouts trg_platform_rollout_restore_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_rollout_restore_guard BEFORE UPDATE OF status ON public.platform_rollouts FOR EACH ROW EXECUTE FUNCTION public.platform_prevent_baseline_restore_with_active_successor();


--
-- Name: platform_audit_events platform_audit_events_change_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_audit_events
    ADD CONSTRAINT platform_audit_events_change_set_id_fkey FOREIGN KEY (change_set_id) REFERENCES public.platform_change_sets(id) ON DELETE SET NULL;


--
-- Name: platform_change_set_items platform_change_set_items_change_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_change_set_items
    ADD CONSTRAINT platform_change_set_items_change_set_id_fkey FOREIGN KEY (change_set_id) REFERENCES public.platform_change_sets(id) ON DELETE CASCADE;


--
-- Name: platform_rollouts platform_rollouts_change_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_rollouts
    ADD CONSTRAINT platform_rollouts_change_set_id_fkey FOREIGN KEY (change_set_id) REFERENCES public.platform_change_sets(id) ON DELETE RESTRICT;


--
-- Name: platform_rollouts platform_rollouts_feature_flag_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_rollouts
    ADD CONSTRAINT platform_rollouts_feature_flag_key_fkey FOREIGN KEY (feature_flag_key) REFERENCES public.platform_feature_flags(flag_key) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

