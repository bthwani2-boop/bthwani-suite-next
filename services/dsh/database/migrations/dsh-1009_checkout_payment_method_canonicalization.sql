-- DSH-1009: retire official_wallet as a checkout payment method.
-- Official wallet/provider accounts remain funding rails elsewhere; checkout
-- authority is WLT and exposes only cod, wallet, or mixed. Existing DSH
-- checkout intents carrying the historical alias are canonicalized to wallet
-- without changing their amount, state, or WLT session reference.

UPDATE dsh_checkout_intents
SET payment_method = 'wallet',
    updated_at = NOW()
WHERE payment_method = 'official_wallet';

ALTER TABLE dsh_checkout_intents
  DROP CONSTRAINT IF EXISTS dsh_checkout_intents_payment_method_check;

ALTER TABLE dsh_checkout_intents
  ADD CONSTRAINT dsh_checkout_intents_payment_method_check
  CHECK (payment_method IN ('cod', 'wallet', 'mixed'));

COMMENT ON COLUMN dsh_checkout_intents.payment_method IS
  'Checkout tender selection owned by the WLT contract: cod, wallet, or mixed. Provider and official-wallet rails are not checkout methods.';
