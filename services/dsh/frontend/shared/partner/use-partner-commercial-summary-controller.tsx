import { useState, useCallback, useEffect } from 'react';
import { fetchPartnerCommercialSummary } from './partner.api';
import type { DshPartnerCommercialSummary } from './partner.types';

export type PartnerCommercialSummaryState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly summary: DshPartnerCommercialSummary }
  | { readonly kind: 'error'; readonly message: string };

export function usePartnerCommercialSummaryController(storeId: string | null) {
  const [state, setState] = useState<PartnerCommercialSummaryState>({ kind: 'idle' });

  const load = useCallback(async () => {
    if (!storeId) {
      setState({ kind: 'idle' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const summary = await fetchPartnerCommercialSummary(storeId);
      setState({ kind: 'success', summary });
    } catch (e: any) {
      setState({ kind: 'error', message: e.message || 'تعذر تحميل النموذج التجاري' });
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
