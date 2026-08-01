-- DSH-965: Drop dead dsh_client_subscriptions table (D2 remediation).
--
-- dsh_client_subscriptions was added by dsh-058 as a second, parallel client
-- subscription store alongside WLT's wlt_client_subscriptions. It was never
-- written to anywhere in this repository -- the live client subscription
-- purchase workflow (handleCreateSubscriptionPurchase /
-- handleActivateSubscriptionPurchase / handleRenewSubscriptionPurchase /
-- handleCancelSubscriptionPurchase, all registered in server.go) persists
-- workflow/checkout state in dsh_subscription_purchases (a separate table,
-- kept -- it stores a wlt_subscription_id reference plus DSH-owned checkout
-- workflow state, populated only from WLT's own response, not independently
-- computed truth). Its only two readers (SubscriptionSummary,
-- subscriptionPlanSelectCols's per-plan subscriber subquery) were dead code
-- or always returned 0, already fixed/removed in the same change. Since the
-- table was always empty in production, no backfill is needed.

DO $$
DECLARE
  residual_count integer;
BEGIN
  SELECT count(*) INTO residual_count FROM dsh_client_subscriptions;
  IF residual_count > 0 THEN
    RAISE EXCEPTION 'dsh-965: refusing to drop non-empty dead table dsh_client_subscriptions (rows=%); this contradicts the "always empty" analysis and needs investigation before the migration can proceed', residual_count;
  END IF;
END $$;

DROP TABLE IF EXISTS dsh_client_subscriptions;
