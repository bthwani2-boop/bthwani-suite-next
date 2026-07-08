-- Verifies the central catalog seed converged correctly. Prints one row per
-- check with a boolean pass column; a human or CI script greps for `f` (fail).
SELECT 'domains_count_ge_11' AS check_name, (COUNT(*) >= 11) AS pass FROM dsh_catalog_domains
UNION ALL
SELECT 'domain_manual_request_exists', EXISTS (SELECT 1 FROM dsh_catalog_domains WHERE id = 'domain-manual-request')
UNION ALL
SELECT 'node_shay_in_exists', EXISTS (SELECT 1 FROM dsh_catalog_nodes WHERE id = 'node-shay-in')
UNION ALL
SELECT 'node_awnak_exists', EXISTS (SELECT 1 FROM dsh_catalog_nodes WHERE id = 'node-awnak')
UNION ALL
SELECT 'groceries_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-groceries') >= 6
UNION ALL
SELECT 'sweets_juices_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-sweets-juices') >= 3
UNION ALL
SELECT 'elegance_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-elegance') >= 3
UNION ALL
SELECT 'image_policies_exist', (SELECT COUNT(*) FROM dsh_catalog_platform_policies WHERE policy_scope IN ('node', 'domain')) >= 5
UNION ALL
SELECT 'default_policy_exists', EXISTS (SELECT 1 FROM dsh_catalog_platform_policies WHERE id = 'default-policy');
