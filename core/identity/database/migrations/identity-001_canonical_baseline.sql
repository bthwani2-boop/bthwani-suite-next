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
-- Name: identity_capture_refresh_rotation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_capture_refresh_rotation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.refresh_token_hash IS DISTINCT FROM OLD.refresh_token_hash THEN
    NEW.previous_refresh_token_hash := OLD.refresh_token_hash;
    NEW.refresh_rotated_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: identity_effective_permissions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_effective_permissions(p_actor_id text) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
    WITH effective AS (
        SELECT vocabulary.service, vocabulary.surface, vocabulary.action, direct_permission.scope
        FROM identity_actor_direct_permissions direct_permission
        JOIN identity_permission_vocabulary vocabulary ON vocabulary.id = direct_permission.permission_id
        WHERE direct_permission.actor_id = p_actor_id
        UNION
        SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope
        FROM identity_actor_roles assignment
        JOIN identity_roles role ON role.id = assignment.role_id AND role.active = true
        JOIN identity_role_permissions role_permission ON role_permission.role_id = role.id
        JOIN identity_permission_vocabulary vocabulary ON vocabulary.id = role_permission.permission_id
        WHERE assignment.actor_id = p_actor_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'service', service, 'surface', surface, 'action', action, 'scope', scope
    ) ORDER BY service, surface, action, scope), '[]'::jsonb)
    FROM effective
$$;


--
-- Name: identity_effective_roles(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_effective_roles(p_actor_id text) RETURNS text[]
    LANGUAGE sql STABLE
    AS $$
    SELECT COALESCE(array_agg(role.name ORDER BY role.name), ARRAY[]::text[])
    FROM identity_actor_roles assignment
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE assignment.actor_id = p_actor_id
      AND role.active = true
$$;


--
-- Name: identity_guard_actor_access_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_guard_actor_access_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF current_setting('bthwani.identity_access_projection', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.roles, ARRAY[]::text[]) = ARRAY[]::text[]
           AND COALESCE(NEW.permissions, '[]'::jsonb) = '[]'::jsonb THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
    END IF;

    RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
END
$$;


--
-- Name: identity_project_actor_role_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_project_actor_role_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_actor_id text;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        affected_actor_id := OLD.actor_id;
    ELSE
        affected_actor_id := NEW.actor_id;
        -- A role owns a grant when it supplies the exact same permission and scope;
        -- remove redundant direct copies so revocation remains effective.
        DELETE FROM identity_actor_direct_permissions direct_permission
        USING identity_role_permissions role_permission
        WHERE direct_permission.actor_id = NEW.actor_id
          AND role_permission.role_id = NEW.role_id
          AND direct_permission.permission_id = role_permission.permission_id
          AND direct_permission.scope = role_permission.scope;
    END IF;

    PERFORM identity_rebuild_actor_access_projection(affected_actor_id);
    IF TG_OP = 'UPDATE' AND OLD.actor_id IS DISTINCT FROM NEW.actor_id THEN
        PERFORM identity_rebuild_actor_access_projection(OLD.actor_id);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;


--
-- Name: identity_project_direct_permission_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_project_direct_permission_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_actor_id text;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN affected_actor_id := OLD.actor_id; ELSE affected_actor_id := NEW.actor_id; END IF;
    PERFORM identity_rebuild_actor_access_projection(affected_actor_id);
    IF TG_OP = 'UPDATE' AND OLD.actor_id IS DISTINCT FROM NEW.actor_id THEN
        PERFORM identity_rebuild_actor_access_projection(OLD.actor_id);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;


--
-- Name: identity_project_permission_vocabulary_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_project_permission_vocabulary_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    actor_record record;
BEGIN
    IF NEW.service IS NOT DISTINCT FROM OLD.service
       AND NEW.surface IS NOT DISTINCT FROM OLD.surface
       AND NEW.action IS NOT DISTINCT FROM OLD.action THEN
        RETURN NEW;
    END IF;

    FOR actor_record IN
        SELECT actor_id
        FROM identity_actor_direct_permissions
        WHERE permission_id = NEW.id
        UNION
        SELECT assignment.actor_id
        FROM identity_actor_roles assignment
        JOIN identity_role_permissions role_permission
          ON role_permission.role_id = assignment.role_id
        WHERE role_permission.permission_id = NEW.id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;
    RETURN NEW;
END
$$;


--
-- Name: identity_project_role_name_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_project_role_name_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    actor_record record;
BEGIN
    IF NEW.name IS NOT DISTINCT FROM OLD.name THEN
        RETURN NEW;
    END IF;

    FOR actor_record IN
        SELECT actor_id
        FROM identity_actor_roles
        WHERE role_id = NEW.id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;
    RETURN NEW;
END
$$;


--
-- Name: identity_project_role_permission_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_project_role_permission_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    actor_record record;
    changed_role_id uuid;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN changed_role_id := OLD.role_id; ELSE changed_role_id := NEW.role_id; END IF;

    IF TG_OP <> 'DELETE' THEN
        DELETE FROM identity_actor_direct_permissions direct_permission
        USING identity_actor_roles assignment
        WHERE assignment.role_id = NEW.role_id
          AND assignment.actor_id = direct_permission.actor_id
          AND direct_permission.permission_id = NEW.permission_id
          AND direct_permission.scope = NEW.scope;
    END IF;

    FOR actor_record IN
        SELECT DISTINCT actor_id
        FROM identity_actor_roles
        WHERE role_id = changed_role_id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;

    IF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        FOR actor_record IN
            SELECT DISTINCT actor_id
            FROM identity_actor_roles
            WHERE role_id = OLD.role_id
        LOOP
            PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;


--
-- Name: identity_rebuild_actor_access_projection(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_rebuild_actor_access_projection(p_actor_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM set_config('bthwani.identity_access_projection', '1', true);

    UPDATE identity_actors
    SET roles = identity_effective_roles(p_actor_id),
        permissions = identity_effective_permissions(p_actor_id),
        updated_at = now()
    WHERE id = p_actor_id;

    PERFORM set_config('bthwani.identity_access_projection', '0', true);
END
$$;


--
-- Name: identity_require_consumed_challenge_for_activation_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.identity_require_consumed_challenge_for_activation_session() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  actor_updated_at timestamptz;
BEGIN
  SELECT updated_at
  INTO actor_updated_at
  FROM identity_actors
  WHERE id = NEW.actor_id;

  IF actor_updated_at = transaction_timestamp()
     AND NOT EXISTS (
       SELECT 1
       FROM identity_activation_challenges
       WHERE actor_id = NEW.actor_id
         AND status = 'consumed'
         AND consumed_at = transaction_timestamp()
     )
  THEN
    RAISE EXCEPTION 'session creation requires a consumed activation challenge'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;


--
-- Name: trg_fn_identity_actors_prevent_operator_context_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_fn_identity_actors_prevent_operator_context_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.operator_context_id IS NOT NULL AND OLD.operator_context_id <> '' AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
        RAISE EXCEPTION 'identity_actors.operator_context_id is immutable once assigned (attempted change from % to %)',
            OLD.operator_context_id, NEW.operator_context_id;
    END IF;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: identity_account_deletions_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_account_deletions_outbox (
    id bigint NOT NULL,
    actor_id text NOT NULL,
    phone_e164 text NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_key text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    last_error text,
    CONSTRAINT identity_deletion_outbox_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: COLUMN identity_account_deletions_outbox.event_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_account_deletions_outbox.event_key IS 'Stable idempotency key used by downstream anonymization consumers.';


--
-- Name: COLUMN identity_account_deletions_outbox.next_attempt_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_account_deletions_outbox.next_attempt_at IS 'Retry schedule owned by the Identity outbox delivery worker.';


--
-- Name: identity_account_deletions_outbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.identity_account_deletions_outbox_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: identity_account_deletions_outbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.identity_account_deletions_outbox_id_seq OWNED BY public.identity_account_deletions_outbox.id;


--
-- Name: identity_activation_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_activation_challenges (
    id text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    phone_e164 text NOT NULL,
    surface text NOT NULL,
    code_hash text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    issued_by_actor_id text NOT NULL,
    idempotency_key text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_activation_attempts_upper_check CHECK ((attempts <= 5)),
    CONSTRAINT identity_activation_challenges_actor_type_check CHECK ((actor_type = ANY (ARRAY['field'::text, 'captain'::text, 'client'::text, 'partner'::text, 'operator'::text, 'employee'::text]))),
    CONSTRAINT identity_activation_challenges_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT identity_activation_challenges_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'consumed'::text, 'revoked'::text, 'expired'::text, 'locked'::text]))),
    CONSTRAINT identity_activation_challenges_surface_check CHECK ((surface = ANY (ARRAY['app-field'::text, 'app-captain'::text, 'app-client'::text, 'app-partner'::text, 'control-panel'::text]))),
    CONSTRAINT identity_activation_consumed_time_check CHECK ((((status = 'consumed'::text) AND (consumed_at IS NOT NULL)) OR ((status <> 'consumed'::text) AND (consumed_at IS NULL))))
);


--
-- Name: TABLE identity_activation_challenges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identity_activation_challenges IS 'Typed, surface-bound, single-use activation challenges with bounded attempts.';


--
-- Name: COLUMN identity_activation_challenges.actor_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_activation_challenges.actor_type IS 'Actor class receiving the challenge. employee is an administrative Workforce identity.';


--
-- Name: COLUMN identity_activation_challenges.surface; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_activation_challenges.surface IS 'Single target surface. Administrative employee first-login invitations target control-panel.';


--
-- Name: identity_actor_direct_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_actor_direct_permissions (
    actor_id text NOT NULL,
    permission_id uuid NOT NULL,
    scope character varying(64) NOT NULL,
    granted_by character varying(128) DEFAULT 'identity-direct-grant'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_actor_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_actor_lifecycle_events (
    id text NOT NULL,
    actor_id text NOT NULL,
    status text NOT NULL,
    reason text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_by_actor_id text NOT NULL,
    CONSTRAINT identity_actor_lifecycle_correlation_nonblank_chk CHECK ((btrim(correlation_id) <> ''::text)),
    CONSTRAINT identity_actor_lifecycle_events_status_check CHECK ((status = ANY (ARRAY['deactivated'::text, 'suspended'::text, 'reactivated'::text]))),
    CONSTRAINT identity_actor_lifecycle_reason_nonblank_chk CHECK ((btrim(reason) <> ''::text))
);


--
-- Name: identity_actor_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_actor_roles (
    actor_id character varying(128) NOT NULL,
    role_id uuid NOT NULL,
    granted_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_actors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_actors (
    id text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    operator_context_id text NOT NULL,
    roles text[] NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone_e164 text,
    status text DEFAULT 'PROVISIONED'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT identity_actors_phone_e164_check CHECK (((phone_e164 IS NULL) OR (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'::text))),
    CONSTRAINT identity_actors_status_check CHECK ((status = ANY (ARRAY['PROVISIONED'::text, 'PENDING_ACTIVATION'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'DEACTIVATED'::text])))
);


--
-- Name: COLUMN identity_actors.roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_actors.roles IS 'Derived projection of identity_actor_roles. Canonical role writes belong to normalized Identity RBAC.';


--
-- Name: COLUMN identity_actors.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_actors.permissions IS 'Derived effective projection: direct actor grants union assigned-role grants. Canonical direct grants live in identity_actor_direct_permissions.';


--
-- Name: identity_login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_login_attempts (
    id bigint NOT NULL,
    username text NOT NULL,
    succeeded boolean NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.identity_login_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: identity_login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.identity_login_attempts_id_seq OWNED BY public.identity_login_attempts.id;


--
-- Name: identity_permission_vocabulary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_permission_vocabulary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service character varying(64) NOT NULL,
    surface character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_rbac_operation_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_rbac_operation_ledger (
    caller text NOT NULL,
    operation text NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_hash character(64) NOT NULL,
    status character varying(32) NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT identity_rbac_operation_ledger_check CHECK ((((status)::text <> 'succeeded'::text) OR (result IS NOT NULL))),
    CONSTRAINT identity_rbac_operation_ledger_operator_context_nonempty CHECK ((btrim(operator_context_id) <> ''::text)),
    CONSTRAINT identity_rbac_operation_ledger_status_check CHECK (((status)::text = ANY ((ARRAY['processing'::character varying, 'succeeded'::character varying])::text[])))
);


--
-- Name: TABLE identity_rbac_operation_ledger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identity_rbac_operation_ledger IS 'Durable exactly-once ledger for Identity-owned governed RBAC mutations.';


--
-- Name: COLUMN identity_rbac_operation_ledger.operator_context_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_rbac_operation_ledger.operator_context_id IS 'Trusted actor ownership scope for new RBAC idempotency records; legacy-unscoped rows are migration quarantine and cannot be reused.';


--
-- Name: identity_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    scope character varying(64) DEFAULT 'assigned'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: identity_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT identity_roles_version_positive CHECK ((version > 0))
);


--
-- Name: COLUMN identity_roles.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_roles.active IS 'Inactive role definitions remain readable for audit but do not grant executable authority.';


--
-- Name: COLUMN identity_roles.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_roles.version IS 'Monotonic optimistic-concurrency version for governed role-definition writes.';


--
-- Name: identity_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_sessions (
    id text NOT NULL,
    actor_id text NOT NULL,
    access_token_hash text NOT NULL,
    refresh_token_hash text,
    device_fingerprint text,
    access_expires_at timestamp with time zone NOT NULL,
    refresh_expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    session_kind text DEFAULT 'standard'::text NOT NULL,
    initiator_actor_id text,
    support_request_id text,
    support_reason text,
    effective_roles text[],
    effective_permissions jsonb,
    surface text DEFAULT 'unknown'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    compromised_at timestamp with time zone,
    last_used_at timestamp with time zone,
    network_metadata jsonb,
    previous_refresh_token_hash text,
    refresh_rotated_at timestamp with time zone,
    support_payload_fingerprint text,
    CONSTRAINT identity_sessions_expiry_order_check CHECK (((refresh_expires_at > access_expires_at) AND (access_expires_at > created_at))),
    CONSTRAINT identity_sessions_refresh_shape_check CHECK ((((session_kind = 'standard'::text) AND (refresh_token_hash IS NOT NULL) AND (refresh_expires_at IS NOT NULL)) OR ((session_kind = 'support'::text) AND (refresh_token_hash IS NULL) AND (refresh_expires_at IS NULL)))),
    CONSTRAINT identity_sessions_revocation_time_check CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at))),
    CONSTRAINT identity_sessions_session_kind_check CHECK ((session_kind = ANY (ARRAY['standard'::text, 'support'::text]))),
    CONSTRAINT identity_sessions_support_fingerprint_shape_check CHECK ((((session_kind = 'standard'::text) AND (support_payload_fingerprint IS NULL)) OR ((session_kind = 'support'::text) AND (support_payload_fingerprint IS NOT NULL)))),
    CONSTRAINT identity_sessions_support_shape_check CHECK ((((session_kind = 'standard'::text) AND (initiator_actor_id IS NULL) AND (support_request_id IS NULL) AND (support_reason IS NULL) AND (effective_roles IS NULL) AND (effective_permissions IS NULL)) OR ((session_kind = 'support'::text) AND (initiator_actor_id IS NOT NULL) AND (support_request_id IS NOT NULL) AND (length(TRIM(BOTH FROM support_reason)) >= 5) AND (effective_roles IS NOT NULL) AND (effective_permissions IS NOT NULL) AND (access_expires_at <= (created_at + '00:15:00'::interval)))))
);


--
-- Name: TABLE identity_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.identity_sessions IS 'Sovereign  access/refresh sessions; refresh tokens rotate and revoked sessions never reactivate.';


--
-- Name: COLUMN identity_sessions.previous_refresh_token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_sessions.previous_refresh_token_hash IS 'Hash of the immediately preceding refresh token, retained only to distinguish a concurrent retry from older replay.';


--
-- Name: COLUMN identity_sessions.refresh_rotated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.identity_sessions.refresh_rotated_at IS 'Timestamp of the most recent successful refresh rotation.';


--
-- Name: identity_support_session_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_support_session_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    support_request_id text NOT NULL,
    session_id text,
    target_actor_id text NOT NULL,
    initiator_actor_id text NOT NULL,
    event_type text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT identity_support_session_audit_event_type_check CHECK ((event_type = ANY (ARRAY['issued'::text, 'revoked'::text, 'expired'::text])))
);


--


--
-- Name: identity_account_deletions_outbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_account_deletions_outbox ALTER COLUMN id SET DEFAULT nextval('public.identity_account_deletions_outbox_id_seq'::regclass);


--
-- Name: identity_login_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.identity_login_attempts_id_seq'::regclass);


--
-- Name: identity_account_deletions_outbox identity_account_deletions_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_account_deletions_outbox
    ADD CONSTRAINT identity_account_deletions_outbox_pkey PRIMARY KEY (id);


--
-- Name: identity_activation_challenges identity_activation_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_pkey PRIMARY KEY (id);


--
-- Name: identity_actor_direct_permissions identity_actor_direct_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_direct_permissions
    ADD CONSTRAINT identity_actor_direct_permissions_pkey PRIMARY KEY (actor_id, permission_id, scope);


--
-- Name: identity_actor_lifecycle_events identity_actor_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_lifecycle_events
    ADD CONSTRAINT identity_actor_lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: identity_actor_roles identity_actor_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_roles
    ADD CONSTRAINT identity_actor_roles_pkey PRIMARY KEY (actor_id, role_id);


--
-- Name: identity_actors identity_actors_operatorcontext_nonblank_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.identity_actors
    ADD CONSTRAINT identity_actors_operatorcontext_nonblank_chk CHECK ((btrim(operator_context_id) <> ''::text)) NOT VALID;


--
-- Name: identity_actors identity_actors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actors
    ADD CONSTRAINT identity_actors_pkey PRIMARY KEY (id);


--
-- Name: identity_login_attempts identity_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_login_attempts
    ADD CONSTRAINT identity_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: identity_permission_vocabulary identity_permission_vocabulary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_permission_vocabulary
    ADD CONSTRAINT identity_permission_vocabulary_pkey PRIMARY KEY (id);


--
-- Name: identity_permission_vocabulary identity_permission_vocabulary_service_surface_action_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_permission_vocabulary
    ADD CONSTRAINT identity_permission_vocabulary_service_surface_action_key UNIQUE (service, surface, action);


--
-- Name: identity_rbac_operation_ledger identity_rbac_operation_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_rbac_operation_ledger
    ADD CONSTRAINT identity_rbac_operation_ledger_pkey PRIMARY KEY (operator_context_id, caller, operation, idempotency_key);


--
-- Name: identity_role_permissions identity_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_role_permissions
    ADD CONSTRAINT identity_role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: identity_roles identity_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_roles
    ADD CONSTRAINT identity_roles_name_key UNIQUE (name);


--
-- Name: identity_roles identity_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_roles
    ADD CONSTRAINT identity_roles_pkey PRIMARY KEY (id);


--
-- Name: identity_sessions identity_sessions_access_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_access_token_hash_key UNIQUE (access_token_hash);


--
-- Name: identity_sessions identity_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_pkey PRIMARY KEY (id);


--
-- Name: identity_sessions identity_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: identity_support_session_audit identity_support_session_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_support_session_audit
    ADD CONSTRAINT identity_support_session_audit_pkey PRIMARY KEY (id);


--


--
-- Name: identity_account_deletions_outbox_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_account_deletions_outbox_pending_idx ON public.identity_account_deletions_outbox USING btree (created_at, id) WHERE (processed_at IS NULL);


--
-- Name: identity_activation_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_activation_idempotency_idx ON public.identity_activation_challenges USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: identity_activation_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_activation_lookup_idx ON public.identity_activation_challenges USING btree (actor_type, phone_e164, surface, created_at DESC);


--
-- Name: identity_activation_one_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_activation_one_pending_idx ON public.identity_activation_challenges USING btree (actor_type, phone_e164) WHERE (status = 'pending'::text);


--
-- Name: identity_activation_pending_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_activation_pending_expiry_idx ON public.identity_activation_challenges USING btree (expires_at, actor_id) WHERE (status = 'pending'::text);


--
-- Name: identity_actor_direct_permissions_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_actor_direct_permissions_actor_idx ON public.identity_actor_direct_permissions USING btree (actor_id);


--
-- Name: identity_actor_lifecycle_events_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_actor_lifecycle_events_actor_idx ON public.identity_actor_lifecycle_events USING btree (actor_id, created_at DESC);


--
-- Name: identity_actor_lifecycle_idempotency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_actor_lifecycle_idempotency_idx ON public.identity_actor_lifecycle_events USING btree (actor_id, status, correlation_id);


--
-- Name: identity_actors_phone_e164_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_actors_phone_e164_idx ON public.identity_actors USING btree (phone_e164) WHERE (phone_e164 IS NOT NULL);


--
-- Name: identity_actors_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_actors_username_key ON public.identity_actors USING btree (lower(btrim(username)));


--
-- Name: identity_deletion_outbox_delivery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_deletion_outbox_delivery_idx ON public.identity_account_deletions_outbox USING btree (next_attempt_at, id) WHERE (processed_at IS NULL);


--
-- Name: identity_deletion_outbox_event_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX identity_deletion_outbox_event_key_idx ON public.identity_account_deletions_outbox USING btree (event_key);


--
-- Name: identity_deletion_outbox_reconciliation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_deletion_outbox_reconciliation_idx ON public.identity_account_deletions_outbox USING btree (actor_id, created_at DESC);


--
-- Name: identity_login_attempts_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_login_attempts_time_idx ON public.identity_login_attempts USING btree (created_at);


--
-- Name: identity_login_attempts_username_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_login_attempts_username_time_idx ON public.identity_login_attempts USING btree (username, created_at DESC);


--
-- Name: identity_rbac_operation_ledger_context_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_rbac_operation_ledger_context_updated_idx ON public.identity_rbac_operation_ledger USING btree (operator_context_id, updated_at);


--
-- Name: identity_rbac_operation_ledger_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_rbac_operation_ledger_updated_idx ON public.identity_rbac_operation_ledger USING btree (updated_at);


--
-- Name: identity_sessions_access_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_sessions_access_expiry_idx ON public.identity_sessions USING btree (access_expires_at) WHERE (revoked_at IS NULL);


--
-- Name: identity_sessions_actor_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_sessions_actor_active_idx ON public.identity_sessions USING btree (actor_id, access_expires_at DESC) WHERE (revoked_at IS NULL);


--
-- Name: identity_sessions_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_sessions_actor_idx ON public.identity_sessions USING btree (actor_id, created_at DESC);


--
-- Name: identity_sessions_refresh_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_sessions_refresh_expiry_idx ON public.identity_sessions USING btree (refresh_expires_at) WHERE (revoked_at IS NULL);


--
-- Name: idx_identity_sessions_compromised; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_identity_sessions_compromised ON public.identity_sessions USING btree (compromised_at) WHERE (compromised_at IS NOT NULL);


--
-- Name: idx_identity_support_audit_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_identity_support_audit_request ON public.identity_support_session_audit USING btree (support_request_id, created_at DESC);


--
-- Name: idx_identity_support_initiator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_identity_support_initiator ON public.identity_sessions USING btree (initiator_actor_id, created_at DESC) WHERE (session_kind = 'support'::text);


--
-- Name: uq_identity_support_request_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_identity_support_request_active ON public.identity_sessions USING btree (support_request_id) WHERE ((session_kind = 'support'::text) AND (revoked_at IS NULL));


--
-- Name: INDEX uq_identity_support_request_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_identity_support_request_active IS 'Exactly one usable support credential may exist for an approved request; retries rotate it under the same fingerprint.';


--
-- Name: uq_identity_support_request_fingerprint_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_identity_support_request_fingerprint_active ON public.identity_sessions USING btree (support_request_id, support_payload_fingerprint) WHERE ((session_kind = 'support'::text) AND (revoked_at IS NULL));


--
-- Name: INDEX uq_identity_support_request_fingerprint_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.uq_identity_support_request_fingerprint_active IS 'Support request payload identity is replayable only while the resulting credential remains active.';


--
-- Name: identity_sessions identity_activation_session_causality_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_activation_session_causality_guard BEFORE INSERT ON public.identity_sessions FOR EACH ROW EXECUTE FUNCTION public.identity_require_consumed_challenge_for_activation_session();


--
-- Name: identity_actors identity_actor_access_projection_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_actor_access_projection_guard BEFORE INSERT OR UPDATE OF roles, permissions ON public.identity_actors FOR EACH ROW EXECUTE FUNCTION public.identity_guard_actor_access_projection();


--
-- Name: identity_actor_direct_permissions identity_actor_direct_permission_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_actor_direct_permission_projection AFTER INSERT OR DELETE OR UPDATE ON public.identity_actor_direct_permissions FOR EACH ROW EXECUTE FUNCTION public.identity_project_direct_permission_change();


--
-- Name: identity_actor_roles identity_actor_role_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_actor_role_projection AFTER INSERT OR DELETE OR UPDATE ON public.identity_actor_roles FOR EACH ROW EXECUTE FUNCTION public.identity_project_actor_role_change();


--
-- Name: identity_permission_vocabulary identity_permission_vocabulary_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_permission_vocabulary_projection AFTER UPDATE OF service, surface, action ON public.identity_permission_vocabulary FOR EACH ROW EXECUTE FUNCTION public.identity_project_permission_vocabulary_change();


--
-- Name: identity_roles identity_role_name_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_role_name_projection AFTER UPDATE OF name ON public.identity_roles FOR EACH ROW EXECUTE FUNCTION public.identity_project_role_name_change();


--
-- Name: identity_role_permissions identity_role_permission_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_role_permission_projection AFTER INSERT OR DELETE OR UPDATE ON public.identity_role_permissions FOR EACH ROW EXECUTE FUNCTION public.identity_project_role_permission_change();


--
-- Name: identity_sessions identity_sessions_capture_refresh_rotation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER identity_sessions_capture_refresh_rotation BEFORE UPDATE OF refresh_token_hash ON public.identity_sessions FOR EACH ROW EXECUTE FUNCTION public.identity_capture_refresh_rotation();


--
-- Name: identity_actors trg_identity_actors_operator_context_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_identity_actors_operator_context_immutable BEFORE UPDATE OF operator_context_id ON public.identity_actors FOR EACH ROW EXECUTE FUNCTION public.trg_fn_identity_actors_prevent_operator_context_mutation();


--
-- Name: identity_activation_challenges identity_activation_challenges_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_activation_challenges identity_activation_challenges_issued_by_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_issued_by_actor_id_fkey FOREIGN KEY (issued_by_actor_id) REFERENCES public.identity_actors(id);


--
-- Name: identity_actor_direct_permissions identity_actor_direct_permissions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_direct_permissions
    ADD CONSTRAINT identity_actor_direct_permissions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_actor_direct_permissions identity_actor_direct_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_direct_permissions
    ADD CONSTRAINT identity_actor_direct_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.identity_permission_vocabulary(id) ON DELETE CASCADE;


--
-- Name: identity_actor_lifecycle_events identity_actor_lifecycle_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_lifecycle_events
    ADD CONSTRAINT identity_actor_lifecycle_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_actor_lifecycle_events identity_actor_lifecycle_requester_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_lifecycle_events
    ADD CONSTRAINT identity_actor_lifecycle_requester_fk FOREIGN KEY (requested_by_actor_id) REFERENCES public.identity_actors(id) NOT VALID;


--
-- Name: identity_actor_roles identity_actor_roles_actor_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_roles
    ADD CONSTRAINT identity_actor_roles_actor_fk FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_actor_roles identity_actor_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_actor_roles
    ADD CONSTRAINT identity_actor_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.identity_roles(id) ON DELETE CASCADE;


--
-- Name: identity_role_permissions identity_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_role_permissions
    ADD CONSTRAINT identity_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.identity_permission_vocabulary(id) ON DELETE CASCADE;


--
-- Name: identity_role_permissions identity_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_role_permissions
    ADD CONSTRAINT identity_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.identity_roles(id) ON DELETE CASCADE;


--
-- Name: identity_sessions identity_sessions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_sessions identity_sessions_initiator_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_initiator_actor_id_fkey FOREIGN KEY (initiator_actor_id) REFERENCES public.identity_actors(id) ON DELETE RESTRICT;


--
-- Name: identity_support_session_audit identity_support_session_audit_initiator_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_support_session_audit
    ADD CONSTRAINT identity_support_session_audit_initiator_actor_id_fkey FOREIGN KEY (initiator_actor_id) REFERENCES public.identity_actors(id) ON DELETE RESTRICT;


--
-- Name: identity_support_session_audit identity_support_session_audit_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_support_session_audit
    ADD CONSTRAINT identity_support_session_audit_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.identity_sessions(id) ON DELETE SET NULL;


--
-- Name: identity_support_session_audit identity_support_session_audit_target_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_support_session_audit
    ADD CONSTRAINT identity_support_session_audit_target_actor_id_fkey FOREIGN KEY (target_actor_id) REFERENCES public.identity_actors(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

