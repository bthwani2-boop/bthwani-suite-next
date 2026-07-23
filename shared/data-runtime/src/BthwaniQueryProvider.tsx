import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBthwaniQueryClient } from "./create-query-client";
import { persistBthwaniQueryClient, restoreBthwaniQueryClient } from "./persistence";

export type BthwaniQueryProviderProps = {
  readonly client?: QueryClient;
  readonly persistenceKey?: string;
  readonly children?: React.ReactNode;
};

export function BthwaniQueryProvider({
  client,
  persistenceKey,
  children,
}: BthwaniQueryProviderProps): React.ReactElement | null {
  const [ownedClient] = useState(() => client ?? createBthwaniQueryClient());
  const activeClient = client ?? ownedClient;
  const [restored, setRestored] = useState(() => !persistenceKey);

  useEffect(() => {
    if (!persistenceKey) return undefined;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void restoreBthwaniQueryClient(activeClient, persistenceKey).finally(() => {
      if (!active) return;
      setRestored(true);
      unsubscribe = persistBthwaniQueryClient(activeClient, persistenceKey);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [activeClient, persistenceKey]);

  if (!restored) return null;
  return React.createElement(QueryClientProvider, { client: activeClient }, children);
}
