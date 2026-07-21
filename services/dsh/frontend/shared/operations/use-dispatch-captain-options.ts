import { useCallback, useEffect, useState } from 'react';
import { listCaptains, workforceErrorMessage } from '../workforce/workforce.api';
import type { Captain } from '../workforce/workforce.types';

export type DispatchCaptainOptionsState =
  | { readonly kind: 'loading'; readonly captains: readonly Captain[] }
  | { readonly kind: 'ready'; readonly captains: readonly Captain[] }
  | { readonly kind: 'error'; readonly captains: readonly Captain[]; readonly message: string };

/**
 * Shared-brain read controller for JRN-014 dispatch assignment.
 * Surfaces consume this controller and never call Workforce APIs directly.
 */
export function useDispatchCaptainOptions(): {
  readonly state: DispatchCaptainOptionsState;
  readonly reload: () => Promise<void>;
} {
  const [state, setState] = useState<DispatchCaptainOptionsState>({ kind: 'loading', captains: [] });

  const reload = useCallback(async () => {
    setState((current) => ({ kind: 'loading', captains: current.captains }));
    try {
      const captains = await listCaptains({ status: 'active', limit: 200 });
      setState({ kind: 'ready', captains });
    } catch (error) {
      setState((current) => ({
        kind: 'error',
        captains: current.captains,
        message: workforceErrorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
