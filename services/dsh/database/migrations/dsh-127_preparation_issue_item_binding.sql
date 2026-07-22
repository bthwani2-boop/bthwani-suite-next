-- DSH-127: item-level preparation issues must reference the immutable order item.
-- Order-level "other" issues remain valid without an item reference.

BEGIN;

ALTER TABLE dsh_order_preparation_issues
    DROP CONSTRAINT IF EXISTS dsh_order_preparation_issues_item_binding_check;

ALTER TABLE dsh_order_preparation_issues
    ADD CONSTRAINT dsh_order_preparation_issues_item_binding_check CHECK (
        issue_kind = 'other' OR order_item_id IS NOT NULL
    );

COMMIT;
