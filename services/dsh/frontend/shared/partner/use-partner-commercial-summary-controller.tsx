import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchPartnerCommercialSummary } from './partner.api';
import type { DshPartnerCommercialSummary } from './partner.types';

export type PartnerCommercialSummaryState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly summary: DshPartnerCommercialSummary }
  | { readonly kind: 'error'; readonly message: string };

export function usePartnerCommercialSummaryController(storeId: string | null) {
  const [state, setState] = useState<PartnerCommercialSummaryState>({ kind: 'idle' });
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  const load = useCallback(async (): Promise<boolean> => {
    const requestSeq = ++requestSeqRef.current;
    if (!storeId) {
      if (mountedRef.current) setState({ kind: 'idle' });
      return false;
    }
    setState({ kind: 'loading' });
    try {
      const summary = await fetchPartnerCommercialSummary(storeId);
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return false;
      setState({ kind: 'success', summary });
      return true;
    } catch (error: unknown) {
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return false;
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تحميل النموذج التجاري',
      });
      return false;
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
