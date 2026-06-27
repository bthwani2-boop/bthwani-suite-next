// useDshEntityMedia — stub hook pending media runtime binding
import { useState, useEffect } from 'react';
import type { DshMediaAsset } from './dsh-media-api.client';

export type DshEntityMediaState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; assets: readonly DshMediaAsset[] }
  | { kind: 'error'; message: string };

export function useDshEntityMedia(
  _entityId: string | undefined,
  _entityType: 'product' | 'store' | 'category',
): DshEntityMediaState {
  const [state, setState] = useState<DshEntityMediaState>({ kind: 'idle' });

  useEffect(() => {
    if (!_entityId) return;
    // TODO: bind to getDshMediaRuntimeClient when media API is live
    setState({ kind: 'ready', assets: [] });
  }, [_entityId]);

  return state;
}
