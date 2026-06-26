import React from 'react';
import { getWltApiBaseUrl } from './wlt-dsh-api-base-url';

export type WltDshWalletAccount = { id: string; name: string };

export function useWltDshWalletSession(clientId: string | undefined, bearerToken?: string) {
  const runtimeClientId = (clientId ?? '').trim();
  const [linked, setLinked] = React.useState<boolean>(false);
  const [balance, setBalance] = React.useState<number | null>(null);
  const [hydrated, setHydrated] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [lastError, setLastError] = React.useState<string | null>(null);

  const baseUrl = getWltApiBaseUrl() ?? 'http://localhost:58083';

  const refresh = React.useCallback(async () => {
    if (!runtimeClientId) {
      setHydrated(true);
      return;
    }
    setRefreshing(true);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      } else {
        headers['X-Client-Id'] = runtimeClientId;
      }

      const res = await fetch(`${baseUrl}/wlt/wallets/${encodeURIComponent(runtimeClientId)}/summary`, {
        headers,
      });

      if (res.ok) {
        const body = await res.json();
        setLinked(true);
        const rawBalance = typeof body.balance === 'number' && !Number.isNaN(body.balance)
          ? body.balance
          : (body.balanceMinorUnits as number ?? 0) / 100;
        setBalance(Math.round(rawBalance));
        setLastError(null);
      } else if (res.status === 404) {
        setLinked(false);
        setBalance(null);
        setLastError(null);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setLinked(false);
      setBalance(null);
      setLastError('wallet_refresh_failed');
    } finally {
      setHydrated(true);
      setRefreshing(false);
    }
  }, [runtimeClientId, bearerToken, baseUrl]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPayment = React.useCallback(
    async (amountMinorUnits: number, intentId?: string) => {
      if (!runtimeClientId) return Promise.reject(new Error('wlt:no_client_id'));
      const paymentTargetId = (intentId ?? '').trim();
      if (!paymentTargetId) return Promise.reject(new Error('wlt:no_payment_intent_id'));
      if (amountMinorUnits <= 0) return Promise.reject(new Error('wlt:invalid_amount'));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      }

      const res = await fetch(`${baseUrl}/wlt/payment-sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          checkout_intent_id: paymentTargetId,
          client_id: runtimeClientId,
          amount: amountMinorUnits / 100,
          currency: 'YER',
          payment_method: 'wallet',
          idempotency_key: `dsh-client-payment-${runtimeClientId}-${paymentTargetId}-${amountMinorUnits}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`wlt_payment_failed: HTTP ${res.status}`);
      }

      const body = await res.json();
      const status = body.status ?? body.paymentSession?.status;
      const sessionId = body.id ?? body.paymentSession?.id;

      if (status !== 'CONFIRMED') {
        return { success: false, txId: sessionId, error: `wlt_payment_${String(status).toLowerCase()}` };
      }

      return { success: true, txId: sessionId };
    },
    [runtimeClientId, bearerToken, baseUrl],
  );

  const getBalance = React.useCallback(async () => {
    if (!runtimeClientId) return Promise.reject(new Error('wlt:no_client_id'));
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;

    const res = await fetch(`${baseUrl}/wlt/wallets/${encodeURIComponent(runtimeClientId)}/summary`, {
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const rawBalance = typeof body.balance === 'number' && !Number.isNaN(body.balance)
      ? body.balance
      : (body.balanceMinorUnits as number ?? 0) / 100;
    return Math.round(rawBalance);
  }, [runtimeClientId, bearerToken, baseUrl]);

  const link = React.useCallback(async () => {
    if (!runtimeClientId) return Promise.reject(new Error('wlt:no_client_id'));
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
      const res = await fetch(`${baseUrl}/wlt/wallets/${encodeURIComponent(runtimeClientId)}/summary`, {
        headers,
      });
      if (res.ok) {
        await refresh();
        return { success: true, account: { id: runtimeClientId, name: 'محفظة WLT' } };
      }
      return { success: false, error: `HTTP ${res.status}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'link_failed' };
    }
  }, [runtimeClientId, bearerToken, baseUrl, refresh]);

  const createWalletFundingLink = React.useCallback((amountMinorUnits: number) => {
    return `wlt://pay?order=wallet-funding&amount=${amountMinorUnits}&v=v1`;
  }, []);

  const createOrderPaymentLink = React.useCallback((orderId: string, amountYer: number) => {
    return `wlt://pay?order=${encodeURIComponent(orderId)}&amount=${amountYer}&v=v1`;
  }, []);

  return {
    linked,
    balance,
    hydrated,
    refreshing,
    lastError,
    refresh,
    requestPayment,
    getBalance,
    link,
    createWalletFundingLink,
    createOrderPaymentLink,
  } as const;
}
