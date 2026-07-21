import React from 'react';
import {
  fetchOperatorOrderWorkboard,
  operatorOrderWorkboardErrorMessage,
  type OperatorOrderWorkboardRow,
} from './order-workboard.api';

export type OperatorOrderWorkboardState =
  | { readonly kind: 'loading'; readonly orders: readonly OperatorOrderWorkboardRow[]; readonly total: number }
  | { readonly kind: 'ready'; readonly orders: readonly OperatorOrderWorkboardRow[]; readonly total: number }
  | { readonly kind: 'empty'; readonly orders: readonly OperatorOrderWorkboardRow[]; readonly total: number }
  | { readonly kind: 'error'; readonly orders: readonly OperatorOrderWorkboardRow[]; readonly total: number; readonly message: string };

export function useOperatorOrderWorkboard(status?: string) {
  const [state, setState] = React.useState<OperatorOrderWorkboardState>({
    kind: 'loading',
    orders: [],
    total: 0,
  });

  const refresh = React.useCallback(async () => {
    setState((current) => ({ ...current, kind: 'loading' }));
    try {
      const result = await fetchOperatorOrderWorkboard(status);
      setState({
        kind: result.orders.length === 0 ? 'empty' : 'ready',
        orders: result.orders,
        total: result.total,
      });
    } catch (error) {
      setState((current) => ({
        kind: 'error',
        orders: current.orders,
        total: current.total,
        message: operatorOrderWorkboardErrorMessage(error),
      }));
    }
  }, [status]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (state.kind !== 'ready') return undefined;
    if (!state.orders.some((order) => order.financialClosureStatus === 'pending')) return undefined;
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh, state]);

  return { state, refresh } as const;
}
