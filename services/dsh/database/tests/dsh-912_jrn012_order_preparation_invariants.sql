\set ON_ERROR_STOP on

DO $$
DECLARE
    item_binding_definition TEXT;
    forbidden_financial_columns INTEGER;
BEGIN
    IF to_regclass('public.dsh_store_order_preparation_policies') IS NULL THEN
        RAISE EXCEPTION 'missing dsh_store_order_preparation_policies';
    END IF;
    IF to_regclass('public.dsh_order_preparation_estimate_events') IS NULL THEN
        RAISE EXCEPTION 'missing dsh_order_preparation_estimate_events';
    END IF;
    IF to_regclass('public.dsh_order_preparation_issues') IS NULL THEN
        RAISE EXCEPTION 'missing dsh_order_preparation_issues';
    END IF;
    IF to_regclass('public.dsh_order_preparation_issue_events') IS NULL THEN
        RAISE EXCEPTION 'missing dsh_order_preparation_issue_events';
    END IF;
    IF to_regclass('public.uq_dsh_order_preparation_open_issue') IS NULL THEN
        RAISE EXCEPTION 'missing unique open preparation issue index';
    END IF;

    SELECT pg_get_constraintdef(c.oid)
      INTO item_binding_definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'dsh_order_preparation_issues'
       AND c.conname = 'dsh_order_preparation_issues_item_binding_check';

    IF item_binding_definition IS NULL
       OR item_binding_definition NOT LIKE '%issue_kind%other%order_item_id IS NOT NULL%' THEN
        RAISE EXCEPTION 'item-level preparation issue binding constraint is missing or malformed: %', item_binding_definition;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'dsh_orders'
           AND column_name = 'estimated_ready_at'
    ) THEN
        RAISE EXCEPTION 'dsh_orders.estimated_ready_at is missing';
    END IF;

    SELECT COUNT(*)
      INTO forbidden_financial_columns
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('dsh_order_preparation_issues', 'dsh_order_preparation_issue_events')
       AND column_name ~* '(wallet|ledger|balance|settlement|refund_amount|captured_amount)';

    IF forbidden_financial_columns <> 0 THEN
        RAISE EXCEPTION 'DSH preparation issue tables contain WLT-owned financial truth';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
         WHERE t.relname = 'dsh_order_preparation_issues'
           AND c.contype = 'f'
           AND pg_get_constraintdef(c.oid) LIKE '%dsh_order_items%'
    ) THEN
        RAISE EXCEPTION 'preparation issues are not foreign-keyed to immutable order items';
    END IF;
END
$$;
