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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: external_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_providers (
    provider_id text NOT NULL,
    kind text NOT NULL,
    code text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT external_providers_kind_check CHECK ((kind = ANY (ARRAY['sms'::text, 'maps'::text, 'payment'::text, 'push'::text, 'email'::text, 'storage'::text, 'search'::text, 'fraud'::text])))
);


--
-- Name: COLUMN external_providers.credentials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_providers.credentials IS 'Backend-only secret material. Never return it in API responses, audit payloads, logs, or frontend state.';


--
-- Name: COLUMN external_providers.parameters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_providers.parameters IS 'Non-secret provider parameters. healthUrl is probed only when its hostname is explicitly allowlisted at runtime.';


--
-- Name: providers_action_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers_action_audit (
    id bigint NOT NULL,
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    target_id text,
    action text NOT NULL,
    from_state jsonb,
    to_state jsonb,
    reason text,
    correlation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT providers_action_audit_context_nonblank_chk CHECK ((btrim(operator_context_id) <> ''::text))
);


--
-- Name: providers_action_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.providers_action_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: providers_action_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.providers_action_audit_id_seq OWNED BY public.providers_action_audit.id;


--
-- Name: providers_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    operator_context_id text NOT NULL,
    CONSTRAINT providers_idempotency_context_nonblank_chk CHECK ((btrim(operator_context_id) <> ''::text))
);


--


--
-- Name: providers_action_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers_action_audit ALTER COLUMN id SET DEFAULT nextval('public.providers_action_audit_id_seq'::regclass);


--
-- Name: external_providers external_providers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_providers
    ADD CONSTRAINT external_providers_code_key UNIQUE (code);


--
-- Name: external_providers external_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_providers
    ADD CONSTRAINT external_providers_pkey PRIMARY KEY (provider_id);


--
-- Name: providers_action_audit providers_action_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers_action_audit
    ADD CONSTRAINT providers_action_audit_pkey PRIMARY KEY (id);


--
-- Name: providers_idempotency providers_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers_idempotency
    ADD CONSTRAINT providers_idempotency_pkey PRIMARY KEY (operator_context_id, actor_id, operation, idempotency_key);


--


--
-- Name: external_providers_kind_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_providers_kind_active_idx ON public.external_providers USING btree (kind, active, updated_at DESC);


--
-- Name: providers_action_audit_context_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX providers_action_audit_context_created_idx ON public.providers_action_audit USING btree (operator_context_id, created_at DESC);


--
-- PostgreSQL database dump complete
--

