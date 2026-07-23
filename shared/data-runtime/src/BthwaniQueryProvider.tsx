import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBthwaniQueryClient } from "./create-query-client";

export type BthwaniQueryProviderProps = {
  readonly client?: QueryClient;
  readonly children: React.ReactNode;
};

export function BthwaniQueryProvider({ client, children }: BthwaniQueryProviderProps) {
  const [ownedClient] = useState(() => client ?? createBthwaniQueryClient());
  const activeClient = client ?? ownedClient;
  return React.createElement(QueryClientProvider, { client: activeClient }, children);
}
