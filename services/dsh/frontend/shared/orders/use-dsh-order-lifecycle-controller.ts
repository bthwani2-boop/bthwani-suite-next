import React from 'react';
import type { DshOrderLifecycleClient, DshOrderAuthContext } from './dsh-order-lifecycle.types';
import { createDshOrderLifecycleHttpClient, resolveDshOrderApiBaseUrl } from './dsh-order-lifecycle.transport';

export function useDshOrderLifecycleClient(auth?: DshOrderAuthContext): DshOrderLifecycleClient {
  return React.useMemo(() => {
    const baseUrl = resolveDshOrderApiBaseUrl();
    return createDshOrderLifecycleHttpClient(baseUrl, globalThis.fetch, auth);
  }, [auth]);
}
