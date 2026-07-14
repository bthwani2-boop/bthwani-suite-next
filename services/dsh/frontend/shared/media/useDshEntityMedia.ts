// useDshEntityMedia — shared media runtime binding
import { useState, useEffect } from 'react';
import type { DshMediaAsset } from './dsh-media-api.client';
import { getDshMediaRuntimeClient } from '../catalog/central-catalog.api';

export type DshEntityMediaState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; assets: readonly DshMediaAsset[] }
  | { kind: 'error'; message: string };

export function useDshEntityMedia(
  entityId: string | undefined,
  entityType: 'product' | 'store' | 'category',
): DshEntityMediaState {
  const [state, setState] = useState<DshEntityMediaState>({ kind: 'idle' });

  useEffect(() => {
    if (!entityId) {
      setState({ kind: 'idle' });
      return;
    }

    const client = getDshMediaRuntimeClient();
    if (!client?.listAssets) {
      setState({ kind: 'error', message: 'DSH media runtime client is not configured.' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });
    client.listAssets(entityId, entityType)
      .then((assets: readonly DshMediaAsset[]) => {
        if (!cancelled) setState({ kind: 'ready', assets });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Failed to load DSH media assets.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  return state;
}
