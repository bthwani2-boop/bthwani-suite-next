--
-- PostgreSQL database cluster dump
--

\restrict 0TT3k832YDE5bICrWjWi68BCVfuV64N6hkUoloPJYVPiq4sZh7XiVki39ovyVwQ

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE bthwani_runtime;
ALTER ROLE bthwani_runtime WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:BWly3iKb1m6TMxXZJNxH4w==$oznOmLnLZHz/YXimkCyQxxXac1HegYvEAuEb1P7ETxI=:mfU8lQseNuQliZcjScT/ukOO2SOF2QzHwCVqNr+m0H0=';
CREATE ROLE dsh_local;
ALTER ROLE dsh_local WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ONmcEyGIYiCUA+7Ln8kerQ==$LP6FwMpU/L5Kquwke3cyioFNuC70wZz8uu6PQtEqAx4=:/7cHFY9sX7aAMSpQMWDXNJLY1XKsPw+glc7glRxItSM=';
CREATE ROLE dsh_runtime;
ALTER ROLE dsh_runtime WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:q5g2kH22gUuW0x6CUF0foA==$FRUehF7RlgN95OU9Uyry2AsZflbwehDpag/KlHWjpXQ=:D4nOnlWFXacymH0qeRAKbDXK3L94CcCzpYj+W3j/Tuc=';
CREATE ROLE identity_runtime;
ALTER ROLE identity_runtime WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:iQMn4mHr5rI0thAC8QNr/A==$adC3CxZU56V4jaLFtdy3sFjPnxOzcullARb9YJYB5Q0=:e0jNGGpn1GLys68U5dhBL7j2o+Wdbp/w56X0ollIdCM=';
CREATE ROLE wlt_runtime;
ALTER ROLE wlt_runtime WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:FDP6uKdwZCc6ku31SZcvDg==$tcQ9qryWQv4rxRqPVOW28pUIl2Hd/1edH6xduKNUtYA=:ODTai1aOtkgbqQaRxyCpBlb2HXOYPhAX8X9iZbvUr8A=';
CREATE ROLE workforce_runtime;
ALTER ROLE workforce_runtime WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:Wsh5HGImfanvamTEksZ6ZA==$EDATeA7S73tQj9fg+stX5MCIgHk2tsEq1PT15neF3yw=:Xz/sDpLMfCfgOr7KtjQufZKAW7v628Pz+efVXXrCxd4=';

--
-- User Configurations
--








\unrestrict 0TT3k832YDE5bICrWjWi68BCVfuV64N6hkUoloPJYVPiq4sZh7XiVki39ovyVwQ

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict 8DceFv6HmK2qewTVPaRISXlyuhdPQazZBefv2dVmb1nnLUKRTslAdx0iDIqlZjq

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict 8DceFv6HmK2qewTVPaRISXlyuhdPQazZBefv2dVmb1nnLUKRTslAdx0iDIqlZjq

--
-- Database "bthwani_runtime" dump
--

--
-- PostgreSQL database dump
--

\restrict I7beoH2dH6uKn89xS2TemAuzZyJSsDKvGwsYpNIvYch3fDrEqblDes3JeWBqAiJ

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: bthwani_runtime; Type: DATABASE; Schema: -; Owner: bthwani_runtime
--

CREATE DATABASE bthwani_runtime WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE bthwani_runtime OWNER TO bthwani_runtime;

\unrestrict I7beoH2dH6uKn89xS2TemAuzZyJSsDKvGwsYpNIvYch3fDrEqblDes3JeWBqAiJ
\connect bthwani_runtime
\restrict I7beoH2dH6uKn89xS2TemAuzZyJSsDKvGwsYpNIvYch3fDrEqblDes3JeWBqAiJ

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict I7beoH2dH6uKn89xS2TemAuzZyJSsDKvGwsYpNIvYch3fDrEqblDes3JeWBqAiJ

--
-- Database "dsh_local" dump
--

--
-- PostgreSQL database dump
--

\restrict O9SiDuMBJaYcXSsIdOJCqdo2OTiNTleahozuVqAGIZuW6QgehdurosSGUcVnqLl

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dsh_local; Type: DATABASE; Schema: -; Owner: dsh_local
--

CREATE DATABASE dsh_local WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE dsh_local OWNER TO dsh_local;

\unrestrict O9SiDuMBJaYcXSsIdOJCqdo2OTiNTleahozuVqAGIZuW6QgehdurosSGUcVnqLl
\connect dsh_local
\restrict O9SiDuMBJaYcXSsIdOJCqdo2OTiNTleahozuVqAGIZuW6QgehdurosSGUcVnqLl

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict O9SiDuMBJaYcXSsIdOJCqdo2OTiNTleahozuVqAGIZuW6QgehdurosSGUcVnqLl

--
-- Database "dsh_runtime" dump
--

--
-- PostgreSQL database dump
--

\restrict BecOYJwlDyZSwJvKZIoFcp8ci4frouu0HjnF0MlpPh48u9zuGJrgHIlKIcbQKTV

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dsh_runtime; Type: DATABASE; Schema: -; Owner: dsh_runtime
--

CREATE DATABASE dsh_runtime WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE dsh_runtime OWNER TO dsh_runtime;

\unrestrict BecOYJwlDyZSwJvKZIoFcp8ci4frouu0HjnF0MlpPh48u9zuGJrgHIlKIcbQKTV
\connect dsh_runtime
\restrict BecOYJwlDyZSwJvKZIoFcp8ci4frouu0HjnF0MlpPh48u9zuGJrgHIlKIcbQKTV

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dsh_admin_audit; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_admin_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_id text,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_admin_audit OWNER TO dsh_runtime;

--
-- Name: dsh_admin_captain_credentials; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_admin_captain_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    captain_id text NOT NULL,
    license_number text,
    vehicle_type text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_admin_captain_credentials_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])))
);


ALTER TABLE public.dsh_admin_captain_credentials OWNER TO dsh_runtime;

--
-- Name: dsh_admin_partner_activations; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_admin_partner_activations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    reviewed_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_admin_partner_activations_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'ops_approved'::text, 'partner_active'::text, 'blocked'::text])))
);


ALTER TABLE public.dsh_admin_partner_activations OWNER TO dsh_runtime;

--
-- Name: dsh_admin_roles; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_admin_roles OWNER TO dsh_runtime;

--
-- Name: dsh_admin_staff_assignments; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_admin_staff_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    role_id uuid NOT NULL,
    assigned_by text,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_admin_staff_assignments OWNER TO dsh_runtime;

--
-- Name: dsh_assignments; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    captain_id text NOT NULL,
    assigned_by text NOT NULL,
    status text DEFAULT 'offered'::text NOT NULL,
    response_deadline_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_assignments_status_check CHECK ((status = ANY (ARRAY['offered'::text, 'accepted'::text, 'declined'::text, 'completed'::text])))
);


ALTER TABLE public.dsh_assignments OWNER TO dsh_runtime;

--
-- Name: dsh_cart_items; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_cart_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT dsh_cart_items_unit_price_chk CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.dsh_cart_items OWNER TO dsh_runtime;

--
-- Name: dsh_carts; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_carts OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_approval_audit_trail; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_catalog_approval_audit_trail OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_approval_records; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_approval_records_entity_type_check CHECK ((entity_type = ANY (ARRAY['product'::text, 'product-media'::text, 'category-suggestion'::text, 'store'::text, 'partner-offer'::text, 'video'::text, 'banner'::text, 'promo'::text]))),
    CONSTRAINT dsh_catalog_approval_records_source_check CHECK ((source = ANY (ARRAY['app-partner'::text, 'app-field'::text, 'control-panel-partners'::text, 'control-panel-marketing'::text, 'control-panel-catalog'::text, 'app-client'::text]))),
    CONSTRAINT dsh_catalog_approval_records_stage_check CHECK ((stage = ANY (ARRAY['partner-submitted'::text, 'field-submitted'::text, 'partner-review'::text, 'partner-approved'::text, 'marketing-review'::text, 'marketing-approved'::text, 'catalog-adopted'::text, 'client-visible'::text, 'rejected'::text, 'needs-fix'::text])))
);


ALTER TABLE public.dsh_catalog_approval_records OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_asset_links; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_asset_links_entity_type_check CHECK ((entity_type = ANY (ARRAY['domain'::text, 'node'::text, 'master_product'::text, 'product_proposal'::text, 'store_assortment'::text, 'collection'::text, 'campaign'::text, 'store'::text]))),
    CONSTRAINT dsh_catalog_asset_links_role_check CHECK ((role = ANY (ARRAY['icon'::text, 'cover'::text, 'thumbnail'::text, 'gallery'::text, 'canonical_product_image'::text, 'partner_custom_product_image'::text, 'marketing_banner'::text, 'document'::text, 'store_logo'::text, 'store_cover'::text, 'storefront_photo'::text, 'interior_photo'::text, 'signage_photo'::text, 'reel_video'::text]))),
    CONSTRAINT dsh_catalog_asset_links_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


ALTER TABLE public.dsh_catalog_asset_links OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_assets; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_assets_source_surface_check CHECK ((source_surface = ANY (ARRAY['control-panel-catalog'::text, 'control-panel-platform'::text, 'app-partner'::text, 'app-field'::text, 'system'::text]))),
    CONSTRAINT dsh_catalog_assets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'uploaded'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


ALTER TABLE public.dsh_catalog_assets OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_attribute_options; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_catalog_attribute_options (
    id text NOT NULL,
    attribute_id text NOT NULL,
    code text NOT NULL,
    label_ar text NOT NULL,
    label_en text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.dsh_catalog_attribute_options OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_attributes; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_attributes_data_type_check CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'enum'::text, 'multi_enum'::text, 'measurement'::text, 'money'::text, 'date'::text, 'media'::text])))
);


ALTER TABLE public.dsh_catalog_attributes OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_collection_items; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_catalog_collection_items (
    id text NOT NULL,
    collection_id text NOT NULL,
    master_product_id text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.dsh_catalog_collection_items OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_collections; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_catalog_collections OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_domains; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_catalog_domains OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_legacy_archive; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_catalog_legacy_archive OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_node_attribute_rules; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_node_attribute_rules_check CHECK (((node_id IS NOT NULL) OR (domain_id IS NOT NULL)))
);


ALTER TABLE public.dsh_catalog_node_attribute_rules OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_nodes; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_catalog_nodes_level_check CHECK ((level = ANY (ARRAY['BUSINESS_SUBDOMAIN'::text, 'PRODUCT_MAIN_CLASS'::text, 'PRODUCT_SUB_CLASS'::text])))
);


ALTER TABLE public.dsh_catalog_nodes OWNER TO dsh_runtime;

--
-- Name: dsh_catalog_platform_policies; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_catalog_platform_policies (
    id text NOT NULL,
    domain_id text,
    node_id text,
    policy_scope text NOT NULL,
    platform_commission_rate numeric(6,4) DEFAULT 0 NOT NULL,
    field_partner_onboarding_commission_amount numeric(12,2) DEFAULT 0 NOT NULL,
    field_partner_onboarding_commission_currency text DEFAULT 'YER'::text NOT NULL,
    store_onboarding_fee_amount numeric(12,2) DEFAULT 0 NOT NULL,
    store_onboarding_fee_currency text DEFAULT 'YER'::text NOT NULL,
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
    CONSTRAINT dsh_catalog_platform_policies_check CHECK ((((policy_scope = 'domain'::text) AND (domain_id IS NOT NULL) AND (node_id IS NULL)) OR ((policy_scope = 'node'::text) AND (node_id IS NOT NULL)) OR ((policy_scope = 'default'::text) AND (domain_id IS NULL) AND (node_id IS NULL)))),
    CONSTRAINT dsh_catalog_platform_policies_policy_scope_check CHECK ((policy_scope = ANY (ARRAY['domain'::text, 'node'::text, 'default'::text])))
);


ALTER TABLE public.dsh_catalog_platform_policies OWNER TO dsh_runtime;

--
-- Name: dsh_checkout_intents; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_checkout_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    cart_id uuid NOT NULL,
    store_id text NOT NULL,
    fulfillment_mode text DEFAULT 'bthwani_delivery'::text NOT NULL,
    state text DEFAULT 'pending'::text NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    wlt_payment_session_id text DEFAULT ''::text NOT NULL,
    delivery_address text DEFAULT ''::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_checkout_intents_fulfillment_mode_check CHECK ((fulfillment_mode = ANY (ARRAY['bthwani_delivery'::text, 'partner_delivery'::text, 'pickup'::text]))),
    CONSTRAINT dsh_checkout_intents_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'wallet'::text, 'mixed'::text, 'official_wallet'::text]))),
    CONSTRAINT dsh_checkout_intents_state_check CHECK ((state = ANY (ARRAY['pending'::text, 'wlt_handoff_failed'::text, 'payment_pending'::text, 'payment_confirmed'::text, 'payment_failed'::text, 'confirmed'::text, 'cancelled'::text, 'expired'::text])))
);


ALTER TABLE public.dsh_checkout_intents OWNER TO dsh_runtime;

--
-- Name: dsh_deliveries; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    order_id uuid NOT NULL,
    captain_id text NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    pod_method text,
    pod_reference text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_deliveries_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'driver_assigned'::text, 'driver_arrived_store'::text, 'picked_up'::text, 'arrived_customer'::text, 'delivered'::text])))
);


ALTER TABLE public.dsh_deliveries OWNER TO dsh_runtime;

--
-- Name: dsh_field_visits; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_field_visits_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'complete'::text, 'escalated'::text]))),
    CONSTRAINT dsh_field_visits_visit_type_check CHECK ((visit_type = ANY (ARRAY['onboarding'::text, 'periodic'::text, 'escalation_followup'::text])))
);


ALTER TABLE public.dsh_field_visits OWNER TO dsh_runtime;

--
-- Name: dsh_home_banners; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_home_banners_action_type_check CHECK ((action_type = ANY (ARRAY['store'::text, 'category'::text, 'external'::text, 'none'::text])))
);


ALTER TABLE public.dsh_home_banners OWNER TO dsh_runtime;

--
-- Name: dsh_home_content_audit; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_home_content_audit OWNER TO dsh_runtime;

--
-- Name: dsh_home_promos; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_home_promos_action_type_check CHECK ((action_type = ANY (ARRAY['store'::text, 'category'::text, 'external'::text, 'none'::text])))
);


ALTER TABLE public.dsh_home_promos OWNER TO dsh_runtime;

--
-- Name: dsh_incidents; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_incidents_affected_scope_check CHECK ((affected_scope = ANY (ARRAY['delivery'::text, 'stores'::text, 'payments'::text, 'platform'::text, 'unknown'::text]))),
    CONSTRAINT dsh_incidents_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_incidents_status_check CHECK ((status = ANY (ARRAY['open'::text, 'monitoring'::text, 'resolved'::text])))
);


ALTER TABLE public.dsh_incidents OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_audit_events; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_audit_events OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_campaigns; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_marketing_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT dsh_marketing_campaigns_target_type_chk CHECK (((target_type IS NULL) OR (target_type = ANY (ARRAY['home'::text, 'stores'::text, 'store'::text, 'category'::text, 'subcategory'::text, 'product'::text, 'offer'::text, 'campaign'::text, 'search'::text, 'custom'::text]))))
);


ALTER TABLE public.dsh_marketing_campaigns OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_clicks; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_clicks OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_impressions; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_impressions OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_target_bindings; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_target_bindings OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_tickers; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_tickers OWNER TO dsh_runtime;

--
-- Name: dsh_marketing_visibility_gates; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_marketing_visibility_gates OWNER TO dsh_runtime;

--
-- Name: dsh_master_product_attribute_values; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_master_product_attribute_values (
    id text NOT NULL,
    master_product_id text NOT NULL,
    attribute_id text NOT NULL,
    value_json jsonb NOT NULL,
    locale text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_master_product_attribute_values OWNER TO dsh_runtime;

--
-- Name: dsh_master_products; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_master_products_approval_status_check CHECK ((approval_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text])))
);


ALTER TABLE public.dsh_master_products OWNER TO dsh_runtime;

--
-- Name: dsh_media_refs; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_media_refs OWNER TO dsh_runtime;

--
-- Name: dsh_notification_preferences; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    topic text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_notification_preferences OWNER TO dsh_runtime;

--
-- Name: dsh_notifications; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_notifications_actor_type_check CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text, 'operator'::text])))
);


ALTER TABLE public.dsh_notifications OWNER TO dsh_runtime;

--
-- Name: dsh_order_items; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    CONSTRAINT dsh_order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT dsh_order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.dsh_order_items OWNER TO dsh_runtime;

--
-- Name: dsh_order_status_events; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_order_status_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    actor_role text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_order_status_events_actor_role_check CHECK ((actor_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text, 'system'::text])))
);


ALTER TABLE public.dsh_order_status_events OWNER TO dsh_runtime;

--
-- Name: dsh_orders; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'store_accepted'::text, 'preparing'::text, 'ready_for_pickup'::text, 'driver_assigned'::text, 'driver_arrived_store'::text, 'picked_up'::text, 'arrived_customer'::text, 'delivered'::text, 'cancelled'::text])))
);


ALTER TABLE public.dsh_orders OWNER TO dsh_runtime;

--
-- Name: dsh_partner_activation_events; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_partner_activation_events_actor_surface_check CHECK ((actor_surface = ANY (ARRAY['app-field'::text, 'app-partner'::text, 'app-captain'::text, 'control-panel'::text, 'system'::text])))
);


ALTER TABLE public.dsh_partner_activation_events OWNER TO dsh_runtime;

--
-- Name: dsh_partner_document_reviews; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_partner_document_reviews_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'needs_resubmit'::text])))
);


ALTER TABLE public.dsh_partner_document_reviews OWNER TO dsh_runtime;

--
-- Name: dsh_partner_documents; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_partner_documents_document_status_check CHECK ((document_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT dsh_partner_documents_document_type_check CHECK ((document_type = ANY (ARRAY['national_id'::text, 'commercial_register'::text, 'lease_agreement'::text, 'health_certificate'::text, 'store_photo'::text, 'owner_photo'::text, 'other'::text])))
);


ALTER TABLE public.dsh_partner_documents OWNER TO dsh_runtime;

--
-- Name: dsh_partner_field_visits; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_partner_field_visits_location_chk CHECK ((((location_latitude IS NULL) AND (location_longitude IS NULL)) OR ((location_latitude IS NOT NULL) AND (location_longitude IS NOT NULL)))),
    CONSTRAINT dsh_partner_field_visits_visit_status_check CHECK ((visit_status = ANY (ARRAY['draft'::text, 'in_progress'::text, 'submitted'::text, 'escalated'::text])))
);


ALTER TABLE public.dsh_partner_field_visits OWNER TO dsh_runtime;

--
-- Name: dsh_partner_offers; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_partner_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    partner_name text DEFAULT ''::text NOT NULL,
    store_id uuid NOT NULL,
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
    CONSTRAINT dsh_partner_offers_offer_type_check CHECK ((offer_type = ANY (ARRAY['discount'::text, 'free-delivery'::text, 'bundle'::text, 'buy-x-get-y'::text, 'coupon'::text]))),
    CONSTRAINT dsh_partner_offers_source_check CHECK ((source = ANY (ARRAY['partner'::text, 'control-panel'::text]))),
    CONSTRAINT dsh_partner_offers_status_check CHECK ((status = ANY (ARRAY['inbound'::text, 'review'::text, 'marketing-ready'::text, 'published'::text, 'paused'::text, 'rejected'::text, 'archived'::text])))
);


ALTER TABLE public.dsh_partner_offers OWNER TO dsh_runtime;

--
-- Name: dsh_partner_store_visibility_events; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_partner_store_visibility_events (
    id text DEFAULT ('psve_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) NOT NULL,
    partner_id text NOT NULL,
    store_id text NOT NULL,
    from_visibility text NOT NULL,
    to_visibility text NOT NULL,
    actor_id text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_partner_store_visibility_events OWNER TO dsh_runtime;

--
-- Name: dsh_partners; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    bank_name text DEFAULT ''::text NOT NULL,
    bank_branch text DEFAULT ''::text NOT NULL,
    bank_account_number text DEFAULT ''::text NOT NULL,
    bank_iban text DEFAULT ''::text NOT NULL,
    payout_mobile_number text DEFAULT ''::text NOT NULL,
    settlement_preference text DEFAULT ''::text NOT NULL,
    bank_account_holder_matches_owner boolean DEFAULT false NOT NULL,
    bank_notes text DEFAULT ''::text NOT NULL,
    CONSTRAINT dsh_partners_activation_status_check CHECK ((activation_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'field_visit_scheduled'::text, 'field_visit_completed'::text, 'documents_missing'::text, 'documents_uploaded'::text, 'documents_verified'::text, 'catalog_not_ready'::text, 'catalog_ready'::text, 'delivery_modes_not_ready'::text, 'delivery_modes_ready'::text, 'ops_review'::text, 'ops_approved'::text, 'ops_rejected'::text, 'partner_active'::text, 'partner_deactivated'::text, 'client_visible'::text, 'client_hidden'::text]))),
    CONSTRAINT dsh_partners_category_check CHECK ((category = ANY (ARRAY['restaurant'::text, 'grocery'::text, 'pharmacy'::text, 'bakery'::text, 'default'::text]))),
    CONSTRAINT dsh_partners_created_by_surface_check CHECK ((created_by_surface = ANY (ARRAY['app-field'::text, 'control-panel'::text, 'system'::text]))),
    CONSTRAINT dsh_partners_legal_identity_type_check CHECK ((legal_identity_type = ANY (ARRAY['commercial_register'::text, 'national_id'::text, 'freelancer_certificate'::text]))),
    CONSTRAINT dsh_partners_settlement_preference_check CHECK ((settlement_preference = ANY (ARRAY[''::text, 'bank_transfer'::text, 'mobile_wallet'::text])))
);


ALTER TABLE public.dsh_partners OWNER TO dsh_runtime;

--
-- Name: dsh_platform_capacity; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_platform_capacity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id text NOT NULL,
    max_concurrent_orders integer DEFAULT 100 NOT NULL,
    max_captains_online integer DEFAULT 50 NOT NULL,
    throttle_threshold integer DEFAULT 80 NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_platform_capacity OWNER TO dsh_runtime;

--
-- Name: dsh_platform_notification_config; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_platform_notification_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic text NOT NULL,
    actor_types text[] DEFAULT '{}'::text[] NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    description text,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_platform_notification_config OWNER TO dsh_runtime;

--
-- Name: dsh_platform_sla_rules; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_platform_sla_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id text NOT NULL,
    category text NOT NULL,
    max_prep_mins integer DEFAULT 30 NOT NULL,
    max_delivery_mins integer DEFAULT 60 NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_platform_sla_rules OWNER TO dsh_runtime;

--
-- Name: dsh_platform_store_onboarding_fee_policy; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_platform_store_onboarding_fee_policy (
    id smallint DEFAULT 1 NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    applies_to text DEFAULT 'first_store'::text NOT NULL,
    charge_timing text DEFAULT 'on_approval'::text NOT NULL,
    actor_charged text DEFAULT 'partner'::text NOT NULL,
    effective_from timestamp with time zone,
    notes text DEFAULT ''::text NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_platform_store_onboarding_fee_policy_actor_charged_check CHECK ((actor_charged = 'partner'::text)),
    CONSTRAINT dsh_platform_store_onboarding_fee_policy_applies_to_check CHECK ((applies_to = ANY (ARRAY['first_store'::text, 'additional_store'::text, 'all_stores'::text]))),
    CONSTRAINT dsh_platform_store_onboarding_fee_policy_charge_timing_check CHECK ((charge_timing = ANY (ARRAY['on_approval'::text, 'on_publication'::text, 'on_first_order'::text, 'manual'::text]))),
    CONSTRAINT dsh_platform_store_onboarding_fee_policy_id_check CHECK ((id = 1))
);


ALTER TABLE public.dsh_platform_store_onboarding_fee_policy OWNER TO dsh_runtime;

--
-- Name: dsh_platform_zones; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_platform_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city_code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_platform_zones OWNER TO dsh_runtime;

--
-- Name: dsh_product_duplicate_candidates; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_product_duplicate_candidates OWNER TO dsh_runtime;

--
-- Name: dsh_product_proposal_audit; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_product_proposal_audit OWNER TO dsh_runtime;

--
-- Name: dsh_product_proposals; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT chk_dsh_product_proposals_status CHECK ((status = ANY (ARRAY['catalog-draft'::text, 'partner-proposed'::text, 'partner-review'::text, 'marketing-review'::text, 'catalog-adopted'::text, 'catalog-approved'::text, 'client-visible'::text, 'needs-fix'::text, 'rejected'::text]))),
    CONSTRAINT dsh_product_proposals_source_surface_check CHECK ((source_surface = ANY (ARRAY['app-field'::text, 'app-partner'::text, 'control-panel-catalog'::text, 'control-panel-platform'::text])))
);


ALTER TABLE public.dsh_product_proposals OWNER TO dsh_runtime;

--
-- Name: dsh_readiness_checks; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_readiness_checks_check_type_check CHECK ((check_type = ANY (ARRAY['location_verified'::text, 'documents_uploaded'::text, 'product_list_submitted'::text, 'equipment_checked'::text, 'safety_compliant'::text, 'hygiene_compliant'::text]))),
    CONSTRAINT dsh_readiness_checks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])))
);


ALTER TABLE public.dsh_readiness_checks OWNER TO dsh_runtime;

--
-- Name: dsh_readiness_escalations; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_readiness_escalations_category_check CHECK ((category = ANY (ARRAY['document_missing'::text, 'safety_violation'::text, 'location_mismatch'::text, 'product_compliance'::text, 'equipment_failure'::text, 'other'::text]))),
    CONSTRAINT dsh_readiness_escalations_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT dsh_readiness_escalations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text, 'escalated_further'::text])))
);


ALTER TABLE public.dsh_readiness_escalations OWNER TO dsh_runtime;

--
-- Name: dsh_reels; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_reels_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text, 'archived'::text]))),
    CONSTRAINT dsh_reels_target_type_check CHECK ((target_type = ANY (ARRAY['master_product'::text, 'store'::text, 'offer'::text])))
);


ALTER TABLE public.dsh_reels OWNER TO dsh_runtime;

--
-- Name: dsh_store_action_audit; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_store_action_audit OWNER TO dsh_runtime;

--
-- Name: dsh_store_actor_scopes; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_store_actor_scopes (
    actor_id text NOT NULL,
    actor_role text NOT NULL,
    store_id text NOT NULL,
    scope_type text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_actor_scopes_actor_role_check CHECK ((actor_role = ANY (ARRAY['partner'::text, 'field'::text, 'captain'::text, 'operator'::text]))),
    CONSTRAINT dsh_store_actor_scopes_scope_type_check CHECK ((scope_type = ANY (ARRAY['own'::text, 'assigned'::text, 'all'::text])))
);


ALTER TABLE public.dsh_store_actor_scopes OWNER TO dsh_runtime;

--
-- Name: dsh_store_assortments; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_store_assortments (
    id text NOT NULL,
    store_id text NOT NULL,
    master_product_id text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    available boolean DEFAULT true NOT NULL,
    stock_status text DEFAULT 'in_stock'::text NOT NULL,
    local_note text DEFAULT ''::text NOT NULL,
    custom_image_object_key text,
    publication_status text DEFAULT 'draft'::text NOT NULL,
    submitted_by text DEFAULT ''::text NOT NULL,
    approved_by text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_store_assortments_publication_status_check CHECK ((publication_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'client_visible'::text, 'rejected'::text, 'hidden'::text]))),
    CONSTRAINT dsh_store_assortments_stock_status_check CHECK ((stock_status = ANY (ARRAY['in_stock'::text, 'low_stock'::text, 'out_of_stock'::text]))),
    CONSTRAINT dsh_store_assortments_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.dsh_store_assortments OWNER TO dsh_runtime;

--
-- Name: dsh_store_field_verifications; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_store_field_verifications OWNER TO dsh_runtime;

--
-- Name: dsh_store_idempotency; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_store_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dsh_store_idempotency OWNER TO dsh_runtime;

--
-- Name: dsh_store_pickup_readiness_reports; Type: TABLE; Schema: public; Owner: dsh_runtime
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


ALTER TABLE public.dsh_store_pickup_readiness_reports OWNER TO dsh_runtime;

--
-- Name: dsh_stores; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    storefront_photo_ref text DEFAULT ''::text NOT NULL,
    interior_photo_ref text DEFAULT ''::text NOT NULL,
    signage_photo_ref text DEFAULT ''::text NOT NULL,
    catalog_domain_id text DEFAULT 'domain-bthwani-store'::text NOT NULL,
    CONSTRAINT dsh_stores_catalog_approval_chk CHECK ((catalog_approval_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT dsh_stores_delivery_modes_chk CHECK ((delivery_modes <@ ARRAY['delivery'::text, 'pickup'::text, 'express'::text])),
    CONSTRAINT dsh_stores_distance_chk CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT dsh_stores_eta_chk CHECK (((delivery_eta_min IS NULL) OR (delivery_eta_max IS NULL) OR (delivery_eta_min <= delivery_eta_max))),
    CONSTRAINT dsh_stores_follower_count_chk CHECK ((follower_count >= 0)),
    CONSTRAINT dsh_stores_marketing_visibility_chk CHECK ((marketing_visibility = ANY (ARRAY['hidden'::text, 'visible'::text]))),
    CONSTRAINT dsh_stores_partner_readiness_chk CHECK ((partner_readiness = ANY (ARRAY['pending'::text, 'ready'::text, 'blocked'::text]))),
    CONSTRAINT dsh_stores_points_multiplier_chk CHECK (((points_multiplier IS NULL) OR (points_multiplier >= 1))),
    CONSTRAINT dsh_stores_rating_average_chk CHECK (((rating_average IS NULL) OR ((rating_average >= (0)::numeric) AND (rating_average <= (5)::numeric)))),
    CONSTRAINT dsh_stores_rating_count_chk CHECK ((rating_count >= 0)),
    CONSTRAINT dsh_stores_serviceability_chk CHECK ((serviceability_status = ANY (ARRAY['serviceable'::text, 'limited'::text, 'out_of_area'::text, 'unavailable'::text]))),
    CONSTRAINT dsh_stores_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'temporarily_closed'::text, 'unavailable'::text])))
);


ALTER TABLE public.dsh_stores OWNER TO dsh_runtime;

--
-- Name: dsh_support_messages; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id text NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_support_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text, 'system'::text])))
);


ALTER TABLE public.dsh_support_messages OWNER TO dsh_runtime;

--
-- Name: dsh_support_tickets; Type: TABLE; Schema: public; Owner: dsh_runtime
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
    CONSTRAINT dsh_support_tickets_category_check CHECK ((category = ANY (ARRAY['order_issue'::text, 'delivery_issue'::text, 'store_quality'::text, 'payment_reference'::text, 'account_access'::text, 'app_bug'::text, 'other'::text]))),
    CONSTRAINT dsh_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT dsh_support_tickets_reporter_role_check CHECK ((reporter_role = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'operator'::text]))),
    CONSTRAINT dsh_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'pending_user'::text, 'resolved'::text, 'closed'::text])))
);


ALTER TABLE public.dsh_support_tickets OWNER TO dsh_runtime;

--
-- Name: dsh_wlt_outbox_events; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.dsh_wlt_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    order_id uuid NOT NULL,
    captain_id text NOT NULL,
    partner_id text NOT NULL,
    checkout_intent_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dsh_wlt_outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


ALTER TABLE public.dsh_wlt_outbox_events OWNER TO dsh_runtime;

--
-- Name: runtime_schema_migrations; Type: TABLE; Schema: public; Owner: dsh_runtime
--

CREATE TABLE public.runtime_schema_migrations (
    migration_name text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.runtime_schema_migrations OWNER TO dsh_runtime;

--
-- Data for Name: dsh_admin_audit; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_admin_audit (id, actor_id, action, target_id, detail, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_admin_captain_credentials; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_admin_captain_credentials (id, captain_id, license_number, vehicle_type, status, reviewed_by, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_admin_partner_activations; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_admin_partner_activations (id, partner_id, status, reviewed_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_admin_roles; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_admin_roles (id, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_admin_staff_assignments; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_admin_staff_assignments (id, actor_id, role_id, assigned_by, assigned_at) FROM stdin;
\.


--
-- Data for Name: dsh_assignments; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_assignments (id, order_id, captain_id, assigned_by, status, response_deadline_at, accepted_at, declined_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_cart_items; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_cart_items (id, cart_id, product_id, product_name, price_reference, quantity, version, created_at, updated_at, unit_price, master_product_id, store_assortment_id) FROM stdin;
\.


--
-- Data for Name: dsh_carts; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_carts (id, client_id, store_id, fulfillment_mode, state, note, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_approval_audit_trail; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_approval_audit_trail (id, approval_record_id, from_stage, to_stage, owner, action_label, at) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_approval_records; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_approval_records (id, entity_type, entity_id, source, stage, title, metadata, submitted_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_asset_links; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_asset_links (id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status, created_at, updated_at) FROM stdin;
link-node-dairy-cheese	asset-node-dairy-cheese	node	node-dairy-cheese	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-node-canned-food	asset-node-canned-food	node	node-canned-food	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-node-local-vegetables	asset-node-local-vegetables	node	node-local-vegetables	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-node-imported-fruits	asset-node-imported-fruits	node	node-imported-fruits	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-node-sweets-cake	asset-node-sweets-cake	node	node-sweets-cake	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-node-sweets-chocolate	asset-node-sweets-chocolate	node	node-sweets-chocolate	cover	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-product-cheese-kraft	asset-product-cheese-kraft	master_product	product-cheese-kraft	canonical_product_image	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-product-canned-tuna	asset-product-canned-tuna	master_product	product-canned-tuna	canonical_product_image	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-product-local-tomato	asset-product-local-tomato	master_product	product-local-tomato	canonical_product_image	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-product-imported-banana	asset-product-imported-banana	master_product	product-imported-banana	canonical_product_image	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
link-product-chocolate-box	asset-product-chocolate-box	master_product	product-chocolate-box	canonical_product_image	0	t	approved	2026-07-13 21:43:45.829076+00	2026-07-13 21:43:45.829076+00
\.


--
-- Data for Name: dsh_catalog_assets; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_assets (id, object_key, public_url, original_file_name, mime_type, size_bytes, width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by, reviewed_by, review_note, created_at, updated_at, intended_entity_type, intended_entity_id, intended_role) FROM stdin;
asset-node-dairy-cheese	node-dairy-cheese.png	\N	node-dairy-cheese.png	image/png	135	64	64	3362e728cdca6501caf4cf3c238cda60ddea24ad80051f353844bff0d0494781	ألبان وأجبان	Dairy & Cheese	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-node-canned-food	node-canned-food.png	\N	node-canned-food.png	image/png	133	64	64	cc988aab52b1791de1317102c99e3a5ef75bf88e4f92973ed2fabfccfd9f2555	أغذية معلبة	Canned Food	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-node-local-vegetables	node-local-vegetables.png	\N	node-local-vegetables.png	image/png	135	64	64	23a6201d9c7a08cdc934cfe9e4d552c941391812d7c685ed5ac52376cefa5c23	خضروات محلية	Local Vegetables	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-node-imported-fruits	node-imported-fruits.png	\N	node-imported-fruits.png	image/png	134	64	64	ba664beec27326a39ba16ae3da932a935346a19b7f1402e0b0f1d310d8d1dd48	فواكه مستوردة	Imported Fruits	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-node-sweets-cake	node-sweets-cake.png	\N	node-sweets-cake.png	image/png	136	64	64	2f9433ed6802eaa797813df5bdc09289c41485ea5bdb4daa4462df5b5911f5ff	كيك وتورتات	Cakes & Tortes	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-node-sweets-chocolate	node-sweets-chocolate.png	\N	node-sweets-chocolate.png	image/png	137	64	64	e601d3911fa0eaa9c8d3c4a56bb09c3738d5dfd5d6c2b473b0a6b9de59959d50	شوكولاتة فاخرة	Fine Chocolates	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-product-cheese-kraft	product-cheese-kraft.png	\N	product-cheese-kraft.png	image/png	135	64	64	9865380be562058e750d4d9ff4a0eb98f093ee1c53825ed8da5a1ec54936f779	جبنة كرافت شيدر	Kraft Cheddar Cheese	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-product-canned-tuna	product-canned-tuna.png	\N	product-canned-tuna.png	image/png	137	64	64	bbd634f328ccfd4b910b2db7c59d3c175a8a9240eebff8f2ce8fa7e1b70863bf	تونة حدائق كاليفورنيا	California Tuna	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-product-local-tomato	product-local-tomato.png	\N	product-local-tomato.png	image/png	137	64	64	16c1d022de872b12f79372e5dbf386169908ab5a193865319d86f82de1b86a56	طماطم بلدي	Local Tomato	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-product-imported-banana	product-imported-banana.png	\N	product-imported-banana.png	image/png	136	64	64	a5f0a2970c430ed1fba47d7303e2117f34efe6c58f679a8d6d61b8d5deeb2498	موز مستورد	Imported Banana	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
asset-product-chocolate-box	product-chocolate-box.png	\N	product-chocolate-box.png	image/png	136	64	64	282b23b7f5e3bce782ead45bb1d5b4db89552eb3554cf8447e510272ccdd1258	علبة شوكولاتة باتشي	Patchi Chocolate Box	#ffffff	approved	system	system-seed	\N		2026-07-13 21:43:45.812773+00	2026-07-13 21:43:45.812773+00	\N	\N	\N
\.


--
-- Data for Name: dsh_catalog_attribute_options; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_attribute_options (id, attribute_id, code, label_ar, label_en, sort_order, is_active) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_attributes; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_attributes (id, code, name_ar, name_en, data_type, is_filterable, is_required, is_variant_axis, is_global, sort_order, is_active, created_at, updated_at) FROM stdin;
attr-brand	brand	العلامة التجارية	Brand	text	t	f	f	t	10	t	2026-07-13 21:43:36.248491+00	2026-07-13 21:43:36.248491+00
attr-weight	weight	الوزن	Weight	measurement	t	f	f	t	20	t	2026-07-13 21:43:36.248491+00	2026-07-13 21:43:36.248491+00
attr-color	color	اللون	Color	enum	t	f	f	t	30	t	2026-07-13 21:43:36.248491+00	2026-07-13 21:43:36.248491+00
attr-expiry_date	expiry_date	تاريخ الانتهاء	Expiry Date	date	f	f	f	t	40	t	2026-07-13 21:43:36.248491+00	2026-07-13 21:43:36.248491+00
\.


--
-- Data for Name: dsh_catalog_collection_items; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_collection_items (id, collection_id, master_product_id, sort_order) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_collections; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_collections (id, slug, name_ar, name_en, description_ar, type, is_active, starts_at, ends_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_domains; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_domains (id, slug, name_ar, name_en, icon, sort_order, is_active, is_client_visible, requires_product_catalog, is_manual_request, created_at, updated_at) FROM stdin;
domain-restaurants	restaurants	مطاعم	Restaurants	🍽️	10	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-groceries	groceries	مقاضي	Groceries	🛒	20	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-sweets-juices	sweets_juices	حلا وعصائر	Sweets & Juices	🍰	30	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-pharmacy	pharmacy	صيدلية	Pharmacy	💊	35	t	t	t	f	2026-07-13 21:43:40.789797+00	2026-07-13 21:43:45.65634+00
domain-elegance	elegance	أناقتي	Elegance	✨	40	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-bthwani-store	bthwani_store	بثواني ستور	Bthwani Store	📦	50	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-home-projects	home_projects	مشاريع منزلية	Home Projects	🏠	60	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-spare-parts	spare_parts	قطع غيار	Spare Parts	🔧	70	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-honey-dates	honey_dates	عسل وتمور	Honey & Dates	🍯	80	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-electronics	electronics	إلكترونيات	Electronics	📱	90	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-cloud-kitchens	cloud_kitchens	مطابخ سحابية	Cloud Kitchens	👩‍🍳	100	t	t	t	f	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
domain-manual-request	manual_request	طلب يدوي	Manual Request	📝	110	t	t	f	t	2026-07-13 21:43:32.340437+00	2026-07-13 21:43:45.65634+00
\.


--
-- Data for Name: dsh_catalog_legacy_archive; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_legacy_archive (id, source_table, source_id, store_id, payload_json, archived_at, migration_name) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_node_attribute_rules; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_node_attribute_rules (id, node_id, domain_id, attribute_id, is_required, is_filterable, is_variant_axis, sort_order) FROM stdin;
\.


--
-- Data for Name: dsh_catalog_nodes; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_nodes (id, domain_id, parent_id, level, slug, name_ar, name_en, icon, sort_order, is_active, is_client_visible, requires_barcode, allows_product_proposal, allows_store_product_custom_image, requires_catalog_review, requires_product_catalog, created_at, updated_at) FROM stdin;
node-shay-in	domain-manual-request	\N	BUSINESS_SUBDOMAIN	shay_in	شيء إن	Shay In		10	t	t	f	t	f	t	f	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:32.356256+00
node-supermarket	domain-groceries	\N	BUSINESS_SUBDOMAIN	supermarket	سوبر ماركت	Supermarket		10	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-vegetables-fruits	domain-groceries	\N	BUSINESS_SUBDOMAIN	vegetables_fruits	خضروات وفواكه	Vegetables & Fruits		20	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-meat-fish-poultry	domain-groceries	\N	BUSINESS_SUBDOMAIN	meat_fish_poultry	لحوم وأسماك ودجاج	Meat, Fish & Poultry		30	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-roasters-spices	domain-groceries	\N	BUSINESS_SUBDOMAIN	roasters_spices	محامص وبهارات	Roasters & Spices		40	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-bakeries	domain-groceries	\N	BUSINESS_SUBDOMAIN	bakeries	مخابز	Bakeries		50	t	t	f	t	t	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-bundles-offers	domain-groceries	\N	BUSINESS_SUBDOMAIN	bundles_offers	باكج عروضات	Bundles & Offers		60	t	t	f	t	t	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-fresh-juices	domain-sweets-juices	\N	BUSINESS_SUBDOMAIN	fresh_juices	عصائر طازجة	Fresh Juices		10	t	t	f	t	t	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-sweets	domain-sweets-juices	\N	BUSINESS_SUBDOMAIN	sweets	حلويات	Sweets		20	t	t	f	t	t	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-ice-cream	domain-sweets-juices	\N	BUSINESS_SUBDOMAIN	ice_cream	آيسكريم	Ice Cream		30	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-perfumes	domain-elegance	\N	BUSINESS_SUBDOMAIN	perfumes	عطور	Perfumes		10	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-beauty-accessories	domain-elegance	\N	BUSINESS_SUBDOMAIN	beauty_accessories	إكسسوارات وأدوات تجميل	Beauty Accessories		20	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-clothing	domain-elegance	\N	BUSINESS_SUBDOMAIN	clothing	ملابس	Clothing		30	t	t	f	t	f	t	t	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-awnak	domain-manual-request	\N	BUSINESS_SUBDOMAIN	awnak	عونك	Awnak		20	t	t	f	t	f	t	f	2026-07-13 21:43:32.356256+00	2026-07-13 21:43:45.674399+00
node-dairy-cheese	domain-groceries	node-supermarket	PRODUCT_MAIN_CLASS	dairy_cheese	ألبان وأجبان	Dairy & Cheese		11	t	t	f	t	f	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
node-canned-food	domain-groceries	node-supermarket	PRODUCT_MAIN_CLASS	canned_food	أغذية معلبة	Canned Food		12	t	t	f	t	f	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
node-local-vegetables	domain-groceries	node-vegetables-fruits	PRODUCT_MAIN_CLASS	local_vegetables	خضروات محلية	Local Vegetables		21	t	t	f	t	f	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
node-imported-fruits	domain-groceries	node-vegetables-fruits	PRODUCT_MAIN_CLASS	imported_fruits	فواكه مستوردة	Imported Fruits		22	t	t	f	t	f	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
node-sweets-cake	domain-sweets-juices	node-sweets	PRODUCT_MAIN_CLASS	sweets_cake	كيك وتورتات	Cakes & Tortes		21	t	t	f	t	t	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
node-sweets-chocolate	domain-sweets-juices	node-sweets	PRODUCT_MAIN_CLASS	sweets_chocolate	شوكولاتة فاخرة	Fine Chocolates		22	t	t	f	t	t	t	t	2026-07-13 21:43:45.674399+00	2026-07-13 21:43:45.674399+00
\.


--
-- Data for Name: dsh_catalog_platform_policies; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_catalog_platform_policies (id, domain_id, node_id, policy_scope, platform_commission_rate, field_partner_onboarding_commission_amount, field_partner_onboarding_commission_currency, store_onboarding_fee_amount, store_onboarding_fee_currency, allows_store_product_custom_image, allows_product_proposal, requires_barcode, requires_catalog_review, is_active, effective_from, notes, created_at, updated_at, requires_marketing_review, requires_product_image, requires_category_image, requires_description, requires_brand, requires_unit, product_data_quality_minimum_score, max_gallery_images, manual_request_mode) FROM stdin;
default-policy	\N	\N	default	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.323829+00	Platform-wide fallback catalog policy (dsh-030 seed).	2026-07-13 21:43:32.323829+00	2026-07-13 21:43:45.694436+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-bakeries	\N	node-bakeries	node	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.374174+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.374174+00	2026-07-13 21:43:45.709892+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-bundles-offers	\N	node-bundles-offers	node	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.374174+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.374174+00	2026-07-13 21:43:45.709892+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-fresh-juices	\N	node-fresh-juices	node	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.374174+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.374174+00	2026-07-13 21:43:45.709892+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-sweets	\N	node-sweets	node	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.374174+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.374174+00	2026-07-13 21:43:45.709892+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-restaurants	domain-restaurants	\N	domain	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.390164+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.390164+00	2026-07-13 21:43:45.725889+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-home-projects	domain-home-projects	\N	domain	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.390164+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.390164+00	2026-07-13 21:43:45.725889+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-cloud-kitchens	domain-cloud-kitchens	\N	domain	0.0000	0.00	YER	0.00	YER	t	t	f	t	t	2026-07-13 21:43:32.390164+00	Custom store image allowed by default (dsh-030 seed).	2026-07-13 21:43:32.390164+00	2026-07-13 21:43:45.725889+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-supermarket	\N	node-supermarket	node	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.406043+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.406043+00	2026-07-13 21:43:45.740386+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-meat-fish-poultry	\N	node-meat-fish-poultry	node	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.406043+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.406043+00	2026-07-13 21:43:45.740386+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-roasters-spices	\N	node-roasters-spices	node	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.406043+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.406043+00	2026-07-13 21:43:45.740386+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-perfumes	\N	node-perfumes	node	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.406043+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.406043+00	2026-07-13 21:43:45.740386+00	t	f	f	f	f	f	0.00	6	f
policy-node-node-beauty-accessories	\N	node-beauty-accessories	node	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.406043+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.406043+00	2026-07-13 21:43:45.740386+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-spare-parts	domain-spare-parts	\N	domain	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.421408+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.421408+00	2026-07-13 21:43:45.756101+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-honey-dates	domain-honey-dates	\N	domain	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.421408+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.421408+00	2026-07-13 21:43:45.756101+00	t	f	f	f	f	f	0.00	6	f
policy-domain-domain-electronics	domain-electronics	\N	domain	0.0000	0.00	YER	0.00	YER	f	t	f	t	t	2026-07-13 21:43:32.421408+00	Custom store image disallowed by default (dsh-030 seed).	2026-07-13 21:43:32.421408+00	2026-07-13 21:43:45.756101+00	t	f	f	f	f	f	0.00	6	f
\.


--
-- Data for Name: dsh_checkout_intents; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_checkout_intents (id, client_id, cart_id, store_id, fulfillment_mode, state, payment_method, wlt_payment_session_id, delivery_address, note, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_deliveries; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_deliveries (id, assignment_id, order_id, captain_id, status, pod_method, pod_reference, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_field_visits; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_field_visits (id, store_id, field_agent_id, visit_type, status, notes, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_home_banners; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_home_banners (id, title, subtitle, image_url, action_type, action_target, sort_order, is_active, created_at, updated_at) FROM stdin;
banner-001	اكتشف أفضل المطاعم	خيارات مميزة في صنعاء	http://localhost:59000/dsh-media/banner-001.png	category	domain-restaurants	1	t	2026-07-13 21:43:44.844458+00	2026-07-13 21:43:44.844458+00
banner-002	عروض حصرية	خصومات تصل إلى 50%	http://localhost:59000/dsh-media/banner-002.png	store	store-1001	2	t	2026-07-13 21:43:44.844458+00	2026-07-13 21:43:44.844458+00
\.


--
-- Data for Name: dsh_home_content_audit; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_home_content_audit (id, actor_id, content_kind, content_id, action, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_home_promos; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_home_promos (id, title, subtitle, badge_label, image_url, action_type, action_target, sort_order, is_active, created_at, updated_at) FROM stdin;
promo-001	توصيل مجاني	لأول 3 طلبات	مجاني	http://localhost:59000/dsh-media/promo-001.png	none		0	t	2026-07-13 21:43:44.860948+00	2026-07-13 21:43:44.860948+00
promo-002	مطعم الشارع القديم	أعلى تقييم في صنعاء	الأعلى تقييمًا	http://localhost:59000/dsh-media/store-1005-hero.png	store	store-1005	0	t	2026-07-13 21:43:44.860948+00	2026-07-13 21:43:44.860948+00
\.


--
-- Data for Name: dsh_incidents; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_incidents (id, title, description, severity, status, affected_scope, raised_by, resolved_by, resolved_at, postmortem_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_audit_events; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_audit_events (id, entity_type, entity_id, actor_id, actor_role, action, from_state, to_state, reason, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_campaigns; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_campaigns (id, title, description, status, start_date, end_date, created_by, created_at, updated_at, target_type, target_id, audience, placement, archived_at, created_by_actor_id, created_by_surface) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_clicks; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_clicks (id, entity_type, entity_id, surface, viewer_ref, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_impressions; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_impressions (id, entity_type, entity_id, surface, viewer_ref, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_target_bindings; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_target_bindings (id, entity_type, entity_id, target_type, target_id, bound_by_actor_id, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_tickers; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_tickers (id, message, kind, status, source, audience, delivery_mode, priority, pinned, action_type, action_target, clicks, impressions, open_hour, close_hour, cooldown_minutes, repeat_gap_minutes, created_by, deleted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_marketing_visibility_gates; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_marketing_visibility_gates (id, entity_type, entity_id, target_type, target_id, gate, passed, reason, checked_at) FROM stdin;
\.


--
-- Data for Name: dsh_master_product_attribute_values; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_master_product_attribute_values (id, master_product_id, attribute_id, value_json, locale, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_master_products; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_master_products (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en, brand, barcode, gtin, sku, unit, measurement_type, canonical_image_object_key, approval_status, is_active, duplicate_group_id, created_source, created_at, updated_at) FROM stdin;
product-1001-rice	domain-groceries	node-supermarket	أرز بسمتي	Basmati Rice	بثواني	\N	\N	RICE-5KG	5 kg	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-1005-meal	domain-restaurants	\N	وجبة المدينة	City Meal	مطعم المدينة	\N	\N	CITY-MEAL	meal	unit	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-1005-croissant	domain-groceries	node-bakeries	كرواسون زبدة طازج	Fresh Butter Croissant	مخبز المدينة	\N	\N	CROISSANT-01	piece	unit	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-1005-wheatbread	domain-groceries	node-bakeries	خبز قمح كامل	Whole Wheat Bread	مخبز المدينة	\N	\N	WHEATBREAD-01	loaf	unit	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-1005-milk	domain-groceries	node-supermarket	حليب كامل الدسم	Full Cream Milk	بثواني	\N	\N	ORGANIC-MILK	1 L	volume	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-1005-apple	domain-groceries	node-vegetables-fruits	تفاح رويال غالا	Royal Gala Apple	بثواني	\N	\N	ROYAL-GALA	1 kg	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-cheese-kraft	domain-groceries	node-dairy-cheese	جبنة كرافت شيدر علب	Kraft Cheddar Cheese	كرافت	\N	\N	KRAFT-CHEDDAR-50G	50g	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-canned-tuna	domain-groceries	node-canned-food	تونة حدائق كاليفورنيا قطعة واحدة	California Gardens Tuna Solid	حدائق كاليفورنيا	\N	\N	CG-TUNA-185G	185g	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-local-tomato	domain-groceries	node-local-vegetables	طماطم بلدي طازج	Fresh Local Tomatoes	بلدي	\N	\N	LOCAL-TOMATO-1KG	1 kg	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-imported-banana	domain-groceries	node-imported-fruits	موز سكري مستورد	Sweet Imported Bananas	مستورد	\N	\N	IMPORTED-BANANA-1KG	1 kg	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
product-chocolate-box	domain-sweets-juices	node-sweets-chocolate	علبة شوكولاتة باتشي فاخرة	Patchi Chocolate Luxury Box	باتشي	\N	\N	PATCHI-BOX-500G	500g	weight	\N	approved	t	\N	central-catalog-seed	2026-07-13 21:43:45.771368+00	2026-07-13 21:43:45.771368+00
\.


--
-- Data for Name: dsh_media_refs; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_media_refs (media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_notification_preferences; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_notification_preferences (id, actor_id, actor_type, topic, enabled, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_notifications; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_notifications (id, actor_id, actor_type, topic, title, body, action_url, is_read, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: dsh_order_items; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_order_items (id, order_id, product_id, product_name, quantity, unit_price) FROM stdin;
\.


--
-- Data for Name: dsh_order_status_events; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_order_status_events (id, order_id, actor_role, from_status, to_status, note, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_orders; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_orders (id, checkout_intent_id, store_id, client_id, status, rejection_reason, wlt_payment_ref_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_partner_activation_events; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_activation_events (id, partner_id, from_status, to_status, actor_id, actor_surface, reason, correlation_id, idempotency_key, created_at) FROM stdin;
pae_001	prt_partner_local_001	draft	submitted	field-local-001	app-field	تقديم ملف الشريك من المندوب الميداني	corr_seed_dsh_015	idem_seed_001	2026-07-11 21:43:45.313679+00
pae_002	prt_partner_local_001	submitted	documents_uploaded	operator-local-001	control-panel	تسجيل اكتمال الوثائق المطلوبة	corr_seed_dsh_015	idem_seed_002	2026-07-12 09:43:45.313679+00
pae_003	prt_partner_local_001	documents_uploaded	documents_verified	operator-local-001	control-panel	اعتماد جميع الوثائق المرفوعة في النظام	corr_seed_dsh_015	idem_seed_003	2026-07-12 21:43:45.313679+00
pae_004	prt_partner_local_001	documents_verified	ops_review	operator-local-001	control-panel	تحويل الملف إلى مراجعة العمليات	corr_seed_dsh_015	idem_seed_004	2026-07-12 22:43:45.313679+00
pae_005	prt_partner_local_001	ops_review	ops_approved	operator-local-001	control-panel	اعتماد العمليات للملف المكتمل	corr_seed_dsh_015	idem_seed_005	2026-07-12 23:43:45.313679+00
pae_006	prt_partner_local_001	ops_approved	partner_active	operator-local-001	control-panel	تفعيل الشريك بعد اكتمال الاعتماد	corr_seed_dsh_015	idem_seed_006	2026-07-13 00:43:45.313679+00
pae_007	prt_partner_local_001	partner_active	client_visible	system	system	استيفاء شروط الظهور والجاهزية للعميل	corr_seed_dsh_015	idem_seed_007	2026-07-13 09:43:45.313679+00
\.


--
-- Data for Name: dsh_partner_document_reviews; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_document_reviews (id, document_id, partner_id, reviewed_by_actor_id, decision, reason, correlation_id, created_at) FROM stdin;
drev_cr_001	doc_cr_001	prt_partner_local_001	operator-local-001	approved	مستند رسمي معتمد ومطابق	corr_seed_dsh_015	2026-07-12 21:43:45.280764+00
drev_nid_001	doc_nid_001	prt_partner_local_001	operator-local-001	approved	مطابق لهوية المالك المسجلة	corr_seed_dsh_015	2026-07-12 21:43:45.280764+00
\.


--
-- Data for Name: dsh_partner_documents; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_documents (id, partner_id, document_type, document_status, uploaded_by_actor_id, media_ref, notes, rejection_reason, version, created_at, updated_at) FROM stdin;
doc_cr_001	prt_partner_local_001	commercial_register	approved	field-local-001	media_cr_990011.jpg	السجل التجاري الأصلي		2	2026-07-11 21:43:45.265345+00	2026-07-12 21:43:45.265345+00
doc_nid_001	prt_partner_local_001	national_id	approved	field-local-001	media_id_partner1.jpg	بطاقة الهوية الوطنية للمالك		2	2026-07-11 21:43:45.265345+00	2026-07-12 21:43:45.265345+00
\.


--
-- Data for Name: dsh_partner_field_visits; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_field_visits (id, partner_id, store_id, field_actor_id, visit_status, visit_notes, location_latitude, location_longitude, evidence_media_refs, version, created_at, submitted_at) FROM stdin;
pfv_001	prt_partner_local_001	store-1001	field-local-001	submitted	تمت الزيارة الميدانية في حدة - صنعاء والتأكد من مطابقة العنوان واللوحة	15.3229000	44.2075000	{media_visit_front_001.jpg,media_visit_inside_001.jpg}	1	2026-07-11 21:43:45.296819+00	2026-07-12 21:43:45.296819+00
\.


--
-- Data for Name: dsh_partner_offers; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_offers (id, title, partner_name, store_id, store_label, product_id, product_label, category, offer_type, status, source, value_label, eligibility, active_from_date, active_to_date, rejection_reason, margin_risk_note, version, linked_campaign_id, created_by, created_by_surface, archived_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_partner_store_visibility_events; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partner_store_visibility_events (id, partner_id, store_id, from_visibility, to_visibility, actor_id, reason, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_partners; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_partners (id, legal_name_ar, legal_name_en, display_name, legal_identity_type, legal_identity_number, owner_name, primary_phone, secondary_phone, email, category, activation_status, created_by_actor_id, created_by_surface, notes, version, created_at, updated_at, beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban, payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes) FROM stdin;
prt_partner_local_001	مؤسسة أسواق حدة المركزية	Haddah Central Market Est	أسواق حدة المركزية	commercial_register	YE-CR-9900112233	عبدالله محمد الحداد	+967771000001	+967771000002	haddah.partner@local.test	grocery	client_visible	field-local-001	app-field	ملف تأهيل شريك تجريبي محلي في صنعاء	8	2026-07-11 21:43:45.229927+00	2026-07-13 09:43:45.229927+00								f	
\.


--
-- Data for Name: dsh_platform_capacity; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_platform_capacity (id, zone_id, max_concurrent_orders, max_captains_online, throttle_threshold, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_platform_notification_config; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_platform_notification_config (id, topic, actor_types, is_enabled, description, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_platform_sla_rules; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_platform_sla_rules (id, zone_id, category, max_prep_mins, max_delivery_mins, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_platform_store_onboarding_fee_policy; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_platform_store_onboarding_fee_policy (id, enabled, amount, currency, applies_to, charge_timing, actor_charged, effective_from, notes, updated_by, updated_at) FROM stdin;
1	f	0.00	YER	first_store	on_approval	partner	\N		\N	2026-07-13 21:43:28.683125+00
\.


--
-- Data for Name: dsh_platform_zones; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_platform_zones (id, name, city_code, is_active, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_product_duplicate_candidates; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_product_duplicate_candidates (id, proposal_id, candidate_master_product_id, reason, score, status, reviewed_by, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_product_proposal_audit; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_product_proposal_audit (id, proposal_id, from_status, to_status, actor_id, actor_role, note, payload_json, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_product_proposals; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_product_proposals (id, proposed_name_ar, proposed_name_en, domain_id, category_node_id, brand, barcode, image_object_key, source_surface, source_actor_id, source_store_id, status, review_note, adopted_master_product_id, created_at, updated_at, review_stage, partner_reviewed_by, marketing_reviewed_by, catalog_adopted_by, catalog_approved_by, client_visible_at, audit_required, blocked_reason, resubmission_count, linked_store_id) FROM stdin;
\.


--
-- Data for Name: dsh_readiness_checks; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_readiness_checks (id, visit_id, store_id, check_type, status, evidence_url, notes, verified_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_readiness_escalations; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_readiness_escalations (id, visit_id, store_id, raised_by, severity, category, description, status, resolved_by, resolved_at, resolution_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_reels; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_reels (id, asset_id, title_ar, title_en, target_type, target_id, status, sort_order, submitted_by, submitted_by_role, source_store_id, reviewed_by, review_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_store_action_audit; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_action_audit (id, actor_id, actor_role, store_id, action, from_state, to_state, reason, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_store_actor_scopes; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type, active, created_at) FROM stdin;
partner-local-001	partner	store-1001	own	t	2026-07-13 21:43:44.509558+00
field-local-001	field	store-1002	assigned	t	2026-07-13 21:43:44.509558+00
captain-local-001	captain	store-1005	assigned	t	2026-07-13 21:43:44.509558+00
operator-local-001	operator	store-1001	all	t	2026-07-13 21:43:44.509558+00
\.


--
-- Data for Name: dsh_store_assortments; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_assortments (id, store_id, master_product_id, unit_price, currency, available, stock_status, local_note, custom_image_object_key, publication_status, submitted_by, approved_by, created_at, updated_at) FROM stdin;
assortment-store-1001-rice	store-1001	product-1001-rice	18000.00	YER	t	in_stock	عبوة 5 كجم	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-1005-meal	store-1005	product-1005-meal	1800.00	YER	t	in_stock	وجبة رئيسية	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-1005-croissant	store-1005	product-1005-croissant	500.00	YER	t	in_stock	طازج يومياً	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-1005-wheatbread	store-1005	product-1005-wheatbread	300.00	YER	t	in_stock	خبز قمح كامل	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-1005-milk	store-1005	product-1005-milk	1100.00	YER	t	in_stock	حليب طازج	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-1005-apple	store-1005	product-1005-apple	1800.00	YER	t	in_stock	تفاح طازج	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-cheese-kraft	store-1005	product-cheese-kraft	1200.00	YER	t	in_stock	عبوة معدنية	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-canned-tuna	store-1005	product-canned-tuna	1500.00	YER	t	in_stock	سهلة الفتح	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-local-tomato	store-1005	product-local-tomato	900.00	YER	t	in_stock	إنتاج مزارع صنعاء	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-imported-banana	store-1005	product-imported-banana	1100.00	YER	t	in_stock	موز طازج	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
assortment-store-chocolate-box	store-1005	product-chocolate-box	25000.00	YER	t	in_stock	هدية فاخرة	\N	client_visible	system-seed	system-seed	2026-07-13 21:43:45.790544+00	2026-07-13 21:43:45.790544+00
\.


--
-- Data for Name: dsh_store_field_verifications; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_field_verifications (id, store_id, actor_id, outcome, evidence_status, notes, correlation_id, created_at, visit_id, checklist_snapshot, location_snapshot) FROM stdin;
\.


--
-- Data for Name: dsh_store_idempotency; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_idempotency (actor_id, operation, idempotency_key, request_hash, response_body, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_store_pickup_readiness_reports; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_store_pickup_readiness_reports (id, store_id, actor_id, readiness, reason, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_stores; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, rating_average, rating_count, delivery_eta_min, delivery_eta_max, is_visible, hero_image_url, logo_url, delivery_modes, is_free_delivery, distance_km, follower_count, has_pro_badge, has_coupon_badge, points_multiplier, is_popular, created_at, updated_at, latitude, longitude, version, partner_readiness, catalog_approval_status, marketing_visibility, partner_id, address_line, coverage_summary, operating_hours, delivery_readiness, storefront_photo_ref, interior_photo_ref, signage_photo_ref, catalog_domain_id) FROM stdin;
store-1002	al-sabeen-bakery	مخبز السبعين	active	sana	sabeen	serviceable	4.60	189	20	35	t	http://localhost:59000/dsh-media/store-1002-hero.png	http://localhost:59000/dsh-media/store-1002-logo.png	{delivery,pickup}	t	1.80	1200	t	t	\N	f	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:44.144145+00	15.3300000	44.2000000	1	pending	draft	hidden	\N								domain-groceries
store-1003	taiz-street-market	سوق شارع تعز	active	sana	taiz-st	limited	4.20	97	35	55	t	http://localhost:59000/dsh-media/store-1003-hero.png	http://localhost:59000/dsh-media/store-1003-logo.png	{delivery,pickup}	f	3.50	850	f	f	\N	f	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:44.144145+00	15.3200000	44.1800000	1	pending	draft	hidden	\N								domain-groceries
store-1004	al-zubairi-grocery	بقالة الزبيري	temporarily_closed	sana	zubairi	unavailable	4.50	241	\N	\N	t	http://localhost:59000/dsh-media/store-1004-hero.png	http://localhost:59000/dsh-media/store-1004-logo.png	{delivery}	f	1.20	2400	t	f	\N	f	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:44.144145+00	15.3600000	44.1700000	1	pending	draft	hidden	\N								domain-groceries
store-1005	old-city-restaurant	مطعم المدينة القديمة	active	sana	old-city	serviceable	4.90	524	15	30	t	http://localhost:59000/dsh-media/store-1005-hero.png	http://localhost:59000/dsh-media/store-1005-logo.png	{delivery,pickup,express}	t	0.50	5200	t	t	3	t	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:44.144145+00	15.3560000	44.1800000	1	pending	draft	hidden	\N								domain-restaurants
store-1006	maeen-pharmacy	صيدلية معين	active	sana	maeen	serviceable	4.70	88	20	35	t	http://localhost:59000/dsh-media/store-1006-hero.png	http://localhost:59000/dsh-media/store-1006-logo.png	{delivery}	t	4.10	980	f	t	\N	f	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:44.144145+00	15.3700000	44.1900000	1	pending	draft	hidden	\N								domain-pharmacy
store-1001	haddah-central-market	أسواق حدة المركزية	active	sana	haddah	serviceable	4.80	312	25	40	t	http://localhost:59000/dsh-media/store-1001-hero.png	http://localhost:59000/dsh-media/store-1001-logo.png	{delivery,pickup,express}	t	2.10	3100	t	f	2	t	2026-07-13 21:43:44.144145+00	2026-07-13 21:43:45.246145+00	15.3400000	44.1900000	1	ready	draft	hidden	prt_partner_local_001								domain-groceries
\.


--
-- Data for Name: dsh_support_messages; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_support_messages (id, ticket_id, sender_id, sender_role, body, is_internal, created_at) FROM stdin;
\.


--
-- Data for Name: dsh_support_tickets; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_support_tickets (id, store_id, reporter_id, reporter_role, subject, description, category, priority, status, assigned_to, order_id, resolved_at, closed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dsh_wlt_outbox_events; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.dsh_wlt_outbox_events (id, event_type, order_id, captain_id, partner_id, checkout_intent_id, status, attempt_count, last_error, next_retry_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: runtime_schema_migrations; Type: TABLE DATA; Schema: public; Owner: dsh_runtime
--

COPY public.runtime_schema_migrations (migration_name, checksum, applied_at) FROM stdin;
dsh-001_store_discovery.sql	709a0f8766ae1d81747e31b8ea18d28a0e5695e756c53d2a7fccdd699ed52c75	2026-07-13 21:42:50.3204+00
dsh-001b_store_governance.sql	fef76c8ca67284a1a9ca7ccbb4dfaf7d6a8159d37a6523a64d07aa39528b1fa1	2026-07-13 21:42:52.026214+00
dsh-002_home_discovery.sql	20208bbd87ad3d50a378cb0227d3ba4af519fad317f0a008888af9924f391007	2026-07-13 21:42:53.566518+00
dsh-002b_storefront_catalog.sql	925d18f09a3a15bafce27d831d015a59499a8541f7245df59e45e2f4575e161a	2026-07-13 21:42:55.441982+00
dsh-004_cart.sql	e9c742e560b37123642a73d7b228ebaa34d23765b157bc1b73d685a4eace6842	2026-07-13 21:42:56.897689+00
dsh-005_checkout_intent.sql	5f5f1e359e393b6bee5f400dd0260fa0531ad659cf299f6457240091ab93840c	2026-07-13 21:42:58.199619+00
dsh-006_orders.sql	b9f89df4ca97f25bf4d928643d7eb03ef76b8f4a2476fb628c467a057ce2a5de	2026-07-13 21:42:59.766601+00
dsh-007_dispatch.sql	c56d0fb7096323590bb886e66b93e306d97cf68d6f1e6a1d0704b59ab13a4165	2026-07-13 21:43:01.244042+00
dsh-008_field_onboarding.sql	e467409551a317b4bf46182f43f4316e03b81fb1a58c251b845438382e2f15cc	2026-07-13 21:43:02.828762+00
dsh-009_support.sql	dd8def49c78c3f05688721c819862bbcb63ec8cfdf32c9153acd4596084a6a88	2026-07-13 21:43:04.375718+00
dsh-011_notifications.sql	685a50dfa9f1e715308661c93653fa3be2cac689af9909d19b0ac36c4b954926	2026-07-13 21:43:05.881207+00
dsh-012_marketing.sql	787ce360463888d420edf5c809dd1cbeba008156ac4d78e66c0393a451e35dfa	2026-07-13 21:43:07.262465+00
dsh-013_platform_policies.sql	674641d348e869dac1fc8209ecf5a587a01edb2ef931f9455553ccc31d0ff4b9	2026-07-13 21:43:08.64995+00
dsh-014_administration.sql	ce200941f0ad2262eccc5ac8e3b2994d957cbfacb12c3415363b00acd5af8dff	2026-07-13 21:43:10.335609+00
dsh-015_partner_lifecycle.sql	5126adad950024c9db277988e9b8ad43850e444b2aa58b4d2aa84028150f26ec	2026-07-13 21:43:12.611087+00
dsh-016_field_partner_store_draft.sql	32b5df0ac64dcff30fad012231a4b754170b6978a3407fda89fd625eacf82f02	2026-07-13 21:43:13.701711+00
dsh-017_marketing_governance.sql	dd1b32197f96dc239f2fd35aea637bf56605710d94152d7324d376a65e261fd4	2026-07-13 21:43:15.403267+00
dsh-018_retire_marketing_banners_promos.sql	1a60c2a516b62cbf73ff5d7a97e39b89c4cbec1f54f411c6ab86c2cd89cd2d6a	2026-07-13 21:43:16.467782+00
dsh-019_marketing_tickers.sql	7151dc3a0ee3459c1b126b2a6f5c84125772b233773d789c5dbaa2ce2a9bde10	2026-07-13 21:43:17.596863+00
dsh-020_partner_offers.sql	8fdcc9ddd884f5ab865f10cdaf44914cb3aa45c89c35652e8e10598a9a26a5b2	2026-07-13 21:43:18.799067+00
dsh-021_checkout_payment_confirmation.sql	4639740381131e3d71a73e3ace3acc7b43e9b87e7ab4843a0a5ffb5bd94ca760	2026-07-13 21:43:19.844206+00
dsh-022_catalog_cart_pricing.sql	22787cc4a57030826e3402f1791088526061733f819cce88cc778489033136da	2026-07-13 21:43:20.931042+00
dsh-023_catalog_approval_queue.sql	a690d02b309c163cd9be1f9cbc8cf31a283973ba968ade680c4ce2d7b5ac77e7	2026-07-13 21:43:22.286972+00
dsh-024_wlt_delivery_outbox.sql	69b00121f96d7ad0a4f4feeb091df9f15305fb7b3c0cbe3bd69c2d1405230e64	2026-07-13 21:43:23.457584+00
dsh-025_marketing_entity_type_constraints.sql	4b5d94c95b605deecf8d8612054052b6d8867ec1f8579c58ec31520645e193b5	2026-07-13 21:43:24.587864+00
dsh-026_media_refs.sql	b467541bfb1cd5c9d9920093186902b799f39a9ecd0c6e28a64862576aa5d03b	2026-07-13 21:43:25.795525+00
dsh-027_media_refs_provider_owned.sql	13b77ef5c551db6c75ef368a701387fbd7685e5dec1b4e8d8d4857194fe73b9b	2026-07-13 21:43:26.891967+00
dsh-027_partner_bank_account.sql	b8fb6c691716bd08bb5081465fbe9e36694118a8b6854f935e33e2c415069a4a	2026-07-13 21:43:27.946519+00
dsh-028_store_onboarding_fee_policy.sql	3294717254125986dfbea1522d3216d3cc21dd64fbfca0dd869a22f6869486f7	2026-07-13 21:43:29.154198+00
dsh-029_field_work_queue_index.sql	a9c6a98a8b56d43c1b805078d8e10d5de597eae266f81038be88077ab1fbe58c	2026-07-13 21:43:30.218798+00
dsh-030_central_catalog_sovereignty.sql	55e7249be2b556302e97e56c990ba5a3e726b8572598c53e0009363eaec9c3a6	2026-07-13 21:43:32.756867+00
dsh-031_product_proposal_review_pipeline.sql	74cf03ee9dcb6562cbb69de8db8f09ccec6fc49126191a0ea48f11679f2cbc0b	2026-07-13 21:43:33.909307+00
dsh-032_catalog_pim_dam_attributes_bulk_closure.sql	724cab0f5904681be8abee260687e5aedffcc8307ec5eda21ceeb1efeb03006d	2026-07-13 21:43:36.668519+00
dsh-033_cart_master_product_linkage.sql	41db001b876af57b1a3cd8676995818b7022416c24e4e3744f7003cdb1ab831b	2026-07-13 21:43:37.788531+00
dsh-034_field_visit_integrity.sql	4fe321c98da82ded55c36bbca58cb112c7457daa39535ce04118815f1358339e	2026-07-13 21:43:38.996586+00
dsh-035_field_verification_snapshots.sql	31acc50ca811a997416c8dc01b6f32bd71f349b84388126f905a322f067e2754	2026-07-13 21:43:40.090859+00
dsh-036_central_catalog_runtime_closure.sql	3695e8f3696eddf6430d255ea31aad7a2739f3c444c6d839b3c8da5367bbc7c8	2026-07-13 21:43:41.474996+00
dsh-037_store_media_dam.sql	a4765381b32e74d6bd9645099a169239a76ddaa4e77e1d9e53b6c8cc626be4ee	2026-07-13 21:43:42.543833+00
dsh-038_catalog_media_integrity.sql	82ea2a2b81d043e97f0557f4566da914838d5e625ae10485323c821b66f5b4ba	2026-07-13 21:43:43.809757+00
\.


--
-- Name: dsh_admin_audit dsh_admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_audit
    ADD CONSTRAINT dsh_admin_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_captain_credentials dsh_admin_captain_credentials_captain_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_captain_credentials
    ADD CONSTRAINT dsh_admin_captain_credentials_captain_id_key UNIQUE (captain_id);


--
-- Name: dsh_admin_captain_credentials dsh_admin_captain_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_captain_credentials
    ADD CONSTRAINT dsh_admin_captain_credentials_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_partner_activations dsh_admin_partner_activations_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_partner_activations
    ADD CONSTRAINT dsh_admin_partner_activations_partner_id_key UNIQUE (partner_id);


--
-- Name: dsh_admin_partner_activations dsh_admin_partner_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_partner_activations
    ADD CONSTRAINT dsh_admin_partner_activations_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_roles dsh_admin_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_roles
    ADD CONSTRAINT dsh_admin_roles_name_key UNIQUE (name);


--
-- Name: dsh_admin_roles dsh_admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_roles
    ADD CONSTRAINT dsh_admin_roles_pkey PRIMARY KEY (id);


--
-- Name: dsh_admin_staff_assignments dsh_admin_staff_assignments_actor_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_staff_assignments
    ADD CONSTRAINT dsh_admin_staff_assignments_actor_id_role_id_key UNIQUE (actor_id, role_id);


--
-- Name: dsh_admin_staff_assignments dsh_admin_staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_staff_assignments
    ADD CONSTRAINT dsh_admin_staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: dsh_assignments dsh_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_pkey PRIMARY KEY (id);


--
-- Name: dsh_cart_items dsh_cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: dsh_cart_items dsh_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_pkey PRIMARY KEY (id);


--
-- Name: dsh_carts dsh_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_carts
    ADD CONSTRAINT dsh_carts_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_approval_audit_trail dsh_catalog_approval_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_approval_audit_trail
    ADD CONSTRAINT dsh_catalog_approval_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_approval_records dsh_catalog_approval_records_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_approval_records
    ADD CONSTRAINT dsh_catalog_approval_records_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_entity_type_entity_id_role_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_entity_type_entity_id_role_asset_id_key UNIQUE (entity_type, entity_id, role, asset_id);


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_assets dsh_catalog_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_assets
    ADD CONSTRAINT dsh_catalog_assets_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_attribute_id_code_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_attribute_id_code_key UNIQUE (attribute_id, code);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_attributes dsh_catalog_attributes_code_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_attributes
    ADD CONSTRAINT dsh_catalog_attributes_code_key UNIQUE (code);


--
-- Name: dsh_catalog_attributes dsh_catalog_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_attributes
    ADD CONSTRAINT dsh_catalog_attributes_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_collection_items dsh_catalog_collection_items_collection_id_master_product_i_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collection_items
    ADD CONSTRAINT dsh_catalog_collection_items_collection_id_master_product_i_key UNIQUE (collection_id, master_product_id);


--
-- Name: dsh_catalog_collection_items dsh_catalog_collection_items_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collection_items
    ADD CONSTRAINT dsh_catalog_collection_items_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_collections dsh_catalog_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collections
    ADD CONSTRAINT dsh_catalog_collections_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_collections dsh_catalog_collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collections
    ADD CONSTRAINT dsh_catalog_collections_slug_key UNIQUE (slug);


--
-- Name: dsh_catalog_domains dsh_catalog_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_domains
    ADD CONSTRAINT dsh_catalog_domains_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_domains dsh_catalog_domains_slug_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_domains
    ADD CONSTRAINT dsh_catalog_domains_slug_key UNIQUE (slug);


--
-- Name: dsh_catalog_legacy_archive dsh_catalog_legacy_archive_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_legacy_archive
    ADD CONSTRAINT dsh_catalog_legacy_archive_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_legacy_archive dsh_catalog_legacy_archive_source_table_source_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_legacy_archive
    ADD CONSTRAINT dsh_catalog_legacy_archive_source_table_source_id_key UNIQUE (source_table, source_id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_domain_id_parent_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_domain_id_parent_id_slug_key UNIQUE (domain_id, parent_id, slug);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_pkey PRIMARY KEY (id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_pkey PRIMARY KEY (id);


--
-- Name: dsh_checkout_intents dsh_checkout_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_pkey PRIMARY KEY (id);


--
-- Name: dsh_deliveries dsh_deliveries_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_assignment_id_key UNIQUE (assignment_id);


--
-- Name: dsh_deliveries dsh_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_pkey PRIMARY KEY (id);


--
-- Name: dsh_field_visits dsh_field_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_field_visits
    ADD CONSTRAINT dsh_field_visits_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_banners dsh_home_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_home_banners
    ADD CONSTRAINT dsh_home_banners_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_content_audit dsh_home_content_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_home_content_audit
    ADD CONSTRAINT dsh_home_content_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_home_promos dsh_home_promos_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_home_promos
    ADD CONSTRAINT dsh_home_promos_pkey PRIMARY KEY (id);


--
-- Name: dsh_incidents dsh_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_incidents
    ADD CONSTRAINT dsh_incidents_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_audit_events dsh_marketing_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_audit_events
    ADD CONSTRAINT dsh_marketing_audit_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_campaigns dsh_marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_campaigns
    ADD CONSTRAINT dsh_marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_clicks dsh_marketing_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_clicks
    ADD CONSTRAINT dsh_marketing_clicks_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_impressions dsh_marketing_impressions_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_impressions
    ADD CONSTRAINT dsh_marketing_impressions_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_target_bindings dsh_marketing_target_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_target_bindings
    ADD CONSTRAINT dsh_marketing_target_bindings_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_tickers dsh_marketing_tickers_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_tickers
    ADD CONSTRAINT dsh_marketing_tickers_pkey PRIMARY KEY (id);


--
-- Name: dsh_marketing_visibility_gates dsh_marketing_visibility_gates_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_marketing_visibility_gates
    ADD CONSTRAINT dsh_marketing_visibility_gates_pkey PRIMARY KEY (id);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute__master_product_id_attribute_i_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute__master_product_id_attribute_i_key UNIQUE (master_product_id, attribute_id, locale);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: dsh_master_products dsh_master_products_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_pkey PRIMARY KEY (id);


--
-- Name: dsh_media_refs dsh_media_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_pkey PRIMARY KEY (media_ref);


--
-- Name: dsh_media_refs dsh_media_refs_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_storage_key_key UNIQUE (storage_key);


--
-- Name: dsh_notification_preferences dsh_notification_preferences_actor_id_actor_type_topic_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_notification_preferences
    ADD CONSTRAINT dsh_notification_preferences_actor_id_actor_type_topic_key UNIQUE (actor_id, actor_type, topic);


--
-- Name: dsh_notification_preferences dsh_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_notification_preferences
    ADD CONSTRAINT dsh_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: dsh_notifications dsh_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_notifications
    ADD CONSTRAINT dsh_notifications_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_items dsh_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_order_items
    ADD CONSTRAINT dsh_order_items_pkey PRIMARY KEY (id);


--
-- Name: dsh_order_status_events dsh_order_status_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_order_status_events
    ADD CONSTRAINT dsh_order_status_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_orders dsh_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_activation_events dsh_partner_activation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_activation_events
    ADD CONSTRAINT dsh_partner_activation_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_documents dsh_partner_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_documents
    ADD CONSTRAINT dsh_partner_documents_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_offers dsh_partner_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_pkey PRIMARY KEY (id);


--
-- Name: dsh_partner_store_visibility_events dsh_partner_store_visibility_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_store_visibility_events
    ADD CONSTRAINT dsh_partner_store_visibility_events_pkey PRIMARY KEY (id);


--
-- Name: dsh_partners dsh_partners_legal_identity_unique; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partners
    ADD CONSTRAINT dsh_partners_legal_identity_unique UNIQUE (legal_identity_type, legal_identity_number);


--
-- Name: dsh_partners dsh_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partners
    ADD CONSTRAINT dsh_partners_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_capacity dsh_platform_capacity_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_capacity
    ADD CONSTRAINT dsh_platform_capacity_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_capacity dsh_platform_capacity_zone_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_capacity
    ADD CONSTRAINT dsh_platform_capacity_zone_id_key UNIQUE (zone_id);


--
-- Name: dsh_platform_notification_config dsh_platform_notification_config_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_notification_config
    ADD CONSTRAINT dsh_platform_notification_config_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_notification_config dsh_platform_notification_config_topic_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_notification_config
    ADD CONSTRAINT dsh_platform_notification_config_topic_key UNIQUE (topic);


--
-- Name: dsh_platform_sla_rules dsh_platform_sla_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_sla_rules
    ADD CONSTRAINT dsh_platform_sla_rules_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_sla_rules dsh_platform_sla_rules_zone_id_category_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_sla_rules
    ADD CONSTRAINT dsh_platform_sla_rules_zone_id_category_key UNIQUE (zone_id, category);


--
-- Name: dsh_platform_store_onboarding_fee_policy dsh_platform_store_onboarding_fee_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_store_onboarding_fee_policy
    ADD CONSTRAINT dsh_platform_store_onboarding_fee_policy_pkey PRIMARY KEY (id);


--
-- Name: dsh_platform_zones dsh_platform_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_platform_zones
    ADD CONSTRAINT dsh_platform_zones_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidates_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_proposal_audit dsh_product_proposal_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposal_audit
    ADD CONSTRAINT dsh_product_proposal_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_product_proposals dsh_product_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_checks dsh_readiness_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_pkey PRIMARY KEY (id);


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_pkey PRIMARY KEY (id);


--
-- Name: dsh_reels dsh_reels_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_reels
    ADD CONSTRAINT dsh_reels_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_action_audit dsh_store_action_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_action_audit
    ADD CONSTRAINT dsh_store_action_audit_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_actor_scopes dsh_store_actor_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_actor_scopes
    ADD CONSTRAINT dsh_store_actor_scopes_pkey PRIMARY KEY (actor_id, actor_role, store_id);


--
-- Name: dsh_store_assortments dsh_store_assortments_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_assortments dsh_store_assortments_store_id_master_product_id_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_store_id_master_product_id_key UNIQUE (store_id, master_product_id);


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_pkey PRIMARY KEY (id);


--
-- Name: dsh_store_idempotency dsh_store_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_idempotency
    ADD CONSTRAINT dsh_store_idempotency_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: dsh_store_pickup_readiness_reports dsh_store_pickup_readiness_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_pickup_readiness_reports
    ADD CONSTRAINT dsh_store_pickup_readiness_reports_pkey PRIMARY KEY (id);


--
-- Name: dsh_stores dsh_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_pkey PRIMARY KEY (id);


--
-- Name: dsh_stores dsh_stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_slug_key UNIQUE (slug);


--
-- Name: dsh_support_messages dsh_support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_support_messages
    ADD CONSTRAINT dsh_support_messages_pkey PRIMARY KEY (id);


--
-- Name: dsh_support_tickets dsh_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_support_tickets
    ADD CONSTRAINT dsh_support_tickets_pkey PRIMARY KEY (id);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_order_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_order_id_event_type_key UNIQUE (order_id, event_type);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: runtime_schema_migrations runtime_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.runtime_schema_migrations
    ADD CONSTRAINT runtime_schema_migrations_pkey PRIMARY KEY (migration_name);


--
-- Name: dsh_store_action_audit_store_idx; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX dsh_store_action_audit_store_idx ON public.dsh_store_action_audit USING btree (store_id, created_at DESC);


--
-- Name: dsh_store_actor_scopes_lookup_idx; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX dsh_store_actor_scopes_lookup_idx ON public.dsh_store_actor_scopes USING btree (actor_id, actor_role, active, store_id);


--
-- Name: dsh_store_field_verifications_store_idx; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX dsh_store_field_verifications_store_idx ON public.dsh_store_field_verifications USING btree (store_id, created_at DESC);


--
-- Name: dsh_store_pickup_readiness_store_idx; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX dsh_store_pickup_readiness_store_idx ON public.dsh_store_pickup_readiness_reports USING btree (store_id, created_at DESC);


--
-- Name: idx_dsh_admin_audit_actor; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_admin_audit_actor ON public.dsh_admin_audit USING btree (actor_id);


--
-- Name: idx_dsh_admin_audit_time; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_admin_audit_time ON public.dsh_admin_audit USING btree (created_at DESC);


--
-- Name: idx_dsh_admin_partner_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_admin_partner_status ON public.dsh_admin_partner_activations USING btree (status);


--
-- Name: idx_dsh_admin_staff_actor; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_admin_staff_actor ON public.dsh_admin_staff_assignments USING btree (actor_id);


--
-- Name: idx_dsh_assignments_active_order; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX idx_dsh_assignments_active_order ON public.dsh_assignments USING btree (order_id) WHERE (status = ANY (ARRAY['offered'::text, 'accepted'::text]));


--
-- Name: idx_dsh_assignments_captain_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_assignments_captain_status ON public.dsh_assignments USING btree (captain_id, status, created_at DESC);


--
-- Name: idx_dsh_cart_items_cart; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_cart_items_cart ON public.dsh_cart_items USING btree (cart_id);


--
-- Name: idx_dsh_cart_items_master_product; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_cart_items_master_product ON public.dsh_cart_items USING btree (master_product_id);


--
-- Name: idx_dsh_carts_client_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_carts_client_id ON public.dsh_carts USING btree (client_id);


--
-- Name: idx_dsh_carts_state; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_carts_state ON public.dsh_carts USING btree (state);


--
-- Name: idx_dsh_carts_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_carts_store_id ON public.dsh_carts USING btree (store_id);


--
-- Name: idx_dsh_catalog_approval_audit_trail_record; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_approval_audit_trail_record ON public.dsh_catalog_approval_audit_trail USING btree (approval_record_id, at DESC);


--
-- Name: idx_dsh_catalog_approval_records_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_approval_records_entity ON public.dsh_catalog_approval_records USING btree (entity_type, entity_id);


--
-- Name: idx_dsh_catalog_approval_records_source; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_approval_records_source ON public.dsh_catalog_approval_records USING btree (source, submitted_at DESC);


--
-- Name: idx_dsh_catalog_approval_records_stage; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_approval_records_stage ON public.dsh_catalog_approval_records USING btree (stage, submitted_at DESC);


--
-- Name: idx_dsh_catalog_asset_links_asset; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_asset_links_asset ON public.dsh_catalog_asset_links USING btree (asset_id);


--
-- Name: idx_dsh_catalog_asset_links_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_asset_links_entity ON public.dsh_catalog_asset_links USING btree (entity_type, entity_id, role, sort_order);


--
-- Name: idx_dsh_catalog_assets_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_assets_status ON public.dsh_catalog_assets USING btree (status, created_at DESC);


--
-- Name: idx_dsh_catalog_collection_items_collection; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_collection_items_collection ON public.dsh_catalog_collection_items USING btree (collection_id, sort_order);


--
-- Name: idx_dsh_catalog_domains_active_sort; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_domains_active_sort ON public.dsh_catalog_domains USING btree (is_active, sort_order);


--
-- Name: idx_dsh_catalog_legacy_archive_source; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_legacy_archive_source ON public.dsh_catalog_legacy_archive USING btree (source_table, store_id);


--
-- Name: idx_dsh_catalog_node_attribute_rules_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_node_attribute_rules_domain ON public.dsh_catalog_node_attribute_rules USING btree (domain_id);


--
-- Name: idx_dsh_catalog_node_attribute_rules_node; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_node_attribute_rules_node ON public.dsh_catalog_node_attribute_rules USING btree (node_id);


--
-- Name: idx_dsh_catalog_nodes_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_nodes_domain ON public.dsh_catalog_nodes USING btree (domain_id, level, sort_order);


--
-- Name: idx_dsh_catalog_nodes_parent; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_catalog_nodes_parent ON public.dsh_catalog_nodes USING btree (parent_id, sort_order);


--
-- Name: idx_dsh_checkout_intents_cart_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_checkout_intents_cart_id ON public.dsh_checkout_intents USING btree (cart_id);


--
-- Name: idx_dsh_checkout_intents_client_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_checkout_intents_client_id ON public.dsh_checkout_intents USING btree (client_id);


--
-- Name: idx_dsh_checkout_intents_state; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_checkout_intents_state ON public.dsh_checkout_intents USING btree (state);


--
-- Name: idx_dsh_checkout_intents_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_checkout_intents_store_id ON public.dsh_checkout_intents USING btree (store_id);


--
-- Name: idx_dsh_deliveries_captain_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_deliveries_captain_status ON public.dsh_deliveries USING btree (captain_id, status, updated_at DESC);


--
-- Name: idx_dsh_deliveries_order; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_deliveries_order ON public.dsh_deliveries USING btree (order_id);


--
-- Name: idx_dsh_escalations_raised_by; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_escalations_raised_by ON public.dsh_readiness_escalations USING btree (raised_by);


--
-- Name: idx_dsh_escalations_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_escalations_status ON public.dsh_readiness_escalations USING btree (status);


--
-- Name: idx_dsh_escalations_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_escalations_store_id ON public.dsh_readiness_escalations USING btree (store_id);


--
-- Name: idx_dsh_field_visits_agent_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_field_visits_agent_id ON public.dsh_field_visits USING btree (field_agent_id);


--
-- Name: idx_dsh_field_visits_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_field_visits_store_id ON public.dsh_field_visits USING btree (store_id);


--
-- Name: idx_dsh_home_banners_active; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_home_banners_active ON public.dsh_home_banners USING btree (is_active, sort_order);


--
-- Name: idx_dsh_home_content_audit_lookup; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_home_content_audit_lookup ON public.dsh_home_content_audit USING btree (content_kind, content_id, created_at DESC);


--
-- Name: idx_dsh_home_promos_active; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_home_promos_active ON public.dsh_home_promos USING btree (is_active, sort_order);


--
-- Name: idx_dsh_incidents_severity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_incidents_severity ON public.dsh_incidents USING btree (severity);


--
-- Name: idx_dsh_incidents_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_incidents_status ON public.dsh_incidents USING btree (status);


--
-- Name: idx_dsh_marketing_audit_events_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_audit_events_entity ON public.dsh_marketing_audit_events USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_clicks_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_clicks_entity ON public.dsh_marketing_clicks USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_impressions_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_impressions_entity ON public.dsh_marketing_impressions USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_target_bindings_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_target_bindings_entity ON public.dsh_marketing_target_bindings USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_dsh_marketing_tickers_live; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_tickers_live ON public.dsh_marketing_tickers USING btree (status, pinned) WHERE (deleted_at IS NULL);


--
-- Name: idx_dsh_marketing_visibility_gates_entity; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_marketing_visibility_gates_entity ON public.dsh_marketing_visibility_gates USING btree (entity_type, entity_id, checked_at DESC);


--
-- Name: idx_dsh_master_product_attribute_values_gin; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_product_attribute_values_gin ON public.dsh_master_product_attribute_values USING gin (value_json);


--
-- Name: idx_dsh_master_product_attribute_values_product; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_product_attribute_values_product ON public.dsh_master_product_attribute_values USING btree (master_product_id);


--
-- Name: idx_dsh_master_products_approval; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_products_approval ON public.dsh_master_products USING btree (approval_status, updated_at DESC);


--
-- Name: idx_dsh_master_products_barcode; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_products_barcode ON public.dsh_master_products USING btree (barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_dsh_master_products_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_products_domain ON public.dsh_master_products USING btree (domain_id, category_node_id, is_active);


--
-- Name: idx_dsh_master_products_duplicate_group; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_master_products_duplicate_group ON public.dsh_master_products USING btree (duplicate_group_id) WHERE (duplicate_group_id IS NOT NULL);


--
-- Name: idx_dsh_media_refs_owner; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_media_refs_owner ON public.dsh_media_refs USING btree (owner_actor_id, owner_actor_role);


--
-- Name: idx_dsh_media_refs_partner; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_media_refs_partner ON public.dsh_media_refs USING btree (partner_id);


--
-- Name: idx_dsh_notifications_actor; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_notifications_actor ON public.dsh_notifications USING btree (actor_id, actor_type);


--
-- Name: idx_dsh_notifications_unread; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_notifications_unread ON public.dsh_notifications USING btree (actor_id, is_read) WHERE (is_read = false);


--
-- Name: idx_dsh_order_items_order_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_order_items_order_id ON public.dsh_order_items USING btree (order_id);


--
-- Name: idx_dsh_order_status_events_order; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_order_status_events_order ON public.dsh_order_status_events USING btree (order_id);


--
-- Name: idx_dsh_orders_checkout_intent; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_orders_checkout_intent ON public.dsh_orders USING btree (checkout_intent_id);


--
-- Name: idx_dsh_orders_checkout_intent_unique; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX idx_dsh_orders_checkout_intent_unique ON public.dsh_orders USING btree (checkout_intent_id);


--
-- Name: idx_dsh_orders_client_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_orders_client_id ON public.dsh_orders USING btree (client_id);


--
-- Name: idx_dsh_orders_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_orders_status ON public.dsh_orders USING btree (status);


--
-- Name: idx_dsh_orders_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_orders_store_id ON public.dsh_orders USING btree (store_id);


--
-- Name: idx_dsh_partner_activation_events_created_at; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_activation_events_created_at ON public.dsh_partner_activation_events USING btree (created_at DESC);


--
-- Name: idx_dsh_partner_activation_events_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_activation_events_partner_id ON public.dsh_partner_activation_events USING btree (partner_id);


--
-- Name: idx_dsh_partner_doc_reviews_document_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_doc_reviews_document_id ON public.dsh_partner_document_reviews USING btree (document_id);


--
-- Name: idx_dsh_partner_doc_reviews_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_doc_reviews_partner_id ON public.dsh_partner_document_reviews USING btree (partner_id);


--
-- Name: idx_dsh_partner_documents_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_documents_partner_id ON public.dsh_partner_documents USING btree (partner_id);


--
-- Name: idx_dsh_partner_documents_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_documents_status ON public.dsh_partner_documents USING btree (document_status);


--
-- Name: idx_dsh_partner_field_visits_actor_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_field_visits_actor_id ON public.dsh_partner_field_visits USING btree (field_actor_id);


--
-- Name: idx_dsh_partner_field_visits_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_field_visits_partner_id ON public.dsh_partner_field_visits USING btree (partner_id);


--
-- Name: idx_dsh_partner_field_visits_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_field_visits_status ON public.dsh_partner_field_visits USING btree (visit_status);


--
-- Name: idx_dsh_partner_offers_active; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_offers_active ON public.dsh_partner_offers USING btree (status) WHERE (archived_at IS NULL);


--
-- Name: idx_dsh_partner_offers_status_created; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_offers_status_created ON public.dsh_partner_offers USING btree (status, created_at DESC);


--
-- Name: idx_dsh_partner_offers_store_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_offers_store_status ON public.dsh_partner_offers USING btree (store_id, status);


--
-- Name: idx_dsh_partner_store_vis_events_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_store_vis_events_partner_id ON public.dsh_partner_store_visibility_events USING btree (partner_id);


--
-- Name: idx_dsh_partner_store_vis_events_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partner_store_vis_events_store_id ON public.dsh_partner_store_visibility_events USING btree (store_id);


--
-- Name: idx_dsh_partners_activation_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partners_activation_status ON public.dsh_partners USING btree (activation_status);


--
-- Name: idx_dsh_partners_created_at; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_partners_created_at ON public.dsh_partners USING btree (created_at DESC);


--
-- Name: idx_dsh_product_duplicate_candidates_proposal; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_product_duplicate_candidates_proposal ON public.dsh_product_duplicate_candidates USING btree (proposal_id, status);


--
-- Name: idx_dsh_product_proposal_audit_proposal; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_product_proposal_audit_proposal ON public.dsh_product_proposal_audit USING btree (proposal_id, created_at DESC);


--
-- Name: idx_dsh_product_proposals_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_product_proposals_domain ON public.dsh_product_proposals USING btree (domain_id, category_node_id);


--
-- Name: idx_dsh_product_proposals_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_product_proposals_status ON public.dsh_product_proposals USING btree (status, created_at DESC);


--
-- Name: idx_dsh_product_proposals_store; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_product_proposals_store ON public.dsh_product_proposals USING btree (source_store_id) WHERE (source_store_id IS NOT NULL);


--
-- Name: idx_dsh_readiness_checks_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_readiness_checks_store_id ON public.dsh_readiness_checks USING btree (store_id);


--
-- Name: idx_dsh_readiness_checks_visit_check; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX idx_dsh_readiness_checks_visit_check ON public.dsh_readiness_checks USING btree (visit_id, check_type);


--
-- Name: idx_dsh_readiness_checks_visit_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_readiness_checks_visit_id ON public.dsh_readiness_checks USING btree (visit_id);


--
-- Name: idx_dsh_reels_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_reels_status ON public.dsh_reels USING btree (status, sort_order, created_at DESC);


--
-- Name: idx_dsh_store_assortments_client_visible; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_store_assortments_client_visible ON public.dsh_store_assortments USING btree (publication_status, available) WHERE (publication_status = 'client_visible'::text);


--
-- Name: idx_dsh_store_assortments_master_product; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_store_assortments_master_product ON public.dsh_store_assortments USING btree (master_product_id);


--
-- Name: idx_dsh_store_assortments_store; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_store_assortments_store ON public.dsh_store_assortments USING btree (store_id, publication_status);


--
-- Name: idx_dsh_store_field_verifications_visit_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_store_field_verifications_visit_id ON public.dsh_store_field_verifications USING btree (visit_id);


--
-- Name: idx_dsh_stores_catalog_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_catalog_domain ON public.dsh_stores USING btree (catalog_domain_id);


--
-- Name: idx_dsh_stores_city_code; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_city_code ON public.dsh_stores USING btree (city_code);


--
-- Name: idx_dsh_stores_is_visible; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_is_visible ON public.dsh_stores USING btree (is_visible);


--
-- Name: idx_dsh_stores_partner_draft_lookup; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_partner_draft_lookup ON public.dsh_stores USING btree (partner_id, created_at);


--
-- Name: idx_dsh_stores_partner_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_partner_id ON public.dsh_stores USING btree (partner_id);


--
-- Name: idx_dsh_stores_service_area_code; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_service_area_code ON public.dsh_stores USING btree (service_area_code);


--
-- Name: idx_dsh_stores_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_stores_status ON public.dsh_stores USING btree (status);


--
-- Name: idx_dsh_support_messages_ticket_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_support_messages_ticket_id ON public.dsh_support_messages USING btree (ticket_id);


--
-- Name: idx_dsh_support_tickets_reporter; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_support_tickets_reporter ON public.dsh_support_tickets USING btree (reporter_id);


--
-- Name: idx_dsh_support_tickets_status; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_support_tickets_status ON public.dsh_support_tickets USING btree (status);


--
-- Name: idx_dsh_support_tickets_store_id; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_support_tickets_store_id ON public.dsh_support_tickets USING btree (store_id);


--
-- Name: idx_dsh_wlt_outbox_events_pending; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_wlt_outbox_events_pending ON public.dsh_wlt_outbox_events USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: idx_dsh_zones_active; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_zones_active ON public.dsh_platform_zones USING btree (is_active);


--
-- Name: idx_dsh_zones_city; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE INDEX idx_dsh_zones_city ON public.dsh_platform_zones USING btree (city_code);


--
-- Name: uq_dsh_catalog_asset_links_primary_active; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_catalog_asset_links_primary_active ON public.dsh_catalog_asset_links USING btree (entity_type, entity_id, role) WHERE ((is_primary = true) AND (status <> 'archived'::text));


--
-- Name: uq_dsh_catalog_platform_policies_default; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_default ON public.dsh_catalog_platform_policies USING btree ((1)) WHERE (policy_scope = 'default'::text);


--
-- Name: uq_dsh_catalog_platform_policies_domain; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_domain ON public.dsh_catalog_platform_policies USING btree (domain_id) WHERE (policy_scope = 'domain'::text);


--
-- Name: uq_dsh_catalog_platform_policies_node; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_catalog_platform_policies_node ON public.dsh_catalog_platform_policies USING btree (node_id) WHERE (policy_scope = 'node'::text);


--
-- Name: uq_dsh_field_visits_agent_in_progress; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_field_visits_agent_in_progress ON public.dsh_field_visits USING btree (field_agent_id) WHERE (status = 'in_progress'::text);


--
-- Name: uq_dsh_field_visits_store_in_progress; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_field_visits_store_in_progress ON public.dsh_field_visits USING btree (store_id) WHERE (status = 'in_progress'::text);


--
-- Name: uq_dsh_reels_asset; Type: INDEX; Schema: public; Owner: dsh_runtime
--

CREATE UNIQUE INDEX uq_dsh_reels_asset ON public.dsh_reels USING btree (asset_id);


--
-- Name: dsh_admin_staff_assignments dsh_admin_staff_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_admin_staff_assignments
    ADD CONSTRAINT dsh_admin_staff_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.dsh_admin_roles(id) ON DELETE CASCADE;


--
-- Name: dsh_assignments dsh_assignments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_assignments
    ADD CONSTRAINT dsh_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_cart_items dsh_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.dsh_carts(id) ON DELETE CASCADE;


--
-- Name: dsh_cart_items dsh_cart_items_store_assortment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_store_assortment_id_fkey FOREIGN KEY (store_assortment_id) REFERENCES public.dsh_store_assortments(id);


--
-- Name: dsh_carts dsh_carts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_carts
    ADD CONSTRAINT dsh_carts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_catalog_approval_audit_trail dsh_catalog_approval_audit_trail_approval_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_approval_audit_trail
    ADD CONSTRAINT dsh_catalog_approval_audit_trail_approval_record_id_fkey FOREIGN KEY (approval_record_id) REFERENCES public.dsh_catalog_approval_records(id) ON DELETE CASCADE;


--
-- Name: dsh_catalog_asset_links dsh_catalog_asset_links_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.dsh_catalog_assets(id);


--
-- Name: dsh_catalog_attribute_options dsh_catalog_attribute_options_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_attribute_options
    ADD CONSTRAINT dsh_catalog_attribute_options_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_catalog_collection_items dsh_catalog_collection_items_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collection_items
    ADD CONSTRAINT dsh_catalog_collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.dsh_catalog_collections(id);


--
-- Name: dsh_catalog_collection_items dsh_catalog_collection_items_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_collection_items
    ADD CONSTRAINT dsh_catalog_collection_items_master_product_id_fkey FOREIGN KEY (master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_node_attribute_rules dsh_catalog_node_attribute_rules_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_node_attribute_rules
    ADD CONSTRAINT dsh_catalog_node_attribute_rules_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_nodes dsh_catalog_nodes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_nodes
    ADD CONSTRAINT dsh_catalog_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_catalog_platform_policies dsh_catalog_platform_policies_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_catalog_platform_policies
    ADD CONSTRAINT dsh_catalog_platform_policies_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_checkout_intents dsh_checkout_intents_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_deliveries dsh_deliveries_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.dsh_assignments(id) ON DELETE CASCADE;


--
-- Name: dsh_deliveries dsh_deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_deliveries
    ADD CONSTRAINT dsh_deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_field_visits dsh_field_visits_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_field_visits
    ADD CONSTRAINT dsh_field_visits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.dsh_catalog_attributes(id);


--
-- Name: dsh_master_product_attribute_values dsh_master_product_attribute_values_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_product_attribute_values
    ADD CONSTRAINT dsh_master_product_attribute_values_master_product_id_fkey FOREIGN KEY (master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_master_products dsh_master_products_category_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_category_node_id_fkey FOREIGN KEY (category_node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_master_products dsh_master_products_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_master_products
    ADD CONSTRAINT dsh_master_products_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_media_refs dsh_media_refs_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_media_refs dsh_media_refs_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_media_refs
    ADD CONSTRAINT dsh_media_refs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_order_items dsh_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_order_items
    ADD CONSTRAINT dsh_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_order_status_events dsh_order_status_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_order_status_events
    ADD CONSTRAINT dsh_order_status_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- Name: dsh_orders dsh_orders_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_orders dsh_orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_orders
    ADD CONSTRAINT dsh_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id);


--
-- Name: dsh_partner_activation_events dsh_partner_activation_events_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_activation_events
    ADD CONSTRAINT dsh_partner_activation_events_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dsh_partner_documents(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_document_reviews dsh_partner_document_reviews_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_document_reviews
    ADD CONSTRAINT dsh_partner_document_reviews_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_documents dsh_partner_documents_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_documents
    ADD CONSTRAINT dsh_partner_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_field_visits dsh_partner_field_visits_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_field_visits
    ADD CONSTRAINT dsh_partner_field_visits_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_partner_offers dsh_partner_offers_linked_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_linked_campaign_id_fkey FOREIGN KEY (linked_campaign_id) REFERENCES public.dsh_marketing_campaigns(id);


--
-- Name: dsh_partner_store_visibility_events dsh_partner_store_visibility_events_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_store_visibility_events
    ADD CONSTRAINT dsh_partner_store_visibility_events_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE CASCADE;


--
-- Name: dsh_partner_store_visibility_events dsh_partner_store_visibility_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_partner_store_visibility_events
    ADD CONSTRAINT dsh_partner_store_visibility_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidat_candidate_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidat_candidate_master_product_id_fkey FOREIGN KEY (candidate_master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_product_duplicate_candidates dsh_product_duplicate_candidates_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_duplicate_candidates
    ADD CONSTRAINT dsh_product_duplicate_candidates_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.dsh_product_proposals(id);


--
-- Name: dsh_product_proposal_audit dsh_product_proposal_audit_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposal_audit
    ADD CONSTRAINT dsh_product_proposal_audit_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.dsh_product_proposals(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_adopted_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_adopted_master_product_id_fkey FOREIGN KEY (adopted_master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_category_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_category_node_id_fkey FOREIGN KEY (category_node_id) REFERENCES public.dsh_catalog_nodes(id);


--
-- Name: dsh_product_proposals dsh_product_proposals_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_product_proposals
    ADD CONSTRAINT dsh_product_proposals_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_readiness_checks dsh_readiness_checks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_checks dsh_readiness_checks_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_checks
    ADD CONSTRAINT dsh_readiness_checks_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_readiness_escalations dsh_readiness_escalations_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_readiness_escalations
    ADD CONSTRAINT dsh_readiness_escalations_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE SET NULL;


--
-- Name: dsh_reels dsh_reels_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_reels
    ADD CONSTRAINT dsh_reels_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.dsh_catalog_assets(id);


--
-- Name: dsh_store_action_audit dsh_store_action_audit_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_action_audit
    ADD CONSTRAINT dsh_store_action_audit_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_actor_scopes dsh_store_actor_scopes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_actor_scopes
    ADD CONSTRAINT dsh_store_actor_scopes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_assortments dsh_store_assortments_master_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_master_product_id_fkey FOREIGN KEY (master_product_id) REFERENCES public.dsh_master_products(id);


--
-- Name: dsh_store_assortments dsh_store_assortments_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_assortments
    ADD CONSTRAINT dsh_store_assortments_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_store_field_verifications dsh_store_field_verifications_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_field_verifications
    ADD CONSTRAINT dsh_store_field_verifications_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.dsh_field_visits(id) ON DELETE SET NULL;


--
-- Name: dsh_store_pickup_readiness_reports dsh_store_pickup_readiness_reports_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_store_pickup_readiness_reports
    ADD CONSTRAINT dsh_store_pickup_readiness_reports_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE CASCADE;


--
-- Name: dsh_stores dsh_stores_catalog_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_catalog_domain_id_fkey FOREIGN KEY (catalog_domain_id) REFERENCES public.dsh_catalog_domains(id);


--
-- Name: dsh_stores dsh_stores_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_stores
    ADD CONSTRAINT dsh_stores_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.dsh_partners(id) ON DELETE SET NULL;


--
-- Name: dsh_support_messages dsh_support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_support_messages
    ADD CONSTRAINT dsh_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.dsh_support_tickets(id) ON DELETE CASCADE;


--
-- Name: dsh_support_tickets dsh_support_tickets_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_support_tickets
    ADD CONSTRAINT dsh_support_tickets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.dsh_stores(id) ON DELETE SET NULL;


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_checkout_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_checkout_intent_id_fkey FOREIGN KEY (checkout_intent_id) REFERENCES public.dsh_checkout_intents(id);


--
-- Name: dsh_wlt_outbox_events dsh_wlt_outbox_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dsh_runtime
--

ALTER TABLE ONLY public.dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.dsh_orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict BecOYJwlDyZSwJvKZIoFcp8ci4frouu0HjnF0MlpPh48u9zuGJrgHIlKIcbQKTV

--
-- Database "identity_runtime" dump
--

--
-- PostgreSQL database dump
--

\restrict lb2CnuLgRYQJPH4huKMVRBxaysDvJWrOiQIdVwbiI9yRMyduaB6rdF7ZOPvrVas

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: identity_runtime; Type: DATABASE; Schema: -; Owner: identity_runtime
--

CREATE DATABASE identity_runtime WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE identity_runtime OWNER TO identity_runtime;

\unrestrict lb2CnuLgRYQJPH4huKMVRBxaysDvJWrOiQIdVwbiI9yRMyduaB6rdF7ZOPvrVas
\connect identity_runtime
\restrict lb2CnuLgRYQJPH4huKMVRBxaysDvJWrOiQIdVwbiI9yRMyduaB6rdF7ZOPvrVas

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: identity_activation_challenges; Type: TABLE; Schema: public; Owner: identity_runtime
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
    CONSTRAINT identity_activation_challenges_actor_type_check CHECK ((actor_type = ANY (ARRAY['field'::text, 'captain'::text]))),
    CONSTRAINT identity_activation_challenges_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT identity_activation_challenges_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'consumed'::text, 'revoked'::text, 'expired'::text, 'locked'::text]))),
    CONSTRAINT identity_activation_challenges_surface_check CHECK ((surface = ANY (ARRAY['app-field'::text, 'app-captain'::text])))
);


ALTER TABLE public.identity_activation_challenges OWNER TO identity_runtime;

--
-- Name: identity_actors; Type: TABLE; Schema: public; Owner: identity_runtime
--

CREATE TABLE public.identity_actors (
    id text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    tenant_id text NOT NULL,
    roles text[] NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone_e164 text
);


ALTER TABLE public.identity_actors OWNER TO identity_runtime;

--
-- Name: identity_login_attempts; Type: TABLE; Schema: public; Owner: identity_runtime
--

CREATE TABLE public.identity_login_attempts (
    id bigint NOT NULL,
    username text NOT NULL,
    succeeded boolean NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.identity_login_attempts OWNER TO identity_runtime;

--
-- Name: identity_login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: identity_runtime
--

CREATE SEQUENCE public.identity_login_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.identity_login_attempts_id_seq OWNER TO identity_runtime;

--
-- Name: identity_login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: identity_runtime
--

ALTER SEQUENCE public.identity_login_attempts_id_seq OWNED BY public.identity_login_attempts.id;


--
-- Name: identity_sessions; Type: TABLE; Schema: public; Owner: identity_runtime
--

CREATE TABLE public.identity_sessions (
    id text NOT NULL,
    actor_id text NOT NULL,
    access_token_hash text NOT NULL,
    refresh_token_hash text NOT NULL,
    device_fingerprint text,
    access_expires_at timestamp with time zone NOT NULL,
    refresh_expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.identity_sessions OWNER TO identity_runtime;

--
-- Name: identity_login_attempts id; Type: DEFAULT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.identity_login_attempts_id_seq'::regclass);


--
-- Data for Name: identity_activation_challenges; Type: TABLE DATA; Schema: public; Owner: identity_runtime
--

COPY public.identity_activation_challenges (id, actor_id, actor_type, phone_e164, surface, code_hash, status, attempts, expires_at, consumed_at, issued_by_actor_id, idempotency_key, correlation_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: identity_actors; Type: TABLE DATA; Schema: public; Owner: identity_runtime
--

COPY public.identity_actors (id, username, password_hash, tenant_id, roles, permissions, active, created_at, updated_at, phone_e164) FROM stdin;
operator-local-001	operator	$2a$10$IqzZHvBjwWcowRWZhQdbQOuouCcxcR9w6DwuuxFFywxBKVFGJ01iO	local-dsh	{operator}	[{"scope": "all", "action": "store:read", "service": "dsh", "surface": "control-panel"}, {"scope": "all", "action": "store:write", "service": "dsh", "surface": "control-panel"}, {"scope": "all", "action": "provider:read", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "provider:create", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "provider:update", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "provider:suspend", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "provider:reactivate", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "provider.activation:issue", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "reference:manage", "service": "workforce", "surface": "control-panel"}, {"scope": "all", "action": "audit:read", "service": "workforce", "surface": "control-panel"}]	t	2026-07-13 21:43:51.330991+00	2026-07-13 21:43:51.330991+00	+967770000000
partner-local-001	bthwani	$2a$10$IqzZHvBjwWcowRWZhQdbQOuouCcxcR9w6DwuuxFFywxBKVFGJ01iO	local-dsh	{partner}	[{"scope": "own", "action": "store:read", "service": "dsh", "surface": "app-partner"}, {"scope": "own", "action": "store:write", "service": "dsh", "surface": "app-partner"}]	t	2026-07-13 21:43:51.349028+00	2026-07-13 21:43:51.349028+00	+967771000001
field-local-001	field	$2a$10$IqzZHvBjwWcowRWZhQdbQOuouCcxcR9w6DwuuxFFywxBKVFGJ01iO	local-dsh	{field}	[{"scope": "assigned", "action": "store:read", "service": "dsh", "surface": "app-field"}, {"scope": "assigned", "action": "store:write", "service": "dsh", "surface": "app-field"}, {"scope": "own", "action": "provider:read", "service": "workforce", "surface": "app-field"}, {"scope": "own", "action": "provider:update", "service": "workforce", "surface": "app-field"}]	t	2026-07-13 21:43:51.363375+00	2026-07-13 21:43:51.363375+00	+967774182730
captain-local-001	captain	$2a$10$IqzZHvBjwWcowRWZhQdbQOuouCcxcR9w6DwuuxFFywxBKVFGJ01iO	local-dsh	{captain}	[{"scope": "assigned", "action": "store:read", "service": "dsh", "surface": "app-captain"}, {"scope": "assigned", "action": "store:write", "service": "dsh", "surface": "app-captain"}, {"scope": "own", "action": "provider:read", "service": "workforce", "surface": "app-captain"}, {"scope": "own", "action": "provider:update", "service": "workforce", "surface": "app-captain"}]	t	2026-07-13 21:43:51.377943+00	2026-07-13 21:43:51.377943+00	+967773000003
client-local-001	client	$2a$10$IqzZHvBjwWcowRWZhQdbQOuouCcxcR9w6DwuuxFFywxBKVFGJ01iO	local-dsh	{client}	[{"scope": "own", "action": "store:read", "service": "dsh", "surface": "app-client"}, {"scope": "own", "action": "store:write", "service": "dsh", "surface": "app-client"}]	t	2026-07-13 21:43:51.392468+00	2026-07-13 21:43:51.392468+00	+967774000004
\.


--
-- Data for Name: identity_login_attempts; Type: TABLE DATA; Schema: public; Owner: identity_runtime
--

COPY public.identity_login_attempts (id, username, succeeded, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: identity_sessions; Type: TABLE DATA; Schema: public; Owner: identity_runtime
--

COPY public.identity_sessions (id, actor_id, access_token_hash, refresh_token_hash, device_fingerprint, access_expires_at, refresh_expires_at, revoked_at, created_at) FROM stdin;
\.


--
-- Name: identity_login_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: identity_runtime
--

SELECT pg_catalog.setval('public.identity_login_attempts_id_seq', 1, false);


--
-- Name: identity_activation_challenges identity_activation_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_pkey PRIMARY KEY (id);


--
-- Name: identity_actors identity_actors_pkey; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_actors
    ADD CONSTRAINT identity_actors_pkey PRIMARY KEY (id);


--
-- Name: identity_actors identity_actors_username_key; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_actors
    ADD CONSTRAINT identity_actors_username_key UNIQUE (username);


--
-- Name: identity_login_attempts identity_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_login_attempts
    ADD CONSTRAINT identity_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: identity_sessions identity_sessions_access_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_access_token_hash_key UNIQUE (access_token_hash);


--
-- Name: identity_sessions identity_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_pkey PRIMARY KEY (id);


--
-- Name: identity_sessions identity_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: identity_activation_idempotency_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE UNIQUE INDEX identity_activation_idempotency_idx ON public.identity_activation_challenges USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: identity_activation_lookup_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_activation_lookup_idx ON public.identity_activation_challenges USING btree (actor_type, phone_e164, surface, created_at DESC);


--
-- Name: identity_activation_one_pending_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE UNIQUE INDEX identity_activation_one_pending_idx ON public.identity_activation_challenges USING btree (actor_type, phone_e164) WHERE (status = 'pending'::text);


--
-- Name: identity_actors_phone_e164_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE UNIQUE INDEX identity_actors_phone_e164_idx ON public.identity_actors USING btree (phone_e164) WHERE (phone_e164 IS NOT NULL);


--
-- Name: identity_login_attempts_time_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_login_attempts_time_idx ON public.identity_login_attempts USING btree (created_at);


--
-- Name: identity_login_attempts_username_time_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_login_attempts_username_time_idx ON public.identity_login_attempts USING btree (username, created_at DESC);


--
-- Name: identity_sessions_access_expiry_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_sessions_access_expiry_idx ON public.identity_sessions USING btree (access_expires_at) WHERE (revoked_at IS NULL);


--
-- Name: identity_sessions_actor_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_sessions_actor_idx ON public.identity_sessions USING btree (actor_id, created_at DESC);


--
-- Name: identity_sessions_refresh_expiry_idx; Type: INDEX; Schema: public; Owner: identity_runtime
--

CREATE INDEX identity_sessions_refresh_expiry_idx ON public.identity_sessions USING btree (refresh_expires_at) WHERE (revoked_at IS NULL);


--
-- Name: identity_activation_challenges identity_activation_challenges_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- Name: identity_activation_challenges identity_activation_challenges_issued_by_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_activation_challenges
    ADD CONSTRAINT identity_activation_challenges_issued_by_actor_id_fkey FOREIGN KEY (issued_by_actor_id) REFERENCES public.identity_actors(id);


--
-- Name: identity_sessions identity_sessions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: identity_runtime
--

ALTER TABLE ONLY public.identity_sessions
    ADD CONSTRAINT identity_sessions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.identity_actors(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lb2CnuLgRYQJPH4huKMVRBxaysDvJWrOiQIdVwbiI9yRMyduaB6rdF7ZOPvrVas

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict fc8qDsuLALQgLfTEcu2yVrSF07tgFFrUyphRap6XXFnJlpbiYufCTOUlzjJ3XPo

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict fc8qDsuLALQgLfTEcu2yVrSF07tgFFrUyphRap6XXFnJlpbiYufCTOUlzjJ3XPo

--
-- Database "wlt_runtime" dump
--

--
-- PostgreSQL database dump
--

\restrict ffX2XkvvrmjhLEtoiN8wNrC1vdfH9KwdoT0OeeUvf1xEjycnS1fiyvuKsbrSoiE

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: wlt_runtime; Type: DATABASE; Schema: -; Owner: wlt_runtime
--

CREATE DATABASE wlt_runtime WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE wlt_runtime OWNER TO wlt_runtime;

\unrestrict ffX2XkvvrmjhLEtoiN8wNrC1vdfH9KwdoT0OeeUvf1xEjycnS1fiyvuKsbrSoiE
\connect wlt_runtime
\restrict ffX2XkvvrmjhLEtoiN8wNrC1vdfH9KwdoT0OeeUvf1xEjycnS1fiyvuKsbrSoiE

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: wlt_cod_records; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_cod_records (
    id text DEFAULT ('wcod_'::text || (gen_random_uuid())::text) NOT NULL,
    order_id text NOT NULL,
    captain_id text NOT NULL,
    partner_id text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'pending_collection'::text NOT NULL,
    collected_at timestamp with time zone,
    remitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_cod_records_status_chk CHECK ((status = ANY (ARRAY['pending_collection'::text, 'collected'::text, 'remitted'::text, 'disputed'::text, 'resolved'::text])))
);


ALTER TABLE public.wlt_cod_records OWNER TO wlt_runtime;

--
-- Name: wlt_commissions; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_commissions (
    id text DEFAULT ('wcom_'::text || (gen_random_uuid())::text) NOT NULL,
    order_id text NOT NULL,
    captain_id text NOT NULL,
    partner_id text NOT NULL,
    commission_type text DEFAULT 'delivery_fee'::text NOT NULL,
    amount_minor_units bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    settled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_commissions_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'settled'::text, 'reversed'::text]))),
    CONSTRAINT wlt_commissions_type_chk CHECK ((commission_type = ANY (ARRAY['delivery_fee'::text, 'platform_fee'::text, 'cod_fee'::text, 'partner_discount'::text])))
);


ALTER TABLE public.wlt_commissions OWNER TO wlt_runtime;

--
-- Name: wlt_dsh_outbox_events; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_dsh_outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    payment_session_id text NOT NULL,
    checkout_intent_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_dsh_outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text])))
);


ALTER TABLE public.wlt_dsh_outbox_events OWNER TO wlt_runtime;

--
-- Name: wlt_field_commission_refs; Type: TABLE; Schema: public; Owner: wlt_runtime
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
    CONSTRAINT wlt_field_commission_refs_status_chk CHECK ((status = ANY (ARRAY['eligible_pending_review'::text, 'approved_pending_settlement'::text, 'settled'::text, 'held_for_evidence'::text, 'rejected'::text])))
);


ALTER TABLE public.wlt_field_commission_refs OWNER TO wlt_runtime;

--
-- Name: wlt_ledger_entries; Type: TABLE; Schema: public; Owner: wlt_runtime
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
    CONSTRAINT wlt_ledger_actor_type_chk CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'system'::text, 'platform'::text]))),
    CONSTRAINT wlt_ledger_debit_credit_chk CHECK ((debit_credit = ANY (ARRAY['debit'::text, 'credit'::text])))
);


ALTER TABLE public.wlt_ledger_entries OWNER TO wlt_runtime;

--
-- Name: wlt_payment_sessions; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_payment_sessions (
    id text DEFAULT ('wps_'::text || (gen_random_uuid())::text) NOT NULL,
    checkout_intent_id text NOT NULL,
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
    CONSTRAINT wlt_payment_sessions_payment_method_chk CHECK ((payment_method = ANY (ARRAY['cod'::text, 'wallet'::text, 'mixed'::text, 'official_wallet'::text]))),
    CONSTRAINT wlt_payment_sessions_status_chk CHECK ((status = ANY (ARRAY['reference_created'::text, 'pending_provider'::text, 'authorized'::text, 'captured'::text, 'cod_pending'::text, 'cod_collected'::text, 'failed'::text, 'expired'::text])))
);


ALTER TABLE public.wlt_payment_sessions OWNER TO wlt_runtime;

--
-- Name: wlt_payment_status_refs; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_payment_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_payment_status_refs_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'authorized'::text, 'captured'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text])))
);


ALTER TABLE public.wlt_payment_status_refs OWNER TO wlt_runtime;

--
-- Name: wlt_refund_status_refs; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_refund_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_refund_status_refs_status_chk CHECK ((status = ANY (ARRAY['none'::text, 'requested'::text, 'approved'::text, 'completed'::text, 'rejected'::text])))
);


ALTER TABLE public.wlt_refund_status_refs OWNER TO wlt_runtime;

--
-- Name: wlt_refunds; Type: TABLE; Schema: public; Owner: wlt_runtime
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
    CONSTRAINT wlt_refunds_status_chk CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'completed'::text, 'rejected'::text, 'reversed'::text])))
);


ALTER TABLE public.wlt_refunds OWNER TO wlt_runtime;

--
-- Name: wlt_settlement_status_refs; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_settlement_status_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    order_id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_settlement_status_refs_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'settled'::text, 'failed'::text])))
);


ALTER TABLE public.wlt_settlement_status_refs OWNER TO wlt_runtime;

--
-- Name: wlt_settlements; Type: TABLE; Schema: public; Owner: wlt_runtime
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
    CONSTRAINT wlt_settlements_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'settled'::text, 'failed'::text, 'reversed'::text])))
);


ALTER TABLE public.wlt_settlements OWNER TO wlt_runtime;

--
-- Name: wlt_wallet_refs; Type: TABLE; Schema: public; Owner: wlt_runtime
--

CREATE TABLE public.wlt_wallet_refs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    actor_id text NOT NULL,
    actor_type text NOT NULL,
    status text NOT NULL,
    currency text DEFAULT 'YER'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wlt_wallet_refs_actor_type_chk CHECK ((actor_type = ANY (ARRAY['client'::text, 'partner'::text, 'captain'::text, 'field'::text]))),
    CONSTRAINT wlt_wallet_refs_status_chk CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'frozen'::text, 'closed'::text])))
);


ALTER TABLE public.wlt_wallet_refs OWNER TO wlt_runtime;

--
-- Data for Name: wlt_cod_records; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_cod_records (id, order_id, captain_id, partner_id, amount_minor_units, currency, status, collected_at, remitted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wlt_commissions; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_commissions (id, order_id, captain_id, partner_id, commission_type, amount_minor_units, currency, status, settled_at, created_at) FROM stdin;
\.


--
-- Data for Name: wlt_dsh_outbox_events; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_dsh_outbox_events (id, event_type, payment_session_id, checkout_intent_id, status, attempt_count, last_error, next_retry_at, created_at, updated_at) FROM stdin;
e4bae921-79dc-427c-be8b-62f833cbbfd8	captured	wps_de024142-fd64-4a9a-ad4e-23bb93f3c5a2	test-checkout-cap-1783989343772029000	pending	10	Post "http://dsh-api:8080/dsh/internal/wlt/payment-session-events": context deadline exceeded (Client.Timeout exceeded while awaiting headers)	2026-07-14 01:11:44.220812+00	2026-07-14 00:35:43.799359+00	2026-07-14 00:54:40.220812+00
ebd126c6-a9a8-46e7-b4b0-5349f72b35bf	failed	wps_fe54e2da-82ed-44bf-963e-58bd98f0330d	test-checkout-fail-1783989343854417500	pending	10	Post "http://dsh-api:8080/dsh/internal/wlt/payment-session-events": dial tcp: lookup dsh-api on 127.0.0.11:53: no such host	2026-07-14 01:12:13.199577+00	2026-07-14 00:35:43.89654+00	2026-07-14 00:55:09.199577+00
1011a7c8-16d4-4fed-a26d-3ba9ee1f37fa	captured	wps_81f82eca-93b2-475c-8c10-c7370524c64e	test-checkout-cap-1783988433409948500	pending	11	Post "http://dsh-api:8080/dsh/internal/wlt/payment-session-events": dial tcp: lookup dsh-api on 127.0.0.11:53: no such host	2026-07-14 01:13:43.206746+00	2026-07-14 00:20:33.435453+00	2026-07-14 00:56:39.206746+00
e85b4c4b-9891-4640-b6cf-bc25173ac611	failed	wps_4cce3bac-49a6-45b9-859d-2e33fdba5cdd	test-checkout-fail-1783988433481861300	pending	11	Post "http://dsh-api:8080/dsh/internal/wlt/payment-session-events": context deadline exceeded (Client.Timeout exceeded while awaiting headers)	2026-07-14 01:13:59.212652+00	2026-07-14 00:20:33.503753+00	2026-07-14 00:56:55.212652+00
\.


--
-- Data for Name: wlt_field_commission_refs; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_field_commission_refs (id, partner_id, partner_name, amount_minor_units, currency, status, description, evidence_required, settled_at, created_at, updated_at) FROM stdin;
wlt-fcr-0001	partner-dev-0001	متجر النور التجاري	1500000	YER	eligible_pending_review	عمولة تأهيل شريك ميداني معلقة المراجعة	f	\N	2026-07-13 21:42:48.051576+00	2026-07-13 21:42:48.051576+00
wlt-fcr-0002	partner-dev-0002	مخبز البركة الحديث	2000000	YER	settled	تم تسوية عمولة تأهيل الشريك الميداني بالكامل بنجاح	f	2026-07-01 09:00:00+00	2026-07-13 21:42:48.051576+00	2026-07-13 21:42:48.051576+00
\.


--
-- Data for Name: wlt_ledger_entries; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_ledger_entries (id, entry_type, actor_id, actor_type, order_id, reference_id, reference_type, amount_minor_units, currency, debit_credit, balance_after, description, created_at) FROM stdin;
\.


--
-- Data for Name: wlt_payment_sessions; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_payment_sessions (id, checkout_intent_id, client_id, store_id, payment_method, status, provider_reference, created_at, updated_at, amount_minor_units, currency, captured_at, cart_snapshot_hash, idempotency_key, correlation_id) FROM stdin;
wps_6a3f6fe7-2216-42e3-a934-ba5f66302925	test-checkout-auth-1783988433338443500	client-test	store-test	official_wallet	authorized	card-auth-001	2026-07-14 00:20:33.345829+00	2026-07-14 00:20:33.377752+00	1000	YER	\N			
wps_81f82eca-93b2-475c-8c10-c7370524c64e	test-checkout-cap-1783988433409948500	client-test	store-test	official_wallet	captured	card-capture-001	2026-07-14 00:20:33.415293+00	2026-07-14 00:20:33.435453+00	1000	YER	2026-07-14 00:20:33.435453+00			
wps_4cce3bac-49a6-45b9-859d-2e33fdba5cdd	test-checkout-fail-1783988433481861300	client-test	store-test	official_wallet	failed		2026-07-14 00:20:33.484871+00	2026-07-14 00:20:33.503753+00	0	YER	\N			
wps_f0546904-9003-4e7e-b9b2-74b0f667f7c8	test-checkout-auth-1783989343698455800	client-test	store-test	official_wallet	authorized	card-auth-001	2026-07-14 00:35:43.704454+00	2026-07-14 00:35:43.730971+00	1000	YER	\N			
wps_de024142-fd64-4a9a-ad4e-23bb93f3c5a2	test-checkout-cap-1783989343772029000	client-test	store-test	official_wallet	captured	card-capture-001	2026-07-14 00:35:43.77735+00	2026-07-14 00:35:43.799359+00	1000	YER	2026-07-14 00:35:43.799359+00			
wps_fe54e2da-82ed-44bf-963e-58bd98f0330d	test-checkout-fail-1783989343854417500	client-test	store-test	official_wallet	failed		2026-07-14 00:35:43.862945+00	2026-07-14 00:35:43.89654+00	0	YER	\N			
\.


--
-- Data for Name: wlt_payment_status_refs; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_payment_status_refs (id, order_id, status, created_at, updated_at) FROM stdin;
wlt-psr-0001	order-dev-0001	captured	2026-07-13 21:42:47.990077+00	2026-07-13 21:42:47.990077+00
wlt-psr-0002	order-dev-0002	pending	2026-07-13 21:42:47.990077+00	2026-07-13 21:42:47.990077+00
wlt-psr-0003	order-dev-0003	failed	2026-07-13 21:42:47.990077+00	2026-07-13 21:42:47.990077+00
wlt-psr-0004	order-dev-0004	refunded	2026-07-13 21:42:47.990077+00	2026-07-13 21:42:47.990077+00
\.


--
-- Data for Name: wlt_refund_status_refs; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_refund_status_refs (id, order_id, status, created_at, updated_at) FROM stdin;
wlt-rsr-0001	order-dev-0001	none	2026-07-13 21:42:48.021121+00	2026-07-13 21:42:48.021121+00
wlt-rsr-0002	order-dev-0002	none	2026-07-13 21:42:48.021121+00	2026-07-13 21:42:48.021121+00
wlt-rsr-0003	order-dev-0003	none	2026-07-13 21:42:48.021121+00	2026-07-13 21:42:48.021121+00
wlt-rsr-0004	order-dev-0004	completed	2026-07-13 21:42:48.021121+00	2026-07-13 21:42:48.021121+00
\.


--
-- Data for Name: wlt_refunds; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_refunds (id, payment_session_id, order_id, client_id, amount_minor_units, currency, reason, status, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wlt_settlement_status_refs; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_settlement_status_refs (id, order_id, status, created_at, updated_at) FROM stdin;
wlt-ssr-0001	order-dev-0001	settled	2026-07-13 21:42:48.006077+00	2026-07-13 21:42:48.006077+00
wlt-ssr-0002	order-dev-0002	pending	2026-07-13 21:42:48.006077+00	2026-07-13 21:42:48.006077+00
wlt-ssr-0003	order-dev-0003	failed	2026-07-13 21:42:48.006077+00	2026-07-13 21:42:48.006077+00
wlt-ssr-0004	order-dev-0004	processing	2026-07-13 21:42:48.006077+00	2026-07-13 21:42:48.006077+00
\.


--
-- Data for Name: wlt_settlements; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_settlements (id, partner_id, period_start, period_end, gross_amount, platform_fee, net_amount, currency, order_count, status, settled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wlt_wallet_refs; Type: TABLE DATA; Schema: public; Owner: wlt_runtime
--

COPY public.wlt_wallet_refs (id, actor_id, actor_type, status, currency, created_at, updated_at) FROM stdin;
wlt-wr-0001	partner-dev-0001	partner	active	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
wlt-wr-0002	partner-dev-0002	partner	suspended	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
wlt-wr-0003	captain-dev-0001	captain	active	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
wlt-wr-0004	captain-dev-0002	captain	frozen	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
wlt-wr-0005	field-dev-0001	field	active	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
wlt-wr-0006	client-dev-0001	client	active	YER	2026-07-13 21:42:48.036193+00	2026-07-13 21:42:48.036193+00
\.


--
-- Name: wlt_cod_records wlt_cod_records_order_id_key; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_cod_records
    ADD CONSTRAINT wlt_cod_records_order_id_key UNIQUE (order_id);


--
-- Name: wlt_cod_records wlt_cod_records_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_cod_records
    ADD CONSTRAINT wlt_cod_records_pkey PRIMARY KEY (id);


--
-- Name: wlt_commissions wlt_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_commissions
    ADD CONSTRAINT wlt_commissions_pkey PRIMARY KEY (id);


--
-- Name: wlt_dsh_outbox_events wlt_dsh_outbox_events_payment_session_id_event_type_key; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_payment_session_id_event_type_key UNIQUE (payment_session_id, event_type);


--
-- Name: wlt_dsh_outbox_events wlt_dsh_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_pkey PRIMARY KEY (id);


--
-- Name: wlt_field_commission_refs wlt_field_commission_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_field_commission_refs
    ADD CONSTRAINT wlt_field_commission_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_ledger_entries wlt_ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_ledger_entries
    ADD CONSTRAINT wlt_ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: wlt_payment_sessions wlt_payment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_pkey PRIMARY KEY (id);


--
-- Name: wlt_payment_status_refs wlt_payment_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_payment_status_refs
    ADD CONSTRAINT wlt_payment_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_refund_status_refs wlt_refund_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_refund_status_refs
    ADD CONSTRAINT wlt_refund_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_refunds wlt_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlement_status_refs wlt_settlement_status_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_settlement_status_refs
    ADD CONSTRAINT wlt_settlement_status_refs_pkey PRIMARY KEY (id);


--
-- Name: wlt_settlements wlt_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_settlements
    ADD CONSTRAINT wlt_settlements_pkey PRIMARY KEY (id);


--
-- Name: wlt_wallet_refs wlt_wallet_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_wallet_refs
    ADD CONSTRAINT wlt_wallet_refs_pkey PRIMARY KEY (id);


--
-- Name: idx_wlt_dsh_outbox_events_pending; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX idx_wlt_dsh_outbox_events_pending ON public.wlt_dsh_outbox_events USING btree (next_retry_at) WHERE (status = 'pending'::text);


--
-- Name: wlt_cod_records_captain_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_cod_records_captain_idx ON public.wlt_cod_records USING btree (captain_id, created_at DESC);


--
-- Name: wlt_cod_records_partner_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_cod_records_partner_idx ON public.wlt_cod_records USING btree (partner_id, created_at DESC);


--
-- Name: wlt_commissions_captain_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_commissions_captain_idx ON public.wlt_commissions USING btree (captain_id, created_at DESC);


--
-- Name: wlt_commissions_order_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_commissions_order_idx ON public.wlt_commissions USING btree (order_id);


--
-- Name: wlt_field_commission_refs_partner_id_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_field_commission_refs_partner_id_idx ON public.wlt_field_commission_refs USING btree (partner_id, updated_at DESC);


--
-- Name: wlt_ledger_actor_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_ledger_actor_idx ON public.wlt_ledger_entries USING btree (actor_id, created_at DESC);


--
-- Name: wlt_ledger_order_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_ledger_order_idx ON public.wlt_ledger_entries USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: wlt_ledger_type_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_ledger_type_idx ON public.wlt_ledger_entries USING btree (entry_type, created_at DESC);


--
-- Name: wlt_payment_sessions_checkout_intent_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE UNIQUE INDEX wlt_payment_sessions_checkout_intent_idx ON public.wlt_payment_sessions USING btree (checkout_intent_id);


--
-- Name: wlt_payment_sessions_client_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_payment_sessions_client_idx ON public.wlt_payment_sessions USING btree (client_id, updated_at DESC);


--
-- Name: wlt_payment_sessions_idempotency_key_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_payment_sessions_idempotency_key_idx ON public.wlt_payment_sessions USING btree (idempotency_key) WHERE (idempotency_key <> ''::text);


--
-- Name: wlt_payment_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_payment_status_refs_order_id_idx ON public.wlt_payment_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_refund_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_refund_status_refs_order_id_idx ON public.wlt_refund_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_refunds_client_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_refunds_client_idx ON public.wlt_refunds USING btree (client_id, created_at DESC);


--
-- Name: wlt_refunds_order_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_refunds_order_idx ON public.wlt_refunds USING btree (order_id);


--
-- Name: wlt_refunds_payment_session_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_refunds_payment_session_idx ON public.wlt_refunds USING btree (payment_session_id);


--
-- Name: wlt_settlement_status_refs_order_id_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_settlement_status_refs_order_id_idx ON public.wlt_settlement_status_refs USING btree (order_id, updated_at DESC);


--
-- Name: wlt_settlements_partner_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_settlements_partner_idx ON public.wlt_settlements USING btree (partner_id, period_start DESC);


--
-- Name: wlt_wallet_refs_actor_idx; Type: INDEX; Schema: public; Owner: wlt_runtime
--

CREATE INDEX wlt_wallet_refs_actor_idx ON public.wlt_wallet_refs USING btree (actor_id, actor_type, updated_at DESC);


--
-- Name: wlt_dsh_outbox_events wlt_dsh_outbox_events_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id) ON DELETE CASCADE;


--
-- Name: wlt_refunds wlt_refunds_payment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wlt_runtime
--

ALTER TABLE ONLY public.wlt_refunds
    ADD CONSTRAINT wlt_refunds_payment_session_id_fkey FOREIGN KEY (payment_session_id) REFERENCES public.wlt_payment_sessions(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ffX2XkvvrmjhLEtoiN8wNrC1vdfH9KwdoT0OeeUvf1xEjycnS1fiyvuKsbrSoiE

--
-- Database "workforce_runtime" dump
--

--
-- PostgreSQL database dump
--

\restrict 3593POCTwHwS1XwJx2TKMG0YM5UANn10NBObpGMNhuVFn5FziX9bzxRmHTZ1LNL

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: workforce_runtime; Type: DATABASE; Schema: -; Owner: workforce_runtime
--

CREATE DATABASE workforce_runtime WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE workforce_runtime OWNER TO workforce_runtime;

\unrestrict 3593POCTwHwS1XwJx2TKMG0YM5UANn10NBObpGMNhuVFn5FziX9bzxRmHTZ1LNL
\connect workforce_runtime
\restrict 3593POCTwHwS1XwJx2TKMG0YM5UANn10NBObpGMNhuVFn5FziX9bzxRmHTZ1LNL

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: workforce_enforce_provider_exclusivity(); Type: FUNCTION; Schema: public; Owner: workforce_runtime
--

CREATE FUNCTION public.workforce_enforce_provider_exclusivity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'workforce_field_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_captain_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a captain profile; a provider cannot be both field and captain', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'workforce_captain_profiles' THEN
    IF EXISTS (SELECT 1 FROM workforce_field_profiles WHERE actor_id = NEW.actor_id) THEN
      RAISE EXCEPTION 'actor % already has a field profile; a provider cannot be both field and captain', NEW.actor_id
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.workforce_enforce_provider_exclusivity() OWNER TO workforce_runtime;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: workforce_action_audit; Type: TABLE; Schema: public; Owner: workforce_runtime
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workforce_action_audit OWNER TO workforce_runtime;

--
-- Name: workforce_action_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: workforce_runtime
--

CREATE SEQUENCE public.workforce_action_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workforce_action_audit_id_seq OWNER TO workforce_runtime;

--
-- Name: workforce_action_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: workforce_runtime
--

ALTER SEQUENCE public.workforce_action_audit_id_seq OWNED BY public.workforce_action_audit.id;


--
-- Name: workforce_captain_code_seq; Type: SEQUENCE; Schema: public; Owner: workforce_runtime
--

CREATE SEQUENCE public.workforce_captain_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workforce_captain_code_seq OWNER TO workforce_runtime;

--
-- Name: workforce_captain_profiles; Type: TABLE; Schema: public; Owner: workforce_runtime
--

CREATE TABLE public.workforce_captain_profiles (
    actor_id text NOT NULL,
    vehicle_type text,
    vehicle_identifier text,
    license_status text,
    license_expires_at date,
    operating_city_code text,
    operating_scope_code text,
    document_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_zone_id text,
    supervisor_actor_id text,
    CONSTRAINT workforce_captain_profiles_license_status_check CHECK ((license_status = ANY (ARRAY['missing'::text, 'pending_review'::text, 'valid'::text, 'expired'::text, 'rejected'::text])))
);


ALTER TABLE public.workforce_captain_profiles OWNER TO workforce_runtime;

--
-- Name: workforce_cities; Type: TABLE; Schema: public; Owner: workforce_runtime
--

CREATE TABLE public.workforce_cities (
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workforce_cities OWNER TO workforce_runtime;

--
-- Name: workforce_field_code_seq; Type: SEQUENCE; Schema: public; Owner: workforce_runtime
--

CREATE SEQUENCE public.workforce_field_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workforce_field_code_seq OWNER TO workforce_runtime;

--
-- Name: workforce_field_profiles; Type: TABLE; Schema: public; Owner: workforce_runtime
--

CREATE TABLE public.workforce_field_profiles (
    actor_id text NOT NULL,
    city_code text,
    shift_code text,
    supervisor_actor_id text,
    emergency_contact_name text,
    emergency_contact_phone text,
    preferred_language text,
    policy_consent_at timestamp with time zone,
    document_media_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_zone_id text,
    CONSTRAINT workforce_field_profiles_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['ar'::text, 'en'::text])))
);


ALTER TABLE public.workforce_field_profiles OWNER TO workforce_runtime;

--
-- Name: workforce_idempotency; Type: TABLE; Schema: public; Owner: workforce_runtime
--

CREATE TABLE public.workforce_idempotency (
    actor_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response_body jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workforce_idempotency OWNER TO workforce_runtime;

--
-- Name: workforce_people; Type: TABLE; Schema: public; Owner: workforce_runtime
--

CREATE TABLE public.workforce_people (
    actor_id text NOT NULL,
    full_name_ar text NOT NULL,
    full_name_en text,
    provider_code text NOT NULL,
    engagement_type text DEFAULT 'independent_contractor'::text NOT NULL,
    engagement_start_date date,
    engagement_status text DEFAULT 'pending_activation'::text NOT NULL,
    photo_media_ref text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_kind text NOT NULL,
    CONSTRAINT workforce_people_engagement_status_check CHECK ((engagement_status = ANY (ARRAY['pending_activation'::text, 'active'::text, 'suspended'::text, 'terminated'::text]))),
    CONSTRAINT workforce_people_engagement_type_check CHECK ((engagement_type = ANY (ARRAY['independent_contractor'::text, 'agency_contractor'::text]))),
    CONSTRAINT workforce_people_provider_kind_check CHECK ((provider_kind = ANY (ARRAY['field'::text, 'captain'::text]))),
    CONSTRAINT workforce_people_version_check CHECK ((version >= 1))
);


ALTER TABLE public.workforce_people OWNER TO workforce_runtime;

--
-- Name: workforce_shifts; Type: TABLE; Schema: public; Owner: workforce_runtime
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


ALTER TABLE public.workforce_shifts OWNER TO workforce_runtime;

--
-- Name: workforce_action_audit id; Type: DEFAULT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_action_audit ALTER COLUMN id SET DEFAULT nextval('public.workforce_action_audit_id_seq'::regclass);


--
-- Data for Name: workforce_action_audit; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_action_audit (id, actor_id, actor_role, target_actor_id, action, from_state, to_state, reason, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: workforce_captain_profiles; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_captain_profiles (actor_id, vehicle_type, vehicle_identifier, license_status, license_expires_at, operating_city_code, operating_scope_code, document_media_refs, created_at, updated_at, service_zone_id, supervisor_actor_id) FROM stdin;
\.


--
-- Data for Name: workforce_cities; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_cities (code, name_ar, name_en, active, created_at, updated_at) FROM stdin;
sanaa	صنعاء	Sanaa	t	2026-07-13 21:42:40.626637+00	2026-07-13 21:42:40.626637+00
aden	عدن	Aden	t	2026-07-13 21:42:40.626637+00	2026-07-13 21:42:40.626637+00
taiz	تعز	Taiz	t	2026-07-13 21:42:40.626637+00	2026-07-13 21:42:40.626637+00
hodeidah	الحديدة	Hodeidah	t	2026-07-13 21:42:40.626637+00	2026-07-13 21:42:40.626637+00
ibb	إب	Ibb	t	2026-07-13 21:42:40.626637+00	2026-07-13 21:42:40.626637+00
\.


--
-- Data for Name: workforce_field_profiles; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_field_profiles (actor_id, city_code, shift_code, supervisor_actor_id, emergency_contact_name, emergency_contact_phone, preferred_language, policy_consent_at, document_media_refs, created_at, updated_at, service_zone_id) FROM stdin;
\.


--
-- Data for Name: workforce_idempotency; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_idempotency (actor_id, operation, idempotency_key, request_hash, response_body, created_at) FROM stdin;
\.


--
-- Data for Name: workforce_people; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_people (actor_id, full_name_ar, full_name_en, provider_code, engagement_type, engagement_start_date, engagement_status, photo_media_ref, version, created_at, updated_at, provider_kind) FROM stdin;
\.


--
-- Data for Name: workforce_shifts; Type: TABLE DATA; Schema: public; Owner: workforce_runtime
--

COPY public.workforce_shifts (code, name_ar, name_en, starts_at, ends_at, active, created_at, updated_at) FROM stdin;
morning	وردية صباحية	Morning shift	08:00:00	16:00:00	t	2026-07-13 21:42:40.641851+00	2026-07-13 21:42:40.641851+00
evening	وردية مسائية	Evening shift	16:00:00	00:00:00	t	2026-07-13 21:42:40.641851+00	2026-07-13 21:42:40.641851+00
full_day	وردية كاملة	Full day	08:00:00	20:00:00	t	2026-07-13 21:42:40.641851+00	2026-07-13 21:42:40.641851+00
\.


--
-- Name: workforce_action_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: workforce_runtime
--

SELECT pg_catalog.setval('public.workforce_action_audit_id_seq', 1, false);


--
-- Name: workforce_captain_code_seq; Type: SEQUENCE SET; Schema: public; Owner: workforce_runtime
--

SELECT pg_catalog.setval('public.workforce_captain_code_seq', 1, false);


--
-- Name: workforce_field_code_seq; Type: SEQUENCE SET; Schema: public; Owner: workforce_runtime
--

SELECT pg_catalog.setval('public.workforce_field_code_seq', 1, false);


--
-- Name: workforce_action_audit workforce_action_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_action_audit
    ADD CONSTRAINT workforce_action_audit_pkey PRIMARY KEY (id);


--
-- Name: workforce_captain_profiles workforce_captain_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_captain_profiles
    ADD CONSTRAINT workforce_captain_profiles_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_cities workforce_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_cities
    ADD CONSTRAINT workforce_cities_pkey PRIMARY KEY (code);


--
-- Name: workforce_field_profiles workforce_field_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_idempotency workforce_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_idempotency
    ADD CONSTRAINT workforce_idempotency_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: workforce_people workforce_people_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_people
    ADD CONSTRAINT workforce_people_pkey PRIMARY KEY (actor_id);


--
-- Name: workforce_people workforce_people_provider_code_key; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_people
    ADD CONSTRAINT workforce_people_provider_code_key UNIQUE (provider_code);


--
-- Name: workforce_shifts workforce_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_shifts
    ADD CONSTRAINT workforce_shifts_pkey PRIMARY KEY (code);


--
-- Name: workforce_action_audit_target_idx; Type: INDEX; Schema: public; Owner: workforce_runtime
--

CREATE INDEX workforce_action_audit_target_idx ON public.workforce_action_audit USING btree (target_actor_id, created_at DESC);


--
-- Name: workforce_captain_profiles_city_idx; Type: INDEX; Schema: public; Owner: workforce_runtime
--

CREATE INDEX workforce_captain_profiles_city_idx ON public.workforce_captain_profiles USING btree (operating_city_code);


--
-- Name: workforce_field_profiles_city_idx; Type: INDEX; Schema: public; Owner: workforce_runtime
--

CREATE INDEX workforce_field_profiles_city_idx ON public.workforce_field_profiles USING btree (city_code);


--
-- Name: workforce_people_status_idx; Type: INDEX; Schema: public; Owner: workforce_runtime
--

CREATE INDEX workforce_people_status_idx ON public.workforce_people USING btree (engagement_status, created_at DESC);


--
-- Name: workforce_captain_profiles workforce_captain_profiles_exclusivity_trg; Type: TRIGGER; Schema: public; Owner: workforce_runtime
--

CREATE TRIGGER workforce_captain_profiles_exclusivity_trg BEFORE INSERT ON public.workforce_captain_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_provider_exclusivity();


--
-- Name: workforce_field_profiles workforce_field_profiles_exclusivity_trg; Type: TRIGGER; Schema: public; Owner: workforce_runtime
--

CREATE TRIGGER workforce_field_profiles_exclusivity_trg BEFORE INSERT ON public.workforce_field_profiles FOR EACH ROW EXECUTE FUNCTION public.workforce_enforce_provider_exclusivity();


--
-- Name: workforce_captain_profiles workforce_captain_profiles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_captain_profiles
    ADD CONSTRAINT workforce_captain_profiles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_captain_profiles workforce_captain_profiles_operating_city_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_captain_profiles
    ADD CONSTRAINT workforce_captain_profiles_operating_city_code_fkey FOREIGN KEY (operating_city_code) REFERENCES public.workforce_cities(code);


--
-- Name: workforce_field_profiles workforce_field_profiles_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.workforce_people(actor_id) ON DELETE CASCADE;


--
-- Name: workforce_field_profiles workforce_field_profiles_city_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_city_code_fkey FOREIGN KEY (city_code) REFERENCES public.workforce_cities(code);


--
-- Name: workforce_field_profiles workforce_field_profiles_shift_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workforce_runtime
--

ALTER TABLE ONLY public.workforce_field_profiles
    ADD CONSTRAINT workforce_field_profiles_shift_code_fkey FOREIGN KEY (shift_code) REFERENCES public.workforce_shifts(code);


--
-- PostgreSQL database dump complete
--

\unrestrict 3593POCTwHwS1XwJx2TKMG0YM5UANn10NBObpGMNhuVFn5FziX9bzxRmHTZ1LNL

--
-- PostgreSQL database cluster dump complete
--

