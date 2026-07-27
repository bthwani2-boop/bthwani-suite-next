-- dsh-909_manual_request_catalog_capabilities.sql
-- Requires dsh-030 and dsh-909 migrations.

DO $$
DECLARE
  manual_domain_count INTEGER;
  manual_node_count INTEGER;
  invalid_node_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO manual_domain_count
  FROM dsh_catalog_domains
  WHERE id = 'domain-manual-request'
    AND slug = 'manual_request'
    AND is_active = TRUE
    AND is_client_visible = TRUE
    AND is_manual_request = TRUE
    AND requires_product_catalog = FALSE
    AND icon = '📝';

  IF manual_domain_count <> 1 THEN
    RAISE EXCEPTION 'manual request catalog domain is missing or misconfigured';
  END IF;

  SELECT COUNT(*) INTO manual_node_count
  FROM dsh_catalog_nodes
  WHERE id IN ('node-shein', 'node-awnak')
    AND domain_id = 'domain-manual-request'
    AND level = 'BUSINESS_SUBDOMAIN'
    AND is_active = TRUE
    AND is_client_visible = TRUE;

  IF manual_node_count <> 2 THEN
    RAISE EXCEPTION 'SHEIN and Awnak manual request nodes are not both client-visible';
  END IF;

  SELECT COUNT(*) INTO invalid_node_count
  FROM dsh_catalog_nodes
  WHERE id IN ('node-shein', 'node-awnak')
    AND (
      requires_product_catalog = TRUE
      OR allows_product_proposal = TRUE
      OR requires_catalog_review = TRUE
      OR icon = ''
    );

  IF invalid_node_count <> 0 THEN
    RAISE EXCEPTION 'manual request nodes incorrectly expose product-catalog capabilities';
  END IF;
END;
$$;
