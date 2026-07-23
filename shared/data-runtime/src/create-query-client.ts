import { QueryClient } from "@tanstack/react-query";

type DshRequestError = {
  readonly kind?: string;
  readonly status?: number;
};

function isDshRequestError(error: unknown): error is DshRequestError {
  return typeof error === "object" && error !== null && "kind" in error;
}

/**
 * 4xx/validation failures are stable outcomes, not transient faults — retrying
 * them just repeats the same rejection. Only network/5xx errors are worth a retry.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (isDshRequestError(error)) {
    if (error.kind === "network") return true;
    if (error.kind === "http" && typeof error.status === "number") {
      return error.status >= 500;
    }
    return false;
  }
  return true;
}

export function createBthwaniQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
    },
  });
}
